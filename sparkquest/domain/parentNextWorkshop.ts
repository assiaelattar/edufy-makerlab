import type { Enrollment, Program, ProgramScheduleSlot } from '../../types';
import { isWorkshopEligible } from './parentWorkshopEligibility.ts';

export interface FamilyNextWorkshop {
  date: string;
  startTime: string;
  endTime: string | null;
  timezone: string;
  programName: string;
  groupName: string;
  locationName: string | null;
  isUnderway: boolean;
}

const weekdays: Record<string, number> = {
  sunday: 0, dimanche: 0, monday: 1, lundi: 1, tuesday: 2, mardi: 2,
  wednesday: 3, mercredi: 3, thursday: 4, jeudi: 4, friday: 5, vendredi: 5,
  saturday: 6, samedi: 6
};
const validTime = (value?: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value || '');
const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
const pad = (value: number) => String(value).padStart(2, '0');

const localNow = (now: Date, timezone: string) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(now);
  const part = (type: string) => parts.find(item => item.type === type)?.value || '';
  return { date: `${part('year')}-${part('month')}-${part('day')}`, minute: Number(part('hour')) * 60 + Number(part('minute')) };
};

const slotsForGroup = (group: Program['grades'][number]['groups'][number]): ProgramScheduleSlot[] =>
  group.scheduleBlocks?.length ? group.scheduleBlocks : [{ id: group.id, day: group.day, startTime: group.time, endTime: '' }];
const legacySlot = (value?: string): ProgramScheduleSlot | null => {
  if (!value) return null;
  const day = value.toLowerCase().match(/\b(sunday|dimanche|monday|lundi|tuesday|mardi|wednesday|mercredi|thursday|jeudi|friday|vendredi|saturday|samedi)\b/)?.[1];
  const times = [...value.matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g)].map(match => `${pad(Number(match[1]))}:${match[2]}`);
  return day && times[0] ? { id: `enrollment-${day}`, day, startTime: times[0], endTime: times[1] || '' } : null;
};

/** A timetable projection, never a claim that a one-off session was confirmed. */
const workshopCandidates = (
  enrollments: Enrollment[], programs: Program[], now: Date, targetDate?: string
): FamilyNextWorkshop[] => {
  const programsById = new Map(programs.map(program => [program.id, program]));
  const candidates: FamilyNextWorkshop[] = [];
  for (const enrollment of enrollments) {
    if (enrollment.status !== 'active' || !enrollment.programId || !enrollment.organizationId) continue;
    const program = programsById.get(enrollment.programId);
    if (!program || program.organizationId !== enrollment.organizationId) continue;
    const timezone = program.runSetup?.timezone || 'Africa/Casablanca';
    let today: ReturnType<typeof localNow>;
    try { today = localNow(now, timezone); } catch { continue; }
    const selectedGroups = new Set([enrollment.groupId, enrollment.secondGroupId].filter(Boolean));
    const addSlot = (slot: ProgramScheduleSlot, groupName: string) => {
      const weekday = weekdays[slot.day?.trim().toLowerCase() || ''];
      if (weekday === undefined || !validTime(slot.startTime)) return;
      const endTime = validTime(slot.endTime) && minutes(slot.endTime) > minutes(slot.startTime) ? slot.endTime : null;
      const base = new Date(`${targetDate || today.date}T12:00:00Z`);
      for (let offset = 0; offset < (targetDate ? 1 : 14); offset++) {
        const candidateDay = new Date(base);
        candidateDay.setUTCDate(base.getUTCDate() + offset);
        if (candidateDay.getUTCDay() !== weekday) continue;
        const date = `${candidateDay.getUTCFullYear()}-${pad(candidateDay.getUTCMonth() + 1)}-${pad(candidateDay.getUTCDate())}`;
        if (!targetDate && offset === 0 && today.minute >= minutes(endTime || slot.startTime)) continue;
        if (!isWorkshopEligible(enrollment, program, date)) continue;
        candidates.push({
          date, startTime: slot.startTime, endTime, timezone,
          programName: program.name || enrollment.programName || 'Atelier MakerLab',
          groupName, locationName: program.runSetup?.locationName?.trim() || null,
          isUnderway: !targetDate && offset === 0 && today.minute >= minutes(slot.startTime)
        });
        break;
      }
    };
    const countBefore = candidates.length;
    for (const grade of program.grades || []) {
      if (enrollment.gradeId && grade.id !== enrollment.gradeId) continue;
      for (const group of grade.groups || []) {
        if (!selectedGroups.has(group.id)) continue;
        slotsForGroup(group).forEach(slot => addSlot(slot, group.name || enrollment.groupName || ''));
      }
    }
    // Older enrollments can preserve the weekday/time without a group ID.
    if (candidates.length === countBefore) {
      const first = legacySlot(enrollment.groupTime);
      const second = legacySlot(enrollment.secondGroupTime);
      if (first) addSlot(first, enrollment.groupName || '');
      if (second) addSlot(second, enrollment.secondGroupName || '');
    }
  }
  return candidates;
};

/** Timetable slots for a dated learner pickup. This does not confirm attendance. */
export const workshopsOnDateFromSchedule = (
  enrollments: Enrollment[], programs: Program[], sessionDate: string
): FamilyNextWorkshop[] => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) return [];
  return workshopCandidates(enrollments, programs, new Date(`${sessionDate}T12:00:00Z`), sessionDate)
    .sort((a, b) => `${a.endTime || a.startTime}`.localeCompare(`${b.endTime || b.startTime}`));
};

/** A timetable projection, never a claim that a one-off session was confirmed. */
export const nextWorkshopFromSchedule = (
  enrollments: Enrollment[], programs: Program[], now = new Date()
): FamilyNextWorkshop | null => workshopCandidates(enrollments, programs, now)
  .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`))[0] || null;
