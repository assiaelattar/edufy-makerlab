import { getAuth } from 'firebase-admin/auth';
import { getFirebaseAdminApp, getDb, serverTimestamp } from '../../agent/_lib/firebaseAdmin.js';
import {
  buildSparkQuestCustomClaims,
  hashLaunchCode,
  isValidLaunchCode,
  resolveSparkQuestLaunchAccess,
  SparkQuestLaunchError,
  validateSparkQuestLaunchSession,
} from '../../../modules/sparkquest/domain/sparkquestLaunchPolicy.js';
import { applySparkQuestCors } from '../_lib/cors.js';
import {
  loadLinkedStudents,
  loadProject,
  requireAppBridgeWriteAccess,
  resolvePermissions,
  sendBridgeError,
  sendBridgeJson,
} from '../_lib/bridgeAccess.js';

export default async function handler(req, res) {
  const requestOrigin = applySparkQuestCors(req, res);
  if (req.method === 'OPTIONS') return sendBridgeJson(res, requestOrigin ? 204 : 403, {});
  if (req.method !== 'POST') return sendBridgeJson(res, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' } });
  if (!requestOrigin) {
    return sendBridgeJson(res, 403, { ok: false, error: { code: 'ORIGIN_NOT_ALLOWED', message: 'This SparkQuest origin is not allowed.' } });
  }

  try {
    const launchCode = req.body?.launchCode;
    if (!isValidLaunchCode(launchCode)) {
      throw new SparkQuestLaunchError('LAUNCH_CODE_INVALID', 'The SparkQuest launch link is invalid.', 400);
    }
    requireAppBridgeWriteAccess();

    const db = getDb();
    const codeHash = hashLaunchCode(launchCode);
    const sessionRef = db.collection('app_launch_sessions').doc(codeHash);
    const initialSnapshot = await sessionRef.get();
    if (!initialSnapshot.exists) {
      throw new SparkQuestLaunchError('LAUNCH_NOT_FOUND', 'The SparkQuest launch link is invalid or expired.', 401);
    }

    const session = validateSparkQuestLaunchSession(initialSnapshot.data(), { origin: requestOrigin });

    const [userSnapshot, organizationSnapshot, project] = await Promise.all([
      db.doc(`users/${session.actorUid}`).get(),
      db.doc(`organizations/${session.organizationId}`).get(),
      loadProject(db, session.projectId),
    ]);
    if (!userSnapshot.exists || !organizationSnapshot.exists) {
      throw new SparkQuestLaunchError('LAUNCH_ACCESS_REVOKED', 'The Edufy account or workspace is no longer available.');
    }

    const profile = { id: userSnapshot.id, ...userSnapshot.data() };
    const organization = { id: organizationSnapshot.id, ...organizationSnapshot.data() };
    const [permissions, linkedStudents] = await Promise.all([
      resolvePermissions(db, session.organizationId, profile),
      profile.role === 'student' ? loadLinkedStudents(db, session.actorUid) : Promise.resolve([]),
    ]);
    const access = resolveSparkQuestLaunchAccess({
      decodedUid: session.actorUid,
      profile,
      organization,
      linkedStudents,
      project,
      permissions,
    });

    if (access.studentId !== (session.studentId || null) || access.projectId !== (session.projectId || null)) {
      throw new SparkQuestLaunchError('LAUNCH_ACCESS_CHANGED', 'The Edufy learner or project link changed after this launch was issued.');
    }

    await db.runTransaction(async transaction => {
      const freshSnapshot = await transaction.get(sessionRef);
      const fresh = freshSnapshot.data();
      if (!freshSnapshot.exists) throw new SparkQuestLaunchError('LAUNCH_NOT_FOUND', 'The SparkQuest launch link is invalid or expired.', 401);
      validateSparkQuestLaunchSession(fresh, { origin: requestOrigin });
      transaction.update(sessionRef, { status: 'consumed', consumedAt: serverTimestamp() });
    });

    const customToken = await getAuth(getFirebaseAdminApp()).createCustomToken(
      access.actorUid,
      buildSparkQuestCustomClaims(access, codeHash)
    );

    return sendBridgeJson(res, 200, {
      ok: true,
      customToken,
      projectId: access.projectId,
      organizationId: access.organizationId,
    });
  } catch (error) {
    return sendBridgeError(res, error);
  }
}
