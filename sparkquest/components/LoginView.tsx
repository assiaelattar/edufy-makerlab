import React, { useState } from 'react';
import { Lock, ArrowRight, AlertCircle, Eye, EyeOff, Hammer, CheckCircle2, ArrowLeft } from 'lucide-react';
import { config } from '../utils/config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';

export const LoginView: React.FC = () => {
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
        <main className="sq-login-shell">
            <section className="sq-login-story" aria-labelledby="sparkquest-title">
                <div className="sq-login-brand"><span>MakerLab</span> / SparkQuest</div>
                <div className="sq-login-story-copy">
                    <p className="sq-entry-eyebrow">Your project workshop</p>
                    <h1 id="sparkquest-title">Turn today’s idea into something real.</h1>
                    <p>Open your mission, keep building, and show the evidence of what you made.</p>
                </div>
                <ol className="sq-bench-path" aria-label="SparkQuest project path">
                    <li className="is-active"><span>1</span><div><strong>Enter</strong><small>Your secure workshop pass</small></div></li>
                    <li><span>2</span><div><strong>Build</strong><small>Your current mission and tools</small></div></li>
                    <li><span>3</span><div><strong>Show</strong><small>Evidence, feedback and portfolio</small></div></li>
                </ol>
            </section>

            <section className="sq-login-panel" aria-labelledby="sign-in-title">
                <div className="sq-login-form-wrap">
                    <div className="sq-entry-mark" aria-hidden="true"><Hammer /></div>
                    <p className="sq-entry-eyebrow">Welcome back</p>
                    <h2 id="sign-in-title">Open your project bench</h2>
                    <p className="sq-entry-copy">Use the learner account created in Edufy.</p>

                    {error && (
                        <div className="sq-login-error" role="alert">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="sq-login-form">
                        <label>
                            <span>Email address</span>
                            <input
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                placeholder="student@makerlab.academy"
                                required
                                autoComplete="email"
                            />
                        </label>

                        <label>
                            <span>Password</span>
                            <div className="sq-password-field">
                                <Lock size={18} aria-hidden="true" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    placeholder="Your password"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(current => !current)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </label>

                        <button type="submit" disabled={loading} className="sq-entry-primary sq-login-submit">
                            {loading ? <span className="sq-login-spinner" aria-label="Signing in" /> : <><span>Continue to my projects</span><ArrowRight size={19} /></>}
                        </button>
                    </form>

                    <div className="sq-login-trust"><CheckCircle2 size={17} /><span>Projects stay linked to your verified Edufy learner profile.</span></div>
                    <a className="sq-entry-text-action sq-login-back" href={config.erpUrl}><ArrowLeft size={16} /> Back to Edufy</a>
                </div>
            </section>
        </main>
    );
};
