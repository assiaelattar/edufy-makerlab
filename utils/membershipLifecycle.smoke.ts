import assert from 'node:assert/strict';
import type { Enrollment, Program, Student } from '../types';
import {
  findMembershipRenewalsDue,
  getEnrollmentCoverageState,
  isEnrollmentEligibleForAttendance,
  resolveEnrollmentCoverage,
} from './membershipLifecycle';
import { getProgramOperationalState, isProgramAcceptingEnrollments } from './programLifecycle';

const program = (patch: Partial<Program> = {}): Program => ({
  id: 'stemquest-makerlab',
  organizationId: 'org-test',
  name: 'StemQuest MakerLab',
  type: 'Regular Program',
  description: 'Weekly STEM membership',
  status: 'active',
  packs: [],
  grades: [],
  enrollmentPolicy: { mode: 'rolling_membership', membershipDurationMonths: 12, allowJoinAnytime: true },
  ...patch,
});

const enrollment = (patch: Partial<Enrollment> = {}): Enrollment => ({
  id: 'enrollment-one',
  organizationId: 'org-test',
  studentId: 'student-one',
  studentName: 'Ada Learner',
  programId: 'stemquest-makerlab',
  programName: 'StemQuest MakerLab',
  packName: 'Annual',
  paymentPlan: 'annual',
  totalAmount: 3000,
  paidAmount: 3000,
  balance: 0,
  status: 'active',
  startDate: '2025-09-01T10:00:00.000Z',
  groupName: 'Saturday AM',
  groupTime: 'Saturday 10:00',
  ...patch,
});

const student = { id: 'student-one', organizationId: 'org-test', name: 'Ada Learner', status: 'active' } as Student;
const rollingProgram = program();
const rollingEnrollment = enrollment();

assert.equal(resolveEnrollmentCoverage(rollingEnrollment, rollingProgram).endDate, '2026-09-01');
assert.equal(getEnrollmentCoverageState(rollingEnrollment, rollingProgram, '2026-09-01'), 'active');
assert.equal(getEnrollmentCoverageState(rollingEnrollment, rollingProgram, '2026-09-02'), 'expired');
assert.equal(isEnrollmentEligibleForAttendance(rollingEnrollment, rollingProgram, '2026-08-29'), true, 'historical attendance remains available inside coverage');
assert.equal(isEnrollmentEligibleForAttendance(rollingEnrollment, rollingProgram, '2026-09-05'), false, 'expired memberships leave future/current rosters');

const rollingProgramWithLegacyEnd = program({
  runSetup: { startDate: '2025-09-01', endDate: '2026-08-31', timezone: 'Africa/Casablanca' },
});
assert.equal(getProgramOperationalState(rollingProgramWithLegacyEnd, '2026-09-17'), 'evergreen', 'rolling programs ignore legacy global end dates');
assert.equal(isProgramAcceptingEnrollments(rollingProgramWithLegacyEnd, '2026-09-17'), true);
assert.equal(getProgramOperationalState({ ...rollingProgramWithLegacyEnd, enrollmentPolicy: undefined }, '2026-09-17'), 'evergreen', 'legacy StemQuest MakerLab programs remain open');

const schoolProgram = program({
  id: 'stemquest-school',
  name: 'StemQuest for Schools · Semester 1',
  billingAudience: 'company',
  formatPreset: 'school_term',
  enrollmentPolicy: { mode: 'fixed_run', allowJoinAnytime: false },
  runSetup: { startDate: '2026-09-01', endDate: '2027-01-31', timezone: 'Africa/Casablanca' },
});
const schoolEnrollment = enrollment({
  id: 'school-enrollment',
  programId: schoolProgram.id,
  programName: schoolProgram.name,
  startDate: '2026-10-15T12:00:00.000Z',
});
const schoolCoverage = resolveEnrollmentCoverage(schoolEnrollment, schoolProgram);
assert.deepEqual(schoolCoverage, { mode: 'fixed_run', startDate: '2026-09-01', endDate: '2027-01-31' });
assert.equal(isEnrollmentEligibleForAttendance(schoolEnrollment, schoolProgram, '2027-02-01'), false);
assert.equal(findMembershipRenewalsDue([schoolEnrollment], [schoolProgram], [student], '2027-02-01').length, 0, 'school cohorts do not create individual renewal tasks');
assert.equal(getProgramOperationalState(schoolProgram, '2027-02-01'), 'finished');
assert.equal(isProgramAcceptingEnrollments(schoolProgram, '2027-02-01'), false);

const schoolEnrollmentWithIncorrectPersonalEnd = enrollment({
  id: 'school-enrollment-with-late-personal-end',
  programId: schoolProgram.id,
  programName: schoolProgram.name,
  serviceStartDate: '2026-10-15T00:00:00.000Z',
  serviceEndDate: '2027-12-31T23:59:59.999Z',
  enrollmentMode: 'fixed_run',
});
assert.deepEqual(
  resolveEnrollmentCoverage(schoolEnrollmentWithIncorrectPersonalEnd, schoolProgram),
  { mode: 'fixed_run', startDate: '2026-09-01', endDate: '2027-01-31' },
  'shared run dates override incorrect legacy personal dates'
);
assert.equal(isEnrollmentEligibleForAttendance(schoolEnrollmentWithIncorrectPersonalEnd, schoolProgram, '2027-02-01'), false);

const legacySchoolWithoutRunDates = program({
  id: 'legacy-school-without-dates',
  name: 'StemQuest at Schools',
  billingAudience: 'company',
  formatPreset: 'school_term',
  enrollmentPolicy: undefined,
  runSetup: undefined,
});
const legacySchoolEnrollment = enrollment({
  id: 'legacy-school-enrollment',
  programId: legacySchoolWithoutRunDates.id,
  programName: legacySchoolWithoutRunDates.name,
  enrollmentMode: undefined,
  session: '2025-2026',
  startDate: '2025-10-01T00:00:00.000Z',
  endDate: undefined,
});
assert.deepEqual(
  resolveEnrollmentCoverage(legacySchoolEnrollment, legacySchoolWithoutRunDates),
  { mode: 'fixed_run', startDate: '2025-09-01', endDate: '2026-08-31' },
  'legacy school cohorts inherit their academic session when program run dates are missing'
);
assert.equal(isEnrollmentEligibleForAttendance(legacySchoolEnrollment, legacySchoolWithoutRunDates, '2026-09-18'), false, 'last-year school learners leave the current attendance roster');
assert.equal(isEnrollmentEligibleForAttendance(legacySchoolEnrollment, legacySchoolWithoutRunDates, '2026-05-15'), true, 'their historical school attendance remains available');

const pausedProgram = program({ status: 'paused', pausedAt: '2026-09-10T09:00:00.000Z' });
assert.equal(getProgramOperationalState(pausedProgram, '2026-09-18'), 'paused');
assert.equal(isProgramAcceptingEnrollments(pausedProgram, '2026-09-18'), false);
assert.equal(isEnrollmentEligibleForAttendance(rollingEnrollment, pausedProgram, '2026-09-18'), false, 'paused programs leave current attendance');
assert.equal(isEnrollmentEligibleForAttendance(rollingEnrollment, pausedProgram, '2026-08-29'), true, 'attendance before the pause remains available');

const legacyFixedProgram = program({
  id: 'legacy-fixed',
  name: 'Robotics Semester',
  enrollmentPolicy: undefined,
  runSetup: { startDate: '2026-01-01', endDate: '2026-06-30', timezone: 'Africa/Casablanca' },
});
const legacyFixedEnrollment = enrollment({
  id: 'legacy-fixed-enrollment',
  programId: legacyFixedProgram.id,
  programName: legacyFixedProgram.name,
  enrollmentMode: undefined,
  endDate: undefined,
});
assert.equal(resolveEnrollmentCoverage(legacyFixedEnrollment, legacyFixedProgram).mode, 'fixed_run');
assert.equal(isEnrollmentEligibleForAttendance(legacyFixedEnrollment, legacyFixedProgram, '2026-07-01'), false);

const legacyProgram = program({ id: 'legacy-stemquest', enrollmentPolicy: undefined });
const legacyEnrollment = enrollment({
  id: 'legacy-enrollment',
  programId: legacyProgram.id,
  endDate: '2026-08-31T23:59:59.999Z',
  enrollmentMode: undefined,
});
const legacyRenewals = findMembershipRenewalsDue([legacyEnrollment], [legacyProgram], [student], '2026-09-17');
assert.equal(legacyRenewals.length, 1);
assert.equal(legacyRenewals[0].daysOverdue, 17);

const renewedEnrollment = enrollment({
  id: 'renewed-enrollment',
  programId: legacyProgram.id,
  enrollmentMode: 'rolling_membership',
  startDate: '2026-09-01T00:00:00.000Z',
  serviceEndDate: '2027-09-01T23:59:59.999Z',
});
assert.equal(findMembershipRenewalsDue([legacyEnrollment, renewedEnrollment], [legacyProgram], [student], '2026-09-17').length, 0, 'an active renewal clears the old due item');
assert.equal(isEnrollmentEligibleForAttendance(enrollment({ status: 'dropped' }), rollingProgram, '2026-01-01'), false);

console.log('Membership coverage, attendance gating, renewals, and school cohort checks passed.');
