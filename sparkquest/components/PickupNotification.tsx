import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, Truck } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';

interface PickupEntry {
    id: string;
    studentId: string;
    status: 'on_the_way' | 'arrived' | 'confirmed' | 'released';
    pickerName?: string;
}

export const PickupNotification: React.FC = () => {
    const { user, userProfile } = useAuth();
    const [activePickup, setActivePickup] = useState<PickupEntry | null>(null);

    useEffect(() => {
        if (!user || !userProfile?.organizationId || !db) return;
        const pickupQuery = query(collection(db, 'pickup_queue'), where('studentId', '==', userProfile.studentId || user.uid), where('organizationId', '==', userProfile.organizationId));
        return onSnapshot(pickupQuery, snapshot => {
            const activeEntries = snapshot.docs.map(entry => ({ id: entry.id, ...entry.data() } as PickupEntry & { createdAt?: any })).filter(entry => ['on_the_way', 'arrived', 'released'].includes(entry.status)).sort((left, right) => (right.createdAt?.toMillis?.() || 0) - (left.createdAt?.toMillis?.() || 0));
            setActivePickup(activeEntries[0] || null);
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
