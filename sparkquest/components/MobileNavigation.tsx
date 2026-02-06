import React from 'react';
import { User, ShoppingBag, Gamepad2, Award, Image as ImageIcon, Key, TrendingUp, Menu, Zap, Trophy } from 'lucide-react';

interface MobileNavigationProps {
    onOpenStore: () => void;
    onOpenArcade: () => void;
    onOpenPortfolio: () => void;
    onOpenGallery: () => void;
    onOpenWallet: () => void;
    onOpenProfile: () => void;
    onOpenContests?: () => void;
}

const NavItem = ({ icon: Icon, label, onClick, active }: any) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${active ? 'text-indigo-400 scale-110' : 'text-slate-500 hover:text-slate-300'}`}
    >
        <Icon size={24} strokeWidth={active ? 2.5 : 2} />
        {/* <span className="text-[10px] font-bold mt-1 uppercase">{label}</span> */}
    </button>
);

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
    onOpenStore,
    onOpenArcade,
    onOpenPortfolio,
    onOpenGallery,
    onOpenWallet,
    onOpenProfile,
    onOpenContests
}) => {
    return (
        <div className="md:hidden fixed bottom-6 left-6 right-6 h-20 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl z-50 flex items-center justify-between px-6">
            <NavItem icon={Award} label="Portfolio" onClick={onOpenPortfolio} />
            <NavItem icon={Gamepad2} label="Arcade" onClick={onOpenArcade} />

            {/* Center Main Action */}
            <div className="relative -top-8">
                <button
                    onClick={onOpenProfile}
                    className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 border-4 border-slate-900 shadow-xl flex items-center justify-center text-white hover:scale-105 transition-transform"
                >
                    <User size={28} fill="currentColor" />
                </button>
            </div>

            {onOpenContests && <NavItem icon={Trophy} label="Contests" onClick={onOpenContests} />}
            <NavItem icon={ShoppingBag} label="Store" onClick={onOpenStore} />
        </div>
    );
};
