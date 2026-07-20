import React, { useEffect, useState } from 'react';
import { browserLocalPersistence, browserSessionPersistence, setPersistence, signInWithEmailAndPassword } from 'firebase/auth';
import { AlertCircle, ArrowRight, BookOpenCheck, Fingerprint, Loader2, Lock, Mail, Rocket, ShieldCheck, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../maker-pro/src/context/AuthContext';
import { auth } from '../services/firebase';
import { authenticateBiometric, isBiometricEnabled } from '../utils/biometrics';

export const ParentLoginView = () => {
    const { settings } = useAppContext();
    const navigate = useNavigate();
    const { user, userRole, loading: authLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(true);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);

    useEffect(() => {
        setBiometricAvailable(isBiometricEnabled());
    }, []);

    useEffect(() => {
        if (!authLoading && user) {
            if (userRole === 'parent') {
                navigate('/parent-dashboard');
            } else if (userRole === 'instructor') {
                navigate('/instructor-dashboard');
            } else {
                navigate('/');
            }
        }
    }, [user, userRole, authLoading, navigate]);

    const handleBiometricLogin = async () => {
        setLoading(true);
        setError('');

        try {
            const biometricEmail = await authenticateBiometric();
            if (biometricEmail) {
                setEmail(biometricEmail);
                setError('Biometric verified. Enter your password to confirm this session.');
            }
        } catch (error) {
            console.error(error);
            setError('Biometric login failed. Use your email and password instead.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!auth) return;
        setError('');
        setLoading(true);

        try {
            const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
            await setPersistence(auth, persistenceType);
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error: any) {
            console.error(error);
            let message = 'Authentication failed.';
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                message = 'Invalid email or password.';
            } else if (error.code === 'auth/too-many-requests') {
                message = 'Too many failed attempts. Please try again later.';
            } else if (error.code === 'auth/network-request-failed') {
                message = 'Network error. Please check your internet connection.';
            }
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F7F1E4] p-4 font-sans text-slate-950 sm:p-6 lg:p-10">
            <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-hidden rounded-lg border border-slate-950/10 bg-white shadow-[0_24px_80px_rgba(8,17,31,0.14)] md:min-h-[680px] lg:grid-cols-[1.05fr_0.95fr]">
                <section className="flex flex-col justify-between bg-[#08111F] p-7 text-white sm:p-10 lg:p-12">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06]">
                                {settings.logoUrl ? <img src={settings.logoUrl} alt="" className="h-full w-full object-contain p-1.5" /> : <Logo className="h-6 w-6 text-teal-300" />}
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-teal-300">Family workspace</p>
                                <p className="font-bold">{settings.academyName}</p>
                            </div>
                        </div>

                        <div className="mt-14 max-w-lg lg:mt-24">
                            <h1 className="text-3xl font-black leading-tight sm:text-4xl">Everything around your child, ready when you are.</h1>
                            <p className="mt-4 max-w-md text-sm leading-6 text-slate-400">Follow learning progress, published work, billing, gallery moments, and pickup from one connected place.</p>
                        </div>

                        <div className="mt-10 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                                <BookOpenCheck className="text-teal-300" size={19} />
                                <p className="mt-3 text-sm font-bold">Learning at a glance</p>
                                <p className="mt-1 text-xs leading-5 text-slate-500">Projects, evidence, feedback, and next steps stay connected.</p>
                            </div>
                            <div className="rounded-lg border border-amber-300/15 bg-amber-300/[0.04] p-4">
                                <Users className="text-amber-200" size={19} />
                                <p className="mt-3 text-sm font-bold">Built for families</p>
                                <p className="mt-1 text-xs leading-5 text-slate-500">Fast access to the actions and updates that need attention.</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-400">
                        <span className="flex items-center gap-1.5"><ShieldCheck size={15} className="text-teal-300" /> Secure family access</span>
                        <a href="https://sparkquest-makerlab.vercel.app" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-amber-200 transition-colors hover:text-amber-100"><Rocket size={15} /> Open student portal</a>
                    </div>
                </section>

                <section className="flex items-center p-7 sm:p-10 lg:p-14">
                    <div className="mx-auto w-full max-w-sm">
                        <div className="mb-8">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-teal-700">Welcome back</p>
                            <h2 className="mt-2 text-2xl font-black text-[#08111F]">Sign in to your family workspace</h2>
                            <p className="mt-2 text-sm leading-6 text-slate-500">Use the parent credentials provided by your academy.</p>
                        </div>

                        {biometricAvailable && (
                            <button onClick={handleBiometricLogin} disabled={loading} className="mb-5 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:border-teal-500/40 hover:bg-teal-50 disabled:opacity-60">
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <Fingerprint size={18} className="text-teal-600" />}
                                Verify with passkey
                            </button>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div role="alert" className={`flex items-start gap-3 rounded-lg border p-3 text-xs ${error.startsWith('Biometric verified') ? 'border-teal-200 bg-teal-50 text-teal-800' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span className="leading-5">{error}</span>
                                </div>
                            )}

                            <label className="block">
                                <span className="mb-1.5 block text-xs font-bold text-slate-600">Email address</span>
                                <span className="relative block">
                                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input type="email" required autoComplete="email" className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15" placeholder="parent@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
                                </span>
                            </label>

                            <label className="block">
                                <span className="mb-1.5 block text-xs font-bold text-slate-600">Password</span>
                                <span className="relative block">
                                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input type="password" required autoComplete="current-password" className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15" placeholder="Your password" value={password} onChange={(event) => setPassword(event.target.value)} />
                                </span>
                            </label>

                            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
                                <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                                Keep me signed in on this device
                            </label>

                            <button type="submit" disabled={loading} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-teal-700/20 bg-teal-500 px-4 py-2.5 text-sm font-black text-slate-950 transition-colors hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-60">
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Open family workspace <ArrowRight className="h-4 w-4" /></>}
                            </button>
                        </form>

                        <p className="mt-8 text-[10px] text-slate-400">Copyright {new Date().getFullYear()} {settings.academyName}. All rights reserved.</p>
                    </div>
                </section>
            </div>
        </div>
    );
};
