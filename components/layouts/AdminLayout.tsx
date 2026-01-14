
import React, { useState } from 'react';
import { Menu, Bell, LogOut, X, LayoutDashboard, Users, School, BookOpen, Wallet, CalendarCheck, Wrench, Settings, Box, Camera, Home } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { NotificationDropdown } from '../NotificationDropdown';
import { Logo } from '../Logo';
import { getEnabledModules } from '../../services/moduleRegistry';

interface AdminLayoutProps {
    children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
    const { currentView, navigateTo, settings, t } = useAppContext();
    const { user, signOut, can, userProfile } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const modules = getEnabledModules().filter(m => !m.requiredPermission || can(m.requiredPermission));

    return (
        <div className="flex min-h-[100dvh] bg-slate-950 text-slate-200 font-sans">
            {/* Mobile Overlay */}
            {isMobileMenuOpen && <div className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />}

            {/* Sidebar */}
            <aside className={`fixed md:sticky top-0 left-0 z-50 h-full w-72 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-out shadow-2xl ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="flex flex-col h-full">
                    <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg border border-slate-800 overflow-hidden">
                            {settings.logoUrl ? <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <Logo className="w-8 h-8" />}
                        </div>
                        <div>
                            <h1 className="font-bold text-white leading-tight truncate max-w-[160px]">{settings.academyName}</h1>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Academy ERP</p>
                        </div>
                        <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden ml-auto text-slate-400"><X size={24} /></button>
                    </div>

                    <nav className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {['dashboard', 'academic', 'business', 'organization', 'system'].map((category) => {
                            const categoryModules = modules.filter(m => m.category === category);
                            if (categoryModules.length === 0) return null;

                            const categoryLabels: Record<string, string> = {
                                'dashboard': '',
                                'academic': 'Academic',
                                'business': 'Business & Operations',
                                'organization': 'Organization',
                                'system': 'System'
                            };

                            return (
                                <div key={category} className="mb-6 last:mb-0">
                                    {categoryLabels[category] && (
                                        <div className="px-3 mb-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                                            {categoryLabels[category]}
                                        </div>
                                    )}
                                    <div className="space-y-1">
                                        {categoryModules.map(module => (
                                            <button
                                                key={module.id}
                                                onClick={() => { navigateTo(module.id); setIsMobileMenuOpen(false); }}
                                                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${currentView === module.id ? `bg-${module.color}-950/30 text-${module.color}-400 border border-${module.color}-900/50 shadow-lg` : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                                            >
                                                <module.icon className={`w-5 h-5 transition-colors ${currentView === module.id ? `text-${module.color}-400` : 'text-slate-500 group-hover:text-slate-300'}`} />
                                                {t(`menu.${module.id}`) || module.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </nav>

                    <div className="p-4 border-t border-slate-800 bg-slate-950/30">
                        <div className="flex justify-end mb-2 px-2"><NotificationDropdown /></div>
                        <div className="flex items-center gap-3 mb-3 cursor-pointer hover:bg-slate-900/50 p-2 rounded-lg transition-colors">
                            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-slate-300">
                                {userProfile?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-white truncate">{userProfile?.name || 'User'}</div>
                                <div className="text-xs text-slate-500 truncate capitalize">{userProfile?.role.replace('_', ' ')}</div>
                            </div>
                        </div>
                        <button onClick={signOut} className="w-full flex items-center justify-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-800 text-xs font-medium"><LogOut size={14} /> {t('menu.signout')}</button>

                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 flex flex-col h-[100dvh] overflow-hidden">
                <header className="md:hidden bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between shrink-0 sticky top-0 z-30 pt-safe-top">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-400 hover:text-white p-1"><Menu size={24} /></button>
                        <span className="font-bold text-white truncate max-w-[150px] text-lg">{settings.academyName}</span>
                        <div className="ml-auto"><NotificationDropdown /></div>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-0 md:p-8 relative scroll-smooth pb-24 md:pb-8">
                    {children}
                </div>
            </main>
        </div>
    );
};
