import assert from 'node:assert/strict';
import { projectDailyPickupRoster, selectPresentPickupRoster } from './dailyPickupRoster.ts';

const timestamp = {} as never;
const students = [
  { id: 'student-a', organizationId: 'org-a', name: 'Ari', parentPhone: '', status: 'active', createdAt: timestamp },
  { id: 'student-b', organizationId: 'org-a', name: 'Bea', parentPhone: '', status: 'active', createdAt: timestamp },
  { id: 'student-inactive', organizationId: 'org-a', name: 'Inactive', parentPhone: '', status: 'inactive', createdAt: timestamp },
] as const;
const programs = [{
  id: 'program-a', organizationId: 'org-a', name: 'Robotics', type: 'Workshop', description: '', status: 'active', packs: [], grades: [],
}] as const;
const enrollment = (id: string, studentId: string, groupTime: string, secondGroupTime?: string) => ({
  id, organizationId: 'org-a', studentId, studentName: studentId, programId: 'program-a', programName: 'Robotics',
  packName: '', groupName: 'Blue', groupTime, secondGroupName: 'Green', secondGroupTime,
  paymentPlan: 'full' as const, totalAmount: 0, paidAmount: 0, balance: 0, status: 'active' as const,
  startDate: '2026-01-01', endDate: '2026-12-31',
});

const roster = projectDailyPickupRoster({
  organizationId: 'org-a', sessionDate: '2026-10-15', weekday: 'Thursday',
  enrollments: [
    enrollment('enrollment-a', 'student-a', 'Thursday 17:30', 'Thursday 18:30'),
    enrollment('enrollment-b', 'student-b', 'Friday 17:30'),
    enrollment('enrollment-inactive', 'student-inactive', 'Thursday 16:00'),
  ],
  students: [...students], programs: [...programs],
});

assert.deepEqual(roster.map(item => item.studentId), ['student-a']);
assert.deepEqual(roster[0].slots.map(slot => slot.time), ['17:30', '18:30']);
assert.deepEqual(roster[0].slots.map(slot => slot.groupName), ['Blue', 'Green']);
assert.equal(roster[0].slots[0].programName, 'Robotics');

const lobbyRoster = projectDailyPickupRoster({
  organizationId: 'org-a', sessionDate: '2026-10-15', weekday: 'Thursday',
  enrollments: [enrollment('enrollment-a', 'student-a', 'Thursday 17:30'), enrollment('enrollment-b', 'student-b', 'Thursday 18:00')],
  students: [...students], programs: [...programs],
});
const attendance = [
  { id: 'present-a', organizationId: 'org-a', date: '2026-10-15', studentId: 'student-a', enrollmentId: 'enrollment-a', status: 'present' },
  { id: 'absent-b', organizationId: 'org-a', date: '2026-10-15', studentId: 'student-b', enrollmentId: 'enrollment-b', status: 'absent' },
  { id: 'foreign-b', organizationId: 'org-b', date: '2026-10-15', studentId: 'student-b', enrollmentId: 'enrollment-b', status: 'present' },
  { id: 'old-b', organizationId: 'org-a', date: '2026-10-14', studentId: 'student-b', enrollmentId: 'enrollment-b', status: 'present' },
] as never;
assert.deepEqual(selectPresentPickupRoster(lobbyRoster, attendance, 'org-a', '2026-10-15').map(item => item.studentId), ['student-a']);
assert.deepEqual(selectPresentPickupRoster(lobbyRoster, [
  { id: 'late-b', organizationId: 'org-a', date: '2026-10-15', studentId: 'student-b', enrollmentId: 'enrollment-b', status: 'late' },
] as never, 'org-a', '2026-10-15').map(item => item.studentId), ['student-b']);

console.log('Daily Pickup roster smoke passed.');
