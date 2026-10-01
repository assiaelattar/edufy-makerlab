import { reconcileSparkQuestIdentity } from '../../../modules/sparkquest/domain/identityReconciliation.js';
import {
  requireEdufyBridgeUser,
  requireLearningManager,
  sendBridgeError,
  sendBridgeJson,
} from '../_lib/bridgeAccess.js';
import { applyEdufyCors } from '../_lib/cors.js';

const REPORT_LIMIT = 5_000;

const scopedRecords = async (db, collectionName, organizationId) => {
  const snapshot = await db.collection(collectionName)
    .where('organizationId', '==', organizationId)
    .limit(REPORT_LIMIT)
    .get();
  return {
    records: snapshot.docs.map(record => ({ id: record.id, ...record.data() })),
    truncated: snapshot.size === REPORT_LIMIT,
  };
};

export default async function handler(req, res) {
  const requestOrigin = applyEdufyCors(req, res);
  if (req.method === 'OPTIONS') return sendBridgeJson(res, requestOrigin ? 204 : 403, {});
  if (req.method !== 'GET') return sendBridgeJson(res, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Use GET.' } });
  if (req.headers?.origin && !requestOrigin) {
    return sendBridgeJson(res, 403, { ok: false, error: { code: 'ORIGIN_NOT_ALLOWED', message: 'This Edufy origin is not allowed.' } });
  }

  try {
    const context = await requireEdufyBridgeUser(req);
    requireLearningManager(context.profile, context.permissions);
    const [users, students, projects] = await Promise.all([
      scopedRecords(context.db, 'users', context.organizationId),
      scopedRecords(context.db, 'students', context.organizationId),
      scopedRecords(context.db, 'student_projects', context.organizationId),
    ]);
    const report = reconcileSparkQuestIdentity({
      organizationId: context.organizationId,
      users: users.records,
      students: students.records,
      projects: projects.records,
    });

    return sendBridgeJson(res, 200, {
      ok: true,
      readOnly: true,
      truncated: users.truncated || students.truncated || projects.truncated,
      report,
    });
  } catch (error) {
    return sendBridgeError(res, error);
  }
}
