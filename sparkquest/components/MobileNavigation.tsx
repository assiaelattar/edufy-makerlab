import React, { useState } from 'react';
import { Award, Gamepad2, Image as ImageIcon, KeyRound, PackageOpen, ShoppingBag, Trophy, User, X } from 'lucide-react';

interface MobileNavigationProps {
    onOpenStore: () => void;
    onOpenArcade: () => void;
    onOpenPortfolio: () => void;
    onOpenGallery: () => void;
    onOpenWallet: () => void;
    onOpenProfile: () => void;
    onOpenContests?: () => void;
}

const NavItem = ({ icon: Icon, label, onClick, featured = false }: { icon: React.ElementType; label: string; onClick: () => void; featured?: boolean }) => (
    <button type="button" onClick={onClick} className={`sq-mobile-kit-item ${featured ? 'is-featured' : ''}`}><span><Icon size={featured ? 23 : 20} /></span><small>{label}</small></button>
);

export const MobileNavigation: React.FC<MobileNavigationProps> = ({ onOpenStore, onOpenArcade, onOpenPortfolio, onOpenGallery, onOpenWallet, onOpenProfile, onOpenContests }) => {
    const [kitOpen, setKitOpen] = useState(false);
    const openFromKit = (action: () => void) => {
        setKitOpen(false);
        action();
    };

    return (
        <>
            {kitOpen && <div className="sq-mobile-kit-sheet" role="dialog" aria-modal="true" aria-labelledby="mobile-kit-title">
                <button type="button" className="sq-mobile-kit-backdrop" onClick={() => setKitOpen(false)} aria-label="Close field kit" />
                <section><header><div><p>More destinations</p><h2 id="mobile-kit-title">Open your field kit.</h2></div><button type="button" onClick={() => setKitOpen(false)} aria-label="Close field kit"><X size={22} /></button></header><div>
                    <button type="button" onClick={() => openFromKit(onOpenGallery)}><ImageIcon size={22} /><span><strong>Evidence wall</strong><small>Photos from the bench</small></span></button>
                    <button type="button" onClick={() => openFromKit(onOpenWallet)}><KeyRound size={22} /><span><strong>Key cabinet</strong><small>Learning-tool logins</small></span></button>
                    {onOpenContests && <button type="button" onClick={() => openFromKit(onOpenContests)}><Trophy size={22} /><span><strong>Contests</strong><small>Current maker challenges</small></span></button>}
                </div></section>
            </div>}
            <nav className="sq-mobile-kit" aria-label="Sparkbook destinations">
                <NavItem icon={Award} label="Log" onClick={onOpenPortfolio} />
                <NavItem icon={Gamepad2} label="Play" onClick={onOpenArcade} />
                <NavItem icon={User} label="Me" onClick={onOpenProfile} featured />
                <NavItem icon={ShoppingBag} label="Exchange" onClick={onOpenStore} />
                <NavItem icon={PackageOpen} label="Kit" onClick={() => setKitOpen(true)} />
            </nav>
        </>
    );
};
