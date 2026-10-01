import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, getDoc, getDocs, collection, updateDoc, query, where } from 'firebase/firestore';
import { persistImportedMission, publishImportedMission } from '../services/missionImport.ts';
import { normalizeImportRow, sampleImportRow } from './missionImport.ts';

// Refuse to run without explicit isolated emulator configuration.
const projectId = process.env.GCLOUD_PROJECT;
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
assert.ok(projectId?.startsWith('demo-') && firestoreHost && authHost, 'Use demo-project Auth and Firestore emulators only.');
const seed = async (path, data) => {
  const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, { stringValue: v }]));
  const result = await fetch(`http://${firestoreHost}/v1/projects/${projectId}/databases/(default)/documents/${path}`, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
  assert.ok(result.ok, `seed ${path}`);
};
const clients = [];
const client = async (name, role, organizationId) => {
  const app = initializeApp({ apiKey: 'fake-key', projectId, authDomain: `${projectId}.firebaseapp.com` }, name);
  clients.push(app);
  const auth = getAuth(app); connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
  const user = await createUserWithEmailAndPassword(auth, `${name}@example.test`, 'emulator-password');
  const db = getFirestore(app); const [host, port] = firestoreHost.split(':'); connectFirestoreEmulator(db, host, Number(port));
  await seed(`users/${user.user.uid}`, { role, organizationId, status: 'active' });
  return { db, uid: user.user.uid };
};
const catalog = { stations: [{ id: 'Circuits', label: 'Circuits' }], workflows: [], programs: [{ id: 'stem', label: 'STEMQuest' }], grades: [], groups: [], students: [] };
const build = (importKey) => normalizeImportRow({ ...sampleImportRow, ImportKey: importKey, CoverFile: '', ResourcesJSON: '[]', AudiencePrograms: 'STEMQuest' }, 2, catalog);
try {
  const instructor = await client(`import-instructor-${Date.now()}`, 'instructor', 'org-import');
  const student = await client(`import-student-${Date.now()}`, 'student', 'org-import');
  const mission = build('qa-import-v1');
  const simultaneous = await Promise.all([persistImportedMission(instructor.db, 'org-import', instructor.uid, mission, catalog, 'test.csv'), persistImportedMission(instructor.db, 'org-import', instructor.uid, mission, catalog, 'test.csv')]);
  assert.deepEqual(simultaneous.map(r => r.state).sort(), ['created', 'exists']);
  const id = simultaneous[0].id;
  let stored = (await getDoc(doc(instructor.db, 'project_templates', id))).data();
  assert.equal(stored.status, 'draft'); assert.equal(stored.organizationId, 'org-import'); assert.equal(stored.createdBy, instructor.uid);
  assert.equal(stored.workflowSnapshot.phases.length, 2);
  const workflowId = stored.defaultWorkflowId;
  assert.equal((await getDoc(doc(instructor.db, 'process_templates', workflowId))).data().organizationId, 'org-import');
  await updateDoc(doc(instructor.db, 'process_templates', workflowId), { name: 'Edited later' });
  stored = (await getDoc(doc(instructor.db, 'project_templates', id))).data();
  assert.notEqual(stored.workflowSnapshot.name, 'Edited later');
  const different = build('qa-import-v1'); different.mission.title = 'Different title';
  const retry = await persistImportedMission(instructor.db, 'org-import', instructor.uid, different, catalog, 'other.csv');
  assert.equal(retry.state, 'exists'); assert.match(retry.message, /different content/);
  assert.equal((await getDoc(doc(instructor.db, 'project_templates', id))).data().title, mission.mission.title);
  await publishImportedMission(instructor.db, 'org-import', instructor.uid, id);
  assert.equal((await getDoc(doc(instructor.db, 'project_templates', id))).data().status, 'assigned');
  assert.equal((await getDocs(query(collection(instructor.db, 'enrollments'), where('organizationId', '==', 'org-import')))).size, 0);
  const incomplete = build('qa-incomplete'); incomplete.mission.targetAudience = {};
  const draft = await persistImportedMission(instructor.db, 'org-import', instructor.uid, incomplete, catalog, 'test.csv');
  await assert.rejects(publishImportedMission(instructor.db, 'org-import', instructor.uid, draft.id), /Complete/);
  await assert.rejects(persistImportedMission(student.db, 'org-import', student.uid, build('student-write'), catalog, 'test.csv'));
  await assert.rejects(persistImportedMission(instructor.db, 'wrong-org', instructor.uid, build('cross-org'), catalog, 'test.csv'));
  const cross = build('foreign-workflow'); cross.workflow = undefined; cross.mission.defaultWorkflowId = workflowId;
  await seed(`process_templates/${workflowId}`, { organizationId: 'foreign-org', name: 'Foreign workflow' });
  await assert.rejects(persistImportedMission(instructor.db, 'org-import', instructor.uid, cross, catalog, 'test.csv'), /another organization/);
  console.log('Mission import emulator passed: atomic custom workflow + draft, concurrent repeat protection, immutable snapshot, existing-content preservation, explicit assignment, enrollment separation, incomplete assignment denial, student/cross-tenant write denial, foreign workflow rejection.');
} finally { await Promise.all(clients.map(app => deleteApp(app))); }
