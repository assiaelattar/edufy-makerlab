import assert from 'node:assert/strict';
import type { ClassSession, Program, WorkshopSlot, WorkshopTemplate } from '../types';
import { projectInstructorWeek } from './schedule';

const monday = new Date(2026, 9, 26, 12);
const program = {
  id: 'stemquest', organizationId: 'makerlab', name: 'STEMQuest', status: 'active',
  enrollmentPolicy: { mode: 'rolling_membership', allowJoinAnytime: true, membershipDurationMonths: 12 },
  grades: [{ id: 'grade-a', organizationId: 'makerlab', name: 'Level 1', groups: [{
    id: 'group-a', name: 'Makers', day: 'Monday', time: '09:00', instructorId: 'ayoub', instructorName: 'Ayoub',
    scheduleBlocks: [
      { id: 'mon', day: 'Monday', startTime: '09:00', endTime: '10:30' },
      { id: 'wed', day: 'Wednesday', startTime: '14:00', endTime: '15:30' },
    ],
  }] }],
} as unknown as Program;

const projected = projectInstructorWeek([program], [], 'makerlab', 'ayoub', monday);
assert.equal(projected.length, 2);
assert.deepEqual(projected.map(item => item.date), ['2026-10-26', '2026-10-28']);
assert.equal(projected[0].detail, 'Level 1 · Makers');

const reassigned = [{
  id: 'override', organizationId: 'makerlab', date: '2026-10-26', startTime: '09:00', endTime: '10:30',
  groupId: 'group-a', instructorId: 'ahmed', instructorName: 'Ahmed', title: 'STEMQuest', subTitle: 'Level 1 · Makers',
  type: 'program_class', status: 'scheduled',
}] as ClassSession[];
assert.deepEqual(projectInstructorWeek([program], reassigned, 'makerlab', 'ayoub', monday).map(item => item.date), ['2026-10-28']);
assert.deepEqual(projectInstructorWeek([program], reassigned, 'makerlab', 'ahmed', monday).map(item => item.id), ['override']);
const unassignedMaterialized = [{ ...reassigned[0], instructorId: '', instructorName: '' }] as ClassSession[];
assert.deepEqual(projectInstructorWeek([program], unassignedMaterialized, 'makerlab', 'ayoub', monday).map(item => item.date), ['2026-10-26', '2026-10-28']);

const workshop = [{
  id: 'trial', organizationId: 'makerlab', date: '2026-10-26', startTime: '11:00', endTime: '12:00',
  instructorId: 'ayoub', title: 'Robotics trial', subTitle: 'Discovery workshop', type: 'workshop_trial', status: 'scheduled',
}] as ClassSession[];
assert.equal(projectInstructorWeek([program], workshop, 'makerlab', 'ayoub', monday).filter(item => item.kind === 'workshop').length, 1);
assert.equal(projectInstructorWeek([program], workshop, 'other-tenant', 'ayoub', monday).length, 0);
const template = {
  id: 'trial-template', organizationId: 'makerlab', title: 'Discovery robotics', instructorId: 'ayoub',
  duration: 90, isActive: true, recurrenceType: 'weekly', recurrencePattern: { days: [1], time: '11:00' },
} as WorkshopTemplate;
assert.equal(projectInstructorWeek([program], [], 'makerlab', 'ayoub', monday, [template]).filter(item => item.kind === 'workshop').length, 1);
assert.equal(projectInstructorWeek([program], [{ ...workshop[0], workshopTemplateId: 'trial-template' }], 'makerlab', 'ayoub', monday, [template]).filter(item => item.kind === 'workshop').length, 1);
const reassignedSlot = [{
  id: 'slot-1', organizationId: 'makerlab', workshopTemplateId: 'trial-template', date: '2026-10-26', startTime: '11:00', endTime: '12:30',
  instructorId: 'ahmed', instructorName: 'Ahmed', status: 'available', capacity: 5, bookedCount: 1,
}] as WorkshopSlot[];
assert.equal(projectInstructorWeek([program], [], 'makerlab', 'ayoub', monday, [template], reassignedSlot).filter(item => item.kind === 'workshop').length, 0);
assert.equal(projectInstructorWeek([program], [], 'makerlab', 'ahmed', monday, [template], reassignedSlot).filter(item => item.kind === 'workshop').length, 1);
assert.equal(projectInstructorWeek([program], [], 'other-tenant', 'ahmed', monday, [template], reassignedSlot).length, 0);
const movedSlot = [{ ...reassignedSlot[0], date: '2026-10-27', startTime: '18:00', endTime: '19:30' }] as WorkshopSlot[];
assert.deepEqual(projectInstructorWeek([], [], 'makerlab', 'ahmed', monday, [template], movedSlot).map(item => item.date), ['2026-10-27']);
assert.equal(projectInstructorWeek([], [], 'makerlab', 'ahmed', monday, [template], movedSlot)[0].title, 'Discovery robotics');
const pausedTemplate = { ...template, isActive: false } as WorkshopTemplate;
assert.equal(projectInstructorWeek([], [], 'makerlab', 'ahmed', monday, [pausedTemplate], movedSlot).length, 1);
const adHocSlot = [{ ...reassignedSlot[0], id: 'ad-hoc', workshopTemplateId: 'none', title: 'Discovery lab' }] as WorkshopSlot[];
assert.equal(projectInstructorWeek([], [], 'makerlab', 'ahmed', monday, [], adHocSlot)[0].title, 'Discovery lab');
console.log('Instructor Pass schedule smoke passed');
