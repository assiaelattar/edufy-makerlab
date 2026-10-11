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
    const isParentEntry = new URLSearchParams(window.location.search).get('role') === 'parent';

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
                    <p className="sq-entry-eyebrow">{isParentEntry ? 'Your family workspace' : 'Your project workshop'}</p>
                    <h1 id="sparkquest-title">{isParentEntry ? 'Stay close to every learning journey.' : 'Turn today’s idea into something real.'}</h1>
                    <p>{isParentEntry ? 'See linked learners, project feedback, payments, attendance, and Pickup in one place.' : 'Open your mission, keep building, and show the evidence of what you made.'}</p>
                </div>
                <ol className="sq-bench-path" aria-label={isParentEntry ? 'SparkQuest family path' : 'SparkQuest project path'}>
                    <li className="is-active"><span>1</span><div><strong>{isParentEntry ? 'Sign in' : 'Enter'}</strong><small>{isParentEntry ? 'Your academy-issued access' : 'Your secure workshop pass'}</small></div></li>
                    <li><span>2</span><div><strong>{isParentEntry ? 'Follow' : 'Build'}</strong><small>{isParentEntry ? 'Every linked learner' : 'Your current mission and tools'}</small></div></li>
                    <li><span>3</span><div><strong>{isParentEntry ? 'Support' : 'Show'}</strong><small>{isParentEntry ? 'Learning and daily essentials' : 'Evidence, feedback and portfolio'}</small></div></li>
                </ol>
            </section>

            <section className="sq-login-panel" aria-labelledby="sign-in-title">
                <div className="sq-login-form-wrap">
                    <div className="sq-entry-mark" aria-hidden="true"><Hammer /></div>
                    <p className="sq-entry-eyebrow">Welcome back</p>
                    <h2 id="sign-in-title">{isParentEntry ? 'Open your family workspace' : 'Open your project bench'}</h2>
                    <p className="sq-entry-copy">{isParentEntry ? 'Use the MakerLab email and password shared directly by the academy. No activation link is needed.' : 'Use your learner or parent account connected in Edufy.'}</p>

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
                                placeholder={isParentEntry ? 'p.name@makerlab.academy' : 'you@example.com'}
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
                            {loading ? <span className="sq-login-spinner" aria-label="Signing in" /> : <><span>Continue to SparkQuest</span><ArrowRight size={19} /></>}
                        </button>
                    </form>

                    <div className="sq-login-trust"><CheckCircle2 size={17} /><span>{isParentEntry ? 'Your access opens only the learners and records linked to your verified family account.' : 'Learning stays linked to verified Edufy accounts and family connections.'}</span></div>
                    {isParentEntry
                        ? <p className="sq-entry-text-action sq-login-back">Need a password reset? Ask the MakerLab team to issue one securely.</p>
                        : <a className="sq-entry-text-action sq-login-back" href={config.erpUrl}><ArrowLeft size={16} /> Back to Edufy</a>}
                </div>
            </section>
        </main>
    );
};
