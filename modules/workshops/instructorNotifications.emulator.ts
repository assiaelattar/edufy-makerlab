import assert from 'node:assert/strict';
import { deleteApp, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, connectFirestoreEmulator, doc, getDocs, getFirestore, orderBy, query, runTransaction, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { deleteApp as deleteAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
// @ts-expect-error The production admin helper is JavaScript and intentionally has no declaration file.
import { getDb, getFirebaseAdminApp } from '../../api/agent/_lib/firebaseAdmin.js';

assert(process.env.GCLOUD_PROJECT?.startsWith('demo-'));
assert(process.env.FIREBASE_PROJECT_ID === process.env.GCLOUD_PROJECT);
assert(process.env.FIREBASE_AUTH_EMULATOR_HOST?.startsWith('127.0.0.1:'));
assert(process.env.FIRESTORE_EMULATOR_HOST?.startsWith('127.0.0.1:'));

const projectId = process.env.GCLOUD_PROJECT;
const adminApp = getFirebaseAdminApp();
const adminDb = getDb();
const adminAuth = getAdminAuth(adminApp);
const password = 'test-only-password-123';
const manager = await adminAuth.createUser({ email: 'manager@example.test', password });
const instructor = await adminAuth.createUser({ email: 'instructor@example.test', password });
await adminDb.doc(`users/${manager.uid}`).set({ uid: manager.uid, role: 'admin', status: 'active', organizationId: 'org-a' });
await adminDb.doc(`users/${instructor.uid}`).set({ uid: instructor.uid, role: 'instructor', status: 'active', organizationId: 'org-a' });
await adminDb.doc('workshop_slots/slot-a').set({
  organizationId: 'org-a', workshopTemplateId: 'template-a', date: '2030-05-20',
  startTime: '10:00', endTime: '11:00', capacity: 2, bookedCount: 1, status: 'available'
});

const makeClient = async (name: string, email: string) => {
  const app = initializeApp({ apiKey: 'demo-key', authDomain: 'localhost', projectId }, name);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
  await signInWithEmailAndPassword(auth, email, password);
  const firestore = getFirestore(app);
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(':');
  connectFirestoreEmulator(firestore, host, Number(port));
  return { app, firestore };
};

const managerClient = await makeClient('workshop-manager', 'manager@example.test');
const instructorClient = await makeClient('workshop-instructor', 'instructor@example.test');
const slotRef = doc(managerClient.firestore, 'workshop_slots', 'slot-a');
const notificationRef = doc(managerClient.firestore, 'notifications', 'assignment-a');
await runTransaction(managerClient.firestore, async transaction => {
  const slot = await transaction.get(slotRef);
  assert.equal(slot.data()?.organizationId, 'org-a');
  transaction.update(slotRef, { instructorId: instructor.uid, instructorName: 'Instructor Demo' });
  transaction.set(notificationRef, {
    userId: instructor.uid, organizationId: 'org-a', workshopSlotId: 'slot-a',
    type: 'info', title: 'Nouvel atelier affecté', message: 'Atelier Démo · 2030-05-20 10:00–11:00',
    read: false, createdAt: serverTimestamp()
  });
});

const notifications = await getDocs(query(
  collection(instructorClient.firestore, 'notifications'),
  where('userId', '==', instructor.uid), orderBy('createdAt', 'desc')
));
assert.equal(notifications.size, 1);
assert.equal(notifications.docs[0].data().workshopSlotId, 'slot-a');
await updateDoc(doc(instructorClient.firestore, 'notifications', notifications.docs[0].id), { read: true });
assert.equal((await adminDb.doc('notifications/assignment-a').get()).data()?.read, true);

console.log('Instructor notification emulator: atomic assignment, recipient inbox query and read acknowledgement passed.');
await deleteApp(managerClient.app);
await deleteApp(instructorClient.app);
await deleteAdminApp(adminApp);
