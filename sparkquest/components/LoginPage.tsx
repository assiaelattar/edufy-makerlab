import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';

interface LoginPageProps {
    onLoginSuccess: (uid: string, email: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (!auth) {
                throw new Error('Firebase Auth not initialized');
            }

            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            console.log('✅ Login successful:', user.uid);
            onLoginSuccess(user.uid, user.email || email);
        } catch (err: any) {
            console.error('❌ Login failed:', err);
            setError(err.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                <svg width="100%" height="100%">
                    <pattern id="login-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                        <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#60a5fa" strokeWidth="1" />
                    </pattern>
                    <rect width="100%" height="100%" fill="url(#login-grid)" />
                </svg>
            </div>

            {/* Glowing Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[140px]"></div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md mx-4">
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-200 via-white to-blue-200 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] mb-2">
                        SPARK<span className="text-blue-500">QUEST</span>
                    </h1>
                    <p className="text-blue-300 font-bold tracking-[0.5em] text-sm uppercase">Mission Control</p>
                </div>

                {/* Login Form */}
                <div className="bg-slate-900/80 backdrop-blur-xl border-2 border-blue-500/30 rounded-3xl p-8 shadow-2xl shadow-blue-900/50">
                    <div className="flex items-center justify-center mb-6">
                        <div className="text-6xl">
                            🚀
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-white text-center mb-6">
                        Student Login
                    </h2>

                    <form onSubmit={handleLogin} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-bold text-blue-300 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="student@example.com"
                                required
                                className="w-full px-4 py-3 bg-slate-800/50 border-2 border-blue-500/30 rounded-xl text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none transition-colors"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-bold text-blue-300 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full px-4 py-3 bg-slate-800/50 border-2 border-blue-500/30 rounded-xl text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none transition-colors"
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-500/20 border-2 border-red-500/50 rounded-xl p-3 text-red-300 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Login Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-lg rounded-xl border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 hover:from-blue-500 hover:to-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/50"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Launching...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    🚀 Launch Mission Control
                                </span>
                            )}
                        </button>
                    </form>

                    {/* Demo Mode Link */}
                    <div className="mt-6 text-center">
                        <a
                            href="/?demo=true"
                            className="text-sm text-blue-400 hover:text-blue-300 underline"
                        >
                            Or try Demo Mode →
                        </a>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-6 text-slate-500 text-sm">
                    <p>🚀 Welcome back, Space Explorer!</p>
                </div>
            </div>
        </div>
    );
};
