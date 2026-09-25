import assert from 'node:assert/strict';
import { buildMissionAssignmentPatch, missionIsVisibleToLearner } from './missionAssignment.ts';

const gradePatch = buildMissionAssignmentPatch({
  mode: 'grade',
  organizationId: 'org-1',
  programId: 'program-1',
  programName: 'STEMQuest 2026-2027',
  gradeId: 'grade-1',
  gradeName: 'Tiny Makers',
});
assert.deepEqual(gradePatch.targetAudience, {
  programs: ['program-1', 'STEMQuest 2026-2027'],
  grades: ['grade-1', 'Tiny Makers'],
  groups: [],
  students: [],
});
assert.equal(gradePatch.status, 'assigned');
assert.equal(missionIsVisibleToLearner(gradePatch, {
  ownerIds: ['student-1'],
  programIds: ['program-1'],
  gradeIds: ['grade-1'],
  groupIds: [],
}), true);
assert.equal(missionIsVisibleToLearner(gradePatch, {
  ownerIds: ['student-1'],
  programIds: ['different-program'],
  gradeIds: ['grade-1'],
  groupIds: [],
}), false);

const groupPatch = buildMissionAssignmentPatch({
  mode: 'groups',
  organizationId: 'org-1',
  programId: 'program-1',
  gradeId: 'grade-1',
  groupIds: ['group-1'],
  groupNames: ['Wednesday makers'],
});
assert.equal(missionIsVisibleToLearner(groupPatch, {
  ownerIds: ['student-1'],
  programIds: ['program-1'],
  gradeIds: ['grade-1'],
  groupIds: ['Wednesday makers'],
}), true);
assert.equal(missionIsVisibleToLearner(groupPatch, {
  ownerIds: ['student-2'],
  programIds: ['program-1'],
  gradeIds: ['grade-1'],
  groupIds: ['group-2'],
}), false);

const directPatch = buildMissionAssignmentPatch({
  mode: 'students',
  organizationId: 'org-1',
  studentIds: ['student-record-1'],
});
assert.equal(missionIsVisibleToLearner(directPatch, {
  ownerIds: ['auth-1', 'student-record-1'],
  programIds: [],
  gradeIds: [],
  groupIds: [],
}), true);
assert.equal(missionIsVisibleToLearner(directPatch, {
  ownerIds: ['student-record-2'],
  programIds: ['program-1'],
  gradeIds: ['grade-1'],
  groupIds: ['group-1'],
}), false);

assert.throws(() => buildMissionAssignmentPatch({
  mode: 'groups',
  organizationId: 'org-1',
  programId: 'program-1',
  gradeId: 'grade-1',
}), /at least one group/);

assert.throws(() => buildMissionAssignmentPatch({
  mode: 'grade',
  organizationId: 'org-1',
  gradeId: 'grade-1',
}), /Choose a program/);

console.log('SparkQuest mission assignment smoke: 10 assertions passed.');
