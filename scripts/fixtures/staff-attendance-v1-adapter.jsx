import React, { useSyncExternalStore } from 'react';

const params = new URLSearchParams(location.search);
const listeners = new Set();
let revision = 0;
let dialog = null;
let pending = null;
let message = '';
const now = new Date();
const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
const month = today.slice(0, 7);
const staff = params.get('scenario') === 'empty' ? [] : [
  { uid: 'alex', name: 'Alex Morgan', role: 'admin', workHours: { start: '09:00', end: '17:00' } },
  { uid: 'sam', name: 'Sam Rivera', role: 'instructor' },
  { uid: 'noor', name: 'Noor Example', role: 'admission_officer' },
  { uid: 'avery', name: 'Avery Longname Example', role: 'content_manager' }
];
let records = params.get('scenario') === 'empty' ? [] : [
  { id: `staff_synthetic-only_${today}_alex`, staffId: 'alex', staffName: 'Alex Morgan', date: today, status: 'present', arrivalTime: '09:00', departureTime: '17:00', totalMinutes: 480, overtimeMinutes: 0 },
  { id: `staff_synthetic-only_${today}_sam`, staffId: 'sam', staffName: 'Sam Rivera', date: today, status: 'late', arrivalTime: '09:20', departureTime: '18:00', totalMinutes: 520, overtimeMinutes: 0 },
  { id: `staff_synthetic-only_${today}_noor`, staffId: 'noor', staffName: 'Noor Example', date: today, status: 'absent', totalMinutes: 0, overtimeMinutes: 0 },
  { id: `staff_synthetic-only_${month}-02_noor`, staffId: 'noor', staffName: 'Noor Example', date: `${month}-02`, status: 'present', totalMinutes: 420, overtimeMinutes: 0 }
];
const emit = () => { revision++; listeners.forEach(listener => listener()); };
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
export const useFixture = () => { useSyncExternalStore(subscribe, () => revision, () => revision); return { dialog, pending, message, records }; };
export const db = {};
export const doc = (_db, collection, id) => ({ collection, id });
export const serverTimestamp = () => 'synthetic-now';
export const setDoc = (reference, payload) => new Promise((resolve, reject) => { pending = { label: `Save ${payload.staffName}`, resolve: () => { const previous = records.find(record => record.id === reference.id); records = [...records.filter(record => record.id !== reference.id), { ...previous, ...payload, id: reference.id }]; pending = null; emit(); resolve(); }, reject: () => { pending = null; emit(); reject(new Error('Synthetic save failure')); } }; emit(); });
export const deleteDoc = reference => new Promise((resolve, reject) => { pending = { label: `Clear ${reference.id}`, resolve: () => { records = records.filter(record => record.id !== reference.id); pending = null; emit(); resolve(); }, reject: () => { pending = null; emit(); reject(new Error('Synthetic delete failure')); } }; emit(); });
export const writeBatch = () => { const changes = []; return { set: (reference, payload) => changes.push({ reference, payload }), commit: () => new Promise((resolve, reject) => { pending = { label: `Confirm ${changes.length} staff`, resolve: () => { records = [...records, ...changes.map(({ reference, payload }) => ({ ...payload, id: reference.id }))]; pending = null; emit(); resolve(); }, reject: () => { pending = null; emit(); reject(new Error('Synthetic batch failure')); } }; emit(); }) }; };
export const useAppContext = () => { useSyncExternalStore(subscribe, () => revision, () => revision); return { teamMembers: staff, staffAttendanceRecords: records, settings: { defaultWorkHours: { start: '09:00', end: '18:00' } } }; };
export const useAuth = () => ({ currentOrganization: { id: 'synthetic-only' }, userProfile: { uid: 'fixture-reviewer' }, can: permission => params.get('role') !== 'restricted' || permission !== 'team.view' });
export const useConfirm = () => ({ confirm: options => new Promise(resolve => { dialog = { ...options, resolve: approved => { dialog = null; emit(); resolve(approved); } }; emit(); }), alert: async (title, detail, tone) => { message = `${tone || 'info'}: ${title} — ${detail}`; emit(); } });
