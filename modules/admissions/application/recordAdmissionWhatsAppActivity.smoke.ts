import assert from 'node:assert/strict';
import type { AdmissionActor } from '../domain/index.ts';
import { InMemoryAdmissionWhatsAppStore } from '../infrastructure/inMemoryAdmissionWhatsAppStore.ts';
import { AdmissionCommandError } from './admissionCommandTypes.ts';
import { recordAdmissionWhatsAppActivity } from './recordAdmissionWhatsAppActivity.ts';

const fixedClock = { now: () => new Date('2026-09-09T12:00:00.000Z') };
const makeActor = (overrides: Partial<AdmissionActor> = {}): AdmissionActor => ({
  id: 'operator-1',
  organizationId: 'org-1',
  role: 'admission_officer',
  status: 'active',
  permissions: ['admissions.view', 'admissions.whatsapp'],
  ...overrides,
});
const makeCommand = (overrides: Record<string, unknown> = {}) => ({
  commandId: 'wa-command-001',
  organizationId: 'org-1',
  admissionCaseId: 'lead-1',
  legacyLeadId: 'lead-1',
  expectedVersion: 0,
  communicationState: 'consent_updated' as const,
  consentState: 'granted' as const,
  templateId: 'consent',
  body: 'WhatsApp consent granted by the parent.',
  outcome: null,
  occurredAt: '2026-09-09T11:55:00.000Z',
  ...overrides,
});
const expectCode = async (promise: Promise<unknown>, code: string) => assert.rejects(
  promise,
  error => error instanceof AdmissionCommandError && error.code === code,
);

const store = new InMemoryAdmissionWhatsAppStore();
store.seedLead('lead-1', 'org-1');

const consent = await recordAdmissionWhatsAppActivity({ store, clock: fixedClock }, makeActor(), makeCommand());
assert.deepEqual(consent, { activityId: 'wa-command-001', caseVersion: 1, replayed: false });
assert.equal(store.getActivity(consent.activityId)?.kind, 'follow_up');
assert.equal(store.getActivity(consent.activityId)?.channel, 'whatsapp');
assert.equal(store.getActivity(consent.activityId)?.communicationState, 'consent_updated');
assert.equal(store.getState('lead-1')?.lastActivityKind, 'follow_up');

const replay = await recordAdmissionWhatsAppActivity({ store, clock: fixedClock }, makeActor(), makeCommand());
assert.equal(replay.replayed, true);
assert.equal(store.getState('lead-1')?.version, 1);
await expectCode(recordAdmissionWhatsAppActivity({ store, clock: fixedClock }, makeActor(), makeCommand({ body: 'Different' })), 'IDEMPOTENCY_CONFLICT');

const launched = await recordAdmissionWhatsAppActivity({ store, clock: fixedClock }, makeActor(), makeCommand({
  commandId: 'wa-command-002',
  expectedVersion: 1,
  communicationState: 'launched',
  body: 'Bonjour Sara, voici le planning.',
}));
assert.equal(launched.caseVersion, 2);
assert.equal(store.getActivity(launched.activityId)?.outcome, null, 'launch must not claim a response');

const response = await recordAdmissionWhatsAppActivity({ store, clock: fixedClock }, makeActor(), makeCommand({
  commandId: 'wa-command-003',
  expectedVersion: 2,
  communicationState: 'parent_response_recorded',
  body: 'Parent asked to be called Friday.',
  outcome: 'asked_to_follow_up',
}));
assert.equal(response.caseVersion, 3);

await expectCode(recordAdmissionWhatsAppActivity({ store, clock: fixedClock }, makeActor(), makeCommand({ commandId: 'wa-no-consent', expectedVersion: 3, communicationState: 'launched', consentState: 'unknown' })), 'INVALID_COMMAND');
await expectCode(recordAdmissionWhatsAppActivity({ store, clock: fixedClock }, makeActor(), makeCommand({ commandId: 'wa-opt-out', expectedVersion: 3, communicationState: 'prepared', consentState: 'opted_out' })), 'INVALID_COMMAND');
await expectCode(recordAdmissionWhatsAppActivity({ store, clock: fixedClock }, makeActor(), makeCommand({ commandId: 'wa-response-missing', expectedVersion: 3, communicationState: 'parent_response_recorded', outcome: null })), 'INVALID_COMMAND');
await expectCode(recordAdmissionWhatsAppActivity({ store, clock: fixedClock }, makeActor(), makeCommand({ commandId: 'wa-outcome-extra', expectedVersion: 3, communicationState: 'prepared', outcome: 'interested' })), 'INVALID_COMMAND');
await expectCode(recordAdmissionWhatsAppActivity({ store, clock: fixedClock }, makeActor(), makeCommand({ commandId: 'wa-unresolved', expectedVersion: 3, communicationState: 'prepared', body: 'Hello {{parent_name}}' })), 'INVALID_COMMAND');
await expectCode(recordAdmissionWhatsAppActivity({ store, clock: fixedClock }, makeActor({ permissions: ['admissions.view'] }), makeCommand({ commandId: 'wa-forbidden', expectedVersion: 3 })), 'FORBIDDEN');
await expectCode(recordAdmissionWhatsAppActivity({ store, clock: fixedClock }, makeActor({ organizationId: 'org-2' }), makeCommand({ commandId: 'wa-other-actor', expectedVersion: 3 })), 'FORBIDDEN');
await expectCode(recordAdmissionWhatsAppActivity({ store, clock: fixedClock }, makeActor(), makeCommand({ commandId: 'wa/stale', expectedVersion: 3 })), 'INVALID_COMMAND');
await expectCode(recordAdmissionWhatsAppActivity({ store, clock: fixedClock }, makeActor(), makeCommand({ commandId: 'wa-stale', expectedVersion: 2 })), 'STALE_VERSION');
await expectCode(recordAdmissionWhatsAppActivity({ store, clock: fixedClock }, makeActor(), makeCommand({ commandId: 'wa-future', expectedVersion: 3, occurredAt: '2026-09-09T12:05:01.000Z' })), 'INVALID_COMMAND');

const crossTenantStore = new InMemoryAdmissionWhatsAppStore();
crossTenantStore.seedLead('lead-1', 'org-2');
await expectCode(recordAdmissionWhatsAppActivity({ store: crossTenantStore, clock: fixedClock }, makeActor(), makeCommand({ commandId: 'wa-cross-tenant' })), 'TENANT_MISMATCH');

assert.equal(store.getState('lead-1')?.whatsappConsentState, 'granted');
await recordAdmissionWhatsAppActivity({ store, clock: fixedClock }, makeActor(), makeCommand({ commandId: 'wa-revoke', expectedVersion: 3, consentState: 'opted_out' }));
assert.equal(store.getState('lead-1')?.whatsappConsentState, 'opted_out');
await expectCode(recordAdmissionWhatsAppActivity({ store, clock: fixedClock }, makeActor(), makeCommand({ commandId: 'wa-forged-consent', expectedVersion: 4, communicationState: 'launched', consentState: 'granted' })), 'STALE_VERSION');
const freshStore = new InMemoryAdmissionWhatsAppStore();
freshStore.seedLead('lead-1', 'org-1');
await expectCode(recordAdmissionWhatsAppActivity({ store: freshStore, clock: fixedClock }, makeActor(), makeCommand({ commandId: 'wa-no-consent-record', communicationState: 'launched' })), 'STALE_VERSION');
assert.equal(freshStore.getState('lead-1'), null, 'a rejected launch must not create a workflow state');

console.log('Admission WhatsApp command smoke checks passed (28 safeguards).');
