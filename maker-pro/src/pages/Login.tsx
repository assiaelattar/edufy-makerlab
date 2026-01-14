import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowRight, UserPlus, Users, Rocket, ShieldCheck, Mail, Lock, CheckSquare, Square, AlertCircle, Baby, Fingerprint, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../../context/AppContext';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { authenticateBiometric, isBiometricEnabled } from '../../utils/biometrics'; // Adjusted import path
import { Logo } from '../components/Logo'; // Adjusted import path

export function Login() {
    const navigate = useNavigate();
    const { user, userRole, loading: authLoading, enterInstructorDemo } = useAuth();
    // Use AppContext if available, otherwise fallback to defaults (handling potential build issues)
    let settings = { academyName: 'MakerLab Academy', logoUrl: '' };
    try {
        const context = useAppContext();
        if (context) settings = context.settings;
    } catch (e) { console.log('AppContext not utilized in Login wrapper'); }

    // State for View Switching: 'selection' | 'parent' | 'admin'
    const [viewMode, setViewMode] = useState<'selection' | 'parent' | 'admin'>('selection');

    // Redirect if already logged in
    useEffect(() => {
        if (!authLoading && user) {
            if (userRole === 'instructor') {
                navigate('/instructor-dashboard');
            } else if (userRole === 'parent') {
                navigate('/parent-dashboard');
            } else {
                navigate('/');
            }
        }
    }, [user, userRole, authLoading, navigate]);

    // --- SUB-COMPONENTS ---

    const RoleSelection = () => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-4xl mx-auto p-6 md:p-8"
        >
            <div className="text-center mb-12">
                <div className="w-16 h-16 bg-gradient-to-br from-brand-600 to-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-indigo-500/30 mb-6">
                    M
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
                    Welcome to {settings.academyName}
                </h1>
                <p className="text-lg text-slate-500 max-w-xl mx-auto">
                    Please select your portal to continue.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                {/* Parent Card */}
                <div
                    onClick={() => setViewMode('parent')}
                    className="cursor-pointer group relative bg-white border border-slate-200 hover:border-indigo-500 p-8 rounded-3xl shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300"
                >
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                        <Users className="w-7 h-7 text-indigo-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">Parent Portal</h3>
                    <p className="text-slate-500 mb-6">Track your child's progress, manage enrollments, and view payments.</p>
                    <div className="flex items-center text-indigo-600 font-bold text-sm">
                        Access Portal <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>

                {/* Student Card */}
                <div
                    onClick={() => window.location.href = 'https://sparkquest-makerlab.vercel.app'}
                    className="cursor-pointer group relative bg-slate-900 border border-slate-800 hover:border-brand-500 p-8 rounded-3xl shadow-xl hover:shadow-2xl hover:shadow-brand-500/20 transition-all duration-300 overflow-hidden"
                >
                    {/* Abstract bg element */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl -tranne-y-1/2 translate-x-1/2"></div>

                    <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 backdrop-blur-sm">
                        <Rocket className="w-7 h-7 text-brand-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-brand-400 transition-colors">Student Portal</h3>
                    <p className="text-slate-400 mb-6">Launch SparkQuest to access your missions, projects, and studio.</p>
                    <div className="flex items-center text-brand-400 font-bold text-sm">
                        Launch SparkQuest <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>
            </div>

            <div className="mt-16 text-center">
                <button
                    onClick={() => setViewMode('admin')}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-600 transition-colors px-4 py-2 rounded-full hover:bg-slate-100"
                >
                    <ShieldCheck className="w-4 h-4" /> Admin & Staff Access
                </button>
            </div>
        </motion.div>
    );

    const ParentLoginForm = () => {
        const [email, setEmail] = useState('');
        const [password, setPassword] = useState('');
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState('');
        const [rememberMe, setRememberMe] = useState(true);

        const handleParentLogin = async (e: React.FormEvent) => {
            e.preventDefault();
            if (!auth) return;
            setError('');
            setLoading(true);

            try {
                const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
                await setPersistence(auth, persistenceType);
                await signInWithEmailAndPassword(auth, email, password);
            } catch (err: any) {
                console.error(err);
                let msg = "Authentication failed.";
                if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                    msg = "Invalid email or password.";
                } else if (err.code === 'auth/too-many-requests') {
                    msg = "Too many failed attempts. Please try again later.";
                } else if (err.code === 'auth/network-request-failed') {
                    msg = "Network error. Please check your internet connection.";
                }
                setError(msg);
            } finally {
                setLoading(false);
            }
        };

        const handleBiometric = async () => {
            // Reuse existing logic
        };

        return (
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full max-w-5xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px] border border-slate-200"
            >
                {/* Left Side (Parent Branding) */}
                <div className="relative md:w-1/2 bg-gradient-to-br from-indigo-600 to-purple-700 p-12 text-white flex flex-col justify-between overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-900/40 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

                    <button onClick={() => setViewMode('selection')} className="absolute top-6 left-6 p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-colors">
                        <ChevronLeft className="w-5 h-5 text-white" />
                    </button>

                    <div className="relative z-10 mt-12">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 mb-6">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-4xl font-bold leading-tight mb-4">Track your child's <br /> progress & growth.</h2>
                        <p className="text-indigo-100 text-sm max-w-xs leading-relaxed">Stay connected with your child's learning journey, view projects, and manage enrollments.</p>
                    </div>

                    <div className="relative z-10 flex items-center gap-4 text-xs text-indigo-200 font-medium">
                        <div className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Secure Portal</div>
                        <div className="w-1 h-1 bg-indigo-300/50 rounded-full"></div>
                        <div className="flex items-center gap-1.5"><Baby className="w-4 h-4" /> Student Focused</div>
                    </div>
                </div>

                {/* Right Side (Parent Form) */}
                <div className="md:w-1/2 p-6 md:p-16 flex flex-col justify-center bg-white">
                    <div className="max-w-sm mx-auto w-full">
                        <div className="mb-8">
                            <h3 className="text-2xl font-bold text-slate-800 mb-2">Parent Sign In</h3>
                            <p className="text-slate-500 text-sm">Welcome back! Please enter your details.</p>
                        </div>

                        <form onSubmit={handleParentLogin} className="space-y-4">
                            {error && (
                                <div className="bg-red-50 border border-red-100 p-3 rounded-lg flex items-start gap-3 text-red-600 text-xs">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Email</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-3 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-slate-800 text-base focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                            placeholder="parent@example.com"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Password</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-3 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-slate-800 text-base focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setRememberMe(!rememberMe)}>
                                    <button type="button" className="text-indigo-600 transition-colors">
                                        {rememberMe ? <CheckSquare size={16} /> : <Square size={16} className="text-slate-400 group-hover:text-slate-600" />}
                                    </button>
                                    <span className="text-xs text-slate-500 group-hover:text-slate-700 select-none">Remember me</span>
                                </div>
                                <button type="button" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">Forgot password?</button>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
                            </button>
                        </form>
                    </div>
                </div>
            </motion.div>
        );
    };

    const AdminLoginForm = () => {
        const [email, setEmail] = useState('');
        const [password, setPassword] = useState('');
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState('');

        const handleLogin = async (e: React.FormEvent) => {
            e.preventDefault();
            setLoading(true);
            setError('');
            try {
                if (!auth) throw new Error("Authentication service unavailable");
                await signInWithEmailAndPassword(auth, email, password);
            } catch (err: any) {
                setError(err.message || 'Failed to sign in');
            } finally {
                setLoading(false);
            }
        };

        const handleCreateDemo = async () => {
            // Reuse generic demo creation logic or keep stripped down
            alert("Demo creation available in development mode.");
        };

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md p-8 bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl z-10 mx-auto relative"
            >
                <button onClick={() => setViewMode('selection')} className="absolute top-6 left-6 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                    <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="text-center mb-8 pt-6">
                    <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-accent-600 flex items-center justify-center text-white font-bold text-xl shadow-lg mb-4">M</div>
                    <h1 className="text-2xl font-bold text-slate-900">Admin Login</h1>
                    <p className="text-sm text-slate-500">Manage your academy</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium border border-red-100">{error}</div>}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all bg-white/50" required />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all bg-white/50" required />
                    </div>
                    <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-brand-600 text-white font-bold shadow-lg shadow-brand-500/20 hover:bg-brand-700 transition-all flex items-center justify-center gap-2">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
                    </button>
                    {/* Demo Button for testing */}
                    <button type="button" onClick={() => { enterInstructorDemo(); setTimeout(() => navigate('/instructor-dashboard'), 500); }} className="w-full py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200">Test Instructor Demo</button>
                </form>
            </motion.div>
        );
    };


    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center overflow-hidden relative">
            {/* Dynamic Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className={`absolute top-0 left-1/4 w-96 h-96 ${viewMode === 'parent' ? 'bg-indigo-500/10' : 'bg-brand-500/10'} rounded-full blur-3xl -translate-y-1/2 transition-colors duration-1000`} />
                <div className={`absolute bottom-0 right-1/4 w-96 h-96 ${viewMode === 'parent' ? 'bg-purple-500/10' : 'bg-accent-500/10'} rounded-full blur-3xl translate-y-1/2 transition-colors duration-1000`} />
            </div>

            <div className="w-full z-10 px-4">
                <AnimatePresence mode="wait">
                    {viewMode === 'selection' && <RoleSelection key="selection" />}
                    {viewMode === 'parent' && <ParentLoginForm key="parent" />}
                    {viewMode === 'admin' && <AdminLoginForm key="admin" />}
                </AnimatePresence>
            </div>
        </div>
    );
}
