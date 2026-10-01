import { strict as assert } from 'node:assert';
import { omitUndefinedDeep } from './firestorePayload.ts';

const timestampLike = Object.create({ firestoreSentinel: true });
timestampLike._methodName = 'serverTimestamp';

const cleaned = omitUndefinedDeep({
    id: undefined,
    title: 'Smart plant monitor',
    hook: undefined,
    technologies: [
        { name: 'Micro:bit', icon: undefined, color: 'green' },
        undefined,
    ],
    missionBrief: {
        deliverables: [
            { id: 'prototype', title: 'Working prototype', description: undefined },
        ],
        reflectionPrompt: undefined,
    },
    createdAt: timestampLike,
});

assert.deepEqual(cleaned, {
    title: 'Smart plant monitor',
    technologies: [{ name: 'Micro:bit', color: 'green' }],
    missionBrief: {
        deliverables: [{ id: 'prototype', title: 'Working prototype' }],
    },
    createdAt: timestampLike,
});
assert.equal(cleaned.createdAt, timestampLike, 'Firestore sentinel-like objects must be preserved');

const containsUndefined = (value: unknown): boolean => {
    if (value === undefined) return true;
    if (Array.isArray(value)) return value.some(containsUndefined);
    if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) return false;
    return Object.values(value).some(containsUndefined);
};

assert.equal(containsUndefined(cleaned), false, 'project_templates payload must not contain undefined at any depth');

console.log('firestorePayload smoke test passed: copied mission id and nested optional fields are Firestore-safe');
