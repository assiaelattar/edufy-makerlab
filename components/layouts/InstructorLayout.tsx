
import React, { useState } from 'react';
import { Menu, LogOut, X, Home, BookOpen, Box, Camera, Settings, Users, CalendarCheck, FileText, LayoutGrid } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { NotificationDropdown } from '../NotificationDropdown';
import { Logo } from '../Logo';
import { STUDIO_THEME, studioClass } from '../../utils/studioTheme';
import { ViewState } from '../../types';

interface InstructorLayoutProps {
    children: React.ReactNode;
}

export const InstructorLayout: React.FC<InstructorLayoutProps> = ({ children }) => {
    const { currentView, navigateTo, settings } = useAppContext();
    const { userProfile, signOut } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const menuItems = [
        { id: 'dashboard', icon: Home, label: 'Dashboard' },
        { id: 'learning', icon: BookOpen, label: 'Studio Manager' },
        { id: 'students', icon: Users, label: 'Students' },
        { id: 'attendance', icon: CalendarCheck, label: 'Attendance' },
        { id: 'tools', icon: Box, label: 'Inventory' },
        { id: 'media', icon: Camera, label: 'Gallery' },
    ];

    // Import LayoutDashboard icon specifically as it was missing in lucide import above
    const DashboardIcon = Home;

    return (
        <div className={`flex min-h-[100dvh] ${STUDIO_THEME.background.main} text-slate-800 font-sans`}>
            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed md:sticky top-0 left-0 z-50 h-full w-72 
                bg-white/80 backdrop-blur-xl border-r border-white/20 shadow-2xl
                transform transition-transform duration-300 ease-out 
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-6 border-b border-indigo-50 flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200 overflow-hidden">
                            {settings.logoUrl ? <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <Logo className="w-6 h-6 text-white" />}
                        </div>
                        <div>
                            <h1 className="font-bold text-slate-800 leading-tight truncate max-w-[160px]">{settings.academyName}</h1>
                            <p className="text-[10px] text-indigo-500 uppercase tracking-wider font-bold">Instructor Studio</p>
                        </div>
                        <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden ml-auto text-slate-400 hover:text-slate-600">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                        {menuItems.map(item => {
                            const isActive = currentView === item.id;
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => { navigateTo(item.id as ViewState); setIsMobileMenuOpen(false); }}
                                    className={`
                                        w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group
                                        ${isActive
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 translate-x-1'
                                            : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 hover:pl-5'
                                        }
                                    `}
                                >
                                    <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500'} strokeWidth={isActive ? 2.5 : 2} />
                                    {item.label}
                                </button>
                            )
                        })}
                    </nav>

                    {/* User Profile & Footer */}
                    <div className="p-4 border-t border-indigo-50 bg-white/50">
                        <div className="flex justify-end mb-2 px-2"><NotificationDropdown /></div>

                        <div className="bg-white rounded-xl p-3 shadow-sm border border-indigo-50 mb-3 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border-2 border-white shadow-sm">
                                {userProfile?.name?.charAt(0) || 'I'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-slate-800 text-sm truncate">{userProfile?.name}</div>
                                <div className="text-xs text-indigo-500 font-medium">Instructor</div>
                            </div>
                        </div>

                        <button
                            onClick={signOut}
                            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors text-sm font-medium"
                        >
                            <LogOut size={16} /> Sign Out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 flex flex-col h-[100dvh] overflow-hidden relative z-0">
                {/* Mobile Header */}
                <header className="md:hidden bg-white/80 backdrop-blur-md border-b border-indigo-50 p-4 flex items-center justify-between shrink-0 sticky top-0 z-30">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-600 p-1">
                            <Menu size={24} />
                        </button>
                        <span className="font-bold text-slate-800 text-lg">My Studio</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <NotificationDropdown />
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 relative scroll-smooth pb-24 md:pb-8">
                    {children}
                </div>
            </main>
        </div>
    );
};
