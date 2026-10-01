import { Timestamp } from 'firebase-admin/firestore';
import {
  SPARKQUEST_LAUNCH_TTL_MS,
  SPARKQUEST_LAUNCH_VERSION,
  buildSparkQuestLaunchUrl,
  createLaunchCode,
  hashLaunchCode,
  resolveSparkQuestLaunchAccess,
} from '../../../modules/sparkquest/domain/sparkquestLaunchPolicy.js';
import {
  loadLinkedStudents,
  loadProject,
  requireAppBridgeWriteAccess,
  requireEdufyBridgeUser,
  sendBridgeError,
  sendBridgeJson,
} from '../_lib/bridgeAccess.js';
import { applyEdufyCors, resolveSparkQuestAppUrl } from '../_lib/cors.js';

export default async function handler(req, res) {
  const requestOrigin = applyEdufyCors(req, res);
  if (req.method === 'OPTIONS') return sendBridgeJson(res, requestOrigin ? 204 : 403, {});
  if (req.method !== 'POST') return sendBridgeJson(res, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' } });
  if (req.headers?.origin && !requestOrigin) {
    return sendBridgeJson(res, 403, { ok: false, error: { code: 'ORIGIN_NOT_ALLOWED', message: 'This Edufy origin is not allowed.' } });
  }

  try {
    const context = await requireEdufyBridgeUser(req);
    requireAppBridgeWriteAccess();
    const projectId = typeof req.body?.projectId === 'string' ? req.body.projectId.trim() : '';
    const [linkedStudents, project] = await Promise.all([
      context.profile.role === 'student' ? loadLinkedStudents(context.db, context.decoded.uid) : Promise.resolve([]),
      loadProject(context.db, projectId),
    ]);

    const access = resolveSparkQuestLaunchAccess({
      decodedUid: context.decoded.uid,
      profile: context.profile,
      organization: context.organization,
      linkedStudents,
      project,
      permissions: context.permissions,
    });

    const launchCode = createLaunchCode();
    const codeHash = hashLaunchCode(launchCode);
    const now = Date.now();
    const expiresAt = now + SPARKQUEST_LAUNCH_TTL_MS;
    const sparkQuestUrl = resolveSparkQuestAppUrl(req);
    const allowedOrigin = new URL(sparkQuestUrl).origin;

    await context.db.collection('app_launch_sessions').doc(codeHash).create({
      version: SPARKQUEST_LAUNCH_VERSION,
      application: 'sparkquest',
      status: 'issued',
      actorUid: access.actorUid,
      actorRole: access.actorRole,
      organizationId: access.organizationId,
      studentId: access.studentId,
      projectId: access.projectId,
      allowedOrigin,
      issuedAt: Timestamp.fromMillis(now),
      expiresAt: Timestamp.fromMillis(expiresAt),
    });

    return sendBridgeJson(res, 201, {
      ok: true,
      launchUrl: buildSparkQuestLaunchUrl(sparkQuestUrl, launchCode),
      expiresAt: new Date(expiresAt).toISOString(),
    });
  } catch (error) {
    return sendBridgeError(res, error);
  }
}
