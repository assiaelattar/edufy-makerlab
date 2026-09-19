import assert from 'node:assert/strict';
import { deleteApp as deleteAdminApp, initializeApp as initializeAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { deleteApp, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getFirestore,
  setDoc,
  serverTimestamp,
  writeBatch,
  terminate,
  updateDoc,
} from 'firebase/firestore';
import type { AdmissionActor } from '../domain/index.ts';
import { recordAdmissionNote } from '../application/recordAdmissionNote.ts';
import { recordAdmissionWhatsAppActivity } from '../application/recordAdmissionWhatsAppActivity.ts';
import { FirebaseAdmissionNoteStore } from './firebaseAdmissionNoteStore.ts';
import { FirebaseAdmissionWhatsAppStore, loadAdmissionWhatsAppContext } from './firebaseAdmissionWhatsAppStore.ts';

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  throw new Error('Start the Firestore and Auth emulators before running this test.');
}

const projectId = process.env.GCLOUD_PROJECT || 'demo-edufy-admissions';
const password = 'Admissions-test-2026!';
const adminApp = initializeAdminApp({ projectId }, `admissions-admin-${Date.now()}`);
const adminAuth = getAdminAuth(adminApp);
const adminDb = getAdminFirestore(adminApp);

const identities = [
  { id: 'admissions-user', email: 'admissions@example.test', role: 'admission_officer', organizationId: 'org-1' },
  { id: 'instructor-user', email: 'instructor@example.test', role: 'instructor', organizationId: 'org-1' },
  { id: 'other-admissions-user', email: 'other-admissions@example.test', role: 'admission_officer', organizationId: 'org-2' },
] as const;

for (const identity of identities) {
  await adminAuth.createUser({ uid: identity.id, email: identity.email, password });
  await adminDb.doc(`users/${identity.id}`).set({
    uid: identity.id,
    email: identity.email,
    role: identity.role,
    organizationId: identity.organizationId,
    status: 'active',
  });
}
await adminDb.doc('leads/lead-1').set({ organizationId: 'org-1', name: 'Learner One', status: 'new' });

const clientApps: ReturnType<typeof initializeApp>[] = [];
const client = async (identity: typeof identities[number]) => {
  const app = initializeApp({ apiKey: 'fake-api-key', projectId }, `${identity.id}-${Date.now()}-${Math.random()}`);
  clientApps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
  await signInWithEmailAndPassword(auth, identity.email, password);
  const firestore = getFirestore(app);
  const [host, portText] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
  connectFirestoreEmulator(firestore, host, Number(portText));
  return firestore;
};

const actor = (identity: typeof identities[number]): AdmissionActor => ({
  id: identity.id,
  organizationId: identity.organizationId,
  role: identity.role,
  status: 'active',
  permissions: identity.role === 'admission_officer' ? ['admissions.view', 'admissions.note', 'admissions.whatsapp'] : ['students.view_basic'],
});
const expectDenied = (promise: Promise<unknown>) => assert.rejects(
  promise,
  error => typeof error === 'object' && error !== null && 'code' in error && String(error.code).includes('permission-denied'),
);

const admissionsDb = await client(identities[0]);
const command = {
  commandId: 'note-emulator-001',
  organizationId: 'org-1',
  admissionCaseId: 'lead-1',
  legacyLeadId: 'lead-1',
  expectedVersion: 0,
  body: 'Parent asked for planning options.',
  occurredAt: '2026-09-08T11:55:00.000Z',
};
const result = await recordAdmissionNote(
  { store: new FirebaseAdmissionNoteStore(admissionsDb), clock: { now: () => new Date('2026-09-08T12:00:00.000Z') } },
  actor(identities[0]),
  command,
);
assert.deepEqual(result, { activityId: 'note-emulator-001', caseVersion: 1, replayed: false });

const replay = await recordAdmissionNote(
  { store: new FirebaseAdmissionNoteStore(admissionsDb), clock: { now: () => new Date('2026-09-08T12:00:01.000Z') } },
  actor(identities[0]),
  command,
);
assert.equal(replay.replayed, true);

const whatsAppStore = new FirebaseAdmissionWhatsAppStore(admissionsDb);
const consentResult = await recordAdmissionWhatsAppActivity(
  { store: whatsAppStore, clock: { now: () => new Date('2026-09-08T12:01:00.000Z') } },
  actor(identities[0]),
  {
    commandId: 'wa-emulator-consent', organizationId: 'org-1', admissionCaseId: 'lead-1', legacyLeadId: 'lead-1', expectedVersion: 1,
    communicationState: 'consent_updated', consentState: 'granted', templateId: 'consent', body: 'WhatsApp consent granted by the parent.', outcome: null,
  },
);
assert.equal(consentResult.caseVersion, 2);
const launchResult = await recordAdmissionWhatsAppActivity(
  { store: whatsAppStore, clock: { now: () => new Date('2026-09-08T12:02:00.000Z') } },
  actor(identities[0]),
  {
    commandId: 'wa-emulator-launch', organizationId: 'org-1', admissionCaseId: 'lead-1', legacyLeadId: 'lead-1', expectedVersion: 2,
    communicationState: 'launched', consentState: 'granted', templateId: 'planning', body: 'Bonjour, voici le planning.', outcome: null,
  },
);
assert.equal(launchResult.caseVersion, 3);

// Bypass the application boundary deliberately: a valid-looking atomic client write
// must still be denied when it forges consent, delivery, actor, or reciprocal state.
const forgeWhatsApp = async (activityId: string, activityOverrides: Record<string, unknown>, stateOverrides: Record<string, unknown> = {}) => {
  const source = (await adminDb.doc('admission_activities/wa-emulator-launch').get()).data()!;
  const current = (await adminDb.doc('admission_case_states/lead-1').get()).data()!;
  const batch = writeBatch(admissionsDb);
  const occurredAt = new Date();
  batch.set(doc(admissionsDb, 'admission_activities', activityId), {
    ...source, occurredAt, createdAt: serverTimestamp(), caseVersion: current.version + 1, ...activityOverrides,
  });
  batch.update(doc(admissionsDb, 'admission_case_states', 'lead-1'), {
    version: current.version + 1, lastActivityAt: occurredAt, lastActivityKind: 'follow_up', lastCommandId: activityId,
    updatedAt: serverTimestamp(), updatedBy: identities[0].id, ...stateOverrides,
  });
  return batch.commit();
};
await forgeWhatsApp('raw-valid-launch', {});
assert.equal((await adminDb.doc('admission_case_states/lead-1').get()).data()?.version, 4);
for (const communicationState of ['prepared', 'operator_confirmed_sent', 'operator_confirmed_not_sent', 'parent_response_recorded'] as const) {
  const version = (await adminDb.doc('admission_case_states/lead-1').get()).data()!.version;
  await recordAdmissionWhatsAppActivity({ store: whatsAppStore }, actor(identities[0]), {
    commandId: `wa-valid-${communicationState}`, organizationId: 'org-1', admissionCaseId: 'lead-1', legacyLeadId: 'lead-1', expectedVersion: version,
    communicationState, consentState: 'granted', templateId: 'planning', body: 'A valid operator activity.',
    outcome: communicationState === 'parent_response_recorded' ? 'interested' : null,
  });
}
await expectDenied(forgeWhatsApp('forged-delivery', { deliveredAt: new Date() }));
await expectDenied(forgeWhatsApp('forged-actor', { actorId: identities[1].id }));
await expectDenied(forgeWhatsApp('forged-consent-snapshot', {}, { whatsappConsentState: 'opted_out' }));
await recordAdmissionWhatsAppActivity({ store: whatsAppStore }, actor(identities[0]), {
  commandId: 'wa-emulator-opt-out', organizationId: 'org-1', admissionCaseId: 'lead-1', legacyLeadId: 'lead-1', expectedVersion: 8,
  communicationState: 'consent_updated', consentState: 'opted_out', templateId: 'consent', body: 'Parent opted out.', outcome: null,
});
await expectDenied(forgeWhatsApp('forged-granted-after-optout', { consentState: 'granted' }));
await expectDenied(forgeWhatsApp('prepared-after-optout', { communicationState: 'prepared', consentState: 'opted_out' }));
// Recent history must never be the authority for persisted consent.
for (let index = 0; index < 31; index++) {
  await adminDb.doc(`admission_activities/history-${index}`).set({
    organizationId: 'org-1', admissionCaseId: 'lead-1', legacyLeadId: 'lead-1', channel: 'internal', kind: 'note',
    body: 'Later note', occurredAt: new Date(Date.now() + index),
  });
}
const loadedContext = await loadAdmissionWhatsAppContext(admissionsDb, 'org-1', 'lead-1');
assert.equal(loadedContext.activities.length, 30);
assert.equal(loadedContext.consentState, 'opted_out');

await expectDenied(updateDoc(doc(admissionsDb, 'admission_activities', 'note-emulator-001'), { body: 'Edited later' }));
await expectDenied(deleteDoc(doc(admissionsDb, 'admission_case_states', 'lead-1')));
await expectDenied(setDoc(doc(admissionsDb, 'admission_tasks', 'task-1'), {
  organizationId: 'org-1', admissionCaseId: 'lead-1', status: 'open', dueAt: new Date(),
}));

const instructorDb = await client(identities[1]);
await expectDenied(setDoc(doc(instructorDb, 'admission_activities', 'malicious-note'), {
  organizationId: 'org-1', admissionCaseId: 'lead-1', legacyLeadId: 'lead-1', kind: 'note',
  channel: 'internal', body: 'Unauthorized', outcome: null, occurredAt: new Date(), actorId: identities[1].id,
  caseVersion: 2, commandFingerprint: '0123456789abcdef', createdAt: new Date(),
}));
await expectDenied(setDoc(doc(instructorDb, 'admission_activities', 'malicious-whatsapp'), {
  organizationId: 'org-1', admissionCaseId: 'lead-1', legacyLeadId: 'lead-1', kind: 'follow_up', channel: 'whatsapp',
  body: 'Unauthorized', outcome: null, communicationState: 'launched', consentState: 'granted', templateId: 'planning',
  occurredAt: new Date(), actorId: identities[1].id, caseVersion: 4, commandFingerprint: '0123456789abcdef', createdAt: new Date(),
}));

const otherDb = await client(identities[2]);
await expectDenied(recordAdmissionNote(
  { store: new FirebaseAdmissionNoteStore(otherDb) },
  actor(identities[2]),
  {
    commandId: 'cross-tenant-note',
    organizationId: 'org-2',
    admissionCaseId: 'lead-1',
    legacyLeadId: 'lead-1',
    expectedVersion: 0,
    body: 'Must not cross tenants.',
  },
));

await adminDb.doc('users/admissions-user').update({ status: 'disabled' });
await expectDenied(recordAdmissionWhatsAppActivity({ store: whatsAppStore }, actor(identities[0]), {
  commandId: 'disabled-operator', organizationId: 'org-1', admissionCaseId: 'lead-1', legacyLeadId: 'lead-1', expectedVersion: 4,
  communicationState: 'consent_updated', consentState: 'granted', templateId: 'consent', body: 'Must be denied.', outcome: null,
}));

for (const app of clientApps) {
  await terminate(getFirestore(app));
  await deleteApp(app);
}
await deleteAdminApp(adminApp);
console.log('Admissions Firestore emulator checks passed: notes/replay, WhatsApp consent/launch, immutable audit, tenant/role/disabled-account denial, forged actor/delivery/consent denial, opt-out enforcement, and consent beyond the latest 30 activities.');
