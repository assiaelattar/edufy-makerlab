import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Box,
    Building2,
    ChevronRight,
    Command,
    Grid,
    LogOut,
    Menu,
    PanelLeftClose,
    PanelLeftOpen,
    Rows3,
    Search,
    ShieldCheck,
    ShoppingBag,
    SlidersHorizontal,
    Sparkles,
    Star,
    Eye,
    EyeOff,
    Moon,
    Sun,
    X
} from 'lucide-react';
import { arrayMove } from '@dnd-kit/sortable';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { NotificationDropdown } from '../NotificationDropdown';
import { Logo } from '../Logo';
import { ModuleConfig } from '../../services/moduleRegistry';
import { getAppById } from '../../services/appRegistry';
import { AtlasWorkspaceTabs } from '../atlas/AtlasWorkspaceTabs';
import { useModuleContext } from '../../context/ModuleContext';

interface AdminLayoutProps {
    children: React.ReactNode;
}

type Tone = {
    accent: string;
    soft: string;
    text: string;
    ring: string;
};

const toneByColor: Record<string, Tone> = {
    blue: { accent: '#0ea5e9', soft: 'bg-sky-500/10', text: 'text-sky-300', ring: 'ring-sky-400/25' },
    cyan: { accent: '#06b6d4', soft: 'bg-cyan-500/10', text: 'text-cyan-300', ring: 'ring-cyan-400/25' },
    emerald: { accent: '#10b981', soft: 'bg-emerald-500/10', text: 'text-emerald-300', ring: 'ring-emerald-400/25' },
    indigo: { accent: '#6366f1', soft: 'bg-indigo-500/10', text: 'text-indigo-300', ring: 'ring-indigo-400/25' },
    violet: { accent: '#8b5cf6', soft: 'bg-violet-500/10', text: 'text-violet-300', ring: 'ring-violet-400/25' },
    purple: { accent: '#a855f7', soft: 'bg-purple-500/10', text: 'text-purple-300', ring: 'ring-purple-400/25' },
    pink: { accent: '#ec4899', soft: 'bg-pink-500/10', text: 'text-pink-300', ring: 'ring-pink-400/25' },
    rose: { accent: '#f43f5e', soft: 'bg-rose-500/10', text: 'text-rose-300', ring: 'ring-rose-400/25' },
    red: { accent: '#ef4444', soft: 'bg-red-500/10', text: 'text-red-300', ring: 'ring-red-400/25' },
    orange: { accent: '#f97316', soft: 'bg-orange-500/10', text: 'text-orange-300', ring: 'ring-orange-400/25' },
    amber: { accent: '#d97706', soft: 'bg-amber-500/10', text: 'text-amber-300', ring: 'ring-amber-400/25' },
    slate: { accent: '#94a3b8', soft: 'bg-slate-500/10', text: 'text-slate-300', ring: 'ring-slate-400/25' }
};

const categoryLabels: Record<string, { label: string; helper: string }> = {
    dashboard: { label: 'Command', helper: 'Today' },
    academic: { label: 'Academic', helper: 'Students, classes, learning' },
    learning: { label: 'Learning Apps', helper: 'SparkQuest and portfolios' },
    business: { label: 'Growth & Ops', helper: 'Finance, CRM, workshops' },
    organization: { label: 'Organization', helper: 'Team, media, resources' },
    system: { label: 'Platform', helper: 'Settings and admin tools' }
};

const getTone = (color?: string) => toneByColor[color || 'slate'] || toneByColor.slate;

const NavItem = ({
    module,
    isActive,
    onClick,
    compact = false
}: {
    module: ModuleConfig;
    isActive: boolean;
    onClick: () => void;
    compact?: boolean;
}) => {
    const tone = getTone(module.color);
    const Icon = module.icon;

    return (
        <button
            type="button"
            onClick={onClick}
            aria-current={isActive ? 'page' : undefined}
            title={compact ? module.label : undefined}
            className={`atlas-nav-item group relative flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 ${isActive
                ? `bg-white text-slate-950 shadow-[0_16px_40px_rgba(2,6,23,0.22)] ring-1 ${tone.ring}`
                : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-100 focus-visible:ring-teal-400/60'
                }`}
        >
            <span
                className={`atlas-nav-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${isActive ? tone.soft : 'bg-white/[0.04] text-slate-500 group-hover:text-slate-200'}`}
                style={isActive ? { color: tone.accent } : undefined}
            >
                <Icon size={17} strokeWidth={2.4} />
            </span>
            <span className="atlas-sidebar-hide-compact min-w-0 flex-1">
                <span className="block truncate font-semibold">{module.label}</span>
                {module.description && <span className={`mt-0.5 hidden truncate text-[11px] md:block ${isActive ? 'text-slate-500' : 'text-slate-600 group-hover:text-slate-500'}`}>{module.description}</span>}
            </span>
            {isActive && <span className="atlas-sidebar-hide-compact h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: tone.accent }} />}
        </button>
    );
};

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
    const { currentView, navigateTo, settings, t, viewParams } = useAppContext();
    const { user, signOut, can, userProfile, currentOrganization, isSuperAdmin } = useAuth();
    const { availableModules, installedApps, getEntitlement } = useModuleContext();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isNavigationEditorOpen, setIsNavigationEditorOpen] = useState(false);
    const [moduleSearch, setModuleSearch] = useState('');
    const [isSidebarCompact, setIsSidebarCompact] = useState(false);
    const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window === 'undefined') return 'dark';
        return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    });
    const [workspaceTabIds, setWorkspaceTabIds] = useState<string[]>([]);
    const [hiddenModuleIds, setHiddenModuleIds] = useState<string[]>([]);
    const [favoriteModuleIds, setFavoriteModuleIds] = useState<string[]>([]);
    const [preferencesReady, setPreferencesReady] = useState(false);
    const moduleContentRef = useRef<HTMLDivElement>(null);
    const loadedPreferenceScopeRef = useRef<string | null>(null);

    const modules = useMemo(() => {
        return availableModules.filter(m => {
            if (m.requiredPermission && !can(m.requiredPermission)) return false;
            return true;
        });
    }, [availableModules, can]);

    const visibleModules = useMemo(() => {
        const query = moduleSearch.trim().toLowerCase();
        const visible = query ? modules : modules.filter(module => !hiddenModuleIds.includes(module.id));
        if (!query) return visible;

        return visible.filter(module =>
            [module.label, module.description, module.category, module.productArea]
                .filter(Boolean)
                .some(value => String(value).toLowerCase().includes(query))
        );
    }, [hiddenModuleIds, modules, moduleSearch]);

    const favoriteModules = visibleModules.filter(module => favoriteModuleIds.includes(module.id));

    const activeModule = modules.find(module => module.id === currentView);
    const activeTone = getTone(activeModule?.color);
    const visibleInstalledApps = installedApps.filter(appId => getEntitlement(appId)?.entitled !== false);
    const tenantName = settings.academyName || currentOrganization?.name || 'Atlas';
    const roleLabel = userProfile?.role?.replace('_', ' ') || 'member';
    const preferenceScope = currentOrganization?.id || 'default';

    useEffect(() => {
        setPreferencesReady(false);
        loadedPreferenceScopeRef.current = null;
        try {
            const storedTabs = JSON.parse(localStorage.getItem(`atlas:workspace-tabs:${preferenceScope}`) || '[]');
            setWorkspaceTabIds(Array.isArray(storedTabs) ? storedTabs : []);
            const storedHiddenModules = JSON.parse(localStorage.getItem(`atlas:hidden-modules:${preferenceScope}`) || '[]');
            const storedFavoriteModules = JSON.parse(localStorage.getItem(`atlas:favorite-modules:${preferenceScope}`) || '[]');
            setHiddenModuleIds(Array.isArray(storedHiddenModules) ? storedHiddenModules : []);
            setFavoriteModuleIds(Array.isArray(storedFavoriteModules) ? storedFavoriteModules : []);
            setIsSidebarCompact(localStorage.getItem(`atlas:sidebar-compact:${preferenceScope}`) === 'true');
            setDensity(localStorage.getItem(`atlas:density:${preferenceScope}`) === 'compact' ? 'compact' : 'comfortable');
            const storedTheme = localStorage.getItem(`atlas:theme:${preferenceScope}`);
            setTheme(storedTheme === 'light' || storedTheme === 'dark'
                ? storedTheme
                : window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
        } catch {
            setWorkspaceTabIds([]);
            setHiddenModuleIds([]);
            setFavoriteModuleIds([]);
            setIsSidebarCompact(false);
            setDensity('comfortable');
            setTheme(window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
        }
        loadedPreferenceScopeRef.current = preferenceScope;
        setPreferencesReady(true);
    }, [preferenceScope]);

    useEffect(() => {
        document.documentElement.dataset.atlasTheme = theme;
        document.documentElement.style.colorScheme = theme;
    }, [theme]);

    useEffect(() => {
        if (!modules.some(module => module.id === currentView)) return;
        setWorkspaceTabIds(previous => {
            const available = previous.filter(id => modules.some(module => module.id === id));
            if (available.includes(currentView)) {
                const unchanged = available.length === previous.length && available.every((id, index) => id === previous[index]);
                return unchanged ? previous : available;
            }
            return [...available, currentView].slice(-8);
        });
    }, [currentView, modules]);

    useEffect(() => {
        if (!preferencesReady || loadedPreferenceScopeRef.current !== preferenceScope) return;
        localStorage.setItem(`atlas:workspace-tabs:${preferenceScope}`, JSON.stringify(workspaceTabIds));
        localStorage.setItem(`atlas:hidden-modules:${preferenceScope}`, JSON.stringify(hiddenModuleIds));
        localStorage.setItem(`atlas:favorite-modules:${preferenceScope}`, JSON.stringify(favoriteModuleIds));
        localStorage.setItem(`atlas:sidebar-compact:${preferenceScope}`, String(isSidebarCompact));
        localStorage.setItem(`atlas:density:${preferenceScope}`, density);
        localStorage.setItem(`atlas:theme:${preferenceScope}`, theme);
    }, [density, favoriteModuleIds, hiddenModuleIds, isSidebarCompact, preferenceScope, preferencesReady, theme, workspaceTabIds]);

    useEffect(() => {
        const content = moduleContentRef.current;
        if (!content) return;

        content.scrollTop = 0;
        requestAnimationFrame(() => content.focus({ preventScroll: true }));
    }, [currentView, viewParams]);

    const workspaceTabs = workspaceTabIds
        .map(id => modules.find(module => module.id === id))
        .filter((module): module is ModuleConfig => Boolean(module))
        .map(module => ({
            id: module.id,
            label: module.label,
            icon: module.icon,
            accent: getTone(module.color).accent
        }));

    const reorderWorkspaceTabs = (activeId: string, overId: string) => {
        setWorkspaceTabIds(previous => {
            const activeIndex = previous.indexOf(activeId);
            const overIndex = previous.indexOf(overId);
            if (activeIndex < 0 || overIndex < 0) return previous;
            return arrayMove(previous, activeIndex, overIndex);
        });
    };

    const closeWorkspaceTab = (id: string) => {
        const remaining = workspaceTabIds.filter(tabId => tabId !== id);
        if (remaining.length === 0) return;
        setWorkspaceTabIds(remaining);
        if (id === currentView) navigateTo(remaining[remaining.length - 1] as any);
    };

    const closeMobileMenu = () => setIsMobileMenuOpen(false);

    const sidebar = (
        <aside className={`fixed left-0 top-0 z-50 h-full w-[19rem] transform border-r border-white/10 bg-slate-950 text-slate-200 transition-[width,transform] duration-200 ease-out md:sticky md:translate-x-0 ${isSidebarCompact ? 'atlas-sidebar-compact md:w-[5.5rem]' : 'md:w-[19rem]'} ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="atlas-shell-surface flex h-full flex-col">
                <div className="border-b border-white/10 px-5 py-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white">
                            {settings.logoUrl ? <img src={settings.logoUrl} alt="Organization logo" className="h-8 w-8 object-contain" /> : <Logo className="h-8 w-8" />}
                        </div>
                        <div className="atlas-sidebar-hide-compact min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <h1 className="truncate text-[15px] font-black text-white">Atlas</h1>
                                <span className="rounded-full border border-teal-400/20 bg-teal-400/10 px-2 py-0.5 text-[10px] font-bold uppercase text-teal-200">SaaS</span>
                            </div>
                            <p className="truncate text-xs font-medium text-slate-500">{tenantName}</p>
                        </div>
                        <button
                            type="button"
                            onClick={closeMobileMenu}
                            aria-label="Close menu"
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/10 hover:text-white md:hidden"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="atlas-sidebar-hide-compact mt-5 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                        <div className="flex items-center gap-2 text-[11px] font-bold uppercase text-slate-500">
                            <Building2 size={13} />
                            {currentOrganization?.id === 'atlas-platform' ? 'Platform workspace' : 'Tenant workspace'}
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-white">{currentOrganization?.slug || 'makerlab-academy'}</p>
                                <p className="truncate text-xs capitalize text-slate-500">{roleLabel}</p>
                            </div>
                            <ShieldCheck className="h-5 w-5 shrink-0 text-teal-300" />
                        </div>
                    </div>

                    <div className="atlas-sidebar-hide-compact relative mt-4">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                        <input
                            value={moduleSearch}
                            onChange={(event) => setModuleSearch(event.target.value)}
                            className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/70 pl-9 pr-9 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-teal-400/50 focus:ring-2 focus:ring-teal-400/15"
                            placeholder="Find a module"
                        />
                        <Command className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-700" />
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsNavigationEditorOpen(true)}
                        className="atlas-sidebar-hide-compact mt-2 flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-xs font-bold text-slate-500 transition-colors hover:bg-white/[0.04] hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60"
                    >
                        <SlidersHorizontal size={14} />
                        Customize navigation
                        {hiddenModuleIds.length > 0 && <span className="ml-auto text-[10px] text-slate-600">{hiddenModuleIds.length} hidden</span>}
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar" aria-label="Main navigation">
                    {favoriteModules.length > 0 && (
                        <section className="mb-5">
                            <div className="atlas-sidebar-hide-compact mb-2 flex items-center justify-between px-3">
                                <h2 className="text-[11px] font-black uppercase text-slate-500">Favorites</h2>
                                <Star className="h-3.5 w-3.5 text-amber-300" fill="currentColor" />
                            </div>
                            <div className="space-y-1.5">
                                {favoriteModules.map(module => (
                                    <NavItem key={`favorite-${module.id}`} module={module} isActive={currentView === module.id} compact={isSidebarCompact} onClick={() => { navigateTo(module.id); closeMobileMenu(); }} />
                                ))}
                            </div>
                        </section>
                    )}
                    {Object.keys(categoryLabels).map(category => {
                        const categoryModules = visibleModules.filter(module => module.category === category && !favoriteModuleIds.includes(module.id));
                        if (categoryModules.length === 0) return null;
                        const meta = categoryLabels[category];

                        return (
                            <section key={category} className="mb-5 last:mb-0">
                                <div className="atlas-sidebar-hide-compact mb-2 flex items-end justify-between px-3">
                                    <div>
                                        <h2 className="text-[11px] font-black uppercase text-slate-500">{meta.label}</h2>
                                        <p className="mt-0.5 text-[10px] text-slate-700">{meta.helper}</p>
                                    </div>
                                    <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-slate-600">{categoryModules.length}</span>
                                </div>
                                <div className="space-y-1.5">
                                    {categoryModules.map(module => (
                                        <NavItem
                                            key={module.id}
                                            module={module}
                                            isActive={currentView === module.id}
                                            compact={isSidebarCompact}
                                            onClick={() => {
                                                navigateTo(module.id);
                                                closeMobileMenu();
                                            }}
                                        />
                                    ))}
                                </div>
                            </section>
                        );
                    })}

                    <section className="mb-5">
                        <div className="atlas-sidebar-hide-compact mb-2 flex items-end justify-between px-3">
                            <div>
                                <h2 className="text-[11px] font-black uppercase text-slate-500">Marketplace</h2>
                                <p className="mt-0.5 text-[10px] text-slate-700">Apps and extensions</p>
                            </div>
                            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                        </div>
                        <div className="space-y-1.5">
                            <button
                                type="button"
                                onClick={() => { navigateTo('app-store' as any); closeMobileMenu(); }}
                                className={`group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 ${currentView === 'app-store' ? 'bg-white text-slate-950 shadow-[0_16px_40px_rgba(2,6,23,0.22)]' : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-100'}`}
                            >
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300">
                                    <ShoppingBag size={17} strokeWidth={2.4} />
                                </span>
                                <span className="atlas-sidebar-hide-compact font-semibold">App Marketplace</span>
                            </button>

                            {visibleInstalledApps.map(appId => {
                                const app = getAppById(appId);
                                if (!app) return null;
                                const isAppActive = currentView === 'saas-app' && (window as any).viewId === appId;

                                return (
                                    <button
                                        key={app.id}
                                        type="button"
                                        onClick={() => { navigateTo('saas-app', { appId: app.id }); closeMobileMenu(); }}
                                        className={`group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/50 ${isAppActive ? 'bg-white text-slate-950 shadow-[0_16px_40px_rgba(2,6,23,0.22)]' : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-100'}`}
                                    >
                                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-300">
                                            <app.icon size={17} strokeWidth={2.4} />
                                        </span>
                                        <span className="atlas-sidebar-hide-compact truncate font-semibold">{app.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {isSuperAdmin && (
                        <section>
                            <div className="atlas-sidebar-hide-compact mb-2 px-3">
                                <h2 className="text-[11px] font-black uppercase text-slate-500">Operator</h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => { navigateTo('saas-admin' as any); closeMobileMenu(); }}
                                className={`group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 ${currentView === 'saas-admin' ? 'bg-white text-slate-950 shadow-[0_16px_40px_rgba(2,6,23,0.22)]' : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-100'}`}
                            >
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
                                    <Box size={17} strokeWidth={2.4} />
                                </span>
                                <span className="atlas-sidebar-hide-compact font-semibold">Platform Console</span>
                            </button>
                        </section>
                    )}
                </nav>

                <div className="border-t border-white/10 p-4">
                    <button
                        type="button"
                        onClick={() => setTheme(value => value === 'dark' ? 'light' : 'dark')}
                        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
                        aria-pressed={theme === 'light'}
                        className="atlas-theme-mobile mb-3 flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 md:hidden"
                    >
                        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
                        <span>{theme === 'dark' ? 'Use light theme' : 'Use dark theme'}</span>
                    </button>
                    <div className="mb-3 flex items-center justify-between">
                        <div className="atlas-sidebar-hide-compact flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold uppercase text-teal-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-teal-300 shadow-[0_0_12px_rgba(45,212,191,0.9)]" />
                            Live workspace
                        </div>
                        <NotificationDropdown />
                    </div>
                    <div className="atlas-sidebar-hide-compact mb-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-300 to-amber-300 text-sm font-black text-slate-950">
                            {(userProfile?.name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-bold text-white">{userProfile?.name || 'User'}</div>
                            <div className="truncate text-xs capitalize text-slate-500">{roleLabel}</div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={signOut}
                        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 text-xs font-bold text-slate-400 transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
                    >
                        <LogOut size={14} />
                        <span className="atlas-sidebar-hide-compact">{t('menu.signout')}</span>
                    </button>
                </div>
            </div>

            {isNavigationEditorOpen && (
                <div className="absolute inset-0 z-30 flex flex-col bg-[#08111F]">
                    <div className="flex min-h-16 items-center justify-between border-b border-white/10 px-4">
                        <div>
                            <h2 className="text-sm font-black text-white">Customize navigation</h2>
                            <p className="mt-0.5 text-[11px] text-slate-500">Show only the tools your team uses.</p>
                        </div>
                        <button type="button" aria-label="Close navigation settings" onClick={() => setIsNavigationEditorOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.06] hover:text-white"><X size={18} /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                        <div className="mb-3 rounded-lg border border-teal-300/15 bg-teal-300/[0.05] px-3 py-2 text-[11px] leading-5 text-slate-400">
                            Your plan and role decide what is available. These controls only organize your personal rail.
                        </div>
                        <div className="space-y-1">
                            {modules.map(module => {
                                const Icon = module.icon;
                                const hidden = hiddenModuleIds.includes(module.id);
                                const favorite = favoriteModuleIds.includes(module.id);
                                const essential = ['dashboard', 'settings'].includes(module.id);
                                return (
                                    <div key={module.id} className="flex min-h-12 items-center gap-3 rounded-lg px-2.5 hover:bg-white/[0.035]">
                                        <Icon size={16} className={hidden ? 'text-slate-700' : 'text-teal-300'} />
                                        <span className={`min-w-0 flex-1 truncate text-xs font-bold ${hidden ? 'text-slate-600' : 'text-slate-300'}`}>{module.label}</span>
                                        <button type="button" disabled={hidden} aria-label={`${favorite ? 'Remove' : 'Add'} ${module.label} ${favorite ? 'from' : 'to'} favorites`} onClick={() => setFavoriteModuleIds(previous => favorite ? previous.filter(id => id !== module.id) : [...previous, module.id])} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-white/[0.05] hover:text-amber-300 disabled:opacity-25"><Star size={14} fill={favorite ? 'currentColor' : 'none'} className={favorite ? 'text-amber-300' : ''} /></button>
                                        <button type="button" disabled={essential} aria-label={`${hidden ? 'Show' : 'Hide'} ${module.label}`} onClick={() => setHiddenModuleIds(previous => hidden ? previous.filter(id => id !== module.id) : [...previous, module.id])} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-white/[0.05] hover:text-teal-200 disabled:cursor-not-allowed disabled:opacity-25">{hidden ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="border-t border-white/10 p-3">
                        <button type="button" onClick={() => setIsNavigationEditorOpen(false)} className="h-10 w-full rounded-lg bg-teal-400 text-sm font-black text-slate-950 hover:bg-teal-300">Done</button>
                    </div>
                </div>
            )}
        </aside>
    );

    return (
        <div
            className="atlas-app-shell flex h-[100dvh] overflow-hidden font-sans"
            data-atlas-density={density}
            data-atlas-theme={theme}
        >
            {isMobileMenuOpen && (
                <button
                    type="button"
                    aria-label="Close menu overlay"
                    className="fixed inset-0 z-40 bg-slate-950/85 md:hidden"
                    onClick={closeMobileMenu}
                />
            )}

            {sidebar}

            <main className="flex h-[100dvh] min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <header className="atlas-topbar z-30 shrink-0 border-b border-white/10 bg-slate-950 px-3 py-2 md:px-5">
                    <div className="flex min-h-12 items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setIsMobileMenuOpen(true)}
                                aria-label="Open menu"
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 md:hidden"
                            >
                                <Menu size={21} />
                            </button>
                            <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-teal-200 md:flex">
                                <Grid size={19} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                                    <span>Atlas</span>
                                    <ChevronRight size={13} />
                                    <span className="truncate">{categoryLabels[activeModule?.category || 'dashboard']?.label || 'Workspace'}</span>
                                </div>
                                <h1 className="truncate text-lg font-black tracking-tight text-white md:text-xl">{activeModule?.label || 'Workspace'}</h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setTheme(value => value === 'dark' ? 'light' : 'dark')}
                                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
                                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
                                aria-pressed={theme === 'light'}
                                className="atlas-theme-toggle hidden h-10 w-10 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 md:flex"
                            >
                                {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsSidebarCompact(value => !value)}
                                aria-label={isSidebarCompact ? 'Expand navigation' : 'Collapse navigation'}
                                title={isSidebarCompact ? 'Expand navigation' : 'Collapse navigation'}
                                className="hidden h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 md:flex"
                            >
                                {isSidebarCompact ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
                            </button>
                            <button
                                type="button"
                                onClick={() => setDensity(value => value === 'compact' ? 'comfortable' : 'compact')}
                                aria-label={density === 'compact' ? 'Use comfortable spacing' : 'Use compact spacing'}
                                title={density === 'compact' ? 'Use comfortable spacing' : 'Use compact spacing'}
                                className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 ${density === 'compact' ? 'border-teal-300/30 bg-teal-400/10 text-teal-200' : 'border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white'}`}
                            >
                                <Rows3 size={17} />
                            </button>
                            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-300 lg:flex">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: activeTone.accent }} />
                                {tenantName}
                            </div>
                            <div className="hidden md:block">
                                <NotificationDropdown />
                            </div>
                            <button
                                type="button"
                                onClick={signOut}
                                className="hidden h-10 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-bold text-slate-400 transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 md:flex"
                            >
                                <LogOut size={14} />
                                Sign out
                            </button>
                        </div>
                    </div>

                    <div className="mt-1.5 flex min-h-9 min-w-0 items-center gap-2 border-t border-white/[0.06] pt-1.5">
                        <span className="hidden shrink-0 px-1 text-[9px] font-black uppercase text-slate-600 lg:block">Workspace</span>
                        {workspaceTabs.length > 0 && (
                            <AtlasWorkspaceTabs
                                tabs={workspaceTabs}
                                activeId={currentView}
                                onActivate={id => navigateTo(id as any)}
                                onClose={closeWorkspaceTab}
                                onReorder={reorderWorkspaceTabs}
                            />
                        )}
                    </div>
                </header>

                <div
                    ref={moduleContentRef}
                    className={`atlas-module-content min-h-0 flex-1 overflow-y-auto pb-24 outline-none custom-scrollbar ${density === 'compact' ? 'p-3 md:p-4' : 'p-4 md:p-7'}`}
                    tabIndex={-1}
                    aria-label={`${activeModule?.label || 'Workspace'} content`}
                >
                    <div className="mx-auto w-full max-w-[1680px]">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};
