import { getAuth } from 'firebase-admin/auth';
import { getFirebaseAdminApp } from '../../agent/_lib/firebaseAdmin.js';
import { assertRecipientIdentity } from '../../../modules/sparkquest/domain/recipientAccessPolicy.js';
import { SparkQuestLaunchError } from '../../../modules/sparkquest/domain/sparkquestLaunchPolicy.js';
import { loadLinkedStudents } from './bridgeAccess.js';

export const loadRecipientAccess = async (db, { studentId, organizationId, role, expectedUid }) => {
  const studentSnapshot = await db.doc(`students/${studentId}`).get();
  if (!studentSnapshot.exists || studentSnapshot.data().organizationId !== organizationId || studentSnapshot.data().status !== 'active') {
    throw new SparkQuestLaunchError('RECIPIENT_LEARNER_UNAVAILABLE', 'This learner is not active in the selected workspace.');
  }
  const student = { id: studentSnapshot.id, ...studentSnapshot.data() };
  const uid = role === 'parent' ? student.parentLoginInfo?.uid : student.loginInfo?.uid;
  if (!uid || (expectedUid && uid !== expectedUid)) {
    throw new SparkQuestLaunchError('RECIPIENT_ACCOUNT_CHANGED', 'The account link changed. Create a fresh link.');
  }
  const auth = getAuth(getFirebaseAdminApp());
  const [profileSnapshot, authUser, linkedStudents, guardianSnapshots] = await Promise.all([
    db.doc(`users/${uid}`).get(),
    auth.getUser(uid).catch(() => null),
    role === 'student' ? loadLinkedStudents(db, uid) : Promise.resolve([]),
    role === 'parent' ? Promise.all([student.id, student.loginInfo?.uid].filter(Boolean)
      .map(subjectId => db.doc(`guardian_links/${uid}_${subjectId}`).get())) : Promise.resolve([]),
  ]);
  const profile = profileSnapshot.exists ? { id: profileSnapshot.id, ...profileSnapshot.data() } : null;
  const guardianLinks = guardianSnapshots.filter(item => item.exists).map(item => ({ id: item.id, ...item.data() }));
  const access = assertRecipientIdentity({ role, uid, organizationId, student, profile, authUser, linkedStudents, guardianLinks });
  return { access, student };
};
