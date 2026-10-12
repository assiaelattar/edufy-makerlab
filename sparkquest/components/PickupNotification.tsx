import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, Truck } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { isCanonicalPickupEntry, pickupSessionDate, previousPickupDate, selectOpenPickup, type PickupStatus } from '../domain/pickupLifecycle';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';

interface PickupEntry {
    id: string;
    organizationId: string;
    studentId: string;
    sessionDate?: string;
    sessionId?: string;
    status: PickupStatus | 'waiting';
    pickerName?: string;
}

export const PickupNotification: React.FC = () => {
    const { user, userProfile } = useAuth();
    const [activePickup, setActivePickup] = useState<PickupEntry | null>(null);

    useEffect(() => {
        if (!user || !userProfile?.organizationId || !db) return;
        const studentId = userProfile.studentId || user.uid;
        const organizationId = userProfile.organizationId;
        const today = pickupSessionDate();
        const pickupQuery = query(
            collection(db, 'pickup_queue'),
            where('organizationId', '==', organizationId),
            where('studentId', '==', studentId),
            where('sessionDate', 'in', [today, previousPickupDate(today)]),
        );
        return onSnapshot(pickupQuery, snapshot => {
            const records = snapshot.docs
                .map(entry => ({ id: entry.id, ...entry.data() } as PickupEntry))
                .filter(isCanonicalPickupEntry);
            const selected = selectOpenPickup(records, organizationId, studentId, today);
            setActivePickup(selected && ['on_the_way', 'arrived', 'released'].includes(selected.status) ? selected : null);
        }, error => {
            console.warn('Pickup notifications are unavailable:', error.code || error.message);
            setActivePickup(null);
        });
    }, [user, userProfile?.organizationId, userProfile?.studentId]);

    if (!activePickup) return null;
    const copy = activePickup.status === 'on_the_way'
        ? { title: 'Pickup is on the way', detail: `${activePickup.pickerName || 'Your parent or guardian'} has started the trip.`, icon: <Truck /> }
        : activePickup.status === 'arrived'
            ? { title: 'Your pickup is here', detail: 'Pack your project and wait for a team member.', icon: <Clock3 /> }
            : { title: 'You are cleared to leave', detail: 'Check out with the MakerLab team before you go.', icon: <CheckCircle2 /> };
    return <aside className={`sq-pickup-toast is-${activePickup.status}`} role="status"><span>{copy.icon}</span><div><small>Live pickup update</small><strong>{copy.title}</strong><p>{copy.detail}</p></div></aside>;
};
