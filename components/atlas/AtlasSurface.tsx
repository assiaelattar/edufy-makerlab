import React from 'react';
import { LucideIcon } from 'lucide-react';

type AtlasTone = 'teal' | 'amber' | 'blue' | 'red' | 'emerald' | 'slate';

interface AtlasCommandHeaderProps {
    eyebrow: string;
    title: string;
    description?: string;
    icon: LucideIcon;
    badges?: React.ReactNode;
    actions?: React.ReactNode;
}

export const AtlasCommandHeader = ({
    eyebrow,
    title,
    description,
    icon: Icon,
    badges,
    actions
}: AtlasCommandHeaderProps) => (
    <div className="atlas-command-header atlas-surface-raised relative overflow-hidden border atlas-panel-border">
        <div className="atlas-command-header__signal" aria-hidden="true" />
        <div className="atlas-command-header__body flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
                <span className="atlas-command-header__icon atlas-accent-well flex h-12 w-12 shrink-0 items-center justify-center border">
                    <Icon size={22} />
                </span>
                <div className="min-w-0 pt-0.5">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span className="atlas-text-accent text-[10px] font-black uppercase tracking-[0.18em]">{eyebrow}</span>
                        {badges}
                    </div>
                    <h2 className="atlas-text-strong text-xl font-black leading-tight tracking-[-0.03em] sm:text-2xl md:text-3xl">
                        <span className="min-w-0 break-words">{title}</span>
                    </h2>
                    {description && <p className="atlas-text-muted mt-2 max-w-2xl text-sm leading-6">{description}</p>}
                </div>
            </div>
            {actions && <div className="atlas-command-header__actions flex w-full flex-wrap items-center gap-2 lg:w-auto">{actions}</div>}
        </div>
    </div>
);

interface AtlasSignalCardProps {
    label: string;
    value: React.ReactNode;
    detail?: React.ReactNode;
    icon: LucideIcon;
    tone?: AtlasTone;
    onClick?: () => void;
}

export const AtlasSignalCard = ({
    label,
    value,
    detail,
    icon: Icon,
    tone = 'slate',
    onClick
}: AtlasSignalCardProps) => {
    const Tag = onClick ? 'button' : 'div';

    return (
        <Tag
            type={onClick ? 'button' : undefined}
            onClick={onClick}
            data-atlas-tone={tone}
            className={`atlas-signal-card atlas-surface min-h-[126px] border p-4 text-left ${onClick ? 'atlas-signal-card--interactive' : ''}`}
        >
            <div className="mb-3 flex items-center justify-between">
                <span className="atlas-text-subtle text-[10px] font-bold uppercase tracking-wider">{label}</span>
                <span className="atlas-signal-icon-well flex h-9 w-9 items-center justify-center">
                    <Icon size={16} className="atlas-signal-icon" />
                </span>
            </div>
            <div className="atlas-text-strong text-xl font-black">{value}</div>
            {detail && <div className="atlas-signal-detail mt-1 text-xs">{detail}</div>}
        </Tag>
    );
};

interface AtlasEmptyStateProps {
    title: string;
    description?: string;
    icon?: LucideIcon;
    action?: React.ReactNode;
}

export const AtlasEmptyState = ({ title, description, icon: Icon, action }: AtlasEmptyStateProps) => (
    <div className="atlas-empty-state flex min-h-44 flex-col items-center justify-center border border-dashed p-6 text-center">
        {Icon && (
            <div className="atlas-muted-well mb-3 flex h-11 w-11 items-center justify-center border">
                <Icon size={20} />
            </div>
        )}
        <h3 className="atlas-text-strong text-sm font-black">{title}</h3>
        {description && <p className="atlas-text-subtle mt-1 max-w-md text-xs leading-5">{description}</p>}
        {action && <div className="mt-4">{action}</div>}
    </div>
);

interface AtlasSectionHeaderProps {
    title: string;
    description?: string;
    icon?: LucideIcon;
    meta?: React.ReactNode;
    actions?: React.ReactNode;
}

export const AtlasSectionHeader = ({ title, description, icon: Icon, meta, actions }: AtlasSectionHeaderProps) => (
    <div className="atlas-section-header flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
            <div className="flex items-center gap-2">
                {Icon && <Icon size={17} className="atlas-text-accent shrink-0" />}
                <h3 className="atlas-text-strong truncate text-base font-black">{title}</h3>
                {meta}
            </div>
            {description && <p className="atlas-text-subtle mt-1 text-xs leading-5">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
);

interface AtlasToolbarProps {
    children: React.ReactNode;
    leading?: React.ReactNode;
    trailing?: React.ReactNode;
    className?: string;
}

export const AtlasToolbar = ({ children, leading, trailing, className = '' }: AtlasToolbarProps) => (
    <div className={`atlas-toolbar atlas-surface-muted flex flex-col gap-3 border p-3 lg:flex-row lg:items-center ${className}`}>
        {leading && <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{leading}</div>}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>
        {trailing && <div className="flex flex-wrap items-center gap-2 lg:justify-end">{trailing}</div>}
    </div>
);

type AtlasActionVariant = 'primary' | 'secondary' | 'quiet' | 'danger';

interface AtlasActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon?: LucideIcon;
    variant?: AtlasActionVariant;
}

export const AtlasActionButton = ({
    icon: Icon,
    variant = 'secondary',
    className = '',
    children,
    type = 'button',
    ...props
}: AtlasActionButtonProps) => (
    <button
        {...props}
        type={type}
        data-atlas-variant={variant}
        className={`atlas-action inline-flex min-h-10 items-center justify-center gap-2 border px-4 py-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
        {Icon && <Icon size={16} />}
        {children}
    </button>
);
