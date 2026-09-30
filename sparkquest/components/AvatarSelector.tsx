import React, { useMemo, useState } from 'react';
import { Check, Sparkles, UserRound } from 'lucide-react';
import { AVATAR_CATEGORIES, getAvatarUrl } from '../utils/avatars';

interface AvatarSelectorProps {
    currentAvatarUrl?: string;
    onSelect: (url: string) => void;
    studentName?: string;
    previewMode?: boolean;
}

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({ currentAvatarUrl, onSelect, studentName = 'Maker', previewMode = false }) => {
    const [activeCategory, setActiveCategory] = useState(AVATAR_CATEGORIES[0].id);
    const fallbackAvatar = useMemo(() => getAvatarUrl(AVATAR_CATEGORIES[0].id, AVATAR_CATEGORIES[0].seeds[0]), []);
    const [selectedUrl, setSelectedUrl] = useState(currentAvatarUrl || fallbackAvatar);

    const handleSelect = (url: string) => {
        setSelectedUrl(url);
        if (!previewMode) onSelect(url);
    };

    return (
        <section className="sq-profile-card" aria-labelledby="profile-card-title">
            <div className="sq-profile-pass">
                <div className="sq-profile-pass-copy"><p>Sparkbook maker ID</p><h2 id="profile-card-title">Build as yourself.</h2><span>Choose the face that travels with you through missions, proof, and reviews.</span></div>
                <div className="sq-profile-pass-avatar"><img src={selectedUrl} alt="Selected maker avatar" /><span aria-hidden="true"><Sparkles size={17} /></span></div>
                <div className="sq-profile-pass-name"><small>Maker</small><strong>{studentName}</strong></div>
            </div>

            <div className="sq-profile-picker">
                <div className="sq-profile-picker-head"><span aria-hidden="true"><UserRound size={21} /></span><div><p>Avatar drawer</p><h3>Pick your workshop look</h3></div></div>
                <div className="sq-profile-tabs" role="tablist" aria-label="Avatar styles">
                    {AVATAR_CATEGORIES.map(category => <button key={category.id} type="button" role="tab" aria-selected={activeCategory === category.id} onClick={() => setActiveCategory(category.id)}>{category.label}</button>)}
                </div>
                <div className="sq-profile-grid">
                    {AVATAR_CATEGORIES.find(category => category.id === activeCategory)?.seeds.map(seed => {
                        const url = getAvatarUrl(activeCategory, seed);
                        const selected = selectedUrl === url;
                        return <button key={seed} type="button" className={selected ? 'is-selected' : ''} onClick={() => handleSelect(url)} aria-label={`Use ${seed} avatar`} aria-pressed={selected}><img src={url} alt="" loading="lazy" />{selected && <span><Check size={14} /></span>}</button>;
                    })}
                </div>
                <p className="sq-profile-note">{previewMode ? 'Preview choices stay in this browser view.' : 'Your selection saves immediately to your learner profile.'}</p>
            </div>
        </section>
    );
};
