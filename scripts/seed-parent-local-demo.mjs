import assert from 'node:assert/strict';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID;
assert.equal(projectId, 'demo-parent-journey', 'This seed is restricted to the local parent journey demo.');
assert.match(process.env.FIREBASE_AUTH_EMULATOR_HOST || '', /^127\.0\.0\.1:\d+$/);
assert.match(process.env.FIRESTORE_EMULATOR_HOST || '', /^127\.0\.0\.1:\d+$/);

const app = initializeApp({ projectId }, 'parent-local-demo-seed');
const auth = getAuth(app);
const db = getFirestore(app);
const organizationId = 'makerlab-academy';
const staffEmail = 'staff.parent-demo@example.test';
const staffPassword = 'LocalDemoStaff!2026';
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Casablanca' });
const now = Timestamp.now();

let staff;
try { staff = await auth.getUserByEmail(staffEmail); }
catch (error) {
  if (error?.code !== 'auth/user-not-found') throw error;
  staff = await auth.createUser({ email: staffEmail, password: staffPassword, displayName: 'MakerLab Demo Staff' });
}

const batch = db.batch();
const put = (path, data) => batch.set(db.doc(path), data, { merge: true });
put(`organizations/${organizationId}`, {
  id: organizationId, name: 'MakerLab Academy · Local Demo', slug: 'makerlab',
  ownerUid: staff.uid, status: 'active', modules: { erp: true, sparkQuest: true }, createdAt: now
});
put(`users/${staff.uid}`, {
  uid: staff.uid, organizationId, email: staffEmail, name: 'MakerLab Demo Staff',
  role: 'owner', status: 'active', createdAt: now
});
for (const [id, name, parentName] of [
  ['maya-demo', 'Maya Maker', 'Samira Maker'],
  ['adam-demo', 'Adam Maker', 'Samira Maker'],
  ['noor-demo', 'Noor Explorer', 'Layla Explorer']
]) {
  put(`students/${id}`, {
    organizationId, name, parentName, parentPhone: '+212600000000',
    birthDate: id === 'maya-demo' ? '2015-05-12' : '2018-03-08', status: 'active', createdAt: now
  });
}
put('enrollments/maya-stemquest', {
  organizationId, studentId: 'maya-demo', studentName: 'Maya Maker',
  programId: 'stemquest-demo', programName: 'STEMQuest', packName: 'Mini Makers',
  paymentPlan: 'annual', totalAmount: 6000, paidAmount: 4000, balance: 2000,
  status: 'active', startDate: '2026-09-01', session: '2026-2027', createdAt: now
});
put('payments/maya-first', {
  organizationId, enrollmentId: 'maya-stemquest', studentName: 'Maya Maker',
  amount: 2000, date: '2026-09-01', method: 'cash', status: 'verified', createdAt: now
});
put('payments/maya-second', {
  organizationId, enrollmentId: 'maya-stemquest', studentName: 'Maya Maker',
  amount: 2000, date: '2026-10-01', method: 'virement', status: 'verified', createdAt: now
});
for (const [date, status] of [['2026-09-26', 'present'], ['2026-10-03', 'late'], [today, 'present']]) {
  put(`attendance/maya-${date}`, {
    organizationId, studentId: 'maya-demo', enrollmentId: 'maya-stemquest', date, status, createdAt: now
  });
}
put('student_projects/maya-plant-guardian', {
  organizationId, studentId: 'maya-demo', title: 'Build a smart plant guardian',
  description: 'A sensor that helps care for a plant.', station: 'Circuits', status: 'building',
  thumbnailUrl: '/mission-plant-guardian.svg',
  missionBrief: {
    goal: 'Make a small device that notices when a plant needs water.',
    whyItMatters: 'Sensors make invisible changes easier to understand.',
    finalOutcome: 'A working light alert with a wet and dry test.',
    materials: ['Moisture sensor', 'LED', 'Microcontroller']
  },
  resources: [{ id: 'guide', title: 'Sensor guide', type: 'image', url: '/mission-plant-guardian.svg', description: 'See the circuit before wiring it.' }],
  steps: [
    { id: 'observe', title: 'Observe the plant', status: 'done', objective: 'Notice what changes when the soil dries.', note: 'The soil felt dry after two days.', evidence: '/mission-plant-guardian.svg', evidenceMimeType: 'image/svg+xml' },
    { id: 'build', title: 'Build the alert', status: 'doing', objective: 'Wire the sensor and LED safely.', instructions: 'Disconnect the power before moving wires.', checklist: ['Connect the sensor', 'Test the LED'], resources: [{ id: 'wiring', title: 'Wiring reference', type: 'image', url: '/mission-plant-guardian.svg' }] },
    { id: 'test', title: 'Test wet and dry soil', status: 'todo', objective: 'Prove the alert responds to moisture.' }
  ],
  commits: [], skills: ['Circuits', 'Testing'], feedback: 'A clear first observation. Next, test the sensor twice.', createdAt: now
});
put('gallery_items/maya-bench-photo', {
  organizationId, studentId: 'maya-demo', type: 'image',
  url: 'http://127.0.0.1:5174/mission-plant-guardian.svg',
  caption: 'Testing the plant sensor in the workshop', createdAt: now
});
put('pickup_queue/maya-today', {
  organizationId, studentId: 'maya-demo', sessionDate: today,
  status: 'arrived', pickerName: 'Family guardian', createdAt: now
});
put('enrollments/noor-makerlab', {
  organizationId, studentId: 'noor-demo', studentName: 'Noor Explorer',
  programId: 'makerlab-demo', programName: 'MakerLab Explorers', packName: 'Young Inventors',
  paymentPlan: 'annual', totalAmount: 3000, paidAmount: 1000, balance: 2000,
  status: 'active', startDate: '2026-09-01', session: '2026-2027', createdAt: now
});
put('payments/noor-first', {
  organizationId, enrollmentId: 'noor-makerlab', studentName: 'Noor Explorer',
  amount: 1000, date: '2026-09-15', method: 'cash', status: 'verified', createdAt: now
});
put('attendance/noor-today', {
  organizationId, studentId: 'noor-demo', enrollmentId: 'noor-makerlab',
  date: today, status: 'present', createdAt: now
});
put('student_projects/noor-light-lab', {
  organizationId, studentId: 'noor-demo', title: 'Invent a light lab',
  description: 'Explore how switches can control a small light.',
  station: 'Circuits', status: 'building', thumbnailUrl: '/mission-plant-guardian.svg',
  missionBrief: {
    goal: 'Build a safe switch that turns an LED on and off.',
    whyItMatters: 'A small circuit can help explain how everyday devices work.',
    finalOutcome: 'A working LED switch with a short demonstration.',
    materials: ['LED', 'Battery pack', 'Switch']
  },
  resources: [{ id: 'light-guide', title: 'Circuit guide', type: 'image', url: '/mission-plant-guardian.svg' }],
  steps: [
    { id: 'plan', title: 'Draw the circuit', status: 'done', objective: 'Plan where the battery, switch and LED connect.', note: 'I drew the path before building.', evidence: '/mission-plant-guardian.svg', evidenceMimeType: 'image/svg+xml' },
    { id: 'test', title: 'Test the switch', status: 'doing', objective: 'Switch the LED on and off safely.' }
  ],
  commits: [], skills: ['Circuits'], feedback: 'The circuit plan is clear. Try your first switch test.', createdAt: now
});
put('gallery_items/noor-circuit-photo', {
  organizationId, studentId: 'noor-demo', type: 'image',
  url: 'http://127.0.0.1:5174/mission-plant-guardian.svg',
  caption: 'Noor planning the light circuit', createdAt: now
});
put('pickup_queue/noor-today', {
  organizationId, studentId: 'noor-demo', sessionDate: today,
  status: 'trip_announced', pickerName: 'Family guardian', createdAt: now
});
await batch.commit();
console.log('Local parent journey demo seeded.');
console.log(`Edufy staff: ${staffEmail} / ${staffPassword}`);
console.log('Maya and Adam can share one verified parent login. Noor Explorer is unissued for a new parent account walkthrough.');
