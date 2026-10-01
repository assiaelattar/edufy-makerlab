import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SidebarItemProps {
    onClick: () => void;
    title: string;
    subtitle: string;
    icon: LucideIcon;
    index: string;
    active?: boolean;
    tone?: 'lime' | 'orange' | 'sun' | 'paper';
}

export const SidebarItem: React.FC<SidebarItemProps> = ({ onClick, title, subtitle, icon: Icon, index, tone = 'paper', active = false }) => (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined} className={`sq-kit-nav-item is-${tone}${active ? ' is-active' : ''}`}>
        <span className="sq-kit-nav-index" aria-hidden="true">{index}</span>
        <span className="sq-kit-nav-icon" aria-hidden="true"><Icon size={24} /></span>
        <span className="sq-kit-nav-copy"><strong>{title}</strong><small>{subtitle}</small></span>
    </button>
);
