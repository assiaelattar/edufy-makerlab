import React from 'react';
import type { LucideIcon } from 'lucide-react';

export const factoryButton = {
    primary: 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
    secondary: 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
    quiet: 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
    danger: 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-extrabold text-red-700 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2',
};

export const FactoryPage: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className = '' }) => (
    <div className={`mx-auto max-w-[1320px] space-y-6 p-4 pb-24 sm:p-7 md:pb-8 ${className}`}>
        {children}
    </div>
);

interface FactoryPageHeaderProps {
    eyebrow?: string;
    title: string;
    description: string;
    icon?: LucideIcon;
    actions?: React.ReactNode;
    meta?: React.ReactNode;
}

export const FactoryPageHeader: React.FC<FactoryPageHeaderProps> = ({
    eyebrow = 'Instructor studio',
    title,
    description,
    icon: Icon,
    actions,
    meta,
}) => (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="h-1 bg-gradient-to-r from-blue-600 via-sky-500 to-amber-400" />
        <div className="flex flex-col gap-5 px-5 py-6 sm:px-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">
                    {Icon && <Icon size={16} aria-hidden="true" />}
                    {eyebrow}
                </div>
                <h1 className="mt-2 text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">{description}</p>
                {meta && <div className="mt-4">{meta}</div>}
            </div>
            {actions && <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:justify-end">{actions}</div>}
        </div>
    </section>
);

export const FactoryToolbar: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className = '' }) => (
    <div className={`flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center ${className}`}>
        {children}
    </div>
);

interface FactoryEmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: React.ReactNode;
}

export const FactoryEmptyState: React.FC<FactoryEmptyStateProps> = ({ icon: Icon, title, description, action }) => (
    <div className="col-span-full flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-slate-500">
            <Icon size={24} aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-lg font-black text-slate-900">{title}</h2>
        <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">{description}</p>
        {action && <div className="mt-5">{action}</div>}
    </div>
);

export const FactoryStat: React.FC<{ label: string; value: React.ReactNode; tone?: 'blue' | 'green' | 'amber' | 'slate' }> = ({ label, value, tone = 'slate' }) => {
    const tones = {
        blue: 'border-blue-200 bg-blue-50 text-blue-800',
        green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        amber: 'border-amber-200 bg-amber-50 text-amber-900',
        slate: 'border-slate-200 bg-white text-slate-900',
    };
    return (
        <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-65">{label}</p>
            <p className="mt-1 text-2xl font-black tracking-tight">{value}</p>
        </div>
    );
};
