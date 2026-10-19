import React, { useId } from 'react';
import type { LucideIcon } from 'lucide-react';
import './education-ui-v1.css';
import './education-system-v1.css';

export type EducationAccent = 'green' | 'blue' | 'yellow' | 'orange' | 'purple' | 'red';
export type EducationStatus = 'neutral' | 'success' | 'info' | 'attention' | 'warning' | 'danger';
const statusAccent: Record<EducationStatus, EducationAccent> = { neutral:'blue', success:'green', info:'blue', attention:'yellow', warning:'orange', danger:'red' };

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
    status = 'neutral',
    className = '',
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    icon?: LucideIcon;
    variant?: 'primary' | 'secondary' | 'quiet';
    status?: EducationStatus;
}) => (
    <button type="button" {...props} className={`edu-v1-button edu-ds-button ${className}`} data-edu-variant={variant} data-edu-status={status}>
        {Icon && <Icon size={16} aria-hidden="true" />}
        {children}
    </button>
);

export const EducationIcon = ({ icon: Icon, accent = 'blue' }: { icon: LucideIcon; accent?: EducationAccent }) => <span className="edu-ds-icon" data-edu-accent={accent}><Icon size={22} aria-hidden="true" /></span>;
export const EducationBadge = ({ children, status = 'info', icon: Icon }: { children: React.ReactNode; status?: EducationStatus; icon?: LucideIcon }) => <span className="edu-ds-badge" data-edu-accent={statusAccent[status]}>{Icon && <Icon size={14} aria-hidden="true" />}{children}</span>;
export const EducationNotice = ({ children, status = 'info' }: { children: React.ReactNode; status?: EducationStatus }) => <div className="edu-ds-notice" data-edu-accent={statusAccent[status]} role={status === 'danger' ? 'alert' : 'status'}>{children}</div>;
export const EducationToolbar = ({ children, label }: { children: React.ReactNode; label: string }) => <div className="edu-ds-toolbar" role="group" aria-label={label}>{children}</div>;
export const EducationDetailPanel = ({ label, children, className='', ...props }: React.HTMLAttributes<HTMLElement> & {label:string}) => <aside {...props} aria-label={label} className={`edu-ds-detail-panel ${className}`}>{children}</aside>;
/** Native disclosure: actions remain ordinary tab stops rather than an incomplete ARIA menu. */
export const EducationActionMenu = ({ label='More actions', children }: {label?:string;children:React.ReactNode}) => <details className="edu-ds-action-menu" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))event.currentTarget.open=false;}} onKeyDown={event=>{if(event.key==='Escape'){event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus();}}} onClick={event=>{if((event.target as Element).closest('button')){event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus();}}}><summary>{label}</summary><div role="group" aria-label={label}>{children}</div></details>;
export const EducationTabs = ({ items, value, onChange, label }: { items: {id:string;label:string}[]; value:string; onChange:(id:string)=>void; label:string }) => <nav className="edu-ds-tabs" aria-label={label}>{items.map(item=><EducationButton key={item.id} aria-pressed={value===item.id} onClick={()=>onChange(item.id)}>{item.label}</EducationButton>)}</nav>;
export const EducationFormSection = ({ title, icon, accent = 'blue', children }: { title:string; icon:LucideIcon; accent?:EducationAccent; children:React.ReactNode }) => <fieldset className="edu-ds-form-section"><legend><EducationIcon icon={icon} accent={accent}/>{title}</legend><div className="edu-ds-field-grid">{children}</div></fieldset>;
export const EducationField = ({ label, hint, error, children }: { label:string; hint?:string; error?:string; children:React.ReactElement<any> }) => {
    const generatedId=useId(); const id=children.props.id || generatedId;
    return <div className="edu-ds-field"><label htmlFor={id}>{label}{children.props.required && <span aria-hidden="true"> *</span>}</label>{React.cloneElement(children,{id,'aria-invalid':error?true:undefined,'aria-describedby':[children.props['aria-describedby'],hint?`${id}-hint`:null,error?`${id}-error`:null].filter(Boolean).join(' ')||undefined})}{hint&&<small id={`${id}-hint`}>{hint}</small>}{error&&<small id={`${id}-error`} role="alert">{error}</small>}</div>;
};
export const EducationState = ({ title, description, kind='empty', children }: { title:string; description:string; kind?:'empty'|'loading'|'error'|'restricted'; children?:React.ReactNode }) => <section className="edu-ds-state" aria-busy={kind==='loading'} role={kind==='error'?'alert':'status'}><h3>{title}</h3><p>{description}</p>{children}</section>;

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
