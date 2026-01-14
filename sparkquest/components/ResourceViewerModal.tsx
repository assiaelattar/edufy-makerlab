import React from 'react';
import { Modal } from './Modal';

import { useSession } from '../context/SessionContext';

interface ResourceViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    resource: {
        title: string;
        url: string;
        type: 'file' | 'image' | 'video' | 'link';
    } | null;
}

export const ResourceViewerModal: React.FC<ResourceViewerModalProps> = ({ isOpen, onClose, resource }) => {
    const { startSession } = useSession();
    if (!resource || !isOpen) return null;

    const isPdf = resource.url.toLowerCase().endsWith('.pdf') || resource.type === 'file';
    const isImage = resource.type === 'image' || /\.(jpg|jpeg|png|gif|webp)$/i.test(resource.url);

    // If it's a link or video, we might still want to open it externally or show a message
    // But for this feature, we focus on PDF/Image embedding.
    const showEmbed = isPdf || isImage;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full h-full max-w-6xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl relative">

                {/* Header */}
                <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                            {isPdf ? '📄' : '🖼️'}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg">{resource.title}</h3>
                            <button
                                onClick={() => {
                                    const isElectron = !!(window as any).electron;
                                    if (isElectron) {
                                        startSession(resource.url, 30, resource.title);
                                        onClose();
                                    } else {
                                        window.open(resource.url, '_blank');
                                    }
                                }}
                                className="text-xs text-indigo-500 hover:underline"
                            >
                                Open in Browser ↗
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 hover:bg-slate-200 rounded-full transition-colors text-slate-500 font-bold"
                    >
                        ✕ Close
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 bg-slate-200 relative">
                    {showEmbed ? (
                        <iframe
                            src={resource.url}
                            className="w-full h-full border-none"
                            title={resource.title}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
                            <div className="text-6xl">🔗</div>
                            <p className="font-bold text-lg">This resource cannot be embedded.</p>
                            <button
                                onClick={() => {
                                    const isElectron = !!(window as any).electron;
                                    if (isElectron) {
                                        startSession(resource.url, 30, resource.title);
                                        onClose();
                                    } else {
                                        window.open(resource.url, '_blank');
                                    }
                                }}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                            >
                                Open External Link
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
