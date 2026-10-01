import { getAuth } from 'firebase-admin/auth';
import { getDb, getFirebaseAdminApp } from '../../agent/_lib/firebaseAdmin.js';
import { permissionMatches, SparkQuestLaunchError } from '../../../modules/sparkquest/domain/sparkquestLaunchPolicy.js';

const elevatedRoles = new Set(['super_admin', 'owner', 'admin']);

const getHeader = (req, name) => {
  const value = req.headers?.[name] ?? req.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
};

export const sendBridgeJson = (res, status, payload) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.status(status).json(payload);
};

export const sendBridgeError = (res, error) => {
  const status = Number(error?.status) || 500;
  const code = error?.code || 'SPARKQUEST_BRIDGE_ERROR';
  const message = status === 500
    ? 'The SparkQuest bridge could not complete the request.'
    : error.message;
  if (status >= 500) console.error('[SparkQuest App Bridge]', error);
  return sendBridgeJson(res, status, { ok: false, error: { code, message } });
};

export async function resolvePermissions(db, organizationId, profile) {
  if (elevatedRoles.has(profile.role)) return ['*'];
  if (Array.isArray(profile.permissions)) return profile.permissions;

  const [tenantRole, platformRole] = await Promise.all([
    db.doc(`organizations/${organizationId}/roles/${profile.role}`).get(),
    db.doc(`roles/${profile.role}`).get(),
  ]);

  if (tenantRole.exists) return tenantRole.data()?.permissions || [];
  if (platformRole.exists) return platformRole.data()?.permissions || [];
  return [];
}

export async function requireEdufyBridgeUser(req) {
  const idToken = getHeader(req, 'x-edufy-id-token');
  const organizationId = getHeader(req, 'x-edufy-organization-id');
  if (!idToken || !organizationId || typeof organizationId !== 'string') {
    throw new SparkQuestLaunchError('EDUFY_AUTH_REQUIRED', 'Sign in to Edufy and choose a workspace first.', 401);
  }

  let decoded;
  try {
    decoded = await getAuth(getFirebaseAdminApp()).verifyIdToken(idToken);
  } catch {
    throw new SparkQuestLaunchError('EDUFY_AUTH_REQUIRED', 'The Edufy session is invalid or expired.', 401);
  }

  const db = getDb();
  const [userSnapshot, organizationSnapshot] = await Promise.all([
    db.doc(`users/${decoded.uid}`).get(),
    db.doc(`organizations/${organizationId}`).get(),
  ]);

  if (!userSnapshot.exists || !organizationSnapshot.exists) {
    throw new SparkQuestLaunchError('EDUFY_ACCESS_DENIED', 'The Edufy account or workspace was not found.');
  }

  const profile = { id: userSnapshot.id, ...userSnapshot.data() };
  const organization = { id: organizationSnapshot.id, ...organizationSnapshot.data() };
  const permissions = await resolvePermissions(db, organizationId, profile);

  return { db, decoded, profile, organization, organizationId, permissions };
}

export const requireLearningManager = (profile, permissions) => {
  if (elevatedRoles.has(profile.role) || permissionMatches(permissions, 'learning.manage')) return;
  throw new SparkQuestLaunchError('SPARKQUEST_MANAGE_PERMISSION_REQUIRED', 'Learning management permission is required.');
};

export const requireAppBridgeWriteAccess = () => {
  if (process.env.EDUFY_ENABLE_APP_BRIDGE_WRITES === 'true') return;
  throw new SparkQuestLaunchError(
    'SPARKQUEST_BRIDGE_DISABLED',
    'The secure SparkQuest launch service is not enabled in this environment.',
    503
  );
};

export const loadLinkedStudents = async (db, uid) => {
  const snapshot = await db.collection('students').where('loginInfo.uid', '==', uid).get();
  return snapshot.docs.map(record => ({ id: record.id, ...record.data() }));
};

export const loadProject = async (db, projectId) => {
  if (!projectId) return null;
  if (typeof projectId !== 'string' || projectId.length > 160) {
    throw new SparkQuestLaunchError('PROJECT_ID_INVALID', 'The requested project ID is invalid.', 400);
  }
  const snapshot = await db.doc(`student_projects/${projectId}`).get();
  if (!snapshot.exists) {
    throw new SparkQuestLaunchError('PROJECT_NOT_FOUND', 'The requested SparkQuest project was not found.', 404);
  }
  return { id: snapshot.id, ...snapshot.data() };
};
