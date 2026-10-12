import { collection, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, where, type Firestore } from 'firebase/firestore';
import type { ProjectTemplate } from '../types';
import type { ReviewActor } from '../domain/projectReview';
import { isSparkQuestStaffRole } from '../domain/staffRoles';

export type MissionRemovalPlan = { canDelete: boolean; hasLearnerWork: boolean; reason: string };

const requireInstructor = (actor: ReviewActor) => {
  if (!actor.uid || !actor.organizationId || !isSparkQuestStaffRole(actor.role)) {
    throw new Error('A verified instructor session is required.');
  }
};

const hasAudience = (mission: ProjectTemplate) => Object.values(mission.targetAudience || {}).some(value => Array.isArray(value) && value.length > 0);

export async function inspectMissionRemoval(db: Firestore, missionId: string, actor: ReviewActor): Promise<MissionRemovalPlan> {
  requireInstructor(actor);
  const snapshot = await getDoc(doc(db, 'project_templates', missionId));
  if (!snapshot.exists() || snapshot.data().organizationId !== actor.organizationId) throw new Error('This mission is unavailable in your organization.');
  const mission = snapshot.data() as ProjectTemplate;
  // Query within the tenant so the result is authorized by the student-project rules.
  // Any failed read fails closed: it must never be interpreted as zero projects.
  const linked = await getDocs(query(collection(db, 'student_projects'), where('organizationId', '==', actor.organizationId)));
  const hasLearnerWork = linked.docs.some(project => project.data().templateId === missionId);
  const canDelete = mission.status === 'draft' && !mission.assignedAt && !hasAudience(mission) && !hasLearnerWork &&
    !mission.resources?.length && !Object.values(mission.stepResources || {}).some(items => items.length > 0);
  return {
    canDelete,
    hasLearnerWork,
    reason: hasLearnerWork ? 'Learner projects or review history are linked to this mission.' :
      canDelete ? 'This unused draft has no audience, learner projects, or published resources.' :
      'This mission has been assigned or contains reusable learning material.',
  };
}

export async function retireMission(db: Firestore, missionId: string, actor: ReviewActor) {
  requireInstructor(actor);
  await runTransaction(db, async transaction => {
    const ref = doc(db, 'project_templates', missionId);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists() || snapshot.data().organizationId !== actor.organizationId) throw new Error('This mission is unavailable in your organization.');
    if (snapshot.data().status === 'archived') return;
    transaction.update(ref, { status: 'archived', retiredAt: serverTimestamp(), retiredBy: actor.uid, updatedAt: serverTimestamp() });
  });
}

export async function deleteUnusedMission(db: Firestore, missionId: string, actor: ReviewActor) {
  const plan = await inspectMissionRemoval(db, missionId, actor);
  if (!plan.canDelete) throw new Error(`This mission must be retired instead. ${plan.reason}`);
  // Recheck the template in a transaction. A draft with no audience cannot be
  // started through the normal learner flow; the query above checks existing work.
  await runTransaction(db, async transaction => {
    const ref = doc(db, 'project_templates', missionId);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists() || snapshot.data().organizationId !== actor.organizationId) throw new Error('This mission is unavailable in your organization.');
    const mission = snapshot.data() as ProjectTemplate;
    if (mission.status !== 'draft' || mission.assignedAt || hasAudience(mission) || mission.resources?.length ||
      Object.values(mission.stepResources || {}).some(items => items.length > 0)) throw new Error('This mission changed. Reopen removal to review it.');
    transaction.delete(ref);
  });
}
