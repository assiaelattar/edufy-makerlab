import assert from 'node:assert/strict';
import {
  compactReviewAlertKey,
  normalizeSeenReviewAlertKeys,
  persistSeenReviewAlertKeys,
  readSeenReviewAlertKeys,
  reviewAlertEntries,
} from './reviewAlerts.ts';
import type { StudentProject } from '../types.ts';

const base: StudentProject = {
  id: 'project-1', title: 'Plant guardian', description: '', station: 'Robotics', status: 'building',
  organizationId: 'org-1', studentId: 'student-1', resources: [], skills: [], commits: [],
  steps: [{ id: 'test', title: 'Test wet and dry soil', status: 'PENDING_REVIEW', submittedAt: '2026-10-03T09:00:00Z', evidence: 'https://example.test/proof.png' }],
};

const first = reviewAlertEntries([base], [{ id: 'student-1', name: 'Aya Maker' }]);
assert.equal(first.length, 1);
assert.equal(first[0].learnerName, 'Aya Maker');
assert.equal(first[0].scopeLabel, 'Test wet and dry soil');

const resubmitted = reviewAlertEntries([{ ...base, steps: [{ ...base.steps[0], submittedAt: '2026-10-03T10:00:00Z', note: 'I repeated both tests.' }] }]);
assert.notEqual(first[0].key, resubmitted[0].key);

const final = reviewAlertEntries([{ ...base, status: 'submitted', submittedAt: '2026-10-03T11:00:00Z', steps: [] }]);
assert.equal(final[0].scopeLabel, 'Final mission');
assert.equal(final[0].projectId, 'project-1');

const legacyHugeKey = `project-1:step:test:${'data:image/png;base64,'.padEnd(400_000, 'A')}`;
const compact = compactReviewAlertKey(legacyHugeKey);
assert.match(compact, /^v2:[0-9a-f]{16}$/);
assert.equal(compact.length, 19);
assert.deepEqual(normalizeSeenReviewAlertKeys([legacyHugeKey, legacyHugeKey]), [compact]);

const values = new Map<string, string>([['seen', JSON.stringify([legacyHugeKey])]]);
const storage = {
  getItem: (key: string) => values.get(key) || null,
  setItem: (key: string, value: string) => { values.set(key, value); },
};
assert.deepEqual(readSeenReviewAlertKeys(storage, 'seen'), [compact]);
const migrated = persistSeenReviewAlertKeys(storage, 'seen', readSeenReviewAlertKeys(storage, 'seen'));
assert.equal(migrated.persisted, true);
assert.ok((values.get('seen') || '').length < 40);

const quotaStorage = {
  getItem: () => null,
  setItem: () => { throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' }); },
};
const quotaResult = persistSeenReviewAlertKeys(quotaStorage, 'seen', [compact]);
assert.equal(quotaResult.persisted, false);
assert.deepEqual(quotaResult.keys, [compact]);

console.log('reviewAlerts smoke: 15 assertions passed');

