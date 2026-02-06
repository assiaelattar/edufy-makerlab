
import React, { useState } from 'react';
import { Download, ExternalLink, CheckCircle2, ChevronLeft, Star, MonitorPlay, MessageSquare, ShieldCheck, ArrowRight, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getAppById } from '../services/appRegistry';
import { formatCurrency } from '../utils/helpers';
import { updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db } from '../services/firebase';

export const AppDetailsView = () => {
    const { navigateTo, viewParams } = useAppContext();
    const { currentOrganization } = useAuth();
    const [installing, setInstalling] = useState(false);
    const [activeScreenshot, setActiveScreenshot] = useState(0);

    const appId = viewParams?.appId;
    const app = appId ? getAppById(appId) : null;
    const isInstalled = currentOrganization?.installedApps?.includes(appId || '');

    if (!app) return <div className="p-8 text-center text-slate-400">App not found</div>;

    const handleInstall = async () => {
        if (!currentOrganization || !db) return;
        setInstalling(true);
        try {
            await updateDoc(doc(db, 'organizations', currentOrganization.id), {
                installedApps: arrayUnion(app.id)
            });
            // Show success ?
        } catch (error) {
            console.error(error);
            alert("Installation failed");
        } finally {
            setInstalling(false);
        }
    };

    return (
        <div className="space-y-6 pb-24 md:pb-8 flex flex-col h-full animate-in fade-in slide-in-from-right-4 relative">

            {/* Back Button */}
            <button onClick={() => navigateTo('app-store')} className="absolute top-0 left-0 z-10 flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-full border border-slate-700">
                <ChevronLeft size={16} /> <span className="text-xs font-bold">Back to Store</span>
            </button>

            {/* Hero Section */}
            <div className="relative rounded-2xl overflow-hidden min-h-[400px] flex items-end">
                {/* Background Image / Blur */}
                <div className="absolute inset-0 bg-slate-900">
                    {app.screenshots?.[0] && (
                        <img
                            src={app.screenshots[0]}
                            className="w-full h-full object-cover opacity-30 mix-blend-overlay blur-sm scale-110"
                            alt="Background"
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent"></div>
                </div>

                {/* Content */}
                <div className="relative z-10 p-8 w-full max-w-4xl mx-auto flex flex-col md:flex-row gap-8 items-start md:items-end">
                    <div className={`w-32 h-32 rounded-3xl flex items-center justify-center text-white shadow-2xl ${app.category === 'marketing' ? 'bg-gradient-to-br from-pink-500 to-rose-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'} border-4 border-slate-950`}>
                        <app.icon size={64} />
                    </div>

                    <div className="flex-1 space-y-2 mb-2">
                        <div className="flex items-center gap-3">
                            <span className="bg-slate-800 text-slate-300 text-[10px] uppercase font-bold px-2 py-1 rounded border border-slate-700">{app.category}</span>
                            {app.isPremium && <span className="bg-amber-950/50 text-amber-400 text-[10px] uppercase font-bold px-2 py-1 rounded border border-amber-900/50 flex items-center gap-1"><Star size={10} fill="currentColor" /> Premium App</span>}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-white">{app.name}</h1>
                        <p className="text-lg text-slate-300 max-w-xl">{app.description}</p>
                    </div>

                    <div className="w-full md:w-auto flex flex-col gap-3 min-w-[200px]">
                        {isInstalled ? (
                            <button
                                onClick={() => navigateTo('saas-app', { appId: app.id })}
                                className="w-full py-4 bg-white text-slate-900 font-bold rounded-xl shadow-lg hover:bg-slate-200 transition-all flex items-center justify-center gap-2 text-lg"
                            >
                                <ExternalLink size={20} /> Open App
                            </button>
                        ) : (
                            <button
                                onClick={handleInstall}
                                disabled={installing}
                                className="w-full py-4 bg-violet-600 text-white font-bold rounded-xl shadow-lg shadow-violet-900/50 hover:bg-violet-500 transition-all flex items-center justify-center gap-2 text-lg active:scale-95"
                            >
                                {installing ? 'Installing...' : `Install for ${app.pricing?.isFree ? 'Free' : formatCurrency(app.pricing?.price || 0)}`}
                            </button>
                        )}
                        {!isInstalled && app.pricing && (
                            <div className="text-center text-xs text-slate-500 font-medium">
                                {app.pricing.interval === 'one-time' ? 'One-time purchase' : `Billed ${app.pricing.interval}`} · Cancel anytime
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto w-full px-4 md:px-0">

                {/* Left: Gallery & Description */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Screenshots */}
                    {app.screenshots && app.screenshots.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Preview</h3>
                            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden aspect-video relative group">
                                <img src={app.screenshots[activeScreenshot]} className="w-full h-full object-cover" alt="App Preview" />

                                {/* Navigation (Mock) */}
                                {app.screenshots.length > 1 && (
                                    <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
                                        {app.screenshots.map((_, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setActiveScreenshot(idx)}
                                                className={`w-2 h-2 rounded-full transition-all ${idx === activeScreenshot ? 'bg-white w-6' : 'bg-white/50 hover:bg-white'}`}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* About */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">About this App</h3>
                        <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed">
                            <p>{app.fullDescription || app.description}</p>
                        </div>
                    </div>

                    {/* Features */}
                    {app.features && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {app.features.map((feature, i) => (
                                <div key={i} className="bg-slate-900/50 border border-slate-800/50 p-4 rounded-lg flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-500">
                                        <CheckCircle2 size={16} />
                                    </div>
                                    <span className="text-sm font-medium text-slate-200">{feature}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Meta & Recommendations */}
                <div className="space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                        <h3 className="text-sm font-bold text-white mb-2">App Details</h3>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                                <span className="text-sm text-slate-500">Developer</span>
                                <span className="text-sm text-slate-200 font-medium">{app.developer}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                                <span className="text-sm text-slate-500">Version</span>
                                <span className="text-sm text-slate-200 font-medium">v{app.version}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                                <span className="text-sm text-slate-500">Category</span>
                                <span className="text-sm text-slate-200 font-medium capitalize">{app.category}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                                <span className="text-sm text-slate-500">Last Updated</span>
                                <span className="text-sm text-slate-200 font-medium">2 days ago</span>
                            </div>
                        </div>

                        <div className="bg-slate-950 rounded-lg p-4 text-xs text-slate-500 flex gap-3">
                            <ShieldCheck size={32} className="text-emerald-500 shrink-0" />
                            <div>
                                <span className="font-bold text-emerald-500 block mb-1">Verified Secure</span>
                                This app has been verified by MakerLab for security and privacy compliance.
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-violet-900 to-indigo-900 rounded-xl p-6 text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="font-bold text-lg mb-2">Need help?</h3>
                            <p className="text-sm text-violet-200 mb-4">Contact our support team for setup assistance.</p>
                            <button className="text-xs font-bold bg-white text-violet-900 px-4 py-2 rounded-lg hover:bg-violet-50 transition-colors">Contact Support</button>
                        </div>
                        <MessageSquare className="absolute -bottom-4 -right-4 w-32 h-32 text-indigo-500/30 rotate-12" />
                    </div>
                </div>
            </div>
        </div>
    );
};
