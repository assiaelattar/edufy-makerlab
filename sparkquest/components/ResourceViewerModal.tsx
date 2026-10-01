import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { ExternalLink, FileText, Image as ImageIcon, Link2, Video } from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { SparkbookDialog } from './SparkbookDialog';

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
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!resource || !isOpen || !mounted) return null;

    const isPdf = resource.url.toLowerCase().endsWith('.pdf') || resource.type === 'file';
    const isImage = resource.type === 'image' || /\.(jpg|jpeg|png|gif|webp)$/i.test(resource.url);
    const isVideo = resource.type === 'video' || resource.url.includes('youtube.com') || resource.url.includes('youtu.be');
    const canEmbed = isPdf || isImage || isVideo;
    const icon = isPdf ? <FileText /> : isVideo ? <Video /> : isImage ? <ImageIcon /> : <Link2 />;
    const embedUrl = resource.url.includes('youtube.com/watch?v=')
        ? resource.url.replace('watch?v=', 'embed/')
        : resource.url.includes('youtu.be/')
            ? resource.url.replace('youtu.be/', 'youtube.com/embed/')
            : resource.url;

    const openResource = () => {
        if ((window as any).electron) {
            startSession(resource.url, 30, resource.title);
            onClose();
            return;
        }
        window.open(resource.url, '_blank', 'noopener,noreferrer');
    };

    return ReactDOM.createPortal(
        <SparkbookDialog
            isOpen
            onClose={onClose}
            eyebrow="Mission resource"
            title={resource.title}
            description={canEmbed ? 'Review this reference without losing your place in the mission.' : 'This reference opens in a separate browser tab.'}
            icon={icon}
            tone="blue"
            size="full"
            bodyClassName="sq-resource-viewer"
            footer={<><span>Return to the worksheet when you are ready to continue.</span><button type="button" className="sq-action sq-action--primary" onClick={openResource}><ExternalLink size={17} /> Open separately</button></>}
        >
            {canEmbed ? (
                <div className="sq-resource-stage">
                    {isVideo ? <iframe src={embedUrl} title={resource.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : isImage ? <img src={resource.url} alt={resource.title} /> : <iframe src={embedUrl} title={resource.title} />}
                </div>
            ) : (
                <div className="sq-resource-empty"><Link2 /><strong>This link cannot be shown inside SparkQuest.</strong><span>Open it separately, then come back to your worksheet when you are done.</span><button type="button" className="sq-action sq-action--primary" onClick={openResource}><ExternalLink size={17} /> Open resource</button></div>
            )}
        </SparkbookDialog>,
        document.body,
    );
};
