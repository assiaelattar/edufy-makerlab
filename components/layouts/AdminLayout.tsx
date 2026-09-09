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
import { EducationAdminShellV1 } from './EducationAdminShellV1';

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
    dashboard: { label: 'Today', helper: 'Your school day' },
    academic: { label: 'School', helper: 'Students, classes and attendance' },
    learning: { label: 'Learning', helper: 'Projects and portfolios' },
    business: { label: 'Office', helper: 'Payments, enrollment and growth' },
    organization: { label: 'Team', helper: 'People, messages and resources' },
    system: { label: 'Settings', helper: 'School preferences and access' }
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
            data-active={isActive}
            className="atlas-nav-item atlas-school-nav group relative flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60"
        >
            <span
                className="atlas-nav-icon atlas-school-nav__icon flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition"
                style={isActive ? { color: tone.accent } : undefined}
            >
                <Icon size={17} strokeWidth={2.4} />
            </span>
            <span className="atlas-sidebar-hide-compact min-w-0 flex-1">
                <span className="block truncate font-semibold">{module.label}</span>
                {module.description && <span className="atlas-text-subtle mt-0.5 hidden truncate text-[11px] md:block">{module.description}</span>}
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
    // Education UI is now the production default. The query flag is a
    // non-persistent emergency rollback and does not change user preferences.
    const showEducationShellV1 = new URLSearchParams(window.location.search).get('ui') !== 'atlas-legacy';
    const theme = showEducationShellV1 ? 'light' as const : 'dark' as const;
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
        } catch {
            setWorkspaceTabIds([]);
            setHiddenModuleIds([]);
            setFavoriteModuleIds([]);
            setIsSidebarCompact(false);
            setDensity('comfortable');
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
    }, [density, favoriteModuleIds, hiddenModuleIds, isSidebarCompact, preferenceScope, preferencesReady, workspaceTabIds]);

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

    if (showEducationShellV1) {
        return (
            <EducationAdminShellV1
                modules={modules}
                visibleModules={visibleModules}
                favoriteModules={favoriteModules}
                activeModule={activeModule}
                currentView={currentView}
                currentViewLabel={currentView === 'saas-app' ? getAppById(viewParams?.appId || '')?.name : undefined}
                navigateTo={navigateTo}
                tenantName={tenantName}
                roleLabel={roleLabel}
                userName={userProfile?.name || user?.email || 'User'}
                userInitial={(userProfile?.name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()}
                logoUrl={settings.logoUrl}
                isPlatformWorkspace={currentOrganization?.id === 'atlas-platform'}
                isSuperAdmin={isSuperAdmin}
                installedAppIds={visibleInstalledApps}
                moduleSearch={moduleSearch}
                setModuleSearch={setModuleSearch}
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
                isNavigationEditorOpen={isNavigationEditorOpen}
                setIsNavigationEditorOpen={setIsNavigationEditorOpen}
                isSidebarCompact={isSidebarCompact}
                setIsSidebarCompact={setIsSidebarCompact}
                density={density}
                setDensity={setDensity}
                hiddenModuleIds={hiddenModuleIds}
                setHiddenModuleIds={setHiddenModuleIds}
                favoriteModuleIds={favoriteModuleIds}
                setFavoriteModuleIds={setFavoriteModuleIds}
                workspaceTabs={workspaceTabs}
                onCloseWorkspaceTab={closeWorkspaceTab}
                onReorderWorkspaceTabs={reorderWorkspaceTabs}
                moduleContentRef={moduleContentRef}
                signOut={signOut}
                signOutLabel={t('menu.signout')}
            >
                {children}
            </EducationAdminShellV1>
        );
    }

    const sidebar = (
        <aside className={`atlas-school-sidebar fixed left-0 top-0 z-50 h-full w-[18rem] transform border-r transition-[width,transform] duration-200 ease-out md:sticky md:translate-x-0 ${isSidebarCompact ? 'atlas-sidebar-compact md:w-[5.5rem]' : 'md:w-[18rem]'} ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="atlas-shell-surface flex h-full flex-col">
                <div className="atlas-school-sidebar__section border-b px-5 py-5">
                    <div className="flex items-center gap-3">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl ${settings.logoUrl ? 'atlas-school-context border' : 'atlas-school-brandmark'}`}>
                            {settings.logoUrl ? <img src={settings.logoUrl} alt="Organization logo" className="h-8 w-8 object-contain" /> : <Logo className="h-7 w-7 brightness-0 invert" />}
                        </div>
                        <div className="atlas-sidebar-hide-compact min-w-0 flex-1">
                            <h1 className="atlas-text-strong truncate text-lg font-black tracking-tight">Edufy</h1>
                            <p className="atlas-text-muted truncate text-xs font-medium">{tenantName}</p>
                        </div>
                        <button
                            type="button"
                            onClick={closeMobileMenu}
                            aria-label="Close menu"
                            className="atlas-text-muted flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-black/5 hover:text-teal-600 md:hidden"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="atlas-school-context atlas-sidebar-hide-compact mt-5 rounded-xl border p-3">
                        <div className="atlas-text-subtle flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide">
                            <Building2 size={13} />
                            {currentOrganization?.id === 'atlas-platform' ? 'Platform workspace' : 'School workspace'}
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="atlas-text-strong truncate text-sm font-bold">{tenantName}</p>
                                <p className="atlas-text-muted truncate text-xs capitalize">Signed in as {roleLabel}</p>
                            </div>
                            <ShieldCheck className="h-5 w-5 shrink-0 text-teal-500" />
                        </div>
                    </div>

                    <div className="atlas-sidebar-hide-compact relative mt-4">
                        <Search className="atlas-text-subtle pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                        <input
                            value={moduleSearch}
                            onChange={(event) => setModuleSearch(event.target.value)}
                            className="atlas-school-search h-11 w-full rounded-xl border pl-9 pr-9 text-sm outline-none transition"
                            placeholder="Find a page"
                        />
                        <Command className="atlas-text-subtle pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsNavigationEditorOpen(true)}
                        className="atlas-sidebar-hide-compact atlas-text-muted mt-2 flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-xs font-bold transition-colors hover:bg-black/[0.04] hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60"
                    >
                        <SlidersHorizontal size={14} />
                        Organize menu
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
                                <h2 className="atlas-text-muted text-[11px] font-black uppercase">More tools</h2>
                                <p className="atlas-text-subtle mt-0.5 text-[10px]">Optional school apps</p>
                            </div>
                            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                        </div>
                        <div className="space-y-1.5">
                            <button
                                type="button"
                                onClick={() => { navigateTo('app-store' as any); closeMobileMenu(); }}
                                data-active={currentView === 'app-store'}
                                className="atlas-school-nav group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
                            >
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300">
                                    <ShoppingBag size={17} strokeWidth={2.4} />
                                </span>
                                <span className="atlas-sidebar-hide-compact font-semibold">Add tools</span>
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
                                        data-active={isAppActive}
                                        className="atlas-school-nav group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/50"
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
                                data-active={currentView === 'saas-admin'}
                                className="atlas-school-nav group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
                            >
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
                                    <Box size={17} strokeWidth={2.4} />
                                </span>
                                <span className="atlas-sidebar-hide-compact font-semibold">Platform Console</span>
                            </button>
                        </section>
                    )}
                </nav>

                <div className="atlas-school-sidebar__section border-t p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="atlas-school-context atlas-sidebar-hide-compact flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold text-teal-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                            School day active
                        </div>
                        <NotificationDropdown />
                    </div>
                    <div className="atlas-school-context atlas-sidebar-hide-compact mb-3 flex items-center gap-3 rounded-xl border p-2.5">
                        <div className="atlas-school-avatar flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-black">
                            {(userProfile?.name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="atlas-text-strong truncate text-sm font-bold">{userProfile?.name || 'User'}</div>
                            <div className="atlas-text-muted truncate text-xs capitalize">{roleLabel}</div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={signOut}
                        className="atlas-school-control atlas-text-muted flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-xs font-bold transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
                    >
                        <LogOut size={14} />
                        <span className="atlas-sidebar-hide-compact">{t('menu.signout')}</span>
                    </button>
                </div>
            </div>

            {isNavigationEditorOpen && (
                <div className="atlas-school-sidebar absolute inset-0 z-30 flex flex-col">
                    <div className="atlas-school-sidebar__section flex min-h-16 items-center justify-between border-b px-4">
                        <div>
                            <h2 className="atlas-text-strong text-sm font-black">Organize menu</h2>
                            <p className="atlas-text-muted mt-0.5 text-[11px]">Keep the pages your team uses within easy reach.</p>
                        </div>
                        <button type="button" aria-label="Close navigation settings" onClick={() => setIsNavigationEditorOpen(false)} className="atlas-text-muted flex h-9 w-9 items-center justify-center rounded-lg hover:bg-black/[0.05] hover:text-teal-600"><X size={18} /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                        <div className="atlas-school-context mb-3 rounded-lg border px-3 py-2 text-[11px] leading-5">
                            Your school plan and role decide what is available. This only changes your personal menu.
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
                    <div className="atlas-school-sidebar__section border-t p-3">
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
                <header className="atlas-topbar atlas-school-topbar z-30 shrink-0 border-b px-3 py-2 md:px-5">
                    <div className="flex min-h-12 items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setIsMobileMenuOpen(true)}
                                aria-label="Open menu"
                                className="atlas-school-control flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition hover:text-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 md:hidden"
                            >
                                <Menu size={21} />
                            </button>
                            <div className="atlas-school-tone hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl text-teal-700 md:flex" data-tone="mint">
                                <Grid size={19} />
                            </div>
                            <div className="min-w-0">
                                <div className="atlas-text-muted flex items-center gap-2 text-xs font-semibold">
                                    <span>{tenantName}</span>
                                    <ChevronRight size={13} />
                                    <span className="truncate">{categoryLabels[activeModule?.category || 'dashboard']?.label || 'Workspace'}</span>
                                </div>
                                <h1 className="atlas-text-strong truncate text-lg font-black tracking-tight md:text-xl">{activeModule?.label || 'Today'}</h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setIsSidebarCompact(value => !value)}
                                aria-label={isSidebarCompact ? 'Expand navigation' : 'Collapse navigation'}
                                title={isSidebarCompact ? 'Expand navigation' : 'Collapse navigation'}
                                className="atlas-school-control hidden h-10 w-10 items-center justify-center rounded-lg border transition-colors hover:text-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 md:flex"
                            >
                                {isSidebarCompact ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
                            </button>
                            <button
                                type="button"
                                onClick={() => setDensity(value => value === 'compact' ? 'comfortable' : 'compact')}
                                aria-label={density === 'compact' ? 'Use comfortable spacing' : 'Use compact spacing'}
                                title={density === 'compact' ? 'Use comfortable spacing' : 'Use compact spacing'}
                                className={`atlas-school-control flex h-10 w-10 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 ${density === 'compact' ? 'text-teal-600 ring-1 ring-teal-400/20' : ''}`}
                            >
                                <Rows3 size={17} />
                            </button>
                            <div className="atlas-school-context hidden items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold lg:flex">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: activeTone.accent }} />
                                {tenantName}
                            </div>
                            <div className="hidden md:block">
                                <NotificationDropdown />
                            </div>
                            <button
                                type="button"
                                onClick={signOut}
                                className="atlas-school-control atlas-text-muted hidden h-10 items-center gap-2 rounded-lg border px-3 text-xs font-bold transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 md:flex"
                            >
                                <LogOut size={14} />
                                Sign out
                            </button>
                        </div>
                    </div>

                    <div className="atlas-school-divider mt-1.5 flex min-h-9 min-w-0 items-center gap-2 border-t pt-1.5">
                        <span className="atlas-text-subtle hidden shrink-0 px-1 text-[9px] font-black uppercase lg:block">Open pages</span>
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
