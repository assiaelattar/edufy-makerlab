import assert from 'node:assert/strict';
import { initializeApp as initializeClient, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { initializeApp as initializeAdmin, deleteApp as deleteAdmin } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

const projectId = process.env.GCLOUD_PROJECT;
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
assert.ok(projectId?.startsWith('demo-') && /^127\.0\.0\.1:\d+$/.test(firestoreHost || '') && /^127\.0\.0\.1:\d+$/.test(authHost || ''), 'Run against localhost demo Auth and Firestore emulators only.');

const adminApp = initializeAdmin({ projectId }, 'parent-family-rules');
const admin = getAdminFirestore(adminApp);
const clientApps = [];

const parent = async (name, organizationId = 'org-a') => {
  const app = initializeClient({ apiKey: 'fake-key', projectId, authDomain: `${projectId}.firebaseapp.com` }, name);
  clientApps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
  const { user } = await createUserWithEmailAndPassword(auth, `${name}@example.test`, 'emulator-password');
  await admin.doc(`users/${user.uid}`).set({ role: 'parent', organizationId, status: 'active' });
  const db = getFirestore(app);
  const [host, port] = firestoreHost.split(':');
  connectFirestoreEmulator(db, host, Number(port));
  return { db, uid: user.uid };
};

const projectsFor = (db, studentId, organizationId) => getDocs(query(
  collection(db, 'student_projects'),
  where('studentId', '==', studentId),
  ...(organizationId ? [where('organizationId', '==', organizationId)] : [])
));
const rowsFor = (db, collectionName, field, value) => getDocs(query(
  collection(db, collectionName),
  where(field, '==', value),
  where('organizationId', '==', 'org-a')
));
const denied = (promise, label) => assert.rejects(promise, error => {
  assert.equal(error?.code, 'permission-denied', `${label} must be rejected by rules`);
  return true;
});

try {
  const alice = await parent('parent-alice');
  const bob = await parent('parent-bob');
  const carol = await parent('parent-carol', 'org-b');
  const learner = await parent('learner-b');
  await admin.doc('users/' + learner.uid).update({ role: 'student' });
  await admin.doc('students/child-a').set({ organizationId: 'org-a', name: 'Child A', loginInfo: { uid: 'learner-auth-a' }, parentLoginInfo: { uid: bob.uid }, parentUids: [bob.uid] });
  await admin.doc('students/child-b').set({ organizationId: 'org-a', name: 'Child B', loginInfo: { uid: learner.uid } });
  await admin.doc('students/child-alias-only').set({ organizationId: 'org-a', name: 'Alias Child', loginInfo: { uid: 'learner-auth-alias' } });
  await admin.doc('students/child-foreign').set({ organizationId: 'org-b', name: 'Foreign Child' });
  for (const subjectId of ['child-a', 'learner-auth-a', 'child-b']) {
    await admin.doc(`guardian_links/${alice.uid}_${subjectId}`).set({
      parentUid: alice.uid, studentId: subjectId === 'learner-auth-a' ? 'child-a' : subjectId,
      subjectId, organizationId: 'org-a', status: 'active', permissions: ['portfolio', 'enrollments', 'payments', 'gallery']
    });
  }
  await admin.doc(`guardian_links/${alice.uid}_learner-auth-alias`).set({
    parentUid: alice.uid, studentId: 'child-alias-only', subjectId: 'learner-auth-alias',
    organizationId: 'org-a', status: 'active', permissions: ['portfolio']
  });
  await admin.doc(`guardian_links/${carol.uid}_child-a`).set({
    parentUid: carol.uid, studentId: 'child-a', subjectId: 'child-a',
    organizationId: 'org-a', status: 'active', permissions: ['portfolio']
  });
  await admin.doc('student_projects/canonical').set({ organizationId: 'org-a', studentId: 'child-a', status: 'building' });
  await admin.doc('student_projects/legacy-auth-uid').set({ organizationId: 'org-a', studentId: 'learner-auth-a', status: 'published' });
  await admin.doc('student_projects/sibling').set({ organizationId: 'org-a', studentId: 'child-b', status: 'submitted' });
  await admin.doc('student_projects/alias-only').set({ organizationId: 'org-a', studentId: 'learner-auth-alias', status: 'building' });
  await admin.doc('student_projects/canonical-unlinked').set({ organizationId: 'org-a', studentId: 'child-alias-only', status: 'published' });
  await admin.doc('student_projects/foreign').set({ organizationId: 'org-b', studentId: 'child-foreign', status: 'published' });
  await admin.doc('enrollments/enrollment-a').set({ organizationId: 'org-a', studentId: 'child-a', status: 'active' });
  await admin.doc('payments/payment-a').set({ organizationId: 'org-a', enrollmentId: 'enrollment-a', amount: 20 });
  await admin.doc('attendance/attendance-a').set({ organizationId: 'org-a', studentId: 'child-a', date: '2026-10-10', status: 'present' });
  await admin.doc('gallery_items/gallery-a').set({ organizationId: 'org-a', studentId: 'child-a', url: 'https://example.test/photo' });
  await admin.doc('pickup_queue/pickup-a').set({ organizationId: 'org-a', studentId: 'child-a', status: 'trip_announced' });
  await admin.doc('pickup_queue/pickup-b').set({ organizationId: 'org-a', studentId: 'child-b', status: 'trip_announced' });
  await admin.doc(`guardian_links/${alice.uid}_child-b`).update({ permissions: ['portfolio', 'pickup'] });

  const familyLinks = await getDocs(query(collection(alice.db, 'guardian_links'), where('parentUid', '==', alice.uid), where('organizationId', '==', 'org-a')));
  assert.equal(familyLinks.size, 4);
  assert.equal((await getDoc(doc(alice.db, 'students', 'child-a'))).data()?.name, 'Child A');
  assert.equal((await getDoc(doc(alice.db, 'students', 'child-alias-only'))).data()?.name, 'Alias Child');
  assert.equal((await projectsFor(alice.db, 'child-a', 'org-a')).size, 1);
  assert.equal((await projectsFor(alice.db, 'learner-auth-a', 'org-a')).size, 1);
  assert.equal((await projectsFor(alice.db, 'child-b', 'org-a')).size, 1);
  assert.equal((await projectsFor(alice.db, 'learner-auth-alias', 'org-a')).size, 1);
  assert.equal((await getDoc(doc(alice.db, 'enrollments', 'enrollment-a'))).data()?.studentId, 'child-a');
  assert.equal((await getDoc(doc(alice.db, 'payments', 'payment-a'))).data()?.amount, 20);
  assert.equal((await getDoc(doc(alice.db, 'attendance', 'attendance-a'))).data()?.status, 'present');
  assert.equal((await getDoc(doc(alice.db, 'gallery_items', 'gallery-a'))).data()?.studentId, 'child-a');
  assert.equal((await rowsFor(alice.db, 'enrollments', 'studentId', 'child-a')).size, 1);
  assert.equal((await rowsFor(alice.db, 'payments', 'enrollmentId', 'enrollment-a')).size, 1);
  assert.equal((await rowsFor(alice.db, 'attendance', 'studentId', 'child-a')).size, 1);
  assert.equal((await rowsFor(alice.db, 'gallery_items', 'studentId', 'child-a')).size, 1);
  assert.equal((await getDoc(doc(alice.db, 'pickup_queue', 'pickup-b'))).data()?.studentId, 'child-b');
  await denied(updateDoc(doc(alice.db, 'pickup_queue', 'pickup-b'), { status: 'arrived' }), 'parent pickup update is read only');
  await updateDoc(doc(learner.db, 'pickup_queue', 'pickup-b'), { status: 'arrived' });
  assert.equal((await getDoc(doc(alice.db, 'pickup_queue', 'pickup-b'))).data()?.status, 'arrived');
  await denied(getDoc(doc(alice.db, 'pickup_queue', 'pickup-a')), 'missing pickup permission');
  await denied(projectsFor(alice.db, 'child-alias-only', 'org-a'), 'missing canonical project link');
  await denied(projectsFor(bob.db, 'child-a', 'org-a'), 'unlinked parent');
  await denied(getDoc(doc(bob.db, 'students', 'child-a')), 'legacy parent fields without active link');
  await denied(projectsFor(alice.db, 'child-foreign', 'org-b'), 'foreign learner');
  await denied(projectsFor(carol.db, 'child-a', 'org-a'), 'guardian profile from another organization');
  await denied(getDoc(doc(bob.db, 'payments', 'payment-a')), 'unlinked parent payment');

  await admin.doc(`guardian_links/${alice.uid}_child-a`).update({ permissions: [] });
  await denied(projectsFor(alice.db, 'child-a', 'org-a'), 'missing portfolio permission');
  await denied(getDoc(doc(alice.db, 'enrollments', 'enrollment-a')), 'missing enrollment permission');
  await denied(getDoc(doc(alice.db, 'payments', 'payment-a')), 'missing payment permission');
  await denied(getDoc(doc(alice.db, 'attendance', 'attendance-a')), 'missing attendance visibility permission');
  await denied(getDoc(doc(alice.db, 'gallery_items', 'gallery-a')), 'missing gallery permission');
  await admin.doc(`guardian_links/${alice.uid}_child-a`).update({ permissions: ['portfolio', 'enrollments', 'payments', 'gallery'] });

  await admin.doc(`guardian_links/${alice.uid}_learner-auth-a`).update({ status: 'revoked' });
  await denied(projectsFor(alice.db, 'learner-auth-a', 'org-a'), 'revoked alias');
  assert.equal((await projectsFor(alice.db, 'child-a', 'org-a')).size, 1);
  console.log('parent family Auth/Firestore rules: canonical, sibling, alias-only, legacy-field denial, permission denial, finance, attendance, gallery, pickup, foreign, and revoked checks passed');
} finally {
  await Promise.all(clientApps.map(deleteApp));
  await deleteAdmin(adminApp);
}
