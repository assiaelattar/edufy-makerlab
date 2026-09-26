import assert from 'node:assert/strict';
import { assignmentFromMission, getMissionReadiness, resolveMissionContent } from './missionContent.ts';

const mission = {
  id: 'mission-1',
  title: 'Build a weather station',
  description: 'Measure the conditions around your school.',
  hook: 'Real weather data helps communities plan.',
  station: 'Circuits' as const,
  difficulty: 'intermediate' as const,
  skills: ['electronics'],
  defaultWorkflowId: 'engineering',
  status: 'assigned' as const,
  targetAudience: { programs: ['stemquest'], grades: ['tiny-makers'], groups: [], students: [] },
  resources: [{ id: 'guide', title: 'Sensor guide', type: 'file' as const, url: 'https://example.com/guide.pdf' }],
  missionBrief: {
    goal: 'Build and test a device that records temperature.',
    finalOutcome: 'A working weather station and a short data report.',
    materials: ['Temperature sensor', 'Microcontroller'],
    deliverables: [
      { id: 'prototype', title: 'Working prototype', required: true, evidenceType: 'video' as const },
      { id: 'report', title: 'Data report', required: true, evidenceType: 'document' as const },
    ],
  },
};

const workflow = {
  id: 'engineering',
  name: 'Engineering design',
  description: 'Build, test, improve.',
  phases: [
    { id: 'build', name: 'Build', color: 'blue', icon: 'Wrench', order: 2 },
    { id: 'plan', name: 'Plan', color: 'amber', icon: 'Pencil', order: 1 },
  ],
};

const content = resolveMissionContent(mission, workflow);
assert.equal(content.goal, mission.missionBrief.goal);
assert.equal(content.deliverables.length, 2);
assert.deepEqual(content.steps.map(step => step.title), ['Plan', 'Build']);
assert.equal(getMissionReadiness(mission).publishReady, true);

const legacy = resolveMissionContent({ title: 'Legacy mission', description: 'Build something useful.' });
assert.equal(legacy.goal, 'Build something useful.');
assert.equal(legacy.steps.length, 3);

const assignment = assignmentFromMission(mission);
assert.equal(assignment.missionBrief?.deliverables?.[0].title, 'Working prototype');
assert.equal(assignment.resources?.[0].title, 'Sensor guide');

console.log('missionContent smoke: 8 assertions passed');
