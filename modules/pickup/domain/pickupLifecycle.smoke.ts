import assert from 'node:assert/strict';
import { canAdvancePickup, isAuthorizedPicker, isCanonicalPickupEntry, pickupEntryId, pickupSessionDate, previousPickupDate, selectDatedPickup, selectOpenPickup } from './pickupLifecycle.ts';

assert.equal(pickupEntryId('org-a', 'student-a', '2026-10-10'), 'org-a_student-a_2026-10-10_daily');
assert.equal(pickupSessionDate(new Date('2026-10-10T15:00:00Z')), '2026-10-10');
assert.equal(previousPickupDate('2026-01-01'), '2025-12-31');
assert.throws(() => pickupEntryId('org-a', 'student-a', 'tomorrow'));
assert.equal(isAuthorizedPicker('Maya', 'Maya', []), true);
assert.equal(isAuthorizedPicker('Uncle Sam', 'Maya', ['Uncle Sam']), true);
assert.equal(isAuthorizedPicker('Stranger', 'Maya', ['Uncle Sam']), false);
assert.equal(canAdvancePickup('on_the_way', 'arrived'), true);
assert.equal(canAdvancePickup('arrived', 'ready'), true);
assert.equal(canAdvancePickup('ready', 'released'), true);
assert.equal(canAdvancePickup('released', 'confirmed'), true);
assert.equal(canAdvancePickup('arrived', 'released'), false);
assert.equal(canAdvancePickup('on_the_way', 'released'), false);
assert.equal(canAdvancePickup('released', 'arrived'), false);
assert.equal(canAdvancePickup('confirmed', 'on_the_way'), false);
assert.equal(canAdvancePickup('on_the_way', 'cancelled'), true);
assert.equal(canAdvancePickup('arrived', 'exception'), true);
assert.equal(canAdvancePickup('ready', 'cancelled'), true);
const entries = [
  { id: 'random-legacy', organizationId: 'org-a', studentId: 'student-a', sessionDate: '2026-10-10' },
  { id: 'org-a_student-a_2026-10-09_daily', organizationId: 'org-a', studentId: 'student-a', sessionDate: '2026-10-09' },
  { id: 'org-b_student-a_2026-10-10_daily', organizationId: 'org-b', studentId: 'student-a', sessionDate: '2026-10-10' },
  { id: 'org-a_student-a_2026-10-10_daily', organizationId: 'org-a', studentId: 'student-a', sessionDate: '2026-10-10' }
];
assert.equal(selectDatedPickup(entries, 'org-a', 'student-a', '2026-10-10')?.id, 'org-a_student-a_2026-10-10_daily');
assert.equal(isCanonicalPickupEntry(entries[0]), false);
assert.equal(isCanonicalPickupEntry(entries[3]), true);
assert.equal(isCanonicalPickupEntry({ ...entries[3], sessionDate: 'old' }), false);
assert.equal(selectDatedPickup(entries, 'org-a', 'student-b', '2026-10-10'), null);
assert.equal(selectOpenPickup(entries.map(entry => ({ ...entry, status: entry.sessionDate === '2026-10-09' ? 'released' : 'confirmed' })), 'org-a', 'student-a', '2026-10-10')?.sessionDate, '2026-10-10');
assert.equal(selectOpenPickup(entries.filter(entry => entry.sessionDate === '2026-10-09').map(entry => ({ ...entry, status: 'released' })), 'org-a', 'student-a', '2026-10-10'), null);
assert.equal(selectOpenPickup(entries.filter(entry => entry.sessionDate === '2026-10-09').map(entry => ({ ...entry, status: 'arrived' })), 'org-a', 'student-a', '2026-10-10')?.sessionDate, '2026-10-09');
assert.equal(selectOpenPickup(entries.filter(entry => entry.sessionDate === '2026-10-09').map(entry => ({ ...entry, status: 'ready' })), 'org-a', 'student-a', '2026-10-10')?.sessionDate, '2026-10-09');

console.log('Pickup lifecycle domain smoke passed.');
