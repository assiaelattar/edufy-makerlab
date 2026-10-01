import assert from 'node:assert/strict';
import {
  buildProjectStepsFromWorkflow,
  createStudentTask,
  createWorkflowSnapshot,
  refreshProjectStepsFromWorkflow,
} from './workflowPipeline.ts';

const workflow = {
  id: 'engineering-v1',
  name: 'Maker process',
  description: 'Understand, make, test and share.',
  version: 3,
  phases: [
    {
      id: 'make', name: 'Make', color: 'amber', icon: 'Hammer', order: 2,
      instructions: 'Build the smallest useful prototype.',
      checklist: ['Assemble the prototype', 'Power it safely'],
      tools: ['Wire cutter'], materials: ['Cardboard'],
      evidenceRequirements: [{ id: 'make-photo', type: 'image' as const, prompt: 'Photograph the first prototype.' }],
      resources: [{ id: 'guide', title: 'Build guide', type: 'file' as const, url: 'https://example.com/guide.pdf' }],
    },
    { id: 'understand', name: 'Understand', color: 'blue', icon: 'Search', order: 1, description: 'Define the problem.' },
  ],
};

const snapshot = createWorkflowSnapshot(workflow);
assert.equal(snapshot.version, 3);
assert.deepEqual(snapshot.phases.map(phase => phase.id), ['understand', 'make']);

const steps = buildProjectStepsFromWorkflow(snapshot, {
  make: [{ id: 'video', title: 'Demo', type: 'video', url: 'https://example.com/demo' }],
});
assert.equal(steps[1].source, 'workflow');
assert.equal(steps[1].resources?.length, 2);
assert.equal(steps[1].evidenceRequirements?.[0].type, 'image');
assert.deepEqual(steps[1].checklistCompleted, [false, false]);

const refreshed = refreshProjectStepsFromWorkflow([
  { ...steps[0], status: 'done', evidence: 'proof.jpg', checklistCompleted: [true] },
  { ...steps[1], status: 'doing', checklistCompleted: [true, false] },
  createStudentTask('Ask a mentor', 'student-task'),
], snapshot);
assert.equal(refreshed[0].status, 'done');
assert.equal(refreshed[0].evidence, 'proof.jpg');
assert.deepEqual(refreshed[1].checklistCompleted, [true, false]);
assert.equal(refreshed[2].source, 'student');
assert.equal(refreshed[2].title, 'Ask a mentor');

const legacy = refreshProjectStepsFromWorkflow([
  { id: 'legacy-random', title: 'Make', status: 'doing' },
], snapshot);
assert.equal(legacy[0].phaseId, 'make');
assert.equal(legacy[0].instructions, 'Build the smallest useful prototype.');

const unmatched = refreshProjectStepsFromWorkflow([
  { id: 'legacy-random', title: 'Different phase', status: 'todo' },
], snapshot);
assert.equal(unmatched[0].phaseId, undefined);

console.log('workflowPipeline.smoke: 16 assertions passed');
