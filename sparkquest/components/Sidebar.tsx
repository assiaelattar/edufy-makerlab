import React from 'react';
import { User, ShoppingBag, Gamepad2, Award, Image as ImageIcon, Key, TrendingUp, Settings, LogOut } from 'lucide-react';
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
    onLogout
}) => {
    return (
        <div className="hidden md:flex w-80 flex-shrink-0 flex-col border-r border-white/5 bg-slate-900/30 backdrop-blur-xl relative z-20 h-full transition-all duration-300">
            {/* Profile Header */}
            <div className="p-6 pb-0 flex flex-col items-center text-center">
                <button
                    onClick={onEditProfile}
                    className="w-24 h-24 rounded-3xl bg-slate-800 border-4 border-indigo-500/50 hover:border-indigo-400 hover:scale-105 transition-all shadow-lg overflow-hidden relative group mb-4"
                >
                    {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" /> : <div className="text-4xl">😎</div>}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-white uppercase">
                        Edit
                    </div>
                </button>
                <h1 className="text-2xl font-black text-white uppercase leading-none mb-1">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                        {studentName?.split(' ')[0] || 'Maker'}'s
                    </span> Studio
                </h1>
                <div className="flex items-center gap-2 mt-4">
                    <button
                        onClick={onOpenStore}
                        className="px-4 py-1.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 rounded-xl font-black flex items-center gap-2 hover:scale-105 transition-transform text-sm"
                    >
                        <ShoppingBag size={14} /> <span>{coins}</span>
                    </button>
                    {isAdminOrInstructor && onOpenSettings && (
                        <button
                            onClick={onOpenSettings}
                            className="p-1.5 bg-slate-800 rounded-xl border border-slate-700 text-slate-400 hover:text-white"
                        >
                            <Settings size={14} />
                        </button>
                    )}
                    {onLogout && (
                        <button
                            onClick={onLogout}
                            className="p-1.5 bg-red-500/10 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/20"
                        >
                            <LogOut size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Vertical Navigation */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3 custom-scrollbar">
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
