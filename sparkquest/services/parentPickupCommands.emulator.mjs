import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';
import { initializeApp as initializeClient, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, collection, doc, getDoc, getDocs, query, where, writeBatch, serverTimestamp } from 'firebase/firestore';
import { initializeApp as initializeAdmin, deleteApp as deleteAdmin } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

const projectId = process.env.GCLOUD_PROJECT;
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
assert.ok(projectId?.startsWith('demo-') && /^127\.0\.0\.1:\d+$/.test(firestoreHost || '') && /^127\.0\.0\.1:\d+$/.test(authHost || ''), 'Run against explicit localhost demo emulators only.');

// Keep the compiled service under SparkQuest node_modules so external Firebase imports
// resolve to the same v12 SDK used by the application, never the Edufy root SDK.
const serviceSource = fileURLToPath(new URL('./parentPickupCommands.ts', import.meta.url));
const serviceOutput = fileURLToPath(new URL('../node_modules/.cache/pickup/parentPickupCommands.mjs', import.meta.url));
await mkdir(path.dirname(serviceOutput), { recursive: true });
await build({ entryPoints: [serviceSource], outfile: serviceOutput, bundle: true, packages: 'external', platform: 'node', format: 'esm', logLevel: 'silent' });
const { announceParentPickup, advanceParentPickup } = await import(pathToFileURL(serviceOutput).href);

const adminApp = initializeAdmin({ projectId }, 'sparkquest-parent-pickup-tests');
const admin = getAdminFirestore(adminApp);
const clients = [];
const client = async (name, role = 'parent', profileName = name) => {
  const app = initializeClient({ apiKey: 'fake-key', projectId, authDomain: `${projectId}.firebaseapp.com` }, name);
  clients.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
  const { user } = await createUserWithEmailAndPassword(auth, `${name}@example.test`, 'emulator-password');
  await admin.doc(`users/${user.uid}`).set({ role, organizationId: 'org-sparkquest-pickup', status: 'active', name: profileName });
  const db = getFirestore(app);
  const [host, port] = firestoreHost.split(':');
  connectFirestoreEmulator(db, host, Number(port));
  return { db, uid: user.uid };
};
const link = (parentUid, studentId, status = 'active') =>
  admin.doc(`guardian_links/${parentUid}_${studentId}`).set({
    organizationId: 'org-sparkquest-pickup', parentUid, studentId, status, permissions: ['pickup']
  });
const student = (studentId, parentUid) =>
  admin.doc(`students/${studentId}`).set({
    organizationId: 'org-sparkquest-pickup', status: 'active', name: studentId,
    parentName: 'Maya', authorizedPickups: ['Uncle Sam'], parentLoginInfo: { uid: parentUid }
  });
const cancelled = (actor, entryId, expected = 'on_the_way') =>
  advanceParentPickup(actor.db, 'org-sparkquest-pickup', entryId, actor.uid, expected, 'cancelled', 'Pickup plan changed.');

try {
  const primary = await client('sparkquest-primary', 'parent', 'Maya');
  const secondary = await client('sparkquest-secondary', 'parent', 'Uncle Sam');
  const staff = await client('sparkquest-staff', 'instructor');
  for (const studentId of ['learner-sq-a', 'learner-sq-b', 'learner-sq-c']) {
    await student(studentId, primary.uid);
    await link(primary.uid, studentId);
    await link(secondary.uid, studentId);
  }

  console.log('Adapter check: create first dated request.');
  const firstId = await announceParentPickup(primary.db, 'org-sparkquest-pickup', 'learner-sq-a', primary.uid, 'Uncle Sam');
  const activeQuery = query(
    collection(primary.db, 'pickup_queue'),
    where('organizationId', '==', 'org-sparkquest-pickup'),
    where('studentId', '==', 'learner-sq-a'),
    where('status', 'in', ['waiting', 'on_the_way', 'arrived', 'released'])
  );
  assert.equal((await getDocs(activeQuery)).size, 1, 'Parent can run the active-conflict guard query.');
  console.log('Adapter check: second guardian arrival.');
  await advanceParentPickup(secondary.db, 'org-sparkquest-pickup', firstId, secondary.uid, 'on_the_way', 'arrived');
  assert.equal((await getDoc(doc(primary.db, 'pickup_queue', firstId))).data()?.lastActorUid, secondary.uid);

  const firstRef = doc(staff.db, 'pickup_queue', firstId);
  const release = writeBatch(staff.db);
  release.update(firstRef, {
    status: 'released', releasedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    lastActorUid: staff.uid, lastEventId: 'released', verifiedByUid: staff.uid,
    verifiedPickerName: 'Uncle Sam', verificationMethod: 'photo_id', verificationNote: 'Photo ID matched the list.'
  });
  release.set(doc(firstRef, 'events', 'released'), {
    organizationId: 'org-sparkquest-pickup', studentId: 'learner-sq-a', pickerName: 'Uncle Sam',
    status: 'released', at: serverTimestamp(), actorUid: staff.uid,
    verifiedPickerName: 'Uncle Sam', verificationMethod: 'photo_id', verificationNote: 'Photo ID matched the list.'
  });
  await release.commit();
  console.log('Adapter check: second guardian receipt.');
  await assert.rejects(
    advanceParentPickup(primary.db, 'org-sparkquest-pickup', firstId, primary.uid, 'released', 'confirmed'),
    error => error?.code === 'permission-denied'
  );
  await advanceParentPickup(secondary.db, 'org-sparkquest-pickup', firstId, secondary.uid, 'released', 'confirmed');
  const first = (await getDoc(firstRef)).data();
  assert.equal(first?.parentUid, primary.uid);
  assert.equal(first?.lastActorUid, secondary.uid);
  assert.equal((await getDoc(doc(primary.db, 'pickup_queue', firstId, 'events', 'confirmed'))).data()?.actorUid, secondary.uid);

  console.log('Adapter check: second dated request and cancellation.');
  const secondId = await announceParentPickup(primary.db, 'org-sparkquest-pickup', 'learner-sq-b', primary.uid, 'Uncle Sam');
  await admin.doc(`guardian_links/${secondary.uid}_learner-sq-b`).update({ status: 'revoked' });
  await assert.rejects(cancelled(secondary, secondId), error => error?.code === 'permission-denied');
  await link(secondary.uid, 'learner-sq-b');
  await admin.doc(`users/${secondary.uid}`).update({ status: 'inactive' });
  await assert.rejects(cancelled(secondary, secondId), error => error?.code === 'permission-denied');
  await admin.doc(`users/${secondary.uid}`).update({ status: 'active' });
  await cancelled(secondary, secondId);
  assert.equal((await getDoc(doc(primary.db, 'pickup_queue', secondId))).data()?.lastActorUid, secondary.uid);

  await assert.rejects(
    announceParentPickup(secondary.db, 'org-sparkquest-pickup', 'learner-sq-c', primary.uid, 'Uncle Sam'),
    error => error?.code === 'permission-denied'
  );
  console.log('Adapter check: second guardian initiates third request.');
  const thirdId = await announceParentPickup(secondary.db, 'org-sparkquest-pickup', 'learner-sq-c', secondary.uid, 'Uncle Sam');
  await cancelled(primary, thirdId);
  assert.equal((await getDoc(doc(secondary.db, 'pickup_queue', thirdId))).data()?.parentUid, secondary.uid);
  console.log('SparkQuest Firebase 12 parent Pickup adapter passed: atomic create/event, cross-guardian arrival/receipt/cancel, immutable initiator, revoked/inactive and spoof denial.');
} finally {
  await Promise.all(clients.map(deleteApp));
  await deleteAdmin(adminApp);
}
