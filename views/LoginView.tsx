
import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useAppContext } from '../context/AppContext';
import { Lock, Mail, ArrowRight, Loader2, AlertCircle, CheckSquare, Square, ShieldCheck, UserPlus, Fingerprint, Users, Rocket, ChevronLeft, Baby } from 'lucide-react';
import { Logo } from '../components/Logo';
import { authenticateBiometric, isBiometricEnabled } from '../utils/biometrics';
import { motion, AnimatePresence } from 'framer-motion';

export const LoginView = () => {
    const { settings } = useAppContext();
    const [viewMode, setViewMode] = useState<'selection' | 'parent' | 'admin'>(
        window.location.hash.includes('#admin') ? 'admin' : 'selection'
    );

    // --- SUB-COMPONENTS ---

    const RoleSelection = () => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-4xl mx-auto p-4 md:p-8 flex flex-col items-center justify-center min-h-[80vh]"
        >
            <div className="text-center mb-12">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl mx-auto flex items-center justify-center text-white p-4 shadow-2xl shadow-blue-900/40 mb-8 border border-white/10">
                    {settings.logoUrl ? <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain filter brightness-0 invert" /> : <Logo className="w-10 h-10" />}
                </div>
                <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-6">
                    Welcome to <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">{settings.academyName}</span>
                </h1>
                <p className="text-xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
                    Access your personalized learning portal. Select your role to get started.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full mx-auto px-4">
                {/* Parent Card */}
                <div
                    onClick={() => setViewMode('parent')}
                    className="cursor-pointer group relative bg-slate-900/50 backdrop-blur-sm border border-slate-800 hover:border-indigo-500/50 p-10 rounded-[2.5rem] shadow-xl hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-300"
                >
                    <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-indigo-500/20">
                        <Users className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-indigo-400 transition-colors">Parent Portal</h3>
                    <p className="text-slate-400 mb-8 leading-relaxed">Track your child's progress, manage enrollments, and view payments securedly.</p>
                    <div className="flex items-center text-indigo-400 font-bold text-sm tracking-wide uppercase">
                        Access Portal <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>

                {/* Student Card */}
                <div
                    onClick={() => window.location.href = 'https://sparkquest-makerlab.vercel.app'}
                    className="cursor-pointer group relative bg-slate-900/50 backdrop-blur-sm border border-slate-800 hover:border-blue-500/50 p-10 rounded-[2.5rem] shadow-xl hover:shadow-blue-500/20 transition-all duration-300 overflow-hidden"
                >
                    {/* Abstract bg element */}
                    <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/20 transition-colors"></div>

                    <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-blue-500/20 backdrop-blur-sm relative z-10">
                        <Rocket className="w-8 h-8 text-blue-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors relative z-10">Student Portal</h3>
                    <p className="text-slate-400 mb-8 leading-relaxed relative z-10">Launch SparkQuest to access your missions, projects, and creative studio.</p>
                    <div className="flex items-center text-blue-400 font-bold text-sm tracking-wide uppercase relative z-10">
                        Launch SparkQuest <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>
            </div>

            <div className="mt-20 text-center">
                <button
                    onClick={() => setViewMode('admin')}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-300 transition-colors px-6 py-3 rounded-full hover:bg-slate-800/50"
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
            console.log("Attempting Parent Login...");
            if (!auth) {
                console.error("Auth instance missing");
                return;
            }
            setError('');
            setLoading(true);

            try {
                const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
                await setPersistence(auth, persistenceType);
                console.log("Persistence set, signing in...");
                const cred = await signInWithEmailAndPassword(auth, email, password);
                console.log("Sign in successful!", cred.user.uid);
                // Force reload if redirect doesn't happen automatically
                window.location.reload();
            } catch (err: any) {
                console.error("Login Error:", err);
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

        return (
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full max-w-5xl mx-auto bg-slate-900 md:rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-slate-800 min-h-[600px]"
            >
                {/* Left Side (Parent Branding) */}
                <div className="relative md:w-1/2 bg-gradient-to-br from-indigo-900 to-purple-900 p-12 text-white flex flex-col justify-between overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

                    <button onClick={() => setViewMode('selection')} className="absolute top-6 left-6 p-2 bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-sm transition-colors border border-white/10">
                        <ChevronLeft className="w-5 h-5 text-white" />
                    </button>

                    <div className="relative z-10 mt-12">
                        <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 mb-6">
                            <Users className="w-6 h-6 text-indigo-300" />
                        </div>
                        <h2 className="text-4xl font-bold leading-tight mb-4">Track your child's <br /> progress & growth.</h2>
                        <p className="text-indigo-200/80 text-sm max-w-xs leading-relaxed">Stay connected with your child's learning journey, view projects, and manage enrollments.</p>
                    </div>

                    <div className="relative z-10 flex items-center gap-4 text-xs text-indigo-300/60 font-medium">
                        <div className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Secure Portal</div>
                        <div className="w-1 h-1 bg-indigo-400/50 rounded-full"></div>
                        <div className="flex items-center gap-1.5"><Baby className="w-4 h-4" /> Student Focused</div>
                    </div>
                </div>

                {/* Right Side (Parent Form) */}
                <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-center bg-slate-900 relative">
                    <div className="max-w-sm mx-auto w-full">
                        <div className="mb-8">
                            <h3 className="text-2xl font-bold text-white mb-2">Parent Sign In</h3>
                            <p className="text-slate-400 text-sm">Welcome back! Please enter your details.</p>
                        </div>

                        <form onSubmit={handleParentLogin} className="space-y-4">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-start gap-3 text-red-200 text-xs">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
                                        placeholder="Parent Email"
                                    />
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setRememberMe(!rememberMe)}>
                                    <button type="button" className="text-indigo-500 transition-colors">
                                        {rememberMe ? <CheckSquare size={16} /> : <Square size={16} className="text-slate-600 group-hover:text-slate-400" />}
                                    </button>
                                    <span className="text-xs text-slate-400 group-hover:text-slate-300 select-none">Remember me</span>
                                </div>
                                <button type="button" className="text-xs text-slate-500 hover:text-indigo-400 font-medium">Forgot password?</button>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
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
        const [isLogin, setIsLogin] = useState(!window.location.hash.includes('#signup'));
        const [email, setEmail] = useState('');
        const [password, setPassword] = useState('');
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState('');
        const [rememberMe, setRememberMe] = useState(true);
        const [showSignUpPrompt, setShowSignUpPrompt] = useState(false);
        const [biometricAvailable, setBiometricAvailable] = useState(false);

        useEffect(() => {
            setBiometricAvailable(isBiometricEnabled());
        }, []);

        const handleBiometricLogin = async () => {
            setLoading(true);
            setError('');

            try {
                const email = await authenticateBiometric();
                if (email) {
                    if (email === 'admin@edufy.com') {
                        await signInWithEmailAndPassword(auth!, 'admin@edufy.com', 'admin123@');
                    } else {
                        setEmail(email);
                        setError("Biometric verified! Please enter password.");
                    }
                }
            } catch (e) {
                console.error(e);
                setError("Biometric login failed.");
            } finally {
                setLoading(false);
            }
        };

        const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault();
            if (!auth) return;
            setError('');
            setLoading(true);
            setShowSignUpPrompt(false);

            try {
                const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
                await setPersistence(auth, persistenceType);

                if (isLogin) {
                    await signInWithEmailAndPassword(auth, email, password);
                } else {
                    await createUserWithEmailAndPassword(auth, email, password);
                }
            } catch (err: any) {
                console.error(err);
                let msg = "Authentication failed.";
                if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                    if (email === 'admin@edufy.com' && isLogin) {
                        msg = "Account not found. This appears to be a fresh install.";
                        setShowSignUpPrompt(true);
                    } else {
                        msg = "Invalid email or password.";
                    }
                }
                setError(msg);
            } finally {
                setLoading(false);
            }
        };

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-5xl mx-auto bg-slate-900 md:rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-slate-800 min-h-[600px] relative"
            >
                <button onClick={() => setViewMode('selection')} className="absolute top-6 left-6 p-2 bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-sm transition-colors border border-white/10 z-20">
                    <ChevronLeft className="w-5 h-5 text-white" />
                </button>

                {/* Left Side - Hero / Branding */}
                <div className="relative hidden md:flex w-1/2 bg-blue-950 flex-col justify-between p-12 overflow-hidden">
                    {/* Background Effects */}
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/20 to-indigo-900/40 z-0"></div>
                    <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px]"></div>
                    <div className="absolute bottom-0 right-0 w-full h-1/2 bg-gradient-to-t from-slate-950 to-transparent opacity-60"></div>

                    {/* Content */}
                    <div className="relative z-10 pt-10">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10">
                                {settings.logoUrl ? (
                                    <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                                ) : (
                                    <Logo className="w-6 h-6" />
                                )}
                            </div>
                            <span className="font-bold text-white tracking-wide">{settings.academyName}</span>
                        </div>
                        <h2 className="text-4xl font-bold text-white leading-tight mb-4">
                            Manage your academy <br /> with confidence.
                        </h2>
                        <p className="text-blue-200/80 text-sm max-w-xs leading-relaxed">
                            Streamline enrollments, track finances, and manage your team in one unified platform.
                        </p>
                    </div>

                    <div className="relative z-10 flex items-center gap-4 text-xs text-blue-300/60 font-medium">
                        <div className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Secure</div>
                        <div className="w-1 h-1 bg-blue-500/50 rounded-full"></div>
                        <div>Reliable</div>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-center bg-slate-900 relative">
                    <div className="max-w-sm mx-auto w-full">
                        <div className="text-center md:text-left mb-8">
                            <h3 className="text-2xl font-bold text-white mb-2">{isLogin ? 'Welcome back' : 'Get started'}</h3>
                            <p className="text-slate-400 text-sm">
                                {isLogin ? 'Please enter your details to sign in.' : 'Create a new account to access the dashboard.'}
                            </p>
                        </div>

                        {/* Biometric Button */}
                        {isLogin && biometricAvailable && (
                            <div className="mb-6">
                                <button onClick={handleBiometricLogin} disabled={loading} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 font-bold flex items-center justify-center gap-2 transition-colors">
                                    {loading ? <Loader2 size={20} className="animate-spin" /> : <Fingerprint size={20} className="text-cyan-400" />}
                                    Sign in with Passkey
                                </button>
                                <div className="relative flex items-center py-4">
                                    <div className="flex-grow border-t border-slate-800"></div><span className="flex-shrink-0 mx-4 text-slate-500 text-xs">OR</span><div className="flex-grow border-t border-slate-800"></div>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex flex-col gap-2 text-red-200 text-xs">
                                    <div className="flex items-start gap-3"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" /><span>{error}</span></div>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                    </div>
                                    <input type="email" required className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
                                </div>

                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                    </div>
                                    <input type="password" required className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setRememberMe(!rememberMe)}>
                                    <button type="button" className={`text-blue-500 transition-colors`}>{rememberMe ? <CheckSquare size={16} /> : <Square size={16} className="text-slate-600 group-hover:text-slate-400" />}</button>
                                    <span className="text-xs text-slate-400 group-hover:text-slate-300 select-none">Remember me</span>
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <>{isLogin ? 'Sign In' : 'Create Account'} <ArrowRight className="w-4 h-4" /></>}
                            </button>
                        </form>
                        <div className="mt-8 text-center">
                            <p className="text-slate-500 text-xs">
                                {isLogin ? "Don't have an account?" : "Already have an account?"}
                                <button onClick={() => setIsLogin(!isLogin)} className="text-blue-400 hover:text-blue-300 ml-1 font-medium transition-colors">{isLogin ? "Sign Up" : "Sign In"}</button>
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center overflow-hidden font-sans text-slate-200 relative">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className={`absolute top-0 left-1/4 w-96 h-96 ${viewMode === 'parent' ? 'bg-indigo-600/10' : 'bg-blue-600/10'} rounded-full blur-[120px] -translate-y-1/2 transition-colors duration-1000`} />
                <div className={`absolute bottom-0 right-1/4 w-96 h-96 ${viewMode === 'parent' ? 'bg-purple-600/10' : 'bg-cyan-600/10'} rounded-full blur-[120px] translate-y-1/2 transition-colors duration-1000`} />
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
};
