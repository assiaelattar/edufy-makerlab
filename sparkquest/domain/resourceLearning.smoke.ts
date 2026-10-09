import assert from 'node:assert/strict';
import { filterResourceLibrary, nextResourceProgress, pendingRequiredResources, resourceHasValidQuiz, resourceMastered, resourceTypeLabel, scoreResourceQuiz, validateLibraryResource } from './resourceLearning.ts';
import type { Resource, ResourceLibraryItem } from '../types.ts';

const required: Resource = { id: 'sensor-guide', title: 'Sensor guide', type: 'file', url: 'https://example.test/sensor.pdf', requiredForProgress: true, quiz: { version: 1, passingScore: 100, questions: [{ id: 'q1', prompt: 'Where does power connect?', options: ['GND', '3V'], correctOptionIndex: 1 }] } };
assert.equal(resourceHasValidQuiz(required), true);
assert.equal(resourceMastered({}, required), false);
assert.deepEqual(scoreResourceQuiz(required, { q1: 1 }), { correct: 1, total: 1, score: 100, passed: true });
assert.deepEqual(scoreResourceQuiz(required, { q1: 0 }), { correct: 0, total: 1, score: 0, passed: false });
const progress = nextResourceProgress(required, undefined, 100, '2026-10-03T10:00:00Z');
assert.equal(resourceMastered({ resourceProgress: { 'sensor-guide': progress } }, required), true);
assert.equal(pendingRequiredResources({ resourceProgress: { 'sensor-guide': progress } }, [required]).length, 0);
assert.throws(() => validateLibraryResource({ ...required, quiz: undefined }), /knowledge check/);
assert.throws(() => validateLibraryResource({ ...required, requiredForProgress: false, quiz: { version: 1, passingScore: 100, questions: [{ id: 'broken', prompt: '', options: ['', ''], correctOptionIndex: 0 }] } }), /Complete every/);

const items = [required, { id: 'video', title: 'Moisture demo', description: 'Wet and dry soil', tags: ['sensor'], type: 'video', url: 'https://example.test/video' }] as ResourceLibraryItem[];
assert.deepEqual(filterResourceLibrary(items, 'sensor', 'all').map(item => item.id), ['sensor-guide', 'video']);
assert.deepEqual(filterResourceLibrary(items, '', 'video').map(item => item.id), ['video']);
assert.equal(resourceTypeLabel({ id: 'tool', title: 'IDE', type: 'tool', toolAccess: 'download', url: 'https://example.test/ide' }), 'Installable tool');
console.log('resourceLearning.smoke: 12 assertions passed');
