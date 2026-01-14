
import React, { useState, useMemo } from 'react';
import { Car, Clock, CheckCircle2, MapPin, Search, Plus, UserCheck, X, Megaphone, Monitor, LogOut, Star } from 'lucide-react';
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

    const [isDisplayMode, setIsDisplayMode] = useState(false);
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

    // --- SOUND ALERTS & ANNOUNCEMENTS ---
    React.useEffect(() => {
        const lastAnnouncedKey = 'lastAnnouncedArrival';
        const lastAnnouncedId = localStorage.getItem(lastAnnouncedKey);

        // Find the MOST RECENT arrival that hasn't been announced yet
        const newArrivals = uniqueSortedQueue.filter(q => q.status === 'arrived');
        if (newArrivals.length === 0) return;

        // Sort by arrival time desc
        const latestArrival = newArrivals.sort((a, b) => {
            const timeA = a.arrivedAt ? (a.arrivedAt as any).seconds : 0;
            const timeB = b.arrivedAt ? (b.arrivedAt as any).seconds : 0;
            return timeB - timeA;
        })[0];

        if (latestArrival && latestArrival.id !== lastAnnouncedId) {
            // Play Chime
            const audio = new Audio('/assets/notification.mp3'); // Fallback or use TTS only

            // Text to Speech
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(`${latestArrival.studentName}'s parent has arrived.`);
                utterance.rate = 1.0;
                utterance.pitch = 1.0;
                window.speechSynthesis.speak(utterance);
            }

            localStorage.setItem(lastAnnouncedKey, latestArrival.id);
        }

    }, [uniqueSortedQueue]);

    return (
        <div className="h-full flex flex-col pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4">

            {/* Header */}
            {!isDisplayMode && (
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

                    <div className="flex gap-4 w-full md:w-auto">
                        {/* New: Quick Stats / Release All */}
                        {uniqueSortedQueue.some(q => q.status === 'released') && (
                            <button
                                onClick={async () => {
                                    if (!db) return;
                                    if (!confirm('Clear all released students?')) return;
                                    const released = uniqueSortedQueue.filter(q => q.status === 'released');
                                    for (const r of released) {
                                        await deleteDoc(doc(db, 'pickup_queue', r.id));
                                    }
                                }}
                                className="bg-slate-800 text-slate-400 hover:text-white px-4 py-3 rounded-xl font-bold flex items-center gap-2 border border-slate-700 transition-all text-sm"
                            >
                                <X size={16} /> Clear History
                            </button>
                        )}

                        <button
                            onClick={() => setIsDisplayMode(true)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-900/20"
                            title="Open TV Display Mode"
                        >
                            <Monitor size={20} /> <span className="hidden md:inline">Launch TV Mode</span>
                        </button>

                        {isGatekeeper && (
                            <div className="w-full md:w-auto relative flex-1">
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
                                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                                    >
                                        <Megaphone size={18} /> Notify Arrival
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Display Mode */}
            {isDisplayMode ? (
                <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col p-6 overflow-hidden">
                    <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <Car size={48} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-5xl font-black text-white tracking-tight">Pickup Status</h1>
                                <p className="text-2xl text-slate-400 mt-2 font-medium">Live Updates</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-6xl font-black text-slate-800 tabular-nums tracking-tighter">
                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <button onClick={() => setIsDisplayMode(false)} className="text-slate-800 hover:text-slate-600 mt-2 text-sm font-bold flex items-center gap-2 justify-end opacity-0 hover:opacity-100 transition-opacity">
                                <LogOut size={16} /> Exit Display
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 grid grid-cols-5 gap-8 overflow-hidden">
                        {/* LEFT: Released Students (Big Alert) */}
                        <div className="col-span-3 bg-slate-900/50 rounded-[3rem] border-4 border-indigo-500/30 overflow-hidden flex flex-col relative">
                            <div className="bg-indigo-600 p-6 text-center">
                                <h2 className="text-4xl font-black text-white uppercase tracking-widest flex items-center justify-center gap-4">
                                    <Star size={40} fill="currentColor" className="animate-spin-slow" />
                                    Ready for Pickup
                                    <Star size={40} fill="currentColor" className="animate-spin-slow" />
                                </h2>
                            </div>
                            <div className="flex-1 p-8 overflow-y-auto no-scrollbar space-y-4">
                                {uniqueSortedQueue.filter(q => q.status === 'released').map(entry => (
                                    <div key={entry.id} className="bg-white rounded-[2rem] p-6 flex justify-between items-center shadow-2xl animate-in slide-in-from-left duration-500">
                                        <div>
                                            <div className="text-6xl font-black text-slate-900 mb-2 truncate max-w-2xl">{entry.studentName}</div>
                                            <div className="text-2xl font-bold text-slate-500 flex items-center gap-3">
                                                <UserCheck size={28} /> {entry.pickerName || entry.parentName}
                                            </div>
                                        </div>
                                        <div className="bg-emerald-500 text-white text-3xl font-black px-8 py-4 rounded-xl shadow-lg animate-bounce">
                                            GO
                                        </div>
                                    </div>
                                ))}
                                {uniqueSortedQueue.filter(q => q.status === 'released').length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-700 opacity-20">
                                        <Car size={120} />
                                        <p className="text-4xl font-black mt-4">Waiting...</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: Confirmed Arrivals (List) */}
                        <div className="col-span-2 bg-slate-900/50 rounded-[3rem] border-4 border-emerald-500/30 overflow-hidden flex flex-col">
                            <div className="bg-emerald-600 p-6 text-center">
                                <h2 className="text-3xl font-black text-white uppercase tracking-widest flex items-center justify-center gap-3">
                                    <CheckCircle2 size={32} />
                                    Parents Arrived
                                </h2>
                            </div>
                            <div className="flex-1 p-6 overflow-y-auto space-y-3">
                                {uniqueSortedQueue.filter(q => q.status === 'arrived').map(entry => (
                                    <div key={entry.id} className="bg-slate-800 rounded-2xl p-5 border-l-8 border-emerald-500 animate-in slide-in-from-right duration-500">
                                        <div className="text-3xl font-bold text-white truncate">{entry.studentName}</div>
                                        <div className="text-lg text-emerald-400 font-medium mt-1 flex items-center gap-2">
                                            <Clock size={16} /> {entry.arrivedAt ? new Date((entry.arrivedAt as any).seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                                        </div>
                                    </div>
                                ))}
                                {uniqueSortedQueue.filter(q => q.status === 'arrived').length === 0 && (
                                    <div className="text-center py-20 text-slate-600">
                                        <p className="text-xl font-bold">No parents waiting currently.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Normal Queue Display - GROUPED BY STATUS */
                <div className="flex-1 overflow-y-auto space-y-8">
                    {uniqueSortedQueue.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50 py-20">
                            <Clock size={64} className="mb-4 stroke-1" />
                            <h3 className="text-xl font-medium">Waiting for arrivals...</h3>
                        </div>
                    ) : (
                        <>
                            {/* 1. ARRIVED (Action Needed) */}
                            {uniqueSortedQueue.some(q => q.status === 'arrived') && (
                                <div>
                                    <h3 className="text-emerald-400 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                        Parents Arrived ({uniqueSortedQueue.filter(q => q.status === 'arrived').length})
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {uniqueSortedQueue.filter(q => q.status === 'arrived').map(entry => (
                                            <div key={entry.id} className="bg-slate-900 border-2 border-emerald-500/50 rounded-2xl p-6 relative overflow-hidden shadow-xl shadow-emerald-900/10">
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 animate-pulse"></div>

                                                <div className="relative z-10">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="bg-emerald-500 text-emerald-950 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">Arrived</span>
                                                        <span className="text-emerald-400 text-xs font-mono">{entry.arrivedAt ? new Date((entry.arrivedAt as any).seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
                                                    </div>
                                                    <h3 className="text-2xl font-bold text-white mb-1 truncate">{entry.studentName}</h3>
                                                    <p className="text-slate-400 text-sm flex items-center gap-2 mb-4"><UserCheck size={14} /> {entry.pickerName || entry.parentName}</p>

                                                    <button
                                                        onClick={async () => {
                                                            if (!db) return;
                                                            await updateDoc(doc(db, 'pickup_queue', entry.id), {
                                                                status: 'released',
                                                                releasedAt: serverTimestamp()
                                                            });
                                                        }}
                                                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
                                                    >
                                                        Release Student <CheckCircle2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 2. ON THE WAY */}
                            {uniqueSortedQueue.some(q => q.status === 'on_the_way') && (
                                <div>
                                    <h3 className="text-indigo-400 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Car size={14} />
                                        On The Way ({uniqueSortedQueue.filter(q => q.status === 'on_the_way').length})
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {uniqueSortedQueue.filter(q => q.status === 'on_the_way').map(entry => (
                                            <div key={entry.id} className="bg-slate-900/50 border border-indigo-500/20 rounded-xl p-4 relative overflow-hidden hover:bg-slate-900 transition-colors">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="text-indigo-300 text-[10px] font-bold uppercase tracking-wider mb-1">ETA: Soon</div>
                                                        <h3 className="text-lg font-bold text-white truncate">{entry.studentName}</h3>
                                                        <div className="text-xs text-slate-500 mt-1">{entry.pickerName}</div>
                                                    </div>
                                                    <button
                                                        onClick={async () => {
                                                            if (!db) return;
                                                            await updateDoc(doc(db, 'pickup_queue', entry.id), {
                                                                status: 'arrived',
                                                                arrivedAt: serverTimestamp()
                                                            });
                                                        }}
                                                        className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white p-2 rounded-lg transition-all"
                                                        title="Mark Arrived Manually"
                                                    >
                                                        <CheckCircle2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 3. RELEASED (History) */}
                            {uniqueSortedQueue.some(q => q.status === 'released') && (
                                <div className="pt-4 border-t border-slate-800">
                                    <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <LogOut size={14} />
                                        Released / History ({uniqueSortedQueue.filter(q => q.status === 'released').length})
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                        {uniqueSortedQueue.filter(q => q.status === 'released').map(entry => (
                                            <div key={entry.id} className="bg-slate-900/30 border border-slate-800 rounded-lg p-3 opacity-60 hover:opacity-100 transition-opacity">
                                                <div className="text-sm font-bold text-slate-400 truncate">{entry.studentName}</div>
                                                <div className="text-[10px] text-slate-600 flex justify-between items-center mt-1">
                                                    <span>{entry.releasedAt ? new Date((entry.releasedAt as any).seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Done'}</span>
                                                    <button onClick={() => removeFromQueue(entry.id)} className="hover:text-red-400"><X size={12} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
