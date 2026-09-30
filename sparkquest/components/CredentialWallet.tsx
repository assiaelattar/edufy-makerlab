import React, { useEffect, useState } from 'react';
import { Check, Copy, Eye, EyeOff, KeyRound, Plus, Save, Trash2, X } from 'lucide-react';
import { arrayRemove, arrayUnion, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { Credential } from '../types';

interface CredentialWalletProps {
    isOpen: boolean;
    onClose: () => void;
    highlightService?: string;
    previewMode?: boolean;
}

const PREVIEW_CREDENTIALS: Credential[] = [
    { id: 'credential-tinkercad', service: 'Tinkercad', label: 'Class workspace', username: 'maker.aya', password: 'Spark-2046', url: 'https://www.tinkercad.com' },
    { id: 'credential-scratch', service: 'Scratch', label: 'Studio account', username: 'aya_builds', password: '', url: 'https://scratch.mit.edu' },
    { id: 'credential-canva', service: 'Canva', label: 'Presentation kit', username: 'aya@makerlab.test', password: 'Canvas-77', url: 'https://www.canva.com' },
];

const serviceMark = (service: string) => {
    if (service === 'Tinkercad') return '3D';
    if (service === 'Scratch') return 'SC';
    if (service === 'Canva') return 'CV';
    if (service === 'Google') return 'G';
    if (service === 'Onshape') return 'OS';
    return 'KEY';
};

export const CredentialWallet: React.FC<CredentialWalletProps> = ({ isOpen, onClose, highlightService, previewMode = false }) => {
    const { user, userProfile } = useAuth();
    const [credentials, setCredentials] = useState<Credential[]>([]);
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [pendingDelete, setPendingDelete] = useState<Credential | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [newCred, setNewCred] = useState<Partial<Credential>>({ service: highlightService || 'Tinkercad', label: 'My account' });
    const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (!isOpen) return;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') pendingDelete ? setPendingDelete(null) : onClose();
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [isOpen, onClose, pendingDelete]);

    useEffect(() => {
        if (!isOpen) return;
        if (previewMode) {
            sortAndSetCredentials(PREVIEW_CREDENTIALS);
            return;
        }
        if (userProfile?.credentials) sortAndSetCredentials(userProfile.credentials);
        else if (user) void getFreshCredentials();
    }, [userProfile, user, isOpen, highlightService, previewMode]);

    const sortAndSetCredentials = (creds: Credential[]) => {
        if (!highlightService) {
            setCredentials(creds);
            return;
        }
        setCredentials([...creds].sort((a, b) => {
            const aMatch = a.service.toLowerCase() === highlightService.toLowerCase();
            const bMatch = b.service.toLowerCase() === highlightService.toLowerCase();
            return aMatch === bMatch ? 0 : aMatch ? -1 : 1;
        }));
    };

    const getFreshCredentials = async () => {
        if (!user || !db) return;
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) sortAndSetCredentials(snap.data().credentials || []);
    };

    const handleSave = async () => {
        if (!newCred.username) return;
        const credential: Credential = {
            id: Date.now().toString(),
            service: newCred.service || 'Custom',
            label: newCred.label || 'Account',
            username: newCred.username,
            password: newCred.password || '',
            url: newCred.url || '',
        };
        if (previewMode) {
            setCredentials(previous => [...previous, credential]);
            setIsAdding(false);
            setNewCred({ service: 'Tinkercad', label: 'My account' });
            setNotice('Preview key added to this session only.');
            return;
        }
        if (!user || !db) return;
        setLoading(true);
        setNotice(null);
        try {
            await updateDoc(doc(db, 'users', user.uid), { credentials: arrayUnion(credential) });
            setCredentials(previous => [...previous, credential]);
            setIsAdding(false);
            setNewCred({ service: 'Tinkercad', label: 'My account' });
            setNotice('Key saved to your cabinet.');
        } catch (saveError) {
            console.error('Error saving credential', saveError);
            setNotice('This key could not be saved. Check your connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (credential: Credential) => {
        if (previewMode) {
            setCredentials(previous => previous.filter(item => item.id !== credential.id));
            setPendingDelete(null);
            setNotice('Preview key removed.');
            return;
        }
        if (!user || !db) return;
        try {
            await updateDoc(doc(db, 'users', user.uid), { credentials: arrayRemove(credential) });
            setCredentials(previous => previous.filter(item => item.id !== credential.id));
            setPendingDelete(null);
            setNotice('Key removed from your cabinet.');
        } catch (deleteError) {
            console.error('Error deleting credential', deleteError);
            setNotice('This key could not be removed. Try again.');
        }
    };

    const copyToClipboard = async (text: string, label: string) => {
        await navigator.clipboard.writeText(text);
        setNotice(`${label} copied.`);
    };

    if (!isOpen) return null;

    return (
        <div className="sq-keys-overlay" role="dialog" aria-modal="true" aria-labelledby="keys-title">
            <button className="sq-keys-backdrop" type="button" onClick={onClose} aria-label="Close key cabinet" />
            <section className="sq-keys-shell">
                <header className="sq-keys-header">
                    <div className="sq-keys-brand"><span aria-hidden="true"><KeyRound size={24} /></span><div><p>Sparkbook key cabinet</p><h2 id="keys-title">Tools ready. Logins together.</h2></div></div>
                    <div className="sq-keys-header-actions"><button type="button" aria-label="Add key" onClick={() => setIsAdding(value => !value)}><Plus size={18} /> <span>Add key</span></button><button type="button" onClick={onClose} aria-label="Close key cabinet"><X size={24} /></button></div>
                </header>

                {notice && <div className="sq-keys-notice" role="status"><Check size={16} /> {notice}<button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message"><X size={14} /></button></div>}

                <div className="sq-keys-scroll">
                    <section className="sq-keys-intro"><div><p>Tool access</p><h3>Your digital<br />workbench keys.</h3></div><p>Keep class codes and learning-tool accounts in one place. Passwords stay covered until you choose to reveal them.</p></section>

                    <div className={`sq-keys-layout ${isAdding ? 'is-adding' : ''}`}>
                        <section className="sq-keys-cabinet" aria-label="Saved keys">
                            {credentials.length === 0 ? (
                                <div className="sq-keys-empty"><KeyRound size={42} /><h3>No keys saved yet.</h3><p>Add the first account you use at the bench.</p><button type="button" onClick={() => setIsAdding(true)}>Add a key</button></div>
                            ) : credentials.map((credential, index) => (
                                <article key={credential.id} className="sq-key-card">
                                    <div className="sq-key-tab"><span>{String(index + 1).padStart(2, '0')}</span><strong>{serviceMark(credential.service)}</strong></div>
                                    <div className="sq-key-copy">
                                        <div className="sq-key-title"><div><p>{credential.label}</p><h3>{credential.service}</h3></div><button type="button" onClick={() => setPendingDelete(credential)} aria-label={`Remove ${credential.service} key`}><Trash2 size={17} /></button></div>
                                        <button type="button" className="sq-key-field" onClick={() => void copyToClipboard(credential.username, 'Username')}><span>Username</span><code>{credential.username}</code><Copy size={15} /></button>
                                        {credential.password && <div className="sq-key-field"><span>Password</span><code>{showPassword[credential.id] ? credential.password : '••••••••'}</code><button type="button" onClick={() => setShowPassword(previous => ({ ...previous, [credential.id]: !previous[credential.id] }))} aria-label={showPassword[credential.id] ? 'Hide password' : 'Show password'}>{showPassword[credential.id] ? <EyeOff size={16} /> : <Eye size={16} />}</button><button type="button" onClick={() => void copyToClipboard(credential.password!, 'Password')} aria-label="Copy password"><Copy size={15} /></button></div>}
                                    </div>
                                </article>
                            ))}
                        </section>

                        {isAdding && <aside className="sq-key-form">
                            <div><p>New drawer</p><h3>Add a workbench key</h3></div>
                            <label><span>Service</span><select value={newCred.service} onChange={event => setNewCred({ ...newCred, service: event.target.value })}><option>Tinkercad</option><option>Canva</option><option>Google</option><option>Scratch</option><option>Onshape</option><option>Other</option></select></label>
                            <label><span>Label</span><input value={newCred.label || ''} onChange={event => setNewCred({ ...newCred, label: event.target.value })} placeholder="Class workspace" /></label>
                            <label><span>Username or class code</span><input value={newCred.username || ''} onChange={event => setNewCred({ ...newCred, username: event.target.value })} placeholder="maker.aya" /></label>
                            <label><span>Password (optional)</span><input value={newCred.password || ''} onChange={event => setNewCred({ ...newCred, password: event.target.value })} placeholder="Leave blank for class codes" /></label>
                            <div className="sq-key-form-actions"><button type="button" onClick={() => setIsAdding(false)}>Cancel</button><button type="button" disabled={loading || !newCred.username?.trim()} onClick={() => void handleSave()}><Save size={17} /> {loading ? 'Saving…' : 'Save key'}</button></div>
                        </aside>}
                    </div>
                </div>

                {pendingDelete && <div className="sq-key-confirm" role="alertdialog" aria-modal="true" aria-labelledby="remove-key-title"><div><p>Remove key</p><h3 id="remove-key-title">Remove {pendingDelete.service}?</h3><p>This only removes the saved login from SparkQuest. It does not close the external account.</p><div><button type="button" onClick={() => setPendingDelete(null)}>Keep key</button><button type="button" onClick={() => void handleDelete(pendingDelete)}>Remove key</button></div></div></div>}
            </section>
        </div>
    );
};
