import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import {
  addDoc,
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  connectStorageEmulator,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from 'firebase/storage';

const projectId = process.env.GCLOUD_PROJECT || 'demo-sparkquest';
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const storageHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST || '127.0.0.1:9199';
const skipStorage = process.env.SKIP_STORAGE_EMULATOR === 'true';
const organizationId = 'org-pipeline';

const firebaseConfig = {
  apiKey: 'fake-api-key',
  authDomain: `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket: `${projectId}.appspot.com`,
};

const toValue = value => {
  if (value === null) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (Number.isInteger(value)) return { integerValue: String(value) };
  if (typeof value === 'number') return { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toValue) } };
  return { mapValue: { fields: toFields(value) } };
};

const toFields = value => Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toValue(item)]));

const seedDocument = async (path, data) => {
  const response = await fetch(`http://${firestoreHost}/v1/projects/${projectId}/databases/(default)/documents/${path}`, {
    method: 'PATCH',
    headers: {
      Authorization: 'Bearer owner',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields: toFields(data) }),
  });
  if (!response.ok) throw new Error(`Could not seed ${path}: ${response.status} ${await response.text()}`);
};

const createClient = async (label, email, role) => {
  const app = initializeApp(firebaseConfig, label);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
  const credential = await createUserWithEmailAndPassword(auth, email, 'pipeline-test-password');
  const db = getFirestore(app);
  const [firestoreHostname, firestorePort] = firestoreHost.split(':');
  connectFirestoreEmulator(db, firestoreHostname, Number(firestorePort));
  const storage = getStorage(app);
  if (!skipStorage) {
    const [storageHostname, storagePort] = storageHost.split(':');
    connectStorageEmulator(storage, storageHostname, Number(storagePort));
  }
  await seedDocument(`users/${credential.user.uid}`, {
    uid: credential.user.uid,
    email,
    name: label,
    role,
    organizationId,
    status: 'active',
  });
  return { app, auth, db, storage, uid: credential.user.uid };
};

const expectDenied = async (operation, label) => {
  let denied = false;
  try {
    await operation();
  } catch (error) {
    denied = String(error?.code || error).includes('permission-denied') ||
      String(error?.code || error).includes('storage/unauthorized');
  }
  assert.equal(denied, true, label);
};

const clients = [];

try {
  const student = await createClient('pipeline-student', 'student.pipeline@example.test', 'student');
  const otherStudent = await createClient('pipeline-other', 'other.pipeline@example.test', 'student');
  const instructor = await createClient('pipeline-instructor', 'instructor.pipeline@example.test', 'instructor');
  clients.push(student, otherStudent, instructor);

  const studentRecordId = 'student-record-1';
  await seedDocument(`students/${studentRecordId}`, {
    organizationId,
    name: 'Pipeline Student',
    loginInfo: { uid: student.uid },
  });

  const linkedStudentQuery = query(
    collection(student.db, 'students'),
    where('loginInfo.uid', '==', student.uid),
    where('organizationId', '==', organizationId)
  );
  const linkedStudentSnapshot = await getDocs(linkedStudentQuery);
  assert.equal(linkedStudentSnapshot.size, 1,
    'student can resolve their own learner profile with the constrained account-link query');

  const missionRef = await addDoc(collection(instructor.db, 'project_templates'), {
    organizationId,
    title: 'Instructor mission',
    description: 'Pipeline proof',
    status: 'assigned',
    targetAudience: { students: [studentRecordId], grades: ['grade-other'] },
  });
  assert.equal((await getDoc(doc(student.db, 'project_templates', missionRef.id))).exists(), true,
    'student can read an instructor-created mission');

  for (const [collectionName, payload] of [
    ['process_templates', { name: 'Design loop', description: 'Discover and build', phases: [] }],
    ['stations', { label: 'Robotics lab', description: 'Build station', order: 0 }],
    ['badges', { name: 'Builder', description: 'Completed a build', criteria: { type: 'project_count', target: 'all', count: 1 } }],
    ['tool_links', { title: 'Tinkercad', url: 'https://www.tinkercad.com', category: 'design', description: 'CAD tool' }],
    ['assets', { name: 'Micro:bit', category: 'electronics', status: 'available' }],
  ]) {
    const configRef = await addDoc(collection(instructor.db, collectionName), { organizationId, ...payload });
    assert.equal((await getDoc(configRef)).data().organizationId, organizationId,
      `instructor can create tenant-scoped ${collectionName}`);
  }

  await expectDenied(
    () => addDoc(collection(instructor.db, 'badges'), { name: 'Missing organization' }),
    'instructor configuration writes without an organization are denied'
  );

  const projectRef = await addDoc(collection(student.db, 'student_projects'), {
    organizationId,
    studentId: studentRecordId,
    academicYearId: '2026-2027',
    templateId: missionRef.id,
    title: 'Student mission project',
    description: 'Created by learner',
    station: 'general',
    status: 'planning',
    steps: [],
    commits: [],
    skills: [],
    resources: [],
  });
  assert.equal((await getDoc(projectRef)).exists(), true, 'student can create and read a canonical learner project');

  await updateDoc(projectRef, {
    status: 'building',
    steps: [{ id: 'step-1', title: 'Build', status: 'PENDING_REVIEW', evidence: 'https://example.test/evidence.png' }],
  });
  assert.equal((await getDoc(projectRef)).data().steps[0].status, 'PENDING_REVIEW',
    'student can update steps and attach evidence metadata');

  const focusRef = await addDoc(collection(student.db, 'focus_sessions'), {
    organizationId,
    studentId: studentRecordId,
    date: '2026-09-24',
    duration: 5,
    stats: { missionsWorked: 1, arcadeGames: 0, xpEarned: 0, stepsCompleted: 1 },
  });
  assert.equal((await getDoc(focusRef)).exists(), true, 'canonical learner focus session is permitted');
  const focusQuery = query(
    collection(student.db, 'focus_sessions'),
    where('studentId', '==', studentRecordId),
    where('organizationId', '==', organizationId)
  );
  assert.equal((await getDocs(focusQuery)).size, 1, 'student can list their canonical focus sessions');

  if (!skipStorage) {
    const uploadRef = ref(student.storage, `student-projects/${organizationId}/${student.uid}/${projectRef.id}/evidence.png`);
    await uploadBytes(uploadRef, new Uint8Array([137, 80, 78, 71]), { contentType: 'image/png' });
    assert.match(await getDownloadURL(uploadRef), /^http:/, 'student evidence upload returns a download URL');

    const studentPdfRef = ref(student.storage, `student-projects/${organizationId}/${student.uid}/${projectRef.id}/proof.pdf`);
    await uploadBytes(studentPdfRef, new Uint8Array([37, 80, 68, 70]), { contentType: 'application/pdf' });
    assert.match(await getDownloadURL(studentPdfRef), /^http:/, 'student PDF evidence upload returns a download URL');

    // Reproduce the actual Showcase UI transaction: upload a screenshot to the
    // Auth UID-owned path, then persist its public URL together with the learner
    // supplied project link and review status on the canonical student project.
    const showcaseRef = ref(
      student.storage,
      `student-projects/${organizationId}/${student.uid}/${projectRef.id}/showcase-plant-guardian.png`
    );
    await uploadBytes(showcaseRef, new Uint8Array([137, 80, 78, 71]), { contentType: 'image/png' });
    const showcaseUrl = await getDownloadURL(showcaseRef);
    await updateDoc(projectRef, {
      status: 'submitted',
      presentationUrl: 'https://example.test/student-project',
      thumbnailUrl: showcaseUrl,
      coverImage: showcaseUrl,
      mediaUrls: [showcaseUrl],
    });
    const submittedShowcase = (await getDoc(projectRef)).data();
    assert.equal(submittedShowcase.status, 'submitted', 'student can submit a showcase for instructor review');
    assert.equal(submittedShowcase.presentationUrl, 'https://example.test/student-project', 'showcase link is saved');
    assert.deepEqual(submittedShowcase.mediaUrls, [showcaseUrl], 'showcase media URL is saved');

    const legacyProjectId = 'legacy-showcase-without-tenant';
    await seedDocument(`student_projects/${legacyProjectId}`, {
      studentId: studentRecordId,
      templateId: 'showcase-template',
      title: 'Legacy learner showcase',
      description: 'Created before organization ownership was required',
      station: 'general',
      status: 'planning',
      steps: [],
      commits: [],
      skills: [],
      resources: [],
    });
    const legacyProjectRef = doc(student.db, 'student_projects', legacyProjectId);
    assert.equal((await getDoc(legacyProjectRef)).exists(), true, 'student can read their linked legacy showcase');
    await expectDenied(
      () => updateDoc(legacyProjectRef, { status: 'submitted', presentationUrl: 'https://example.test/legacy' }),
      'legacy showcase update is denied until the client restores tenant ownership'
    );
    await updateDoc(legacyProjectRef, {
      organizationId,
      status: 'submitted',
      presentationUrl: 'https://example.test/legacy',
      thumbnailUrl: showcaseUrl,
      coverImage: showcaseUrl,
      mediaUrls: [showcaseUrl],
    });
    const migratedLegacyShowcase = (await getDoc(legacyProjectRef)).data();
    assert.equal(migratedLegacyShowcase.organizationId, organizationId, 'legacy showcase is repaired with tenant ownership');
    assert.equal(migratedLegacyShowcase.status, 'submitted', 'repaired legacy showcase enters instructor review');
    assert.deepEqual(migratedLegacyShowcase.mediaUrls, [showcaseUrl], 'repaired legacy showcase keeps uploaded media');

    const instructorMediaRef = ref(instructor.storage, `instructor-projects/${organizationId}/${instructor.uid}/${missionRef.id}/briefing.mp4`);
    await uploadBytes(instructorMediaRef, new Uint8Array([0, 0, 0, 24]), { contentType: 'video/mp4' });
    assert.match(await getDownloadURL(instructorMediaRef), /^http:/, 'instructor mission media upload returns a download URL');
  }

  await expectDenied(
    () => getDoc(doc(otherStudent.db, 'student_projects', projectRef.id)),
    'another student cannot read the project'
  );
  if (!skipStorage) {
    await expectDenied(
      () => uploadBytes(
        ref(otherStudent.storage, `student-projects/${organizationId}/${student.uid}/${projectRef.id}/stolen.png`),
        new Uint8Array([1, 2, 3]),
        { contentType: 'image/png' }
      ),
      'another student cannot upload into the project owner path'
    );
    await expectDenied(
      () => uploadBytes(
        ref(student.storage, `instructor-projects/${organizationId}/${student.uid}/${missionRef.id}/forged.pdf`),
        new Uint8Array([1, 2, 3]),
        { contentType: 'application/pdf' }
      ),
      'student cannot upload into an instructor media path'
    );
  }

  console.log(`SparkQuest student pipeline emulator: ${skipStorage ? 14 : 27} assertions passed.`);
} finally {
  await Promise.all(clients.map(client => deleteApp(client.app)));
}
