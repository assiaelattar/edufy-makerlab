import { getAuth } from 'firebase-admin/auth';
import { getDb, getFirebaseAdminApp } from '../../agent/_lib/firebaseAdmin.js';
import { sendJson } from '../../agent/_lib/http.js';

const elevatedRoles = new Set(['super_admin', 'owner', 'admin']);
const fallbackPermissions = {
  content_manager: ['marketing.view', 'marketing.create']
};

const getHeader = (req, name) => {
  const value = req.headers?.[name] ?? req.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
};

const permissionMatches = (permissions, permission) => {
  if (!Array.isArray(permissions)) return false;
  if (permissions.includes('*') || permissions.includes(permission)) return true;
  const [scope] = permission.split('.');
  return permissions.includes(`${scope}.*`);
};

async function resolvePermissions(db, organizationId, profile) {
  if (elevatedRoles.has(profile.role)) return ['*'];
  if (Array.isArray(profile.permissions)) return profile.permissions;

  const [tenantRole, platformRole] = await Promise.all([
    db.doc(`organizations/${organizationId}/roles/${profile.role}`).get(),
    db.doc(`roles/${profile.role}`).get()
  ]);

  if (tenantRole.exists) return tenantRole.data()?.permissions || [];
  if (platformRole.exists) return platformRole.data()?.permissions || [];
  return fallbackPermissions[profile.role] || [];
}

export async function requireCreativeUser(req, res) {
  const idToken = getHeader(req, 'x-edufy-id-token');
  const organizationId = getHeader(req, 'x-edufy-organization-id');

  if (!idToken || !organizationId) {
    sendJson(res, 401, { code: 'EDUFY_AUTH_REQUIRED', error: 'Sign in to Edufy and choose an organization first.' });
    return null;
  }

  try {
    const decoded = await getAuth(getFirebaseAdminApp()).verifyIdToken(idToken);
    const db = getDb();
    const [userSnapshot, organizationSnapshot, settingsSnapshot] = await Promise.all([
      db.doc(`users/${decoded.uid}`).get(),
      db.doc(`organizations/${organizationId}`).get(),
      db.doc(`organizations/${organizationId}/settings/global`).get()
    ]);

    if (!userSnapshot.exists || !organizationSnapshot.exists) {
      sendJson(res, 403, { code: 'EDUFY_ACCESS_DENIED', error: 'This Edufy workspace is not available to the signed-in user.' });
      return null;
    }

    const profile = userSnapshot.data();
    const organization = organizationSnapshot.data();
    const belongsToOrganization = profile.organizationId === organizationId || profile.role === 'super_admin';
    if (!belongsToOrganization || profile.status !== 'active') {
      sendJson(res, 403, { code: 'EDUFY_ACCESS_DENIED', error: 'Your Edufy account cannot use this organization.' });
      return null;
    }

    const permissions = await resolvePermissions(db, organizationId, profile);
    if (!permissionMatches(permissions, 'marketing.create')) {
      sendJson(res, 403, { code: 'CREATIVE_PERMISSION_REQUIRED', error: 'Creative content permission is required.' });
      return null;
    }

    if (!organization.installedApps?.includes('social-poster-ai')) {
      sendJson(res, 403, { code: 'CREATIVE_APP_REQUIRED', error: 'Atlas Creative Studio is not active for this organization.' });
      return null;
    }

    const brandDna = settingsSnapshot.data()?.creativeStudio;
    if (!brandDna || brandDna.status !== 'ready') {
      sendJson(res, 409, { code: 'BRAND_DNA_REQUIRED', error: 'Complete and save the organization Brand DNA before generating.' });
      return null;
    }

    return { brandDna, decoded, organization, organizationId, profile };
  } catch {
    sendJson(res, 401, { code: 'EDUFY_AUTH_REQUIRED', error: 'Your Edufy session needs to be refreshed.' });
    return null;
  }
}
