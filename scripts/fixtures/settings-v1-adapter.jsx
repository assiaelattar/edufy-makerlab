// Isolated Settings preview. Every Firebase boundary stays in memory.
const params = new URLSearchParams(location.search);
const role = params.get('role') || 'admin';
const empty = params.get('scenario') === 'empty';
const fail = params.get('save') === 'error';
export const events = [];
const note = message => { events.push(message); window.dispatchEvent(new Event('synthetic-write')); };
export const db = {};
export const firebaseConfig = {};
export const doc = (_db, ...path) => ({ path: path.join('/') });
export const collection = (_db, ...path) => ({ path: path.join('/') });
export const query = ref => ref;
export const where = () => null;
export const serverTimestamp = () => 'synthetic-now';
export const deleteField = () => null;
export const writeBatch = () => ({ set: () => {}, update: () => {}, commit: async () => { note('workspace save'); if (fail) throw new Error('Synthetic save failure'); } });
export const setDoc = async () => { note('role or account save'); if (fail) throw new Error('Synthetic role save failure'); };
export const updateDoc = async () => { note('team edit'); if (fail) throw new Error('Synthetic team edit failure'); };
export const addDoc = async () => { note('student import'); if (fail) throw new Error('Synthetic import failure'); return { id: 'synthetic' }; };
export const deleteDoc = async () => { note('profile delete'); if (fail) throw new Error('Synthetic delete failure'); };
export const getDocs = async () => ({ docs: [], size: 0 });
export const getDocsFromServer = getDocs;
export const onSnapshot = (ref, success, error) => {
  if (params.get('scenario') === 'loading' && ref.path.endsWith('/roles')) return () => {};
  queueMicrotask(() => {
    if (params.get('scenario') === 'error' && (ref.path.endsWith('/roles') || ref.path.endsWith('/secrets'))) error?.(new Error('Synthetic listener failure'));
    else if (ref.path.endsWith('/roles')) success({ docs: [] });
    else success({ exists: () => false, data: () => ({}) });
  });
  return () => {};
};
export const initializeApp = () => ({});
export const deleteApp = async () => {};
export const getAuth = () => ({});
export const sendPasswordResetEmail = async () => { note('password reset'); if (fail) throw new Error('Synthetic reset failure'); };
export const updatePassword = async () => { note('student password change'); if (fail) throw new Error('Synthetic password failure'); };
export const isBiometricAvailable = async () => true;
export const isBiometricEnabled = () => false;
export const clearBiometric = () => note('local biometric disabled');
export const registerBiometric = async () => { note('local biometric enabled'); return true; };
const formFields = Object.fromEntries(['parentName','email','address','school','birthDate','medicalInfo'].map(field => [field, { active: field !== 'medicalInfo', required: field === 'parentName' }]));
export const settings = { academyName: empty ? '' : 'Example School', academicYear: empty ? '' : '2026-2027', language: 'en', currency: 'MAD', timezone: 'Africa/Casablanca', weekStartsOn: 1, defaultWorkHours: { start: '09:00', end: '18:00' }, receiptContact: '', receiptFooter: '', studentFormConfig: formFields, documentConfig: empty ? {} : { headerName: 'Example School' }, apiConfig: empty ? {} : { googleApiKey: 'synthetic-key' } };
export const teamMembers = empty ? [] : [
  { uid: 'synthetic-reviewer', organizationId: 'synthetic-only', name: 'Alex Morgan', email: 'alex@example.test', role: role === 'student' ? 'student' : role, status: 'active', workHours: { start: '09:00', end: '17:00' } },
  { uid: 'synthetic-instructor', organizationId: 'synthetic-only', name: 'Sam Rivera', email: 'sam@example.test', role: 'instructor', status: 'active' }
];
export const roles = [
  { id: 'owner', label: 'Owner', description: 'All workspace access', permissions: ['*'] },
  { id: 'admin', label: 'Administrator', description: 'Daily administration', permissions: ['*'] },
  { id: 'admission_officer', label: 'Admissions officer', description: 'Manage family intake', permissions: ['students.view','students.enroll'] },
  { id: 'instructor', label: 'Instructor', description: 'Manage learning and attendance', permissions: ['students.view','attendance.manage'] }
];
export const useAppContext = () => ({ settings, teamMembers, students: empty ? [] : [{ id: 's1' }], programs: empty ? [] : [{ id: 'p1' }], enrollments: empty ? [] : [{ id: 'e1' }], payments: empty ? [] : [{ id: 'pay1' }] });
export const useAuth = () => ({ can: () => role !== 'readonly', roles, createSecondaryUser: async () => { note('team account creation attempted'); if (fail) throw new Error('Synthetic account creation failure'); return 'synthetic-new'; }, userProfile: { uid: 'synthetic-reviewer', organizationId: 'synthetic-only', name: 'Alex Morgan', email: 'alex@example.test', role: role === 'readonly' ? 'instructor' : role, status: 'active' }, user: { uid: 'synthetic-reviewer' }, currentOrganization: { id: 'synthetic-only', name: 'Example School', slug: 'example-school', status: 'active', subscription: { planId: 'Growth', status: 'active' }, limits: { students: 200, storage: 20 }, modules: empty ? {} : { erp: true, sparkQuest: true } }, isSuperAdmin: role === 'super_admin' });
export const useConfirm = () => ({ confirm: async () => { note('confirmation opened'); return false; }, alert: async (title, message, variant) => { note(`${variant || 'info'}: ${title} — ${message}`); } });
