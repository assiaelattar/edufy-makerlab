
import React, { useState, useMemo } from 'react';
import { Car, Clock, CheckCircle2, MapPin, Search, Plus, UserCheck, X, Megaphone } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export const PickupView = () => {
    const { pickupQueue, students } = useAppContext();
    const { can } = useAuth();

    // Determine Mode
    // Admin/Admission/Instructor can see the Gatekeeper Panel to add students
    const isGatekeeper = can('attendance.manage');

    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);

    // Filter Students for Search
    const searchResults = useMemo(() => {
        if (!searchQuery) return [];
        return students.filter(s =>
            s.status === 'active' &&
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !pickupQueue.some(p => p.studentId === s.id) // Exclude already queued
        ).slice(0, 5);
    }, [students, searchQuery, pickupQueue]);

    // Handlers
    const addToQueue = async (studentId: string, studentName: string, parentName: string) => {
        if (!db) return;
        await addDoc(collection(db, 'pickup_queue'), {
            studentId,
            studentName,
            parentName,
            status: 'arrived',
            createdAt: serverTimestamp()
        });
        setSearchQuery('');
        setShowSearch(false);
    };

    const removeFromQueue = async (id: string) => {
        if (!db) return;
        await deleteDoc(doc(db, 'pickup_queue', id));
    };

    // Sort queue by time (oldest first)
    const uniqueSortedQueue = useMemo(() => {
        const sorted = [...pickupQueue].sort((a, b) => {
            const timeA = a.createdAt ? (a.createdAt as any).seconds : 0;
            const timeB = b.createdAt ? (b.createdAt as any).seconds : 0;
            return timeA - timeB;
        });

        const entriesByStudent = new Map();
        sorted.forEach(entry => {
            const existing = entriesByStudent.get(entry.studentId);
            if (!existing) {
                entriesByStudent.set(entry.studentId, entry);
            } else {
                // Priority: Released > Arrived > On the Way
                const statusPriority: Record<string, number> = { released: 3, arrived: 2, on_the_way: 1, waiting: 0 };
                const currentScore = statusPriority[existing.status] || 0;
                const newScore = statusPriority[entry.status] || 0;

                if (newScore > currentScore) {
                    entriesByStudent.set(entry.studentId, entry);
                } else if (newScore === currentScore) {
                    // If same status, keep the LATEST one
                    const timeExisting = existing.createdAt ? (existing.createdAt as any).seconds : 0;
                    const timeEntry = entry.createdAt ? (entry.createdAt as any).seconds : 0;
                    if (timeEntry > timeExisting) {
                        entriesByStudent.set(entry.studentId, entry);
                    }
                }
            }
        });
        return Array.from(entriesByStudent.values());
    }, [pickupQueue]);

    return (
        <div className="h-full flex flex-col pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4">

            {/* Header */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6 mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/50">
                        <Car size={32} className="text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Pickup Status</h2>
                        <p className="text-slate-400 text-sm">Real-time parent arrival notifications.</p>
                    </div>
                </div>

                {isGatekeeper && (
                    <div className="w-full md:w-auto relative">
                        {showSearch ? (
                            <div className="absolute top-0 right-0 w-full md:w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                                <div className="p-3 flex items-center gap-2 border-b border-slate-800">
                                    <Search size={16} className="text-slate-500" />
                                    <input
                                        autoFocus
                                        className="bg-transparent outline-none text-white text-sm flex-1"
                                        placeholder="Search student name..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    <button onClick={() => setShowSearch(false)} className="text-slate-500 hover:text-white"><X size={16} /></button>
                                </div>
                                <div className="max-h-60 overflow-y-auto">
                                    {searchResults.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => addToQueue(s.id, s.name, s.parentName || 'Parent')}
                                            className="w-full text-left p-3 hover:bg-slate-800 border-b border-slate-800/50 flex justify-between items-center group"
                                        >
                                            <div>
                                                <div className="font-bold text-white text-sm">{s.name}</div>
                                                <div className="text-[10px] text-slate-500">{s.parentName}</div>
                                            </div>
                                            <div className="bg-emerald-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Plus size={14} />
                                            </div>
                                        </button>
                                    ))}
                                    {searchQuery && searchResults.length === 0 && (
                                        <div className="p-4 text-center text-slate-500 text-xs italic">No matching students found.</div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowSearch(true)}
                                className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                            >
                                <Megaphone size={18} /> Notify Arrival
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Queue Display */}
            <div className="flex-1 overflow-y-auto">
                {uniqueSortedQueue.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                        <Clock size={64} className="mb-4 stroke-1" />
                        <h3 className="text-xl font-medium">Waiting for arrivals...</h3>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {uniqueSortedQueue.map(entry => {
                            const isOnWay = entry.status === 'on_the_way';
                            const isArrived = entry.status === 'arrived';
                            const isReleased = entry.status === 'released';

                            return (
                                <div key={entry.id} className={`border rounded-2xl p-6 relative overflow-hidden shadow-lg animate-in zoom-in duration-300 ${isReleased ? 'bg-slate-900/50 border-slate-800 opacity-60' :
                                    isArrived ? 'bg-slate-900 border-emerald-500/30' :
                                        'bg-slate-900 border-indigo-500/30'
                                    }`}>
                                    {/* Pulse Effect */}
                                    {isArrived && <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 animate-pulse"></div>}
                                    {isOnWay && <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>}

                                    <div className="relative z-10 flex flex-col h-full justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                {isArrived ? (
                                                    <span className="bg-emerald-500 text-emerald-950 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">Arrived</span>
                                                ) : isReleased ? (
                                                    <span className="bg-slate-700 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Released</span>
                                                ) : (
                                                    <span className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">On The Way</span>
                                                )}
                                                <span className="text-slate-500 text-xs">{entry.createdAt ? new Date((entry.createdAt as any).toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
                                            </div>
                                            <h3 className="text-3xl font-bold text-white leading-tight mb-1">{entry.studentName}</h3>
                                            <div className="space-y-1">
                                                <p className="text-slate-400 text-sm flex items-center gap-2"><UserCheck size={14} /> {entry.parentName}</p>
                                                {entry.pickerName && entry.pickerName !== entry.parentName && (
                                                    <p className="text-indigo-400 text-sm flex items-center gap-2 font-bold transform translate-x-3"><span className="text-slate-600">↳</span> {entry.pickerName}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end gap-2">
                                            {/* Dismiss (Admin only or if stuck) */}
                                            {isReleased && (
                                                <button
                                                    onClick={() => removeFromQueue(entry.id)}
                                                    className="bg-slate-800 hover:bg-slate-700 text-slate-400 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                                                    title="Remove from list manually"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}

                                            {/* Action Button */}
                                            {isArrived && !isReleased ? (
                                                <button
                                                    onClick={async () => {
                                                        if (!db) return;
                                                        await updateDoc(doc(db, 'pickup_queue', entry.id), {
                                                            status: 'released',
                                                            releasedAt: serverTimestamp()
                                                        });
                                                    }}
                                                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-900/20"
                                                >
                                                    Release Student <CheckCircle2 size={16} />
                                                </button>
                                            ) : isOnWay ? (
                                                <button
                                                    onClick={async () => {
                                                        if (!db) return;
                                                        await updateDoc(doc(db, 'pickup_queue', entry.id), {
                                                            status: 'arrived',
                                                            arrivedAt: serverTimestamp()
                                                        });
                                                    }}
                                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors border border-indigo-400/30"
                                                >
                                                    Mark Arrived
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
