import assert from 'node:assert/strict';
import { projectDailyPickupRoster } from './dailyPickupRoster.ts';

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

console.log('Daily Pickup roster smoke passed.');
