import React, { useState } from 'react';
import {
    BookOpen,
    Box,
    CalendarCheck,
    Camera,
    Gamepad2,
    Home,
    LogOut,
    Menu,
    Users,
    X
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { ViewState } from '../../types';
import { Logo } from '../Logo';
import { NotificationDropdown } from '../NotificationDropdown';

interface InstructorLayoutProps {
    children: React.ReactNode;
}

const menuItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'learning', icon: BookOpen, label: 'Studio Manager' },
    { id: 'students', icon: Users, label: 'Students' },
    { id: 'attendance', icon: CalendarCheck, label: 'Attendance' },
    { id: 'tools', icon: Box, label: 'Inventory' },
    { id: 'media', icon: Camera, label: 'Gallery' },
    { id: 'arcade-mgr', icon: Gamepad2, label: 'Arcade Manager' }
] as const;

export const InstructorLayout: React.FC<InstructorLayoutProps> = ({ children }) => {
    const { currentView, navigateTo, settings } = useAppContext();
    const { userProfile, signOut } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const academyName = settings.academyName || 'MakerLab Academy';
    const instructorName = userProfile?.name || 'Instructor';
    const instructorInitial = instructorName.charAt(0).toUpperCase() || 'I';
    const activeItem = menuItems.find(item => item.id === currentView);
    const closeMobileMenu = () => setIsMobileMenuOpen(false);

    return (
        <div className="flex min-h-[100dvh] bg-[#08111f] font-sans text-slate-200">
            {isMobileMenuOpen && (
                <button
                    type="button"
                    aria-label="Close navigation overlay"
                    className="fixed inset-0 z-40 bg-[#08111f]/85 md:hidden"
                    onClick={closeMobileMenu}
                />
            )}

            <aside
                id="instructor-navigation"
                className={`fixed inset-y-0 left-0 z-50 w-[18rem] transform border-r border-white/10 bg-[#0f1b2d] text-slate-200 shadow-2xl transition-transform duration-200 ease-out md:sticky md:translate-x-0 md:shadow-none ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="flex h-full flex-col">
                    <div className="border-b border-white/10 px-4 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white">
                                {settings.logoUrl ? (
                                    <img src={settings.logoUrl} alt={`${academyName} logo`} className="h-8 w-8 object-contain" />
                                ) : (
                                    <Logo className="h-7 w-7" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-black text-white">Atlas</span>
                                    <span className="rounded-md border border-amber-300/20 bg-amber-300/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-200">
                                        Instructor
                                    </span>
                                </div>
                                <p className="truncate text-xs font-medium text-slate-400">{academyName}</p>
                            </div>
                            <button
                                type="button"
                                onClick={closeMobileMenu}
                                aria-label="Close navigation"
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 md:hidden"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4 custom-scrollbar" aria-label="Instructor navigation">
                        <p className="mb-2 px-3 text-[10px] font-black uppercase text-slate-500">Workspace</p>
                        <div className="space-y-1">
                            {menuItems.map(item => {
                                const isActive = currentView === item.id;
                                const Icon = item.icon;

                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => {
                                            navigateTo(item.id as ViewState);
                                            closeMobileMenu();
                                        }}
                                        aria-current={isActive ? 'page' : undefined}
                                        className={`group flex min-h-10 w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${isActive
                                            ? 'bg-teal-300 text-[#08111f]'
                                            : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
                                            }`}
                                    >
                                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${isActive ? 'bg-[#08111f]/10 text-[#08111f]' : 'bg-white/[0.04] text-slate-500 group-hover:text-teal-200'}`}>
                                            <Icon size={16} strokeWidth={2.3} />
                                        </span>
                                        <span className="min-w-0 flex-1 truncate font-semibold">{item.label}</span>
                                        {isActive && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#08111f]" />}
                                    </button>
                                );
                            })}
                        </div>
                    </nav>

                    <div className="border-t border-white/10 px-3 py-3">
                        <div className="mb-3 flex items-center justify-between gap-3 px-1">
                            <div className="flex min-w-0 items-center gap-2.5">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-300/20 bg-amber-300/10 text-sm font-black text-amber-200">
                                    {instructorInitial}
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-white">{instructorName}</p>
                                    <p className="text-[10px] font-bold uppercase text-amber-200">Instructor service</p>
                                </div>
                            </div>
                            <div className="shrink-0">
                                <NotificationDropdown />
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={signOut}
                            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/10 text-xs font-bold text-slate-400 transition-colors hover:border-rose-300/30 hover:bg-rose-400/10 hover:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                        >
                            <LogOut size={15} />
                            Sign out
                        </button>
                    </div>
                </div>
            </aside>

            <main className="flex h-[100dvh] min-w-0 flex-1 flex-col overflow-hidden bg-[#08111f]">
                <header className="shrink-0 border-b border-white/10 bg-[#0f1b2d] px-3 py-2 md:hidden">
                    <div className="flex min-h-12 items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setIsMobileMenuOpen(true)}
                                aria-label="Open instructor navigation"
                                aria-controls="instructor-navigation"
                                aria-expanded={isMobileMenuOpen}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
                            >
                                <Menu size={20} />
                            </button>
                            <div className="min-w-0">
                                <p className="truncate text-[10px] font-bold uppercase text-amber-200">Instructor workspace</p>
                                <h1 className="truncate text-base font-black text-white">{activeItem?.label || 'My Studio'}</h1>
                            </div>
                        </div>
                        <div className="shrink-0">
                            <NotificationDropdown />
                        </div>
                    </div>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto p-0 pb-24 scroll-smooth custom-scrollbar md:p-6 md:pb-6 lg:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
};
