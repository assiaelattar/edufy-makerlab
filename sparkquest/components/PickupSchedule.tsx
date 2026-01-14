import React, { useState, useEffect } from 'react';
import { Truck, Clock, QrCode, X, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';

interface PickupScheduleProps {
    isOpen: boolean;
    onClose: () => void;
}

export const PickupSchedule: React.FC<PickupScheduleProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const [pickupTime, setPickupTime] = useState('');
    const [pickupLocation, setPickupLocation] = useState('Main Entrance');
    const [loading, setLoading] = useState(true);
    const [realtimeStatus, setRealtimeStatus] = useState<any>(null); // Real-time status from ERP

    useEffect(() => {
        if (isOpen && user) {
            loadPickupInfo();
        }
    }, [isOpen, user]);

    // Listen for Real-time Pickup Status
    useEffect(() => {
        if (!user || !db) return;

        // Listen to pickup_queue for this student
        const q = query(
            collection(db, 'pickup_queue'),
            where('studentId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const data = snapshot.docs[0].data();
                setRealtimeStatus(data);
            } else {
                setRealtimeStatus(null);
            }
        });

        return () => unsubscribe();
    }, [user]);

    const loadPickupInfo = async () => {
        if (!db || !user) return;
        setLoading(true);
        try {
            // Load from enrollments collection (ERP data)
            const enrollmentsQuery = query(
                collection(db, 'enrollments'),
                where('studentId', '==', user.uid)
            );
            const enrollmentsSnap = await getDocs(enrollmentsQuery);

            if (!enrollmentsSnap.empty) {
                // Get the most recent active enrollment
                const enrollments = enrollmentsSnap.docs.map(doc => doc.data());
                const activeEnrollment = enrollments.find(e => e.status === 'active') || enrollments[0];

                if (activeEnrollment) {
                    // Extract pickup info from enrollment
                    setPickupTime(activeEnrollment.pickupTime || activeEnrollment.schedule?.pickupTime || '3:00 PM');
                    setPickupLocation(activeEnrollment.pickupLocation || 'Main Entrance');
                }
            } else {
                // Fallback to default
                setPickupTime('3:00 PM');
                setPickupLocation('Main Entrance');
            }
        } catch (err) {
            console.error('Error loading pickup info:', err);
            // Set defaults on error
            setPickupTime('3:00 PM');
            setPickupLocation('Main Entrance');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`w-full max-w-2xl backdrop-blur-xl border shadow-[0_0_50px_rgba(0,0,0,0.3)] rounded-3xl overflow-hidden transition-all duration-500 ${realtimeStatus?.status === 'released' ? 'bg-emerald-950/90 border-emerald-500 shadow-emerald-500/20' :
                realtimeStatus?.status === 'arrived' ? 'bg-indigo-950/90 border-indigo-500 shadow-indigo-500/20' :
                    'bg-slate-900/95 border-amber-500/30 shadow-amber-500/20'
                }`}>
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl border ${realtimeStatus ? 'bg-white/10 border-white/20' : 'bg-amber-950/50 border-amber-500/20'
                            }`}>
                            <Truck className={`w-8 h-8 ${realtimeStatus ? 'text-white' : 'text-amber-400'}`} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white">
                                {realtimeStatus?.status === 'released' ? 'GO HOME! 🏠' :
                                    realtimeStatus?.status === 'arrived' ? 'PARENT IS HERE! 🚗' :
                                        'Pickup Schedule'}
                            </h2>
                            <p className="text-sm text-slate-400">
                                {realtimeStatus ? 'Real-time update from Gatekeeper' : 'Your daily pickup information'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="space-y-6">

                            {/* REAL-TIME STATUS BANNER */}
                            {realtimeStatus && (
                                <div className={`p-8 rounded-2xl text-center border-4 border-white/20 animate-bounce ${realtimeStatus.status === 'released' ? 'bg-emerald-600' : 'bg-indigo-600'
                                    }`}>
                                    <div className="text-2xl font-bold text-white/80 uppercase tracking-widest mb-2">
                                        Status Update
                                    </div>
                                    <div className="text-5xl font-black text-white">
                                        {realtimeStatus.status === 'released' ? 'PICKUP APPROVED' : 'DRIVER ARRIVED'}
                                    </div>
                                    <div className="mt-4 text-xl font-medium text-white/90">
                                        {realtimeStatus.pickerName ? `${realtimeStatus.pickerName} is waiting for you!` : 'Your ride is here!'}
                                    </div>
                                </div>
                            )}

                            {/* Pickup Time */}
                            <div className="flex items-center gap-4 p-6 bg-slate-800/50 rounded-2xl border border-slate-700">
                                <div className="p-4 bg-amber-950/50 rounded-xl border border-amber-500/20">
                                    <Clock className="w-8 h-8 text-amber-400" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm text-slate-400 uppercase tracking-wider mb-1">Scheduled Time</h3>
                                    <p className="text-3xl font-black text-white">{pickupTime}</p>
                                </div>
                            </div>

                            {/* Pickup Location */}
                            <div className="flex items-center gap-4 p-6 bg-slate-800/50 rounded-2xl border border-slate-700">
                                <div className="p-4 bg-cyan-950/50 rounded-xl border border-cyan-500/20">
                                    <MapPin className="w-8 h-8 text-cyan-400" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm text-slate-400 uppercase tracking-wider mb-1">Pickup Location</h3>
                                    <p className="text-2xl font-bold text-white">{pickupLocation}</p>
                                </div>
                            </div>

                            {/* QR Code */}
                            <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700 text-center">
                                <h3 className="text-sm text-slate-400 uppercase tracking-wider mb-4">Pickup QR Code</h3>
                                <div className="inline-block p-6 bg-white rounded-xl">
                                    <QrCode className="w-32 h-32 text-slate-900" />
                                </div>
                                <p className="text-xs text-slate-500 mt-4">Show this code to your parent/guardian</p>
                            </div>

                            {/* Instructions */}
                            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                                <h3 className="font-bold text-blue-400 mb-2">Pickup Instructions</h3>
                                <ul className="text-sm text-blue-300/80 space-y-1">
                                    <li>• Wait at the designated pickup location</li>
                                    <li>• Show the QR code to your parent/guardian</li>
                                    <li>• Check in with staff before leaving</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
