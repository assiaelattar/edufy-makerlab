import assert from 'node:assert/strict';
import { assertRecipientIdentity, assertRecipientIssuer } from './recipientAccessPolicy.js';

const organization = { id: 'school-a', status: 'active', modules: { sparkQuest: true } };
const issuer = { organizationId: 'school-a', role: 'admin', status: 'active' };
const student = {
  id: 'learner-a', organizationId: 'school-a', status: 'active',
  loginInfo: { uid: 'kid-a', email: 'kid@makerlab.academy' }, parentLoginInfo: { uid: 'parent-a', email: 'p.family@makerlab.academy' },
  parentUids: ['parent-a'],
};
const parentProfile = { id: 'parent-a', role: 'parent', organizationId: 'school-a', status: 'active', email: 'p.family@makerlab.academy' };
const parentAuth = { uid: 'parent-a', email: 'p.family@makerlab.academy', disabled: false };
const guardianLinks = [{ id: 'parent-a_learner-a', parentUid: 'parent-a', studentId: 'learner-a', subjectId: 'learner-a', organizationId: 'school-a', status: 'active' }];
const parent = overrides => assertRecipientIdentity({ role: 'parent', uid: 'parent-a', organizationId: 'school-a', student, profile: parentProfile, authUser: parentAuth, guardianLinks, ...overrides });

assert.doesNotThrow(() => assertRecipientIssuer({ actor: issuer, organization, organizationId: 'school-a', student }));
assert.throws(() => assertRecipientIssuer({ actor: { ...issuer, role: 'instructor' }, organization, organizationId: 'school-a', student }), /Staff access/);
assert.throws(() => assertRecipientIssuer({ actor: { ...issuer, organizationId: 'school-b' }, organization, organizationId: 'school-a', student }), /Staff access/);
assert.throws(() => assertRecipientIssuer({ actor: issuer, organization: { ...organization, modules: {} }, organizationId: 'school-a', student }), /not enabled/);
assert.equal(parent({}).actorUid, 'parent-a');
assert.throws(() => parent({ guardianLinks: [] }), /guardian record/);
assert.throws(() => parent({ student: { ...student, parentUids: [] } }), /guardian record/);
assert.throws(() => parent({ guardianLinks: [{ ...guardianLinks[0], studentId: 'learner-b' }] }), /guardian record/);
assert.throws(() => parent({ profile: { ...parentProfile, role: 'admin' } }), /verify its identity/);
assert.throws(() => parent({ authUser: { ...parentAuth, disabled: true } }), /verify its identity/);
assert.throws(() => parent({ authUser: { ...parentAuth, uid: 'other-parent' } }), /verify its identity/);
assert.throws(() => parent({ authUser: { ...parentAuth, email: undefined } }), /verify its identity/);
assert.throws(() => parent({ organizationId: 'school-b' }), /verify its identity/);

const learner = {
  role: 'student', uid: 'kid-a', organizationId: 'school-a', student,
  profile: { id: 'kid-a', role: 'student', organizationId: 'school-a', status: 'active', email: 'kid@makerlab.academy', studentId: 'learner-a' },
  authUser: { uid: 'kid-a', email: 'kid@makerlab.academy', disabled: false },
  linkedStudents: [student],
};
assert.equal(assertRecipientIdentity(learner).studentId, 'learner-a');
assert.throws(() => assertRecipientIdentity({ ...learner, linkedStudents: [student, { ...student, id: 'learner-b' }] }), /exactly one/);
assert.throws(() => assertRecipientIdentity({ ...learner, student: { ...student, loginInfo: { uid: 'someone-else' } } }), /does not match/);
assert.throws(() => assertRecipientIdentity({ ...learner, student: { ...student, loginInfo: { uid: 'kid-a', email: 'other@makerlab.academy' } } }), /does not match/);

console.log('Recipient quick access identity policy: 17 assertions passed.');
