import { useSyncExternalStore } from 'react';

const params = new URLSearchParams(location.search);
const scenario = params.get('scenario') || 'populated';
const restricted = params.get('role') === 'instructor';
const fail = params.get('save') === 'error';
const listeners = new Set();
let revision = 0;
const emit = event => { window.__teamEvents.push(event); revision++; listeners.forEach(listener => listener()); };
window.__teamEvents = [];
window.__teamFixture = { events: window.__teamEvents };
const watch = () => useSyncExternalStore(listener => { listeners.add(listener); return () => listeners.delete(listener); }, () => revision);

const organizationId = 'synthetic-school';
let members = ['empty', 'loading'].includes(scenario) ? [] : [
  { uid: 'reviewer', organizationId, name: 'Alex Morgan', email: 'alex@example.test', role: restricted ? 'instructor' : 'admin', status: 'active', workHours: { start: '09:00', end: '17:00' } },
  { uid: 'owner', organizationId, name: 'Jordan Lee', email: 'jordan@example.test', role: 'owner', status: 'active' },
  { uid: 'instructor', organizationId, name: 'Sam Rivera', email: 'sam@example.test', role: 'instructor', status: 'active' },
  { uid: 'disabled', organizationId, name: 'Noor Aziz', email: 'noor@example.test', role: 'admission_officer', status: 'disabled' }
];
let tasks = ['empty', 'loading'].includes(scenario) ? [] : [
  { id: 'task-1', organizationId, title: 'Prepare welcome workshop', description: 'Set out kits and welcome families.', status: 'todo', priority: 'high', assignedTo: 'instructor', assignedToName: 'Sam Rivera', projectId: 'project-1', dueDate: '2026-10-22' },
  { id: 'task-2', organizationId, title: 'Review class materials', description: 'Check the robotics kit list.', status: 'in_progress', priority: 'medium', assignedTo: 'reviewer', assignedToName: 'Alex Morgan', projectId: 'project-1' },
  { id: 'task-3', organizationId, title: 'Confirm room access', status: 'done', priority: 'low', assignedTo: 'reviewer', assignedToName: 'Alex Morgan' }
];
let projects = ['empty', 'loading'].includes(scenario) ? [] : [{ id: 'project-1', organizationId, name: 'Autumn workshops', description: 'Prepare hands-on sessions for new families.', status: 'active', dueDate: '2026-10-25' }];
if (scenario === 'project-empty') projects = [...projects, { id: 'project-empty', organizationId, name: 'Winter planning', description: 'A workstream awaiting its first task.', status: 'active' }];
let chatMessages = ['empty', 'loading'].includes(scenario) ? [] : [
  { id: 'message-1', organizationId, text: 'Kits are ready for Thursday.', senderId: 'instructor', senderName: 'Sam Rivera', createdAt: '2026-10-20' },
  { id: 'message-2', organizationId, text: 'Thanks. I will confirm the room.', senderId: 'reviewer', senderName: 'Alex Morgan', createdAt: '2026-10-20' }
];
const collectionData = { users: () => members, tasks: () => tasks, projects: () => projects, messages: () => chatMessages };
let sequence = 10;
const readRef = ref => { const [kind, id] = ref.path.split('/'); const value = collectionData[kind]?.().find(item => (item.uid || item.id) === id); return { exists: () => Boolean(value), data: () => value, ref }; };
const check = operation => { emit(operation); if (fail) throw new Error(`Synthetic ${operation} failure`); };
export const db = {};
export const doc = (_db, ...path) => ({ path: path.join('/') });
export const collection = (_db, ...path) => ({ path: path.join('/') });
export const serverTimestamp = () => '2026-10-20';
export const deleteField = () => undefined;
export const getDoc = async ref => readRef(ref);
export const setDoc = async (ref, value) => { check('account saved'); members = [...members, value]; emit('account visible'); };
export const updateDoc = async (ref, value) => { check(`${ref.path} updated`); const [kind, id] = ref.path.split('/'); const list = collectionData[kind](); const next = list.map(item => (item.uid || item.id) === id ? { ...item, ...value } : item); if (kind === 'users') members = next; if (kind === 'tasks') tasks = next; if (kind === 'projects') projects = next; emit('updated'); };
export const addDoc = async (ref, value) => { check(`${ref.path} created`); const item = { ...value, id: `synthetic-${++sequence}` }; if (ref.path === 'tasks') tasks = [...tasks, item]; if (ref.path === 'projects') projects = [...projects, item]; if (ref.path === 'messages') chatMessages = [...chatMessages, item]; emit('created'); return { id: item.id }; };
export const deleteDoc = async ref => { check(`${ref.path} deleted`); const [kind, id] = ref.path.split('/'); if (kind === 'tasks') tasks = tasks.filter(item => item.id !== id); emit('deleted'); };
export const runTransaction = async (_db, operation) => {
  const updates = []; const transaction = { get: async ref => readRef(ref), update: (ref, value) => updates.push(['update', ref, value]), delete: ref => updates.push(['delete', ref]) };
  await operation(transaction); check('project transaction');
  for (const [kind, ref, value] of updates) { if (kind === 'update') tasks = tasks.map(task => task.id === ref.path.split('/')[1] ? { ...task, ...value } : task); else projects = projects.filter(project => project.id !== ref.path.split('/')[1]); }
  emit('project transaction complete');
};
export const useAppContext = () => { watch(); return { tasks, projects, chatMessages, teamMembers: members, loading: scenario === 'loading' }; };
export const useAuth = () => ({
  can: permission => !restricted || ['team.view', 'team.create'].includes(permission),
  roles: ['owner','admin','admission_officer','accountant','instructor','content_manager'].map(id => ({ id, label: id.replace('_', ' ') })),
  createSecondaryUser: async () => { check('authentication account created'); return `synthetic-user-${++sequence}`; },
  userProfile: { uid: 'reviewer', organizationId, name: 'Alex Morgan', email: 'alex@example.test', role: restricted ? 'instructor' : 'admin', status: 'active' },
  currentOrganization: scenario === 'no-org' ? null : { id: organizationId, name: 'Example School' },
  loading: scenario === 'loading'
});
