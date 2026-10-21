import React, { useSyncExternalStore } from 'react';

const params = new URLSearchParams(location.search);
const empty = params.get('scenario') === 'empty';
const restricted = params.get('role') === 'readonly';
const accountant = params.get('role') === 'accountant';
const session = '2026-2027';
const organizationId = 'synthetic-finance-only';
let revision = 0;
let message = '';
let currentView = 'finance';
let viewParams = {};
const listeners = new Set();
const notify = () => { revision++; listeners.forEach(listener => listener()); };
export const recordFixtureMessage = value => { message = value; notify(); };
const useRevision = () => useSyncExternalStore(listener => { listeners.add(listener); return () => listeners.delete(listener); }, () => revision);
const students = [
  { id: 'learner-1', name: 'Alex Example', parentName: 'Family Example', parentPhone: '+15550000001', organizationId },
  { id: 'learner-2', name: 'Sam Example', parentName: 'Family Example', parentPhone: '+15550000001', organizationId },
  { id: 'learner-3', name: 'Noor Example', parentName: 'Other Family', parentPhone: '+15550000002', organizationId },
];
const programs = [{ id: 'program-1', name: 'Robotics workshop', status: 'active', targetAudience: 'kids', price: 1200, billingAudience: 'individual', organizationId }];
const enrollments = students.map((student, index) => ({
  id: `enrollment-${index + 1}`, studentId: student.id, studentName: student.name,
  programId: 'program-1', programName: 'Robotics workshop', organizationId, session,
  status: 'active', paymentPlan: 'monthly', totalAmount: 1200, paidAmount: index === 0 ? 1200 : 400,
  balance: index === 0 ? 0 : 800, startDate: '2026-09-01', paymentPromises: [{ month: '2026-10', amount: 400 }]
}));
const payments = [
  { id: 'payment-1', enrollmentId: 'enrollment-1', studentName: 'Alex Example', organizationId, session, date: '2026-10-02', amount: 1200, status: 'paid', method: 'cash', reference: 'SYN-001' },
  { id: 'payment-2', enrollmentId: 'enrollment-2', studentName: 'Sam Example', organizationId, session, date: '2026-10-08', amount: 400, status: 'pending_verification', method: 'virement', reference: 'SYN-002' },
  { id: 'payment-3', enrollmentId: 'enrollment-3', studentName: 'Noor Example', organizationId, session, date: '2026-10-10', amount: 400, status: 'check_received', method: 'check', checkNumber: 'SYN-003' }
];
const settings = { academyName: 'Example school', academicYear: session, currency: 'MAD', receiptFooter: 'Synthetic receipt for review only', receiptContact: 'Example school' };
export const db = {};
export const doc = (_db, ...parts) => parts.join('/');
export const collection = (_db, ...parts) => parts.join('/');
export const serverTimestamp = () => 'synthetic-now';
export const increment = value => value;
export const deleteDoc = async () => { throw new Error('Synthetic deletion disabled'); };
export const updateDoc = async () => { message = 'Synthetic transaction saved'; notify(); };
export const runTransaction = async (_db, callback) => {
  if (params.get('save') === 'failure') throw new Error('Synthetic connection failure');
  const changes = [];
  const result = await callback({
    get: async reference => { const [type, id] = reference.split('/'); const record = (type === 'payments' ? payments : enrollments).find(item => item.id === id); return { exists: () => Boolean(record), data: () => ({ ...record }) }; },
    update: (reference, update) => changes.push({ reference, update }), set: () => {}
  });
  changes.forEach(({ reference, update }) => { const [type, id] = reference.split('/'); const record = (type === 'payments' ? payments : enrollments).find(item => item.id === id); Object.assign(record, update); });
  message = 'Synthetic transaction saved'; notify(); return result;
};
export const writeBatch = () => { const changes = []; return {
  update: (reference, update) => changes.push({ reference, update }), set: (reference, update) => changes.push({ reference, update }),
  commit: async () => { if (params.get('save') === 'failure') throw new Error('Synthetic connection failure'); message = `Synthetic batch saved (${changes.length} operations)`; notify(); }
}; };
export const useAuth = () => ({
  can: permission => accountant ? permission.startsWith('finance.') : restricted ? ['finance.view', 'finance.record_payment'].includes(permission) : true,
  currentOrganization: { id: organizationId, name: 'Example school' },
  user: { uid: 'synthetic-staff' }, userProfile: { role: restricted ? 'admission_officer' : accountant ? 'accountant' : 'admin' }
});
export const useAppContext = () => {
  useRevision();
  return { payments: empty ? [] : payments, enrollments: empty ? [] : enrollments, students: empty ? [] : students,
    programs: empty ? [] : programs, bookings: [], workshopTemplates: [], workshopSlots: [], settings, viewParams, currentView,
    navigateTo: (destination, options) => { currentView = destination; viewParams = options || {}; message = `Navigation: ${destination} ${JSON.stringify(options || {})}`; notify(); },
    fetchDashboardData: async () => { notify(); } };
};
export const useConfirm = () => ({ confirm: async () => false, alert: async (title, detail) => { message = `${title}: ${detail}`; notify(); } });
export const formatCurrency = value => new Intl.NumberFormat('en-MA', { style: 'currency', currency: 'MAD' }).format(Number(value) || 0);
export const formatDate = value => value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
export const generateReceipt = payment => { recordFixtureMessage(`Synthetic receipt requested for ${payment.reference || payment.id}`); };
export const normalizePhone = value => String(value || '').replace(/\D/g, '') || '';
export const compressImage = async file => {
  if (!file?.type?.startsWith('image/')) throw new Error('Synthetic unsupported proof');
  recordFixtureMessage(`Synthetic proof attached: ${file.name}`);
  return 'data:image/png;base64,U1lOVEhFVElD';
};
export const FinanceDocumentsPanel = () => <div className="edu-ds-state"><h3>Document register fixture boundary</h3><p>Document persistence is tested in the dedicated catalogue smoke.</p></div>;
export const FixtureStatus = () => { useRevision(); return <aside role="status" style={{ margin: '24px auto', maxWidth: 1320, color: 'var(--ds-muted)' }}>Synthetic Finance fixture · no production records. {message}</aside>; };
