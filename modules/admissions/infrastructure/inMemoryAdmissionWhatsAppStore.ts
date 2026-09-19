import type { AdmissionActivity, AdmissionCaseWorkflowState } from '../domain/index.ts';
import { AdmissionCommandError } from '../application/admissionCommandTypes.ts';
import type {
  AdmissionCommandResult,
  AdmissionWhatsAppCommandStore,
  AdmissionWhatsAppMutation,
} from '../application/admissionCommandTypes.ts';

export class InMemoryAdmissionWhatsAppStore implements AdmissionWhatsAppCommandStore {
  private readonly leadOrganizations = new Map<string, string>();
  private readonly activities = new Map<string, AdmissionActivity>();
  private readonly states = new Map<string, AdmissionCaseWorkflowState>();

  seedLead(legacyLeadId: string, organizationId: string) {
    this.leadOrganizations.set(legacyLeadId, organizationId);
  }

  getActivity(activityId: string) {
    const activity = this.activities.get(activityId);
    return activity ? { ...activity } : null;
  }

  getState(admissionCaseId: string) {
    const state = this.states.get(admissionCaseId);
    return state ? { ...state } : null;
  }

  async recordWhatsAppActivityAtomically(mutation: AdmissionWhatsAppMutation): Promise<AdmissionCommandResult> {
    const existing = this.activities.get(mutation.commandId);
    if (existing) {
      if (existing.commandFingerprint !== mutation.commandFingerprint || existing.channel !== 'whatsapp') {
        throw new AdmissionCommandError('IDEMPOTENCY_CONFLICT', 'This command ID was already used for a different operation.');
      }
      return { activityId: existing.id, caseVersion: existing.caseVersion, replayed: true };
    }

    const leadOrganization = this.leadOrganizations.get(mutation.legacyLeadId);
    if (!leadOrganization) throw new AdmissionCommandError('CASE_NOT_FOUND', 'The linked legacy lead no longer exists.');
    if (leadOrganization !== mutation.organizationId) {
      throw new AdmissionCommandError('TENANT_MISMATCH', 'The linked lead belongs to another organization.');
    }

    const current = this.states.get(mutation.admissionCaseId);
    if (current && (
      current.organizationId !== mutation.organizationId
      || current.legacyLeadId !== mutation.legacyLeadId
      || current.admissionCaseId !== mutation.admissionCaseId
    )) {
      throw new AdmissionCommandError('TENANT_MISMATCH', 'The workflow state does not match this Admissions case.');
    }

    const currentVersion = current?.version || 0;
    if (currentVersion !== mutation.expectedVersion) {
      throw new AdmissionCommandError('STALE_VERSION', `Expected version ${mutation.expectedVersion}, found ${currentVersion}.`);
    }
    const storedConsent = current?.whatsappConsentState || 'unknown';
    if (mutation.communicationState !== 'consent_updated' && mutation.consentState !== storedConsent) {
      throw new AdmissionCommandError('STALE_VERSION', 'Consent changed. Reload the case before continuing.');
    }

    const nextVersion = currentVersion + 1;
    const activity: AdmissionActivity = {
      id: mutation.commandId,
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
      occurredAt: mutation.occurredAt,
      actorId: mutation.actorId,
      caseVersion: nextVersion,
      commandFingerprint: mutation.commandFingerprint,
      createdAt: mutation.createdAt,
    };
    const nextState: AdmissionCaseWorkflowState = {
      whatsappConsentState: mutation.communicationState === 'consent_updated' ? mutation.consentState : storedConsent,
      organizationId: mutation.organizationId,
      admissionCaseId: mutation.admissionCaseId,
      legacyLeadId: mutation.legacyLeadId,
      version: nextVersion,
      openNextActionId: current?.openNextActionId || null,
      lastActivityAt: mutation.occurredAt,
      lastActivityKind: 'follow_up',
      lastCommandId: mutation.commandId,
      createdAt: current?.createdAt || mutation.createdAt,
      createdBy: current?.createdBy || mutation.actorId,
      updatedAt: mutation.createdAt,
      updatedBy: mutation.actorId,
    };
    this.activities.set(activity.id, activity);
    this.states.set(nextState.admissionCaseId, nextState);
    return { activityId: activity.id, caseVersion: nextVersion, replayed: false };
  }
}
