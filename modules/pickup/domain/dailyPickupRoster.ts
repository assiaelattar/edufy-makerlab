import type { AttendanceRecord, Enrollment, Program, Student } from '../../../types';
import { workshopsOnDateFromSchedule } from '../../../sparkquest/domain/parentNextWorkshop.ts';
import { isEnrollmentEligibleForAttendance } from '../../../utils/membershipLifecycle.ts';

export interface DailyPickupSlot {
  enrollmentId: string;
  programId: string;
  programName: string;
  groupName: string;
  time: string;
}

export interface DailyPickupRosterItem {
  student: Student;
  studentId: string;
  studentName: string;
  slots: DailyPickupSlot[];
}

const timeMinutes = (value: string) => {
  const match = value.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return Number.MAX_SAFE_INTEGER;
  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const period = match[3]?.toLowerCase();
  if (period === 'pm' && hours < 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

export const projectDailyPickupRoster = ({
  organizationId,
  sessionDate,
  weekday,
  enrollments,
  students,
  programs,
}: {
  organizationId: string;
  sessionDate: string;
  weekday: string;
  enrollments: Enrollment[];
  students: Student[];
  programs: Program[];
}): DailyPickupRosterItem[] => {
  const studentById = new Map(students
    .filter(student => student.organizationId === organizationId && student.status === 'active')
    .map(student => [student.id, student]));
  const programById = new Map(programs
    .filter(program => program.organizationId === organizationId)
    .map(program => [program.id, program]));
  const roster = new Map<string, DailyPickupRosterItem>();

  enrollments.forEach(enrollment => {
    if (enrollment.organizationId !== organizationId) return;
    const student = studentById.get(enrollment.studentId);
    const program = programById.get(enrollment.programId);
    if (!student || !isEnrollmentEligibleForAttendance(enrollment, program, sessionDate)) return;

    const schedules = workshopsOnDateFromSchedule([enrollment], program ? [program] : [], sessionDate)
      .map(slot => ({ value: `${slot.startTime}${slot.endTime ? ` – ${slot.endTime}` : ''}`, groupName: slot.groupName }));
    if (schedules.length === 0) return;

    const item = roster.get(student.id) || {
      student,
      studentId: student.id,
      studentName: student.name,
      slots: [],
    };

    schedules.forEach(schedule => {
      const slot: DailyPickupSlot = {
        enrollmentId: enrollment.id,
        programId: enrollment.programId,
        programName: program?.name || enrollment.programName,
        groupName: schedule.groupName,
        time: schedule.value,
      };
      const key = `${slot.programId}::${slot.groupName}::${slot.time}`;
      if (!item.slots.some(existing => `${existing.programId}::${existing.groupName}::${existing.time}` === key)) {
        item.slots.push(slot);
      }
    });
    roster.set(student.id, item);
  });

  return [...roster.values()]
    .map(item => ({
      ...item,
      slots: [...item.slots].sort((first, second) => timeMinutes(first.time) - timeMinutes(second.time)
        || first.programName.localeCompare(second.programName)),
    }))
    .sort((first, second) => timeMinutes(first.slots[0]?.time || '') - timeMinutes(second.slots[0]?.time || '')
      || first.studentName.localeCompare(second.studentName));
};

/** Public lobby: only learners explicitly marked present for a scheduled slot. */
export const selectPresentPickupRoster = (
  roster: DailyPickupRosterItem[],
  attendance: AttendanceRecord[],
  organizationId: string,
  sessionDate: string,
): DailyPickupRosterItem[] => {
  const present = new Set(attendance
    .filter(record => record.organizationId === organizationId && record.date === sessionDate &&
      (record.status === 'present' || record.status === 'late'))
    .map(record => `${record.studentId}:${record.enrollmentId}`));
  return roster.filter(item => item.slots.some(slot => present.has(`${item.studentId}:${slot.enrollmentId}`)));
};

/** Release alone is not completion; only a guardian receipt removes an active lobby row. */
export const isPickupLobbyActive = (status?: string): boolean => status !== 'confirmed' && status !== 'dismissed';
