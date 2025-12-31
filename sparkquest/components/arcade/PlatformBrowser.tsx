import React from 'react';
import { X, ExternalLink, Maximize2, Minimize2 } from 'lucide-react';

interface PlatformBrowserProps {
    platform: {
        id: string;
        name: string;
        url: string;
        description?: string;
        logo?: string;
        color?: string;
    } | null;
    isOpen: boolean;
    onClose: () => void;
}

export const PlatformBrowser: React.FC<PlatformBrowserProps> = ({ platform, isOpen, onClose }) => {
    const [isFullscreen, setIsFullscreen] = React.useState(false);

    if (!isOpen || !platform) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 to-transparent z-10 flex items-center justify-between px-6">
                <div className="flex items-center gap-4">
                    {platform.logo && (
                        <img src={platform.logo} alt={platform.name} className="h-8 w-8 rounded-lg" />
                    )}
                    <div>
                        <h2 className="text-white font-bold text-lg">{platform.name}</h2>
                        {platform.description && (
                            <p className="text-slate-400 text-xs">{platform.description}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                    >
                        {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                    </button>
                    <a
                        href={platform.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                        title="Open in New Tab"
                    >
                        <ExternalLink size={20} />
                    </a>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-white hover:text-red-400"
                    >
                        <X size={24} />
                    </button>
                </div>
            </div>

            {/* Iframe / Webview Container */}
            <div className={`relative bg-white rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${isFullscreen ? 'w-full h-full' : 'w-[95%] h-[90%] max-w-7xl'
                }`}>
                {/* @ts-ignore - Webview is an Electron element */}
                {window.electronAPI ? (
                    <webview
                        src={platform.url}
                        className="w-full h-full"
                        allowpopups={true}
                    />
                ) : (
                    <iframe
                        src={platform.url}
                        className="w-full h-full border-0"
                        title={platform.name}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    />
                )}
            </div>

            {/* Loading Indicator */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
        </div>
    );
};
