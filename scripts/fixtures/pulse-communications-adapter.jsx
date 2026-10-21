import React, { useSyncExternalStore } from 'react';

const params = new URLSearchParams(location.search);
const empty = params.get('scenario') === 'empty';
const time = seconds => ({ seconds, toDate: () => new Date(seconds * 1000) });
const students = empty ? [] : [
  { id: 'student-1', organizationId: 'org-1', name: 'Alex Example', parentName: 'Riley Example', parentPhone: '+212600000001', status: 'active' },
  { id: 'student-2', organizationId: 'org-1', name: 'Noor Example', parentName: 'Taylor Example', parentPhone: '+212600000002', status: 'active' },
  { id: 'student-3', organizationId: 'org-1', name: 'Sam Example', parentName: 'Morgan Example', parentPhone: '', status: 'active' },
  { id: 'student-4', organizationId: 'org-1', name: 'Inactive Example', parentPhone: '+212600000004', status: 'inactive' }
];
const programs = empty ? [] : [
  { id: 'program-1', organizationId: 'org-1', name: 'Robotics', status: 'active' },
  { id: 'program-2', organizationId: 'org-1', name: 'Creative coding', status: 'active' }
];
const enrollments = empty ? [] : [
  { id: 'enrollment-1', organizationId: 'org-1', programId: 'program-1', studentId: 'student-1', status: 'active' },
  { id: 'enrollment-2', organizationId: 'org-1', programId: 'program-1', studentId: 'student-2', status: 'active' },
  { id: 'enrollment-3', organizationId: 'org-1', programId: 'program-2', studentId: 'student-3', status: 'active' },
  { id: 'enrollment-4', organizationId: 'org-1', programId: 'program-2', studentId: 'student-4', status: 'active' }
];
let templates = empty ? [] : [
  { id: 'template-1', title: 'Schedule change', category: 'urgent', content: 'Hello {{parent_name}}, the next session for {{student_name}} starts at [time].', tags: ['schedule'], createdAt: time(1792500000) },
  { id: 'template-2', title: 'Project progress', category: 'news', content: 'Hello {{parent_name}}, {{student_name}} completed a project today.', tags: ['learning'], createdAt: time(1792500000) }
];
let announcements = empty ? [] : [
  { id: 'announcement-1', title: 'Family open day', content: 'Join us this Saturday for student demonstrations.', status: 'sent', sentCount: 3, targetAudience: { type: 'all', ids: [] }, createdAt: time(1792500000), sentAt: time(1792500000) }
];
let revision = 0;
let message = '';
let loadFailureRemaining = params.get('scenario') === 'error' ? 1 : 0;
let saveFailureRemaining = params.get('save') === 'error' ? 1 : 0;
const listeners = new Set();
const notify = () => { revision++; listeners.forEach(listener => listener()); };
const useRevision = () => useSyncExternalStore(listener => { listeners.add(listener); return () => listeners.delete(listener); }, () => revision);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const write = async () => { await delay(220); if (saveFailureRemaining-- > 0) throw new Error('Synthetic write failure'); };

export const useAppContext = () => ({ students, programs, enrollments });
export const useAuth = () => ({ currentOrganization: { id: 'org-1', name: 'Example School' }, user: { uid: 'fixture-staff' }, can: () => params.get('role') !== 'readonly' });
export const useConfirm = () => ({
  alert: async (title, detail) => { message = `${title}: ${detail}`; notify(); },
  confirm: async ({ title }) => { const accepted = params.get('confirm') === 'accept'; message = `${accepted ? 'Accepted' : 'Cancelled'} synthetic confirmation: ${title}`; notify(); return accepted; }
});
export const db = { synthetic: true };
export const doc = (_db, ...parts) => ({ parts });
export const collection = (_db, name) => ({ name });
export const where = (...parts) => parts;
export const query = (ref) => ref;
export const serverTimestamp = () => time(Date.now() / 1000);
export const Timestamp = { now: () => time(Date.now() / 1000) };
export const getDoc = async () => {
  if (params.get('scenario') === 'loading') await delay(700);
  if (loadFailureRemaining-- > 0) throw new Error('Synthetic Communications load failure');
  return { exists: () => true, data: () => ({ templates }) };
};
export const getDocs = async () => ({ docs: announcements.map(item => ({ id: item.id, data: () => item })) });
export const runTransaction = async (_db, callback) => {
  const pending = { value: null };
  const result = await callback({ get: async () => ({ exists: () => true, data: () => ({ templates }) }), set: (_ref, data) => { pending.value = data.templates; } });
  await write();
  templates = pending.value;
  notify();
  return result;
};
export const addDoc = async (ref, payload) => {
  if (ref.name !== 'announcements') throw new Error('Only synthetic announcements are allowed');
  await write();
  const id = `synthetic-${announcements.length + 1}`;
  announcements = [{ id, ...payload }, ...announcements];
  notify();
  return { id };
};
export const FixtureControls = () => { useRevision(); return <aside aria-label="Synthetic QA controls" style={{ padding: 20, marginTop: 24, color: 'var(--edu-ink)' }}><strong>Synthetic preview · no school records or messages</strong><p role="status">{message}</p><p>Confirmation is {params.get('confirm') === 'accept' ? 'accepted' : 'cancelled'} in this fixture. WhatsApp launch is intercepted.</p></aside>; };
window.open = () => { message = 'Synthetic WhatsApp draft opened; no external service was contacted.'; notify(); return { opener: null }; };
