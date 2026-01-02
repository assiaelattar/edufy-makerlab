
import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useAppContext } from '../context/AppContext';
import { Lock, Mail, ArrowRight, Loader2, AlertCircle, CheckSquare, Square, ShieldCheck, Fingerprint, Baby, Rocket } from 'lucide-react';
import { Logo } from '../components/Logo';
import { authenticateBiometric, isBiometricEnabled } from '../utils/biometrics';

export const ParentLoginView = () => {
    const { settings } = useAppContext();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(true);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
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
                setEmail(email);
                setError("Biometric verified! Please enter password to confirm session.");
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

        try {
            const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
            await setPersistence(auth, persistenceType);
            await signInWithEmailAndPassword(auth, email, password);
            // Success will trigger auth state change in App.tsx
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

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center md:p-4 overflow-hidden font-sans text-slate-800">
            <div className="w-full max-w-5xl bg-white md:rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-slate-200 min-h-[600px]">

                {/* Left Side - Hero / Branding (Warmer Theme) */}
                <div className="relative hidden md:flex w-1/2 bg-gradient-to-br from-indigo-600 to-purple-700 flex-col justify-between p-12 overflow-hidden">
                    {/* Background Effects */}
                    <div className="absolute top-0 left-0 w-full h-full bg-white/5 z-0"></div>
                    <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-400/30 rounded-full blur-[100px]"></div>
                    <div className="absolute bottom-0 right-0 w-full h-1/2 bg-gradient-to-t from-purple-900/50 to-transparent opacity-60"></div>

                    {/* Content */}
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                                {settings.logoUrl ? (
                                    <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                                ) : (
                                    <Logo className="w-6 h-6 text-white" />
                                )}
                            </div>
                            <span className="font-bold text-white tracking-wide">{settings.academyName}</span>
                        </div>
                        <h2 className="text-4xl font-bold text-white leading-tight mb-4">
                            Track your child's <br /> progress & growth.
                        </h2>
                        <p className="text-indigo-100 text-sm max-w-xs leading-relaxed">
                            Stay connected with your child's learning journey, view projects, and manage enrollments seamlessly.
                        </p>
                    </div>

                    <div className="relative z-10 flex items-center gap-4 text-xs text-indigo-200 font-medium">
                        <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4" /> Secure Portal
                        </div>
                        <div className="w-1 h-1 bg-indigo-300/50 rounded-full"></div>
                        <div className="flex items-center gap-1.5">
                            <Baby className="w-4 h-4" /> Student Focused
                        </div>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-center bg-white relative">
                    <div className="max-w-sm mx-auto w-full">
                        <div className="text-center md:text-left mb-8">
                            <div className="md:hidden w-16 h-16 bg-indigo-50 rounded-2xl mx-auto flex items-center justify-center mb-4 border border-indigo-100">
                                {settings.logoUrl ? (
                                    <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                                ) : (
                                    <Logo className="w-8 h-8 text-indigo-600" />
                                )}
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800 mb-2">Parent Portal Access</h3>
                            <p className="text-slate-500 text-sm">
                                Please sign in with your parent credentials.
                            </p>
                        </div>

                        {/* Biometric Button */}
                        <div className="mb-6">
                            <button
                                onClick={handleBiometricLogin}
                                disabled={loading}
                                className="w-full py-3 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-200 font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                            >
                                {loading ? <Loader2 size={20} className="animate-spin" /> : <Fingerprint size={20} className="text-purple-600" />}
                                Sign in with Passkey
                            </button>

                            {/* SparkQuest Link */}
                            <div className="mt-3 text-center">
                                <a
                                    href="https://sparkquest-makerlab.vercel.app"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
                                >
                                    <Rocket size={14} /> Student Portal (SparkQuest)
                                </a>
                            </div>

                            <div className="relative flex items-center py-4">
                                <div className="flex-grow border-t border-slate-100"></div>
                                <span className="flex-shrink-0 mx-4 text-slate-400 text-xs">OR</span>
                                <div className="flex-grow border-t border-slate-100"></div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="bg-red-50 border border-red-100 p-3 rounded-lg flex flex-col gap-2 text-red-600 text-xs animate-in slide-in-from-top-1">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span>{error}</span>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-purple-600 transition-colors" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-slate-800 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all placeholder:text-slate-400"
                                        placeholder="Parent Email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>

                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-purple-600 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-slate-800 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all placeholder:text-slate-400"
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setRememberMe(!rememberMe)}>
                                    <button type="button" className={`text-purple-600 transition-colors`}>
                                        {rememberMe ? <CheckSquare size={16} /> : <Square size={16} className="text-slate-400 group-hover:text-slate-600" />}
                                    </button>
                                    <span className="text-xs text-slate-500 group-hover:text-slate-700 select-none">Remember me</span>
                                </div>
                                <button type="button" className="text-xs text-slate-500 hover:text-purple-600 transition-colors font-medium">
                                    Forgot password?
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-purple-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                                    <>
                                        Sign In <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Footer for mobile/tablet */}
                    <div className="mt-auto pt-8 text-center md:text-left">
                        <p className="text-[10px] text-slate-400">
                            © {new Date().getFullYear()} {settings.academyName}. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
