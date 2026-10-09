import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, connectFirestoreEmulator, deleteDoc, doc, getDoc, getDocs, getFirestore, query, setDoc, updateDoc, where } from 'firebase/firestore';

const projectId = process.env.GCLOUD_PROJECT;
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
assert.ok(projectId?.startsWith('demo-') && /^127\.0\.0\.1:\d+$/.test(firestoreHost || '') && /^127\.0\.0\.1:\d+$/.test(authHost || ''), 'Use explicit localhost demo Auth/Firestore emulators only.');

const apps = [];
const client = async (name, role, organizationId) => {
  const app = initializeApp({ apiKey: 'fake-key', projectId, authDomain: `${projectId}.firebaseapp.com` }, name);
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
  const credential = await createUserWithEmailAndPassword(auth, `${name}@example.test`, 'emulator-password');
  const uid = credential.user.uid;
  const fields = Object.fromEntries(Object.entries({ role, organizationId, status: 'active' }).map(([key, value]) => [key, { stringValue: value }]));
  const seed = await fetch(`http://${firestoreHost}/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  assert.ok(seed.ok);
  const db = getFirestore(app);
  const [host, port] = firestoreHost.split(':');
  connectFirestoreEmulator(db, host, Number(port));
  return { db, uid };
};

const expectDenied = async (operation, label) => assert.rejects(operation, error => {
  assert.equal(error?.code, 'permission-denied', `${label} should fail at the Firestore rule boundary.`);
  return true;
});

try {
  const organizationId = 'org-resource-library';
  const instructor = await client('resource-instructor', 'instructor', organizationId);
  const learner = await client('resource-learner', 'student', organizationId);
  const accountant = await client('resource-accountant', 'accountant', organizationId);
  const foreignLearner = await client('resource-foreign-learner', 'student', 'org-foreign');
  const foreignInstructor = await client('resource-foreign-instructor', 'instructor', 'org-foreign');
  const resourceRef = doc(instructor.db, 'resource_library', 'sensor-guide');
  const payload = {
    id: 'sensor-guide',
    libraryId: 'sensor-guide',
    organizationId,
    status: 'active',
    title: 'Sensor guide',
    type: 'file',
    url: 'https://example.test/sensor-guide.pdf',
  };

  await setDoc(resourceRef, payload);
  assert.equal((await getDoc(doc(learner.db, 'resource_library', 'sensor-guide'))).data()?.title, 'Sensor guide');
  assert.equal((await getDocs(query(collection(learner.db, 'resource_library'), where('organizationId', '==', organizationId)))).size, 1);
  assert.equal((await getDocs(query(collection(accountant.db, 'resource_library'), where('organizationId', '==', organizationId)))).size, 1);
  await expectDenied(getDoc(doc(foreignLearner.db, 'resource_library', 'sensor-guide')), 'Foreign learner read');
  await expectDenied(setDoc(doc(learner.db, 'resource_library', 'learner-forgery'), payload), 'Learner create');
  await expectDenied(updateDoc(doc(learner.db, 'resource_library', 'sensor-guide'), { title: 'Learner overwrite' }), 'Learner update');
  await expectDenied(setDoc(doc(accountant.db, 'resource_library', 'accountant-forgery'), payload), 'Non-review staff create');
  await expectDenied(setDoc(doc(foreignInstructor.db, 'resource_library', 'cross-tenant'), payload), 'Cross-tenant instructor create');
  await updateDoc(resourceRef, { title: 'Sensor guide v2' });
  assert.equal((await getDoc(resourceRef)).data()?.title, 'Sensor guide v2');
  await expectDenied(updateDoc(resourceRef, { organizationId: 'org-foreign' }), 'Tenant reassignment');
  await expectDenied(deleteDoc(resourceRef), 'Resource deletion');

  console.log('Resource library emulator passed: same-tenant learner/staff reads, instructor create/update, learner/non-review/cross-tenant write denials, tenant immutability, and deletion denial.');
} finally {
  await Promise.all(apps.map(app => deleteApp(app)));
}
