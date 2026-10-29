import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { workshopsOnDateFromSchedule } from '../../sparkquest/domain/parentNextWorkshop';
import { workshopPickupSignal } from '../../sparkquest/domain/workshopPickupTiming';
import { pickupSessionDate } from '../../modules/pickup/domain/pickupLifecycle';

export const PickupWorkshopReminder = () => {
  const { enrollments, programs, attendanceRecords, attendanceLoading, attendanceError, pickupQueue, currentView, navigateTo } = useAppContext();
  const { currentOrganization, userProfile } = useAuth();
  const [now, setNow] = useState(() => new Date());
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try { return JSON.parse(sessionStorage.getItem('edufy:pickup-reminders') || '[]'); } catch { return []; }
  });
  useEffect(() => { try { sessionStorage.setItem('edufy:pickup-reminders', JSON.stringify(dismissed)); } catch { /* storage optional */ } }, [dismissed]);
  const lastActivity = useRef(Date.now());
  useEffect(() => {
    const activity = () => { lastActivity.current = Date.now(); };
    window.addEventListener('pointerdown', activity); window.addEventListener('keydown', activity);
    const timer = setInterval(() => setNow(new Date()), 15_000);
    return () => { clearInterval(timer); window.removeEventListener('pointerdown', activity); window.removeEventListener('keydown', activity); };
  }, []);
  const date = pickupSessionDate(now), org = currentOrganization?.id;
  const present = new Set(attendanceRecords.filter(a => a.organizationId === org && a.date === date && ['present', 'late'].includes(a.status)).map(a => a.enrollmentId));
  const completed = new Set(pickupQueue.filter(e => e.organizationId === org && e.sessionDate === date && e.status === 'confirmed').map(e => e.studentId));
  const slots = workshopsOnDateFromSchedule(enrollments.filter(e => e.organizationId === org && present.has(e.id) && !completed.has(e.studentId)), programs.filter(p => p.organizationId === org), date);
  const slot = slots.find(s => workshopPickupSignal(s, now) === 'pickup' && !dismissed.includes(`${org}:${date}:${s.endTime}`));
  const key = slot ? `${org}:${date}:${slot.endTime}` : '';
  const allowed = ['super_admin', 'owner', 'admin'].includes(userProfile?.role || '') && !attendanceLoading && !attendanceError;
  useEffect(() => {
    if (!allowed || !key || currentView !== 'pickup' || document.hidden || Date.now() - lastActivity.current < 30_000) return;
    if (document.querySelector('[role="dialog"], input:focus, textarea:focus, select:focus')) return;
    window.dispatchEvent(new Event('edufy:open-pickup-lobby'));
    setDismissed(items => [...items, key]);
  }, [allowed, key, currentView, now]);
  if (!allowed || !slot) return null;
  return <aside role="status" className="p-3 border rounded-xl flex gap-3 items-center"><span>L’atelier se termine : le lobby Pickup est prêt.</span><button type="button" onClick={() => { if (currentView === 'pickup') window.dispatchEvent(new Event('edufy:open-pickup-lobby')); else navigateTo('pickup', { openLobby: true }); setDismissed(items => [...items, key]); }}>Ouvrir le lobby</button><button type="button" aria-label="Masquer le rappel Pickup" onClick={() => setDismissed(items => [...items, key])}>×</button></aside>;
};
