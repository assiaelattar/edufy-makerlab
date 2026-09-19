export const ADMISSION_ACTIVITY_KINDS = ['note', 'call', 'follow_up'] as const;
export type AdmissionActivityKind = typeof ADMISSION_ACTIVITY_KINDS[number];

export const ADMISSION_ACTIVITY_CHANNELS = ['internal', 'phone', 'whatsapp'] as const;
export type AdmissionActivityChannel = typeof ADMISSION_ACTIVITY_CHANNELS[number];

export const ADMISSION_WHATSAPP_STATES = [
  'consent_updated',
  'prepared',
  'launched',
  'operator_confirmed_sent',
  'operator_confirmed_not_sent',
  'parent_response_recorded',
] as const;
export type AdmissionWhatsAppState = typeof ADMISSION_WHATSAPP_STATES[number];

export const ADMISSION_WHATSAPP_CONSENT_STATES = ['unknown', 'granted', 'opted_out'] as const;
export type AdmissionWhatsAppConsentState = typeof ADMISSION_WHATSAPP_CONSENT_STATES[number];

export const ADMISSION_INTERACTION_OUTCOMES = [
  'connected',
  'no_answer',
  'asked_to_follow_up',
  'interested',
  'not_interested',
  'wrong_contact',
] as const;
export type AdmissionInteractionOutcome = typeof ADMISSION_INTERACTION_OUTCOMES[number];

export const ADMISSION_TASK_STATUSES = ['open', 'completed', 'cancelled'] as const;
export type AdmissionTaskStatus = typeof ADMISSION_TASK_STATUSES[number];

export const ADMISSION_DORMANCY_REASONS = [
  'awaiting_family',
  'family_requested_pause',
  'seasonal_timing',
  'unable_to_reach',
] as const;
export type AdmissionDormancyReason = typeof ADMISSION_DORMANCY_REASONS[number];

export const ADMISSION_LOSS_REASONS = [
  'price',
  'schedule',
  'location',
  'program_fit',
  'chose_alternative',
  'no_longer_interested',
  'invalid_contact',
  'other',
] as const;
export type AdmissionLossReason = typeof ADMISSION_LOSS_REASONS[number];

export interface AdmissionActor {
  id: string;
  organizationId: string;
  role: string;
  status: 'active' | 'inactive';
  permissions: string[];
}

export interface AdmissionActivity {
  id: string;
  organizationId: string;
  admissionCaseId: string;
  legacyLeadId: string;
  kind: AdmissionActivityKind;
  channel: AdmissionActivityChannel;
  body: string;
  outcome: AdmissionInteractionOutcome | null;
  communicationState?: AdmissionWhatsAppState;
  consentState?: AdmissionWhatsAppConsentState;
  templateId?: string;
  occurredAt: string;
  actorId: string;
  caseVersion: number;
  commandFingerprint: string;
  createdAt: string;
}

export interface AdmissionNextActionTask {
  id: string;
  organizationId: string;
  admissionCaseId: string;
  kind: string;
  label: string;
  status: AdmissionTaskStatus;
  ownerId: string;
  dueAt: string | null;
  outcome: AdmissionInteractionOutcome | null;
  completedAt: string | null;
  completedBy: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  dormancyReason: AdmissionDormancyReason | null;
  lossReason: AdmissionLossReason | null;
  version: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface AdmissionCaseWorkflowState {
  whatsappConsentState?: AdmissionWhatsAppConsentState;
  organizationId: string;
  admissionCaseId: string;
  legacyLeadId: string;
  version: number;
  openNextActionId: string | null;
  lastActivityAt: string;
  lastActivityKind: AdmissionActivityKind;
  lastCommandId: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface AdmissionAuditEvent {
  id: string;
  organizationId: string;
  admissionCaseId: string;
  commandId: string;
  actorId: string;
  action: 'note_recorded' | 'whatsapp_activity_recorded' | 'task_created' | 'task_completed' | 'task_cancelled';
  fromVersion: number;
  toVersion: number;
  occurredAt: string;
}
