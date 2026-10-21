// Synthetic Expenses boundary. All reads and writes remain in memory.
const params = new URLSearchParams(location.search);
const scenario = params.get('scenario') || 'populated';
const fail = params.get('save') === 'error';
const readOnly = params.get('role') === 'readonly';
const month = new Date().toISOString().slice(0, 7);
const date = day => month + '-' + String(day).padStart(2, '0');
const org = 'synthetic-only';
export const events = [];
const note = message => { events.push(message); window.dispatchEvent(new Event('synthetic-write')); };
export const db = {};
export const collection = (_db, name) => ({ name });
export const doc = (_db, name, id) => ({ name, id });
export const serverTimestamp = () => 'synthetic-now';
export const getDoc = async () => ({ exists: () => true, data: () => ({ organizationId: org }) });
export const addDoc = async (ref, payload) => { note('add ' + ref.name + ': ' + payload.title); if (fail) throw new Error('Synthetic failure'); return { id: 'new-synthetic' }; };
export const updateDoc = async (ref) => { note('update ' + ref.name + '/' + ref.id); if (fail) throw new Error('Synthetic failure'); };
export const deleteDoc = async (ref) => { note('delete ' + ref.name + '/' + ref.id); if (fail) throw new Error('Synthetic failure'); };
export const initializeApp = () => ({});
export const getAuth = () => ({});
export const getFirestore = () => ({});
const makeTemplate = (id, title, amount, dayDue, frequency = 'monthly') => ({ id, title, amount, dayDue, frequency, recurring: true, category: 'rent', beneficiary: 'Example Supplier', organizationId: org });
export const expenseTemplates = scenario === 'empty' ? [] : [
  makeTemplate('due', 'Studio rent', 8400, 1),
  makeTemplate('pending', 'Utilities', 920, 5),
  makeTemplate('paid', 'Equipment service', 400, 6),
  makeTemplate('review', 'Cleaning', 650, 7),
  makeTemplate('scheduled', 'Materials', 1100, 28),
  makeTemplate('manual', 'Weekly supplies', 250, 1, 'weekly')
];
const makeExpense = (id, title, amount, category, status, templateId, day) => ({ id, title, amount, category, status, templateId, date: date(day), method: 'cash', beneficiary: 'Example Supplier', notes: 'Synthetic audit note', session: '2026-2027', organizationId: org });
export const expenses = scenario === 'empty' ? [] : [
  makeExpense('e1', 'Utilities', 920, 'utilities', 'pending', 'pending', 5),
  { ...makeExpense('e2', 'Equipment service', 400, 'material', 'paid', 'paid', 6), receiptUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/k7sAAAAASUVORK5CYII=' },
  makeExpense('e3', 'Cleaning A', 650, 'other', 'paid', 'review', 7),
  makeExpense('e4', 'Cleaning B', 650, 'other', 'paid', 'review', 8),
  makeExpense('e5', 'Printing', 130, 'marketing', 'paid', null, 9)
];
export const payments = scenario === 'empty' ? [] : [{ id: 'p1', session: '2026-2027', status: 'verified', amount: 20000 }];
export const settings = { academicYear: '2026-2027' };
export const useAppContext = () => ({ expenses, expenseTemplates, payments, settings, loading: scenario === 'loading', workspaceError: scenario === 'error' ? 'Synthetic expense data failed to load.' : null });
export const useAuth = () => ({ can: () => !readOnly, currentOrganization: { id: org, status: 'active' }, user: { uid: 'synthetic-user' } });
export const useConfirm = () => ({
  confirm: async details => { note('confirm: ' + details.title); return params.get('confirm') === 'accept'; },
  alert: async (title, message, variant) => { note((variant || 'info') + ': ' + title + ' — ' + message); }
});
