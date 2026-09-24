import assert from 'node:assert/strict';
import { buildMissionAssignmentPatch, missionIsVisibleToLearner } from './missionAssignment.ts';

const gradePatch = buildMissionAssignmentPatch({
  mode: 'grade',
  organizationId: 'org-1',
  gradeId: 'grade-1',
});
assert.deepEqual(gradePatch.targetAudience, { grades: ['grade-1'], groups: [], students: [] });
assert.equal(gradePatch.status, 'assigned');

const groupPatch = buildMissionAssignmentPatch({
  mode: 'groups',
  organizationId: 'org-1',
  gradeId: 'grade-1',
  groupIds: ['group-1'],
  groupNames: ['Wednesday makers'],
});
assert.equal(missionIsVisibleToLearner(groupPatch, {
  ownerIds: ['student-1'],
  gradeIds: ['grade-1'],
  groupIds: ['Wednesday makers'],
}), true);
assert.equal(missionIsVisibleToLearner(groupPatch, {
  ownerIds: ['student-2'],
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
  gradeIds: [],
  groupIds: [],
}), true);
assert.equal(missionIsVisibleToLearner(directPatch, {
  ownerIds: ['student-record-2'],
  gradeIds: ['grade-1'],
  groupIds: ['group-1'],
}), false);

assert.throws(() => buildMissionAssignmentPatch({
  mode: 'groups',
  organizationId: 'org-1',
  gradeId: 'grade-1',
}), /at least one group/);

console.log('SparkQuest mission assignment smoke: 7 assertions passed.');
