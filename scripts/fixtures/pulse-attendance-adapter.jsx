import React, { useSyncExternalStore } from 'react';
import { format } from 'date-fns';

const today = format(new Date(), 'yyyy-MM-dd');
const weekday = format(new Date(), 'EEEE');
const names = ['Alex Example', 'Sam Example', 'Noor Example', 'Robin Example', 'Charlie Example', 'Taylor Example'];
const students = names.map((name, i) => ({ id: `fixture-${i}`, name, status: 'active' }));
const enrollments = names.map((studentName, i) => ({ id: `enrollment-${i}`, studentId: students[i].id, studentName, programId: 'fixture-program', programName: 'Robotics workshop', groupName: i < 4 ? 'Explorers' : 'Inventors', groupTime: `${weekday} ${i < 4 ? '14:00' : '16:00'}`, status: 'active' }));
const programs = [{ id: 'fixture-program', name: 'Robotics workshop', status: 'active' }];
const scenario = new URLSearchParams(location.search).get('scenario');
if (scenario === 'empty') enrollments.length = 0;
if (scenario === 'renewal') {
  students.push({ id: 'fixture-renewal', name: 'Morgan Example', status: 'active' });
  enrollments.push({ id: 'expired-enrollment', studentId: 'fixture-renewal', studentName: 'Morgan Example', programId: 'fixture-program', programName: 'Robotics workshop', groupName: 'Explorers', groupTime: `${weekday} 14:00`, status: 'active', enrollmentMode: 'rolling_membership', serviceStartDate: '2024-01-01', serviceEndDate: '2024-12-31' });
}
let records = [{ id: `${today}_fixture-1_1400`, studentId: 'fixture-1', status: 'late' }];
let alertText = '';
let navigation = '';
let pending;
let revision = 0;
const listeners = new Set();
const notify = () => { revision++; listeners.forEach(callback => callback()); };
const subscribe = callback => { listeners.add(callback); return () => listeners.delete(callback); };
const useRevision = () => useSyncExternalStore(subscribe, () => revision);
export const useAppContext = () => { useRevision(); return { students, enrollments, programs, attendanceRecords: records, attendanceLoading: scenario === 'loading', attendanceError: scenario === 'error' ? 'Attendance could not be loaded. Check your connection and reload.' : scenario === 'permission' ? 'You do not have permission to read attendance for this organization.' : null, navigateTo: (view) => { navigation = view; notify(); } }; };
const identity = { currentOrganization: { id: 'synthetic-only' }, userProfile: { uid: 'fixture-staff', role: 'admin' } };
export const useAuth = () => identity;
export const AppProvider = ({children}) => children;
let attendanceListener;
const snapshot = (rows, fromCache = false) => ({ docs: rows.map(row => ({ id: row.id, data: () => row })), exists: () => false, metadata: { fromCache } });
export const collection = (_db, name) => name;
export const query = reference => reference;
export const where = () => ({});
export const orderBy = () => ({});
export const limit = () => ({});
export const addDoc = async () => { throw new Error('Unexpected synthetic addDoc'); };
export const updateDoc = async () => { throw new Error('Unexpected synthetic updateDoc'); };
export const onSnapshot = (reference, options, next, error) => {
  if (typeof options === 'function') { error = next; next = options; options = {}; }
  if (reference === 'attendance') {
    attendanceListener = { next, error, metadataEnabled: options.includeMetadataChanges === true };
    next(snapshot([], true));
    notify();
    return () => { attendanceListener = null; };
  }
  next(snapshot({ students, enrollments, programs }[reference] || []));
  return () => {};
};
let confirmation;
export const useConfirm = () => ({
  alert: async (title, message) => { alertText = `${title}: ${message}`; notify(); },
  confirm: options => new Promise(resolve => { confirmation = { ...options, resolve }; notify(); })
});
export const db = {};
export const doc = (_db, _collection, id) => id;
export const serverTimestamp = () => 'synthetic-timestamp';
const save = changes => new Promise((resolve, reject) => {
  const before = records;
  // Simulate Firestore local snapshots arriving before remote acknowledgement.
  records = records.filter(record => !changes.some(change => change.id === record.id)).concat(changes.filter(change => !change.deleted));
  pending = { resolve, reject, before };
  notify();
});
export const setDoc = (id, payload) => save([{ ...payload, id }]);
export const deleteDoc = id => save([{ id, deleted: true }]);
export const writeBatch = () => { const changes = []; return { set: (id, payload) => changes.push({ ...payload, id }), commit: () => save(changes) }; };
export const FixtureControls = () => {
  useRevision();
  return <aside style={{ padding: 16, borderTop: '1px solid #999', marginTop: 24 }} aria-label="Synthetic QA controls">
    <strong>Synthetic frontend QA · no school records</strong>
    {attendanceListener && <div><button onClick={() => { if (attendanceListener.metadataEnabled) attendanceListener.next(snapshot(records)); }}>Deliver attendance snapshot</button><button onClick={() => attendanceListener.error({ code: 'permission-denied' })}>Simulate read error</button></div>}
    <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
      <button disabled={!pending} onClick={() => { const operation = pending; pending = null; operation.resolve(); notify(); }}>Simulate saved</button>
      <button disabled={!pending} onClick={() => { const operation = pending; pending = null; records = operation.before; operation.reject(new Error('Synthetic connection failure')); notify(); }}>Simulate failure</button>
    </div>
    {confirmation && <div role="dialog" aria-label={confirmation.title}><p>{confirmation.message}</p><button onClick={() => { const current = confirmation; confirmation = null; current.resolve(true); notify(); }}>{confirmation.confirmText}</button><button onClick={() => { const current = confirmation; confirmation = null; current.resolve(false); notify(); }}>Cancel confirmation</button></div>}
    <p role="status">{alertText}</p><p>{navigation && `Navigation: ${navigation}`}</p>
  </aside>;
};
