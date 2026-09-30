import React, { useState } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { MobileNavigation } from './MobileNavigation';
import { Sidebar } from './Sidebar';

interface LearnerNavigationPreviewProps {
    onClose: () => void;
}

export const LearnerNavigationPreview: React.FC<LearnerNavigationPreviewProps> = ({ onClose }) => {
    const [destination, setDestination] = useState('Field log');
    const open = (label: string) => () => setDestination(label);
    return <main className="sparkquest-dashboard sq-sparkbook flex h-screen w-full overflow-hidden relative">
        <div className="sq-atmosphere absolute inset-0" />
        <Sidebar studentName="Aya Maker" avatarUrl="" coins={240} isAdminOrInstructor={false} onEditProfile={open('Maker profile')} onOpenStore={open('Spark Exchange')} onOpenArcade={open('Play lab')} onOpenPortfolio={open('Field log')} onOpenGallery={open('Evidence wall')} onOpenPickup={open('Pickup card')} onOpenWallet={open('Key cabinet')} onOpenProgress={open('Build rhythm')} />
        <MobileNavigation onOpenStore={open('Spark Exchange')} onOpenArcade={open('Play lab')} onOpenPortfolio={open('Field log')} onOpenGallery={open('Evidence wall')} onOpenWallet={open('Key cabinet')} onOpenProfile={open('Maker profile')} />
        <section className="sq-nav-preview-content">
            <button type="button" onClick={onClose}><ArrowLeft size={18} /> Back to profile preview</button>
            <div><p>Sparkbook destinations</p><h1>Your field kit stays close to the work.</h1><span>Desktop uses a labeled workshop index. Phone keeps five primary destinations and places evidence and keys inside one compact kit sheet.</span></div>
            <aside role="status"><Sparkles size={18} /><span><small>Last opened</small><strong>{destination}</strong></span></aside>
        </section>
    </main>;
};
