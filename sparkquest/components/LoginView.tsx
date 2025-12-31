import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { config } from '../utils/config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';

export const LoginView: React.FC = () => {
    // We don't need signIn from context if we use direct firebase auth
    // The onAuthStateChanged in context will pick up the change
    const [email, setEmail] = useState(() => localStorage.getItem('sparkquest_remember_email') || '');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (!auth) throw new Error("Auth service undefined");
            await signInWithEmailAndPassword(auth, email, password);

            // AuthContext will update 'user' state, App.tsx will re-render and remove this view

        } catch (err: any) {
            console.error(err);
            setError('Invalid email or password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 animate-in fade-in zoom-in duration-500">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
                        <User className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-black text-white mb-2 tracking-tight">SparkQuest</h1>
                    <p className="text-slate-400">Student Portal Login</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm animate-in slide-in-from-top-2">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email Address</label>
                        <div className="relative group z-10">
                            <div className="absolute inset-0 bg-blue-500/20 rounded-xl blur transition-opacity opacity-0 group-focus-within:opacity-100" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="relative w-full bg-slate-950 border border-slate-800 text-white px-4 py-3.5 rounded-xl outline-none focus:border-blue-500 transition-all placeholder:text-slate-600 z-20"
                                placeholder="student@makerlab.edu"
                                required
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
                            <div className="relative group z-10">
                                <div className="absolute inset-0 bg-blue-500/20 rounded-xl blur transition-opacity opacity-0 group-focus-within:opacity-100" />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 z-10">
                                    <Lock size={16} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="relative w-full bg-slate-950 border border-slate-800 text-white pl-10 pr-12 py-3.5 rounded-xl outline-none focus:border-blue-500 transition-all placeholder:text-slate-600 z-20"
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white z-30 transition-colors"
                                >
                                    {showPassword ? (
                                        <EyeOff size={16} />
                                    ) : (
                                        <Eye size={16} />
                                    )}
                                </button>
                            </div>
                        </div>

                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                Enter Studio <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
