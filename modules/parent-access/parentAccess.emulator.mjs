import assert from 'node:assert/strict';
import { deleteApp as deleteClientApp, initializeApp as initializeClientApp } from 'firebase/app';
import { connectAuthEmulator, getAuth as getClientAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore, query, updateDoc, where } from 'firebase/firestore';
import { getAuth } from 'firebase-admin/auth';
import { deleteApp as deleteAdminApp } from 'firebase-admin/app';
import { getDb, getFirebaseAdminApp } from '../../api/agent/_lib/firebaseAdmin.js';
import handler, { parentAliasBase } from '../../api/parent-access/index.js';

assert(process.env.FIREBASE_AUTH_EMULATOR_HOST && process.env.FIRESTORE_EMULATOR_HOST);
assert(process.env.GCLOUD_PROJECT?.startsWith('demo-'));
const adminAuth = getAuth(getFirebaseAdminApp());
const db = getDb();
const app = initializeClientApp({ apiKey: 'demo-key', authDomain: 'localhost', projectId: process.env.GCLOUD_PROJECT });
const clientAuth = getClientAuth(app);
connectAuthEmulator(clientAuth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
assert.equal(parentAliasBase('  Élodie   Ben Ali  '), 'p.elodie.ben.ali');

const invoke = async (token, body) => {
  const req = { method: 'POST', headers: { authorization: `Bearer ${token}` }, body };
  const res = { statusCode: 200, headers: {}, setHeader(key, value) { this.headers[key] = value; return this; }, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
  await handler(req, res);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  return res;
};

const staff = await adminAuth.createUser({ email: 'owner@example.test', password: 'Demo-owner-password-123' });
const parentActor = await adminAuth.createUser({ email: 'parent@example.test', password: 'Demo-parent-password-123' });
const otherStaff = await adminAuth.createUser({ email: 'other@example.test', password: 'Demo-other-password-123' });
const collision = await adminAuth.createUser({ email: 'p.staff.name@makerlab.academy', password: 'Demo-collision-password-123' });
await Promise.all([
  db.doc(`users/${staff.uid}`).set({ organizationId: 'org-a', role: 'owner', status: 'active' }),
  db.doc(`users/${parentActor.uid}`).set({ organizationId: 'org-a', role: 'parent', status: 'active' }),
  db.doc(`users/${otherStaff.uid}`).set({ organizationId: 'org-b', role: 'owner', status: 'active' }),
  db.doc(`users/${collision.uid}`).set({ organizationId: 'org-a', role: 'instructor', status: 'active' }),
  ...['a', 'b', 'c', 'd', 'e'].map(id => db.doc(`students/child-${id}`).set({ organizationId: 'org-a', name: `Child ${id}`, parentName: id === 'd' ? 'Staff Name' : 'Samira Ajlane', ...(id === 'c' ? { loginInfo: { uid: 'learner-alias-c' } } : {}) })),
  db.doc('students/foreign').set({ organizationId: 'org-b', name: 'Foreign', parentName: 'Samira Ajlane' })
]);

const staffToken = await (await signInWithEmailAndPassword(clientAuth, 'owner@example.test', 'Demo-owner-password-123')).user.getIdToken();
const issue = async (studentId, parentName = 'Samira Ajlane', aliasBasis = 'Ajlane') => invoke(staffToken, {
  action: 'issue', studentId, organizationId: 'org-a', parentName, aliasBasis, relationshipVerified: true
});
assert.equal((await invoke(staffToken, { action: 'issue', studentId: 'child-a', organizationId: 'org-a', parentName: 'Samira Ajlane', aliasBasis: 'Ajlane' })).statusCode, 400);
assert.equal((await issue('child-a', 'Wrong Name')).statusCode, 400);
const first = await issue('child-a');
assert.equal(first.statusCode, 200, JSON.stringify(first.body?.error));
assert.equal(first.body.email, 'p.ajlane@makerlab.academy');
assert(first.body.password?.length >= 30);
const firstAuth = await adminAuth.getUserByEmail(first.body.email);
assert.equal(firstAuth.displayName, 'Samira Ajlane');
assert.equal(firstAuth.emailVerified, false);
assert.equal((await db.doc('students/child-a').get()).data().parentLoginInfo.uid, firstAuth.uid);
assert.equal((await db.doc(`guardian_links/${firstAuth.uid}_child-a`).get()).data().status, 'active');
assert.equal((await db.doc(`users/${firstAuth.uid}`).get()).data().role, 'parent');
assert.equal((await db.doc(`users/${firstAuth.uid}`).get()).data().name, 'Samira Ajlane');
assert.equal((await db.doc(`users/${firstAuth.uid}`).get()).data().accessVersion, 2);
assert.equal((await issue('child-a')).statusCode, 409);

const second = await issue('child-b');
assert.equal(second.statusCode, 200);
assert.equal(second.body.email, 'p.ajlane-2@makerlab.academy');
assert.equal((await adminAuth.getUserByEmail(second.body.email)).displayName, 'Samira Ajlane');
assert.notEqual((await adminAuth.getUserByEmail(second.body.email)).uid, firstAuth.uid);

const sibling = await invoke(staffToken, { action: 'link', studentId: 'child-c', organizationId: 'org-a', reuseParentUid: firstAuth.uid, relationshipVerified: true });
assert.equal(sibling.statusCode, 200);
assert.equal(sibling.body.email, first.body.email);
assert.equal(sibling.body.password, undefined);
assert.equal((await db.doc('students/child-c').get()).data().parentLoginInfo.uid, firstAuth.uid);
assert.equal((await db.doc(`guardian_links/${firstAuth.uid}_learner-alias-c`).get()).data().studentId, 'child-c');

// Consolidate a single-child legacy login into an already verified family account.
const olderKenza = await adminAuth.createUser({ email: 'p.kenza@example.test', password: 'Older-parent-password-123' });
await Promise.all([
  db.doc(`users/${olderKenza.uid}`).set({ uid: olderKenza.uid, organizationId: 'org-a', role: 'parent', status: 'active', name: 'Parent', email: olderKenza.email }),
  db.doc('students/child-kenza').set({ organizationId: 'org-a', name: 'Child Kenza', parentName: 'Samira Ajlane', loginInfo: { uid: 'learner-alias-kenza' }, parentLoginInfo: { uid: olderKenza.uid, email: olderKenza.email }, parentUids: [] })
]);
const transferRequest = { action: 'transfer', studentId: 'child-kenza', organizationId: 'org-a', reuseParentUid: firstAuth.uid, relationshipVerified: true };
assert.equal((await invoke(staffToken, { ...transferRequest, relationshipVerified: false })).statusCode, 400);
assert.equal((await invoke(staffToken, { ...transferRequest, reuseParentUid: collision.uid })).statusCode, 409);
await db.doc('students/another-child').set({ organizationId: 'org-a', name: 'Other child', parentName: 'Samira Ajlane', parentLoginInfo: { uid: olderKenza.uid, email: olderKenza.email } });
assert.equal((await invoke(staffToken, transferRequest)).statusCode, 409);
await db.doc('students/another-child').delete();
const transferred = await invoke(staffToken, transferRequest);
assert.equal(transferred.statusCode, 200, JSON.stringify(transferred.body?.error));
assert.equal(transferred.body.email, first.body.email);
assert.equal(transferred.body.password, undefined);
assert.equal((await db.doc('students/child-kenza').get()).data().parentLoginInfo.uid, firstAuth.uid);
assert.equal((await db.doc(`guardian_links/${firstAuth.uid}_learner-alias-kenza`).get()).data().status, 'active');
assert.equal((await db.doc(`users/${olderKenza.uid}`).get()).data().status, 'inactive');
assert.equal((await adminAuth.getUser(olderKenza.uid)).disabled, true);
assert.equal((await invoke(staffToken, transferRequest)).statusCode, 409);

// Prove the issued password reaches the same read-only family records used by SparkQuest.
await Promise.all([
  db.doc('student_projects/child-a-project').set({ organizationId: 'org-a', studentId: 'child-a', status: 'building' }),
  db.doc('student_projects/child-c-project').set({ organizationId: 'org-a', studentId: 'learner-alias-c', status: 'submitted' }),
  db.doc('enrollments/child-a-enrollment').set({ organizationId: 'org-a', studentId: 'child-a', status: 'active' }),
  db.doc('payments/child-a-payment').set({ organizationId: 'org-a', enrollmentId: 'child-a-enrollment', amount: 100 }),
  db.doc('attendance/child-a-attendance').set({ organizationId: 'org-a', studentId: 'child-a', status: 'present' }),
  db.doc('gallery_items/child-a-photo').set({ organizationId: 'org-a', studentId: 'child-a', url: 'https://example.test/photo.jpg' }),
  db.doc('pickup_queue/child-a-pickup').set({ organizationId: 'org-a', studentId: 'child-a', status: 'trip_announced' })
]);
const familyApp = initializeClientApp({ apiKey: 'demo-key', authDomain: 'localhost', projectId: process.env.GCLOUD_PROJECT }, 'issued-family');
const familyAuth = getClientAuth(familyApp);
connectAuthEmulator(familyAuth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
await signInWithEmailAndPassword(familyAuth, first.body.email, first.body.password);
const familyDb = getFirestore(familyApp);
const [firestoreHost, firestorePort] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
connectFirestoreEmulator(familyDb, firestoreHost, Number(firestorePort));
const familyLinks = await getDocs(query(collection(familyDb, 'guardian_links'), where('parentUid', '==', firstAuth.uid), where('organizationId', '==', 'org-a')));
assert.deepEqual(new Set(familyLinks.docs.map(link => link.data().studentId)), new Set(['child-a', 'child-c', 'child-kenza']));
assert.equal((await getDoc(doc(familyDb, 'students', 'child-a'))).data().name, 'Child a');
assert.equal((await getDoc(doc(familyDb, 'students', 'child-c'))).data().name, 'Child c');
assert.equal((await getDocs(query(collection(familyDb, 'student_projects'), where('studentId', '==', 'child-a'), where('organizationId', '==', 'org-a')))).size, 1);
assert.equal((await getDocs(query(collection(familyDb, 'student_projects'), where('studentId', '==', 'learner-alias-c'), where('organizationId', '==', 'org-a')))).size, 1);
assert.equal((await getDoc(doc(familyDb, 'enrollments', 'child-a-enrollment'))).data().studentId, 'child-a');
assert.equal((await getDoc(doc(familyDb, 'payments', 'child-a-payment'))).data().amount, 100);
assert.equal((await getDoc(doc(familyDb, 'attendance', 'child-a-attendance'))).data().status, 'present');
assert.equal((await getDoc(doc(familyDb, 'gallery_items', 'child-a-photo'))).data().studentId, 'child-a');
assert.equal((await getDoc(doc(familyDb, 'pickup_queue', 'child-a-pickup'))).data().status, 'trip_announced');
await assert.rejects(getDoc(doc(familyDb, 'students', 'child-b')), { code: 'permission-denied' });
await assert.rejects(updateDoc(doc(familyDb, 'pickup_queue', 'child-a-pickup'), { status: 'arrived' }), { code: 'permission-denied' });
await assert.rejects(updateDoc(doc(familyDb, 'student_projects', 'child-a-project'), { status: 'published' }), { code: 'permission-denied' });

const distinct = await issue('child-d', 'Staff Name', 'Staff Name');
assert.equal(distinct.statusCode, 200);
assert.equal(distinct.body.email, 'p.staff.name-2@makerlab.academy');
assert.equal((await db.doc(`users/${collision.uid}`).get()).data().role, 'instructor');
const deniedStaffLink = await invoke(staffToken, { action: 'link', studentId: 'foreign', organizationId: 'org-a', reuseParentUid: collision.uid, relationshipVerified: true });
assert.equal(deniedStaffLink.statusCode, 404);
const deniedRoleLink = await invoke(staffToken, { action: 'link', studentId: 'child-e', organizationId: 'org-a', reuseParentUid: collision.uid, relationshipVerified: true });
assert.equal(deniedRoleLink.statusCode, 403);

const parentToken = await (await signInWithEmailAndPassword(clientAuth, 'parent@example.test', 'Demo-parent-password-123')).user.getIdToken();
assert.equal((await invoke(parentToken, { action: 'issue', studentId: 'child-a', organizationId: 'org-a' })).statusCode, 403);
const foreignToken = await (await signInWithEmailAndPassword(clientAuth, 'other@example.test', 'Demo-other-password-123')).user.getIdToken();
assert.equal((await invoke(foreignToken, { action: 'reset', studentId: 'child-a', organizationId: 'org-a' })).statusCode, 403);
assert.equal((await invoke(staffToken, { action: 'reset', studentId: 'foreign', organizationId: 'org-a' })).statusCode, 404);
assert.equal((await invoke(staffToken, { action: 'reset', studentId: 'child-e', organizationId: 'org-a' })).statusCode, 409);

// A historical parent pointer can reference an Edufy staff account. Repair only the learner link.
await db.doc(`users/${staff.uid}`).update({ email: staff.email });
await db.doc('students/child-e').update({ parentLoginInfo: { uid: staff.uid, email: staff.email }, parentUids: [staff.uid] });
const mistakenStaffRequest = { action: 'replace', studentId: 'child-e', organizationId: 'org-a', parentName: 'Samira Ajlane', aliasBasis: 'Staff Link', relationshipVerified: true };
const mistakenStaffResponse = await invoke(staffToken, mistakenStaffRequest);
assert.equal(mistakenStaffResponse.statusCode, 409);
assert.equal(mistakenStaffResponse.body.code, 'staff_login_mislinked');
assert.equal((await invoke(staffToken, { ...mistakenStaffRequest, action: 'repairStaffLink', relationshipVerified: false })).statusCode, 400);
await db.doc('students/child-h').set({ organizationId: 'org-a', name: 'Unrelated child', parentName: 'Another Parent', parentLoginInfo: { uid: staff.uid, email: staff.email }, parentUids: [staff.uid] });
assert.equal((await invoke(staffToken, { ...mistakenStaffRequest, action: 'repairStaffLink' })).statusCode, 409);
await db.doc('students/child-h').delete();
const repairedStaffLink = await invoke(staffToken, { ...mistakenStaffRequest, action: 'repairStaffLink' });
assert.equal(repairedStaffLink.statusCode, 200, JSON.stringify(repairedStaffLink.body?.error));
const repairedParent = await adminAuth.getUserByEmail(repairedStaffLink.body.email);
assert.equal((await db.doc(`users/${repairedParent.uid}`).get()).data().accessVersion, 2);
assert.equal((await db.doc('students/child-e').get()).data().parentLoginInfo.uid, repairedParent.uid);
assert.equal((await db.doc('students/child-e').get()).data().parentUids.includes(staff.uid), false);
assert.equal((await db.doc(`guardian_links/${repairedParent.uid}_child-e`).get()).data().status, 'active');
assert.equal((await db.doc(`users/${staff.uid}`).get()).data().role, 'owner');
assert.equal((await adminAuth.getUser(staff.uid)).disabled, false);
assert.equal((await invoke(staffToken, { ...mistakenStaffRequest, action: 'repairStaffLink' })).statusCode, 409);

const reset = await invoke(staffToken, { action: 'reset', studentId: 'child-a', organizationId: 'org-a' });
assert.equal(reset.statusCode, 200, JSON.stringify(reset.body?.error));
assert.notEqual(reset.body.password, first.body.password);
await assert.rejects(() => signInWithEmailAndPassword(clientAuth, first.body.email, first.body.password));
await signInWithEmailAndPassword(clientAuth, first.body.email, reset.body.password);
const stored = JSON.stringify({ student: (await db.doc('students/child-a').get()).data(), profile: (await db.doc(`users/${firstAuth.uid}`).get()).data(), link: (await db.doc(`guardian_links/${firstAuth.uid}_child-a`).get()).data() });
assert(!stored.includes(first.body.password) && !stored.includes(reset.body.password));

// Legacy setup-link accounts may have an old email, linked siblings, and incomplete guardian links.
const legacy = await adminAuth.createUser({ email: 'legacy-ajlane@example.test', password: 'Legacy-password-123', displayName: 'Samira Ajlane' });
await Promise.all([
  db.doc(`users/${legacy.uid}`).set({ uid: legacy.uid, organizationId: 'org-a', role: 'parent', status: 'active', email: legacy.email, name: 'Samira Ajlane' }),
  db.doc('students/child-f').set({ organizationId: 'org-a', name: 'Child f', parentName: 'Samira Ajlane', parentLoginInfo: { uid: legacy.uid, email: legacy.email }, parentUids: [legacy.uid] }),
  db.doc('students/child-g').set({ organizationId: 'org-a', name: 'Child g', parentName: 'Samira Ajlane', loginInfo: { uid: 'learner-alias-g' }, parentLoginInfo: { uid: legacy.uid, email: legacy.email }, parentUids: [legacy.uid] }),
  db.doc(`guardian_links/${legacy.uid}_child-g`).set({ organizationId: 'org-a', parentUid: legacy.uid, studentId: 'child-g', subjectId: 'child-g', status: 'active', permissions: ['portfolio'] })
]);
assert.equal((await issue('child-f')).statusCode, 409);
assert.equal((await invoke(staffToken, { action: 'reset', studentId: 'child-f', organizationId: 'org-a' })).statusCode, 409);
const replaceRequest = { action: 'replace', studentId: 'child-f', organizationId: 'org-a', parentName: 'Samira Ajlane', aliasBasis: 'Ajlane', relationshipVerified: true };
assert.equal((await invoke(staffToken, { ...replaceRequest, relationshipVerified: false })).statusCode, 400);
assert.equal((await invoke(staffToken, { ...replaceRequest, parentName: 'Other Parent' })).statusCode, 400);
await db.doc('students/child-h').set({ organizationId: 'org-a', name: 'Child h', parentName: 'Different Parent', parentLoginInfo: { uid: legacy.uid, email: legacy.email }, parentUids: [legacy.uid] });
assert.equal((await invoke(staffToken, replaceRequest)).statusCode, 409);
await db.doc('students/child-h').delete();
const replaced = await invoke(staffToken, replaceRequest);
assert.equal(replaced.statusCode, 200, JSON.stringify(replaced.body?.error));
assert.equal(replaced.body.email, 'p.ajlane-3@makerlab.academy');
assert.equal(replaced.body.linkedLearnerCount, 2);
assert(replaced.body.password?.length >= 30);
const replacement = await adminAuth.getUserByEmail(replaced.body.email);
assert.equal((await adminAuth.getUser(legacy.uid)).disabled, true);
assert.equal((await db.doc(`users/${legacy.uid}`).get()).data().status, 'inactive');
for (const childId of ['child-f', 'child-g']) {
  const child = (await db.doc(`students/${childId}`).get()).data();
  assert.deepEqual(child.parentLoginInfo, { uid: replacement.uid, email: replaced.body.email });
  assert(child.parentUids.includes(replacement.uid) && !child.parentUids.includes(legacy.uid));
  assert.equal((await db.doc(`guardian_links/${replacement.uid}_${childId}`).get()).data().status, 'active');
}
assert.equal((await db.doc(`guardian_links/${replacement.uid}_learner-alias-g`).get()).data().studentId, 'child-g');
assert.equal((await db.doc(`guardian_links/${legacy.uid}_child-g`).get()).data().status, 'inactive');
await assert.rejects(() => signInWithEmailAndPassword(clientAuth, legacy.email, 'Legacy-password-123'));
await signInWithEmailAndPassword(clientAuth, replaced.body.email, replaced.body.password);
const replacementReset = await invoke(staffToken, { action: 'reset', studentId: 'child-f', organizationId: 'org-a' });
assert.equal(replacementReset.statusCode, 200);
console.log('Parent access emulator: issue, family reads, sibling link, legacy transfer, staff-link repair, legacy replacement, old-account revocation, reset, denials and plaintext checks passed.');
await Promise.all([deleteClientApp(app), deleteClientApp(familyApp)]);
await deleteAdminApp(getFirebaseAdminApp());
