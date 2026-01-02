
import React from 'react';
import { LayoutDashboard, Users, School, BookOpen, Wallet, CalendarCheck, Wrench, Settings, BarChart3, ClipboardCheck, Briefcase, Megaphone, TrendingDown, Brain, Camera, Hammer, Car } from 'lucide-react';
import { ViewState } from '../types';

export interface ModuleConfig {
    id: ViewState;
    label: string;
    icon: React.ElementType;
    enabled: boolean;
    description?: string;
    color: string;
    requiredPermission?: string;
    category?: 'dashboard' | 'academic' | 'business' | 'organization' | 'system';
}

// This registry controls which modules are active in the application.
// You can disable modules here to "turn them off".
export const MODULES: ModuleConfig[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, enabled: true, color: 'blue', requiredPermission: 'dashboard.view', category: 'dashboard' },
    { id: 'classes', label: 'Classes', icon: School, enabled: true, color: 'indigo', requiredPermission: 'classes.view', category: 'academic' },
    { id: 'students', label: 'Students', icon: Users, enabled: true, color: 'cyan', requiredPermission: 'students.view', category: 'academic' },
    { id: 'attendance', label: 'Attendance', icon: ClipboardCheck, enabled: true, color: 'red', requiredPermission: 'attendance.manage', category: 'academic' },
    { id: 'programs', label: 'Programs', icon: BookOpen, enabled: true, color: 'violet', requiredPermission: 'programs.manage', category: 'academic' },
    { id: 'learning', label: 'Learning & Portfolio', icon: Brain, enabled: false, description: 'LMS, Projects & Student Portfolios', color: 'cyan', requiredPermission: 'learning.view', category: 'academic' },

    { id: 'finance', label: 'Finance', icon: Wallet, enabled: true, color: 'emerald', requiredPermission: 'finance.view', category: 'business' },
    { id: 'expenses', label: 'Expenses', icon: TrendingDown, enabled: true, color: 'rose', requiredPermission: 'expenses.view', category: 'business' },
    { id: 'marketing', label: 'Marketing & CRM', icon: Megaphone, enabled: true, description: 'Campaigns, Social Media, Leads', color: 'purple', requiredPermission: 'marketing.view', category: 'business' },
    { id: 'workshops', label: 'Workshops', icon: CalendarCheck, enabled: true, description: 'Event scheduling & Public Booking', color: 'pink', requiredPermission: 'workshops.manage', category: 'business' },
    { id: 'pickup', label: 'Pickup Status', icon: Car, enabled: true, description: 'Real-time Parent Arrival', color: 'emerald', requiredPermission: 'pickup.view', category: 'business' },

    { id: 'team', label: 'Team & Projects', icon: Briefcase, enabled: true, description: 'Tasks, Chat, Employee Management', color: 'orange', requiredPermission: 'team.view', category: 'organization' },
    { id: 'media', label: 'Gallery', icon: Camera, enabled: true, description: 'Photos & Media Gallery', color: 'pink', requiredPermission: 'media.view', category: 'organization' },
    { id: 'toolkit', label: 'Toolkit', icon: Hammer, enabled: false, description: 'Software, Resources & Tools', color: 'amber', requiredPermission: 'toolkit.view', category: 'organization' },

    { id: 'tools', label: 'Admin Tools', icon: Wrench, enabled: true, color: 'amber', requiredPermission: 'settings.manage', category: 'system' },
    { id: 'settings', label: 'Settings', icon: Settings, enabled: true, color: 'slate', requiredPermission: 'settings.view', category: 'system' }
];

export const getEnabledModules = () => MODULES.filter(m => m.enabled);
