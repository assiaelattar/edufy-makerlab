import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { EducationField, EducationIcon, EducationStatusPill, EducationSurface } from '../education-ui/EducationPrimitives';
import type { EducationAccent, EducationStatus } from '../education-ui/EducationPrimitives';

export interface SettingsNavigationItem<SectionId extends string> {
  id: SectionId;
  label: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
  status?: EducationStatus;
}

interface SettingsNavigationProps<SectionId extends string> {
  items: SettingsNavigationItem<SectionId>[];
  activeId: SectionId;
  onChange: (id: SectionId) => void;
  mode?: 'responsive' | 'mobile' | 'desktop';
}

export const SettingsNavigation = <SectionId extends string>({ items, activeId, onChange, mode = 'responsive' }: SettingsNavigationProps<SectionId>) => {
  const renderItem = (item: SettingsNavigationItem<SectionId>) => {
    const Icon = item.icon;
    return <button key={item.id} type="button" onClick={() => onChange(item.id)} aria-current={item.id === activeId ? 'page' : undefined} className="edu-settings-nav-item">
      <Icon size={19} aria-hidden="true" />
      <span className="edu-settings-nav-item__copy"><strong>{item.label}</strong><small>{item.description}</small></span>
      {item.badge && <EducationStatusPill status={item.status || 'neutral'}>{item.badge}</EducationStatusPill>}
      {!item.badge && <ChevronRight size={15} aria-hidden="true" />}
    </button>;
  };
  return <>
    {mode !== 'desktop' && <nav aria-label="Settings categories" className="edu-settings-nav edu-settings-nav--mobile">{items.map(renderItem)}</nav>}
    {mode !== 'mobile' && <aside className="edu-settings-nav-wrap"><nav aria-label="Settings categories" className="edu-settings-nav edu-settings-nav--desktop">{items.map(renderItem)}</nav></aside>}
  </>;
};

interface SettingsPanelProps {
  title: string;
  description: string;
  icon: LucideIcon;
  children: React.ReactNode;
  actions?: React.ReactNode;
  status?: React.ReactNode;
  accent?: EducationAccent;
}

export const SettingsPanel = ({ title, description, icon, children, actions, status, accent = 'purple' }: SettingsPanelProps) => <EducationSurface className="edu-settings-panel">
  <header className="edu-settings-panel__header">
    <EducationIcon icon={icon} accent={accent} />
    <div className="edu-settings-panel__copy"><div className="edu-settings-panel__title"><h2>{title}</h2>{status}</div><p>{description}</p></div>
    {actions && <div className="edu-settings-panel__actions">{actions}</div>}
  </header>
  <div className="edu-settings-panel__body">{children}</div>
</EducationSurface>;

interface SettingsFieldProps { label: string; hint?: string; required?: boolean; children: React.ReactElement<any>; }
export const SettingsField = ({ label, hint, required, children }: SettingsFieldProps) => {
  if (['input', 'select', 'textarea'].includes(String(children.type))) {
    return <EducationField label={label} hint={hint}>{React.cloneElement(children, { required: required || children.props.required })}</EducationField>;
  }
  return <div className="edu-ds-field"><span className="edu-settings-field-label">{label}{required && ' *'}</span>{children}{hint && <small>{hint}</small>}</div>;
};

interface SettingsToggleProps { checked: boolean; onChange: () => void; label: string; description?: string; disabled?: boolean; tone?: 'teal' | 'amber'; }
export const SettingsToggle = ({ checked, onChange, label, description, disabled, tone = 'teal' }: SettingsToggleProps) => <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={onChange} className="edu-settings-toggle" data-tone={tone === 'amber' ? 'yellow' : 'blue'}>
  <span><strong>{label}</strong>{description && <small>{description}</small>}</span><span aria-hidden="true" className="edu-settings-toggle__track"><span /></span>
</button>;

interface SettingsMetricProps { label: string; value: React.ReactNode; detail?: string; icon: LucideIcon; }
export const SettingsMetric = ({ label, value, detail, icon: Icon }: SettingsMetricProps) => <div className="edu-settings-metric"><Icon size={19} aria-hidden="true" /><div><small>{label}</small><strong>{value}</strong>{detail && <span>{detail}</span>}</div></div>;

export const settingsInputClass = 'edu-settings-input';
