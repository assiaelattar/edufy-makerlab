
import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useAppContext } from '../context/AppContext';
import { Lock, Mail, ArrowRight, Loader2, AlertCircle, CheckSquare, Square, ShieldCheck, UserPlus, Fingerprint } from 'lucide-react';
import { Logo } from '../components/Logo';
import { authenticateBiometric, isBiometricEnabled } from '../utils/biometrics';

export const LoginView = () => {
    const { settings } = useAppContext();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('admin@edufy.com');
    const [password, setPassword] = useState('admin123@');
    const [rememberMe, setRememberMe] = useState(true);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetSent, setResetSent] = useState(false);
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
                // Simulate login success for demo
                // In real production with Firebase, we need a Custom Token or Password
                // For this ERP, we'll use the hardcoded admin creds if the biometric matches the 'simulated' email, 
                // OR just inform the user.
                if (email === 'admin@edufy.com') {
                    await signInWithEmailAndPassword(auth!, 'admin@edufy.com', 'admin123@');
                } else {
                    // Just fill the email for them
                    setEmail(email);
                    setError("Biometric verified! Please enter password to confirm session (Security Requirement).");
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
            // Set persistence based on "Remember Me"
            const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
            await setPersistence(auth, persistenceType);

            let credential;
            if (isLogin) {
                credential = await signInWithEmailAndPassword(auth, email, password);
            } else {
                credential = await createUserWithEmailAndPassword(auth, email, password);
            }

            // --- REDIRECT LOGIC FOR EXTERNAL APPS (e.g. SparkQuest) ---
            const params = new URLSearchParams(window.location.search);
            const service = params.get('service');
            const redirectUrl = params.get('redirect');

            if (service && redirectUrl && credential.user) {
                // Create Bridge Token (Base64 JSON)
                const bridgePayload = {
                    uid: credential.user.uid,
                    email: credential.user.email,
                    name: credential.user.displayName || (email.split('@')[0]),
                    photoURL: credential.user.photoURL,
                    role: isLogin ? 'instructor' : 'student',
                    timestamp: Date.now()
                };

                const token = btoa(JSON.stringify(bridgePayload));

                console.log("🚀 [ERP Login] Processing Unified Login Redirect");
                if (!token || token.length < 10) {
                    console.error("❌ [ERP Login] Bridge Token Generation Failed");
                    alert("Auth Error: Failed to generate bridge token.");
                    return;
                }

                console.log("✅ [ERP Login] Token Generated. Redirecting...");

                // Allow time for state updates if needed, then redirect
                setTimeout(() => {
                    window.location.href = `${redirectUrl}?token=${token}`;
                }, 1000);
                return;
            }

        } catch (err: any) {
            console.error(err);
            let msg = "Authentication failed.";

            // Common User Errors
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                // Helpful hint for fresh installs using default credentials
                if (email === 'admin@edufy.com' && isLogin) {
                    msg = "Account not found. This appears to be a fresh install.";
                    setShowSignUpPrompt(true);
                } else {
                    msg = "Invalid email or password.";
                }
            } else if (err.code === 'auth/email-already-in-use') {
                msg = "Email already in use.";
            } else if (err.code === 'auth/weak-password') {
                msg = "Password should be at least 6 characters.";
            } else if (err.code === 'auth/too-many-requests') {
                msg = "Too many failed attempts. Please try again later.";
            } else if (err.code === 'auth/network-request-failed') {
                msg = "Network error. Please check your internet connection.";
            }

            // Configuration Errors
            if (err.code === 'auth/configuration-not-found' || err.code === 'auth/operation-not-allowed' || err.code === 'auth/admin-restricted-operation' || err.code === 'auth/internal-error') {
                msg = "Login Service is currently unavailable. Please contact support.";
            }

            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        if (!email) {
            setError("Please enter your email first to reset password.");
            return;
        }
        if (!auth) return;
        try {
            await sendPasswordResetEmail(auth, email);
            setResetSent(true);
            setError('');
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center md:p-4 overflow-hidden font-sans text-slate-200">
            <div className="w-full max-w-5xl bg-slate-900 md:rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-slate-800 min-h-[600px]">

                {/* Left Side - Hero / Branding */}
                <div className="relative hidden md:flex w-1/2 bg-blue-950 flex-col justify-between p-12 overflow-hidden">
                    {/* Background Effects */}
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/20 to-indigo-900/40 z-0"></div>
                    <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px]"></div>
                    <div className="absolute bottom-0 right-0 w-full h-1/2 bg-gradient-to-t from-slate-950 to-transparent opacity-60"></div>

                    {/* Content */}
                    <div className="relative z-10">
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
                        <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4" /> Secure
                        </div>
                        <div className="w-1 h-1 bg-blue-500/50 rounded-full"></div>
                        <div>Reliable</div>
                        <div className="w-1 h-1 bg-blue-500/50 rounded-full"></div>
                        <div>Fast</div>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-center bg-slate-900 relative">
                    <div className="max-w-sm mx-auto w-full">
                        <div className="text-center md:text-left mb-8">
                            <div className="md:hidden w-16 h-16 bg-slate-800 rounded-2xl mx-auto flex items-center justify-center mb-4 border border-slate-700">
                                {settings.logoUrl ? (
                                    <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                                ) : (
                                    <Logo className="w-8 h-8" />
                                )}
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">{isLogin ? 'Welcome back' : 'Get started'}</h3>
                            <p className="text-slate-400 text-sm">
                                {isLogin ? 'Please enter your details to sign in.' : 'Create a new account to access the dashboard.'}
                            </p>
                        </div>

                        {/* Biometric Button */}
                        {isLogin && biometricAvailable && (
                            <div className="mb-6">
                                <button
                                    onClick={handleBiometricLogin}
                                    disabled={loading}
                                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 font-bold flex items-center justify-center gap-2 transition-colors"
                                >
                                    {loading ? <Loader2 size={20} className="animate-spin" /> : <Fingerprint size={20} className="text-cyan-400" />}
                                    Sign in with Passkey
                                </button>
                                <div className="relative flex items-center py-4">
                                    <div className="flex-grow border-t border-slate-800"></div>
                                    <span className="flex-shrink-0 mx-4 text-slate-500 text-xs">OR</span>
                                    <div className="flex-grow border-t border-slate-800"></div>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex flex-col gap-2 text-red-200 text-xs animate-in slide-in-from-top-1">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                                        <span>{error}</span>
                                    </div>
                                    {showSignUpPrompt && (
                                        <button
                                            type="button"
                                            onClick={() => setIsLogin(false)}
                                            className="self-start ml-7 text-blue-400 hover:text-blue-300 underline font-bold flex items-center gap-1"
                                        >
                                            <UserPlus size={12} /> Create Admin Account Now
                                        </button>
                                    )}
                                </div>
                            )}

                            {resetSent && (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg flex items-start gap-3 text-emerald-200 text-xs animate-in slide-in-from-top-1">
                                    <CheckSquare className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                                    <span>Password reset link sent to your email.</span>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                                        placeholder="Email address"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>

                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setRememberMe(!rememberMe)}>
                                    <button type="button" className={`text-blue-500 transition-colors`}>
                                        {rememberMe ? <CheckSquare size={16} /> : <Square size={16} className="text-slate-600 group-hover:text-slate-400" />}
                                    </button>
                                    <span className="text-xs text-slate-400 group-hover:text-slate-300 select-none">Remember me</span>
                                </div>
                                <button type="button" onClick={handleReset} className="text-xs text-slate-500 hover:text-blue-400 transition-colors font-medium">
                                    Forgot password?
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                                    <>
                                        {isLogin ? 'Sign In' : 'Create Account'} <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 text-center">
                            <p className="text-slate-500 text-xs">
                                {isLogin ? "Don't have an account?" : "Already have an account?"}
                                <button onClick={() => setIsLogin(!isLogin)} className="text-blue-400 hover:text-blue-300 ml-1 font-medium transition-colors">
                                    {isLogin ? "Sign Up" : "Sign In"}
                                </button>
                            </p>
                        </div>
                    </div>

                    {/* Footer for mobile/tablet */}
                    <div className="mt-auto pt-8 text-center md:text-left">
                        <p className="text-[10px] text-slate-600">
                            © {new Date().getFullYear()} {settings.academyName}. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
