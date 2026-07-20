import type { Grade, Group, Program, ProgramCampSession, ProgramCampShift, ProgramScheduleSlot } from '../types';

const dateOnly = (date: Date) => date.toISOString().slice(0, 10);

const addDays = (value: Date, days: number) => {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const firstMondayOnOrAfter = (year: number, monthIndex: number, day: number) => {
  const date = new Date(Date.UTC(year, monthIndex, day));
  const daysUntilMonday = (8 - date.getUTCDay()) % 7;
  return addDays(date, daysUntilMonday);
};

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const makeSchedule = (prefix: string, startTime: string, endTime: string, shiftLabel: string): ProgramScheduleSlot[] =>
  weekdays.map((day, index) => ({
    id: `${prefix}-day-${index + 1}`,
    day,
    startTime,
    endTime,
    shiftLabel,
  }));

export const buildMakerLabSummerCampTemplate = (
  organizationId: string,
  year = new Date().getFullYear()
): Partial<Program> => {
  const firstSessionStart = firstMondayOnOrAfter(year, 6, 1);
  const shifts: ProgramCampShift[] = [
    { id: 'morning', label: 'Morning', startTime: '09:00', endTime: '12:00' },
    { id: 'afternoon', label: 'Afternoon', startTime: '14:00', endTime: '17:00' },
  ];
  const sessions: ProgramCampSession[] = Array.from({ length: 4 }, (_, sessionIndex) => {
    const sessionStart = addDays(firstSessionStart, sessionIndex * 14);
    const weekOneStart = sessionStart;
    const weekTwoStart = addDays(sessionStart, 7);
    return {
      id: `session-${sessionIndex + 1}`,
      name: `Session ${sessionIndex + 1}`,
      startDate: dateOnly(sessionStart),
      endDate: dateOnly(addDays(sessionStart, 11)),
      weeks: [
        { id: `session-${sessionIndex + 1}-week-1`, label: 'Week 1', startDate: dateOnly(weekOneStart), endDate: dateOnly(addDays(weekOneStart, 4)) },
        { id: `session-${sessionIndex + 1}-week-2`, label: 'Week 2', startDate: dateOnly(weekTwoStart), endDate: dateOnly(addDays(weekTwoStart, 4)) },
      ],
    };
  });

  const gradeBands = [
    { id: 'explorers-6-9', name: 'Explorers / Ages 6-9' },
    { id: 'builders-10-14', name: 'Builders / Ages 10-14' },
  ];

  const grades: Grade[] = gradeBands.map(gradeBand => {
    const groups: Group[] = sessions.flatMap(session => session.weeks.flatMap(week => shifts.map(shift => {
      const prefix = `${gradeBand.id}-${session.id}-${week.id}-${shift.id}`;
      const blocks = makeSchedule(prefix, shift.startTime, shift.endTime, shift.label);
      return {
        id: prefix,
        name: `${session.name} / ${week.label} / ${shift.label}`,
        day: blocks[0].day,
        time: blocks[0].startTime,
        capacity: 12,
        scheduleBlocks: blocks,
        campSessionId: session.id,
        campWeekId: week.id,
        campShiftId: shift.id,
      };
    })));
    return { id: gradeBand.id, organizationId, name: gradeBand.name, groups };
  });

  const runStart = sessions[0].startDate;
  const runEnd = sessions[sessions.length - 1].endDate;
  return {
    organizationId,
    name: `MakerLab Summer Camp ${year}`,
    type: 'Holiday Camp',
    formatPreset: 'camp',
    description: 'A hands-on summer camp where families choose a two-week session, a morning or afternoon shift, and one week or the complete session.',
    status: 'draft',
    targetAudience: 'kids',
    duration: 'Four 2-week sessions',
    runSetup: {
      name: `Summer Camp ${year}`,
      startDate: runStart,
      endDate: runEnd,
      enrollmentOpenDate: `${year}-02-01`,
      enrollmentCloseDate: runEnd,
      timezone: 'Africa/Casablanca',
      locationName: 'MakerLab Academy',
    },
    academicPeriod: { label: String(year), startDate: runStart, endDate: runEnd },
    enrollmentPolicy: { mode: 'modular', allowJoinAnytime: true, moduleLabel: 'Week' },
    campSetup: { sessions, shifts },
    packs: [
      { name: 'One week', includedModuleCount: 1, workshopsPerWeek: 5, price: 1500 },
      { name: 'Complete 2-week session', includedModuleCount: 2, workshopsPerWeek: 5, price: 2700 },
    ],
    grades,
    paymentTerms: ['Full payment', '50% deposit to reserve the place'],
    registrationSetup: { enabled: true, mode: 'fast', allowWaitlist: true, requiresReview: true, qrEnabled: true },
    documentSetup: { registrationConfirmation: true, enrollmentAttestation: true, completionCertificate: true },
    themeColor: 'cyan',
  };
};
