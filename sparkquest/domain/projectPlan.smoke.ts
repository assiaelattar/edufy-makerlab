import assert from 'node:assert/strict';
import { appendParsedPlanSteps, mergeProjectPlan, parsePlanText, stepHasProtectedWork } from './projectPlan.ts';
import type { ProjectStep } from '../types.ts';

const steps = parsePlanText(`
Project plan:
1. Research the problem
- Sketch: Draw two possible solutions
☐ Build prototype — Use cardboard first
* Test prototype | Record what changed
2) Sketch
3. [ ] Share results: Explain the test
`);
assert.deepEqual(steps, [
  { title: 'Research the problem' },
  { title: 'Sketch', instructions: 'Draw two possible solutions' },
  { title: 'Build prototype', instructions: 'Use cardboard first' },
  { title: 'Test prototype', instructions: 'Record what changed' },
  { title: 'Share results', instructions: 'Explain the test' },
]);

const stored: ProjectStep[] = [
  { id: 'plan', title: 'Plan', status: 'done', evidence: 'https://example.test/plan.png', order: 1 },
  { id: 'build', title: 'Build', status: 'todo', order: 2 },
];
const reordered = mergeProjectPlan(stored, [
  { ...stored[1], title: 'Build the prototype' },
  { ...stored[0], title: 'Plan the prototype' },
]);
assert.deepEqual(reordered.map(step => [step.id, step.title, step.order]), [
  ['build', 'Build the prototype', 1],
  ['plan', 'Plan the prototype', 2],
]);
assert.equal(reordered[1].evidence, stored[0].evidence);
assert.equal(mergeProjectPlan(stored, [{ ...stored[0], description: 'First line\nSecond line' }, stored[1]])[0].description, 'First line\nSecond line');
assert.throws(() => mergeProjectPlan(stored, [stored[1]]), /cannot be deleted/);
assert.deepEqual(mergeProjectPlan(stored, [stored[0]])[0].id, 'plan');
assert.equal(stepHasProtectedWork({ id: 'new', title: 'New', status: 'todo' }), false);
assert.equal(stepHasProtectedWork({ id: 'started', title: 'Started', status: 'doing' }), true);

const appended = appendParsedPlanSteps([stored[0]], steps, index => `new-${index}`);
assert.equal(appended.length, 6);
assert.equal(appended[1].id, 'new-0');
assert.equal(appended[1].source, 'student');
assert.equal(appended[1].required, false);

console.log('projectPlan.smoke: 12 assertions passed');
