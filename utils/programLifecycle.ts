import type {
  Program,
  ProgramAcademicPeriod,
  ProgramEnrollmentMode
} from '../types';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const toDateOnly = (value: string) => value.slice(0, 10);

export const shiftISODateByYears = (value: string, years: number) => {
  if (!ISO_DATE_PATTERN.test(toDateOnly(value))) return value;
  const dateOnly = toDateOnly(value);
  const [year, month, day] = dateOnly.split('-').map(Number);
  const shiftedYear = year + years;
  const shifted = new Date(Date.UTC(shiftedYear, month - 1, day));

  // Keep February 29 inside February when the target year is not a leap year.
  if (shifted.getUTCMonth() !== month - 1) {
    return `${shiftedYear}-02-28`;
  }
  return shifted.toISOString().slice(0, 10);
};

export const addMonthsClamped = (value: string, months: number) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const originalDay = date.getUTCDate();
  const targetMonth = date.getUTCMonth() + months;
  date.setUTCDate(1);
  date.setUTCMonth(targetMonth);
  const finalDay = Math.min(originalDay, new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate());
  date.setUTCDate(finalDay);
  return date.toISOString();
};

export const getNextAcademicPeriod = (currentLabel?: string): ProgramAcademicPeriod => {
  const match = currentLabel?.match(/(20\d{2})\D+(20\d{2})/);
  const startYear = match ? Number(match[1]) + 1 : new Date().getFullYear() + 1;
  const endYear = match ? Number(match[2]) + 1 : startYear + 1;
  return {
    label: `${startYear}-${endYear}`,
    startDate: `${startYear}-09-01`,
    endDate: `${endYear}-08-31`
  };
};

const shiftYearsInName = (name: string, years: number, targetLabel: string) => {
  let changed = false;
  const shifted = name.replace(/\b20\d{2}\b/g, value => {
    changed = true;
    return String(Number(value) + years);
  });
  return changed ? shifted : `${shifted} / ${targetLabel}`;
};

export const buildProgramDuplicateDraft = (
  program: Program,
  targetPeriod: ProgramAcademicPeriod,
  options: { appendPeriodWhenNameHasNoYear?: boolean } = {}
): Partial<Program> => {
  const cloned = JSON.parse(JSON.stringify(program)) as Record<string, unknown>;
  const sourceStartYear = Number((program.academicPeriod?.startDate || program.runSetup?.startDate || '').slice(0, 4));
  const targetStartYear = Number(targetPeriod.startDate.slice(0, 4));
  const yearShift = Number.isFinite(sourceStartYear) && sourceStartYear > 0 ? targetStartYear - sourceStartYear : 1;
  const sourceName = program.name.trim();
  const nextName = options.appendPeriodWhenNameHasNoYear === false && !/\b20\d{2}\b/.test(sourceName)
    ? `${sourceName} copy`
    : shiftYearsInName(sourceName, yearShift, targetPeriod.label);

  delete cloned.id;
  delete cloned.createdAt;
  delete cloned.updatedAt;

  const sourceRun = program.runSetup;
  const rollingMembership = program.enrollmentPolicy?.mode === 'rolling_membership';
  return {
    ...(cloned as Partial<Program>),
    name: nextName,
    status: 'draft',
    academicPeriod: { ...targetPeriod },
    templateSourceProgramId: program.id,
    campSetup: program.campSetup ? {
      shifts: program.campSetup.shifts.map(shift => ({ ...shift })),
      sessions: program.campSetup.sessions.map(session => ({
        ...session,
        startDate: shiftISODateByYears(session.startDate, yearShift),
        endDate: shiftISODateByYears(session.endDate, yearShift),
        weeks: session.weeks.map(week => ({
          ...week,
          startDate: shiftISODateByYears(week.startDate, yearShift),
          endDate: shiftISODateByYears(week.endDate, yearShift)
        }))
      }))
    } : undefined,
    runSetup: {
      name: sourceRun?.name ? shiftYearsInName(sourceRun.name, yearShift, targetPeriod.label) : `${nextName} / ${targetPeriod.label}`,
      startDate: rollingMembership ? targetPeriod.startDate : sourceRun?.startDate ? shiftISODateByYears(sourceRun.startDate, yearShift) : targetPeriod.startDate,
      endDate: rollingMembership ? targetPeriod.endDate : sourceRun?.endDate ? shiftISODateByYears(sourceRun.endDate, yearShift) : targetPeriod.endDate,
      enrollmentOpenDate: sourceRun?.enrollmentOpenDate ? shiftISODateByYears(sourceRun.enrollmentOpenDate, yearShift) : undefined,
      enrollmentCloseDate: sourceRun?.enrollmentCloseDate ? shiftISODateByYears(sourceRun.enrollmentCloseDate, yearShift) : undefined,
      timezone: sourceRun?.timezone || 'Africa/Casablanca',
      locationName: sourceRun?.locationName
    }
  };
};

export interface EnrollmentServicePeriod {
  mode: ProgramEnrollmentMode;
  startDate: string;
  endDate?: string;
}

export const resolveEnrollmentServicePeriod = (program: Program, joinedAt: string): EnrollmentServicePeriod => {
  const policy = program.enrollmentPolicy || {
    mode: 'fixed_run' as const,
    allowJoinAnytime: false
  };

  if (policy.mode === 'rolling_membership') {
    const duration = Number.isInteger(policy.membershipDurationMonths) && (policy.membershipDurationMonths || 0) > 0
      ? policy.membershipDurationMonths!
      : 12;
    return {
      mode: policy.mode,
      startDate: joinedAt,
      endDate: addMonthsClamped(joinedAt, duration)
    };
  }

  return {
    mode: policy.mode,
    startDate: program.runSetup?.startDate ? `${program.runSetup.startDate}T00:00:00.000Z` : joinedAt,
    endDate: program.runSetup?.endDate ? `${program.runSetup.endDate}T23:59:59.999Z` : undefined
  };
};
