import React from 'react';
import { User, ShoppingBag, Gamepad2, Award, Image as ImageIcon, Key, TrendingUp, Settings, LogOut, Trophy } from 'lucide-react';
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
    onOpenSettings?: () => void;
    onOpenContests?: () => void;
    onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    studentName,
    avatarUrl,
    coins,
    isAdminOrInstructor,
    onEditProfile,
    onOpenStore,
    onOpenArcade,
    onOpenPortfolio,
    onOpenGallery,
    onOpenPickup,
    onOpenWallet,
    onOpenProgress,
    onOpenSettings,
    onOpenContests,
    onLogout
}) => {
    return (
        <div className="hidden md:flex w-24 hover:w-64 group flex-shrink-0 flex-col border-r border-white/5 bg-slate-900/30 backdrop-blur-xl relative z-20 h-full transition-all duration-300">
            {/* Profile Header */}
            {/* Vertical Navigation (Full Height) */}

            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3 custom-scrollbar">
                <div className="mb-6 px-4">
                    <h1 className="text-xl font-black text-white italic tracking-tighter">SPARK<span className="text-blue-500">QUEST</span></h1>
                </div>
                {onOpenContests && <SidebarItem onClick={onOpenContests} title="CONTESTS" subtitle="Win Gadgets" color="orange" icon={Trophy} img="https://images.unsplash.com/photo-1578269174936-2709b6aeb913?w=500&q=80" />}
                <SidebarItem onClick={onOpenStore} title="STORE" subtitle="Spend Coins" color="yellow" icon={ShoppingBag} img="https://images.unsplash.com/photo-1553481187-be93c21490a9?w=500&q=80" />
                <SidebarItem onClick={onOpenArcade} title="ARCADE" subtitle="Play & Learn" color="purple" icon={Gamepad2} img="https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&q=80" />
                <SidebarItem onClick={onOpenPortfolio} title="PORTFOLIO" subtitle="Achievements" color="emerald" icon={Award} img="https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=500&q=80" />
                <SidebarItem onClick={onOpenGallery} title="GALLERY" subtitle="Your Creations" color="pink" icon={ImageIcon} img="https://images.unsplash.com/photo-1542202229-7d93c33f5d07?w=500&q=80" />
                <SidebarItem onClick={onOpenPickup} title="PICKUP" subtitle="Schedule Ride" color="amber" icon={User} img="https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=500&q=80" />
                <SidebarItem onClick={onOpenWallet} title="INVENTORY" subtitle="Items & Keys" color="cyan" icon={Key} img="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&q=80" />
                <SidebarItem onClick={onOpenProgress} title="PROGRESS" subtitle="Productivity" color="violet" icon={TrendingUp} img="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500&q=80" />
            </div>
        </div>
    );
};
