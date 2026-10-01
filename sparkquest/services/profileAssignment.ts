import { doc, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore';
import type { ProjectTemplate } from '../types.ts';
import type { ReviewActor } from '../domain/projectReview.ts';
import { buildProfileAssignmentPatch } from '../domain/instructorLearner.ts';
import { omitUndefinedDeep } from '../domain/firestorePayload.ts';

export async function assignMissionToLearner(db: Firestore, missionId: string, studentId: string, actor: ReviewActor, source: 'student_profile' | 'user_auth' = 'student_profile') {
  if (!actor.uid || !actor.organizationId || !['admin', 'instructor'].includes(actor.role)) throw new Error('A verified instructor session is required.');
  return runTransaction(db, async transaction => {
    const ref = doc(db, 'project_templates', missionId);
    const missionSnapshot = await transaction.get(ref);
    const studentSnapshot = await transaction.get(doc(db, source === 'user_auth' ? 'users' : 'students', studentId));
    const student = studentSnapshot.data();
    if (!student || student.organizationId !== actor.organizationId || (source === 'user_auth' && student.role !== 'student') || ['inactive', 'archived', 'deleted', 'disabled'].includes(String(student.status || '').toLowerCase())) throw new Error('This learner is unavailable or inactive in your organization.');
    if (!missionSnapshot.exists()) throw new Error('This mission is no longer available.');
    const mission = { ...missionSnapshot.data(), id: missionSnapshot.id } as ProjectTemplate;
    const patch = buildProfileAssignmentPatch(mission, studentId, actor.organizationId);
    if (!Object.keys(patch).length) return mission;
    transaction.update(ref, omitUndefinedDeep({ ...patch, updatedAt: serverTimestamp(), profileAssignedAt: serverTimestamp(), profileAssignedBy: actor.uid,
      ...(!['assigned', 'featured'].includes(mission.status || '') ? { assignedAt: serverTimestamp(), assignedBy: actor.uid } : {}) }));
    return { ...mission, ...patch };
  });
}

/** Class dispatch/editor saves must not erase concurrent profile assignments. */
export async function saveMissionAudience(db: Firestore, missionId: string, data: Omit<Partial<ProjectTemplate>, 'assignedAt'> & { assignedAt?: unknown }, actor: ReviewActor) {
  if (!actor.uid || !actor.organizationId || !['admin', 'instructor'].includes(actor.role)) throw new Error('A verified instructor session is required.');
  return runTransaction(db, async transaction => {
    const ref = doc(db, 'project_templates', missionId);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists() || snapshot.data().organizationId !== actor.organizationId) throw new Error('This mission is unavailable in your organization.');
    const current = snapshot.data() as ProjectTemplate;
    const targetAudience = data.targetAudience ? { ...data.targetAudience, additionalStudents: [...new Set([...(current.targetAudience?.additionalStudents || []), ...(data.targetAudience.additionalStudents || [])])] } : undefined;
    transaction.update(ref, omitUndefinedDeep({ ...data, ...(targetAudience ? { targetAudience } : {}), organizationId: actor.organizationId, updatedAt: serverTimestamp() }));
  });
}
