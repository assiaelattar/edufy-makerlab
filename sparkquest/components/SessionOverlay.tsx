import React, { useRef, useState, useEffect } from 'react';
import { useSession } from '../context/SessionContext';
import { useAuth } from '../context/AuthContext';
import { Credential } from '../types';
import { X, Clock, Plus, Minus, Maximize, Camera, Key, Copy, Eye, EyeOff } from 'lucide-react';
import { CredentialWallet } from './CredentialWallet';

export const SessionOverlay: React.FC = () => {
    const { isActive, sessionUrl, sessionTool, timeLeft, endSession, formatTime } = useSession();
    const { userProfile } = useAuth();
    const webviewRef = useRef<any>(null);
    const [showWallet, setShowWallet] = React.useState(false);

    // Quick Match Logic
    const [matchingCred, setMatchingCred] = useState<Credential | null>(null);
    const [showQuickPass, setShowQuickPass] = useState(false);

    useEffect(() => {
        if (!isActive || !sessionUrl || !userProfile?.credentials) {
            setMatchingCred(null);
            return;
        }

        // Priority 1: Match by explicit Session Tool Name (passed from Wizard)
        if (sessionTool) {
            const exactMatch = userProfile.credentials.find(c => c.service.toLowerCase() === sessionTool.toLowerCase());
            if (exactMatch) {
                setMatchingCred(exactMatch);
                return;
            }
        }

        // Priority 2: Match by URL (Fallback)
        const urlLower = sessionUrl.toLowerCase();
        const found = userProfile.credentials.find(c => {
            const service = c.service.toLowerCase();
            return urlLower.includes(service) ||
                (service === 'tinkercad' && urlLower.includes('tinkercad')) ||
                (service === 'canva' && urlLower.includes('canva')) ||
                (service === 'scratch' && urlLower.includes('scratch')) ||
                (service === 'google' && urlLower.includes('google')) ||
                (service === 'onshape' && urlLower.includes('onshape'));
        });

        if (found) {
            setMatchingCred(found);
        } else {
            setMatchingCred(null);
        }
    }, [sessionUrl, isActive, userProfile]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    if (!isActive || !sessionUrl) return null;

    const handleZoom = (action: 'in' | 'out' | 'reset') => {
        if (!webviewRef.current) return;
        const currentZoom = webviewRef.current.getZoomLevel();
        if (action === 'in') webviewRef.current.setZoomLevel(currentZoom + 0.5);
        if (action === 'out') webviewRef.current.setZoomLevel(currentZoom - 0.5);
        if (action === 'reset') webviewRef.current.setZoomLevel(0);
    };

    const handleCapture = async () => {
        if (!webviewRef.current) return;
        try {
            const image = await webviewRef.current.capturePage();
            const dataUrl = image.toDataURL();
            sessionStorage.setItem('temp_evidence', dataUrl);
            alert("📸 Screenshot Captured! You can upload it as evidence after ending the session.");
        } catch (e) {
            console.error("Screenshot failed", e);
            alert("Failed to capture screenshot.");
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col">
            {/* TOOLBAR */}
            <div className="h-[60px] bg-slate-900 border-b border-slate-700 flex items-center justify-between px-6 shrink-0 shadow-xl">
                <div className="flex items-center gap-4">
                    <span className="font-bold text-lg bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent hidden sm:inline">
                        SparkQuest Session
                    </span>
                    <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-700">
                        <Clock className="w-4 h-4 text-blue-400" />
                        <span className="font-mono text-lg font-bold tracking-widest text-blue-100">
                            {formatTime(timeLeft)}
                        </span>
                    </div>

                    {/* QUICK CREDENTIALS BAR */}
                    {matchingCred && (
                        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-cyan-950/40 border border-cyan-500/30 rounded-lg animate-in fade-in slide-in-from-top-2 ml-4">
                            <div className="flex items-center gap-1.5 text-cyan-400 border-r border-cyan-500/20 pr-2 mr-1">
                                <Key className="w-3.5 h-3.5" />
                                <span className="text-xs font-bold uppercase tracking-wider">{matchingCred.service}:</span>
                            </div>

                            <div className="flex items-center gap-1 bg-slate-900/50 rounded px-2 py-0.5">
                                <span className="text-[10px] text-slate-500 font-bold uppercase">User</span>
                                <code className="text-xs text-white font-mono">{matchingCred.username}</code>
                                <button onClick={() => copyToClipboard(matchingCred.username)} className="text-slate-400 hover:text-white ml-1">
                                    <Copy className="w-3 h-3" />
                                </button>
                            </div>

                            {matchingCred.password && (
                                <div className="flex items-center gap-1 bg-slate-900/50 rounded px-2 py-0.5">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase">Pass</span>
                                    <code className="text-xs text-yellow-300 font-mono w-16 truncate">
                                        {showQuickPass ? matchingCred.password : '••••••'}
                                    </code>
                                    <button onClick={() => setShowQuickPass(!showQuickPass)} className="text-slate-400 hover:text-white ml-1">
                                        {showQuickPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                    </button>
                                    <button onClick={() => copyToClipboard(matchingCred.password!)} className="text-slate-400 hover:text-white ml-1">
                                        <Copy className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {/* ZOOM CONTROLS */}
                    <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 border border-slate-700">
                        <button onClick={() => handleZoom('out')} className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white" title="Zoom Out">
                            <Minus size={16} />
                        </button>
                        <button onClick={() => handleZoom('reset')} className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white" title="Reset Zoom">
                            <Maximize size={16} />
                        </button>
                        <button onClick={() => handleZoom('in')} className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white" title="Zoom In">
                            <Plus size={16} />
                        </button>
                    </div>

                    <button
                        onClick={handleCapture}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-bold shadow-lg shadow-indigo-500/20 text-sm"
                    >
                        <Camera className="w-4 h-4" />
                        <span className="hidden md:inline">Proof</span>
                    </button>

                    <button
                        onClick={endSession}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-bold text-sm"
                    >
                        <X className="w-4 h-4" />
                        End
                    </button>
                </div>
            </div>

            {/* WALLET DRAWER */}
            <CredentialWallet
                isOpen={showWallet}
                onClose={() => setShowWallet(false)}
                highlightService={matchingCred?.service || sessionTool || undefined}
            />

            {/* WEBVIEW CONTAINER */}
            <div className="flex-1 bg-white relative z-0">
                <webview
                    ref={webviewRef}
                    src={sessionUrl}
                    className="w-full h-full"
                    allowpopups={true}
                />
            </div>
        </div>
    );
};
