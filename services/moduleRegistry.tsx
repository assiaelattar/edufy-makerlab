
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
}

// This registry controls which modules are active in the application.
// You can disable modules here to "turn them off".
export const MODULES: ModuleConfig[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, enabled: true, color: 'blue', requiredPermission: 'dashboard.view' },
    { id: 'learning', label: 'Learning & Portfolio', icon: Brain, enabled: false, description: 'LMS, Projects & Student Portfolios', color: 'cyan', requiredPermission: 'learning.view' },
    { id: 'toolkit', label: 'Toolkit', icon: Hammer, enabled: false, description: 'Software, Resources & Tools', color: 'amber', requiredPermission: 'toolkit.view' },
    { id: 'media', label: 'Gallery', icon: Camera, enabled: true, description: 'Photos & Media Gallery', color: 'pink', requiredPermission: 'media.view' },
    { id: 'pickup', label: 'Pickup Status', icon: Car, enabled: true, description: 'Real-time Parent Arrival', color: 'emerald', requiredPermission: 'pickup.view' },
    { id: 'classes', label: 'Classes', icon: School, enabled: true, color: 'indigo', requiredPermission: 'classes.view' },
    { id: 'students', label: 'Students', icon: Users, enabled: true, color: 'cyan', requiredPermission: 'students.view' },
    { id: 'attendance', label: 'Attendance', icon: ClipboardCheck, enabled: true, color: 'red', requiredPermission: 'attendance.manage' },
    { id: 'workshops', label: 'Workshops', icon: CalendarCheck, enabled: true, description: 'Event scheduling & Public Booking', color: 'pink', requiredPermission: 'workshops.manage' },
    { id: 'team', label: 'Team & Projects', icon: Briefcase, enabled: true, description: 'Tasks, Chat, Employee Management', color: 'orange', requiredPermission: 'team.view' },
    { id: 'marketing', label: 'Marketing & CRM', icon: Megaphone, enabled: true, description: 'Campaigns, Social Media, Leads', color: 'purple', requiredPermission: 'marketing.view' },
    { id: 'programs', label: 'Programs', icon: BookOpen, enabled: true, color: 'violet', requiredPermission: 'programs.manage' },
    { id: 'finance', label: 'Finance', icon: Wallet, enabled: true, color: 'emerald', requiredPermission: 'finance.view' },
    { id: 'expenses', label: 'Expenses', icon: TrendingDown, enabled: true, color: 'rose', requiredPermission: 'expenses.view' },
    { id: 'tools', label: 'Admin Tools', icon: Wrench, enabled: true, color: 'amber', requiredPermission: 'settings.manage' },
    { id: 'settings', label: 'Settings', icon: Settings, enabled: true, color: 'slate', requiredPermission: 'settings.view' }
];

export const getEnabledModules = () => MODULES.filter(m => m.enabled);
