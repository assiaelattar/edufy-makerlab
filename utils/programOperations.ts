import { Program } from '../types';
import {
  BillingMode,
  ClassOccurrence,
  PricingOffer,
  ProgramFormatPreset,
  ProgramGroup,
  ProgramRun,
  ScheduleBlock,
  Weekday
} from '../types/programOperations';

const LEGACY_ACTOR = 'legacy-program-adapter';
const DEFAULT_TIMEZONE = 'Africa/Casablanca';
const DEFAULT_CLASS_MINUTES = 90;

const weekdayIndexes: Record<Weekday, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};

const weekdayAliases: Record<string, Weekday> = {
  sunday: 'sunday', dimanche: 'sunday',
  monday: 'monday', lundi: 'monday',
  tuesday: 'tuesday', mardi: 'tuesday',
  wednesday: 'wednesday', mercredi: 'wednesday',
  thursday: 'thursday', jeudi: 'thursday',
  friday: 'friday', vendredi: 'friday',
  saturday: 'saturday', samedi: 'saturday'
};

export type ProgramOperationsIssueCode =
  | 'missing_capacity'
  | 'missing_pricing'
  | 'missing_schedule';

export interface ProgramOperationsIssue {
  code: ProgramOperationsIssueCode;
  label: string;
  detail: string;
  groupId?: string;
}

export interface ProgramOperationsPreview {
  source: 'legacy_compatibility';
  run: ProgramRun;
  groups: ProgramGroup[];
  scheduleBlocks: ScheduleBlock[];
  occurrences: ClassOccurrence[];
  pricingOffers: PricingOffer[];
  issues: ProgramOperationsIssue[];
}

interface BuildLegacyPreviewOptions {
  academicPeriod?: string;
  referenceDate?: Date;
  rosterByGroupId?: Record<string, number>;
  timezone?: string;
  currency?: string;
  occurrenceLimit?: number;
}

const toISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fromISODate = (value: string) => new Date(`${value}T12:00:00`);

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const maxDate = (left: Date, right: Date) => left > right ? left : right;
const minDate = (left: Date, right: Date) => left < right ? left : right;

const inferAcademicPeriodRange = (academicPeriod: string | undefined, referenceDate: Date) => {
  const years = academicPeriod?.match(/(20\d{2})\D+(20\d{2})/);
  if (years) {
    return {
      startDate: `${years[1]}-09-01`,
      endDate: `${years[2]}-08-31`
    };
  }

  const year = referenceDate.getFullYear();
  return { startDate: `${year}-01-01`, endDate: `${year}-12-31` };
};

export const inferProgramFormatPreset = (program: Program): ProgramFormatPreset => {
  if (program.formatPreset) return program.formatPreset;
  if (program.type === 'Regular Program') return 'weekly_academy';
  if (program.type === 'Holiday Camp' || program.type === 'Camp') return 'camp';
  if (program.type === 'Workshop') return 'workshop_series';
  if (program.type === 'Internship') return 'bootcamp';
  return 'custom';
};

const normalizeWeekday = (value?: string): Weekday | null => {
  const key = value?.trim().toLowerCase();
  return key ? weekdayAliases[key] || null : null;
};

const addMinutes = (time: string, minutes: number) => {
  const [hours, minute] = time.split(':').map(Number);
  const total = ((Number.isFinite(hours) ? hours : 0) * 60) + (Number.isFinite(minute) ? minute : 0) + minutes;
  return `${String(Math.floor((total % 1440) / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const parseTimeRange = (value?: string) => {
  const matches = value?.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g) || [];
  const startTime = matches[0]?.padStart(5, '0') || null;
  if (!startTime) return null;
  return {
    startTime,
    endTime: matches[1]?.padStart(5, '0') || addMinutes(startTime, DEFAULT_CLASS_MINUTES)
  };
};

const priceVariants = (program: Program) => program.packs.flatMap(pack => {
  const variants: Array<{ suffix: string; amount: number; billingMode: BillingMode }> = [];
  if ((pack.priceAnnual || 0) > 0) variants.push({ suffix: 'Annual', amount: pack.priceAnnual!, billingMode: 'annual' });
  if ((pack.priceTrimester || 0) > 0) variants.push({ suffix: 'Term', amount: pack.priceTrimester!, billingMode: 'term' });
  if ((pack.price || 0) > 0) variants.push({ suffix: '', amount: pack.price!, billingMode: 'one_time' });
  if (!variants.length && (pack.promoPrice || 0) > 0) variants.push({ suffix: '', amount: pack.promoPrice!, billingMode: 'one_time' });
  return variants.map(variant => ({ pack, ...variant }));
});

const createOccurrences = (
  program: Program,
  run: ProgramRun,
  blocks: ScheduleBlock[],
  referenceDate: Date,
  limit: number
) => {
  const occurrences: ClassOccurrence[] = [];
  const runStart = fromISODate(run.startDate);
  const runEnd = fromISODate(run.endDate);
  const windowStart = maxDate(runStart, new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate(), 12));
  const windowEnd = minDate(runEnd, addDays(windowStart, 56));

  for (const block of blocks) {
    if (block.kind !== 'recurring' || block.status !== 'active') continue;
    const excludedDates = new Set(block.exclusions?.map(exclusion => exclusion.date) || []);
    for (let date = new Date(windowStart); date <= windowEnd; date = addDays(date, 1)) {
      const isoDate = toISODate(date);
      const weekday = block.weekdays.find(day => weekdayIndexes[day] === date.getDay());
      if (!weekday || excludedDates.has(isoDate)) continue;

      const override = block.overrides?.find(item => item.date === isoDate);
      if (override?.status === 'canceled') continue;
      const startTime = override?.startTime || block.startTime;
      const endTime = override?.endTime || block.endTime;
      occurrences.push({
        id: `legacy-occurrence-${block.id}-${isoDate}`,
        organizationId: program.organizationId,
        programId: program.id,
        programRunId: run.id,
        programGroupId: block.programGroupId,
        scheduleBlockId: block.id,
        date: isoDate,
        startsAt: `${isoDate}T${startTime}:00`,
        endsAt: `${isoDate}T${endTime}:00`,
        timezone: block.timezone,
        status: override?.status === 'rescheduled' ? 'rescheduled' : 'scheduled',
        roomId: override?.roomId || block.roomId,
        instructorIds: override?.instructorIds || block.instructorIds,
        title: block.name,
        createdAt: `${run.startDate}T00:00:00`,
        createdBy: LEGACY_ACTOR,
        updatedAt: `${run.startDate}T00:00:00`,
        updatedBy: LEGACY_ACTOR
      });
    }
  }

  return occurrences
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
    .slice(0, limit);
};

export const buildLegacyProgramOperationsPreview = (
  program: Program,
  options: BuildLegacyPreviewOptions = {}
): ProgramOperationsPreview => {
  const referenceDate = options.referenceDate || new Date();
  const academicPeriod = options.academicPeriod || String(referenceDate.getFullYear());
  const timezone = options.timezone || DEFAULT_TIMEZONE;
  const currency = options.currency || 'MAD';
  const auditTimestamp = `${toISODate(referenceDate)}T00:00:00`;
  const inferredRange = inferAcademicPeriodRange(options.academicPeriod, referenceDate);
  const range = program.runSetup?.startDate && program.runSetup?.endDate
    ? { startDate: program.runSetup.startDate, endDate: program.runSetup.endDate }
    : inferredRange;
  const runId = `legacy-run-${program.id}-${academicPeriod.replace(/\W+/g, '-')}`;
  const issues: ProgramOperationsIssue[] = [];

  const run: ProgramRun = {
    id: runId,
    organizationId: program.organizationId,
    programId: program.id,
    academicPeriodId: options.academicPeriod,
    formatPreset: inferProgramFormatPreset(program),
    name: program.runSetup?.name?.trim() || `${program.name} / ${academicPeriod}`,
    description: program.description,
    startDate: range.startDate,
    endDate: range.endDate,
    timezone: program.runSetup?.timezone || timezone,
    enrollmentOpensAt: program.runSetup?.enrollmentOpenDate ? `${program.runSetup.enrollmentOpenDate}T00:00:00` : undefined,
    enrollmentClosesAt: program.runSetup?.enrollmentCloseDate ? `${program.runSetup.enrollmentCloseDate}T23:59:59` : undefined,
    locationName: program.runSetup?.locationName?.trim() || undefined,
    status: program.status === 'active' ? 'running' : program.status === 'draft' ? 'draft' : 'archived',
    waitlistMode: 'approval_required',
    createdAt: auditTimestamp,
    createdBy: LEGACY_ACTOR,
    updatedAt: auditTimestamp,
    updatedBy: LEGACY_ACTOR
  };

  const groups: ProgramGroup[] = [];
  const scheduleBlocks: ScheduleBlock[] = [];

  for (const grade of program.grades || []) {
    for (const legacyGroup of grade.groups || []) {
      const groupId = `legacy-group-${program.id}-${grade.id}-${legacyGroup.id}`;
      const capacity = Number(legacyGroup.capacity || 0);
      const enrolledCount = options.rosterByGroupId?.[legacyGroup.id] || 0;
      groups.push({
        id: groupId,
        organizationId: program.organizationId,
        programId: program.id,
        programRunId: run.id,
        name: legacyGroup.name || 'Unnamed group',
        level: grade.name,
        capacity,
        enrolledCount,
        waitlistCount: 0,
        instructorIds: [],
        roomIds: [],
        status: program.status === 'active' ? 'active' : program.status === 'draft' ? 'draft' : 'completed',
        createdAt: auditTimestamp,
        createdBy: LEGACY_ACTOR,
        updatedAt: auditTimestamp,
        updatedBy: LEGACY_ACTOR
      });

      if (!capacity) {
        issues.push({
          code: 'missing_capacity',
          label: `${legacyGroup.name || 'Group'} needs a seat limit`,
          detail: 'Capacity is required before this run can safely manage registration and waitlists.',
          groupId
        });
      }

      const configuredSlots = legacyGroup.scheduleBlocks?.length
        ? legacyGroup.scheduleBlocks
        : [{ id: legacyGroup.id, day: legacyGroup.day, startTime: legacyGroup.time, endTime: addMinutes(legacyGroup.time || '10:00', DEFAULT_CLASS_MINUTES) }];
      const validSlots = configuredSlots.map(slot => ({
        slot,
        weekday: normalizeWeekday(slot.day),
        times: parseTimeRange(`${slot.startTime}${slot.endTime ? ` ${slot.endTime}` : ''}`)
      })).filter(item => item.weekday && item.times);

      if (!validSlots.length) {
        issues.push({
          code: 'missing_schedule',
          label: `${legacyGroup.name || 'Group'} needs a valid timetable`,
          detail: 'Add a weekday and start time before generating class dates.',
          groupId
        });
        continue;
      }

      validSlots.forEach(({ slot, weekday, times }, slotIndex) => {
        scheduleBlocks.push({
          id: `legacy-schedule-${program.id}-${grade.id}-${legacyGroup.id}-${slot.id || slotIndex}`,
          organizationId: program.organizationId,
          programId: program.id,
          programRunId: run.id,
          programGroupId: groupId,
          name: `${grade.name} / ${legacyGroup.name}${slot.shiftLabel ? ` / ${slot.shiftLabel}` : ''}`,
          kind: 'recurring',
          timezone: program.runSetup?.timezone || timezone,
          shift: 'custom',
          shiftLabel: slot.shiftLabel?.trim() || `${slot.day} ${slot.startTime}`,
          instructorIds: [],
          status: 'active',
          frequency: 'weekly',
          interval: 1,
          weekdays: [weekday!],
          recurrenceStartDate: run.startDate,
          recurrenceEndDate: run.endDate,
          startTime: times!.startTime,
          endTime: times!.endTime,
          createdAt: auditTimestamp,
          createdBy: LEGACY_ACTOR,
          updatedAt: auditTimestamp,
          updatedBy: LEGACY_ACTOR
        });
      });
    }
  }

  const pricingOffers: PricingOffer[] = priceVariants(program).map(({ pack, suffix, amount, billingMode }, index) => ({
    id: `legacy-offer-${program.id}-${index}`,
    organizationId: program.organizationId,
    programId: program.id,
    name: suffix ? `${pack.name} / ${suffix}` : pack.name,
    currency,
    baseAmount: pack.promoPrice && pack.promoPrice > 0 && (billingMode === 'annual' || !pack.priceAnnual)
      ? pack.promoPrice
      : amount,
    billingMode,
    included: [{ unit: 'run', quantity: 1, programRunIds: [run.id] }],
    eligibleProgramRunIds: [run.id],
    capacityReservationMode: 'reserve_on_acceptance',
    status: program.status === 'active' ? 'active' : program.status === 'draft' ? 'draft' : 'archived',
    sortOrder: index,
    createdAt: auditTimestamp,
    createdBy: LEGACY_ACTOR,
    updatedAt: auditTimestamp,
    updatedBy: LEGACY_ACTOR
  }));

  if (!pricingOffers.length) {
    issues.push({
      code: 'missing_pricing',
      label: 'Families need a valid offer',
      detail: 'Add at least one positive price before publishing registration.'
    });
  }

  return {
    source: 'legacy_compatibility',
    run,
    groups,
    scheduleBlocks,
    occurrences: createOccurrences(program, run, scheduleBlocks, referenceDate, options.occurrenceLimit || 24),
    pricingOffers,
    issues
  };
};
