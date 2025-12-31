import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowRight, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

export function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { user, userRole, loading: authLoading, enterInstructorDemo } = useAuth();

    // Redirect if already logged in
    React.useEffect(() => {
        if (!authLoading && user) {
            if (userRole === 'instructor') {
                navigate('/instructor-dashboard');
            } else {
                navigate('/');
            }
        }
    }, [user, userRole, authLoading, navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (!auth) throw new Error("Authentication service unavailable");
            await signInWithEmailAndPassword(auth, email, password);
            // Navigation handled by useEffect
        } catch (err: any) {
            setError(err.message || 'Failed to sign in');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateDemo = async () => {
        setLoading(true);
        setError('');
        const demoEmail = `demo.adult.${Date.now()}@makerlab.com`;
        const demoPass = 'makerpro2024';

        try {
            if (!auth || !db) throw new Error("Service unavailable");

            // 1. Create Auth User
            const userCredential = await createUserWithEmailAndPassword(auth, demoEmail, demoPass);
            const uid = userCredential.user.uid;

            // 2. Create User Profile
            await setDoc(doc(db, 'users', uid), {
                email: demoEmail,
                name: 'Demo MakerPro Student',
                role: 'student',
                createdAt: serverTimestamp(),
                photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
            });

            // 3. Create Student Document (Crucial for MakerPro access)
            await setDoc(doc(db, 'students', uid), {
                email: demoEmail,
                name: 'Demo MakerPro Student',
                targetAudience: ['adults'], // ACCESS KEY
                active: true,
                createdAt: serverTimestamp(),
                stats: {
                    xp: 1200,
                    streakDays: 5,
                    projectsCompleted: 2,
                    hoursCoded: 14
                },
                badges: []
            });

            // 4. Create Active Enrollment
            await addDoc(collection(db, 'enrollments'), {
                studentId: uid,
                programId: 'program_ai_industry', // Mock ID
                programName: 'AI for Industry',
                status: 'active',
                startDate: new Date().toISOString(),
                progress: 35,
                groupTime: 'Saturday 10:00 AM'
            });

            // 5. Create Mock Projects
            const projects = [
                { title: 'Computer Vision Basics', status: 'delivered', score: 95 },
                { title: 'Neural Network Architectures', status: 'delivered', score: 88 },
                { title: 'Reinforcement Learning Agent', status: 'in_progress', score: 0 },
                { title: 'LLM Fine-tuning', status: 'todo', score: 0 }
            ];

            for (const p of projects) {
                await addDoc(collection(db, 'student_projects'), {
                    studentId: uid,
                    title: p.title,
                    status: p.status,
                    grade: p.score > 0 ? { score: p.score, feedback: "Great work!" } : null,
                    submittedAt: p.status === 'delivered' ? new Date().toISOString() : null,
                    station: 'AI Station',
                    description: 'Implement core concepts of AI.',
                    createdAt: serverTimestamp()
                });
            }

            // Auto login happens via onAuthStateChanged
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to create demo account");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid items-center justify-center bg-slate-50 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -translate-y-1/2" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl translate-y-1/2" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md p-8 bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl z-10"
            >
                <div className="text-center mb-8">
                    <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-accent-600 flex items-center justify-center text-white font-bold text-xl shadow-lg mb-4">
                        M
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Welcome to MakerPro</h1>
                    <p className="text-sm text-slate-500">Sign in to your professional account</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium border border-red-100">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all bg-white/50"
                            placeholder="name@example.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all bg-white/50"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-xl bg-brand-600 text-white font-bold shadow-lg shadow-brand-500/20 hover:bg-brand-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> :
                            <>
                                Sign In <ArrowRight className="w-4 h-4" />
                            </>
                        }
                    </button>
                </form>

                <div className="mt-6 pt-6 border-t border-slate-200">
                    <div className="flex gap-4 mt-4">
                        <button
                            onClick={handleCreateDemo}
                            disabled={loading}
                            className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-semibold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                            <UserPlus className="w-4 h-4" />
                            Demo Student
                        </button>
                        <button
                            onClick={() => {
                                setLoading(true);
                                enterInstructorDemo();
                                setTimeout(() => navigate('/instructor-dashboard'), 500);
                            }}
                            className="flex-1 py-2.5 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-900 transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            Test Instructor
                        </button>
                    </div>
                </div>

                <p className="text-center mt-6 text-sm text-slate-400">
                    Protected by MakerLab Security
                </p>
            </motion.div>
        </div>
    );
}
