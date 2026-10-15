import assert from 'node:assert/strict';
import { removeCredentialById, saveCredentialById, uniqueCredentialsById } from './credentialCabinet.ts';
import { canDeleteOwnedShowcase, isShowcaseProject, supportsPasswordReauthentication } from './showcaseDeletion.ts';
import type { Credential, StudentProject } from '../types.ts';

const key = (id: string): Credential => ({ id, service: 'Scratch', label: 'My account', username: 'same-name', password: 'synthetic-only' });
const first = key('operation-one');
const second = key('operation-two');
const oneWrite = saveCredentialById([], first);
assert.equal(oneWrite.length, 1);
assert.deepEqual(saveCredentialById(oneWrite, first), oneWrite, 'retrying one operation must not create another key');
const sameTitleKeys = saveCredentialById(oneWrite, second);
assert.equal(sameTitleKeys.length, 2, 'same-title keys with different IDs must remain independent');
assert.deepEqual(removeCredentialById(sameTitleKeys, first.id).map(item => item.id), [second.id]);
assert.deepEqual(uniqueCredentialsById([first, first, second]).map(item => item.id), [first.id, second.id]);

const showcase = { id: 'showcase-one', templateId: 'showcase-template', organizationId: 'org-a', studentId: 'student-a' } as StudentProject;
const assignment = { ...showcase, id: 'assignment-one', templateId: 'mission-template' };
assert.equal(isShowcaseProject(showcase), true);
assert.equal(isShowcaseProject(assignment), false);
assert.equal(canDeleteOwnedShowcase(showcase, 'org-a', ['student-a']), true);
assert.equal(canDeleteOwnedShowcase(showcase, 'org-b', ['student-a']), false);
assert.equal(canDeleteOwnedShowcase(showcase, 'org-a', ['student-b']), false);
assert.equal(canDeleteOwnedShowcase(assignment, 'org-a', ['student-a']), false);
assert.equal(supportsPasswordReauthentication({ email: 'learner@example.test', providerData: [{ providerId: 'password' }] }), true);
assert.equal(supportsPasswordReauthentication({ email: 'learner@example.test', providerData: [{ providerId: 'custom' }] }), false);
assert.equal(supportsPasswordReauthentication({ email: null, providerData: [{ providerId: 'password' }] }), false);
console.log('Credential and Showcase smoke: 14 assertions passed.');
