import type {
  AdmissionActivity,
  AdmissionActivityKind,
  AdmissionActor,
  AdmissionCaseWorkflowState,
  AdmissionInteractionOutcome,
  AdmissionWhatsAppConsentState,
  AdmissionWhatsAppState,
} from '../domain/index.ts';

export type AdmissionCommandErrorCode =
  | 'INVALID_COMMAND'
  | 'FORBIDDEN'
  | 'CASE_NOT_FOUND'
  | 'TENANT_MISMATCH'
  | 'STALE_VERSION'
  | 'IDEMPOTENCY_CONFLICT';

export class AdmissionCommandError extends Error {
  public readonly code: AdmissionCommandErrorCode;

  constructor(
    code: AdmissionCommandErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AdmissionCommandError';
    this.code = code;
  }
}

export interface RecordAdmissionNoteCommand {
  commandId: string;
  organizationId: string;
  admissionCaseId: string;
  legacyLeadId: string;
  expectedVersion: number;
  body: string;
  occurredAt?: string;
}

export interface AdmissionNoteMutation {
  commandId: string;
  commandFingerprint: string;
  organizationId: string;
  admissionCaseId: string;
  legacyLeadId: string;
  expectedVersion: number;
  body: string;
  occurredAt: string;
  createdAt: string;
  actorId: string;
}

export interface RecordAdmissionWhatsAppActivityCommand {
  commandId: string;
  organizationId: string;
  admissionCaseId: string;
  legacyLeadId: string;
  expectedVersion: number;
  communicationState: AdmissionWhatsAppState;
  consentState: AdmissionWhatsAppConsentState;
  templateId: string;
  body: string;
  outcome: AdmissionInteractionOutcome | null;
  occurredAt?: string;
}

export interface AdmissionWhatsAppMutation {
  commandId: string;
  commandFingerprint: string;
  organizationId: string;
  admissionCaseId: string;
  legacyLeadId: string;
  expectedVersion: number;
  communicationState: AdmissionWhatsAppState;
  consentState: AdmissionWhatsAppConsentState;
  templateId: string;
  body: string;
  outcome: AdmissionInteractionOutcome | null;
  occurredAt: string;
  createdAt: string;
  actorId: string;
}

export interface AdmissionCommandResult {
  activityId: string;
  caseVersion: number;
  replayed: boolean;
}

export interface AdmissionNoteCommandStore {
  recordNoteAtomically(mutation: AdmissionNoteMutation): Promise<AdmissionCommandResult>;
}

export interface AdmissionWhatsAppCommandStore {
  recordWhatsAppActivityAtomically(mutation: AdmissionWhatsAppMutation): Promise<AdmissionCommandResult>;
}

export interface AdmissionCommandClock {
  now(): Date;
}

export interface AdmissionCommandDependencies {
  store: AdmissionNoteCommandStore;
  clock?: AdmissionCommandClock;
}

export interface AdmissionWhatsAppCommandDependencies {
  store: AdmissionWhatsAppCommandStore;
  clock?: AdmissionCommandClock;
}

export interface AdmissionCommandTestSnapshot {
  activities: AdmissionActivity[];
  states: AdmissionCaseWorkflowState[];
  activityKinds: AdmissionActivityKind[];
  actors: AdmissionActor[];
}
