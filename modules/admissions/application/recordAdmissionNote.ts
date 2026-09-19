import type { AdmissionActor } from '../domain/index.ts';
import { canRecordAdmissionNote } from './admissionAuthorization.ts';
import {
  AdmissionCommandError,
  type AdmissionCommandDependencies,
  type AdmissionCommandResult,
  type RecordAdmissionNoteCommand,
} from './admissionCommandTypes.ts';
import {
  admissionCommandFingerprint,
  normalizeAdmissionCommandBody,
  requireAdmissionDocumentId,
  resolveAdmissionOccurredAt,
} from './admissionCommandValidation.ts';

export const recordAdmissionNote = async (
  dependencies: AdmissionCommandDependencies,
  actor: AdmissionActor,
  command: RecordAdmissionNoteCommand,
): Promise<AdmissionCommandResult> => {
  requireAdmissionDocumentId(command.commandId, 'Command ID');
  requireAdmissionDocumentId(command.admissionCaseId, 'Admission case ID');
  requireAdmissionDocumentId(command.legacyLeadId, 'Legacy lead ID');

  if (!command.organizationId.trim()) {
    throw new AdmissionCommandError('INVALID_COMMAND', 'Organization ID is required.');
  }
  if (!Number.isInteger(command.expectedVersion) || command.expectedVersion < 0) {
    throw new AdmissionCommandError('INVALID_COMMAND', 'Expected version must be a non-negative integer.');
  }

  const body = normalizeAdmissionCommandBody(command.body, 'A note');
  if (!canRecordAdmissionNote(actor, command.organizationId)) {
    throw new AdmissionCommandError('FORBIDDEN', 'This user cannot add notes to this admissions workspace.');
  }

  const { now, occurredAt } = resolveAdmissionOccurredAt(dependencies.clock, command.occurredAt);

  const commandFingerprint = admissionCommandFingerprint([
    'record_note',
    command.organizationId,
    command.admissionCaseId,
    command.legacyLeadId,
    command.expectedVersion,
    actor.id,
    command.occurredAt || '',
    body,
  ].join('\u001f'));

  return dependencies.store.recordNoteAtomically({
    commandId: command.commandId,
    commandFingerprint,
    organizationId: command.organizationId,
    admissionCaseId: command.admissionCaseId,
    legacyLeadId: command.legacyLeadId,
    expectedVersion: command.expectedVersion,
    body,
    occurredAt,
    createdAt: now.toISOString(),
    actorId: actor.id,
  });
};
