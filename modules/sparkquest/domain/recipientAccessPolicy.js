import { isSparkQuestEnabled, SparkQuestLaunchError } from './sparkquestLaunchPolicy.js';

export const RECIPIENT_LAUNCH_TTL_MS = 5 * 60_000;

const permittedStaffRoles = new Set(['super_admin', 'owner', 'admin']);

export const assertRecipientIssuer = ({ actor, organization, organizationId, student }) => {
  if (!actor || actor.status !== 'active' || !permittedStaffRoles.has(actor.role) ||
      (actor.organizationId !== organizationId && !(actor.role === 'super_admin' && actor.organizationId === 'atlas-platform'))) {
    throw new SparkQuestLaunchError('RECIPIENT_ISSUER_DENIED', 'Staff access to this workspace is required.');
  }
  if (!organization || organization.id !== organizationId || !['active', 'trial'].includes(organization.status) ||
      !isSparkQuestEnabled(organization)) {
    throw new SparkQuestLaunchError('RECIPIENT_WORKSPACE_UNAVAILABLE', 'SparkQuest is not enabled for this active workspace.');
  }
  if (!student || student.organizationId !== organizationId || student.status !== 'active') {
    throw new SparkQuestLaunchError('RECIPIENT_LEARNER_UNAVAILABLE', 'This learner is not active in the selected workspace.');
  }
};

export const assertRecipientIdentity = ({ role, uid, organizationId, student, profile, authUser, linkedStudents = [], guardianLinks = [] }) => {
  if (!['parent', 'student'].includes(role) || !uid || !student || !profile || !authUser || authUser.disabled ||
      authUser.uid !== uid || profile.id !== uid || profile.role !== role || profile.organizationId !== organizationId || profile.status !== 'active' ||
      (authUser.customClaims?.role && authUser.customClaims.role !== role) ||
      typeof authUser.email !== 'string' || !authUser.email || typeof profile.email !== 'string' || !profile.email ||
      profile.email?.toLowerCase() !== authUser.email?.toLowerCase()) {
    throw new SparkQuestLaunchError('RECIPIENT_ACCOUNT_INVALID', 'This SparkQuest account needs an administrator to verify its identity and links.');
  }
  if (role === 'student') {
    if (student.loginInfo?.uid !== uid || student.loginInfo?.email?.toLowerCase() !== authUser.email.toLowerCase() ||
        linkedStudents.length !== 1 || linkedStudents[0].id !== student.id ||
        (profile.studentId && profile.studentId !== student.id)) {
      throw new SparkQuestLaunchError('RECIPIENT_STUDENT_LINK_INVALID', 'The learner login does not match exactly one learner record.');
    }
  } else {
    const subjectIds = new Set([student.id, student.loginInfo?.uid].filter(Boolean));
    if (student.parentLoginInfo?.uid !== uid ||
        student.parentLoginInfo?.email?.toLowerCase() !== authUser.email?.toLowerCase() ||
        !Array.isArray(student.parentUids) || !student.parentUids.includes(uid) ||
        !guardianLinks.some(link => link.organizationId === organizationId && link.parentUid === uid &&
          link.studentId === student.id && link.status === 'active' && subjectIds.has(link.subjectId) &&
          link.id === `${uid}_${link.subjectId}`)) {
      throw new SparkQuestLaunchError('RECIPIENT_PARENT_LINK_INVALID', 'The family login is not linked to this learner with a verified guardian record.');
    }
  }
  return { actorUid: uid, actorRole: role, organizationId, studentId: role === 'student' ? student.id : null, projectId: null };
};
