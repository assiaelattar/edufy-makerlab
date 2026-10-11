import assert from 'node:assert/strict';
import { initializeApp as initializeClientApp } from 'firebase/app';
import { connectAuthEmulator, getAuth as getClientAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getAuth } from 'firebase-admin/auth';
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
assert.equal((await invoke(staffToken, { action: 'reset', studentId: 'child-e', organizationId: 'org-a' })).statusCode, 403);

const reset = await invoke(staffToken, { action: 'reset', studentId: 'child-a', organizationId: 'org-a' });
assert.equal(reset.statusCode, 200, JSON.stringify(reset.body?.error));
assert.notEqual(reset.body.password, first.body.password);
await assert.rejects(() => signInWithEmailAndPassword(clientAuth, first.body.email, first.body.password));
await signInWithEmailAndPassword(clientAuth, first.body.email, reset.body.password);
const stored = JSON.stringify({ student: (await db.doc('students/child-a').get()).data(), profile: (await db.doc(`users/${firstAuth.uid}`).get()).data(), link: (await db.doc(`guardian_links/${firstAuth.uid}_child-a`).get()).data() });
assert(!stored.includes(first.body.password) && !stored.includes(reset.body.password));
console.log('Parent access emulator: issue, collision, sibling link, role and tenant denial, reset, and plaintext checks passed.');
