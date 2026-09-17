import type { Enrollment, Program, ProgramEnrollmentMode, Student } from '../types';
import { addMonthsClamped } from './programLifecycle';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}/;
const dateOnly = (value?: string) => value && ISO_DATE_PATTERN.test(value) ? value.slice(0, 10) : undefined;

const normalizeName = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const isLegacyStemQuest = (enrollment: Enrollment, program?: Program) => {
  const name = normalizeName(program?.name || enrollment.programName || '');
  return name.includes('stemquest') || name.includes('stem quest');
};

const isSchoolCohort = (program?: Program) => Boolean(
  program?.formatPreset === 'school_term'
  || program?.billingAudience === 'company'
  || program?.partnerName
);

export interface EnrollmentCoverage {
  mode?: ProgramEnrollmentMode;
  startDate?: string;
  endDate?: string;
}

export type EnrollmentCoverageState = 'active' | 'upcoming' | 'expired' | 'inactive';

export interface MembershipRenewalDue {
  key: string;
  studentId: string;
  studentName: string;
  programId: string;
  programName: string;
  groupName?: string;
  endDate: string;
  daysOverdue: number;
  enrollment: Enrollment;
  student?: Student;
}

export const resolveEnrollmentCoverage = (enrollment: Enrollment, program?: Program): EnrollmentCoverage => {
  let mode = enrollment.enrollmentMode || program?.enrollmentPolicy?.mode;

  if (!mode && isLegacyStemQuest(enrollment, program)) {
    mode = isSchoolCohort(program) ? 'fixed_run' : 'rolling_membership';
  }
  if (!mode && program?.runSetup?.endDate) mode = 'fixed_run';

  const fixedRun = mode === 'fixed_run' || program?.formatPreset === 'school_term';
  const startDate = fixedRun
    ? dateOnly(program?.runSetup?.startDate) || dateOnly(enrollment.serviceStartDate) || dateOnly(enrollment.startDate)
    : dateOnly(enrollment.serviceStartDate) || dateOnly(enrollment.startDate);

  let endDate = fixedRun
    ? dateOnly(program?.runSetup?.endDate) || dateOnly(enrollment.serviceEndDate) || dateOnly(enrollment.endDate)
    : dateOnly(enrollment.serviceEndDate) || dateOnly(enrollment.endDate);

  if (!endDate && mode === 'rolling_membership' && startDate) {
    const duration = Number.isInteger(program?.enrollmentPolicy?.membershipDurationMonths)
      && (program?.enrollmentPolicy?.membershipDurationMonths || 0) > 0
      ? program!.enrollmentPolicy!.membershipDurationMonths!
      : 12;
    endDate = dateOnly(addMonthsClamped(`${startDate}T00:00:00.000Z`, duration));
  }

  return { mode, startDate, endDate };
};

export const getEnrollmentCoverageState = (
  enrollment: Enrollment,
  program: Program | undefined,
  referenceDate: string
): EnrollmentCoverageState => {
  if (enrollment.status !== 'active') return 'inactive';
  const coverage = resolveEnrollmentCoverage(enrollment, program);
  const onDate = dateOnly(referenceDate);
  if (!onDate) return 'active';
  if (coverage.startDate && onDate < coverage.startDate) return 'upcoming';
  if (coverage.endDate && onDate > coverage.endDate) return 'expired';
  return 'active';
};

export const isEnrollmentEligibleForAttendance = (
  enrollment: Enrollment,
  program: Program | undefined,
  attendanceDate: string
) => getEnrollmentCoverageState(enrollment, program, attendanceDate) === 'active';

const differenceInCalendarDays = (later: string, earlier: string) => {
  const laterTime = Date.parse(`${later}T00:00:00.000Z`);
  const earlierTime = Date.parse(`${earlier}T00:00:00.000Z`);
  if (!Number.isFinite(laterTime) || !Number.isFinite(earlierTime)) return 0;
  return Math.max(0, Math.floor((laterTime - earlierTime) / 86_400_000));
};

export const findMembershipRenewalsDue = (
  enrollments: Enrollment[],
  programs: Program[],
  students: Student[],
  referenceDate: string
): MembershipRenewalDue[] => {
  const programById = new Map(programs.map(program => [program.id, program]));
  const studentById = new Map(students.map(student => [student.id, student]));
  const activeKeys = new Set<string>();

  enrollments.forEach(enrollment => {
    const program = programById.get(enrollment.programId);
    const coverage = resolveEnrollmentCoverage(enrollment, program);
    if (coverage.mode === 'rolling_membership'
      && getEnrollmentCoverageState(enrollment, program, referenceDate) === 'active') {
      activeKeys.add(`${enrollment.studentId}::${enrollment.programId}`);
    }
  });

  const dueByMembership = new Map<string, MembershipRenewalDue>();
  enrollments.forEach(enrollment => {
    const program = programById.get(enrollment.programId);
    const student = studentById.get(enrollment.studentId);
    if (!student || student.status === 'inactive') return;
    const coverage = resolveEnrollmentCoverage(enrollment, program);
    if (coverage.mode !== 'rolling_membership'
      || !coverage.endDate
      || getEnrollmentCoverageState(enrollment, program, referenceDate) !== 'expired') return;

    const key = `${enrollment.studentId}::${enrollment.programId}`;
    if (activeKeys.has(key)) return;

    const current = dueByMembership.get(key);
    if (current && current.endDate >= coverage.endDate) return;
    dueByMembership.set(key, {
      key,
      studentId: enrollment.studentId,
      studentName: enrollment.studentName,
      programId: enrollment.programId,
      programName: program?.name || enrollment.programName,
      groupName: enrollment.groupName,
      endDate: coverage.endDate,
      daysOverdue: differenceInCalendarDays(referenceDate.slice(0, 10), coverage.endDate),
      enrollment,
      student,
    });
  });

  return [...dueByMembership.values()].sort((first, second) => (
    second.daysOverdue - first.daysOverdue || first.studentName.localeCompare(second.studentName)
  ));
};
