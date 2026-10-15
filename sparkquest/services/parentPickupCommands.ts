import { doc, getDoc, serverTimestamp, writeBatch, type Firestore } from 'firebase/firestore';
import {
  canAdvancePickup, isAuthorizedPicker, pickupEntryId, pickupSessionDate,
  type PickupStatus
} from '../domain/pickupLifecycle';

interface PickupStudent {
  organizationId?: string;
  name?: string;
  parentName?: string;
  authorizedPickups?: string[];
  status?: string;
}

interface PickupGuardianLink {
  organizationId?: string;
  parentUid?: string;
  studentId?: string;
  status?: string;
  permissions?: string[];
}

interface ParentPickupEntry {
  organizationId: string;
  studentId: string;
  studentName: string;
  parentName: string;
  parentUid: string;
  pickerName: string;
  sessionDate: string;
  sessionId: 'daily';
  status: PickupStatus;
}

const activePickupLink = (link: PickupGuardianLink | undefined, organizationId: string, studentId: string, parentUid: string) =>
  link?.organizationId === organizationId && link.parentUid === parentUid &&
  link.studentId === studentId && link.status === 'active' && link.permissions?.includes('pickup') === true;

const parentEvent = (entry: Pick<ParentPickupEntry, 'organizationId' | 'studentId' | 'pickerName'>, status: PickupStatus, actorUid: string, details: Record<string, unknown> = {}) => ({
  organizationId: entry.organizationId,
  studentId: entry.studentId,
  pickerName: entry.pickerName,
  status,
  at: serverTimestamp(),
  actorUid,
  ...details
});

/** Uses SparkQuest's Firebase SDK. Release only with the matching Pickup rules and indexes. */
export async function announceParentPickup(
  db: Firestore, organizationId: string, studentId: string, parentUid: string, pickerName: string, now = new Date()
): Promise<string> {
  const sessionDate = pickupSessionDate(now);
  const entryId = pickupEntryId(organizationId, studentId, sessionDate);
  const entryRef = doc(db, 'pickup_queue', entryId);
  const studentRef = doc(db, 'students', studentId);
  const linkRef = doc(db, 'guardian_links', `${parentUid}_${studentId}`);

  const [studentSnapshot, linkSnapshot] = await Promise.all([getDoc(studentRef), getDoc(linkRef)]);
  const student = studentSnapshot.data() as PickupStudent | undefined;
  const link = linkSnapshot.data() as PickupGuardianLink | undefined;
  if (!activePickupLink(link, organizationId, studentId, parentUid)) throw new Error('Pickup access is not active for this learner.');
  if (!student || student.organizationId !== organizationId || student.status !== 'active' || !student.name?.trim() || !student.parentName?.trim()) {
    throw new Error('The learner pickup record is not ready. Ask the academy to check it.');
  }
  if (!pickerName || pickerName.length > 100 || !isAuthorizedPicker(pickerName, student.parentName, student.authorizedPickups || [])) {
    throw new Error('Choose a currently authorized pickup person.');
  }
  // The server checks current student, guardian and create-only ID at commit.
  // No read of an absent queue document is possible under its resource rule.
  const entry = {
    organizationId, studentId, studentName: student.name, parentName: student.parentName,
    parentUid, pickerName, sessionDate, sessionId: 'daily' as const, status: 'on_the_way' as const,
    createdAt: serverTimestamp(), notifiedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    createdByUid: parentUid, lastActorUid: parentUid, lastEventId: 'on_the_way'
  };
  const batch = writeBatch(db);
  batch.set(entryRef, entry);
  batch.set(doc(entryRef, 'events', 'on_the_way'), parentEvent(entry, 'on_the_way', parentUid));
  await batch.commit();
  return entryId;
}

export async function advanceParentPickup(
  db: Firestore, organizationId: string, entryId: string, parentUid: string,
  expected: PickupStatus, next: 'arrived' | 'cancelled' | 'confirmed', cancellationReason = ''
): Promise<void> {
  if (!canAdvancePickup(expected, next)) throw new Error('Invalid pickup transition.');
  const entryRef = doc(db, 'pickup_queue', entryId);
  const entrySnapshot = await getDoc(entryRef);
  const entry = entrySnapshot.data() as ParentPickupEntry | undefined;
  if (!entry || entry.organizationId !== organizationId || entry.status !== expected ||
      pickupEntryId(entry.organizationId, entry.studentId, entry.sessionDate) !== entryId) {
    throw new Error('The pickup state changed or this is a legacy record. Refresh the status.');
  }
  const linkRef = doc(db, 'guardian_links', `${parentUid}_${entry.studentId}`);
  const link = (await getDoc(linkRef)).data() as PickupGuardianLink | undefined;
  if (!activePickupLink(link, organizationId, entry.studentId, parentUid)) throw new Error('Pickup access is not active for this learner.');

  const update: Record<string, unknown> = {
    status: next, updatedAt: serverTimestamp(), lastActorUid: parentUid, lastEventId: next
  };
  const eventDetails: Record<string, unknown> = {};
  if (next === 'arrived') update.arrivedAt = serverTimestamp();
  if (next === 'confirmed') update.confirmedAt = serverTimestamp();
  if (next === 'cancelled') {
    const reason = cancellationReason.trim();
    if (reason.length < 8 || reason.length > 500) throw new Error('Give a cancellation reason of 8–500 characters.');
    update.cancelledAt = serverTimestamp();
    update.exceptionReason = reason;
    eventDetails.exceptionReason = reason;
  }
  // The transition rule compares the current server status and authorizes the
  // acting guardian again. The batch keeps the event inseparable from it.
  const batch = writeBatch(db);
  batch.update(entryRef, update);
  batch.set(doc(entryRef, 'events', next), parentEvent(entry, next, parentUid, eventDetails));
  await batch.commit();
}
