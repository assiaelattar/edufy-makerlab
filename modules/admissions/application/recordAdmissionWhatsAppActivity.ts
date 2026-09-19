import type { AdmissionActor } from '../domain/admissionWorkflowTypes.ts';
import {
  ADMISSION_INTERACTION_OUTCOMES,
  ADMISSION_WHATSAPP_CONSENT_STATES,
  ADMISSION_WHATSAPP_STATES,
} from '../domain/admissionWorkflowTypes.ts';
import { validateAdmissionMessageBody } from '../domain/admissionWhatsApp.ts';
import { canRecordAdmissionWhatsAppActivity } from './admissionAuthorization.ts';
import {
  AdmissionCommandError,
  type AdmissionCommandResult,
  type AdmissionWhatsAppCommandDependencies,
  type RecordAdmissionWhatsAppActivityCommand,
} from './admissionCommandTypes.ts';
import {
  admissionCommandFingerprint,
  normalizeAdmissionCommandBody,
  requireAdmissionDocumentId,
  resolveAdmissionOccurredAt,
} from './admissionCommandValidation.ts';

const MESSAGE_STATES = new Set([
  'prepared',
  'launched',
  'operator_confirmed_sent',
  'operator_confirmed_not_sent',
]);
const CONSENT_REQUIRED_STATES = new Set(['launched', 'operator_confirmed_sent']);

export const recordAdmissionWhatsAppActivity = async (
  dependencies: AdmissionWhatsAppCommandDependencies,
  actor: AdmissionActor,
  command: RecordAdmissionWhatsAppActivityCommand,
): Promise<AdmissionCommandResult> => {
  requireAdmissionDocumentId(command.commandId, 'Command ID');
  requireAdmissionDocumentId(command.admissionCaseId, 'Admission case ID');
  requireAdmissionDocumentId(command.legacyLeadId, 'Legacy lead ID');
  if (!command.organizationId.trim()) throw new AdmissionCommandError('INVALID_COMMAND', 'Organization ID is required.');
  if (!Number.isInteger(command.expectedVersion) || command.expectedVersion < 0) {
    throw new AdmissionCommandError('INVALID_COMMAND', 'Expected version must be a non-negative integer.');
  }
  if (!ADMISSION_WHATSAPP_STATES.includes(command.communicationState)) {
    throw new AdmissionCommandError('INVALID_COMMAND', 'The WhatsApp activity state is invalid.');
  }
  if (!ADMISSION_WHATSAPP_CONSENT_STATES.includes(command.consentState)) {
    throw new AdmissionCommandError('INVALID_COMMAND', 'The WhatsApp consent state is invalid.');
  }

  const templateId = String(command.templateId || '').trim();
  if (!templateId || templateId.length > 128 || /[\u0000-\u001f]/.test(templateId)) {
    throw new AdmissionCommandError('INVALID_COMMAND', 'Template ID must contain between 1 and 128 safe characters.');
  }
  const body = normalizeAdmissionCommandBody(command.body, 'The WhatsApp activity');
  if (MESSAGE_STATES.has(command.communicationState) && !validateAdmissionMessageBody(body).ready) {
    throw new AdmissionCommandError('INVALID_COMMAND', 'Resolve every message variable before recording this WhatsApp activity.');
  }

  const isResponse = command.communicationState === 'parent_response_recorded';
  if (isResponse !== Boolean(command.outcome)) {
    throw new AdmissionCommandError('INVALID_COMMAND', 'A parent response requires exactly one structured outcome.');
  }
  if (command.outcome && !ADMISSION_INTERACTION_OUTCOMES.includes(command.outcome)) {
    throw new AdmissionCommandError('INVALID_COMMAND', 'The interaction outcome is invalid.');
  }
  if (command.communicationState === 'prepared' && command.consentState === 'opted_out') {
    throw new AdmissionCommandError('INVALID_COMMAND', 'Do not prepare an outbound message for an opted-out family.');
  }
  if (CONSENT_REQUIRED_STATES.has(command.communicationState) && command.consentState !== 'granted') {
    throw new AdmissionCommandError('INVALID_COMMAND', 'Confirmed consent is required before launching or marking a WhatsApp message sent.');
  }
  if (!canRecordAdmissionWhatsAppActivity(actor, command.organizationId)) {
    throw new AdmissionCommandError('FORBIDDEN', 'This user cannot record WhatsApp activity in Admissions.');
  }

  const { now, occurredAt } = resolveAdmissionOccurredAt(dependencies.clock, command.occurredAt);
  const commandFingerprint = admissionCommandFingerprint([
    'record_whatsapp_activity',
    command.organizationId,
    command.admissionCaseId,
    command.legacyLeadId,
    command.expectedVersion,
    actor.id,
    command.communicationState,
    command.consentState,
    templateId,
    command.outcome || '',
    command.occurredAt || '',
    body,
  ].join('\u001f'));

  return dependencies.store.recordWhatsAppActivityAtomically({
    commandId: command.commandId,
    commandFingerprint,
    organizationId: command.organizationId,
    admissionCaseId: command.admissionCaseId,
    legacyLeadId: command.legacyLeadId,
    expectedVersion: command.expectedVersion,
    communicationState: command.communicationState,
    consentState: command.consentState,
    templateId,
    body,
    outcome: command.outcome,
    occurredAt,
    createdAt: now.toISOString(),
    actorId: actor.id,
  });
};
