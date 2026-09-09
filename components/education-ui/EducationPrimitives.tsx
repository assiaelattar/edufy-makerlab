import React from 'react';
import type { LucideIcon } from 'lucide-react';
import './education-ui-v1.css';

export type EducationSurfaceRole = 'neutral' | 'brand' | 'brand-soft' | 'warm' | 'ink' | 'outline';

export const EducationSurface = ({
    children,
    role = 'neutral',
    className = ''
}: {
    children: React.ReactNode;
    role?: EducationSurfaceRole;
    className?: string;
}) => (
    <section className={`edu-v1-surface ${className}`} data-edu-surface={role}>
        {children}
    </section>
);

export const EducationButton = ({
    children,
    icon: Icon,
    variant = 'secondary',
    className = '',
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    icon?: LucideIcon;
    variant?: 'primary' | 'secondary' | 'quiet';
}) => (
    <button type="button" {...props} className={`edu-v1-button ${className}`} data-edu-variant={variant}>
        {Icon && <Icon size={16} aria-hidden="true" />}
        {children}
    </button>
);

export const EducationKicker = ({ children }: { children: React.ReactNode }) => (
    <span className="edu-v1-kicker">{children}</span>
);

export const EducationSectionHeader = ({
    eyebrow,
    title,
    description,
    action
}: {
    eyebrow: string;
    title: string;
    description?: string;
    action?: React.ReactNode;
}) => (
    <header className="edu-v1-section-header">
        <div>
            <EducationKicker>{eyebrow}</EducationKicker>
            <h3>{title}</h3>
            {description && <p>{description}</p>}
        </div>
        {action && <div className="edu-v1-section-header__action">{action}</div>}
    </header>
);

export const EducationProgress = ({
    label,
    value,
    onClick
}: {
    label: string;
    value: number;
    onClick?: () => void;
}) => {
    const boundedValue = Math.max(0, Math.min(100, value));
    const Tag = onClick ? 'button' : 'div';

    return (
        <Tag type={onClick ? 'button' : undefined} onClick={onClick} className="edu-v1-progress">
            <span><strong>{label}</strong><b>{boundedValue}%</b></span>
            <i aria-hidden="true"><u style={{ width: `${boundedValue}%` }} /></i>
            <span className="sr-only">{label}: {boundedValue} percent</span>
        </Tag>
    );
};
