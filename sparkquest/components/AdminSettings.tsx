import React, { useState, useEffect } from 'react';
import { Settings, Monitor, Maximize2, Frame, Power, Video, Gamepad2, Layers } from 'lucide-react';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ArcadeContentManager } from './admin/ArcadeContentManager';
import { ArcadeGameManager } from './admin/ArcadeGameManager';

interface AppConfig {
    kioskMode: boolean;
    fullscreen: boolean;
    showFrame: boolean;
    autoStart: boolean;
}

interface AdminSettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<'SYSTEM' | 'LIBRARY' | 'ARCADE'>('SYSTEM');
    const [config, setConfig] = useState<AppConfig>({
        kioskMode: false,
        fullscreen: false,
        showFrame: true,
        autoStart: false
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [requiresRestart, setRequiresRestart] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadConfig();
        }
    }, [isOpen]);

    const loadConfig = async () => {
        try {
            // Try to load from Firestore first (cloud settings)
            if (db) {
                // @ts-ignore
                const configDoc = await getDoc(doc(db, 'appSettings', 'kioskConfig'));
                if (configDoc.exists()) {
                    setConfig(configDoc.data() as AppConfig);
                    console.log('Loaded config from Firestore:', configDoc.data());
                } else {
                    console.log('No cloud config found, using defaults');
                }
            }

            // Fallback to local Electron config if available
            if (window.sparkquest?.getConfig) {
                const localConfig = await window.sparkquest.getConfig();
                // Merge with cloud config (cloud takes precedence)
                setConfig(prev => ({ ...localConfig, ...prev }));
            }
        } catch (err) {
            console.error('Error loading config:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Save to Firestore (cloud) - this is the primary storage
            if (db) {
                await setDoc(doc(db, 'appSettings', 'kioskConfig'), config);
                console.log('Saved config to Firestore:', config);
            }

            // Also save to local Electron config for offline support
            if (window.sparkquest?.updateConfig) {
                const result = await window.sparkquest.updateConfig(config);
                if (result.success) {
                    setRequiresRestart(result.requiresRestart || false);
                }
            }

            alert('✅ Settings saved! All student computers will use these settings on next launch.');
        } catch (err) {
            console.error('Error saving config:', err);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleRestart = () => {
        if (confirm('Restart SparkQuest to apply changes?')) {
            window.location.reload();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-900/95 backdrop-blur-xl border border-indigo-500/30 shadow-[0_0_50px_rgba(99,102,241,0.3)] rounded-3xl overflow-hidden">
                {/* Header */}
                <div className="flex bg-gradient-to-r from-indigo-950/50 to-slate-900 border-b border-slate-700/50">
                    <div className="p-6 border-r border-slate-700/50 min-w-[200px]">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-indigo-950/50 rounded-2xl border border-indigo-500/20">
                                <Settings className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white">Admin</h2>
                                <p className="text-xs text-slate-400">Control Panel</p>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex-1 flex items-center px-4 gap-2">
                        <button
                            onClick={() => setActiveTab('SYSTEM')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-bold transition-all relative top-[1px] ${activeTab === 'SYSTEM' ? 'text-white border-b-2 border-indigo-500 bg-white/5' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <Monitor size={18} /> System
                        </button>
                        <button
                            onClick={() => setActiveTab('LIBRARY')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-bold transition-all relative top-[1px] ${activeTab === 'LIBRARY' ? 'text-white border-b-2 border-indigo-500 bg-white/5' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <Video size={18} /> Video Library
                        </button>
                        <button
                            onClick={() => setActiveTab('ARCADE')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-bold transition-all relative top-[1px] ${activeTab === 'ARCADE' ? 'text-white border-b-2 border-indigo-500 bg-white/5' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <Gamepad2 size={18} /> Arcade Games
                        </button>
                    </div>

                    <button onClick={onClose} className="px-6 hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-900/50">
                    {activeTab === 'SYSTEM' && (
                        <div className="space-y-6 max-w-2xl mx-auto">
                            {loading ? (
                                <div className="text-center py-8">
                                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                    <p className="text-slate-400 mt-4">Loading settings...</p>
                                </div>
                            ) : (
                                <>
                                    {/* Kiosk Mode */}
                                    <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                                        <div className="flex items-center gap-3">
                                            <Monitor className="w-5 h-5 text-indigo-400" />
                                            <div>
                                                <h3 className="font-bold text-white">Kiosk Mode</h3>
                                                <p className="text-xs text-slate-400">Lock app to fullscreen, disable exit</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setConfig({ ...config, kioskMode: !config.kioskMode })}
                                            className={`relative w-14 h-8 rounded-full transition-colors ${config.kioskMode ? 'bg-indigo-600' : 'bg-slate-600'
                                                }`}
                                        >
                                            <div
                                                className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${config.kioskMode ? 'translate-x-7' : 'translate-x-1'
                                                    }`}
                                            ></div>
                                        </button>
                                    </div>

                                    {/* Fullscreen */}
                                    <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                                        <div className="flex items-center gap-3">
                                            <Maximize2 className="w-5 h-5 text-cyan-400" />
                                            <div>
                                                <h3 className="font-bold text-white">Fullscreen</h3>
                                                <p className="text-xs text-slate-400">Start in fullscreen mode</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setConfig({ ...config, fullscreen: !config.fullscreen })}
                                            className={`relative w-14 h-8 rounded-full transition-colors ${config.fullscreen ? 'bg-cyan-600' : 'bg-slate-600'
                                                }`}
                                        >
                                            <div
                                                className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${config.fullscreen ? 'translate-x-7' : 'translate-x-1'
                                                    }`}
                                            ></div>
                                        </button>
                                    </div>

                                    {/* Show Frame */}
                                    <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                                        <div className="flex items-center gap-3">
                                            <Frame className="w-5 h-5 text-emerald-400" />
                                            <div>
                                                <h3 className="font-bold text-white">Show Window Frame</h3>
                                                <p className="text-xs text-slate-400">Display title bar and controls</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setConfig({ ...config, showFrame: !config.showFrame })}
                                            className={`relative w-14 h-8 rounded-full transition-colors ${config.showFrame ? 'bg-emerald-600' : 'bg-slate-600'
                                                }`}
                                        >
                                            <div
                                                className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${config.showFrame ? 'translate-x-7' : 'translate-x-1'
                                                    }`}
                                            ></div>
                                        </button>
                                    </div>

                                    {/* Restart Notice */}
                                    {requiresRestart && (
                                        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <Power className="w-5 h-5 text-amber-400" />
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-amber-400">Restart Required</h3>
                                                    <p className="text-xs text-amber-300/80">Changes will take effect after restart</p>
                                                </div>
                                                <button
                                                    onClick={handleRestart}
                                                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-sm transition-colors"
                                                >
                                                    Restart Now
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-6 border-t border-slate-700/50 mt-4">
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-900/50 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {saving ? 'Saving...' : 'Save System Settings'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'LIBRARY' && <ArcadeContentManager />}

                    {activeTab === 'ARCADE' && <ArcadeGameManager />}
                </div>
            </div>
        </div>
    );
};

