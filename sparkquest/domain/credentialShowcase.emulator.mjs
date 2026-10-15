import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { EmailAuthProvider, connectAuthEmulator, createUserWithEmailAndPassword, getAuth, reauthenticateWithCredential, signInAnonymously } from 'firebase/auth';
import { connectFirestoreEmulator, deleteDoc, doc, getDoc, getFirestore, updateDoc } from 'firebase/firestore';
import { initializeApp as initializeAdminApp, deleteApp as deleteAdminApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { deleteCredential, saveCredential } from '../services/credentialCabinet.ts';

const projectId = process.env.GCLOUD_PROJECT;
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
assert.ok(projectId?.startsWith('demo-') && /^127\.0\.0\.1:\d+$/.test(firestoreHost || '') && /^127\.0\.0\.1:\d+$/.test(authHost || ''), 'Only explicit localhost demo Auth/Firestore emulators are allowed.');

const [firestoreHostname, firestorePort] = firestoreHost.split(':');
const clientApps = [];
const adminApp = initializeAdminApp({ projectId }, `admin-${Date.now()}`);
const admin = getAdminFirestore(adminApp);

const connectClient = async (name, mode = 'password') => {
  const app = initializeApp({ apiKey: 'fake-key', projectId, authDomain: `${projectId}.firebaseapp.com` }, name);
  clientApps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
  const credential = mode === 'password'
    ? await createUserWithEmailAndPassword(auth, `${name}@example.test`, 'synthetic-password')
    : await signInAnonymously(auth);
  const db = getFirestore(app);
  connectFirestoreEmulator(db, firestoreHostname, Number(firestorePort));
  return { auth, db, user: credential.user };
};

const project = (studentId, templateId) => ({
  organizationId: 'org-synthetic', studentId, templateId, title: 'Synthetic project', description: '', station: 'Lab',
  status: 'building', reviewProtocolVersion: 1, steps: [], skills: [], resources: [], commits: [],
});

try {
  const learner = await connectClient('credential-showcase-learner');
  await admin.doc(`users/${learner.user.uid}`).set({ role: 'student', organizationId: 'org-synthetic', status: 'active', credentials: [] });
  await admin.doc('students/student-synthetic').set({ organizationId: 'org-synthetic', name: 'Synthetic learner', loginInfo: { uid: learner.user.uid } });

  const first = { id: 'operation-one', service: 'Scratch', label: 'Same label', username: 'same-name', password: 'synthetic-key' };
  const second = { ...first, id: 'operation-two' };
  await saveCredential(learner.db, learner.user.uid, first);
  await saveCredential(learner.db, learner.user.uid, first);
  await saveCredential(learner.db, learner.user.uid, second);
  assert.deepEqual((await getDoc(doc(learner.db, 'users', learner.user.uid))).data().credentials.map(item => item.id), ['operation-one', 'operation-two']);
  await deleteCredential(learner.db, learner.user.uid, first.id);
  assert.deepEqual((await getDoc(doc(learner.db, 'users', learner.user.uid))).data().credentials.map(item => item.id), ['operation-two']);

  await admin.doc('student_projects/showcase-owned').set(project('student-synthetic', 'showcase-template'));
  await admin.doc('student_projects/assigned-owned').set(project('student-synthetic', 'assigned-mission-template'));
  await admin.doc('student_projects/showcase-foreign').set(project('another-student', 'showcase-template'));

  await assert.rejects(updateDoc(doc(learner.db, 'student_projects', 'assigned-owned'), { templateId: 'showcase-template' }), /permission|denied/i);
  await assert.rejects(deleteDoc(doc(learner.db, 'student_projects', 'assigned-owned')), /permission|denied/i);
  await assert.rejects(deleteDoc(doc(learner.db, 'student_projects', 'showcase-foreign')), /permission|denied/i);
  await reauthenticateWithCredential(learner.user, EmailAuthProvider.credential(learner.user.email, 'synthetic-password'));
  await learner.user.getIdToken(true);
  await deleteDoc(doc(learner.db, 'student_projects', 'showcase-owned'));
  assert.equal((await admin.doc('student_projects/showcase-owned').get()).exists, false);

  const kiosk = await connectClient('credential-showcase-kiosk', 'anonymous');
  await admin.doc(`users/${kiosk.user.uid}`).set({ role: 'student', organizationId: 'org-synthetic', status: 'active' });
  await admin.doc('students/kiosk-student').set({ organizationId: 'org-synthetic', name: 'Synthetic kiosk learner', loginInfo: { uid: kiosk.user.uid } });
  await admin.doc('student_projects/showcase-kiosk').set(project('kiosk-student', 'showcase-template'));
  await assert.rejects(deleteDoc(doc(kiosk.db, 'student_projects', 'showcase-kiosk')), /permission|denied/i);
  assert.equal((await admin.doc('student_projects/showcase-kiosk').get()).exists, true);

  console.log('Credential and Showcase emulator passed: idempotent exact-ID key writes/deletion, owned Showcase deletion after password reauth, assigned/foreign denial, immutable template identity, and non-password session denial.');
} finally {
  await Promise.all(clientApps.map(app => deleteApp(app)));
  await deleteAdminApp(adminApp);
}
