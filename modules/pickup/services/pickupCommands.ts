import { doc, getDoc, serverTimestamp, writeBatch, type Firestore } from 'firebase/firestore';
import type { PickupEntry, Student } from '../../../types';
import { canAdvancePickup, isAuthorizedPicker, pickupEntryId, pickupSessionDate, type PickupStatus } from '../domain/pickupLifecycle';

const eventData = (entry: Pick<PickupEntry, 'organizationId' | 'studentId' | 'pickerName'>, status: PickupStatus, actorUid: string, details: Record<string, unknown> = {}) => ({
  organizationId: entry.organizationId,
  studentId: entry.studentId,
  pickerName: entry.pickerName,
  status,
  at: serverTimestamp(),
  actorUid,
  ...details
});

export async function announcePickup(db: Firestore, student: Student, actorUid: string, pickerName: string, now = new Date(), requestingParentUid?: string): Promise<string> {
  const organizationId = student.organizationId;
  const sessionDate = pickupSessionDate(now);
  const entryId = pickupEntryId(organizationId, student.id, sessionDate);
  const parentUid = requestingParentUid || student.parentLoginInfo?.uid;
  if (!parentUid || !isAuthorizedPicker(pickerName, student.parentName || '', student.authorizedPickups)) {
    throw new Error('A linked parent and an authorized picker are required.');
  }
  const reference = doc(db, 'pickup_queue', entryId);
  // The server validates current student/picker authorization and a create-only
  // deterministic ID. The absent queue document cannot be read by these rules.
  const entry = {
    organizationId, studentId: student.id, studentName: student.name,
    parentName: student.parentName || '', parentUid, pickerName,
    sessionDate, sessionId: 'daily', status: 'on_the_way',
    createdAt: serverTimestamp(), notifiedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    createdByUid: actorUid, lastActorUid: actorUid, lastEventId: 'on_the_way'
  };
  const batch = writeBatch(db);
  batch.set(reference, entry);
  batch.set(doc(reference, 'events', 'on_the_way'), eventData(entry, 'on_the_way', actorUid));
  await batch.commit();
  return entryId;
}

export async function advancePickup(
  db: Firestore,
  entryId: string,
  expected: PickupStatus,
  next: PickupStatus,
  actorUid: string,
  details: { verificationMethod?: 'photo_id' | 'known_person'; verificationNote?: string; exceptionReason?: string } = {}
): Promise<void> {
  if (!canAdvancePickup(expected, next)) throw new Error('Invalid pickup transition.');
  const reference = doc(db, 'pickup_queue', entryId);
  const snapshot = await getDoc(reference);
  if (!snapshot.exists()) throw new Error('Pickup request no longer exists.');
  const entry = snapshot.data() as PickupEntry;
  if (entry.status !== expected || !entry.sessionDate || pickupEntryId(entry.organizationId, entry.studentId, entry.sessionDate) !== entryId) {
    throw new Error('The pickup state changed or this is a legacy record. Refresh the queue.');
  }
  const update: Record<string, unknown> = { status: next, updatedAt: serverTimestamp(), lastActorUid: actorUid, lastEventId: next };
  const eventDetails: Record<string, unknown> = {};
  if (next === 'arrived') update.arrivedAt = serverTimestamp();
  if (next === 'ready') update.readyAt = serverTimestamp();
  if (next === 'released') {
    if (!details.verificationMethod || (details.verificationNote?.trim().length || 0) > 500) {
      throw new Error('Record how the authorized picker was verified before release.');
    }
    update.releasedAt = serverTimestamp();
    update.verifiedPickerName = entry.pickerName;
    update.verifiedByUid = actorUid;
    update.verificationMethod = details.verificationMethod;
    update.verificationNote = (details.verificationNote || '').trim();
    Object.assign(eventDetails, { verifiedPickerName: entry.pickerName, verificationMethod: details.verificationMethod, verificationNote: (details.verificationNote || '').trim() });
  }
  if (next === 'confirmed') update.confirmedAt = serverTimestamp();
  if (next === 'cancelled' || next === 'exception') {
    if (!details.exceptionReason?.trim() || details.exceptionReason.trim().length < 8) throw new Error('Record the cancellation or exception reason.');
    update[next === 'cancelled' ? 'cancelledAt' : 'exceptionAt'] = serverTimestamp();
    update.exceptionReason = details.exceptionReason.trim();
    eventDetails.exceptionReason = details.exceptionReason.trim();
  }
  // The transition rule checks the current server state again at commit;
  // the matching event is written atomically with the status change.
  const batch = writeBatch(db);
  batch.update(reference, update);
  batch.set(doc(reference, 'events', next), eventData(entry, next, actorUid, eventDetails));
  await batch.commit();
}
