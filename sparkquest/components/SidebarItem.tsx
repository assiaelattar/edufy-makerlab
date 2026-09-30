import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SidebarItemProps {
    onClick: () => void;
    title: string;
    subtitle: string;
    icon: LucideIcon;
    index: string;
    tone?: 'lime' | 'orange' | 'sun' | 'paper';
}

export const SidebarItem: React.FC<SidebarItemProps> = ({ onClick, title, subtitle, icon: Icon, index, tone = 'paper' }) => (
    <button type="button" onClick={onClick} className={`sq-kit-nav-item is-${tone}`}>
        <span className="sq-kit-nav-index">{index}</span>
        <span className="sq-kit-nav-icon" aria-hidden="true"><Icon size={20} /></span>
        <span className="sq-kit-nav-copy"><strong>{title}</strong><small>{subtitle}</small></span>
    </button>
);
