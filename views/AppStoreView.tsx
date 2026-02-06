
import React, { useState } from 'react';
import { Search, Download, ExternalLink, CheckCircle2, Star, Filter } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { AVAILABLE_APPS, AppManifest } from '../services/appRegistry';
import { updateDoc, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../services/firebase';

export const AppStoreView = () => {
    const { navigateTo, settings } = useAppContext();
    const { currentOrganization, userProfile } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [installingId, setInstallingId] = useState<string | null>(null);

    const installedApps = currentOrganization?.installedApps || [];

    const handleInstall = async (appId: string) => {
        if (!currentOrganization || !db) return;
        setInstallingId(appId);
        try {
            await updateDoc(doc(db, 'organizations', currentOrganization.id), {
                installedApps: arrayUnion(appId)
            });
            // Force reload or optimistic update happens via AuthContext snapshot
        } catch (error) {
            console.error("Failed to install app:", error);
            alert("Failed to install app. Please try again.");
        } finally {
            setInstallingId(null);
        }
    };

    const handleUninstall = async (appId: string) => {
        if (!currentOrganization || !db) return;
        if (!confirm("Are you sure you want to uninstall this app? Data may be retained but access will be removed.")) return;
        setInstallingId(appId);
        try {
            await updateDoc(doc(db, 'organizations', currentOrganization.id), {
                installedApps: arrayRemove(appId)
            });
        } catch (error) {
            console.error("Failed to uninstall app:", error);
        } finally {
            setInstallingId(null);
        }
    };

    const filteredApps = AVAILABLE_APPS.filter(app => {
        const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            app.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || app.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-6 pb-24 md:pb-8 flex flex-col h-full animate-in fade-in slide-in-from-right-4">

            {/* Header */}
            <div className="bg-gradient-to-r from-violet-900/50 to-indigo-900/50 p-8 rounded-2xl border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <div className="relative z-10 max-w-2xl">
                    <h1 className="text-3xl font-bold text-white mb-2">App Marketplace</h1>
                    <p className="text-violet-200 text-lg">Supercharge your academy with AI tools and extensions.</p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between gap-4 bg-slate-900/50 p-2 rounded-xl border border-slate-800/50">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search apps..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:border-violet-500 hover:border-slate-700 transition-all outline-none"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
                    {['all', 'marketing', 'productivity', 'design', 'analytics'].map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold capitalize whitespace-nowrap transition-all border ${selectedCategory === cat ? 'bg-violet-600 text-white border-violet-500' : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredApps.map(app => {
                    const isInstalled = installedApps.includes(app.id);
                    return (
                        <div key={app.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-violet-500/50 transition-all group flex flex-col h-full relative">
                            <div onClick={() => navigateTo('app-details', { appId: app.id })} className="p-6 flex-1 cursor-pointer">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white shadow-lg ${app.id.includes('social') ? 'bg-gradient-to-br from-pink-500 to-rose-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                                        <app.icon size={28} />
                                    </div>
                                    {app.isPremium && <span className="bg-amber-950/30 text-amber-500 text-[10px] font-bold px-2 py-1 rounded border border-amber-900/50 flex items-center gap-1"><Star size={10} fill="currentColor" /> PREMIUM</span>}
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-violet-400 transition-colors">{app.name}</h3>
                                <p className="text-sm text-slate-400 line-clamp-2 mb-4">{app.description}</p>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <span className="text-[10px] font-medium bg-slate-800 text-slate-400 px-2 py-1 rounded capitalize">{app.category}</span>
                                    <span className="text-[10px] font-medium bg-slate-800 text-slate-400 px-2 py-1 rounded">v{app.version}</span>
                                    {app.pricing && <span className="text-[10px] font-bold bg-violet-950/50 text-violet-400 px-2 py-1 rounded border border-violet-900/50">{app.pricing.price} {app.pricing.currency}/{app.pricing.interval === 'monthly' ? 'mo' : app.pricing.interval === 'yearly' ? 'yr' : 'one-time'}</span>}
                                </div>
                            </div>
                            <div className="p-4 border-t border-slate-800 bg-slate-950/30 flex gap-2">
                                {isInstalled ? (
                                    <>
                                        <button
                                            onClick={() => navigateTo('saas-app', { appId: app.id })}
                                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                                        >
                                            <ExternalLink size={14} /> Open
                                        </button>
                                        <button
                                            onClick={() => handleUninstall(app.id)}
                                            className="px-3 bg-slate-900 hover:bg-red-900/20 text-slate-500 hover:text-red-400 border border-slate-800 hover:border-red-900/50 rounded-lg text-xs font-bold transition-colors"
                                        >
                                            Uninstall
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => handleInstall(app.id)}
                                        disabled={installingId === app.id}
                                        className="w-full bg-violet-600 hover:bg-violet-500 text-white py-2 rounded-lg text-xs font-bold transition-colors shadow-lg shadow-violet-900/20 flex items-center justify-center gap-2"
                                    >
                                        {installingId === app.id ? 'Installing...' : 'Install App'} <Download size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredApps.length === 0 && (
                <div className="text-center py-24 opacity-50">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-600"><Search size={32} /></div>
                    <p className="text-slate-400 text-lg">No apps found matching your criteria.</p>
                </div>
            )}
        </div>
    );
};
