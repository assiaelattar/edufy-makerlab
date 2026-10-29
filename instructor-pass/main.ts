import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, getDoc, limit, onSnapshot, orderBy, query, updateDoc, where, type Unsubscribe } from 'firebase/firestore';
import { addDays, format, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { auth, db } from '../services/firebase';
import type { AppNotification, ClassSession, Program, UserProfile, WorkshopSlot, WorkshopTemplate } from '../types';
import { projectInstructorWeek, type PassSession } from './schedule';

const byId = (id: string): HTMLElement => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing Instructor Pass element: ${id}`);
  return element;
};
const escapeHtml = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] || character));
const todayKey = (): string => format(new Date(), 'yyyy-MM-dd');
const formatDay = (date: Date): string => format(date, 'EEEE d MMMM', { locale: fr });

interface LocalTask { id: string; text: string; priority: 'high' | 'normal'; done: boolean }
let profile: UserProfile | null = null;
let programs: Program[] = [];
let sessions: ClassSession[] = [];
let templates: WorkshopTemplate[] = [];
let slots: WorkshopSlot[] = [];
let notifications: AppNotification[] = [];
let programsReady = false;
let sessionsReady = false;
let templatesReady = false;
let slotsReady = false;
let programsError = false;
let sessionsError = false;
let templatesError = false;
let slotsError = false;
let tasks: LocalTask[] = [];
let stopProfile: Unsubscribe | null = null;
let stopPrograms: Unsubscribe | null = null;
let stopSessions: Unsubscribe | null = null;
let stopTemplates: Unsubscribe | null = null;
let stopSlots: Unsubscribe | null = null;
let stopNotifications: Unsubscribe | null = null;
let subscriptionGeneration = 0;
let notificationsReady = false;

function clearSubscriptions() {
  subscriptionGeneration++;
  stopProfile?.(); stopPrograms?.(); stopSessions?.(); stopTemplates?.(); stopSlots?.(); stopNotifications?.();
  stopProfile = stopPrograms = stopSessions = stopTemplates = stopSlots = stopNotifications = null;
  programs = []; sessions = []; templates = []; slots = [];
  notifications = []; notificationsReady = false;
  programsReady = sessionsReady = templatesReady = slotsReady = programsError = sessionsError = templatesError = slotsError = false;
}

function setLoginError(message: string) { byId('login-error').textContent = message; }
function showGate(message = '') {
  byId('app').inert = true;
  byId('login-gate').hidden = false;
  byId('sign-out').hidden = true;
  setLoginError(message);
  byId('connection-state').textContent = 'Connexion requise';
  byId('today-sessions').innerHTML = '';
  byId('week-grid').innerHTML = '';
  byId('alerts-list').innerHTML = '';
  byId('alerts-count').textContent = '';
}

function renderNotifications() {
  const items = notifications.filter(item => item.organizationId === profile?.organizationId && Boolean(item.workshopSlotId || item.programGroupId));
  const unread = items.filter(item => !item.read).length;
  byId('alerts-count').textContent = unread ? `· ${unread} nouvelle${unread > 1 ? 's' : ''}` : '';
  byId('alerts-list').innerHTML = items.length ? items.slice(0, 5).map(item => `<div class="alert-item ${item.read ? '' : 'unread'} ${item.type === 'warning' ? 'warning' : ''}"><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.message)}</p></div>${item.read ? '' : `<button type="button" data-read-alert="${escapeHtml(item.id)}">Vu</button>`}</div>`).join('') : `<p class="empty-schedule">${notificationsReady ? 'Aucune alerte de planning pour le moment.' : 'Chargement des alertes…'}</p>`;
}

function showDeviceNotification(item: AppNotification) {
  if (!('Notification' in window) || Notification.permission !== 'granted' || !document.hidden) return;
  try { new Notification(item.title, { body: item.message, tag: `pass-workshop-${item.id}` }); } catch { /* The in-app alert remains available on mobile browsers that disallow this API. */ }
}

function updateNotificationPermissionButton() {
  const button = byId('alerts-permission') as HTMLButtonElement;
  button.hidden = !('Notification' in window) || Notification.permission !== 'default';
}

function taskStorageKey(): string { return `instructor-pass-tasks-v1:${profile?.organizationId || ''}:${profile?.uid || ''}`; }
function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(taskStorageKey()) || '[]');
    tasks = Array.isArray(saved) ? saved.filter(item => item && typeof item.id === 'string' && typeof item.text === 'string') : [];
  } catch { tasks = []; }
  renderTasks();
}
function saveTasks() { try { localStorage.setItem(taskStorageKey(), JSON.stringify(tasks)); } catch { /* Private browsing can disable storage. */ } }
function renderTasks() {
  const ordered = [...tasks].sort((left, right) => Number(left.done) - Number(right.done) || Number(right.priority === 'high') - Number(left.priority === 'high'));
  const html = ordered.length ? ordered.map(task => `<div class="task ${task.done ? 'done' : ''}"><input type="checkbox" data-task="${escapeHtml(task.id)}" aria-label="Terminer ${escapeHtml(task.text)}" ${task.done ? 'checked' : ''} /><span><strong>${escapeHtml(task.text)}</strong><small>Tâche personnelle · cet appareil</small></span><button type="button" class="priority ${task.priority}" data-priority="${escapeHtml(task.id)}" aria-label="Changer la priorité de ${escapeHtml(task.text)}">${task.priority === 'high' ? 'Priorité' : 'À faire'}</button></div>`).join('') : '<p class="empty-schedule">Aucune tâche pour le moment. Ajoutez votre première priorité.</p>';
  for (const id of ['task-list', 'task-list-full']) byId(id).innerHTML = html;
  const completed = tasks.filter(task => task.done).length;
  byId('task-count').textContent = `${completed} sur ${tasks.length} terminée${completed > 1 ? 's' : ''}`;
  for (const id of ['task-progress', 'task-progress-full']) byId(id).style.width = `${tasks.length ? completed / tasks.length * 100 : 0}%`;
}

function renderSchedule() {
  if (!profile) return;
  const now = new Date();
  byId('today-date').textContent = formatDay(now);
  if (!programsReady || !sessionsReady || !templatesReady || !slotsReady) {
    byId('today-summary').textContent = 'Chargement des séances Edufy…';
    return;
  }
  const week = projectInstructorWeek(programs, sessions, profile.organizationId, profile.uid || '', now, templates, slots);
  const today = week.filter(item => item.date === todayKey());
  const hasErrors = programsError || sessionsError || templatesError || slotsError;
  const missingSources = [programsError && 'programmes', sessionsError && 'cours planifiés', templatesError && 'modèles d’atelier', slotsError && 'séances d’atelier'].filter(Boolean).join(', ');
  byId('connection-state').textContent = hasErrors ? 'Données partielles' : 'Données Edufy';
  byId('today-summary').textContent = hasErrors ? `Source indisponible : ${missingSources}. Les séances accessibles restent affichées.` : `${today.length} séance${today.length === 1 ? '' : 's'} prévue${today.length === 1 ? '' : 's'} · ${formatDay(now)}`;
  byId('data-note').textContent = hasErrors
    ? `Lecture Edufy partielle (${missingSources}). Les séances accessibles restent affichées ; les tâches personnelles restent sur cet appareil.`
    : 'Séances issues des groupes et du calendrier Edufy. Les tâches personnelles restent sur cet appareil.';
  byId('today-sessions').innerHTML = today.length
    ? today.map(item => `<div class="session"><span class="time">${escapeHtml(item.startTime)}<small>${escapeHtml(item.endTime)}</small></span><span class="line"><span class="dot"></span><span class="track"></span></span><div class="session-copy"><strong>${escapeHtml(item.title)} <span class="label">${item.kind === 'workshop' ? 'Atelier' : 'Programme'}</span></strong><p>${escapeHtml(item.detail)}${item.location ? ` · ${escapeHtml(item.location)}` : ''}</p></div></div>`).join('')
    : `<p class="empty-schedule">${hasErrors ? 'Impossible de confirmer toutes vos séances.' : 'Aucune séance affectée aujourd’hui.'}</p>`;

  const firstDay = startOfWeek(now, { weekStartsOn: 1 });
  byId('week-summary').textContent = hasErrors ? `Source indisponible : ${missingSources}` : `${week.length} intervention${week.length === 1 ? '' : 's'} affectée${week.length === 1 ? '' : 's'} cette semaine`;
  byId('week-grid').innerHTML = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(firstDay, index);
    const key = format(date, 'yyyy-MM-dd');
    const dayItems = week.filter(item => item.date === key);
    return `<div class="week-day ${key === todayKey() ? 'current' : ''}"><h3>${escapeHtml(format(date, 'EEEE', { locale: fr }))}<span>${escapeHtml(format(date, 'd MMMM', { locale: fr }))}</span></h3>${dayItems.length ? dayItems.map(item => `<div class="week-event"><b>${escapeHtml(item.startTime)} · ${escapeHtml(item.title)}</b><small>${escapeHtml(item.detail)} · ${escapeHtml(item.endTime)}</small></div>`).join('') : '<span class="week-empty">Aucune séance affectée</span>'}</div>`;
  }).join('');

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const upcoming = week.find(item => item.date > todayKey() || (item.date === todayKey() && Number(item.endTime.slice(0, 2)) * 60 + Number(item.endTime.slice(3, 5)) > nowMinutes));
  byId('next-label').textContent = upcoming ? `À venir · ${upcoming.date === todayKey() ? 'aujourd’hui' : format(new Date(`${upcoming.date}T12:00:00`), 'EEEE', { locale: fr })}` : 'Votre prochaine séance';
  byId('next-title').textContent = upcoming?.title || (hasErrors ? 'Programme partiellement disponible' : 'Aucune séance à venir cette semaine');
  byId('next-meta').innerHTML = upcoming ? `<span>${escapeHtml(upcoming.startTime)} – ${escapeHtml(upcoming.endTime)}</span><span>${escapeHtml(upcoming.detail)}</span>` : '';
  byId('next-tag').textContent = upcoming ? (upcoming.location || (upcoming.kind === 'workshop' ? 'Atelier' : 'Groupe')) : 'Voir ma semaine';
}

function subscribeToData(userProfile: UserProfile) {
  clearSubscriptions();
  profile = userProfile;
  const generation = subscriptionGeneration;
  const orgId = userProfile.organizationId;
  byId('login-gate').hidden = true;
  byId('app').inert = false;
  byId('sign-out').hidden = false;
  const firstName = userProfile.name?.trim().split(/\s+/)[0] || 'instructeur';
  byId('greeting-title').innerHTML = `Bonjour, ${escapeHtml(firstName)}<span style="color:#85a570">.</span>`;
  byId('profile-avatar').textContent = (userProfile.name || 'I').split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  byId('connection-state').textContent = 'Chargement…';
  loadTasks();
  renderSchedule();
  renderNotifications();
  updateNotificationPermissionButton();
  if (!db) { programsReady = sessionsReady = templatesReady = slotsReady = programsError = sessionsError = templatesError = slotsError = true; renderSchedule(); return; }
  stopPrograms = onSnapshot(query(collection(db, 'programs'), where('organizationId', '==', orgId)), snapshot => {
    if (generation !== subscriptionGeneration) return;
    programs = snapshot.docs.map(item => ({ ...item.data(), id: item.id } as Program));
    programsReady = true; programsError = false; renderSchedule();
  }, () => { if (generation !== subscriptionGeneration) return; programsReady = programsError = true; renderSchedule(); });
  stopSessions = onSnapshot(query(collection(db, 'class_sessions'), where('organizationId', '==', orgId)), snapshot => {
    if (generation !== subscriptionGeneration) return;
    sessions = snapshot.docs.map(item => ({ ...item.data(), id: item.id } as ClassSession));
    sessionsReady = true; sessionsError = false; renderSchedule();
  }, () => { if (generation !== subscriptionGeneration) return; sessionsReady = sessionsError = true; renderSchedule(); });
  stopTemplates = onSnapshot(query(collection(db, 'workshop_templates'), where('organizationId', '==', orgId)), snapshot => {
    if (generation !== subscriptionGeneration) return;
    templates = snapshot.docs.map(item => ({ ...item.data(), id: item.id } as WorkshopTemplate));
    templatesReady = true; templatesError = false; renderSchedule();
  }, () => { if (generation !== subscriptionGeneration) return; templatesReady = templatesError = true; renderSchedule(); });
  stopSlots = onSnapshot(query(collection(db, 'workshop_slots'), where('organizationId', '==', orgId)), snapshot => {
    if (generation !== subscriptionGeneration) return;
    slots = snapshot.docs.map(item => ({ ...item.data(), id: item.id } as WorkshopSlot));
    slotsReady = true; slotsError = false; renderSchedule();
  }, () => { if (generation !== subscriptionGeneration) return; slotsReady = slotsError = true; renderSchedule(); });
  stopNotifications = onSnapshot(query(collection(db, 'notifications'), where('userId', '==', userProfile.uid), orderBy('createdAt', 'desc'), limit(100)), snapshot => {
    if (generation !== subscriptionGeneration) return;
    notifications = snapshot.docs.map(item => ({ ...item.data(), id: item.id } as AppNotification));
    if (notificationsReady) snapshot.docChanges().filter(change => change.type === 'added').forEach(change => {
      const item = { ...change.doc.data(), id: change.doc.id } as AppNotification;
      if (item.organizationId === orgId && (item.workshopSlotId || item.programGroupId)) showDeviceNotification(item);
    });
    notificationsReady = true;
    renderNotifications();
  }, () => { if (generation !== subscriptionGeneration) return; notificationsReady = true; byId('alerts-list').innerHTML = '<p class="empty-schedule">Alertes indisponibles. Vérifiez votre connexion Edufy.</p>'; });
}

async function acceptProfile(uid: string) {
  if (!db) { showGate('Connexion Edufy indisponible.'); return; }
  const generation = subscriptionGeneration;
  const snapshot = await getDoc(doc(db, 'users', uid));
  if (generation !== subscriptionGeneration || auth?.currentUser?.uid !== uid) return;
  const data = snapshot.exists() ? ({ ...snapshot.data(), uid } as UserProfile) : null;
  if (!data || data.status !== 'active' || !data.organizationId || !['instructor', 'admin', 'owner'].includes(data.role)) {
    clearSubscriptions(); profile = null;
    showGate('Ce compte ne possède pas un accès instructeur actif dans Edufy.');
    return;
  }
  subscribeToData(data);
  stopProfile = onSnapshot(doc(db, 'users', uid), latest => {
    const current = latest.exists() ? ({ ...latest.data(), uid } as UserProfile) : null;
    if (!current || current.status !== 'active' || current.organizationId !== data.organizationId || !['instructor', 'admin', 'owner'].includes(current.role)) {
      clearSubscriptions(); profile = null; showGate('Votre accès instructeur a changé. Reconnectez-vous.');
    }
  }, () => { clearSubscriptions(); profile = null; showGate('Impossible de vérifier votre profil Edufy.'); });
}

byId('login-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!auth) { setLoginError('Connexion Edufy indisponible.'); return; }
  setLoginError('Connexion…');
  try {
    const email = (byId('login-email') as HTMLInputElement).value.trim();
    const password = (byId('login-password') as HTMLInputElement).value;
    await signInWithEmailAndPassword(auth, email, password);
    (byId('login-password') as HTMLInputElement).value = '';
    setLoginError('');
  } catch { setLoginError('Connexion impossible. Vérifiez vos identifiants Edufy.'); }
});
byId('sign-out').addEventListener('click', () => { if (auth) void signOut(auth); });
byId('alerts-permission').addEventListener('click', async () => {
  if (!('Notification' in window)) return;
  await Notification.requestPermission();
  updateNotificationPermissionButton();
});
document.addEventListener('change', event => {
  const target = event.target as HTMLInputElement;
  const id = target?.dataset?.task;
  if (!id) return;
  tasks = tasks.map(task => task.id === id ? { ...task, done: target.checked } : task);
  saveTasks(); renderTasks();
});
document.addEventListener('click', event => {
  const alertId = (event.target as HTMLElement)?.dataset?.readAlert;
  if (alertId && db && notifications.some(item => item.id === alertId && item.userId === profile?.uid)) {
    void updateDoc(doc(db, 'notifications', alertId), { read: true }).catch(() => { byId('alerts-list').insertAdjacentHTML('afterbegin', '<p class="empty-schedule">Impossible de marquer cette alerte comme lue.</p>'); });
    return;
  }
  const id = (event.target as HTMLElement)?.dataset?.priority;
  if (!id) return;
  tasks = tasks.map(task => task.id === id ? { ...task, priority: task.priority === 'high' ? 'normal' : 'high' } : task);
  saveTasks(); renderTasks();
});
for (const id of ['add-task', 'add-task-full']) byId(id).addEventListener('submit', event => {
  event.preventDefault();
  const input = (event.currentTarget as HTMLFormElement).querySelector('input')!;
  const text = input.value.trim();
  if (!text) return;
  tasks.push({ id: crypto.randomUUID(), text, priority: 'normal', done: false });
  input.value = ''; saveTasks(); renderTasks(); input.focus();
});
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.addEventListener('click', () => {
  const view = button.dataset.view;
  byId('app').classList.toggle('view-week', view === 'week');
  byId('app').classList.toggle('view-tasks', view === 'tasks');
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(item => item.classList.toggle('active', item.dataset.view === view));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}));
byId('today-date').textContent = formatDay(new Date());
byId('app').inert = true;
if (auth) {
  onAuthStateChanged(auth, user => {
    clearSubscriptions(); profile = null;
    if (!user) { showGate(); return; }
    void acceptProfile(user.uid).catch(() => showGate('Impossible de vérifier votre profil Edufy. Réessayez.'));
  });
} else showGate('Connexion Edufy indisponible.');
window.setInterval(() => { if (profile) renderSchedule(); }, 60_000);
