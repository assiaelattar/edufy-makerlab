import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import { deleteUnusedMission, inspectMissionRemoval, retireMission } from '../services/missionRemoval.ts';
import { saveMissionAudience } from '../services/profileAssignment.ts';
import { missionIsVisibleToLearner } from './missionAssignment.ts';

const projectId = process.env.GCLOUD_PROJECT;
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
assert.ok(projectId?.startsWith('demo-') && /^127\.0\.0\.1:\d+$/.test(firestoreHost || '') && /^127\.0\.0\.1:\d+$/.test(authHost || ''), 'Only explicit localhost demo Auth/Firestore emulators are allowed.');

const apps = [];
async function client(name, role, organizationId) {
  const app = initializeApp({ apiKey: 'fake-key', projectId, authDomain: `${projectId}.firebaseapp.com` }, name); apps.push(app);
  const auth = getAuth(app); connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
  const { user } = await createUserWithEmailAndPassword(auth, `${name}@example.test`, 'emulator-password');
  const fields = Object.fromEntries(Object.entries({ role, organizationId, status: 'active' }).map(([key, value]) => [key, { stringValue: value }]));
  const seed = await fetch(`http://${firestoreHost}/v1/projects/${projectId}/databases/(default)/documents/users/${user.uid}`, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
  assert.ok(seed.ok);
  const db = getFirestore(app); const [host, port] = firestoreHost.split(':'); connectFirestoreEmulator(db, host, Number(port));
  return { db, actor: { uid: user.uid, role, organizationId } };
}

try {
  const teacher = await client('removal-teacher', 'instructor', 'org-one');
  const learner = await client('removal-learner', 'student', 'org-one');
  const foreign = await client('removal-foreign', 'instructor', 'org-two');
  const base = { organizationId: 'org-one', title: 'Synthetic mission', status: 'draft', targetAudience: {} };
  await setDoc(doc(teacher.db, 'project_templates', 'unused'), base);
  assert.equal((await inspectMissionRemoval(teacher.db, 'unused', teacher.actor)).canDelete, true);
  await assert.rejects(deleteUnusedMission(learner.db, 'unused', learner.actor), /instructor/);
  await assert.rejects(deleteUnusedMission(foreign.db, 'unused', foreign.actor), /unavailable/);
  await deleteUnusedMission(teacher.db, 'unused', teacher.actor);
  assert.equal((await getDoc(doc(teacher.db, 'project_templates', 'unused'))).exists(), false);

  await setDoc(doc(teacher.db, 'project_templates', 'used'), { ...base, status: 'assigned', targetAudience: { students: ['student-a'] }, assignedAt: 'previous-dispatch' });
  const reviewHistory = [{ id: 'review-one', feedback: 'Keep testing', outcome: 'changes_requested' }];
  await setDoc(doc(teacher.db, 'student_projects', 'learner-work'), { organizationId: 'org-one', studentId: learner.actor.uid, templateId: 'used', status: 'building', reviewHistory });
  assert.equal((await inspectMissionRemoval(teacher.db, 'used', teacher.actor)).hasLearnerWork, true);
  await assert.rejects(deleteUnusedMission(teacher.db, 'used', teacher.actor), /retired/);
  await retireMission(teacher.db, 'used', teacher.actor);
  const retired = (await getDoc(doc(teacher.db, 'project_templates', 'used'))).data();
  assert.equal(retired.status, 'archived'); assert.equal(retired.retiredBy, teacher.actor.uid);
  assert.equal(missionIsVisibleToLearner(retired, { ownerIds: ['student-a'], programIds: [], gradeIds: [], groupIds: [] }), false);
  assert.deepEqual((await getDoc(doc(teacher.db, 'student_projects', 'learner-work'))).data().reviewHistory, reviewHistory);
  await assert.rejects(saveMissionAudience(teacher.db, 'used', { status: 'assigned' }, teacher.actor), /retired/);
  await assert.rejects(retireMission(foreign.db, 'used', foreign.actor), /unavailable/);
  console.log('Mission removal emulator passed: unused draft deletion, role and tenant denials, linked work and review preservation, retirement visibility, and blocked republishing.');
} finally { await Promise.all(apps.map(app => deleteApp(app))); }
