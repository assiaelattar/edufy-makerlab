import type { Enrollment, Program } from '../../types';

// This small read-only projection is bundled with the standalone SparkQuest
// client. Keep its date behavior in parity with utils/membershipLifecycle.ts.
const dateOnly = (value?: string) => /^\d{4}-\d{2}-\d{2}/.test(value || '') ? value!.slice(0, 10) : undefined;
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ');
const legacyStemQuest = (enrollment: Enrollment, program: Program) => {
  const name = normalize(program.name || enrollment.programName || '');
  return name.includes('stemquest') || name.includes('stem quest');
};
const schoolCohort = (program: Program) => Boolean(program.formatPreset === 'school_term' || program.billingAudience === 'company' || program.partnerName);
const periodFromLabel = (value?: string) => {
  const years = value?.match(/(20\d{2})\D+(20\d{2})/);
  return years ? { startDate: `${years[1]}-09-01`, endDate: `${years[2]}-08-31` } : undefined;
};
const addMonthsClamped = (start: string, months: number) => {
  const date = new Date(`${start}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return undefined;
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  date.setUTCDate(Math.min(day, new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()));
  return date.toISOString().slice(0, 10);
};

export const isWorkshopEligible = (enrollment: Enrollment, program: Program, onDate: string) => {
  if (enrollment.status !== 'active' || program.status === 'draft' || program.status === 'archived') return false;
  if (program.status === 'paused' && (!dateOnly(program.pausedAt) || onDate >= dateOnly(program.pausedAt)!)) return false;

  const legacyRolling = legacyStemQuest(enrollment, program) && !schoolCohort(program);
  const programRolling = program.enrollmentPolicy?.mode === 'rolling_membership' || program.deliveryModel === 'on_demand'
    || (!program.enrollmentPolicy && legacyRolling);
  if (!programRolling && (dateOnly(program.runSetup?.startDate) && onDate < dateOnly(program.runSetup?.startDate)!
    || dateOnly(program.runSetup?.endDate) && onDate > dateOnly(program.runSetup?.endDate)!)) return false;

  let mode = enrollment.enrollmentMode || program.enrollmentPolicy?.mode;
  if (!mode && legacyStemQuest(enrollment, program)) mode = schoolCohort(program) ? 'fixed_run' : 'rolling_membership';
  if (!mode && program.runSetup?.endDate) mode = 'fixed_run';
  const fixed = mode === 'fixed_run' || program.formatPreset === 'school_term';
  const academic = program.academicPeriod || periodFromLabel(enrollment.session) || periodFromLabel(program.name);
  const start = fixed
    ? dateOnly(program.runSetup?.startDate) || dateOnly(academic?.startDate) || dateOnly(enrollment.serviceStartDate) || dateOnly(enrollment.startDate)
    : dateOnly(enrollment.serviceStartDate) || dateOnly(enrollment.startDate);
  let end = fixed
    ? dateOnly(program.runSetup?.endDate) || dateOnly(academic?.endDate) || dateOnly(enrollment.serviceEndDate) || dateOnly(enrollment.endDate)
    : dateOnly(enrollment.serviceEndDate) || dateOnly(enrollment.endDate);
  if (!end && mode === 'rolling_membership' && start) {
    const duration = program.enrollmentPolicy?.membershipDurationMonths;
    end = addMonthsClamped(start, Number.isInteger(duration) && (duration || 0) > 0 ? duration! : 12);
  }
  return (!start || onDate >= start) && (!end || onDate <= end);
};
