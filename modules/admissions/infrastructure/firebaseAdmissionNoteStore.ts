import {
  Timestamp,
  doc,
  runTransaction,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import {
  AdmissionCommandError,
  type AdmissionCommandResult,
  type AdmissionNoteCommandStore,
  type AdmissionNoteMutation,
} from '../application/admissionCommandTypes.ts';

export class FirebaseAdmissionNoteStore implements AdmissionNoteCommandStore {
  private readonly firestore: Firestore;

  constructor(firestore: Firestore) {
    this.firestore = firestore;
  }

  recordNoteAtomically(mutation: AdmissionNoteMutation): Promise<AdmissionCommandResult> {
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
        if (existing.commandFingerprint !== mutation.commandFingerprint || existing.kind !== 'note') {
          throw new AdmissionCommandError('IDEMPOTENCY_CONFLICT', 'This command ID was already used for a different operation.');
        }
        return {
          activityId: existingActivity.id,
          caseVersion: Number(existing.caseVersion),
          replayed: true,
        };
      }

      if (!lead.exists()) throw new AdmissionCommandError('CASE_NOT_FOUND', 'The linked legacy lead no longer exists.');
      if (lead.data().organizationId !== mutation.organizationId) {
        throw new AdmissionCommandError('TENANT_MISMATCH', 'The linked lead belongs to another organization.');
      }

      const state = currentState.data();
      if (currentState.exists() && (
        state.organizationId !== mutation.organizationId
        || state.admissionCaseId !== mutation.admissionCaseId
        || state.legacyLeadId !== mutation.legacyLeadId
      )) {
        throw new AdmissionCommandError('TENANT_MISMATCH', 'The workflow state does not match this admissions case.');
      }

      const currentVersion = currentState.exists() ? Number(state.version) : 0;
      if (currentVersion !== mutation.expectedVersion) {
        throw new AdmissionCommandError('STALE_VERSION', `Expected version ${mutation.expectedVersion}, found ${currentVersion}.`);
      }

      const nextVersion = currentVersion + 1;
      const occurredAt = Timestamp.fromDate(new Date(mutation.occurredAt));
      transaction.set(activityRef, {
        organizationId: mutation.organizationId,
        admissionCaseId: mutation.admissionCaseId,
        legacyLeadId: mutation.legacyLeadId,
        kind: 'note',
        channel: 'internal',
        body: mutation.body,
        outcome: null,
        occurredAt,
        actorId: mutation.actorId,
        caseVersion: nextVersion,
        commandFingerprint: mutation.commandFingerprint,
        createdAt: serverTimestamp(),
      });

      if (currentState.exists()) {
        transaction.update(stateRef, {
          version: nextVersion,
          lastActivityAt: occurredAt,
          lastActivityKind: 'note',
          lastCommandId: mutation.commandId,
          updatedAt: serverTimestamp(),
          updatedBy: mutation.actorId,
        });
      } else {
        transaction.set(stateRef, {
          organizationId: mutation.organizationId,
          admissionCaseId: mutation.admissionCaseId,
          legacyLeadId: mutation.legacyLeadId,
          version: nextVersion,
          openNextActionId: null,
          lastActivityAt: occurredAt,
          lastActivityKind: 'note',
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
