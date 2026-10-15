import assert from 'node:assert/strict';
import { deleteApp as deleteClientApp, initializeApp as initializeClientApp } from 'firebase/app';
import { connectAuthEmulator, getAuth as getClientAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore, query, updateDoc, where } from 'firebase/firestore';
import { getAuth } from 'firebase-admin/auth';
import { deleteApp as deleteAdminApp } from 'firebase-admin/app';
import { getDb, getFirebaseAdminApp } from '../../api/agent/_lib/firebaseAdmin.js';
import handler, { familyLabelFromStudent, parentAliasBase } from '../../api/parent-access/index.js';

assert(process.env.FIREBASE_AUTH_EMULATOR_HOST && process.env.FIRESTORE_EMULATOR_HOST);
assert(process.env.GCLOUD_PROJECT?.startsWith('demo-'));
const adminAuth = getAuth(getFirebaseAdminApp());
const db = getDb();
const app = initializeClientApp({ apiKey: 'demo-key', authDomain: 'localhost', projectId: process.env.GCLOUD_PROJECT });
const clientAuth = getClientAuth(app);
connectAuthEmulator(clientAuth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
assert.equal(parentAliasBase('  Élodie   Ben Ali  '), 'p.elodie.ben.ali');
assert.equal(familyLabelFromStudent('YASMINE OUBELLA', 'p.oubella@makerlab.academy'), 'OUBELLA family');
assert.equal(familyLabelFromStudent('AAJLANE NADA', 'p.aajlane@makerlab.academy'), 'AAJLANE family');

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
await db.doc('students/child-no-parent-name').set({ organizationId: 'org-a', name: 'LINA BENALI' });
assert.equal((await invoke(staffToken, { action: 'issue', studentId: 'child-no-parent-name', organizationId: 'org-a', relationshipVerified: true })).statusCode, 400);
const nameFreeIssue = await invoke(staffToken, { action: 'issue', studentId: 'child-no-parent-name', organizationId: 'org-a', parentName: 'Verified Benali', aliasBasis: 'Benali', relationshipVerified: true });
assert.equal(nameFreeIssue.statusCode, 200, JSON.stringify(nameFreeIssue.body?.error));
assert.equal(nameFreeIssue.body.email, 'p.benali@makerlab.academy');
assert.equal((await db.doc('students/child-no-parent-name').get()).data().parentName, 'Verified Benali');
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
const platformAdmin = await adminAuth.createUser({ email: 'platform@example.test', password: 'Demo-platform-password-123' });
await Promise.all([
  db.doc(`users/${platformAdmin.uid}`).set({ organizationId: 'atlas-platform', role: 'super_admin', status: 'active' }),
  db.doc('organizations/org-a').set({ name: 'Organization A', status: 'active' })
]);
const platformToken = await (await signInWithEmailAndPassword(clientAuth, 'platform@example.test', 'Demo-platform-password-123')).user.getIdToken();
assert.equal((await invoke(platformToken, { action: 'directory', organizationId: 'org-a' })).statusCode, 200);
assert.equal((await invoke(platformToken, { action: 'directory', organizationId: 'unknown' })).statusCode, 403);
const foreignFamily = await adminAuth.createUser({ email: 'p.foreign.family@makerlab.academy', password: 'Foreign-family-password-123' });
await Promise.all([
  db.doc(`users/${foreignFamily.uid}`).set({ organizationId: 'org-b', role: 'parent', status: 'active', email: foreignFamily.email, name: 'Foreign Family' }),
  db.doc('students/foreign').update({ parentLoginInfo: { uid: foreignFamily.uid, email: foreignFamily.email } }),
  db.doc(`guardian_links/${foreignFamily.uid}_foreign`).set({ organizationId: 'org-b', parentUid: foreignFamily.uid, studentId: 'foreign', subjectId: 'foreign', status: 'active' }),
  db.doc(`guardian_links/${firstAuth.uid}_child-b`).set({ organizationId: 'org-a', parentUid: firstAuth.uid, studentId: 'child-b', subjectId: 'child-b', status: 'active' })
]);
assert.equal((await invoke(parentToken, { action: 'directory', organizationId: 'org-a' })).statusCode, 403);
assert.equal((await invoke(foreignToken, { action: 'directory', organizationId: 'org-a' })).statusCode, 403);
const directory = await invoke(staffToken, { action: 'directory', organizationId: 'org-a' });
assert.equal(directory.statusCode, 200, JSON.stringify(directory.body?.error));
assert(!directory.body.accounts.some(account => account.uid === foreignFamily.uid || account.uid === parentActor.uid));
const firstDirectoryAccount = directory.body.accounts.find(account => account.uid === firstAuth.uid);
assert.equal(firstDirectoryAccount.email, first.body.email);
assert.equal(firstDirectoryAccount.parentName, 'Samira Ajlane');
assert.deepEqual(new Set(firstDirectoryAccount.children.map(child => child.id)), new Set(['child-a', 'child-c', 'child-kenza']));
assert.deepEqual(new Set(firstDirectoryAccount.children.map(child => child.name)), new Set(['Child a', 'Child c', 'Child Kenza']));
await db.doc(`guardian_links/${firstAuth.uid}_child-b`).delete();
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

assert.equal((await invoke(staffToken, { action: 'reset', studentId: 'child-a', organizationId: 'org-a' })).statusCode, 400);
const reset = await invoke(staffToken, { action: 'reset', studentId: 'child-a', organizationId: 'org-a', relationshipVerified: true });
assert.equal(reset.statusCode, 200, JSON.stringify(reset.body?.error));
assert.notEqual(reset.body.password, first.body.password);
await assert.rejects(() => signInWithEmailAndPassword(clientAuth, first.body.email, first.body.password));
await signInWithEmailAndPassword(clientAuth, first.body.email, reset.body.password);
const stored = JSON.stringify({ student: (await db.doc('students/child-a').get()).data(), profile: (await db.doc(`users/${firstAuth.uid}`).get()).data(), link: (await db.doc(`guardian_links/${firstAuth.uid}_child-a`).get()).data() });
assert(!stored.includes(first.body.password) && !stored.includes(reset.body.password));

// An enrollment-era contact address may point to no Auth user or parent profile.
await Promise.all([
  db.doc('students/contact-child-1').set({ organizationId: 'org-a', name: 'Child One', parentLoginInfo: { uid: 'old-contact-uid', email: 'contact@example.test' }, parentUids: ['old-contact-uid'] }),
  db.doc('students/contact-child-2').set({ organizationId: 'org-a', name: 'Child Two', parentName: 'CONTACT family', parentLoginInfo: { uid: 'old-contact-uid', email: 'contact@example.test' }, parentUids: ['old-contact-uid'] })
]);
const contactReset = await invoke(platformToken, { action: 'reset', studentId: 'contact-child-1', organizationId: 'org-a', relationshipVerified: true });
assert.equal(contactReset.statusCode, 400);
const contactReplaceRequest = { action: 'replace', studentId: 'contact-child-1', organizationId: 'org-a', parentName: 'Verified Guardian', aliasBasis: 'Guardian', relationshipVerified: true };
assert.equal((await invoke(platformToken, { ...contactReplaceRequest, relationshipVerified: false })).statusCode, 400);
await db.doc('students/contact-foreign').set({ organizationId: 'org-b', parentLoginInfo: { uid: 'old-contact-uid', email: 'contact@example.test' } });
assert.equal((await invoke(platformToken, contactReplaceRequest)).statusCode, 409);
await db.doc('students/contact-foreign').delete();
const contactReplacement = await invoke(platformToken, contactReplaceRequest);
assert.equal(contactReplacement.statusCode, 200, JSON.stringify(contactReplacement.body?.error));
assert.equal(contactReplacement.body.email, 'p.guardian@makerlab.academy');
const contactAuth = await adminAuth.getUserByEmail(contactReplacement.body.email);
for (const id of ['contact-child-1', 'contact-child-2']) {
  const child = (await db.doc(`students/${id}`).get()).data();
  assert.equal(child.parentName, 'Verified Guardian');
  assert.equal(child.parentLoginInfo.uid, contactAuth.uid);
  assert.deepEqual(child.parentUids, [contactAuth.uid]);
  assert.equal((await db.doc(`guardian_links/${contactAuth.uid}_${id}`).get()).data().status, 'active');
}
await signInWithEmailAndPassword(clientAuth, contactReplacement.body.email, contactReplacement.body.password);
const redisplayed = await invoke(platformToken, { action: 'reset', studentId: 'contact-child-1', organizationId: 'org-a', relationshipVerified: true });
assert.equal(redisplayed.statusCode, 200);
assert.notEqual(redisplayed.body.password, contactReplacement.body.password);
await assert.rejects(() => signInWithEmailAndPassword(clientAuth, contactReplacement.body.email, contactReplacement.body.password));
await signInWithEmailAndPassword(clientAuth, contactReplacement.body.email, redisplayed.body.password);

const oldEmailAuth = await adminAuth.createUser({ email: 'old-parent-contact@example.test', password: 'Old-contact-password-123' });
await Promise.all([
  db.doc(`users/${oldEmailAuth.uid}`).set({ uid: oldEmailAuth.uid, organizationId: 'org-a', role: 'parent', status: 'active', name: 'Verified Contact', email: oldEmailAuth.email }),
  db.doc('students/external-auth-child').set({ organizationId: 'org-a', name: 'External child', parentName: 'Verified Contact',
    parentLoginInfo: { uid: oldEmailAuth.uid, email: oldEmailAuth.email }, parentUids: [oldEmailAuth.uid] })
]);
const externalAuthReplacement = await invoke(staffToken, { action: 'replace', studentId: 'external-auth-child', organizationId: 'org-a',
  parentName: 'Verified Contact', aliasBasis: 'Contact', relationshipVerified: true });
assert.equal(externalAuthReplacement.statusCode, 200, JSON.stringify(externalAuthReplacement.body?.error));
assert.equal(externalAuthReplacement.body.email, 'p.contact@makerlab.academy');
assert.equal((await adminAuth.getUser(oldEmailAuth.uid)).disabled, true);
assert.equal((await db.doc(`users/${oldEmailAuth.uid}`).get()).data().status, 'inactive');
await signInWithEmailAndPassword(clientAuth, externalAuthReplacement.body.email, externalAuthReplacement.body.password);

await db.doc('students/platform-mislink-child').set({ organizationId: 'org-a', name: 'Platform mislink',
  parentLoginInfo: { uid: platformAdmin.uid, email: platformAdmin.email }, parentUids: [platformAdmin.uid] });
const platformMislink = { action: 'replace', studentId: 'platform-mislink-child', organizationId: 'org-a',
  parentName: 'Verified Platform Guardian', aliasBasis: 'Platform Guardian', relationshipVerified: true };
assert.equal((await invoke(platformToken, platformMislink)).body.code, 'staff_login_mislinked');
const platformRepaired = await invoke(platformToken, { ...platformMislink, action: 'repairStaffLink' });
assert.equal(platformRepaired.statusCode, 200, JSON.stringify(platformRepaired.body?.error));
assert.equal((await db.doc('students/platform-mislink-child').get()).data().parentName, 'Verified Platform Guardian');
assert.equal((await adminAuth.getUser(platformAdmin.uid)).disabled, false);

// Legacy setup-link accounts may have an old email, linked siblings, and incomplete guardian links.
const legacy = await adminAuth.createUser({ email: 'p.legacy.ajlane@makerlab.academy', password: 'Legacy-password-123', displayName: 'Samira Ajlane' });
await Promise.all([
  db.doc(`users/${legacy.uid}`).set({ uid: legacy.uid, organizationId: 'org-a', role: 'parent', status: 'active', email: legacy.email, name: 'Samira Ajlane' }),
  db.doc('students/child-f').set({ organizationId: 'org-a', name: 'Child f', parentName: 'Samira Ajlane', parentLoginInfo: { uid: legacy.uid, email: legacy.email }, parentUids: [legacy.uid] }),
  db.doc('students/child-g').set({ organizationId: 'org-a', name: 'Child g', parentName: 'Samira Ajlane', loginInfo: { uid: 'learner-alias-g' }, parentLoginInfo: { uid: legacy.uid, email: legacy.email }, parentUids: [legacy.uid] }),
  db.doc(`guardian_links/${legacy.uid}_child-g`).set({ organizationId: 'org-a', parentUid: legacy.uid, studentId: 'child-g', subjectId: 'child-g', status: 'active', permissions: ['portfolio'] })
]);
assert.equal((await issue('child-f')).statusCode, 409);
const legacyReset = await invoke(staffToken, { action: 'reset', studentId: 'child-f', organizationId: 'org-a', relationshipVerified: true });
assert.equal(legacyReset.statusCode, 200, JSON.stringify(legacyReset.body?.error));
assert.equal(legacyReset.body.email, legacy.email);
assert.equal((await db.doc(`users/${legacy.uid}`).get()).data().accessVersion, 2);
assert.equal((await db.doc(`guardian_links/${legacy.uid}_child-f`).get()).data().status, 'active');
assert.equal((await db.doc(`guardian_links/${legacy.uid}_learner-alias-g`).get()).data().status, 'active');
await assert.rejects(() => signInWithEmailAndPassword(clientAuth, legacy.email, 'Legacy-password-123'));
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
const replacementReset = await invoke(staffToken, { action: 'reset', studentId: 'child-f', organizationId: 'org-a', relationshipVerified: true });
assert.equal(replacementReset.statusCode, 200);

// Recover an exact legacy p.* login with no users profile, no guardian links, and a missing name.
const legacyExact = await adminAuth.createUser({ email: 'p.older.family@makerlab.academy', password: 'Old-family-password-123' });
await Promise.all([
  db.doc('students/legacy-main').set({ organizationId: 'org-a', name: '', parentLoginInfo: { uid: legacyExact.uid, email: legacyExact.email } }),
  db.doc('students/legacy-sibling').set({ organizationId: 'org-a', name: '', loginInfo: { uid: 'legacy-sibling-alias' }, parentLoginInfo: { uid: legacyExact.uid, email: legacyExact.email } }),
  db.doc('students/legacy-new').set({ organizationId: 'org-a', name: 'New sibling' })
]);
const lookupRequest = { action: 'lookup', studentId: 'legacy-main', organizationId: 'org-a', reuseParentEmail: legacyExact.email, relationshipVerified: true };
assert.equal((await invoke(parentToken, lookupRequest)).statusCode, 403);
assert.equal((await invoke(staffToken, { ...lookupRequest, relationshipVerified: false })).statusCode, 400);
const lookup = await invoke(staffToken, lookupRequest);
assert.equal(lookup.statusCode, 200, JSON.stringify(lookup.body?.error));
assert.equal(lookup.body.needsRecovery, true);
assert.equal(lookup.body.linkedLearnerCount, 2);
const automaticReset = { action: 'reset', studentId: 'legacy-main', organizationId: 'org-a', relationshipVerified: true };
const missingName = await invoke(staffToken, automaticReset);
assert.equal(missingName.statusCode, 400);
assert.equal(missingName.body.code, 'parent_name_required');
assert.equal((await db.doc(`users/${legacyExact.uid}`).get()).exists, false);
assert.equal((await invoke(parentToken, automaticReset)).statusCode, 403);
assert.equal((await invoke(foreignToken, automaticReset)).statusCode, 403);
await db.doc('students/foreign-legacy').set({ organizationId: 'org-b', name: 'Foreign legacy', parentLoginInfo: { uid: legacyExact.uid, email: legacyExact.email } });
assert.equal((await invoke(staffToken, { ...automaticReset, parentName: 'Verified Parent' })).statusCode, 409);
await db.doc('students/foreign-legacy').delete();
const automaticRecovered = await invoke(staffToken, { ...automaticReset, parentName: 'Verified Parent' });
assert.equal(automaticRecovered.statusCode, 200, JSON.stringify(automaticRecovered.body?.error));
assert.equal(automaticRecovered.body.email, legacyExact.email);
assert(automaticRecovered.body.password?.length >= 30);
assert.equal((await db.doc(`users/${legacyExact.uid}`).get()).data().accessVersion, 2);
assert.equal((await db.doc(`guardian_links/${legacyExact.uid}_legacy-sibling-alias`).get()).data().status, 'active');
const recoveryRequest = { action: 'recover', studentId: 'legacy-main', organizationId: 'org-a', parentName: 'Verified Parent', relationshipVerified: true };
assert.equal((await invoke(staffToken, { ...recoveryRequest, parentName: '' })).statusCode, 400);
await db.doc('students/foreign-legacy').set({ organizationId: 'org-b', name: 'Foreign legacy', parentLoginInfo: { uid: legacyExact.uid, email: legacyExact.email } });
assert.equal((await invoke(staffToken, recoveryRequest)).statusCode, 409);
await db.doc('students/foreign-legacy').delete();
const recovered = await invoke(staffToken, recoveryRequest);
assert.equal(recovered.statusCode, 200, JSON.stringify(recovered.body?.error));
assert.equal(recovered.body.email, legacyExact.email);
assert(recovered.body.password?.length >= 30);
assert.equal((await db.doc(`users/${legacyExact.uid}`).get()).data().role, 'parent');
assert.equal((await db.doc('students/legacy-sibling').get()).data().parentName, 'Verified Parent');
assert.equal((await db.doc(`guardian_links/${legacyExact.uid}_legacy-sibling-alias`).get()).data().status, 'active');
await assert.rejects(() => signInWithEmailAndPassword(clientAuth, legacyExact.email, 'Old-family-password-123'));
await signInWithEmailAndPassword(clientAuth, legacyExact.email, recovered.body.password);

// An invitation-era parent profile may have no organization and only a placeholder name.
const placeholder = await adminAuth.createUser({ email: 'p.oubella@makerlab.academy', password: 'Placeholder-old-password-123' });
const placeholderProfile = { uid: placeholder.uid, role: 'parent', status: 'active', email: placeholder.email, name: 'Parent' };
await Promise.all([
  db.doc(`users/${placeholder.uid}`).set({ ...placeholderProfile, organizationId: 'org-b' }),
  db.doc('students/placeholder-child').set({ organizationId: 'org-a', name: 'YASMINE OUBELLA', parentLoginInfo: { uid: placeholder.uid, email: placeholder.email } })
]);
const placeholderReset = { action: 'reset', studentId: 'placeholder-child', organizationId: 'org-a', relationshipVerified: true };
assert.equal((await invoke(staffToken, { ...placeholderReset, parentName: 'Verified Guardian' })).statusCode, 409);
await db.doc(`users/${placeholder.uid}`).set(placeholderProfile);
const placeholderIssued = await invoke(staffToken, placeholderReset);
assert.equal(placeholderIssued.statusCode, 200, JSON.stringify(placeholderIssued.body?.error));
assert.equal(placeholderIssued.body.parentName, 'OUBELLA family');
assert.equal((await db.doc(`users/${placeholder.uid}`).get()).data().organizationId, 'org-a');
assert.equal((await db.doc(`users/${placeholder.uid}`).get()).data().name, 'OUBELLA family');
assert.equal((await db.doc('students/placeholder-child').get()).data().parentName, 'OUBELLA family');
assert.equal((await db.doc(`guardian_links/${placeholder.uid}_placeholder-child`).get()).data().status, 'active');
await assert.rejects(() => signInWithEmailAndPassword(clientAuth, placeholder.email, 'Placeholder-old-password-123'));
await signInWithEmailAndPassword(clientAuth, placeholder.email, placeholderIssued.body.password);

const exactLinked = await invoke(staffToken, { action: 'link', studentId: 'legacy-new', organizationId: 'org-a', reuseParentEmail: legacyExact.email, parentName: 'Verified Parent', relationshipVerified: true });
assert.equal(exactLinked.statusCode, 200, JSON.stringify(exactLinked.body?.error));
assert.equal((await db.doc('students/legacy-new').get()).data().parentName, 'Verified Parent');
assert.equal((await db.doc('students/legacy-new').get()).data().parentLoginInfo.uid, legacyExact.uid);
const recoveredStored = JSON.stringify({ profile: (await db.doc(`users/${legacyExact.uid}`).get()).data(), learner: (await db.doc('students/legacy-main').get()).data(), link: (await db.doc(`guardian_links/${legacyExact.uid}_legacy-main`).get()).data() });
assert(!recoveredStored.includes(recovered.body.password));
const wrongRole = await adminAuth.createUser({ email: 'p.wrong.role@makerlab.academy', password: 'Wrong-role-password-123' });
await Promise.all([
  db.doc(`users/${wrongRole.uid}`).set({ organizationId: 'org-a', role: 'instructor', status: 'active', email: wrongRole.email }),
  db.doc('students/wrong-role').set({ organizationId: 'org-a', parentLoginInfo: { uid: wrongRole.uid, email: wrongRole.email } })
]);
assert.equal((await invoke(staffToken, { ...lookupRequest, studentId: 'wrong-role', reuseParentEmail: wrongRole.email })).statusCode, 409);
assert.equal((await invoke(staffToken, { action: 'recover', studentId: 'wrong-role', organizationId: 'org-a', parentName: 'Wrong Role', relationshipVerified: true })).statusCode, 409);
const crossTenant = await adminAuth.createUser({ email: 'p.cross.tenant@makerlab.academy', password: 'Cross-tenant-password-123' });
await Promise.all([
  db.doc(`users/${crossTenant.uid}`).set({ organizationId: 'org-b', role: 'parent', status: 'active', email: crossTenant.email }),
  db.doc('students/cross-tenant').set({ organizationId: 'org-a', parentLoginInfo: { uid: crossTenant.uid, email: crossTenant.email } })
]);
assert.equal((await invoke(staffToken, { ...lookupRequest, studentId: 'cross-tenant', reuseParentEmail: crossTenant.email })).statusCode, 409);
const oldExact = await adminAuth.createUser({ email: 'p.old.single@makerlab.academy', password: 'Old-single-password-123' });
await db.doc('students/legacy-transfer').set({ organizationId: 'org-a', name: 'Legacy transfer', parentLoginInfo: { uid: oldExact.uid, email: oldExact.email }, parentUids: [oldExact.uid] });
const exactTransfer = { action: 'transfer', studentId: 'legacy-transfer', organizationId: 'org-a', reuseParentUid: firstAuth.uid,
  reuseParentEmail: first.body.email, parentName: 'Samira Ajlane', relationshipVerified: true };
assert.equal((await invoke(staffToken, { ...exactTransfer, parentName: 'Wrong Parent' })).statusCode, 409);
assert.equal((await invoke(staffToken, { ...exactTransfer, reuseParentEmail: 'p.wrong@makerlab.academy' })).statusCode, 409);
await db.doc('students/foreign-transfer').set({ organizationId: 'org-b', name: 'Foreign transfer', parentLoginInfo: { uid: oldExact.uid, email: oldExact.email } });
assert.equal((await invoke(staffToken, exactTransfer)).statusCode, 409);
await db.doc('students/foreign-transfer').delete();
const movedLegacy = await invoke(staffToken, exactTransfer);
assert.equal(movedLegacy.statusCode, 200, JSON.stringify(movedLegacy.body?.error));
assert.equal((await db.doc('students/legacy-transfer').get()).data().parentName, 'Samira Ajlane');
assert.equal((await db.doc('students/legacy-transfer').get()).data().parentLoginInfo.uid, firstAuth.uid);
assert.equal((await db.doc(`users/${oldExact.uid}`).get()).exists, false);
assert.equal((await db.doc(`guardian_links/${firstAuth.uid}_legacy-transfer`).get()).data().status, 'active');
assert.equal((await adminAuth.getUser(oldExact.uid)).disabled, true);
console.log('Parent access emulator: verified naming, platform-admin authorization, same-tenant directory, legacy contact/orphan conversion, external Auth replacement, sibling links, password invalidation, cross-tenant and role denial, staff-link repair, recovery, and plaintext checks passed.');
await Promise.all([deleteClientApp(app), deleteClientApp(familyApp)]);
await deleteAdminApp(getFirebaseAdminApp());
