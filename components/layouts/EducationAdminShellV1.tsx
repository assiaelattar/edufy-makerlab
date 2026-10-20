import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Check, ChevronRight, Grid2X2, LogOut, Menu, Moon, Search, Settings2, ShoppingBag, Sparkles, Star, Sun, Eye, EyeOff, X } from 'lucide-react';
import type { ModuleConfig } from '../../services/moduleRegistry';
import { getAppById } from '../../services/appRegistry';
import { NotificationDropdown } from '../NotificationDropdown';
import { Logo } from '../Logo';
import '../education-ui/education-ui-v1.css';
import '../education-ui/education-system-v1.css';
import '../education-ui/education-module-compat-v1.css';
import './education-admin-shell-v1.css';
import './education-school-themes.css';
import './education-navigation-system-v1.css';
import './education-navigation-v2.css';

type Density = 'comfortable' | 'compact';
interface EducationAdminShellV1Props {
    children: React.ReactNode;
    modules: ModuleConfig[];
    visibleModules: ModuleConfig[];
    favoriteModules: ModuleConfig[];
    activeModule?: ModuleConfig;
    currentView: string;
    currentViewLabel?: string;
    navigateTo: (view: any, params?: any) => void;
    tenantName: string;
    roleLabel: string;
    userName: string;
    userInitial: string;
    logoUrl?: string;
    isPlatformWorkspace: boolean;
    isSuperAdmin: boolean;
    installedAppIds: string[];
    moduleSearch: string;
    setModuleSearch: React.Dispatch<React.SetStateAction<string>>;
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isNavigationEditorOpen: boolean;
    setIsNavigationEditorOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isSidebarCompact: boolean;
    setIsSidebarCompact: React.Dispatch<React.SetStateAction<boolean>>;
    density: Density;
    setDensity: React.Dispatch<React.SetStateAction<Density>>;
    theme: 'light' | 'dark';
    onThemeChange: (theme: 'light' | 'dark') => void;
    hiddenModuleIds: string[];
    setHiddenModuleIds: React.Dispatch<React.SetStateAction<string[]>>;
    favoriteModuleIds: string[];
    setFavoriteModuleIds: React.Dispatch<React.SetStateAction<string[]>>;
    recentModuleIds: string[];
    moduleContentRef: React.RefObject<HTMLDivElement>;
    signOut: () => void;
    signOutLabel: string;
}

export type NavigationGroupId = 'dashboard' | 'academic' | 'learning' | 'business' | 'organization' | 'system';
export type NavigationDestination = { id: string; label: string; icon: React.ElementType; group: NavigationGroupId; permission?: string; description?: string };
export type ModuleNavigationItem = { id: string; label: string; count?: number; status?: 'attention' | 'complete' };
export type NavigationContext = { moduleId: string; pageTitle?: string; breadcrumb?: Array<{ label: string; destination?: string }> };

const categoryMeta: Record<string, { label: string; helper: string }> = {
    dashboard: { label: 'Today', helper: 'Run the school day' },
    academic: { label: 'School', helper: 'Learners and delivery' },
    learning: { label: 'Learning', helper: 'Projects and portfolios' },
    business: { label: 'Office', helper: 'Money and growth' },
    organization: { label: 'Team', helper: 'People and resources' },
    system: { label: 'Settings', helper: 'Workspace and access' }
};
const defaultPinnedIds = ['students', 'programs', 'attendance', 'finance'];
const mobileDefaultIds = ['dashboard', 'students', 'programs', 'attendance'];
const contextualViewLabels: Record<string, string> = { 'student-details': 'Student profile', 'activity-details': 'Activity details', 'app-details': 'App details' };

const RailDestination = ({ module, active, onClick }: { module: ModuleConfig; active: boolean; onClick: () => void }) => {
    const Icon = module.icon;
    return <button type="button" className="edu-shell-v2__rail-item" data-active={active} aria-current={active ? 'page' : undefined} aria-label={module.label} title={module.label} onClick={onClick}><Icon size={22} strokeWidth={2.35} aria-hidden="true" /><span>{module.label}</span></button>;
};

const PanelDestination = ({ module, active, favorite, onNavigate, onFavorite }: { module: ModuleConfig; active: boolean; favorite: boolean; onNavigate: () => void; onFavorite: () => void }) => {
    const Icon = module.icon;
    return <div className="edu-shell-v2__panel-item" data-active={active}>
        <button type="button" onClick={onNavigate} aria-current={active ? 'page' : undefined}><span><Icon size={18} aria-hidden="true" /></span><span><strong>{module.label}</strong>{module.description && <small>{module.description}</small>}</span><ChevronRight size={16} aria-hidden="true" /></button>
        <button type="button" className="edu-shell-v2__favorite" aria-label={`${favorite ? 'Unpin' : 'Pin'} ${module.label}`} aria-pressed={favorite} onClick={onFavorite}><Star size={15} fill={favorite ? 'currentColor' : 'none'} /></button>
    </div>;
};

export const EducationAdminShellV1 = ({
    children, modules, visibleModules, favoriteModules, activeModule, currentView, currentViewLabel, navigateTo,
    tenantName, roleLabel, userName, userInitial, logoUrl, isPlatformWorkspace, isSuperAdmin, installedAppIds,
    moduleSearch, setModuleSearch, isMobileMenuOpen, setIsMobileMenuOpen, isNavigationEditorOpen,
    setIsNavigationEditorOpen, density, setDensity, theme, onThemeChange, hiddenModuleIds, setHiddenModuleIds,
    favoriteModuleIds, setFavoriteModuleIds, recentModuleIds, moduleContentRef, signOut, signOutLabel
}: EducationAdminShellV1Props) => {
    const [panelOpen, setPanelOpen] = useState(false);
    const [commandOpen, setCommandOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [commandQuery, setCommandQuery] = useState('');
    const [commandIndex, setCommandIndex] = useState(0);
    const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
    const panelTriggerRef = useRef<HTMLButtonElement>(null);
    const commandTriggerRef = useRef<HTMLButtonElement>(null);
    const panelSearchRef = useRef<HTMLInputElement>(null);
    const commandSearchRef = useRef<HTMLInputElement>(null);
    const nestedView = ['student-details', 'activity-details', 'app-details'].includes(currentView);

    const activeModuleId = activeModule?.id || (currentView === 'student-details' ? 'students' : currentView);
    const activeCategory = categoryMeta[activeModule?.category || (currentView === 'student-details' ? 'academic' : 'dashboard')] || { label: 'Workspace', helper: 'School operations' };
    const activeViewLabel = currentViewLabel || activeModule?.label || contextualViewLabels[currentView] || currentView.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    const recentModules = recentModuleIds.map(id => modules.find(module => module.id === id)).filter((module): module is ModuleConfig => Boolean(module) && module?.id !== activeModuleId).slice(0, 3);
    const defaultPinned = defaultPinnedIds.map(id => modules.find(module => module.id === id)).filter((module): module is ModuleConfig => Boolean(module));
    const pinnedModules = (favoriteModules.length ? favoriteModules : defaultPinned).filter(module => module.id !== 'dashboard').slice(0, 4);
    const dashboardModule = modules.find(module => module.id === 'dashboard');
    const mobileModules = mobileDefaultIds.map(id => modules.find(module => module.id === id)).filter((module): module is ModuleConfig => Boolean(module));
    const commandModules = useMemo(() => {
        const query = commandQuery.trim().toLowerCase();
        const ordered = [...recentModules, ...modules.filter(module => !recentModuleIds.includes(module.id))];
        const unique = ordered.filter((module, index) => ordered.findIndex(item => item.id === module.id) === index);
        return query ? unique.filter(module => [module.label, module.description, module.category].filter(Boolean).some(value => String(value).toLowerCase().includes(query))) : unique;
    }, [commandQuery, modules, recentModuleIds, recentModules]);

    useEffect(() => setCommandIndex(0), [commandQuery, commandOpen]);

    const closePanel = (restoreFocus = false) => { setPanelOpen(false); setIsMobileMenuOpen(false); if (restoreFocus) requestAnimationFrame(() => panelTriggerRef.current?.focus()); };
    const openPanel = () => { setProfileOpen(false); setPanelOpen(true); setIsMobileMenuOpen(true); requestAnimationFrame(() => panelSearchRef.current?.focus()); };
    const openCommand = () => { setPanelOpen(false); setIsMobileMenuOpen(false); setProfileOpen(false); setCommandOpen(true); setCommandQuery(''); setCommandIndex(0); requestAnimationFrame(() => commandSearchRef.current?.focus()); };
    const goTo = (id: string, params?: any) => { navigateTo(id, params); closePanel(); setCommandOpen(false); setProfileOpen(false); };
    const toggleFavorite = (id: string) => setFavoriteModuleIds(previous => previous.includes(id) ? previous.filter(item => item !== id) : previous.length >= 4 ? [...previous.slice(1), id] : [...previous, id]);
    const toggleGroup = (id: string) => setCollapsedGroups(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openCommand(); return; }
            if ((event.ctrlKey || event.metaKey) && event.key === '\\') { event.preventDefault(); openPanel(); return; }
            if (event.key !== 'Escape') return;
            if (commandOpen) { setCommandOpen(false); requestAnimationFrame(() => commandTriggerRef.current?.focus()); }
            else if (profileOpen) setProfileOpen(false);
            else if (panelOpen || isMobileMenuOpen) closePanel(true);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [commandOpen, isMobileMenuOpen, panelOpen, profileOpen]);

    const handleCommandKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (!commandModules.length) return;
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setCommandIndex(index => (index + 1) % commandModules.length);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setCommandIndex(index => (index - 1 + commandModules.length) % commandModules.length);
        } else if (event.key === 'Enter') {
            event.preventDefault();
            goTo(commandModules[Math.min(commandIndex, commandModules.length - 1)].id);
        }
    };

    return <div className="edu-v1 edu-shell-v1 edu-shell-v2" data-edu-system="1" data-nested-view={nestedView || undefined} data-edu-density={density} data-edu-theme={theme} data-testid="education-admin-shell-v1">
        <aside data-edu-system="1" className="edu-shell-v2__rail" aria-label="Primary navigation">
            <button type="button" className="edu-shell-v2__brand" aria-label="Open dashboard" onClick={() => goTo('dashboard')}>{logoUrl ? <img src={logoUrl} alt="" /> : <Logo />}</button>
            <nav aria-label="Pinned modules">{dashboardModule && <RailDestination module={dashboardModule} active={activeModuleId === dashboardModule.id} onClick={() => goTo(dashboardModule.id)} />}{pinnedModules.map(module => <RailDestination key={module.id} module={module} active={activeModuleId === module.id} onClick={() => goTo(module.id)} />)}</nav>
            <button ref={panelTriggerRef} type="button" className="edu-shell-v2__rail-item edu-shell-v2__all" data-active={panelOpen} aria-expanded={panelOpen} aria-controls="education-workspace-panel" onClick={() => panelOpen ? closePanel(true) : openPanel()}><Grid2X2 size={22} /><span>More</span></button>
            <div className="edu-shell-v2__rail-spacer" />
            <button ref={commandTriggerRef} type="button" className="edu-shell-v2__rail-item" aria-label="Search workspace" title="Search workspace (Ctrl K)" onClick={openCommand}><Search size={21} /><span>Search</span></button>
            <div className="edu-shell-v2__rail-notifications"><NotificationDropdown /></div>
            <button type="button" className="edu-shell-v2__avatar" aria-label={`${userName}, ${roleLabel}`} aria-expanded={profileOpen} onClick={() => setProfileOpen(value => !value)}>{userInitial}</button>
        </aside>

        {(panelOpen || isMobileMenuOpen) && <button type="button" className="edu-shell-v2__scrim" aria-label="Close navigation" onClick={() => closePanel(true)} />}
        <section id="education-workspace-panel" className="edu-shell-v2__panel" data-open={panelOpen || isMobileMenuOpen} role="dialog" aria-modal="true" aria-label="Workspace navigation">
            <header><div className="edu-shell-v2__workspace-identity"><span><Building2 size={17} /></span><div><small>{isPlatformWorkspace ? 'Platform workspace' : 'School workspace'}</small><strong>{tenantName}</strong></div></div><button type="button" aria-label="Close navigation" onClick={() => closePanel(true)}><X size={19} /></button></header>
            <label className="edu-shell-v2__search"><Search size={18} /><input ref={panelSearchRef} value={moduleSearch} onChange={event => setModuleSearch(event.target.value)} placeholder="Find a module" /><kbd>⌘ K</kbd></label>
            <div className="edu-shell-v2__panel-scroll custom-scrollbar">
                {!moduleSearch && recentModules.length > 0 && <section className="edu-shell-v2__group"><button type="button" className="edu-shell-v2__group-title" onClick={() => toggleGroup('recent')}><span>Recent</span><small>{recentModules.length}</small></button>{!collapsedGroups.includes('recent') && <div>{recentModules.map(module => <PanelDestination key={`recent-${module.id}`} module={module} active={activeModuleId === module.id} favorite={favoriteModuleIds.includes(module.id)} onNavigate={() => goTo(module.id)} onFavorite={() => toggleFavorite(module.id)} />)}</div>}</section>}
                {Object.keys(categoryMeta).map(category => {
                    const categoryModules = visibleModules.filter(module => module.category === category && module.id !== 'dashboard');
                    if (!categoryModules.length) return null;
                    const meta = categoryMeta[category];
                    return <section className="edu-shell-v2__group" key={category}><button type="button" className="edu-shell-v2__group-title" onClick={() => toggleGroup(category)}><span>{meta.label}<small>{meta.helper}</small></span><b>{categoryModules.length}</b></button>{!collapsedGroups.includes(category) && <div>{categoryModules.map(module => <PanelDestination key={module.id} module={module} active={activeModuleId === module.id} favorite={favoriteModuleIds.includes(module.id)} onNavigate={() => goTo(module.id)} onFavorite={() => toggleFavorite(module.id)} />)}</div>}</section>;
                })}
                {(installedAppIds.length > 0 || isSuperAdmin) && <section className="edu-shell-v2__group"><div className="edu-shell-v2__group-title"><span>More tools<small>Installed workspace apps</small></span><Sparkles size={16} /></div><div>{installedAppIds.map(appId => { const app = getAppById(appId); if (!app) return null; const Icon = app.icon; return <button key={app.id} type="button" className="edu-shell-v2__app" onClick={() => goTo('saas-app', { appId: app.id })}><Icon size={18} /><span>{app.name}</span><ChevronRight size={15} /></button>; })}{isSuperAdmin && <button type="button" className="edu-shell-v2__app" onClick={() => goTo('saas-admin')}><Grid2X2 size={18} /><span>Platform console</span><ChevronRight size={15} /></button>}</div></section>}
            </div>
            <footer><button type="button" onClick={() => setIsNavigationEditorOpen(true)}><Settings2 size={17} />Organize navigation</button><button type="button" onClick={() => goTo('app-store')}><ShoppingBag size={17} />Add tools</button></footer>
        </section>

        {profileOpen && <div className="edu-shell-v2__profile-menu" role="dialog" aria-label="Workspace and profile menu"><div><span className="edu-shell-v2__profile-avatar">{userInitial}</span><span><strong>{userName}</strong><small>{roleLabel}</small></span></div><button type="button" onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}{theme === 'light' ? 'Dark theme' : 'Light theme'}</button><button type="button" onClick={() => setDensity(value => value === 'compact' ? 'comfortable' : 'compact')}><Settings2 size={17} />{density === 'compact' ? 'Comfortable spacing' : 'Compact spacing'}</button><button type="button" onClick={signOut}><LogOut size={17} />{signOutLabel}</button></div>}

        <main className="edu-shell-v2__main"><header data-edu-system="1" className="edu-shell-v2__topbar" aria-label="Current workspace"><div className="edu-shell-v2__context"><button type="button" className="edu-shell-v2__mobile-menu" aria-label="Open navigation" onClick={openPanel}><Menu size={21} /></button><span>{activeModule ? React.createElement(activeModule.icon, { size: 19, strokeWidth: 2.25 }) : <Grid2X2 size={19} />}</span><div><small>{tenantName}<ChevronRight size={12} />{activeCategory.label}</small><strong>{activeViewLabel}</strong></div></div><div className="edu-shell-v2__top-actions"><button type="button" onClick={openCommand}><Search size={17} /><span>Search</span><kbd>⌘ K</kbd></button><div className="edu-shell-v2__top-notifications"><NotificationDropdown /></div><button type="button" className="edu-shell-v2__top-avatar" onClick={() => setProfileOpen(value => !value)} aria-label={`${userName}, ${roleLabel}`}>{userInitial}</button></div></header><div ref={moduleContentRef} className="edu-shell-v2__content custom-scrollbar" tabIndex={-1} aria-label={`${activeViewLabel} content`}><div className="edu-shell-v2__content-inner">{children}</div></div></main>

        {!nestedView && <nav data-edu-system="1" className="edu-shell-v2__mobile-nav" aria-label="Quick navigation">{mobileModules.map(module => <RailDestination key={`mobile-${module.id}`} module={module} active={activeModuleId === module.id} onClick={() => goTo(module.id)} />)}<button type="button" className="edu-shell-v2__rail-item" data-active={panelOpen} onClick={openPanel}><Menu size={21} /><span>More</span></button></nav>}

        {commandOpen && <div className="edu-shell-v2__command-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) { setCommandOpen(false); requestAnimationFrame(() => commandTriggerRef.current?.focus()); } }}><section className="edu-shell-v2__command" role="dialog" aria-modal="true" aria-labelledby="education-command-title"><header><Search size={20} /><input ref={commandSearchRef} value={commandQuery} onChange={event => setCommandQuery(event.target.value)} onKeyDown={handleCommandKeyDown} placeholder="Go to a module…" aria-label="Search modules" aria-activedescendant={commandModules.length ? `education-command-${commandModules[Math.min(commandIndex, commandModules.length - 1)].id}` : undefined} /><button type="button" onClick={() => setCommandOpen(false)} aria-label="Close command palette"><X size={18} /></button></header><div className="custom-scrollbar"><p id="education-command-title">{commandQuery ? 'Search results' : 'Recent and available modules'}</p>{commandModules.map((module, index) => { const Icon = module.icon; return <button id={`education-command-${module.id}`} key={module.id} type="button" data-active={index === commandIndex} onMouseEnter={() => setCommandIndex(index)} onClick={() => goTo(module.id)}><span><Icon size={19} /></span><span><strong>{module.label}</strong><small>{module.description || categoryMeta[module.category || 'dashboard']?.helper}</small></span>{recentModuleIds.includes(module.id) && <em>Recent</em>}</button>; })}{commandModules.length === 0 && <div className="edu-shell-v2__command-empty">No permitted module matches “{commandQuery}”.</div>}</div></section></div>}

        {isNavigationEditorOpen && <div className="edu-shell-v2__editor-backdrop"><section className="edu-shell-v2__editor" role="dialog" aria-modal="true" aria-labelledby="education-nav-editor-title"><header><div><strong id="education-nav-editor-title">Organize your workspace</strong><small>Pin up to four daily modules and hide distractions.</small></div><button type="button" onClick={() => setIsNavigationEditorOpen(false)} aria-label="Close navigation settings"><X size={19} /></button></header><div className="edu-shell-v2__editor-list custom-scrollbar">{modules.map(module => { const Icon = module.icon; const hidden = hiddenModuleIds.includes(module.id); const favorite = favoriteModuleIds.includes(module.id); const essential = module.id === 'dashboard' || module.id === 'settings'; return <div key={module.id} data-hidden={hidden}><span><Icon size={18} /><strong>{module.label}</strong></span><button type="button" disabled={hidden || (!favorite && favoriteModuleIds.length >= 4)} aria-label={`${favorite ? 'Unpin' : 'Pin'} ${module.label}`} onClick={() => toggleFavorite(module.id)}>{favorite && <Check size={14} />}<Star size={16} fill={favorite ? 'currentColor' : 'none'} /></button><button type="button" disabled={essential} aria-label={`${hidden ? 'Show' : 'Hide'} ${module.label}`} onClick={() => setHiddenModuleIds(previous => hidden ? previous.filter(id => id !== module.id) : [...previous, module.id])}>{hidden ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>; })}</div><button type="button" className="edu-shell-v2__editor-done" onClick={() => setIsNavigationEditorOpen(false)}>Done</button></section></div>}
    </div>;
};
