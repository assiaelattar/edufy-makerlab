import { Timestamp } from 'firebase-admin/firestore';
import { assertRecipientIssuer, RECIPIENT_LAUNCH_TTL_MS } from '../../../modules/sparkquest/domain/recipientAccessPolicy.js';
import { buildSparkQuestLaunchUrl, createLaunchCode, hashLaunchCode, SPARKQUEST_LAUNCH_VERSION, SparkQuestLaunchError } from '../../../modules/sparkquest/domain/sparkquestLaunchPolicy.js';
import { loadRecipientAccess } from '../_lib/recipientAccess.js';
import { requireEdufyBridgeUser, sendBridgeError, sendBridgeJson } from '../_lib/bridgeAccess.js';
import { applyEdufyCors, resolveSparkQuestAppUrl } from '../_lib/cors.js';

const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,160}$/.test(value);

export default async function handler(req, res) {
  const requestOrigin = applyEdufyCors(req, res);
  if (req.method === 'OPTIONS') return sendBridgeJson(res, requestOrigin ? 204 : 403, {});
  if (req.method !== 'POST') return sendBridgeJson(res, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' } });
  if (!requestOrigin) return sendBridgeJson(res, 403, { ok: false, error: { code: 'ORIGIN_NOT_ALLOWED', message: 'This Edufy origin is not allowed.' } });

  try {
    const { studentId, role, identityVerified } = req.body || {};
    if (!validId(studentId) || !['parent', 'student'].includes(role) || identityVerified !== true) {
      throw new SparkQuestLaunchError('RECIPIENT_REQUEST_INVALID', 'Select a learner and verify the recipient before creating a sign-in link.', 400);
    }
    const context = await requireEdufyBridgeUser(req);
    const studentSnapshot = await context.db.doc(`students/${studentId}`).get();
    const studentRecord = studentSnapshot.exists ? { id: studentSnapshot.id, ...studentSnapshot.data() } : null;
    assertRecipientIssuer({ actor: context.profile, organization: context.organization, organizationId: context.organizationId, student: studentRecord });
    const { access, student } = await loadRecipientAccess(context.db, {
      studentId, organizationId: context.organizationId, role,
    });

    const launchCode = createLaunchCode();
    const codeHash = hashLaunchCode(launchCode);
    const now = Date.now();
    const expiresAt = now + RECIPIENT_LAUNCH_TTL_MS;
    const sparkQuestUrl = resolveSparkQuestAppUrl(req);
    const launchUrl = new URL(buildSparkQuestLaunchUrl(sparkQuestUrl, launchCode));
    if (role === 'parent') launchUrl.searchParams.set('role', 'parent');
    await context.db.collection('app_launch_sessions').doc(codeHash).create({
      version: SPARKQUEST_LAUNCH_VERSION,
      application: 'sparkquest',
      purpose: 'recipient',
      status: 'issued',
      actorUid: access.actorUid,
      actorRole: access.actorRole,
      issuedByUid: context.decoded.uid,
      organizationId: access.organizationId,
      studentId: student.id,
      projectId: null,
      allowedOrigin: new URL(sparkQuestUrl).origin,
      issuedAt: Timestamp.fromMillis(now),
      expiresAt: Timestamp.fromMillis(expiresAt),
    });
    return sendBridgeJson(res, 201, {
      ok: true,
      launchUrl: launchUrl.toString(),
      expiresAt: new Date(expiresAt).toISOString(),
    });
  } catch (error) {
    return sendBridgeError(res, error);
  }
}
