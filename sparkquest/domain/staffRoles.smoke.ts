import assert from 'node:assert/strict';
import { isSparkQuestStaffRole } from './staffRoles.ts';

for (const role of ['super_admin', 'owner', 'admin', 'instructor']) {
  assert.equal(isSparkQuestStaffRole(role), true, `${role} should open the SparkQuest Studio`);
}

for (const role of ['parent', 'student', 'guest', '', undefined, null]) {
  assert.equal(isSparkQuestStaffRole(role), false, `${String(role)} should not receive Studio staff access`);
}

console.log('SparkQuest staff role smoke passed.');
