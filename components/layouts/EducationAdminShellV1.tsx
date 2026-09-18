import React from 'react';
import {
    Building2,
    ChevronRight,
    Command,
    Grid2X2,
    LogOut,
    Menu,
    PanelLeftClose,
    PanelLeftOpen,
    Rows3,
    Search,
    Settings2,
    ShieldCheck,
    ShoppingBag,
    Sparkles,
    Star,
    Eye,
    EyeOff,
    X
} from 'lucide-react';
import type { ModuleConfig } from '../../services/moduleRegistry';
import { getAppById } from '../../services/appRegistry';
import { NotificationDropdown } from '../NotificationDropdown';
import { Logo } from '../Logo';
import { AtlasWorkspaceTabs, type AtlasWorkspaceTab } from '../atlas/AtlasWorkspaceTabs';
import '../education-ui/education-ui-v1.css';
import '../education-ui/education-module-compat-v1.css';
import './education-admin-shell-v1.css';

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
    hiddenModuleIds: string[];
    setHiddenModuleIds: React.Dispatch<React.SetStateAction<string[]>>;
    favoriteModuleIds: string[];
    setFavoriteModuleIds: React.Dispatch<React.SetStateAction<string[]>>;
    workspaceTabs: AtlasWorkspaceTab[];
    onCloseWorkspaceTab: (id: string) => void;
    onReorderWorkspaceTabs: (activeId: string, overId: string) => void;
    moduleContentRef: React.RefObject<HTMLDivElement>;
    signOut: () => void;
    signOutLabel: string;
}

const categoryMeta: Record<string, { label: string; helper: string }> = {
    dashboard: { label: 'Today', helper: 'Run the school day' },
    academic: { label: 'School', helper: 'Learners and delivery' },
    learning: { label: 'Learning', helper: 'Projects and portfolios' },
    business: { label: 'Office', helper: 'Money and growth' },
    organization: { label: 'Team', helper: 'People and resources' },
    system: { label: 'Settings', helper: 'Workspace and access' }
};

const railModuleIds = ['dashboard', 'students', 'attendance', 'finance', 'settings'];
const contextualViewLabels: Record<string, string> = {
    'student-details': 'Student profile',
    'activity-details': 'Activity details',
    'app-details': 'App details'
};

const EducationNavItem = ({ module, active, onClick }: { module: ModuleConfig; active: boolean; onClick: () => void }) => {
    const Icon = module.icon;
    return (
        <button type="button" className="edu-shell-v1__nav-item" data-active={active} aria-current={active ? 'page' : undefined} onClick={onClick}>
            <span className="edu-shell-v1__nav-icon"><Icon size={17} strokeWidth={2.2} aria-hidden="true" /></span>
            <span><strong>{module.label}</strong>{module.description && <small>{module.description}</small>}</span>
            <ChevronRight size={15} aria-hidden="true" />
        </button>
    );
};

export const EducationAdminShellV1 = ({
    children,
    modules,
    visibleModules,
    favoriteModules,
    activeModule,
    currentView,
    currentViewLabel,
    navigateTo,
    tenantName,
    roleLabel,
    userName,
    userInitial,
    logoUrl,
    isPlatformWorkspace,
    isSuperAdmin,
    installedAppIds,
    moduleSearch,
    setModuleSearch,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    isNavigationEditorOpen,
    setIsNavigationEditorOpen,
    isSidebarCompact,
    setIsSidebarCompact,
    density,
    setDensity,
    hiddenModuleIds,
    setHiddenModuleIds,
    favoriteModuleIds,
    setFavoriteModuleIds,
    workspaceTabs,
    onCloseWorkspaceTab,
    onReorderWorkspaceTabs,
    moduleContentRef,
    signOut,
    signOutLabel
}: EducationAdminShellV1Props) => {
    const closeMenu = () => setIsMobileMenuOpen(false);
    const goTo = (id: string, params?: any) => {
        navigateTo(id, params);
        closeMenu();
    };
    const railModules = railModuleIds.map(id => modules.find(module => module.id === id)).filter((module): module is ModuleConfig => Boolean(module));
    const contextualCategory = currentView === 'student-details' ? 'academic' : currentView === 'activity-details' ? 'business' : 'dashboard';
    const activeCategory = currentView === 'saas-app'
        ? { label: 'More tools', helper: 'Installed apps' }
        : categoryMeta[activeModule?.category || contextualCategory] || { label: 'Workspace', helper: 'School operations' };
    const activeViewLabel = currentViewLabel
        || activeModule?.label
        || contextualViewLabels[currentView]
        || currentView.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

    return (
        <div className="edu-v1 edu-shell-v1" data-edu-density={density} data-testid="education-admin-shell-v1">
            {isMobileMenuOpen && <button type="button" className="edu-shell-v1__scrim" aria-label="Close navigation" onClick={closeMenu} />}

            <aside className="edu-shell-v1__sidebar" data-open={isMobileMenuOpen} data-compact={isSidebarCompact} aria-label="Main navigation">
                <div className="edu-shell-v1__drawer">
                    <div className="edu-shell-v1__drawer-head">
                        <div className="edu-shell-v1__brand-lockup">
                            <button type="button" className="edu-shell-v1__brandmark" aria-label="Open dashboard" onClick={() => goTo('dashboard')}>
                                {logoUrl ? <img src={logoUrl} alt="" /> : <Logo className="edu-shell-v1__logo" />}
                            </button>
                            <span><span className="edu-shell-v1__product">Edufy</span><strong>{tenantName}</strong></span>
                        </div>
                        <button type="button" aria-label="Close menu" onClick={closeMenu}><X size={19} /></button>
                    </div>

                    <div className="edu-shell-v1__workspace-card">
                        <span><Building2 size={15} />{isPlatformWorkspace ? 'Platform workspace' : 'School workspace'}</span>
                        <strong>{tenantName}</strong>
                        <small><ShieldCheck size={14} />Signed in as {roleLabel}</small>
                    </div>

                    <label className="edu-shell-v1__search">
                        <span className="sr-only">Find a page</span>
                        <Search size={17} aria-hidden="true" />
                        <input value={moduleSearch} onChange={event => setModuleSearch(event.target.value)} placeholder="Find a page" />
                        <Command size={15} aria-hidden="true" />
                    </label>

                    <div className="edu-shell-v1__drawer-actions">
                        <button type="button" onClick={() => setIsNavigationEditorOpen(true)}><Settings2 size={16} />Organize</button>
                        <button type="button" onClick={() => goTo('app-store')}><ShoppingBag size={16} />Add tools</button>
                    </div>

                    <nav className="edu-shell-v1__module-list" aria-label="Workspace modules">
                        {favoriteModules.length > 0 && (
                            <section>
                                <header><span>Favorites</span><Star size={14} fill="currentColor" /></header>
                                {favoriteModules.map(module => <EducationNavItem key={`favorite-${module.id}`} module={module} active={currentView === module.id} onClick={() => goTo(module.id)} />)}
                            </section>
                        )}

                        {Object.keys(categoryMeta).map(category => {
                            const categoryModules = visibleModules.filter(module => module.category === category && !favoriteModuleIds.includes(module.id));
                            if (categoryModules.length === 0) return null;
                            const meta = categoryMeta[category];
                            return (
                                <section key={category}>
                                    <header><span>{meta.label}<small>{meta.helper}</small></span><b>{categoryModules.length}</b></header>
                                    {categoryModules.map(module => <EducationNavItem key={module.id} module={module} active={currentView === module.id} onClick={() => goTo(module.id)} />)}
                                </section>
                            );
                        })}

                        {(installedAppIds.length > 0 || isSuperAdmin) && (
                            <section>
                                <header><span>More tools<small>Extensions and operator tools</small></span><Sparkles size={14} /></header>
                                {installedAppIds.map(appId => {
                                    const app = getAppById(appId);
                                    if (!app) return null;
                                    const Icon = app.icon;
                                    const active = currentView === 'saas-app' && (window as any).viewId === appId;
                                    return (
                                        <button key={app.id} type="button" className="edu-shell-v1__nav-item" data-active={active} onClick={() => goTo('saas-app', { appId: app.id })}>
                                            <span className="edu-shell-v1__nav-icon"><Icon size={17} aria-hidden="true" /></span><span><strong>{app.name}</strong><small>Installed workspace app</small></span><ChevronRight size={15} />
                                        </button>
                                    );
                                })}
                                {isSuperAdmin && (
                                    <button type="button" className="edu-shell-v1__nav-item" data-active={currentView === 'saas-admin'} onClick={() => goTo('saas-admin')}>
                                        <span className="edu-shell-v1__nav-icon"><Grid2X2 size={17} /></span><span><strong>Platform console</strong><small>Organizations and plans</small></span><ChevronRight size={15} />
                                    </button>
                                )}
                            </section>
                        )}
                    </nav>

                    <div className="edu-shell-v1__profile-card">
                        <span className="edu-shell-v1__avatar">{userInitial}</span>
                        <span><strong>{userName}</strong><small>{roleLabel}</small></span>
                        <button type="button" aria-label={signOutLabel} title={signOutLabel} onClick={signOut}><LogOut size={17} /></button>
                    </div>
                </div>

                {isNavigationEditorOpen && (
                    <div className="edu-shell-v1__editor" role="dialog" aria-modal="true" aria-labelledby="education-nav-editor-title">
                        <header>
                            <div><strong id="education-nav-editor-title">Organize your workspace</strong><small>Choose what stays visible and pin daily tools.</small></div>
                            <button type="button" aria-label="Close navigation settings" onClick={() => setIsNavigationEditorOpen(false)}><X size={19} /></button>
                        </header>
                        <p>Your plan and role decide which modules are available. These choices affect only your navigation.</p>
                        <div className="edu-shell-v1__editor-list">
                            {modules.map(module => {
                                const Icon = module.icon;
                                const hidden = hiddenModuleIds.includes(module.id);
                                const favorite = favoriteModuleIds.includes(module.id);
                                const essential = ['dashboard', 'settings'].includes(module.id);
                                return (
                                    <div key={module.id} data-hidden={hidden}>
                                        <span><Icon size={17} /><strong>{module.label}</strong></span>
                                        <button type="button" disabled={hidden} aria-label={`${favorite ? 'Remove' : 'Add'} ${module.label} ${favorite ? 'from' : 'to'} favorites`} onClick={() => setFavoriteModuleIds(previous => favorite ? previous.filter(id => id !== module.id) : [...previous, module.id])}><Star size={16} fill={favorite ? 'currentColor' : 'none'} /></button>
                                        <button type="button" disabled={essential} aria-label={`${hidden ? 'Show' : 'Hide'} ${module.label}`} onClick={() => setHiddenModuleIds(previous => hidden ? previous.filter(id => id !== module.id) : [...previous, module.id])}>{hidden ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                                    </div>
                                );
                            })}
                        </div>
                        <button type="button" className="edu-shell-v1__editor-done" onClick={() => setIsNavigationEditorOpen(false)}>Done</button>
                    </div>
                )}
            </aside>

            <main className="edu-shell-v1__main">
                <header className="edu-shell-v1__topbar">
                    <div className="edu-shell-v1__title-row">
                        <div className="edu-shell-v1__title">
                            <button type="button" className="edu-shell-v1__mobile-menu" aria-label="Open navigation" onClick={() => setIsMobileMenuOpen(true)}><Menu size={21} /></button>
                            <span className="edu-shell-v1__title-icon">{activeModule ? React.createElement(activeModule.icon, { size: 19, strokeWidth: 2.2 }) : <Grid2X2 size={19} />}</span>
                            <div><span>{tenantName}<ChevronRight size={13} />{activeCategory.label}</span><h1>{activeViewLabel}</h1></div>
                        </div>
                        {workspaceTabs.length > 0 && (
                            <div className="edu-shell-v1__workspace-tabs">
                                <span>Working set</span>
                                <AtlasWorkspaceTabs tabs={workspaceTabs} activeId={currentView} onActivate={id => navigateTo(id)} onClose={onCloseWorkspaceTab} onReorder={onReorderWorkspaceTabs} />
                            </div>
                        )}
                        <div className="edu-shell-v1__top-actions">
                            <button type="button" aria-label={isSidebarCompact ? 'Expand navigation' : 'Collapse navigation'} title={isSidebarCompact ? 'Expand navigation' : 'Collapse navigation'} onClick={() => setIsSidebarCompact(value => !value)}>{isSidebarCompact ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button>
                            <button type="button" data-active={density === 'compact'} aria-label={density === 'compact' ? 'Use comfortable spacing' : 'Use compact spacing'} title={density === 'compact' ? 'Use comfortable spacing' : 'Use compact spacing'} onClick={() => setDensity(value => value === 'compact' ? 'comfortable' : 'compact')}><Rows3 size={18} /></button>
                            <span className="edu-shell-v1__tenant-pill"><i />{tenantName}</span>
                            <div className="edu-shell-v1__desktop-notifications"><NotificationDropdown /></div>
                            <button type="button" className="edu-shell-v1__top-avatar" aria-label={`${userName}, ${roleLabel}`} title={`${userName} · ${roleLabel}`}>{userInitial}</button>
                        </div>
                    </div>
                </header>

                <div ref={moduleContentRef} className="edu-shell-v1__content custom-scrollbar" tabIndex={-1} aria-label={`${activeModule?.label || 'Workspace'} content`}>
                    <div className="edu-shell-v1__content-inner">{children}</div>
                </div>
            </main>

            <nav className="edu-shell-v1__mobile-nav" aria-label="Quick navigation">
                {railModules.slice(0, 4).map(module => {
                    const Icon = module.icon;
                    const active = currentView === module.id;
                    return <button key={module.id} type="button" data-active={active} aria-current={active ? 'page' : undefined} onClick={() => goTo(module.id)}><Icon size={20} /><span>{module.label}</span></button>;
                })}
                <button type="button" onClick={() => setIsMobileMenuOpen(true)}><Menu size={20} /><span>More</span></button>
            </nav>
        </div>
    );
};
