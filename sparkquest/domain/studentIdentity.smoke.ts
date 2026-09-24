import {
  createVerifiedStudentIdentity,
  projectBelongsToStudent,
  verifyStudentRecord,
} from './studentIdentity.ts';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const linkedStudent = {
  id: 'student-42',
  organizationId: 'makerlab-academy',
  loginInfo: { uid: 'auth-42' },
};

assert(verifyStudentRecord(linkedStudent, 'auth-42', 'makerlab-academy'), 'linked record should verify');
assert(!verifyStudentRecord(linkedStudent, 'auth-other', 'makerlab-academy'), 'wrong auth UID must fail');
assert(!verifyStudentRecord(linkedStudent, 'auth-42', 'other-org'), 'cross-tenant record must fail');

const identity = createVerifiedStudentIdentity({
  authUid: 'auth-42',
  organizationId: 'makerlab-academy',
  student: linkedStudent,
});

assert(identity.studentId === 'student-42', 'student document ID should be canonical');
assert(identity.ownerIds.includes('auth-42'), 'legacy Auth UID should remain a read alias');
assert(projectBelongsToStudent({ studentId: 'student-42', organizationId: 'makerlab-academy' }, identity), 'canonical project should match');
assert(projectBelongsToStudent({ studentId: 'auth-42' }, identity), 'legacy UID project should match');
assert(!projectBelongsToStudent({ studentId: 'student-other', organizationId: 'makerlab-academy' }, identity), 'another learner project must fail');
assert(!projectBelongsToStudent({ studentId: 'student-42', organizationId: 'other-org' }, identity), 'cross-tenant project must fail');

const legacyIdentity = createVerifiedStudentIdentity({
  authUid: 'legacy-auth',
  organizationId: 'makerlab-academy',
});
assert(legacyIdentity.studentId === 'legacy-auth', 'legacy accounts should remain readable by Auth UID');

let rejected = false;
try {
  createVerifiedStudentIdentity({
    authUid: 'auth-other',
    organizationId: 'makerlab-academy',
    student: linkedStudent,
  });
} catch {
  rejected = true;
}
assert(rejected, 'unverified profile pointers must be rejected');

console.log('SparkQuest student identity smoke: 11 assertions passed.');
