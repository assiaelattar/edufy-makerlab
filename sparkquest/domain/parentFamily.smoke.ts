import assert from 'node:assert/strict';
import { childHasCanonicalPermission, childPermissions, familyChildIds, permittedSubjectsForChild, projectSubjectsForChild, type GuardianFamilyLink } from './parentFamily.ts';

const link = (subjectId: string, changes: Partial<GuardianFamilyLink> = {}): GuardianFamilyLink => ({
  id: `parent-1_${subjectId}`, parentUid: 'parent-1', studentId: 'child-1', subjectId,
  organizationId: 'org-1', status: 'active', permissions: ['portfolio'], ...changes
});

assert.deepEqual(projectSubjectsForChild([
  link('child-1'), link('student-auth-1'), link('child-2', { studentId: 'child-2' }),
  link('student-auth-1', { parentUid: 'other-parent' }),
  link('student-auth-1', { organizationId: 'other-org' })
], 'child-1', 'student-auth-1', 'parent-1', 'org-1'), ['child-1', 'student-auth-1']);

assert.deepEqual(projectSubjectsForChild([
  link('child-1'), link('student-auth-1', { status: 'revoked' })
], 'child-1', 'student-auth-1', 'parent-1', 'org-1'), ['child-1']);

assert.deepEqual(projectSubjectsForChild([
  link('child-1', { permissions: ['pickup'] }), link('student-auth-1')
], 'child-1', 'student-auth-1', 'parent-1', 'org-1'), ['student-auth-1']);

assert.deepEqual(projectSubjectsForChild([
  link('child-1')
], 'child-1', 'child-1', 'parent-1', 'org-1'), ['child-1']);
assert.deepEqual(permittedSubjectsForChild([
  link('child-1', { permissions: ['gallery'] }),
  link('student-auth-1', { permissions: ['portfolio'] })
], 'child-1', 'student-auth-1', 'parent-1', 'org-1', 'gallery'), ['child-1']);

assert.deepEqual(familyChildIds([
  link('student-auth-1'),
  link('child-2', { studentId: 'child-2' }),
  link('child-3', { studentId: 'child-3', permissions: ['pickup'] }),
  link('child-4', { studentId: 'child-4', status: 'revoked' }),
  link('child-5', { studentId: 'child-5', organizationId: 'other-org' })
], 'parent-1', 'org-1'), ['child-1', 'child-2', 'child-3']);

assert.deepEqual(childPermissions([
  link('child-1', { permissions: ['portfolio'] }),
  link('student-auth-1', { permissions: ['pickup', 'payments'] })
], 'child-1', 'parent-1', 'org-1'), ['portfolio', 'pickup', 'payments']);

assert.equal(childHasCanonicalPermission([
  link('student-auth-1', { permissions: ['pickup'] })
], 'child-1', 'pickup', 'parent-1', 'org-1'), false);
assert.equal(childHasCanonicalPermission([
  link('child-1', { permissions: ['pickup'] })
], 'child-1', 'pickup', 'parent-1', 'org-1'), true);

console.log('parent family subject access: 9 checks passed');
