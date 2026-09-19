import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { Truck, CheckCircle2, Clock } from 'lucide-react';

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
        if (!user || !db) return;

        // Listen for ANY pickup request for this student that is NOT completed
        const q = query(
            collection(db, 'pickup_queue'),
            where('studentId', '==', userProfile?.studentId || user.uid),
            where('organizationId', '==', userProfile?.organizationId || 'makerlab-academy')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const activeEntries = snapshot.docs
                .map(entryDoc => ({ id: entryDoc.id, ...entryDoc.data() } as PickupEntry & { createdAt?: any }))
                .filter(entry => ['on_the_way', 'arrived', 'released'].includes(entry.status))
                .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
            if (activeEntries.length > 0) {
                setActivePickup(activeEntries[0]);
            } else {
                setActivePickup(null);
            }
        }, (error) => {
            console.warn('Pickup notifications are unavailable:', error.code || error.message);
            setActivePickup(null);
        });

        return () => unsubscribe();
    }, [user, userProfile?.organizationId, userProfile?.studentId]);

    if (!activePickup) return null;

    // --- RENDER LOGIC ---
    // Floating Notification at the top
    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-in slide-in-from-top-4 fade-in duration-500">
            <div className={`
                p-4 rounded-2xl shadow-2xl border-4 backdrop-blur-xl flex items-center gap-4
                ${activePickup.status === 'on_the_way' ? 'bg-indigo-900/90 border-indigo-500 shadow-indigo-500/50' : ''}
                ${activePickup.status === 'arrived' ? 'bg-emerald-900/90 border-emerald-500 shadow-emerald-500/50 animate-pulse' : ''}
                ${activePickup.status === 'released' ? 'bg-purple-900/90 border-purple-500 shadow-purple-500/50' : ''}
            `}>
                <div className={`p-3 rounded-full shrink-0 ${activePickup.status === 'on_the_way' ? 'bg-indigo-500 text-white' :
                    activePickup.status === 'arrived' ? 'bg-emerald-500 text-white' : 'bg-purple-500 text-white'
                    }`}>
                    {activePickup.status === 'on_the_way' && <Truck size={32} />}
                    {activePickup.status === 'arrived' && <Clock size={32} />}
                    {activePickup.status === 'released' && <CheckCircle2 size={32} />}
                </div>

                <div className="flex-1">
                    <h3 className="font-black text-white text-lg leading-tight uppercase tracking-wider">
                        {activePickup.status === 'on_the_way' && "Parent is coming!"}
                        {activePickup.status === 'arrived' && "Parent is Here!"}
                        {activePickup.status === 'released' && "Good to Go!"}
                    </h3>
                    <p className="text-white/80 font-bold text-sm">
                        {activePickup.status === 'on_the_way' && `${activePickup.pickerName || 'Parent'} is on the way.`}
                        {activePickup.status === 'arrived' && "Please pack up and get ready."}
                        {activePickup.status === 'released' && "See you next time! 👋"}
                    </p>
                </div>
            </div>
        </div>
    );
};
