import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BellOff, BellRing, Check, Volume2, X } from 'lucide-react';
import type { StudentProject } from '../../types';
import {
  persistSeenReviewAlertKeys,
  readSeenReviewAlertKeys,
  reviewAlertEntries,
  type ReviewAlertEntry,
} from '../../domain/reviewAlerts';
import { StudentAvatar } from './StudentAvatar';

interface ReviewSubmissionAlertsProps {
  projects: StudentProject[];
  students?: any[];
  loading?: boolean;
  organizationId?: string;
  instructorId?: string;
  previewMode?: boolean;
  onOpenReview: (projectId: string, stepId?: string) => void;
}

type AudioWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };

const readPreference = (key: string) => {
  try { return localStorage.getItem(key) === 'enabled'; } catch { return false; }
};
const writePreference = (key: string, enabled: boolean) => {
  try {
    if (enabled) localStorage.setItem(key, 'enabled');
    else localStorage.removeItem(key);
  } catch { /* Alerts still work for the current page session. */ }
};

function playReviewChime(context: AudioContext, test = false) {
  if (context.state !== 'running') return false;
  const start = context.currentTime + 0.02;
  const master = context.createGain();
  master.gain.setValueAtTime(0.0001, start);
  master.gain.exponentialRampToValueAtTime(test ? 0.085 : 0.18, start + 0.025);
  master.gain.exponentialRampToValueAtTime(0.0001, start + (test ? 0.55 : 1.35));
  master.connect(context.destination);

  const notes = test
    ? [{ frequency: 880, offset: 0 }, { frequency: 1174.66, offset: 0.16 }]
    : [
        { frequency: 783.99, offset: 0 },
        { frequency: 1046.5, offset: 0.16 },
        { frequency: 1318.51, offset: 0.32 },
        { frequency: 1046.5, offset: 0.68 },
        { frequency: 1567.98, offset: 0.84 },
      ];

  notes.forEach(({ frequency, offset }) => {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(frequency, start + offset);
    envelope.gain.setValueAtTime(0.0001, start + offset);
    envelope.gain.exponentialRampToValueAtTime(0.72, start + offset + 0.018);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.23);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(start + offset);
    oscillator.stop(start + offset + 0.25);
  });
  return true;
}

export const ReviewSubmissionAlerts: React.FC<ReviewSubmissionAlertsProps> = ({
  projects,
  students = [],
  loading = false,
  organizationId,
  instructorId,
  previewMode = false,
  onOpenReview,
}) => {
  const preferenceKey = `sparkquest:review-alerts:${organizationId || 'unknown'}:${instructorId || 'unknown'}`;
  const seenKey = `${preferenceKey}:seen`;
  const entries = useMemo(() => reviewAlertEntries(projects, students), [projects, students]);
  const entriesRef = useRef(entries);
  const audioContextRef = useRef<AudioContext | null>(null);
  const initializedRef = useRef(false);
  const seenRef = useRef<Set<string>>(new Set());
  const [enabled, setEnabled] = useState(() => readPreference(preferenceKey));
  const [soundReady, setSoundReady] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => previewMode ? 'granted' : 'Notification' in window ? Notification.permission : 'unsupported');
  const [toast, setToast] = useState<ReviewAlertEntry | null>(null);

  useEffect(() => { entriesRef.current = entries; }, [entries]);

  useEffect(() => {
    initializedRef.current = false;
    seenRef.current = new Set();
    setEnabled(readPreference(preferenceKey));
  }, [preferenceKey]);

  const remember = useCallback((keys: string[]) => {
    keys.forEach(key => seenRef.current.add(key));
    const result = persistSeenReviewAlertKeys(localStorage, seenKey, seenRef.current);
    seenRef.current = new Set(result.keys);
  }, [seenKey]);

  const ensureAudio = useCallback(async (test = false) => {
    const AudioContextConstructor = window.AudioContext || (window as AudioWindow).webkitAudioContext;
    if (!AudioContextConstructor) return false;
    const context = audioContextRef.current || new AudioContextConstructor();
    audioContextRef.current = context;
    if (context.state !== 'running') await context.resume();
    const ready = context.state === 'running';
    setSoundReady(ready);
    if (ready && test) playReviewChime(context, true);
    return ready;
  }, []);

  useEffect(() => {
    if (!enabled || soundReady) return;
    const unlock = () => { void ensureAudio(false); };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [enabled, ensureAudio, soundReady]);

  const announce = useCallback((fresh: ReviewAlertEntry[]) => {
    if (!fresh.length) return;
    const latest = fresh[0];
    setToast(latest);
    if (audioContextRef.current) playReviewChime(audioContextRef.current);

    const oldTitle = document.title;
    document.title = `🔔 ${fresh.length > 1 ? `${fresh.length} submissions` : 'New work'} · SparkQuest`;
    const restoreTitle = () => { document.title = oldTitle; window.removeEventListener('focus', restoreTitle); };
    window.addEventListener('focus', restoreTitle);
    window.setTimeout(restoreTitle, 20000);

    if (permission === 'granted' && !previewMode) {
      const extra = fresh.length > 1 ? ` + ${fresh.length - 1} more new submission${fresh.length === 2 ? '' : 's'}.` : '';
      try {
        const notification = new Notification('New student work to review', {
          body: `New learner work is waiting in the SparkQuest Review Inbox.${extra}`,
          icon: '/icon.png',
          badge: '/icon.png',
          tag: `sparkquest-review-${latest.key}`,
          requireInteraction: true,
          silent: false,
        });
        notification.onclick = () => {
          window.focus();
          onOpenReview(latest.projectId, latest.stepId);
          notification.close();
        };
      } catch (error) {
        console.warn('Windows notification could not be displayed:', error);
      }
    }
  }, [onOpenReview, permission, previewMode]);

  useEffect(() => {
    if (loading) return;
    const currentKeys = entries.map(entry => entry.key);
    if (!initializedRef.current) {
      initializedRef.current = true;
      seenRef.current = new Set(readSeenReviewAlertKeys(localStorage, seenKey));
      if (!enabled) {
        remember(currentKeys);
        return;
      }
    }

    const fresh = enabled && permission === 'granted'
      ? entries.filter(entry => !seenRef.current.has(entry.key))
      : [];
    remember(currentKeys);
    announce(fresh);
  }, [announce, enabled, entries, loading, permission, remember, seenKey]);

  useEffect(() => () => { void audioContextRef.current?.close(); }, []);

  const enableAlerts = async () => {
    if (previewMode) {
      await ensureAudio(true);
      setPermission('granted');
      setEnabled(true);
      writePreference(preferenceKey, true);
      remember(entriesRef.current.map(entry => entry.key));
      return;
    }
    if (!('Notification' in window)) {
      setPermission('unsupported');
      return;
    }
    const result = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    setPermission(result);
    if (result !== 'granted') return;
    await ensureAudio(true);
    setEnabled(true);
    writePreference(preferenceKey, true);
    remember(entriesRef.current.map(entry => entry.key));
  };

  const disableAlerts = () => {
    setEnabled(false);
    setSoundReady(false);
    writePreference(preferenceKey, false);
    void audioContextRef.current?.suspend();
  };

  const label = permission === 'unsupported'
    ? 'Use Chrome or Edge for alerts'
    : permission === 'denied'
    ? 'Notifications blocked'
    : enabled && soundReady
      ? 'Review alerts on'
      : enabled
        ? 'Activate alert sound'
        : 'Enable review alerts';
  const toastStudent = toast ? students.find(student => student.id === toast.studentId || student.loginInfo?.uid === toast.studentId) : undefined;

  return <>
    <button
      type="button"
      onClick={enabled && soundReady ? disableAlerts : enableAlerts}
      className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${enabled && permission === 'granted' ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100' : 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100'}`}
      aria-pressed={enabled && permission === 'granted'}
      title={enabled && soundReady ? 'Turn off review alerts' : 'Allow Windows notifications and a prominent sound for new student submissions'}
    >
      {permission === 'denied' ? <BellOff size={17} /> : enabled && soundReady ? <BellRing size={17} /> : <Bell size={17} />}
      <span className="hidden sm:inline">{label}</span>
      {enabled && soundReady && <Check size={14} />}
    </button>

    {toast && <aside className="fixed bottom-5 right-5 z-[120] w-[min(420px,calc(100vw-32px))] rounded-2xl border-2 border-slate-950 bg-amber-300 p-4 text-slate-950 shadow-[7px_7px_0_#0f172a]" role="alert" aria-live="assertive">
      <div className="flex items-start gap-3">
        <StudentAvatar student={toastStudent} name={toast.learnerName} large />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-[.13em]">New work needs review</p>
          <h3 className="mt-1 text-lg font-black leading-tight">{toast.learnerName} submitted {toast.scopeLabel}</h3>
          <p className="mt-1 text-sm font-bold text-slate-700">{toast.projectTitle}</p>
          <button type="button" className="mt-3 min-h-10 rounded-xl bg-slate-950 px-4 text-sm font-black text-white" onClick={() => { onOpenReview(toast.projectId, toast.stepId); setToast(null); }}>Open submitted work</button>
        </div>
        <button type="button" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg hover:bg-black/10" onClick={() => setToast(null)} aria-label="Dismiss review alert"><X size={19} /></button>
      </div>
    </aside>}
  </>;
};

