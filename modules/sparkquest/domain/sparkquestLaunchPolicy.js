import crypto from 'node:crypto';

export const SPARKQUEST_LAUNCH_VERSION = 1;
export const SPARKQUEST_LAUNCH_TTL_MS = 90_000;

const elevatedRoles = new Set(['super_admin', 'owner', 'admin']);
const activeOrganizationStatuses = new Set(['active', 'trial']);

export class SparkQuestLaunchError extends Error {
  constructor(code, message, status = 403) {
    super(message);
    this.name = 'SparkQuestLaunchError';
    this.code = code;
    this.status = status;
  }
}

export const permissionMatches = (permissions, permission) => {
  if (!Array.isArray(permissions)) return false;
  if (permissions.includes('*') || permissions.includes(permission)) return true;
  const [scope] = permission.split('.');
  return permissions.includes(`${scope}.*`);
};

export const isSparkQuestEnabled = (organization) => Boolean(
  organization?.modules?.sparkQuest
  || organization?.modules?.sparkquest
  || organization?.installedApps?.includes('sparkquest')
);

export const createLaunchCode = () => crypto.randomBytes(32).toString('base64url');

export const isValidLaunchCode = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);

export const hashLaunchCode = (value) => crypto.createHash('sha256').update(String(value || '')).digest('hex');

const toMillis = value => typeof value?.toMillis === 'function' ? value.toMillis() : new Date(value).getTime();

export const validateSparkQuestLaunchSession = (session, { origin, now = Date.now() }) => {
  if (!session || session.application !== 'sparkquest') {
    throw new SparkQuestLaunchError('LAUNCH_NOT_FOUND', 'The SparkQuest launch link is invalid or expired.', 401);
  }
  if (session.status !== 'issued') {
    throw new SparkQuestLaunchError('LAUNCH_ALREADY_USED', 'This SparkQuest launch link has already been used.', 401);
  }
  if (!Number.isFinite(toMillis(session.expiresAt)) || toMillis(session.expiresAt) <= now) {
    throw new SparkQuestLaunchError('LAUNCH_EXPIRED', 'This SparkQuest launch link has expired.', 401);
  }
  if (!origin || session.allowedOrigin !== origin) {
    throw new SparkQuestLaunchError('LAUNCH_ORIGIN_MISMATCH', 'This SparkQuest launch link belongs to another application origin.');
  }
  return session;
};

export const buildSparkQuestLaunchUrl = (baseUrl, launchCode) => {
  if (!isValidLaunchCode(launchCode)) {
    throw new SparkQuestLaunchError('LAUNCH_CODE_INVALID', 'The SparkQuest launch code is invalid.', 400);
  }

  let url;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new SparkQuestLaunchError('SPARKQUEST_URL_INVALID', 'The configured SparkQuest URL is invalid.', 500);
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new SparkQuestLaunchError('SPARKQUEST_URL_INVALID', 'The configured SparkQuest URL is not allowed.', 500);
  }

  url.search = '';
  url.hash = '';
  url.searchParams.set('launch', launchCode);
  return url.toString();
};

const assertProjectScope = ({ project, organizationId }) => {
  if (!project) return;
  if (project.organizationId !== organizationId) {
    throw new SparkQuestLaunchError('PROJECT_TENANT_MISMATCH', 'The requested project is not part of this Edufy workspace.');
  }
};

export const resolveSparkQuestLaunchAccess = ({
  decodedUid,
  profile,
  organization,
  linkedStudents = [],
  project = null,
  permissions = [],
}) => {
  if (!decodedUid || !profile || profile.id !== decodedUid) {
    throw new SparkQuestLaunchError('EDUFY_ACCOUNT_INVALID', 'The Edufy account could not be verified.', 401);
  }
  if (!organization?.id || !activeOrganizationStatuses.has(organization.status)) {
    throw new SparkQuestLaunchError('EDUFY_WORKSPACE_INACTIVE', 'This Edufy workspace is not active.');
  }
  if (profile.organizationId !== organization.id && profile.role !== 'super_admin') {
    throw new SparkQuestLaunchError('EDUFY_TENANT_MISMATCH', 'This account does not belong to the selected Edufy workspace.');
  }
  if (profile.status !== 'active') {
    throw new SparkQuestLaunchError('EDUFY_ACCOUNT_INACTIVE', 'This Edufy account is not active.');
  }
  if (!isSparkQuestEnabled(organization)) {
    throw new SparkQuestLaunchError('SPARKQUEST_NOT_ENABLED', 'SparkQuest is not enabled for this Edufy workspace.');
  }

  assertProjectScope({ project, organizationId: organization.id });

  if (profile.role === 'student') {
    if (linkedStudents.length !== 1) {
      throw new SparkQuestLaunchError(
        linkedStudents.length === 0 ? 'STUDENT_LINK_MISSING' : 'STUDENT_LINK_AMBIGUOUS',
        linkedStudents.length === 0
          ? 'No learner profile is linked to this Edufy account.'
          : 'More than one learner profile is linked to this Edufy account.'
      );
    }

    const student = linkedStudents[0];
    if (student.organizationId !== organization.id || student.status !== 'active') {
      throw new SparkQuestLaunchError('STUDENT_LINK_INVALID', 'The linked learner profile is not active in this workspace.');
    }
    if (profile.studentId && profile.studentId !== student.id) {
      throw new SparkQuestLaunchError('STUDENT_POINTER_MISMATCH', 'The Edufy user and learner links do not agree.');
    }
    if (project && ![student.id, decodedUid].includes(project.studentId)) {
      throw new SparkQuestLaunchError('PROJECT_OWNER_MISMATCH', 'The requested project does not belong to this learner.');
    }

    return {
      actorUid: decodedUid,
      actorRole: profile.role,
      organizationId: organization.id,
      studentId: student.id,
      projectId: project?.id || null,
    };
  }

  const canUseLearning = elevatedRoles.has(profile.role)
    || permissionMatches(permissions, 'learning.view')
    || permissionMatches(permissions, 'learning.manage');

  if (!canUseLearning) {
    throw new SparkQuestLaunchError('SPARKQUEST_PERMISSION_REQUIRED', 'Learning access is required to open SparkQuest.');
  }

  return {
    actorUid: decodedUid,
    actorRole: profile.role,
    organizationId: organization.id,
    studentId: null,
    projectId: project?.id || null,
  };
};

export const buildSparkQuestCustomClaims = (access, launchSessionId) => ({
  sparkquestLaunchVersion: SPARKQUEST_LAUNCH_VERSION,
  sparkquest: true,
  sparkquestOrganizationId: access.organizationId,
  sparkquestRole: access.actorRole,
  ...(access.studentId ? { sparkquestStudentId: access.studentId } : {}),
  ...(access.projectId ? { sparkquestProjectId: access.projectId } : {}),
  sparkquestLaunchSessionId: launchSessionId,
});
