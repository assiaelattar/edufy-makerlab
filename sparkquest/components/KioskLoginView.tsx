import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Search, ChevronLeft, Lock, Users, LogOut } from 'lucide-react';
import { LoadingScreen } from './LoadingScreen';

export const KioskLoginView: React.FC = () => {
    const { kioskLogin, exitKioskMode } = useAuth();
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
    const [pin, setPin] = useState('');
    const [loggingIn, setLoggingIn] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const initKiosk = async () => {
            // Kiosk needs DB access. If not logged in, try anonymous auth.
            if (!auth) return;

            if (!auth.currentUser) {
                try {
                    const { signInAnonymously } = await import('firebase/auth');
                    await signInAnonymously(auth);
                    console.log("Only-Kiosk Anonymous Auth Success");
                } catch (e) {
                    console.error("Kiosk Auth Failed", e);
                    // Fallback: Try fetching anyway, maybe rules are open
                }
            }
            fetchStudents();
        };
        initKiosk();
    }, []);

    const fetchStudents = async () => {
        if (!db) return;
        try {
            // Fetch all active students
            // NOTE: In a real multi-tenant app, we should filter by Organization ID.
            // For now, filtering by 'active' status.
            const q = query(collection(db, 'students'), where('status', '==', 'active'));
            const snap = await getDocs(q);
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
            // Sort alphabetically
            list.sort((a, b) => a.name.localeCompare(b.name));
            setStudents(list);
        } catch (e: any) {
            console.error(e);
            setError("Failed to load students. Connection or Permission issue.");
        } finally {
            setLoading(false);
        }
    };

    const handlePinSubmit = async () => {
        if (!selectedStudent || pin.length < 4) return;
        setLoggingIn(true);
        setError('');

        const success = await kioskLogin(selectedStudent.id, pin);
        if (!success) {
            setError('Incorrect PIN. Please try again.');
            setPin('');
            setLoggingIn(false);
        }
        // If success, AuthContext user state changes and App.tsx will unmount this view
    };

    const handleDigit = (digit: string) => {
        if (pin.length < 4) setPin(prev => prev + digit);
    };

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <LoadingScreen mode="standard" message="Loading Class Roster..." />;

    return (
        <div className="h-screen w-full bg-slate-950 flex flex-col relative overflow-hidden text-white font-sans">
            {/* Header */}
            <div className="p-6 flex justify-between items-center bg-slate-900 border-b border-slate-800 z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Users className="text-white" size={20} />
                    </div>
                    <div>
                        <h1 className="font-bold text-xl">Classroom Kiosk</h1>
                        <p className="text-xs text-slate-400">Select your name to sign in</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        if (confirm("Exit Kiosk Mode?")) exitKioskMode();
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors text-sm font-bold"
                >
                    <LogOut size={16} /> Exit Kiosk
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden relative">
                {selectedStudent ? (
                    // PIN PAD VIEW
                    <div className="absolute inset-0 z-20 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
                        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
                            <button
                                onClick={() => { setSelectedStudent(null); setPin(''); setError(''); }}
                                className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold"
                            >
                                <ChevronLeft size={16} /> Back to List
                            </button>

                            <div className="text-center mb-8">
                                <div className="w-20 h-20 rounded-full bg-indigo-600 mx-auto mb-4 flex items-center justify-center text-3xl font-bold shadow-lg shadow-indigo-500/30 overflow-hidden">
                                    {selectedStudent.photoURL ? (
                                        <img src={selectedStudent.photoURL} alt={selectedStudent.name} className="w-full h-full object-cover" />
                                    ) : (
                                        selectedStudent.name.charAt(0)
                                    )}
                                </div>
                                <h2 className="text-2xl font-bold">{selectedStudent.name}</h2>
                                <p className="text-slate-400 text-sm">Enter your 4-digit PIN</p>
                            </div>

                            {/* PIN Display */}
                            <div className="flex justify-center gap-4 mb-8">
                                {[0, 1, 2, 3].map(i => (
                                    <div key={i} className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${i < pin.length
                                        ? 'bg-indigo-600 border-indigo-500 text-white scale-105'
                                        : 'bg-slate-950 border-slate-800 text-slate-700'
                                        }`}>
                                        {i < pin.length ? '●' : ''}
                                    </div>
                                ))}
                            </div>

                            {error && <div className="text-red-400 text-center text-sm font-bold mb-4 animate-pulse">{error}</div>}

                            {/* Numpad */}
                            <div className="grid grid-cols-3 gap-3 mb-6">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                    <button
                                        key={num}
                                        onClick={() => handleDigit(num.toString())}
                                        className="h-16 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 active:text-white transition-all text-xl font-bold shadow-sm"
                                    >
                                        {num}
                                    </button>
                                ))}
                                <div className="col-start-2">
                                    <button
                                        onClick={() => handleDigit('0')}
                                        className="w-full h-16 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 active:text-white transition-all text-xl font-bold shadow-sm"
                                    >
                                        0
                                    </button>
                                </div>
                                <button
                                    onClick={() => setPin(prev => prev.slice(0, -1))}
                                    className="h-16 rounded-xl bg-slate-800/50 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all flex items-center justify-center"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                            </div>

                            <button
                                onClick={handlePinSubmit}
                                disabled={pin.length < 4 || loggingIn}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                {loggingIn ? 'Verifying...' : 'Unlock Studio'}
                            </button>

                        </div>
                    </div>
                ) : null}

                {/* Student List */}
                <div className="p-6 max-w-7xl mx-auto h-full flex flex-col">
                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                        <input
                            type="text"
                            placeholder="Search your name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-lg text-white placeholder:text-slate-600 outline-none focus:border-indigo-500 transition-all shadow-xl"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {filteredStudents.map(student => (
                                <button
                                    key={student.id}
                                    onClick={() => setSelectedStudent(student)}
                                    className="group bg-slate-900 hover:bg-indigo-600 border border-slate-800 hover:border-indigo-500 p-6 rounded-3xl flex flex-col items-center gap-4 transition-all hover:scale-105 shadow-lg active:scale-95"
                                >
                                    <div className="w-20 h-20 rounded-full bg-slate-800 group-hover:bg-white/20 flex items-center justify-center text-2xl font-bold text-slate-400 group-hover:text-white transition-colors overflow-hidden">
                                        {student.photoURL ? (
                                            <img src={student.photoURL} alt={student.name} className="w-full h-full object-cover" />
                                        ) : (
                                            student.name.charAt(0)
                                        )}
                                    </div>
                                    <div className="text-center">
                                        <h3 className="font-bold text-white text-lg group-hover:text-white leading-tight mb-1">{student.name}</h3>
                                        {/* <span className="text-xs text-slate-500 group-hover:text-indigo-200">Level 1</span> */}
                                    </div>
                                </button>
                            ))}
                        </div>
                        {filteredStudents.length === 0 && (
                            <div className="text-center py-20 text-slate-500">
                                <p className="text-xl">No students found.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
