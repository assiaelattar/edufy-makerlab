import React, { useEffect, useState } from 'react';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import type { Enrollment, Program } from '../../types';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { workshopsOnDateFromSchedule, type FamilyNextWorkshop } from '../domain/parentNextWorkshop';
import { workshopPickupSignal } from '../domain/workshopPickupTiming';
import { pickupSessionDate } from '../domain/pickupLifecycle';
import { openStudentPickup } from './PickupNotification';

export const LearnerWorkshopReminder = () => {
  const { user, userProfile } = useAuth();
  const [now, setNow] = useState(() => new Date());
  const [slots, setSlots] = useState<FamilyNextWorkshop[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const date = pickupSessionDate(now);
  const studentId = userProfile?.studentId || user?.uid;
  const org = userProfile?.organizationId;
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 15_000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    setSlots([]); if (!db || !org || !studentId || userProfile?.role !== 'student') return;
    let active = true; let version = 0;
    const stop = onSnapshot(query(collection(db, 'enrollments'), where('organizationId', '==', org), where('studentId', '==', studentId)), async snapshot => {
      const request = ++version;
      try {
        const enrollments = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment));
        const docs = await Promise.all([...new Set(enrollments.map(e => e.programId))].map(id => getDoc(doc(db!, 'programs', id))));
        if (active && request === version) setSlots(workshopsOnDateFromSchedule(enrollments, docs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() } as Program)), date));
      } catch { if (active && request === version) setSlots([]); }
    }, () => setSlots([]));
    return () => { active = false; stop(); };
  }, [org, studentId, userProfile?.role, date]);
  const reminders = slots.map(slot => ({ slot, signal: workshopPickupSignal(slot, now) })).filter(item => item.signal);
  const reminder = reminders.find(({ slot, signal }) => !dismissed.includes(`${studentId}:${date}:${slot.endTime}:${signal}`));
  if (!reminder || document.hidden) return null;
  const { slot, signal } = reminder;
  return <aside className="sq-pickup-toast sq-workshop-reminder" role="status"><div className="sq-pickup-toast-open"><strong>{signal === 'proof' ? 'Encore 10 minutes : garde une preuve de ton projet' : 'L’atelier se termine : prépare ta sortie'}</strong><p>{signal === 'proof' ? 'Ajoute une photo ou une vidéo dans ton projet avant de ranger.' : 'Range tes affaires et reste avec l’équipe jusqu’à la remise.'}</p>{signal === 'pickup' && <button type="button" onClick={openStudentPickup}>Ouvrir Pickup</button>}</div><button type="button" className="sq-pickup-toast-close" aria-label="Fermer le rappel" onClick={() => setDismissed(items => [...items, `${studentId}:${date}:${slot.endTime}:${signal}`])}>×</button></aside>;
};
