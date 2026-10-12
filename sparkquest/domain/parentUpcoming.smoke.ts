import assert from 'node:assert/strict';
import type { ProjectTemplate, StudentProject } from '../types.ts';
import { upcomingForChild } from './parentUpcoming.ts';

const mission = (id: string, audience: ProjectTemplate['targetAudience'], extras: Partial<ProjectTemplate> = {}) => ({
  id, organizationId: 'makerlab', title: id, description: `Intention for ${id}`,
  status: 'assigned', targetAudience: audience, ...extras,
}) as ProjectTemplate;
const context = { ownerIds: ['maya-record', 'maya-auth'], programIds: ['STEMQuest'], gradeIds: ['G3'], groupIds: ['A'] };
const templates = [
  mission('direct', { students: ['maya-record'] }),
  mission('auth-id', { additionalStudents: ['maya-auth'] }),
  mission('class', { programs: ['STEMQuest'], grades: ['G3'], groups: ['A'] }),
  mission('other-child', { students: ['adam-record'] }),
  mission('wrong-class', { programs: ['STEMQuest'], grades: ['G4'] }),
  mission('wrong-tenant', { students: ['maya-record'] }, { organizationId: 'other-org' }),
  mission('draft', { students: ['maya-record'] }, { status: 'draft' }),
];

assert.deepEqual(upcomingForChild(templates, [], 'makerlab', context).map(item => item.id), ['direct', 'auth-id', 'class']);
assert.deepEqual(upcomingForChild(templates, [{ id: 'started', templateId: 'direct' } as StudentProject], 'makerlab', context).map(item => item.id), ['auth-id', 'class']);
assert.deepEqual(upcomingForChild(templates, [], 'makerlab', { ...context, programIds: [], gradeIds: [], groupIds: [] }).map(item => item.id), ['direct', 'auth-id']);
assert.deepEqual(upcomingForChild(templates, [], 'makerlab', { ownerIds: ['adam-record'], programIds: [], gradeIds: [], groupIds: [] }).map(item => item.id), ['other-child']);
console.log('parent upcoming assignments: 4 checks passed');
