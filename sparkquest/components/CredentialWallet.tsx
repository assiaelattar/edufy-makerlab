import React, { useState, useEffect } from 'react';
import { X, Key, Copy, Plus, Save, Trash2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Credential } from '../types';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

interface CredentialWalletProps {
    isOpen: boolean;
    onClose: () => void;
    highlightService?: string; // Optional: Service to highlight/filter
}

export const CredentialWallet: React.FC<CredentialWalletProps> = ({ isOpen, onClose, highlightService }) => {
    const { user, userProfile } = useAuth();
    const [credentials, setCredentials] = useState<Credential[]>([]);
    const [loading, setLoading] = useState(false);

    // Form State
    const [isAdding, setIsAdding] = useState(false);
    const [newCred, setNewCred] = useState<Partial<Credential>>({
        service: highlightService || 'Tinkercad',
        label: 'My Account'
    });
    const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (userProfile?.credentials) {
            sortAndSetCredentials(userProfile.credentials);
        } else if (user) {
            getFreshCredentials();
        }
    }, [userProfile, user, isOpen, highlightService]);

    const sortAndSetCredentials = (creds: Credential[]) => {
        if (!highlightService) {
            setCredentials(creds);
            return;
        }
        // Move exact match to top
        const sorted = [...creds].sort((a, b) => {
            const aMatch = a.service.toLowerCase() === highlightService.toLowerCase();
            const bMatch = b.service.toLowerCase() === highlightService.toLowerCase();
            return aMatch === bMatch ? 0 : aMatch ? -1 : 1;
        });
        setCredentials(sorted);
    };

    const getFreshCredentials = async () => {
        if (!user || !db) return;
        const ref = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
            const data = snap.data();
            sortAndSetCredentials(data.credentials || []);
        }
    };

    const handleSave = async () => {
        if (!user || !db || !newCred.username) return;
        setLoading(true);

        const credential: Credential = {
            id: Date.now().toString(),
            service: newCred.service || 'Custom',
            label: newCred.label || 'Account',
            username: newCred.username,
            password: newCred.password || '',
            url: newCred.url || ''
        };

        try {
            const ref = doc(db, 'users', user.uid);
            await updateDoc(ref, {
                credentials: arrayUnion(credential)
            });
            setCredentials(prev => [...prev, credential]);
            setIsAdding(false);
            setNewCred({ service: 'Tinkercad', label: 'My Account' });
        } catch (e) {
            console.error("Error saving credential", e);
            alert("Failed to save key. Are you online?");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (cred: Credential) => {
        if (!user || !db) return;
        if (!confirm("Delete this key?")) return;

        try {
            const ref = doc(db, 'users', user.uid);
            await updateDoc(ref, {
                credentials: arrayRemove(cred)
            });
            setCredentials(prev => prev.filter(c => c.id !== cred.id));
        } catch (e) {
            console.error("Error deleting", e);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Could show a toast here?
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-5xl h-[600px] bg-slate-900/95 backdrop-blur-xl border border-cyan-500/30 shadow-[0_0_50px_rgba(8,145,178,0.3)] rounded-3xl flex overflow-hidden relative">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 bg-slate-800/50 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-full transition-all"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* LEFT SIDE - SAVED KEYS (65%) */}
                <div className="w-[65%] flex flex-col border-r border-slate-700/50 bg-slate-900/50">
                    <div className="p-8 border-b border-slate-700/50 flex items-center gap-4">
                        <div className="p-3 bg-cyan-950/50 rounded-2xl border border-cyan-500/20 shadow-inner">
                            <Key className="w-8 h-8 text-cyan-400" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black tracking-wide text-white uppercase italic">Holokeys</h2>
                            <div className="flex items-center gap-2 text-cyan-500 font-bold text-xs tracking-[0.3em] uppercase">
                                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                                Secure Wallet
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8">
                        {credentials.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/50">
                                <Key className="w-16 h-16 mb-4 opacity-10" />
                                <p className="text-lg font-bold text-slate-400">Your wallet is empty</p>
                                <p className="text-sm opacity-60">Add your first key on the right →</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {credentials.map(cred => (
                                    <div key={cred.id} className="group relative bg-slate-800/80 hover:bg-slate-800 rounded-2xl p-5 border border-slate-700 hover:border-cyan-500/50 transition-all hover:shadow-[0_4px_20px_-5px_rgba(8,145,178,0.3)] hover:-translate-y-1">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-lg shadow-inner">
                                                    {cred.service === 'Tinkercad' ? '🟧' :
                                                        cred.service === 'Canva' ? '🟦' :
                                                            cred.service === 'Scratch' ? '😺' :
                                                                cred.service === 'Google' ? '🌈' : '🔑'}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-white leading-tight">{cred.service}</h3>
                                                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{cred.label}</div>
                                                </div>
                                            </div>
                                            <button onClick={() => handleDelete(cred)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-2 border border-slate-700/50">
                                                <span className="text-[10px] font-bold text-slate-600 uppercase w-8">ID</span>
                                                <code className="flex-1 text-xs text-cyan-300 font-mono truncate cursor-pointer hover:text-white transition-colors" onClick={() => copyToClipboard(cred.username)} title="Click to copy">
                                                    {cred.username}
                                                </code>
                                                <Copy className="w-3 h-3 text-slate-500" />
                                            </div>

                                            {cred.password && (
                                                <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-2 border border-slate-700/50">
                                                    <span className="text-[10px] font-bold text-slate-600 uppercase w-8">Key</span>
                                                    <code className="flex-1 text-xs text-yellow-300 font-mono truncate cursor-pointer hover:text-white transition-colors" onClick={() => copyToClipboard(cred.password!)} title="Click to copy">
                                                        {showPassword[cred.id] ? cred.password : '••••••••'}
                                                    </code>
                                                    <button onClick={(e) => { e.stopPropagation(); setShowPassword(p => ({ ...p, [cred.id]: !p[cred.id] })); }} className="text-slate-500 hover:text-white">
                                                        {showPassword[cred.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT SIDE - ADD NEW (35%) */}
                <div className="w-[35%] bg-slate-800/30 p-8 flex flex-col justify-center border-l border-slate-700/50 relative overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #06b6d4 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                    <div className="relative z-10">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-600 text-white text-sm shadow-lg shadow-cyan-500/30">
                                <Plus className="w-5 h-5" />
                            </span>
                            Add New Key
                        </h3>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Service</label>
                                <select
                                    className="w-full bg-slate-900 border border-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl p-3 text-white font-medium outline-none transition-all"
                                    value={newCred.service}
                                    onChange={e => setNewCred({ ...newCred, service: e.target.value })}
                                >
                                    <option value="Tinkercad">🟧 Tinkercad</option>
                                    <option value="Canva">🟦 Canva</option>
                                    <option value="Google">🌈 Google</option>
                                    <option value="Scratch">😺 Scratch</option>
                                    <option value="Onshape">⚙️ Onshape</option>
                                    <option value="Other">🔑 Other</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Username / Class Code</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-900 border border-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl p-3 text-white outline-none transition-all placeholder:text-slate-600 font-mono text-sm"
                                    placeholder="Explorer123"
                                    value={newCred.username || ''}
                                    onChange={e => setNewCred({ ...newCred, username: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Password</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-900 border border-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl p-3 text-yellow-300 outline-none transition-all placeholder:text-slate-600 font-mono text-sm"
                                    placeholder="Secret123!"
                                    value={newCred.password || ''}
                                    onChange={e => setNewCred({ ...newCred, password: e.target.value })}
                                />
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="w-full mt-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-4 rounded-xl text-md font-bold flex justify-center items-center gap-2 shadow-xl shadow-cyan-900/30 transform hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Saving securely...' : <><Save className="w-5 h-5" /> Save to Wallet</>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
