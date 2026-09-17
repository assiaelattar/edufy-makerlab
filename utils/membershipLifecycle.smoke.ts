import assert from 'node:assert/strict';
import type { Enrollment, Program, Student } from '../types';
import { findMembershipRenewalsDue, isEnrollmentEligibleForAttendance, resolveEnrollmentCoverage } from './membershipLifecycle';
import { getProgramOperationalState, isProgramAcceptingEnrollments } from './programLifecycle';

const rollingProgram = {
  id: 'stemquest', organizationId: 'org', name: 'StemQuest MakerLab', type: 'Regular Program', description: '', status: 'active', packs: [], grades: [],
  enrollmentPolicy: { mode: 'rolling_membership', membershipDurationMonths: 12, allowJoinAnytime: true },
  runSetup: { startDate: '2025-09-01', endDate: '2026-08-31', timezone: 'Africa/Casablanca' },
} as Program;
const rollingEnrollment = {
  id: 'rolling', organizationId: 'org', studentId: 'student', studentName: 'Ada', programId: 'stemquest', programName: 'StemQuest MakerLab',
  packName: 'Annual', paymentPlan: 'annual', totalAmount: 1, paidAmount: 1, balance: 0, status: 'active', startDate: '2025-09-01T10:00:00.000Z',
} as Enrollment;
const student = { id: 'student', organizationId: 'org', name: 'Ada', status: 'active' } as Student;

assert.equal(resolveEnrollmentCoverage(rollingEnrollment, rollingProgram).endDate, '2026-09-01');
assert.equal(isEnrollmentEligibleForAttendance(rollingEnrollment, rollingProgram, '2026-09-01'), true);
assert.equal(isEnrollmentEligibleForAttendance(rollingEnrollment, rollingProgram, '2026-09-02'), false);
assert.equal(getProgramOperationalState(rollingProgram, '2026-09-17'), 'evergreen');
assert.equal(isProgramAcceptingEnrollments(rollingProgram, '2026-09-17'), true);
assert.equal(findMembershipRenewalsDue([rollingEnrollment], [rollingProgram], [student], '2026-09-17').length, 1);
assert.equal(getProgramOperationalState({ ...rollingProgram, enrollmentPolicy: undefined } as Program, '2026-09-17'), 'evergreen');

const schoolProgram = {
  ...rollingProgram,
  id: 'school', name: 'StemQuest School S1', formatPreset: 'school_term', billingAudience: 'company',
  enrollmentPolicy: { mode: 'fixed_run', allowJoinAnytime: false },
  runSetup: { startDate: '2026-09-01', endDate: '2027-01-31', timezone: 'Africa/Casablanca' },
} as Program;
const schoolEnrollment = {
  ...rollingEnrollment, id: 'school-enrollment', programId: 'school', programName: 'StemQuest School S1', startDate: '2026-10-15T00:00:00.000Z',
  serviceStartDate: '2026-10-15T00:00:00.000Z', serviceEndDate: '2027-12-31T23:59:59.999Z', enrollmentMode: 'fixed_run',
} as Enrollment;

assert.deepEqual(resolveEnrollmentCoverage(schoolEnrollment, schoolProgram), { mode: 'fixed_run', startDate: '2026-09-01', endDate: '2027-01-31' });
assert.equal(isEnrollmentEligibleForAttendance(schoolEnrollment, schoolProgram, '2027-02-01'), false);
assert.equal(findMembershipRenewalsDue([schoolEnrollment], [schoolProgram], [student], '2027-02-01').length, 0);
assert.equal(getProgramOperationalState(schoolProgram, '2027-02-01'), 'finished');
assert.equal(isProgramAcceptingEnrollments(schoolProgram, '2027-02-01'), false);

console.log('Membership lifecycle smoke passed.');
