import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, Home, Folder, Award, BookOpen, MessageSquare, Settings, ChevronRight, CreditCard, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export function Layout() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { studentProfile, signOut } = useAuth();
    const location = useLocation();

    const navItems = [
        { to: '/', label: 'My Hub', icon: Home },
        { to: '/projects', label: 'Projects', icon: Folder },
        { to: '/resources', label: 'Resources', icon: BookOpen },
        { to: '/certifications', label: 'Certifications', icon: Award },
        { to: '/billing', label: 'Billing', icon: CreditCard },
        { to: '/community', label: 'Community', icon: MessageSquare },
        { to: '/settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen flex text-slate-900 font-sans selection:bg-brand-100 selection:text-brand-900">

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar - Desktop & Mobile */}
            <aside className={cn(
                "fixed lg:sticky top-0 h-screen z-50 w-72 p-4 transition-transform duration-300 ease-out lg:translate-x-0 bg-transparent flex flex-col",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Sidebar Card */}
                <div className="flex-1 glass rounded-2xl flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="h-20 flex items-center px-6 border-b border-white/20">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-600 flex items-center justify-center text-white font-bold shadow-lg shadow-brand-500/30">
                                M
                            </div>
                            <div>
                                <h1 className="font-bold text-lg leading-tight text-slate-900">MakerPro</h1>
                                <span className="text-xs font-medium text-brand-600 tracking-wide uppercase">Academy</span>
                            </div>
                        </div>
                    </div>

                    {/* Nav */}
                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 mb-2 mt-2">Menu</div>
                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={({ isActive }) => cn(
                                    "group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden",
                                    isActive
                                        ? "bg-brand-50 text-brand-700 shadow-sm"
                                        : "text-slate-600 hover:bg-white/50 hover:text-slate-900"
                                )}
                            >
                                <item.icon className={cn("w-5 h-5 transition-colors", ({ isActive }: any) => isActive ? "text-brand-600" : "text-slate-400 group-hover:text-brand-500")} />
                                <span className="relative z-10">{item.label}</span>
                                {location.pathname === item.to && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute left-0 w-1 h-6 bg-brand-500 rounded-r-full"
                                    />
                                )}
                            </NavLink>
                        ))}

                        <div className="mt-8 text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 mb-2">Support</div>
                        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-white/50 hover:text-slate-900 transition-colors">
                            <span className="flex-1 text-left">Help Center</span>
                        </button>
                    </nav>

                    {/* Footer */}
                    <div className="p-4 border-t border-white/20">
                        <button onClick={() => signOut()} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors group">
                            <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden ring-2 ring-white group-hover:ring-brand-200 transition-all">
                                <img
                                    src={studentProfile?.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${studentProfile?.name || 'User'}`}
                                    alt="User"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="text-left flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-slate-900 truncate group-hover:text-brand-700 transition-colors">{studentProfile?.name || 'Participant'}</p>
                                    {studentProfile?.level && (
                                        <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full border border-amber-200">
                                            Lvl {studentProfile.level}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                                    {studentProfile?.points ? (
                                        <span className="text-brand-600 font-medium">{studentProfile.points} XP •</span>
                                    ) : null}
                                    Sign Out
                                </p>
                            </div>
                            <LogOut size={16} className="text-slate-400 group-hover:text-red-500 transition-colors" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                {/* Mobile Header */}
                <header className="h-16 lg:hidden flex items-center px-4 justify-between sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-600 flex items-center justify-center text-white text-sm font-bold">M</div>
                        MakerPro
                    </div>
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 -mr-2 text-slate-600 hover:bg-slate-50 rounded-lg active:scale-95 transition-transform"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto scroll-smooth">
                    <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-24">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            <Outlet />
                        </motion.div>
                    </div>
                </main>
            </div>
        </div>
    );
}
