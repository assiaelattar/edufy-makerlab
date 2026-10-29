import React, { useEffect, useRef, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { pickupSessionDate, previousPickupDate, selectOpenPickup } from '../domain/pickupLifecycle';
import type { FamilyChild } from '../hooks/useParentFamily';

/** Always mounted in the family shell, including when the Pickup page is closed. */
export const ParentPickupNotice = ({ child, organizationId, onOpen, play }: {
  child: FamilyChild; organizationId: string; onOpen: () => void; play: (cue: 'celebrate' | 'step') => void;
}) => {
  const [status, setStatus] = useState('');
  const [failed, setFailed] = useState(false);
  const [date, setDate] = useState(pickupSessionDate);
  const sound = useRef(play); sound.current = play;
  useEffect(() => { const timer = window.setInterval(() => setDate(pickupSessionDate()), 30_000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    setStatus(''); setFailed(false);
    if (!db || !child.permissions.includes('pickup') || !child.pickupProfile?.active) return;
    let last = '';
    return onSnapshot(query(collection(db, 'pickup_queue'), where('organizationId', '==', organizationId),
      where('studentId', '==', child.id), where('sessionDate', 'in', [date, previousPickupDate(date)])), snapshot => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as { id: string; organizationId: string; studentId: string; sessionDate: string; status: string }));
      const entry = selectOpenPickup(records, organizationId, child.id, date);
      const next = entry?.status || '';
      setFailed(false); setStatus(next);
      if (next !== last && ['released', 'confirmed', 'cancelled'].includes(next)) sound.current(next === 'cancelled' ? 'step' : 'celebrate');
      last = next;
    }, () => { setFailed(true); setStatus(''); });
  }, [child.id, child.permissions.join(','), child.pickupProfile?.active, organizationId, date]);
  if (!status && !failed) return null;
  const text = failed ? 'Suivi indisponible — ouvrir pour réessayer' : status === 'released' ? 'Remise enregistrée : confirmez la réception à la porte'
    : status === 'confirmed' ? 'Bonne route ! Réception confirmée' : status === 'cancelled' ? 'Sortie annulée — contactez l’équipe'
    : status === 'arrived' || status === 'ready' ? 'À la porte — l’équipe prépare la remise' : status === 'exception' ? 'Vérification nécessaire avec l’équipe' : 'En route — voir le suivi';
  return <button type="button" className="pf-family-pickup-link" onClick={onOpen}><span role={status === 'released' || failed ? 'alert' : 'status'}><strong>{child.name}</strong><br />{text}</span></button>;
};
