import React from 'react';
import { LayoutDashboard, Users, School, BookOpen, Wallet, CalendarCheck, Wrench, Settings, ClipboardCheck, Briefcase, Megaphone, TrendingDown, Brain, Camera, Hammer, Car, Archive, Activity } from 'lucide-react';
import { AtlasAppId, AtlasAudience, AtlasModuleDefinition, AtlasPlanId, AtlasProductArea, AtlasTenantAccess, ViewState } from '../types';

export interface ModuleConfig extends Omit<AtlasModuleDefinition, 'id' | 'label' | 'description' | 'category' | 'requiredPermission'> {
    id: ViewState;
    label: string;
    icon: React.ElementType;
    enabled: boolean;
    description?: string;
    color: string;
    requiredPermission?: string;
    category?: AtlasModuleDefinition['category'];
    appId: AtlasAppId;
    productArea: AtlasProductArea;
    audience: AtlasAudience[];
    enabledByDefault: boolean;
    requiredPlan?: AtlasPlanId;
    dependencies?: string[];
}

const coreAudience: AtlasAudience[] = ['admin', 'staff'];

// This registry controls which modules are available to Atlas tenants.
// `enabled` keeps backward compatibility with the current UI; SaaS access should also check tenant modules, plans, and permissions.
export const MODULES: ModuleConfig[] = [
    { id: 'dashboard', appId: 'edufy-core', productArea: 'core', audience: coreAudience, enabledByDefault: true, label: 'Dashboard', icon: LayoutDashboard, enabled: true, color: 'blue', requiredPermission: 'dashboard.view', category: 'dashboard' },
    { id: 'classes', appId: 'edufy-core', productArea: 'core', audience: coreAudience, enabledByDefault: true, label: 'Classes', icon: School, enabled: true, color: 'indigo', requiredPermission: 'classes.view', category: 'academic', dependencies: ['programs', 'students'] },
    { id: 'students', appId: 'edufy-core', productArea: 'core', audience: coreAudience, enabledByDefault: true, label: 'Students', icon: Users, enabled: true, color: 'cyan', requiredPermission: 'students.view', category: 'academic' },
    { id: 'attendance', appId: 'edufy-core', productArea: 'core', audience: coreAudience, enabledByDefault: true, label: 'Attendance', icon: ClipboardCheck, enabled: true, color: 'red', requiredPermission: 'attendance.manage', category: 'academic', dependencies: ['students', 'classes'] },
    { id: 'programs', appId: 'edufy-core', productArea: 'core', audience: coreAudience, enabledByDefault: true, label: 'Programs', icon: BookOpen, enabled: true, color: 'violet', requiredPermission: 'programs.manage', category: 'academic' },
    { id: 'learning', appId: 'sparkquest', productArea: 'kids_lms', audience: ['admin', 'staff', 'student'], enabledByDefault: false, label: 'Learning & Portfolio', icon: Brain, enabled: false, description: 'LMS, Projects & Student Portfolios', color: 'cyan', requiredPermission: 'learning.view', category: 'learning', dependencies: ['students', 'programs'] },
    { id: 'workshop-quality', appId: 'edufy-core', productArea: 'core', audience: coreAudience, enabledByDefault: true, label: 'Workshop Quality', icon: Activity, enabled: true, description: 'AI Pedagogical Assessment', color: 'indigo', requiredPermission: 'workshops.manage', category: 'academic', dependencies: ['workshops'] },

    { id: 'schedule', appId: 'edufy-core', productArea: 'core', audience: coreAudience, enabledByDefault: true, label: 'Global Schedule', icon: CalendarCheck, enabled: true, description: 'Weekly Activity View', color: 'blue', requiredPermission: 'dashboard.view', category: 'academic', dependencies: ['classes', 'workshops'] },
    { id: 'finance', appId: 'edufy-core', productArea: 'core', audience: coreAudience, enabledByDefault: true, label: 'Finance', icon: Wallet, enabled: true, color: 'emerald', requiredPermission: 'finance.view', category: 'business', dependencies: ['students', 'enrollments'] },
    { id: 'expenses', appId: 'edufy-core', productArea: 'core', audience: coreAudience, enabledByDefault: true, label: 'Expenses', icon: TrendingDown, enabled: true, color: 'rose', requiredPermission: 'expenses.view', category: 'business', dependencies: ['finance'] },
    { id: 'marketing', appId: 'edufy-core', productArea: 'core', audience: coreAudience, enabledByDefault: true, label: 'Marketing & CRM', icon: Megaphone, enabled: true, description: 'Campaigns, Social Media, Leads', color: 'purple', requiredPermission: 'marketing.view', category: 'business' },
    { id: 'workshops', appId: 'edufy-core', productArea: 'core', audience: coreAudience, enabledByDefault: true, label: 'Workshops', icon: CalendarCheck, enabled: true, description: 'Event scheduling & Public Booking', color: 'pink', requiredPermission: 'workshops.manage', category: 'business', dependencies: ['marketing'] },
    { id: 'pickup', appId: 'edufy-core', productArea: 'core', audience: ['admin', 'staff', 'parent'], enabledByDefault: true, label: 'Pickup Status', icon: Car, enabled: true, description: 'Real-time Parent Arrival', color: 'emerald', requiredPermission: 'pickup.view', category: 'business', dependencies: ['students'] },
    { id: 'communications', appId: 'edufy-core', productArea: 'core', audience: coreAudience, enabledByDefault: true, label: 'Communications', icon: Megaphone, enabled: true, description: 'News, Holidays & WhatsApp', color: 'blue', requiredPermission: 'marketing.view', category: 'business', dependencies: ['students', 'programs'] },

    { id: 'team', appId: 'edufy-core', productArea: 'core', audience: coreAudience, enabledByDefault: true, label: 'Team & Projects', icon: Briefcase, enabled: true, description: 'Tasks, Chat, Employee Management', color: 'orange', requiredPermission: 'team.view', category: 'organization' },
    { id: 'staff-attendance', appId: 'edufy-core', productArea: 'core', audience: coreAudience, enabledByDefault: true, label: 'Staff Attendance', icon: ClipboardCheck, enabled: true, description: 'Manage Team Presence & Absences', color: 'red', requiredPermission: 'team.view', category: 'organization', dependencies: ['team'] },
    { id: 'media', appId: 'edufy-core', productArea: 'core', audience: ['admin', 'staff', 'student', 'parent'], enabledByDefault: true, label: 'Gallery', icon: Camera, enabled: true, description: 'Photos & Media Gallery', color: 'pink', requiredPermission: 'media.view', category: 'organization' },
    { id: 'toolkit', appId: 'edufy-core', productArea: 'core', audience: ['admin', 'staff', 'student', 'adultLearner'], enabledByDefault: false, label: 'Toolkit', icon: Hammer, enabled: false, description: 'Software, Resources & Tools', color: 'amber', requiredPermission: 'toolkit.view', category: 'organization' },
    { id: 'archive', appId: 'edufy-core', productArea: 'core', audience: coreAudience, enabledByDefault: true, label: 'Archive', icon: Archive, enabled: true, description: 'Useful Links & Resources', color: 'purple', requiredPermission: 'toolkit.view', category: 'organization' },

    { id: 'tools', appId: 'edufy-core', productArea: 'platform', audience: ['admin'], enabledByDefault: true, label: 'Admin Tools', icon: Wrench, enabled: true, color: 'amber', requiredPermission: 'settings.manage', category: 'system' },
    { id: 'settings', appId: 'edufy-core', productArea: 'platform', audience: ['admin', 'staff'], enabledByDefault: true, label: 'Settings', icon: Settings, enabled: true, color: 'slate', requiredPermission: 'settings.view', category: 'system' }
];

export const getEnabledModules = () => MODULES.filter(m => m.enabled);

export const getModulesForTenant = (access?: AtlasTenantAccess) => {
    return getEnabledModules().filter(module => {
        if (!access) return module.enabledByDefault;
        const moduleFlag = access.enabledModules?.[module.id];
        const appFlag = access.installedApps?.includes(module.appId);
        const allowedByModuleFlag = moduleFlag ?? module.enabledByDefault;
        const allowedByApp = module.appId === 'edufy-core' || appFlag || access.enabledModules?.[module.appId];

        return allowedByModuleFlag && allowedByApp;
    });
};

export const getModuleById = (id: ViewState) => MODULES.find(module => module.id === id);
