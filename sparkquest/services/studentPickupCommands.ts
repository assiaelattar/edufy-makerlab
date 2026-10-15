import { doc, getDoc, serverTimestamp, writeBatch, type Firestore } from 'firebase/firestore';
import { pickupEntryId } from '../domain/pickupLifecycle';

interface StudentPickupEntry {
  organizationId: string;
  studentId: string;
  pickerName: string;
  sessionDate: string;
  status: string;
}

export async function markStudentReady(
  db: Firestore,
  organizationId: string,
  studentId: string,
  entryId: string,
  actorUid: string,
): Promise<void> {
  const reference = doc(db, 'pickup_queue', entryId);
  const snapshot = await getDoc(reference);
  const entry = snapshot.data() as StudentPickupEntry | undefined;
  if (!entry || entry.organizationId !== organizationId || entry.studentId !== studentId ||
      entry.status !== 'arrived' || pickupEntryId(organizationId, studentId, entry.sessionDate) !== entryId) {
    throw new Error('The pickup status changed. Refresh before marking yourself ready.');
  }

  const batch = writeBatch(db);
  batch.update(reference, {
    status: 'ready',
    readyAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastActorUid: actorUid,
    lastEventId: 'ready',
  });
  batch.set(doc(reference, 'events', 'ready'), {
    organizationId,
    studentId,
    pickerName: entry.pickerName,
    status: 'ready',
    at: serverTimestamp(),
    actorUid,
  });
  await batch.commit();
}
