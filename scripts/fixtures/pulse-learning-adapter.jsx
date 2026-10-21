import React, { useSyncExternalStore } from 'react';

const params = new URLSearchParams(location.search);
const empty = params.get('scenario') === 'empty';
const learner = params.get('role') === 'student' || (params.get('page') === 'portfolio' && params.get('role') !== 'staff');
const students = [{ id: 'learner-1', name: 'Alex Example', email: 'alex@example.invalid', status: 'active', badges: ['badge-1'] }, { id: 'learner-2', name: 'Sam Example', email: 'sam@example.invalid', status: 'active' }];
const projectTemplates = empty ? [] : [{ id: 'template-1', organizationId: 'synthetic-only', title: 'Build a weather station', description: 'Measure and explain the weather.', station: 'general', difficulty: 'beginner', status: 'active', targetAudience: { grades: [], groups: [] }, defaultSteps: ['Plan', 'Build', 'Test'], resources: [] }];
const studentProjects = empty ? [] : [
  { id: 'project-1', organizationId: 'synthetic-only', studentId: 'learner-1', studentName: 'Alex Example', title: 'Weather station prototype', status: 'submitted', station: 'general', templateId: 'template-1', steps: [{ id: 'step-1', title: 'Design sensor', status: 'done' }], commits: [{ id: 'commit-1', message: 'I tested the first sensor.', timestamp: { seconds: 1781800000 } }], mediaUrls: [] },
  { id: 'project-2', organizationId: 'synthetic-only', studentId: 'learner-2', studentName: 'Sam Example', title: 'Plant monitor', status: 'building', station: 'general', templateId: 'template-1', steps: [{ id: 'step-2', title: 'Build circuit', status: 'doing' }], commits: [], mediaUrls: [] },
  { id: 'project-3', organizationId: 'synthetic-only', studentId: 'learner-1', studentName: 'Alex Example', title: 'Solar model', status: 'published', station: 'general', templateId: 'template-1', steps: [{ id: 'step-3', title: 'Show prototype', status: 'done' }], commits: [], mediaUrls: [] }
];
const programs = [{ id: 'program-1', name: 'Maker program', status: 'active', grades: [{ id: 'grade-1', name: 'Grade 1', groups: [{ id: 'group-1', name: 'Group A' }] }] }];
const stations = empty ? [] : [{ id: 'station-1', label: 'Design Lab', name: 'Design Lab', color: 'blue', icon: 'Beaker', description: 'Plan and test projects.', order: 1, gradeIds: ['grade-1'], activeForGradeIds: ['grade-1'] }];
const badges = empty ? [] : [{ id: 'badge-1', name: 'First build', description: 'Completed a first project', icon: 'Award', color: 'blue', criteria: { type: 'project_count', target: 'all', count: 1 } }];
const processTemplates = empty ? [] : [{ id: 'workflow-1', name: 'Design process', description: 'Plan, build and test.', isDefault: true, phases: [{ id: 'phase-1', name: 'Plan', order: 1, color: 'blue', icon: 'Circle' }] }];
let action = '', pending = null, revision = 0;
const listeners = new Set();
const notify = () => { revision += 1; listeners.forEach(listener => listener()); };
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
const useRevision = () => useSyncExternalStore(subscribe, () => revision);
const record = value => { action = value; notify(); };
const queueWrite = (kind, apply, payload) => new Promise((resolveWrite, rejectWrite) => { pending = { kind, apply, payload, resolveWrite, rejectWrite }; record(`Pending synthetic ${kind}`); });
window.__pulseLearningQa = { pending: () => pending && { kind: pending.kind, payload: pending.payload }, projects: () => studentProjects };

export const db = { syntheticOnly: true };
export const useAuth = () => ({ user: { uid: learner ? 'learner-1' : 'fixture-staff' }, userProfile: { uid: learner ? 'learner-1' : 'fixture-staff', name: learner ? 'Alex Example' : 'Example Instructor', email: learner ? 'alex@example.invalid' : 'staff@example.invalid', role: learner ? 'student' : 'instructor', organizationId: 'synthetic-only' }, currentOrganization: { id: 'synthetic-only', name: 'Example School' }, can: () => !learner && params.get('role') !== 'readonly' });
export const useAppContext = () => { useRevision(); return { projectTemplates, studentProjects, students, enrollments: [{ id: 'enrollment-1', studentId: 'learner-1', programId: 'program-1', status: 'active' }], settings: { academyName: 'Example School', academicYear: '2026-2027', apiConfig: {} }, programs, sendNotification: (...args) => record(`Notification: ${args[0]}`), teamMembers: [], processTemplates, stations, badges }; };
export const useConfirm = () => ({ confirm: async () => true, alert: async (title, message) => record(`${title}: ${message}`) });
export const collection = (_db, name) => name;
export const doc = (_db, name, id) => ({ name, id });
export const query = (...args) => args;
export const where = (...args) => args;
export const orderBy = (...args) => args;
export const serverTimestamp = () => ({ seconds: 1781800000 });
export const Timestamp = { now: () => ({ seconds: 1781800000 }) };
export const onSnapshot = (_query, next) => { next({ docs: [], forEach: () => {} }); return () => {}; };
export const addDoc = (name, value) => queueWrite(`add ${name}`, () => { const list = name === 'project_templates' ? projectTemplates : name === 'student_projects' ? studentProjects : name === 'stations' ? stations : name === 'badges' ? badges : processTemplates; list.push({ ...value, id: `fixture-${list.length + 1}` }); }, value);
export const updateDoc = (ref, value) => queueWrite(`update ${ref.name}`, () => { const list = ref.name === 'project_templates' ? projectTemplates : ref.name === 'student_projects' ? studentProjects : ref.name === 'stations' ? stations : ref.name === 'badges' ? badges : processTemplates; const item = list.find(candidate => candidate.id === ref.id); if (item) Object.assign(item, value); }, value);
export const deleteDoc = ref => queueWrite(`delete ${ref.name}`, () => {});
export const writeBatch = () => ({ update: () => {}, delete: () => {}, commit: () => queueWrite('batch', () => {}) });
export const requestSparkQuestLaunch = async () => ({ url: 'about:blank' });
export const generateProjectImage = async () => 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
export const ProjectSelector = () => <p>Synthetic learner project selector.</p>;
export const NotificationBell = () => null;
export const FixtureControls = () => { useRevision(); return <aside aria-label="Synthetic QA controls" style={{ marginTop: 24, padding: 16, borderTop: '2px solid var(--ds-border)', color: 'var(--ds-ink)' }}><strong>Synthetic Learning QA · no school records</strong><p role="status">{action}</p>{pending && <div><span>Pending {pending.kind}</span> <button onClick={() => { const write = pending; pending = null; write.apply(); write.resolveWrite({ id: 'fixture-saved' }); record('Synthetic save complete'); }}>Simulate saved</button> <button onClick={() => { const write = pending; pending = null; write.rejectWrite(new Error('Synthetic connection failure')); record('Synthetic save failed'); }}>Simulate failure</button></div>}</aside>; };
