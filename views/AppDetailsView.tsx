
import React, { useState } from 'react';
import { Download, ExternalLink, CheckCircle2, ChevronLeft, Star, MonitorPlay, MessageSquare, ShieldCheck, ArrowRight, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useModuleContext } from '../context/ModuleContext';
import { getAppById } from '../services/appRegistry';
import { useConfirm } from '../context/ConfirmContext';
import { AtlasActionButton, AtlasEmptyState, AtlasSectionHeader } from '../components/atlas/AtlasSurface';

export const AppDetailsView = () => {
    const { navigateTo, viewParams } = useAppContext();
    const { getEntitlement, activateItem, requestAddOn } = useModuleContext();
    const { alert: showAlert } = useConfirm();
    const [installing, setInstalling] = useState(false);
    const [activeScreenshot, setActiveScreenshot] = useState(0);

    const appId = viewParams?.appId;
    const app = appId ? getAppById(appId) : null;
    const entitlement = appId ? getEntitlement(appId) : undefined;
    const isInstalled = Boolean(entitlement?.active);

    if (!app) return <AtlasEmptyState title="App not found" description="Return to the marketplace and choose an available app." icon={MonitorPlay} action={<AtlasActionButton icon={ChevronLeft} onClick={() => navigateTo('app-store')}>Back to marketplace</AtlasActionButton>} />;

    const handleInstall = async () => {
        if (!app || !entitlement) return;
        setInstalling(true);
        try {
            if (!entitlement.entitled) {
                await requestAddOn(app.id);
                showAlert('Request sent', `${app.name} was sent to your Atlas account manager for approval.`, 'success');
                return;
            }

            const activated = await activateItem(app.id);
            if (!activated) throw new Error('Activation is not available for this app.');
            showAlert('App activated', `${app.name} is now available in this workspace.`, 'success');
        } catch (error) {
            console.error(error);
            showAlert('Installation failed', `${app.name} could not be installed. Check your access and try again.`, 'danger');
        } finally {
            setInstalling(false);
        }
    };

    return (
        <div className="relative flex h-full flex-col space-y-6 pb-24 md:pb-8">

            {/* Back Button */}
            <AtlasActionButton variant="quiet" icon={ChevronLeft} onClick={() => navigateTo('app-store')} className="w-fit">Back to marketplace</AtlasActionButton>

            {/* Hero Section */}
            <div className="relative flex items-end overflow-hidden rounded-xl border border-white/10 bg-slate-950/80">
                {/* Background Image / Blur */}
                <div className="hidden">
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
                <div className="relative z-10 mx-auto flex w-full flex-col items-start gap-5 p-5 md:flex-row md:items-center">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-teal-300/20 bg-teal-400/10 text-teal-200">
                        <app.icon size={32} />
                    </div>

                    <div className="flex-1 space-y-2 mb-2">
                        <div className="flex items-center gap-3">
                            <span className="bg-slate-800 text-slate-300 text-[10px] uppercase font-bold px-2 py-1 rounded border border-slate-700">{app.category}</span>
                            {app.isPremium && <span className="bg-amber-950/50 text-amber-400 text-[10px] uppercase font-bold px-2 py-1 rounded border border-amber-900/50 flex items-center gap-1"><Star size={10} fill="currentColor" /> Premium App</span>}
                        </div>
                        <h1 className="text-2xl font-black text-white md:text-3xl">{app.name}</h1>
                        <p className="max-w-xl text-sm leading-6 text-slate-400">{app.description}</p>
                    </div>

                    <div className="w-full md:w-auto flex flex-col gap-3 min-w-[200px]">
                        {isInstalled ? (
                            <button
                                onClick={() => navigateTo('saas-app', { appId: app.id })}
                                className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-bold text-slate-950 transition-colors hover:bg-teal-400"
                            >
                                <ExternalLink size={20} /> Open App
                            </button>
                        ) : (
                            <button
                                onClick={handleInstall}
                                disabled={installing}
                                className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-bold text-slate-950 transition-colors hover:bg-teal-400 disabled:opacity-50"
                            >
                                {installing ? 'Working...' : entitlement?.entitled ? 'Add to workspace' : 'Request add-on'}
                            </button>
                        )}
                        {!isInstalled && entitlement?.locked && app.pricing && (
                            <div className="text-center text-xs text-slate-500 font-medium">
                                {app.pricing.interval === 'one-time' ? 'One-time purchase' : `Billed ${app.pricing.interval}`} / Cancel anytime
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
                            <AtlasSectionHeader title="Preview" description="See how this app fits into the Atlas workspace." icon={MonitorPlay} />
                            <div className="group relative aspect-video overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
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
                        <AtlasSectionHeader title="About this app" icon={MessageSquare} />
                        <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed">
                            <p>{app.fullDescription || app.description}</p>
                        </div>
                    </div>

                    {/* Features */}
                    {app.features && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {app.features.map((feature, i) => (
                                <div key={i} className="flex items-center gap-3 rounded-lg border border-slate-800/50 bg-slate-900/50 p-4">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-300">
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

                    <div className="rounded-lg border border-teal-300/20 bg-teal-400/[0.06] p-5 text-white">
                        <h3 className="mb-2 font-bold">Need setup help?</h3>
                        <p className="mb-4 text-sm text-slate-400">Contact the Edufy team for installation and workspace guidance.</p>
                        <AtlasActionButton icon={MessageSquare}>Contact support</AtlasActionButton>
                    </div>
                </div>
            </div>
        </div>
    );
};
