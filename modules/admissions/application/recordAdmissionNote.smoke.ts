import assert from 'node:assert/strict';
import type { AdmissionActor } from '../domain/index.ts';
import { InMemoryAdmissionNoteStore } from '../infrastructure/inMemoryAdmissionNoteStore.ts';
import { AdmissionCommandError } from './admissionCommandTypes.ts';
import { recordAdmissionNote } from './recordAdmissionNote.ts';

const fixedClock = { now: () => new Date('2026-09-08T12:00:00.000Z') };
const makeActor = (overrides: Partial<AdmissionActor> = {}): AdmissionActor => ({
  id: 'operator-1',
  organizationId: 'org-1',
  role: 'admission_officer',
  status: 'active',
  permissions: ['admissions.view', 'admissions.note'],
  ...overrides,
});
const makeCommand = (overrides: Record<string, unknown> = {}) => ({
  commandId: 'note-command-001',
  organizationId: 'org-1',
  admissionCaseId: 'lead-1',
  legacyLeadId: 'lead-1',
  expectedVersion: 0,
  body: 'Parent asked for the planning options.',
  occurredAt: '2026-09-08T11:55:00.000Z',
  ...overrides,
});
const expectCode = async (promise: Promise<unknown>, code: string) => assert.rejects(
  promise,
  error => error instanceof AdmissionCommandError && error.code === code,
);

const store = new InMemoryAdmissionNoteStore();
store.seedLead('lead-1', 'org-1');

const first = await recordAdmissionNote({ store, clock: fixedClock }, makeActor(), makeCommand());
assert.deepEqual(first, { activityId: 'note-command-001', caseVersion: 1, replayed: false });
assert.equal(store.getActivity(first.activityId)?.kind, 'note');
assert.equal(store.getActivity(first.activityId)?.channel, 'internal');
assert.equal(store.getActivity(first.activityId)?.outcome, null);
assert.equal(store.getState('lead-1')?.version, 1);
assert.equal(store.getState('lead-1')?.openNextActionId, null, 'a note must not silently create or complete a task');

const replay = await recordAdmissionNote({ store, clock: fixedClock }, makeActor(), makeCommand());
assert.deepEqual(replay, { activityId: 'note-command-001', caseVersion: 1, replayed: true });
assert.equal(store.getState('lead-1')?.version, 1, 'an idempotent replay must not increment the version');

await expectCode(
  recordAdmissionNote({ store, clock: fixedClock }, makeActor(), makeCommand({ body: 'A different payload.' })),
  'IDEMPOTENCY_CONFLICT',
);
await expectCode(
  recordAdmissionNote({ store, clock: fixedClock }, makeActor(), makeCommand({ commandId: 'note-command-002' })),
  'STALE_VERSION',
);

const second = await recordAdmissionNote({ store, clock: fixedClock }, makeActor(), makeCommand({
  commandId: 'note-command-003',
  expectedVersion: 1,
  body: '  Parent will review the schedule.  ',
}));
assert.deepEqual(second, { activityId: 'note-command-003', caseVersion: 2, replayed: false });
assert.equal(store.getActivity(second.activityId)?.body, 'Parent will review the schedule.');

await expectCode(
  recordAdmissionNote({ store, clock: fixedClock }, makeActor({ organizationId: 'org-2' }), makeCommand({ commandId: 'note-command-004', expectedVersion: 2 })),
  'FORBIDDEN',
);
await expectCode(
  recordAdmissionNote({ store, clock: fixedClock }, makeActor({ status: 'inactive' }), makeCommand({ commandId: 'note-command-005', expectedVersion: 2 })),
  'FORBIDDEN',
);
await expectCode(
  recordAdmissionNote({ store, clock: fixedClock }, makeActor({ role: 'instructor' }), makeCommand({ commandId: 'note-command-006', expectedVersion: 2 })),
  'FORBIDDEN',
);
await expectCode(
  recordAdmissionNote({ store, clock: fixedClock }, makeActor({ permissions: ['admissions.view'] }), makeCommand({ commandId: 'note-command-007', expectedVersion: 2 })),
  'FORBIDDEN',
);
await expectCode(
  recordAdmissionNote({ store, clock: fixedClock }, makeActor(), makeCommand({ commandId: 'note-command-008', admissionCaseId: 'lead/1', expectedVersion: 2 })),
  'INVALID_COMMAND',
);
await expectCode(
  recordAdmissionNote({ store, clock: fixedClock }, makeActor(), makeCommand({ commandId: 'note-command-009', body: '   ', expectedVersion: 2 })),
  'INVALID_COMMAND',
);
await expectCode(
  recordAdmissionNote({ store, clock: fixedClock }, makeActor(), makeCommand({ commandId: 'note-command-010', body: 'x'.repeat(2001), expectedVersion: 2 })),
  'INVALID_COMMAND',
);
await expectCode(
  recordAdmissionNote({ store, clock: fixedClock }, makeActor(), makeCommand({ commandId: 'note-command-future', occurredAt: '2026-09-08T12:05:01.000Z', expectedVersion: 2 })),
  'INVALID_COMMAND',
);

const crossTenantStore = new InMemoryAdmissionNoteStore();
crossTenantStore.seedLead('lead-1', 'org-2');
await expectCode(
  recordAdmissionNote({ store: crossTenantStore, clock: fixedClock }, makeActor(), makeCommand({ commandId: 'note-command-011' })),
  'TENANT_MISMATCH',
);

const missingStore = new InMemoryAdmissionNoteStore();
await expectCode(
  recordAdmissionNote({ store: missingStore, clock: fixedClock }, makeActor(), makeCommand({ commandId: 'note-command-012' })),
  'CASE_NOT_FOUND',
);

console.log('Admission note command smoke checks passed (16 scenarios).');
