import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Check, ChevronRight } from 'lucide-react';

export interface SettingsNavigationItem<SectionId extends string> {
  id: SectionId;
  label: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
}

interface SettingsNavigationProps<SectionId extends string> {
  items: SettingsNavigationItem<SectionId>[];
  activeId: SectionId;
  onChange: (id: SectionId) => void;
  mode?: 'responsive' | 'mobile' | 'desktop';
}

export const SettingsNavigation = <SectionId extends string>({ items, activeId, onChange, mode = 'responsive' }: SettingsNavigationProps<SectionId>) => (
  <>
    {mode !== 'desktop' && <div className="no-scrollbar flex w-full gap-1.5 overflow-x-auto pb-1 lg:hidden">
      {items.map(item => {
        const Icon = item.icon;
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            aria-current={active ? 'page' : undefined}
            className={`flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 ${active ? 'border-teal-300/30 bg-teal-300/10 text-teal-100' : 'atlas-text-muted border-transparent bg-transparent hover:border-white/10 hover:bg-white/[0.035] hover:text-white'}`}
          >
            <Icon size={14} />
            {item.label}
            {item.badge && <span className="atlas-text-subtle text-[10px]">{item.badge}</span>}
          </button>
        );
      })}
    </div>}

    {mode !== 'mobile' && <aside className="hidden w-52 shrink-0 border-r border-white/[0.08] pr-4 lg:block">
      <nav aria-label="Settings sections" className="sticky top-28 space-y-0.5">
        {items.map(item => {
          const Icon = item.icon;
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`group relative flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 ${active ? 'bg-white/[0.055]' : 'hover:bg-white/[0.035]'}`}
            >
              {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-teal-300" />}
              <Icon size={16} className={active ? 'text-teal-200' : 'atlas-text-subtle group-hover:text-slate-300'} />
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-[13px] font-bold ${active ? 'atlas-text-strong' : 'atlas-text-muted'}`}>{item.label}</span>
                <span className="atlas-text-subtle mt-0.5 block truncate text-[10px] leading-4">{item.description}</span>
              </span>
              {item.badge ? <span className="atlas-text-subtle text-[10px] font-bold">{item.badge}</span> : <ChevronRight size={13} className={active ? 'text-teal-300' : 'text-slate-700'} />}
            </button>
          );
        })}
      </nav>
    </aside>}
  </>
);

interface SettingsPanelProps {
  title: string;
  description: string;
  icon: LucideIcon;
  children: React.ReactNode;
  actions?: React.ReactNode;
  status?: React.ReactNode;
}

export const SettingsPanel = ({ title, description, icon: Icon, children, actions, status }: SettingsPanelProps) => (
  <section className="atlas-settings-section border-t border-white/[0.08] py-6 first:border-t-0 first:pt-1">
    <div className="grid min-w-0 gap-5 xl:grid-cols-[184px_minmax(0,1fr)] xl:gap-8">
      <header className="min-w-0">
        <div className="flex items-start gap-2.5">
          <span className="atlas-accent-well mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border"><Icon size={14} /></span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="atlas-text-strong text-sm font-black leading-5">{title}</h2>
              {status}
            </div>
            <p className="atlas-text-subtle mt-1 text-[11px] leading-[1.55]">{description}</p>
          </div>
        </div>
        {actions && <div className="mt-3 flex flex-wrap items-center gap-2 pl-9">{actions}</div>}
      </header>
      <div className="min-w-0">{children}</div>
    </div>
  </section>
);

interface SettingsFieldProps {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}

export const SettingsField = ({ label, hint, required, children }: SettingsFieldProps) => (
  <label className="block min-w-0">
    <span className="atlas-text-muted mb-1.5 flex items-center gap-1 text-xs font-bold">
      {label}
      {required && <span className="text-rose-400">*</span>}
    </span>
    {children}
    {hint && <span className="atlas-text-subtle mt-1.5 block text-[11px] leading-4">{hint}</span>}
  </label>
);

interface SettingsToggleProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  description?: string;
  disabled?: boolean;
  tone?: 'teal' | 'amber';
}

export const SettingsToggle = ({ checked, onChange, label, description, disabled, tone = 'teal' }: SettingsToggleProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={onChange}
    className="group flex min-h-14 w-full items-center justify-between gap-4 border-y border-white/[0.08] py-3 text-left transition-colors hover:border-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 disabled:cursor-not-allowed disabled:opacity-50"
  >
    <span className="min-w-0">
      <span className="atlas-text-strong block text-sm font-bold">{label}</span>
      {description && <span className="atlas-text-subtle mt-0.5 block text-xs leading-5">{description}</span>}
    </span>
    <span className={`flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5 transition-colors ${checked ? tone === 'amber' ? 'border-amber-300/40 bg-amber-400/25' : 'border-teal-300/40 bg-teal-400/25' : 'border-white/10 bg-slate-950/70'}`}>
      <span className={`flex h-4 w-4 items-center justify-center rounded-full transition-transform ${checked ? `translate-x-4 ${tone === 'amber' ? 'bg-amber-300 text-slate-950' : 'bg-teal-300 text-slate-950'}` : 'translate-x-0 bg-slate-600 text-transparent'}`}>
        <Check size={11} strokeWidth={3} />
      </span>
    </span>
  </button>
);

interface SettingsMetricProps {
  label: string;
  value: React.ReactNode;
  detail?: string;
  icon: LucideIcon;
}

export const SettingsMetric = ({ label, value, detail, icon: Icon }: SettingsMetricProps) => (
  <div className="flex min-w-0 items-center gap-3 px-3 py-2.5">
    <span className="atlas-accent-well flex h-7 w-7 shrink-0 items-center justify-center rounded-md border">
      <Icon size={13} />
    </span>
    <div className="min-w-0">
      <span className="atlas-text-subtle block truncate text-[9px] font-bold uppercase tracking-normal">{label}</span>
      <div className="atlas-text-strong mt-0.5 truncate text-sm font-black capitalize">{value}</div>
      {detail && <p className="atlas-text-subtle truncate text-[10px]">{detail}</p>}
    </div>
  </div>
);

export const settingsInputClass = 'atlas-settings-input atlas-text-strong min-h-10 w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors placeholder:text-slate-600 disabled:cursor-not-allowed disabled:opacity-55';
