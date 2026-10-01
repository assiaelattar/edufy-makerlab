import React from 'react';
import { Award, Gamepad2, Image as ImageIcon, KeyRound, ShoppingBag, TrendingUp, User, LayoutDashboard } from 'lucide-react';
import { SidebarItem } from './SidebarItem';

interface SidebarProps {
    studentName: string;
    avatarUrl: string;
    coins: number;
    isAdminOrInstructor: boolean;
    onEditProfile: () => void;
    onOpenStore: () => void;
    onOpenArcade: () => void;
    onOpenPortfolio: () => void;
    onOpenGallery: () => void;
    onOpenPickup: () => void;
    onOpenWallet: () => void;
    onOpenProgress: () => void;
    onHome?: () => void;
    onOpenSettings?: () => void;
    onOpenContests?: () => void;
    onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ studentName, avatarUrl, coins, onEditProfile, onOpenStore, onOpenArcade, onOpenPortfolio, onOpenGallery, onOpenPickup, onOpenWallet, onOpenProgress, onHome }) => (
    <aside className="sq-kit-nav" aria-label="Sparkbook destinations">
        <div className="sq-kit-nav-brand"><span>SPARK</span><strong>BOOK</strong><small>Field kit · 26</small></div>
        <nav>
            {onHome && <SidebarItem index="00" onClick={onHome} title="Workbench" subtitle="Continue your mission" active icon={LayoutDashboard} />}
            <SidebarItem index="01" onClick={onOpenPortfolio} title="Field log" subtitle="Projects & proof" tone="lime" icon={Award} />
            <SidebarItem index="02" onClick={onOpenArcade} title="Play lab" subtitle="Learn & play" tone="orange" icon={Gamepad2} />
            <SidebarItem index="03" onClick={onOpenStore} title="Exchange" subtitle="Use your Sparks" tone="sun" icon={ShoppingBag} />
            <SidebarItem index="04" onClick={onOpenGallery} title="Evidence wall" subtitle="Bench snapshots" icon={ImageIcon} />
            <SidebarItem index="05" onClick={onOpenWallet} title="Key cabinet" subtitle="Tools & logins" icon={KeyRound} />
            <SidebarItem index="06" onClick={onOpenProgress} title="Build rhythm" subtitle="Focus history" icon={TrendingUp} />
            <SidebarItem index="07" onClick={onOpenPickup} title="Pickup card" subtitle="End-of-day plan" icon={User} />
        </nav>
        <button type="button" className="sq-kit-profile" onClick={onEditProfile}>
            <span>{avatarUrl ? <img src={avatarUrl} alt="" /> : studentName.charAt(0)}</span>
            <span><small>Maker profile</small><strong>{studentName}</strong></span>
            <b>{coins}</b>
        </button>
    </aside>
);
