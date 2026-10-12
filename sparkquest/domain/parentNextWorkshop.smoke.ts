import assert from 'node:assert/strict';
import type { Enrollment, Program } from '../../types';
import { nextWorkshopFromSchedule } from './parentNextWorkshop.ts';

const enrollment = { id: 'en-one', studentId: 'child-one', organizationId: 'org-one', programId: 'prog-one', programName: 'STEMQuest', groupId: 'group-one', gradeId: 'grade-one', status: 'active', startDate: '2026-09-01', endDate: '2027-07-01' } as Enrollment;
const program = { id: 'prog-one', organizationId: 'org-one', name: 'STEMQuest', status: 'active', type: 'Regular Program', description: '', packs: [], runSetup: { startDate: '2026-09-01', endDate: '2027-07-01', timezone: 'Africa/Casablanca' }, grades: [{ id: 'grade-one', organizationId: 'org-one', name: 'Makers', groups: [{ id: 'group-one', name: 'Mini Makers', day: 'lundi', time: '15:00', scheduleBlocks: [{ id: 'slot-one', day: 'lundi', startTime: '15:00', endTime: '16:30' }] }] }] } as Program;

const before = nextWorkshopFromSchedule([enrollment], [program], new Date('2026-10-12T09:00:00Z'));
assert.equal(before?.date, '2026-10-12');
assert.equal(before?.startTime, '15:00');
assert.equal(before?.endTime, '16:30');
assert.equal(before?.groupName, 'Mini Makers');
assert.equal(before?.isUnderway, false);

const underway = nextWorkshopFromSchedule([enrollment], [program], new Date('2026-10-12T14:30:00Z'));
assert.equal(underway?.date, '2026-10-12');
assert.equal(underway?.isUnderway, true);

assert.equal(nextWorkshopFromSchedule([enrollment], [program], new Date('2026-10-12T16:00:00Z'))?.date, '2026-10-19');
assert.equal(nextWorkshopFromSchedule([enrollment], [{ ...program, status: 'paused' }], new Date('2026-10-12T09:00:00Z')), null);
assert.equal(nextWorkshopFromSchedule([{ ...enrollment, status: 'completed' }], [program], new Date('2026-10-12T09:00:00Z')), null);
assert.equal(nextWorkshopFromSchedule([enrollment], [{ ...program, organizationId: 'another-org' }], new Date('2026-10-12T09:00:00Z')), null);
assert.equal(nextWorkshopFromSchedule([{ ...enrollment, groupId: 'other-group' }], [program], new Date('2026-10-12T09:00:00Z')), null);
assert.equal(nextWorkshopFromSchedule([enrollment], [{ ...program, grades: [] }], new Date('2026-10-12T09:00:00Z')), null);
assert.equal(nextWorkshopFromSchedule([{ ...enrollment, groupId: undefined, groupTime: 'Lundi 15:00–16:30' }], [{ ...program, grades: [] }], new Date('2026-10-12T09:00:00Z'))?.endTime, '16:30');

console.log('parent next workshop: 9 schedule checks passed');
