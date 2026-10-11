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
const cleanName = value => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
const exactParentEmail = value => {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!/^p\.[^@\s]{1,80}@makerlab\.academy$/.test(email)) {
    throw Object.assign(new Error('Enter the exact SparkQuest parent login ID.'), { status: 400 });
  }
  return email;
};

const parentEvidence = async (get, db, uid, email, organizationId, confirmedName) => {
  const [profile, recorded, uidStudents, links, learnerLogins] = await Promise.all([
    get(db.doc(`users/${uid}`)),
    get(db.collection('students').where('parentLoginInfo.uid', '==', uid)),
    get(db.collection('students').where('parentUids', 'array-contains', uid)),
    get(db.collection('guardian_links').where('parentUid', '==', uid)),
    get(db.collection('students').where('loginInfo.uid', '==', uid))
  ]);
  const familyIds = new Set(recorded.docs.map(item => item.id));
  const familySubjects = new Map(recorded.docs.map(item => [item.id, new Set(guardianSubjects({ id: item.id, ...item.data() }))]));
  const profileData = profile.data();
  const names = new Set([cleanName(profileData?.name), ...recorded.docs.map(item => cleanName(item.data().parentName))].filter(Boolean));
  if (learnerLogins.size || !recorded.size || names.size > 1 ||
    (profile.exists && (profileData.role !== 'parent' || profileData.organizationId !== organizationId ||
      (profileData.status && profileData.status !== 'active') || (profileData.email && profileData.email.toLowerCase() !== email))) ||
    recorded.docs.some(item => item.data().organizationId !== organizationId ||
      item.data().parentLoginInfo?.email?.toLowerCase() !== email) ||
    uidStudents.docs.some(item => item.data().organizationId !== organizationId || !familyIds.has(item.id)) ||
    links.docs.some(item => item.data().status === 'active' &&
      (item.data().organizationId !== organizationId || !familyIds.has(item.data().studentId) ||
        !familySubjects.get(item.data().studentId)?.has(item.data().subjectId) || linkIdMismatch(item, uid)))) {
    throw Object.assign(new Error('This login has conflicting identity or family links. An administrator must review it.'), { status: 409 });
  }
  const knownName = [...names][0] || '';
  if (confirmedName && knownName && confirmedName !== knownName) {
    throw Object.assign(new Error('The verified parent name conflicts with an existing family record.'), { status: 409 });
  }
  return { profile, recorded, uidStudents, links, name: knownName || confirmedName, familyIds };
};

const linkIdMismatch = (item, uid) => item.id !== `${uid}_${item.data().subjectId}`;

const oldTransferFactsValid = ({ profile, recorded, uidStudents, links, learnerLogins }, uid, email, studentId, organizationId, verifiedName) => {
  const only = recorded.size === 1 && recorded.docs[0].id === studentId ? recorded.docs[0].data() : null;
  const subjects = only ? new Set(guardianSubjects({ id: studentId, ...only })) : new Set();
  return !!only && only.organizationId === organizationId && only.parentLoginInfo?.uid === uid &&
    only.parentLoginInfo?.email?.toLowerCase() === email.toLowerCase() &&
    (!cleanName(only.parentName) || cleanName(only.parentName) === verifiedName) && !learnerLogins.size &&
    (!profile.exists || (profile.data().role === 'parent' && profile.data().status === 'active' &&
      profile.data().organizationId === organizationId && profile.data().email?.toLowerCase() === email.toLowerCase())) &&
    !uidStudents.docs.some(item => item.id !== studentId || item.data().organizationId !== organizationId) &&
    !links.docs.some(item => item.data().status === 'active' &&
      (item.data().studentId !== studentId || item.data().organizationId !== organizationId ||
        !subjects.has(item.data().subjectId) || linkIdMismatch(item, uid)));
};

const linkedParent = async (db, uid, organizationId) => {
  const profile = await db.doc(`users/${uid}`).get();
  if (!profile.exists || profile.data().role !== 'parent' || profile.data().organizationId !== organizationId || profile.data().status !== 'active') return false;
  const links = await db.collection('guardian_links').where('parentUid', '==', uid).get();
  return links.docs.some(link => link.data().organizationId === organizationId && link.data().status === 'active' &&
    link.id === `${uid}_${link.data().subjectId}`);
};

const createIssuedParent = async (auth, aliasBasis, parentName) => {
  const alias = parentAliasBase(aliasBasis);
  const password = newParentPassword();
  for (let suffix = 1; suffix <= 100; suffix += 1) {
    const email = `${alias}${suffix === 1 ? '' : `-${suffix}`}@makerlab.academy`;
    if (await authUserByEmail(auth, email)) continue;
    try {
      const user = await auth.createUser({ email, password, displayName: parentName });
      return { uid: user.uid, email, password };
    } catch (error) {
      if (error?.code !== 'auth/email-already-exists') throw error;
    }
  }
  throw Object.assign(new Error('No available parent login could be issued.'), { status: 409 });
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
    const { action, studentId, organizationId, reuseParentUid, reuseParentEmail, parentName, aliasBasis, relationshipVerified } = req.body || {};
    if (!actorProfile || actorProfile.status !== 'active' || !staffRoles.has(actorProfile.role) ||
      typeof organizationId !== 'string' || actorProfile.organizationId !== organizationId) {
      return response(res, 403, { ok: false, error: 'Parent access management is not permitted for this workspace.' });
    }
    if (typeof studentId !== 'string' || !/^[A-Za-z0-9_-]{1,160}$/.test(studentId)) {
      return response(res, 400, { ok: false, error: 'A valid learner ID is required.' });
    }
    if (!['issue', 'link', 'transfer', 'reset', 'replace', 'repairStaffLink', 'lookup', 'recover'].includes(action)) return response(res, 400, { ok: false, error: 'Unknown parent access action.' });
    const studentRef = db.doc(`students/${studentId}`);
    const studentDoc = await studentRef.get();
    if (!studentDoc.exists || studentDoc.data().organizationId !== organizationId) {
      return response(res, 404, { ok: false, error: 'Learner not found in this workspace.' });
    }
    const student = { id: studentDoc.id, ...studentDoc.data() };
    const recordedParentName = typeof student.parentName === 'string' ? student.parentName.trim().replace(/\s+/g, ' ') : '';

    if (action === 'reset') {
      const uid = student.parentLoginInfo?.uid;
      if (!uid) return response(res, 409, { ok: false, error: 'No parent login is recorded for this learner.' });
      const guardian = uid ? await db.doc(`guardian_links/${uid}_${student.id}`).get() : null;
      if (!(await linkedParent(db, uid, organizationId)) || !guardian?.exists ||
        guardian.data().parentUid !== uid || guardian.data().studentId !== student.id ||
        guardian.data().organizationId !== organizationId || guardian.data().status !== 'active') {
        return response(res, 409, { ok: false, code: 'recovery_required', error: 'This older parent login needs recovery. Open Parent access and choose Recover this exact login and issue password.' });
      }
      const password = newParentPassword();
      await auth.revokeRefreshTokens(uid);
      const user = await auth.updateUser(uid, { password });
      return response(res, 200, { ok: true, action, email: user.email, password });
    }

    if (relationshipVerified !== true) {
      return response(res, 400, { ok: false, error: 'Staff must verify the parent relationship before issuing or linking access.' });
    }
    if (action === 'lookup' || action === 'recover') {
      const email = exactParentEmail(action === 'recover' ? student.parentLoginInfo?.email : reuseParentEmail);
      const user = await authUserByEmail(auth, email);
      if (!user || user.disabled) return response(res, 409, { ok: false, error: 'No active parent login matches this exact ID.' });
      if (user.customClaims?.role && user.customClaims.role !== 'parent') {
        return response(res, 409, { ok: false, error: 'This login belongs to another account role.' });
      }
      const confirmedName = cleanName(parentName);
      const evidence = await parentEvidence(ref => ref.get(), db, user.uid, email, organizationId, confirmedName);
      if (action === 'lookup') return response(res, 200, {
        ok: true, action, email, uid: user.uid, parentName: evidence.name || '',
        linkedLearnerCount: evidence.recorded.size, needsRecovery: !evidence.profile.exists ||
          evidence.profile.data().status !== 'active' || evidence.profile.data().accessVersion !== 2 ||
          evidence.recorded.docs.some(item => guardianSubjects({ id: item.id, ...item.data() }).some(subjectId =>
            !evidence.links.docs.some(link => link.id === `${user.uid}_${subjectId}` && link.data().status === 'active')))
      });
      if (student.parentLoginInfo?.uid !== user.uid || student.parentLoginInfo?.email?.toLowerCase() !== email) {
        return response(res, 409, { ok: false, error: 'This learner does not record the exact parent login to recover.' });
      }
      if (!confirmedName || confirmedName.length < 2 || !evidence.name) {
        return response(res, 400, { ok: false, error: 'Enter and verify the parent’s full name before recovering this login.' });
      }
      await db.runTransaction(async transaction => {
        const current = await parentEvidence(ref => transaction.get(ref), db, user.uid, email, organizationId, confirmedName);
        if (!current.familyIds.has(student.id)) throw Object.assign(new Error('Parent access changed. Refresh the learner record.'), { status: 409 });
        const profileRef = db.doc(`users/${user.uid}`);
        transaction.set(profileRef, {
          uid: user.uid, organizationId, email, name: confirmedName, role: 'parent', status: 'active', accessVersion: 2,
          updatedAt: FieldValue.serverTimestamp(), ...(!current.profile.exists ? { createdAt: FieldValue.serverTimestamp() } : {})
        }, { merge: true });
        for (const item of current.recorded.docs) {
          const data = item.data();
          const patch = { parentUids: FieldValue.arrayUnion(user.uid) };
          if (!cleanName(data.parentName)) patch.parentName = confirmedName;
          transaction.update(item.ref, patch);
          for (const subjectId of guardianSubjects({ id: item.id, ...data })) {
            transaction.set(db.doc(`guardian_links/${user.uid}_${subjectId}`), {
              organizationId, parentUid: user.uid, studentId: item.id, subjectId,
              status: 'active', permissions, updatedAt: FieldValue.serverTimestamp()
            }, { merge: true });
          }
        }
      });
      const password = newParentPassword();
      await auth.revokeRefreshTokens(user.uid);
      await auth.updateUser(user.uid, { password, displayName: confirmedName });
      return response(res, 200, { ok: true, action, email, password, linkedLearnerCount: evidence.recorded.size });
    }
    if (action === 'transfer') {
      const oldUid = student.parentLoginInfo?.uid;
      const oldEmail = student.parentLoginInfo?.email;
      const verifiedName = cleanName(parentName) || recordedParentName;
      if (!verifiedName || (recordedParentName && verifiedName !== recordedParentName) || !oldUid || !oldEmail || oldUid === reuseParentUid ||
        typeof reuseParentUid !== 'string' || !/^[A-Za-z0-9_-]{1,160}$/.test(reuseParentUid)) {
        return response(res, 409, { ok: false, error: 'Select a different verified parent login for this learner.' });
      }
      const exactTargetEmail = reuseParentEmail ? exactParentEmail(reuseParentEmail) : '';
      const oldProfileRef = db.doc(`users/${oldUid}`);
      const targetProfileRef = db.doc(`users/${reuseParentUid}`);
      const [oldProfile, oldAuth, targetProfile, targetAuth, linkedStudents, parentUidStudents, oldLinks, targetLinks, learnerLogins] = await Promise.all([
        oldProfileRef.get(), auth.getUser(oldUid).catch(error => error?.code === 'auth/user-not-found' ? null : Promise.reject(error)),
        targetProfileRef.get(), auth.getUser(reuseParentUid).catch(error => error?.code === 'auth/user-not-found' ? null : Promise.reject(error)),
        db.collection('students').where('parentLoginInfo.uid', '==', oldUid).get(),
        db.collection('students').where('parentUids', 'array-contains', oldUid).get(),
        db.collection('guardian_links').where('parentUid', '==', oldUid).get(),
        db.collection('guardian_links').where('parentUid', '==', reuseParentUid).get(),
        db.collection('students').where('loginInfo.uid', '==', oldUid).get()
      ]);
      const targetIsLinked = targetLinks.docs.some(link => link.data().organizationId === organizationId && link.data().status === 'active' &&
        link.id === `${reuseParentUid}_${link.data().subjectId}`);
      if (!oldAuth || oldAuth.disabled || (oldAuth.customClaims?.role && oldAuth.customClaims.role !== 'parent') ||
        oldAuth.email?.toLowerCase() !== oldEmail.toLowerCase() ||
        !oldTransferFactsValid({ profile: oldProfile, recorded: linkedStudents, uidStudents: parentUidStudents, links: oldLinks, learnerLogins },
          oldUid, oldEmail, student.id, organizationId, verifiedName) ||
        !targetAuth || targetAuth.disabled || !targetAuth.email || !targetProfile.exists ||
        targetProfile.data().role !== 'parent' || targetProfile.data().status !== 'active' || targetProfile.data().organizationId !== organizationId ||
        targetProfile.data().email?.toLowerCase() !== targetAuth.email.toLowerCase() ||
        (exactTargetEmail && targetAuth.email.toLowerCase() !== exactTargetEmail) ||
        cleanName(targetProfile.data().name) !== verifiedName || !targetIsLinked) {
        return response(res, 409, { ok: false, error: 'These parent logins have other or inconsistent family links. Review them before consolidating.' });
      }
      await db.runTransaction(async transaction => {
        const [currentStudent, currentOldProfile, currentTargetProfile, currentLinkedStudents, currentUidStudents, currentOldLinks, currentTargetLinks, currentLearnerLogins] = await Promise.all([
          transaction.get(studentRef), transaction.get(oldProfileRef), transaction.get(targetProfileRef),
          transaction.get(db.collection('students').where('parentLoginInfo.uid', '==', oldUid)),
          transaction.get(db.collection('students').where('parentUids', 'array-contains', oldUid)),
          transaction.get(db.collection('guardian_links').where('parentUid', '==', oldUid)),
          transaction.get(db.collection('guardian_links').where('parentUid', '==', reuseParentUid)),
          transaction.get(db.collection('students').where('loginInfo.uid', '==', oldUid))
        ]);
        if (!currentStudent.exists || currentStudent.data().organizationId !== organizationId ||
          currentStudent.data().parentLoginInfo?.uid !== oldUid ||
          currentStudent.data().parentLoginInfo?.email?.toLowerCase() !== oldEmail.toLowerCase() ||
          cleanName(currentStudent.data().parentName) !== recordedParentName ||
          !oldTransferFactsValid({ profile: currentOldProfile, recorded: currentLinkedStudents, uidStudents: currentUidStudents,
            links: currentOldLinks, learnerLogins: currentLearnerLogins }, oldUid, oldEmail, student.id, organizationId, verifiedName) ||
          !currentTargetProfile.exists || currentTargetProfile.data().role !== 'parent' || currentTargetProfile.data().status !== 'active' ||
          currentTargetProfile.data().organizationId !== organizationId ||
          currentTargetProfile.data().email?.toLowerCase() !== targetAuth.email.toLowerCase() ||
          cleanName(currentTargetProfile.data().name) !== verifiedName ||
          !currentTargetLinks.docs.some(link => link.data().organizationId === organizationId && link.data().status === 'active' &&
            link.id === `${reuseParentUid}_${link.data().subjectId}`)) {
          throw Object.assign(new Error('Parent access changed. Refresh the learner record.'), { status: 409 });
        }
        if (currentOldProfile.exists) transaction.update(oldProfileRef, { status: 'inactive', updatedAt: FieldValue.serverTimestamp() });
        transaction.update(studentRef, {
          parentLoginInfo: { uid: reuseParentUid, email: targetAuth.email },
          parentUids: [...new Set([...(Array.isArray(currentStudent.data().parentUids) ? currentStudent.data().parentUids : []).filter(uid => uid !== oldUid), reuseParentUid])],
          ...(!cleanName(currentStudent.data().parentName) ? { parentName: verifiedName } : {})
        });
        for (const subjectId of guardianSubjects({ id: student.id, ...currentStudent.data() })) {
          transaction.set(db.doc(`guardian_links/${reuseParentUid}_${subjectId}`), {
            organizationId, parentUid: reuseParentUid, studentId: student.id, subjectId,
            status: 'active', permissions, updatedAt: FieldValue.serverTimestamp()
          }, { merge: true });
        }
        for (const link of currentOldLinks.docs) {
          if (link.data().status === 'active') transaction.update(link.ref, { status: 'inactive', updatedAt: FieldValue.serverTimestamp() });
        }
      });
      await auth.revokeRefreshTokens(oldUid).catch(error => console.error('[parent-access] old token revocation failed', { code: error?.code || 'unknown' }));
      await auth.updateUser(oldUid, { disabled: true }).catch(error => console.error('[parent-access] old account disable failed', { code: error?.code || 'unknown' }));
      return response(res, 200, { ok: true, action, email: targetAuth.email, linkedLearnerCount: 1 });
    }
    if (action === 'repairStaffLink') {
      const oldUid = student.parentLoginInfo?.uid;
      const oldEmail = student.parentLoginInfo?.email;
      const confirmedParentName = typeof parentName === 'string' ? parentName.trim().replace(/\s+/g, ' ') : '';
      if (!recordedParentName || confirmedParentName !== recordedParentName || !oldUid || !oldEmail) {
        return response(res, 409, { ok: false, error: 'Refresh the learner and verify the recorded parent before repairing access.' });
      }
      const oldProfileRef = db.doc(`users/${oldUid}`);
      const [oldProfile, oldAuth, linkedStudents, parentUidStudents, oldLinks] = await Promise.all([
        oldProfileRef.get(), auth.getUser(oldUid).catch(error => error?.code === 'auth/user-not-found' ? null : Promise.reject(error)),
        db.collection('students').where('parentLoginInfo.uid', '==', oldUid).get(),
        db.collection('students').where('parentUids', 'array-contains', oldUid).get(),
        db.collection('guardian_links').where('parentUid', '==', oldUid).get()
      ]);
      if (!oldAuth || !oldProfile.exists || !staffRoles.has(oldProfile.data().role) ||
        oldProfile.data().status !== 'active' || oldProfile.data().organizationId !== organizationId ||
        oldAuth.email?.toLowerCase() !== oldEmail.toLowerCase() ||
        oldProfile.data().email?.toLowerCase() !== oldEmail.toLowerCase() ||
        linkedStudents.size !== 1 || linkedStudents.docs[0].id !== student.id ||
        parentUidStudents.docs.some(item => item.id !== student.id || item.data().organizationId !== organizationId) ||
        oldLinks.docs.some(item => item.data().status === 'active')) {
        return response(res, 409, { ok: false, error: 'The staff login has other or inconsistent family links. Review them before repairing this learner.' });
      }
      const issued = await createIssuedParent(auth, aliasBasis, recordedParentName);
      try {
        await db.runTransaction(async transaction => {
          const [currentStudent, currentProfile, currentLinkedStudents, currentUidStudents, currentLinks] = await Promise.all([
            transaction.get(studentRef), transaction.get(oldProfileRef),
            transaction.get(db.collection('students').where('parentLoginInfo.uid', '==', oldUid)),
            transaction.get(db.collection('students').where('parentUids', 'array-contains', oldUid)),
            transaction.get(db.collection('guardian_links').where('parentUid', '==', oldUid))
          ]);
          if (!currentStudent.exists || currentStudent.data().organizationId !== organizationId ||
            currentStudent.data().parentLoginInfo?.uid !== oldUid ||
            currentStudent.data().parentLoginInfo?.email?.toLowerCase() !== oldEmail.toLowerCase() ||
            String(currentStudent.data().parentName || '').trim().replace(/\s+/g, ' ') !== recordedParentName ||
            !currentProfile.exists || !staffRoles.has(currentProfile.data().role) ||
            currentProfile.data().status !== 'active' || currentProfile.data().organizationId !== organizationId ||
            currentProfile.data().email?.toLowerCase() !== oldEmail.toLowerCase() ||
            currentLinkedStudents.size !== 1 || currentLinkedStudents.docs[0].id !== student.id ||
            currentUidStudents.docs.some(item => item.id !== student.id || item.data().organizationId !== organizationId) ||
            currentLinks.docs.some(item => item.data().status === 'active')) {
            throw Object.assign(new Error('Parent access changed. Refresh the learner record.'), { status: 409 });
          }
          transaction.create(db.doc(`users/${issued.uid}`), {
            uid: issued.uid, organizationId, email: issued.email, name: recordedParentName,
            role: 'parent', status: 'active', accessVersion: 2, createdAt: FieldValue.serverTimestamp()
          });
          transaction.update(studentRef, {
            parentLoginInfo: { uid: issued.uid, email: issued.email },
            parentUids: [...new Set([...(Array.isArray(currentStudent.data().parentUids) ? currentStudent.data().parentUids : []).filter(uid => uid !== oldUid), issued.uid])]
          });
          for (const subjectId of guardianSubjects({ id: student.id, ...currentStudent.data() })) {
            transaction.create(db.doc(`guardian_links/${issued.uid}_${subjectId}`), {
              organizationId, parentUid: issued.uid, studentId: student.id, subjectId,
              status: 'active', permissions, updatedAt: FieldValue.serverTimestamp()
            });
          }
        });
      } catch (error) {
        await auth.deleteUser(issued.uid).catch(() => {});
        throw error;
      }
      return response(res, 200, { ok: true, action, email: issued.email, password: issued.password, linkedLearnerCount: 1 });
    }
    if (action === 'replace') {
      const oldUid = student.parentLoginInfo?.uid;
      const oldEmail = student.parentLoginInfo?.email;
      const confirmedParentName = typeof parentName === 'string' ? parentName.trim().replace(/\s+/g, ' ') : '';
      if (!recordedParentName || confirmedParentName !== recordedParentName) {
        return response(res, 400, { ok: false, error: 'Verify the recorded parent name before replacing a login.' });
      }
      if (!oldUid || !oldEmail) return response(res, 409, { ok: false, error: 'No existing parent login is recorded. Refresh the learner record.' });
      const oldProfileRef = db.doc(`users/${oldUid}`);
      const [oldProfile, oldAuth, linkedStudents, parentUidStudents, oldLinks] = await Promise.all([
        oldProfileRef.get(), auth.getUser(oldUid).catch(error => error?.code === 'auth/user-not-found' ? null : Promise.reject(error)),
        db.collection('students').where('parentLoginInfo.uid', '==', oldUid).get(),
        db.collection('students').where('parentUids', 'array-contains', oldUid).get(),
        db.collection('guardian_links').where('parentUid', '==', oldUid).get()
      ]);
      if (oldProfile.exists && staffRoles.has(oldProfile.data().role)) {
        return response(res, 409, { ok: false, code: 'staff_login_mislinked', error: 'The recorded parent login belongs to a staff account. Replace only this learner’s mistaken link and keep the staff login active.' });
      }
      if (!oldAuth || !oldProfile.exists || oldProfile.data().role !== 'parent' ||
        oldProfile.data().status !== 'active' || oldProfile.data().organizationId !== organizationId ||
        oldAuth.email?.toLowerCase() !== oldEmail.toLowerCase() ||
        oldProfile.data().email?.toLowerCase() !== oldEmail.toLowerCase() ||
        String(oldProfile.data().name || '').trim().replace(/\s+/g, ' ') !== recordedParentName) {
        return response(res, 409, { ok: false, error: 'The existing parent account needs an administrator identity check before replacement.' });
      }
      const family = linkedStudents.docs;
      const familyIds = new Set(family.map(item => item.id));
      if (!familyIds.has(student.id) || family.some(item => item.data().organizationId !== organizationId ||
        String(item.data().parentName || '').trim().replace(/\s+/g, ' ') !== recordedParentName) ||
        parentUidStudents.docs.some(item => !familyIds.has(item.id) || item.data().organizationId !== organizationId) ||
        oldLinks.docs.some(item => item.data().status === 'active' &&
          (!familyIds.has(item.data().studentId) || item.data().organizationId !== organizationId))) {
        return response(res, 409, { ok: false, error: 'This parent has other or inconsistent learner links. Review the family links before replacement.' });
      }
      const issued = await createIssuedParent(auth, aliasBasis, recordedParentName);
      try {
        await db.runTransaction(async transaction => {
          const [currentProfile, currentLinkedStudents, currentUidStudents, currentOldLinks] = await Promise.all([
            transaction.get(oldProfileRef),
            transaction.get(db.collection('students').where('parentLoginInfo.uid', '==', oldUid)),
            transaction.get(db.collection('students').where('parentUids', 'array-contains', oldUid)),
            transaction.get(db.collection('guardian_links').where('parentUid', '==', oldUid))
          ]);
          const currentFamily = currentLinkedStudents.docs;
          const currentFamilyIds = new Set(currentFamily.map(item => item.id));
          if (!currentProfile.exists || currentProfile.data().role !== 'parent' ||
            currentProfile.data().status !== 'active' || currentProfile.data().organizationId !== organizationId ||
            String(currentProfile.data().name || '').trim().replace(/\s+/g, ' ') !== recordedParentName ||
            currentFamilyIds.size !== familyIds.size || [...familyIds].some(id => !currentFamilyIds.has(id)) ||
            currentFamily.some(item => !item.exists || item.data().organizationId !== organizationId ||
              item.data().parentLoginInfo?.uid !== oldUid ||
              String(item.data().parentName || '').trim().replace(/\s+/g, ' ') !== recordedParentName) ||
            currentUidStudents.docs.some(item => !currentFamilyIds.has(item.id) || item.data().organizationId !== organizationId) ||
            currentOldLinks.docs.some(item => item.data().status === 'active' &&
              (!currentFamilyIds.has(item.data().studentId) || item.data().organizationId !== organizationId))) {
            throw Object.assign(new Error('Parent access changed. Refresh the learner record.'), { status: 409 });
          }
          transaction.create(db.doc(`users/${issued.uid}`), {
            uid: issued.uid, organizationId, email: issued.email, name: recordedParentName,
            role: 'parent', status: 'active', accessVersion: 2, createdAt: FieldValue.serverTimestamp()
          });
          transaction.update(oldProfileRef, { status: 'inactive', updatedAt: FieldValue.serverTimestamp() });
          for (const item of currentFamily) {
            const data = item.data();
            const parentUids = [...new Set([...(Array.isArray(data.parentUids) ? data.parentUids : []).filter(uid => uid !== oldUid), issued.uid])];
            transaction.update(item.ref, { parentLoginInfo: { uid: issued.uid, email: issued.email }, parentUids });
            for (const subjectId of guardianSubjects({ id: item.id, ...data })) {
              transaction.set(db.doc(`guardian_links/${issued.uid}_${subjectId}`), {
                organizationId, parentUid: issued.uid, studentId: item.id, subjectId,
                status: 'active', permissions, updatedAt: FieldValue.serverTimestamp()
              }, { merge: true });
            }
          }
          for (const link of currentOldLinks.docs) {
            if (link.data().status === 'active') transaction.update(link.ref, { status: 'inactive', updatedAt: FieldValue.serverTimestamp() });
          }
        });
      } catch (error) {
        await auth.deleteUser(issued.uid).catch(() => {});
        throw error;
      }
      await auth.revokeRefreshTokens(oldUid).catch(error => console.error('[parent-access] old token revocation failed', { code: error?.code || 'unknown' }));
      await auth.updateUser(oldUid, { disabled: true }).catch(error => console.error('[parent-access] old account disable failed', { code: error?.code || 'unknown' }));
      return response(res, 200, { ok: true, action, email: issued.email, password: issued.password, linkedLearnerCount: family.length });
    }
    if (student.parentLoginInfo?.uid) return response(res, 409, { ok: false, error: 'This learner already has parent access. Use reset for that account.' });
    let uid;
    let email;
    let password;
    let created = false;
    const confirmedParentName = cleanName(parentName);
    let verifiedParentName = confirmedParentName;
    if (action === 'link') {
      if (!recordedParentName && !confirmedParentName) {
        return response(res, 400, { ok: false, error: 'Enter and verify the parent’s full name before linking this learner.' });
      }
      const exactEmail = reuseParentEmail ? exactParentEmail(reuseParentEmail) : '';
      const user = exactEmail ? await authUserByEmail(auth, exactEmail) :
        (typeof reuseParentUid === 'string' && /^[A-Za-z0-9_-]{1,160}$/.test(reuseParentUid)
          ? await auth.getUser(reuseParentUid).catch(error => error?.code === 'auth/user-not-found' ? null : Promise.reject(error)) : null);
      if (!user || user.disabled || (reuseParentUid && reuseParentUid !== user.uid) ||
        (exactEmail && user.email?.toLowerCase() !== exactEmail) || !(await linkedParent(db, user.uid, organizationId))) {
        return response(res, 403, { ok: false, error: 'Select an existing verified parent account in this workspace.' });
      }
      uid = user.uid;
      email = user.email;
      if (!email) return response(res, 409, { ok: false, error: 'The existing parent account has no login email.' });
      const profile = await db.doc(`users/${uid}`).get();
      const accountName = cleanName(profile.data()?.name);
      if (!accountName || (recordedParentName && recordedParentName !== accountName) ||
        (confirmedParentName && confirmedParentName !== accountName)) {
        return response(res, 409, { ok: false, error: 'The verified parent name does not match the existing family login.' });
      }
      verifiedParentName = accountName;
    } else {
      if (!confirmedParentName || (recordedParentName && confirmedParentName !== recordedParentName)) {
        return response(res, 400, { ok: false, error: 'Verify the recorded parent name before issuing a login.' });
      }
      const issued = await createIssuedParent(auth, aliasBasis, confirmedParentName);
      ({ uid, email, password } = issued);
      created = true;
    }

    try {
      await db.runTransaction(async transaction => {
        const [currentStudent, currentParentProfile, currentParentLinks] = await Promise.all([
          transaction.get(studentRef),
          action === 'link' ? transaction.get(db.doc(`users/${uid}`)) : Promise.resolve(null),
          action === 'link' ? transaction.get(db.collection('guardian_links').where('parentUid', '==', uid)) : Promise.resolve(null)
        ]);
        if (!currentStudent.exists || currentStudent.data().organizationId !== organizationId || currentStudent.data().parentLoginInfo?.uid) {
          throw Object.assign(new Error('Parent access changed. Refresh the learner record.'), { status: 409 });
        }
        if (action === 'link' && (!currentParentProfile?.exists || currentParentProfile.data().role !== 'parent' ||
          currentParentProfile.data().organizationId !== organizationId || currentParentProfile.data().status !== 'active' ||
          currentParentProfile.data().email?.toLowerCase() !== email.toLowerCase() ||
          cleanName(currentParentProfile.data().name) !== verifiedParentName ||
          !currentParentLinks?.docs.some(item => item.data().organizationId === organizationId && item.data().status === 'active' &&
            item.id === `${uid}_${item.data().subjectId}`))) {
          throw Object.assign(new Error('Existing family login changed. Verify it again.'), { status: 409 });
        }
        const currentName = cleanName(currentStudent.data().parentName);
        if ((created && currentName !== recordedParentName) ||
          (action === 'link' && currentName && currentName !== verifiedParentName)) {
          throw Object.assign(new Error('Recorded parent name changed. Refresh the learner record.'), { status: 409 });
        }
        if (created) transaction.create(db.doc(`users/${uid}`), {
          uid, organizationId, email, name: confirmedParentName, role: 'parent', status: 'active', accessVersion: 2,
          createdAt: FieldValue.serverTimestamp()
        });
        transaction.update(studentRef, {
          parentLoginInfo: { uid, email }, parentUids: FieldValue.arrayUnion(uid),
          ...(!currentName ? { parentName: verifiedParentName } : {})
        });
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
