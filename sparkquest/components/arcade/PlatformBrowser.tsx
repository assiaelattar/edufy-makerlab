import React from 'react';
import { ExternalLink, Maximize2, Minimize2, Rocket, X } from 'lucide-react';

interface PlatformBrowserProps {
    platform: { id: string; name: string; url: string; description?: string; logo?: string; color?: string } | null;
    isOpen: boolean;
    onClose: () => void;
}

export const PlatformBrowser: React.FC<PlatformBrowserProps> = ({ platform, isOpen, onClose }) => {
    const [isFullscreen, setIsFullscreen] = React.useState(false);
    React.useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);
    if (!isOpen || !platform) return null;

    return (
        <div className="sq-tool-browser" role="dialog" aria-modal="true" aria-labelledby="tool-browser-title">
            <header>
                <div className="sq-tool-browser-brand">{platform.logo ? <img src={platform.logo} alt="" /> : <span><Rocket /></span>}<div><p>Play lab · launchpad</p><h2 id="tool-browser-title">{platform.name}</h2><small>{platform.description || 'Learning tool'}</small></div></div>
                <div className="sq-tool-browser-actions">
                    <button type="button" onClick={() => setIsFullscreen(value => !value)} aria-label={isFullscreen ? 'Exit full screen' : 'Use full screen'}>{isFullscreen ? <Minimize2 /> : <Maximize2 />}</button>
                    <a href={platform.url} target="_blank" rel="noopener noreferrer" aria-label="Open in a new tab"><ExternalLink /></a>
                    <button type="button" onClick={onClose} aria-label="Close learning tool"><X /></button>
                </div>
            </header>
            <div className={`sq-tool-browser-stage ${isFullscreen ? 'is-fullscreen' : ''}`}>
                {(window as any).electronAPI ? <webview src={platform.url} className="w-full h-full" allowpopups={true} /> : <><div className="sq-tool-browser-note">If this site blocks the preview, <a href={platform.url} target="_blank" rel="noopener noreferrer">open it in a new tab <ExternalLink size={13} /></a>.</div><iframe src={platform.url} title={platform.name} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" sandbox="allow-same-origin allow-scripts allow-popups allow-forms" /></>}
            </div>
        </div>
    );
};
