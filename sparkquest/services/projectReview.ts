import { doc, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore';
import type { StudentProject } from '../types.ts';
import { buildReviewPatch, learnerSaveFingerprint, type ReviewActor, type ReviewCommand } from '../domain/projectReview.ts';
import { omitUndefinedDeep } from '../domain/firestorePayload.ts';

export async function submitInstructorReview(db: Firestore, projectId: string, command: ReviewCommand, actor: ReviewActor) {
  const ref = doc(db, 'student_projects', projectId);
  const reviewedAt = new Date().toISOString();
  return runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('This project was removed or is unavailable.');
    const project = { ...snapshot.data(), id: snapshot.id } as StudentProject;
    const patch = buildReviewPatch(project, command, actor, reviewedAt);
    if (!Object.keys(patch).length) return project;
    transaction.update(ref, omitUndefinedDeep({ ...patch, updatedAt: serverTimestamp(), ...(command.outcome === 'published' ? { publishedAt: serverTimestamp() } : {}) }));
    return { ...project, ...patch };
  });
}

/** Compare-and-save prevents an old student tab from erasing instructor decisions. */
export async function saveLearnerProject(db: Firestore, base: StudentProject, next: StudentProject, actor: ReviewActor) {
  if (!actor.uid || !actor.organizationId || actor.role !== 'student') throw new Error('A verified learner session is required.');
  const ref = doc(db, 'student_projects', base.id);
  return runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('This project no longer exists. Return to your workbench.');
    const stored = { ...snapshot.data(), id: snapshot.id } as StudentProject;
    if ((stored.organizationId && stored.organizationId !== actor.organizationId) || ![actor.studentId, actor.uid].filter(Boolean).includes(stored.studentId)) throw new Error('Your learner account cannot save this project.');
    if (learnerSaveFingerprint(stored) !== learnerSaveFingerprint(base)) throw new Error('Your project received an update. Reopen the latest step before saving; your proof has not replaced it.');
    if (stored.status === 'published') throw new Error('This mission is published. Return to your workbench to view it.');
    const updated: StudentProject = { ...next, id: base.id, organizationId: actor.organizationId, studentId: stored.studentId };
    // Review truth comes from the stored record, never the student's snapshot.
    for (const key of ['reviewHistory', 'reviewedAt', 'reviewedById', 'reviewedByName', 'feedback', 'xpReward', 'publishedAt', 'reviewProtocolVersion', 'stepReviews'] as const) {
      delete (updated as any)[key];
      if ((stored as any)[key] !== undefined) (updated as any)[key] = (stored as any)[key];
    }
    // Allow the first legacy snapshot capture, but never replace a saved roadmap.
    if (stored.workflowSnapshot) updated.workflowSnapshot = stored.workflowSnapshot;
    if (updated.status === 'submitted' && stored.status !== 'submitted') updated.submittedAt = new Date().toISOString();
    transaction.update(ref, omitUndefinedDeep({ ...updated, updatedAt: serverTimestamp() }));
    return updated;
  });
}

/** An already-open instructor editor must not undo a newer proof or decision. */
export async function saveInstructorProjectEdits(db: Firestore, base: StudentProject, edits: Partial<StudentProject>, actor: ReviewActor) {
  if (!actor.uid || !actor.organizationId || !['instructor', 'admin'].includes(actor.role)) throw new Error('A verified instructor session is required.');
  return runTransaction(db, async transaction => {
    const ref = doc(db, 'student_projects', base.id);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('This project is unavailable.');
    const stored = { ...snapshot.data(), id: snapshot.id } as StudentProject;
    if (stored.organizationId !== actor.organizationId) throw new Error('Your instructor account cannot edit this project.');
    if (learnerSaveFingerprint(stored) !== learnerSaveFingerprint(base)) throw new Error('This project changed. Close the editor and reopen the latest progress before saving.');
    const safeEdits = { ...edits };
    for (const key of ['id', 'studentId', 'organizationId', 'reviewHistory', 'reviewedAt', 'reviewedById', 'reviewedByName', 'feedback', 'xpReward', 'publishedAt', 'reviewProtocolVersion', 'stepReviews', 'steps', 'workflowSnapshot'] as const) delete (safeEdits as any)[key];
    transaction.update(ref, omitUndefinedDeep({ ...safeEdits, updatedAt: serverTimestamp() }));
  });
}
