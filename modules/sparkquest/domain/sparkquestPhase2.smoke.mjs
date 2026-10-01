import assert from 'node:assert/strict';
import {
  buildSparkQuestCustomClaims,
  buildSparkQuestLaunchUrl,
  createLaunchCode,
  hashLaunchCode,
  isValidLaunchCode,
  resolveSparkQuestLaunchAccess,
  validateSparkQuestLaunchSession,
} from './sparkquestLaunchPolicy.js';
import { reconcileSparkQuestIdentity } from './identityReconciliation.js';

let assertions = 0;
const check = (actual, expected, message) => {
  assert.deepEqual(actual, expected, message);
  assertions += 1;
};
const expectCode = (fn, code) => {
  assert.throws(fn, error => error?.code === code);
  assertions += 1;
};

const organization = {
  id: 'org-a',
  status: 'active',
  modules: { sparkQuest: true },
};
const studentProfile = {
  id: 'uid-a',
  organizationId: 'org-a',
  role: 'student',
  status: 'active',
  studentId: 'student-a',
};
const student = {
  id: 'student-a',
  organizationId: 'org-a',
  status: 'active',
  loginInfo: { uid: 'uid-a' },
};
const project = {
  id: 'project-a',
  organizationId: 'org-a',
  studentId: 'student-a',
};

const firstCode = createLaunchCode();
const secondCode = createLaunchCode();
check(isValidLaunchCode(firstCode), true, 'launch code shape');
check(firstCode === secondCode, false, 'launch codes are unique');
check(hashLaunchCode(firstCode).length, 64, 'launch codes are stored as SHA-256 hashes');
check(buildSparkQuestLaunchUrl('https://sparkquest.example/path?old=yes', firstCode), `https://sparkquest.example/path?launch=${firstCode}`, 'launch URL strips old query data');

const studentAccess = resolveSparkQuestLaunchAccess({
  decodedUid: 'uid-a',
  profile: studentProfile,
  organization,
  linkedStudents: [student],
  project,
});
check(studentAccess.studentId, 'student-a', 'student link is canonical');
check(studentAccess.projectId, 'project-a', 'project remains scoped');
check(buildSparkQuestCustomClaims(studentAccess, 'session-a').sparkquestStudentId, 'student-a', 'custom claims use canonical learner ID');

const issuedSession = {
  application: 'sparkquest',
  status: 'issued',
  allowedOrigin: 'https://sparkquest.example',
  expiresAt: new Date('2026-09-24T00:02:00.000Z'),
};
check(validateSparkQuestLaunchSession(issuedSession, { origin: 'https://sparkquest.example', now: Date.parse('2026-09-24T00:01:00.000Z') }), issuedSession, 'fresh one-time session is accepted');
expectCode(() => validateSparkQuestLaunchSession({ ...issuedSession, status: 'consumed' }, { origin: 'https://sparkquest.example', now: Date.parse('2026-09-24T00:01:00.000Z') }), 'LAUNCH_ALREADY_USED');
expectCode(() => validateSparkQuestLaunchSession(issuedSession, { origin: 'https://sparkquest.example', now: Date.parse('2026-09-24T00:03:00.000Z') }), 'LAUNCH_EXPIRED');
expectCode(() => validateSparkQuestLaunchSession(issuedSession, { origin: 'https://other.example', now: Date.parse('2026-09-24T00:01:00.000Z') }), 'LAUNCH_ORIGIN_MISMATCH');

expectCode(() => resolveSparkQuestLaunchAccess({ decodedUid: 'uid-a', profile: studentProfile, organization, linkedStudents: [] }), 'STUDENT_LINK_MISSING');
expectCode(() => resolveSparkQuestLaunchAccess({ decodedUid: 'uid-a', profile: studentProfile, organization, linkedStudents: [student, { ...student, id: 'student-b' }] }), 'STUDENT_LINK_AMBIGUOUS');
expectCode(() => resolveSparkQuestLaunchAccess({ decodedUid: 'uid-a', profile: studentProfile, organization: { ...organization, modules: {} }, linkedStudents: [student] }), 'SPARKQUEST_NOT_ENABLED');
expectCode(() => resolveSparkQuestLaunchAccess({ decodedUid: 'uid-a', profile: studentProfile, organization, linkedStudents: [{ ...student, organizationId: 'org-b' }] }), 'STUDENT_LINK_INVALID');
expectCode(() => resolveSparkQuestLaunchAccess({ decodedUid: 'uid-a', profile: studentProfile, organization, linkedStudents: [student], project: { ...project, organizationId: 'org-b' } }), 'PROJECT_TENANT_MISMATCH');
expectCode(() => resolveSparkQuestLaunchAccess({ decodedUid: 'uid-a', profile: studentProfile, organization, linkedStudents: [student], project: { ...project, studentId: 'student-b' } }), 'PROJECT_OWNER_MISMATCH');

const instructorAccess = resolveSparkQuestLaunchAccess({
  decodedUid: 'teacher-a',
  profile: { id: 'teacher-a', organizationId: 'org-a', role: 'instructor', status: 'active' },
  organization,
  project,
  permissions: ['learning.manage'],
});
check(instructorAccess.studentId, null, 'staff launch does not impersonate a learner');
check(instructorAccess.actorUid, 'teacher-a', 'staff keeps its own Firebase identity');
expectCode(() => resolveSparkQuestLaunchAccess({
  decodedUid: 'teacher-a',
  profile: { id: 'teacher-a', organizationId: 'org-a', role: 'instructor', status: 'active' },
  organization,
  permissions: [],
}), 'SPARKQUEST_PERMISSION_REQUIRED');

const report = reconcileSparkQuestIdentity({
  organizationId: 'org-a',
  users: [
    studentProfile,
    { id: 'uid-b', organizationId: 'org-a', role: 'student', status: 'active' },
    { id: 'outside-user', organizationId: 'org-b', role: 'student', status: 'active' },
  ],
  students: [
    student,
    { id: 'student-b', organizationId: 'org-a', status: 'active', loginInfo: { uid: 'uid-duplicate' } },
    { id: 'student-c', organizationId: 'org-a', status: 'active', loginInfo: { uid: 'uid-duplicate' } },
  ],
  projects: [
    project,
    { id: 'project-alias', organizationId: 'org-a', studentId: 'uid-a' },
    { id: 'project-unknown', organizationId: 'org-a', studentId: 'missing-student' },
    { id: 'outside-project', organizationId: 'org-b', studentId: 'outside-student' },
  ],
});

check(report.status, 'needs_repair', 'errors block automatic migration');
check(report.summary.users, 2, 'report is tenant scoped');
check(report.summary.excludedOutsideTenant, 2, 'outside-tenant records are counted without being inspected');
check(report.issues.some(entry => entry.code === 'STUDENT_AUTH_UID_DUPLICATED'), true, 'duplicate auth links are visible');
check(report.issues.some(entry => entry.code === 'USER_STUDENT_LINK_MISSING' && entry.recordId === 'uid-b'), true, 'orphan student users are visible');
check(report.issues.some(entry => entry.code === 'PROJECT_OWNER_AUTH_UID_ALIAS'), true, 'accepted legacy project aliases are warnings');
check(report.issues.some(entry => entry.code === 'PROJECT_OWNER_UNKNOWN'), true, 'unknown project owners are blocked');
check(report.issues.some(entry => entry.recordId === 'outside-project'), false, 'outside-tenant details never leak into issues');

console.log(`SparkQuest Phase 2 smoke: ${assertions} assertions passed.`);
console.log(JSON.stringify(report.summary));
