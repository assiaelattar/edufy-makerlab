import { randomBytes } from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { getDb, getFirebaseAdminApp } from '../agent/_lib/firebaseAdmin.js';

const staffRoles = new Set(['super_admin', 'owner', 'admin']);
const permissions = ['portfolio', 'enrollments', 'payments', 'gallery', 'pickup'];
const allowedOrigins = () => new Set(String(process.env.EDUFY_PARENT_ACCESS_ALLOWED_ORIGINS || '')
  .split(',').map(value => value.trim()).filter(Boolean));
const applyOriginPolicy = (req, res) => {
  const origin = req.headers?.origin;
  if (!origin) return req.method !== 'OPTIONS';
  if (!allowedOrigins().has(origin)) return false;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Max-Age', '600');
  return true;
};
const response = (res, status, body) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  return res.status(status).json(body);
};

export const parentAliasBase = name => {
  if (typeof name !== 'string' || !name.trim() || name.length > 80) {
    throw Object.assign(new Error('Enter a login alias basis of up to 80 characters.'), { status: 400 });
  }
  const words = String(name || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 48).replace(/\.+$/, '');
  if (!words) throw Object.assign(new Error('Enter a login alias basis with letters or numbers.'), { status: 400 });
  return `p.${words}`;
};

export const newParentPassword = () => randomBytes(24).toString('base64url');

const authUserByEmail = async (auth, email) => {
  try { return await auth.getUserByEmail(email); }
  catch (error) {
    if (error?.code === 'auth/user-not-found') return null;
    throw error;
  }
};

const guardianSubjects = student => [...new Set([student.id, student.loginInfo?.uid].filter(Boolean))];

const linkedParent = async (db, uid, organizationId) => {
  const profile = await db.doc(`users/${uid}`).get();
  if (!profile.exists || profile.data().role !== 'parent' || profile.data().organizationId !== organizationId || profile.data().status !== 'active') return false;
  const links = await db.collection('guardian_links').where('parentUid', '==', uid).get();
  return links.docs.some(link => link.data().organizationId === organizationId && link.data().status === 'active' &&
    link.id === `${uid}_${link.data().subjectId}`);
};

export default async function handler(req, res) {
  if (!applyOriginPolicy(req, res)) return response(res, 403, { ok: false, error: 'Origin is not allowed.' });
  if (req.method === 'OPTIONS') return response(res, 200, { ok: true });
  if (req.method !== 'POST') return response(res, 405, { ok: false, error: 'POST required.' });
  try {
    const token = /^Bearer (.+)$/i.exec(String(req.headers.authorization || ''))?.[1];
    if (!token) return response(res, 401, { ok: false, error: 'Sign in to Edufy first.' });
    const auth = getAuth(getFirebaseAdminApp());
    const actor = await auth.verifyIdToken(token, true);
    const db = getDb();
    const actorDoc = await db.doc(`users/${actor.uid}`).get();
    const actorProfile = actorDoc.data();
    const { action, studentId, organizationId, reuseParentUid, parentName, aliasBasis, relationshipVerified } = req.body || {};
    if (!actorProfile || actorProfile.status !== 'active' || !staffRoles.has(actorProfile.role) ||
      typeof organizationId !== 'string' || actorProfile.organizationId !== organizationId) {
      return response(res, 403, { ok: false, error: 'Parent access management is not permitted for this workspace.' });
    }
    if (typeof studentId !== 'string' || !/^[A-Za-z0-9_-]{1,160}$/.test(studentId)) {
      return response(res, 400, { ok: false, error: 'A valid learner ID is required.' });
    }
    if (!['issue', 'link', 'reset'].includes(action)) return response(res, 400, { ok: false, error: 'Unknown parent access action.' });
    const studentRef = db.doc(`students/${studentId}`);
    const studentDoc = await studentRef.get();
    if (!studentDoc.exists || studentDoc.data().organizationId !== organizationId) {
      return response(res, 404, { ok: false, error: 'Learner not found in this workspace.' });
    }
    const student = { id: studentDoc.id, ...studentDoc.data() };
    const recordedParentName = typeof student.parentName === 'string' ? student.parentName.trim().replace(/\s+/g, ' ') : '';

    if (action === 'reset') {
      const uid = student.parentLoginInfo?.uid;
      const guardian = uid ? await db.doc(`guardian_links/${uid}_${student.id}`).get() : null;
      if (!uid || !(await linkedParent(db, uid, organizationId)) || !guardian?.exists ||
        guardian.data().parentUid !== uid || guardian.data().studentId !== student.id ||
        guardian.data().organizationId !== organizationId || guardian.data().status !== 'active') {
        return response(res, 403, { ok: false, error: 'A verified parent link is required before reset.' });
      }
      const password = newParentPassword();
      await auth.revokeRefreshTokens(uid);
      const user = await auth.updateUser(uid, { password });
      return response(res, 200, { ok: true, action, email: user.email, password });
    }

    if (relationshipVerified !== true) {
      return response(res, 400, { ok: false, error: 'Staff must verify the parent relationship before issuing or linking access.' });
    }
    if (student.parentLoginInfo?.uid) return response(res, 409, { ok: false, error: 'This learner already has parent access. Use reset for that account.' });
    let uid;
    let email;
    let password;
    let created = false;
    if (action === 'link') {
      if (typeof reuseParentUid !== 'string' || !/^[A-Za-z0-9_-]{1,160}$/.test(reuseParentUid) ||
        !(await linkedParent(db, reuseParentUid, organizationId))) {
        return response(res, 403, { ok: false, error: 'Select an existing verified parent account in this workspace.' });
      }
      const user = await auth.getUser(reuseParentUid);
      uid = user.uid;
      email = user.email;
      if (!email) return response(res, 409, { ok: false, error: 'The existing parent account has no login email.' });
    } else {
      const confirmedParentName = typeof parentName === 'string' ? parentName.trim().replace(/\s+/g, ' ') : '';
      if (!recordedParentName || confirmedParentName !== recordedParentName) {
        return response(res, 400, { ok: false, error: 'Verify the recorded parent name before issuing a login.' });
      }
      const alias = parentAliasBase(aliasBasis);
      password = newParentPassword();
      for (let suffix = 1; suffix <= 100; suffix += 1) {
        const candidate = `${alias}${suffix === 1 ? '' : `-${suffix}`}@makerlab.academy`;
        if (await authUserByEmail(auth, candidate)) continue;
        try {
          const user = await auth.createUser({ email: candidate, password, displayName: recordedParentName });
          uid = user.uid;
          email = candidate;
          created = true;
          break;
        } catch (error) {
          if (error?.code === 'auth/email-already-exists') continue;
          throw error;
        }
      }
      if (!uid) return response(res, 409, { ok: false, error: 'No available parent login could be issued.' });
    }

    try {
      await db.runTransaction(async transaction => {
        const currentStudent = await transaction.get(studentRef);
        if (!currentStudent.exists || currentStudent.data().organizationId !== organizationId || currentStudent.data().parentLoginInfo?.uid) {
          throw Object.assign(new Error('Parent access changed. Refresh the learner record.'), { status: 409 });
        }
        if (created && String(currentStudent.data().parentName || '').trim().replace(/\s+/g, ' ') !== recordedParentName) {
          throw Object.assign(new Error('Recorded parent name changed. Refresh the learner record.'), { status: 409 });
        }
        if (created) transaction.create(db.doc(`users/${uid}`), {
          uid, organizationId, email, name: recordedParentName, role: 'parent', status: 'active',
          createdAt: FieldValue.serverTimestamp()
        });
        transaction.update(studentRef, { parentLoginInfo: { uid, email }, parentUids: FieldValue.arrayUnion(uid) });
        for (const subjectId of guardianSubjects({ id: student.id, ...currentStudent.data() })) {
          transaction.set(db.doc(`guardian_links/${uid}_${subjectId}`), {
            organizationId, parentUid: uid, studentId, subjectId, status: 'active', permissions,
            updatedAt: FieldValue.serverTimestamp()
          }, { merge: true });
        }
      });
    } catch (error) {
      if (created) await auth.deleteUser(uid).catch(() => {});
      throw error;
    }
    return response(res, 200, { ok: true, action, email, ...(created ? { password } : {}) });
  } catch (error) {
    if (error?.status === 400 || error?.status === 409) return response(res, error.status, { ok: false, error: error.message });
    console.error('[parent-access] action failed', { code: error?.code || 'unknown' });
    return response(res, 500, { ok: false, error: 'Parent access could not be updated. Please retry or contact an administrator.' });
  }
}
