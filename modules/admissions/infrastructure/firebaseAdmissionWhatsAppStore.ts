import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type Firestore,
} from 'firebase/firestore';
import type { CommunicationTemplate } from '../../../types';
import {
  getAdmissionWhatsAppStarterTemplates,
  toAdmissionWhatsAppTemplates,
  type AdmissionWhatsAppTemplate,
} from '../domain/admissionWhatsApp.ts';
import type { AdmissionActivity, AdmissionWhatsAppConsentState } from '../domain/admissionWorkflowTypes.ts';
import {
  AdmissionCommandError,
  type AdmissionCommandResult,
  type AdmissionWhatsAppCommandStore,
  type AdmissionWhatsAppMutation,
} from '../application/admissionCommandTypes.ts';

const toIso = (value: unknown) => {
  if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === 'string' && !Number.isNaN(new Date(value).getTime())) return new Date(value).toISOString();
  return '';
};

export interface AdmissionWhatsAppContext {
  consentState: AdmissionWhatsAppConsentState;
  templates: AdmissionWhatsAppTemplate[];
  activities: AdmissionActivity[];
  caseVersion: number;
}

export const loadAdmissionWhatsAppContext = async (
  firestore: Firestore,
  organizationId: string,
  admissionCaseId: string,
): Promise<AdmissionWhatsAppContext> => {
  const [communicationsSnapshot, stateSnapshot, activitiesSnapshot] = await Promise.all([
    getDoc(doc(firestore, 'organizations', organizationId, 'settings', 'communications')),
    getDoc(doc(firestore, 'admission_case_states', admissionCaseId)),
    getDocs(query(
      collection(firestore, 'admission_activities'),
      where('organizationId', '==', organizationId),
      where('admissionCaseId', '==', admissionCaseId),
      orderBy('occurredAt', 'desc'),
      limit(30),
    )),
  ]);

  if (stateSnapshot.exists()) {
    const state = stateSnapshot.data();
    if (state.organizationId !== organizationId || state.admissionCaseId !== admissionCaseId) {
      throw new AdmissionCommandError('TENANT_MISMATCH', 'The workflow state belongs to another Admissions case.');
    }
  }

  const storedTemplates = communicationsSnapshot.exists() && Array.isArray(communicationsSnapshot.data().templates)
    ? communicationsSnapshot.data().templates as CommunicationTemplate[]
    : [];
  const tenantTemplates = toAdmissionWhatsAppTemplates(organizationId, storedTemplates);
  const tenantTemplateIds = new Set(tenantTemplates.map(template => template.id));
  const templates = [
    ...tenantTemplates,
    ...getAdmissionWhatsAppStarterTemplates(organizationId).filter(template => !tenantTemplateIds.has(template.id)),
  ];

  const activities = activitiesSnapshot.docs.map(snapshot => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      organizationId: String(data.organizationId || ''),
      admissionCaseId: String(data.admissionCaseId || ''),
      legacyLeadId: String(data.legacyLeadId || ''),
      kind: data.kind,
      channel: data.channel,
      body: String(data.body || ''),
      outcome: data.outcome || null,
      communicationState: data.communicationState,
      consentState: data.consentState,
      templateId: data.templateId,
      occurredAt: toIso(data.occurredAt),
      actorId: String(data.actorId || ''),
      caseVersion: Number(data.caseVersion || 0),
      commandFingerprint: String(data.commandFingerprint || ''),
      createdAt: toIso(data.createdAt),
    } as AdmissionActivity;
  });

  return {
    consentState: stateSnapshot.exists() ? stateSnapshot.data().whatsappConsentState || 'unknown' : 'unknown',
    templates,
    activities,
    caseVersion: stateSnapshot.exists() ? Number(stateSnapshot.data().version || 0) : 0,
  };
};

export class FirebaseAdmissionWhatsAppStore implements AdmissionWhatsAppCommandStore {
  private readonly firestore: Firestore;
  constructor(firestore: Firestore) { this.firestore = firestore; }

  recordWhatsAppActivityAtomically(mutation: AdmissionWhatsAppMutation): Promise<AdmissionCommandResult> {
    const activityRef = doc(this.firestore, 'admission_activities', mutation.commandId);
    const stateRef = doc(this.firestore, 'admission_case_states', mutation.admissionCaseId);
    const leadRef = doc(this.firestore, 'leads', mutation.legacyLeadId);

    return runTransaction(this.firestore, async transaction => {
      const [existingActivity, lead, currentState] = await Promise.all([
        transaction.get(activityRef),
        transaction.get(leadRef),
        transaction.get(stateRef),
      ]);

      if (existingActivity.exists()) {
        const existing = existingActivity.data();
        if (existing.commandFingerprint !== mutation.commandFingerprint || existing.channel !== 'whatsapp') {
          throw new AdmissionCommandError('IDEMPOTENCY_CONFLICT', 'This command ID was already used for a different operation.');
        }
        return { activityId: existingActivity.id, caseVersion: Number(existing.caseVersion), replayed: true };
      }
      if (!lead.exists()) throw new AdmissionCommandError('CASE_NOT_FOUND', 'The linked legacy lead no longer exists.');
      if (lead.data().organizationId !== mutation.organizationId) {
        throw new AdmissionCommandError('TENANT_MISMATCH', 'The linked lead belongs to another organization.');
      }

      if (currentState.exists()) {
        const state = currentState.data();
        if (
          state.organizationId !== mutation.organizationId
          || state.admissionCaseId !== mutation.admissionCaseId
          || state.legacyLeadId !== mutation.legacyLeadId
        ) {
          throw new AdmissionCommandError('TENANT_MISMATCH', 'The workflow state does not match this Admissions case.');
        }
      }

      const currentVersion = currentState.exists() ? Number(currentState.data().version) : 0;
      if (currentVersion !== mutation.expectedVersion) {
        throw new AdmissionCommandError('STALE_VERSION', `Expected version ${mutation.expectedVersion}, found ${currentVersion}.`);
      }
      const storedConsent = currentState.exists() ? currentState.data().whatsappConsentState || 'unknown' : 'unknown';
      if (mutation.communicationState !== 'consent_updated' && mutation.consentState !== storedConsent) {
        throw new AdmissionCommandError('STALE_VERSION', 'Consent changed. Reload the case before continuing.');
      }

      const nextVersion = currentVersion + 1;
      const occurredAt = Timestamp.fromDate(new Date(mutation.occurredAt));
      transaction.set(activityRef, {
        organizationId: mutation.organizationId,
        admissionCaseId: mutation.admissionCaseId,
        legacyLeadId: mutation.legacyLeadId,
        kind: 'follow_up',
        channel: 'whatsapp',
        body: mutation.body,
        outcome: mutation.outcome,
        communicationState: mutation.communicationState,
        consentState: mutation.consentState,
        templateId: mutation.templateId,
        occurredAt,
        actorId: mutation.actorId,
        caseVersion: nextVersion,
        commandFingerprint: mutation.commandFingerprint,
        createdAt: serverTimestamp(),
      });

      if (currentState.exists()) {
        transaction.update(stateRef, {
          ...(mutation.communicationState === 'consent_updated' ? { whatsappConsentState: mutation.consentState } : {}),
          version: nextVersion,
          lastActivityAt: occurredAt,
          lastActivityKind: 'follow_up',
          lastCommandId: mutation.commandId,
          updatedAt: serverTimestamp(),
          updatedBy: mutation.actorId,
        });
      } else {
        transaction.set(stateRef, {
          whatsappConsentState: mutation.consentState,
          organizationId: mutation.organizationId,
          admissionCaseId: mutation.admissionCaseId,
          legacyLeadId: mutation.legacyLeadId,
          version: nextVersion,
          openNextActionId: null,
          lastActivityAt: occurredAt,
          lastActivityKind: 'follow_up',
          lastCommandId: mutation.commandId,
          createdAt: serverTimestamp(),
          createdBy: mutation.actorId,
          updatedAt: serverTimestamp(),
          updatedBy: mutation.actorId,
        });
      }

      return { activityId: mutation.commandId, caseVersion: nextVersion, replayed: false };
    });
  }
}
