import React from 'react';
import { FileText, Code, Link as LinkIcon, ExternalLink, Play } from 'lucide-react';
import { cn } from '../lib/utils';

export type EmbedType = 'video' | 'drive' | 'pdf' | 'code' | 'link' | 'image';

export interface UniversalEmbedProps {
    type: EmbedType;
    src: string;
    title?: string;
    className?: string;
    aspectRatio?: 'video' | 'square' | 'auto';
    thumbnail?: string;
}

export function UniversalEmbed({ type, src, title, className, aspectRatio = 'video', thumbnail }: UniversalEmbedProps) {

    const getAspectRatio = () => {
        switch (aspectRatio) {
            case 'video': return 'aspect-video';
            case 'square': return 'aspect-square';
            case 'auto': return '';
            default: return 'aspect-video';
        }
    };

    const renderContent = () => {
        switch (type) {
            case 'video':
                // Handle YouTube and generic video
                const isYouTube = src.includes('youtube.com') || src.includes('youtu.be');
                let embedSrc = src;
                if (isYouTube) {
                    const videoId = src.split('v=')[1]?.split('&')[0] || src.split('youtu.be/')[1];
                    if (videoId) embedSrc = `https://www.youtube.com/embed/${videoId}`;
                }

                return (
                    <iframe
                        src={embedSrc}
                        title={title || "Video player"}
                        className="w-full h-full rounded-lg border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                );

            case 'drive':
                // Convert view link to preview link if needed
                let driveSrc = src;
                if (src.includes('drive.google.com') && src.includes('/view')) {
                    driveSrc = src.replace('/view', '/preview');
                }
                return (
                    <iframe
                        src={driveSrc}
                        title={title || "Drive File"}
                        className="w-full h-full rounded-lg border-0 bg-slate-100"
                    />
                );

            case 'pdf':
                return (
                    <div className="w-full h-full relative group">
                        <iframe
                            src={src}
                            title={title || "PDF Document"}
                            className="w-full h-full rounded-lg border-0 bg-slate-100"
                        />
                        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                            <a
                                href={src}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-white text-slate-900 rounded-lg text-sm font-bold shadow-lg hover:bg-slate-50 transition-colors"
                            >
                                <ExternalLink size={16} /> Open PDF
                            </a>
                        </div>
                    </div>
                );

            case 'code':
                return (
                    <div className="w-full h-full overflow-auto bg-slate-900 text-slate-50 p-4 rounded-lg font-mono text-sm">
                        <div className="flex items-center gap-2 mb-2 text-slate-400 border-b border-slate-700 pb-2">
                            <Code className="w-4 h-4" /> {/* Assuming Code is imported */}
                            <span>Snippet</span>
                        </div>
                        <pre className="whitespace-pre-wrap">{src}</pre>
                    </div>
                );

            case 'image':
                return (
                    <img
                        src={src}
                        alt={title || "Embedded Image"}
                        className="w-full h-full object-contain bg-black/5 rounded-lg"
                    />
                );

            case 'link':
            default:
                return (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 rounded-lg border border-slate-200 p-6 text-center hover:bg-slate-100 transition-colors group cursor-pointer" onClick={() => window.open(src, '_blank')}>
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <ExternalLink className="w-6 h-6" />
                        </div>
                        <h3 className="font-medium text-slate-900 mb-1">{title || "External Link"}</h3>
                        <p className="text-sm text-slate-500 truncate max-w-full px-4">{src}</p>
                    </div>
                );
        }
    };

    return (
        <div className={cn("relative w-full rounded-lg overflow-hidden bg-slate-100", getAspectRatio(), className)}>
            {renderContent()}
        </div>
    );
}
