import React, { useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
    Activity,
    ArrowRight,
    Building2,
    CalendarDays,
    CheckCircle2,
    CheckSquare,
    ChevronRight,
    ClipboardCheck,
    CreditCard,
    DollarSign,
    MessageCircle,
    Rocket,
    Sparkles,
    UserPlus,
    Users
} from 'lucide-react';
import {
    EducationButton,
    EducationKicker,
    EducationProgress,
    EducationSectionHeader,
    EducationSurface
} from '../../components/education-ui/EducationPrimitives';
import './education-dashboard-v1.css';

type DashboardScheduleItem = {
    time: string;
    title: string;
    type: string;
    count: number;
    capacity?: number;
};

type DashboardTask = {
    id: string;
    title: string;
    dueDate?: any;
};

type DashboardAlert = {
    count: number;
    label: string;
    subLabel: string;
    route: string;
    params?: Record<string, unknown>;
    icon: LucideIcon;
};

type DashboardBirthday = {
    id: string;
    name: string;
    daysUntilBirthday?: number;
};

type ChartPoint = {
    month: string;
    value: number;
};

export interface EducationDashboardV1Props {
    greeting: string;
    firstName: string;
    academyName: string;
    todayLabel: string;
    selectedSession: string;
    availableSessions: string[];
    activeStudentsCount: number;
    newStudentsThisMonth: number;
    todayAttendanceRate: number;
    todaySchedule: DashboardScheduleItem[];
    financialStats: {
        chartData: ChartPoint[];
        maxRevenue: number;
        totalRevenue: number;
    };
    totalActiveAlerts: number;
    checksToDeposit: number;
    pendingTransfers: number;
    myTasks: DashboardTask[];
    actionAlerts: DashboardAlert[];
    dataQualityScore: number;
    incompleteStudentsCount: number;
    conversionRate: number;
    newLeads: number;
    actionHealth: number;
    alertHealth: number;
    upcomingBirthdays: DashboardBirthday[];
    formatCurrency: (amount: number) => string;
    onSessionChange: (session: string) => void;
    onRecordPayment: () => void;
    navigateTo: (route: any, params?: any) => void;
    workshopActionCenter: React.ReactNode;
}

type PriorityAction = {
    key: string;
    title: string;
    detail: string;
    route: string;
    params?: Record<string, unknown>;
    icon: LucideIcon;
    tone: 'warm' | 'lilac' | 'brand' | 'neutral';
};

const MetricCard = ({
    label,
    value,
    note,
    icon: Icon,
    role,
    onClick,
    decorative = false
}: {
    label: string;
    value: React.ReactNode;
    note: React.ReactNode;
    icon: LucideIcon;
    role: 'neutral' | 'brand' | 'ink';
    onClick: () => void;
    decorative?: boolean;
}) => (
    <button type="button" className="edu-dashboard-v1__metric" data-edu-surface={role} onClick={onClick}>
        <span className="edu-dashboard-v1__metric-icon"><Icon size={18} aria-hidden="true" /></span>
        <span className="edu-dashboard-v1__metric-label">{label}</span>
        <strong>{value}</strong>
        <span className="edu-dashboard-v1__metric-note">{note}</span>
        {decorative && <span className="edu-dashboard-v1__contour" aria-hidden="true" />}
    </button>
);

const getScheduleTone = (type: string) => {
    if (type === 'workshop') return 'warm';
    if (type === 'diy') return 'lilac';
    return 'brand';
};

export const EducationDashboardV1 = ({
    greeting,
    firstName,
    academyName,
    todayLabel,
    selectedSession,
    availableSessions,
    activeStudentsCount,
    newStudentsThisMonth,
    todayAttendanceRate,
    todaySchedule,
    financialStats,
    totalActiveAlerts,
    checksToDeposit,
    pendingTransfers,
    myTasks,
    actionAlerts,
    dataQualityScore,
    incompleteStudentsCount,
    conversionRate,
    newLeads,
    actionHealth,
    alertHealth,
    upcomingBirthdays,
    formatCurrency,
    onSessionChange,
    onRecordPayment,
    navigateTo,
    workshopActionCenter
}: EducationDashboardV1Props) => {
    const priorityActions = useMemo<PriorityAction[]>(() => {
        const actions: PriorityAction[] = [];

        if (checksToDeposit > 0) {
            actions.push({
                key: 'checks',
                title: `Deposit ${checksToDeposit} ${checksToDeposit === 1 ? 'check' : 'checks'}`,
                detail: 'Received payments are waiting for deposit.',
                route: 'finance',
                params: { filter: 'check_received' },
                icon: Building2,
                tone: 'warm'
            });
        }

        if (pendingTransfers > 0) {
            actions.push({
                key: 'transfers',
                title: `Verify ${pendingTransfers} ${pendingTransfers === 1 ? 'transfer' : 'transfers'}`,
                detail: 'Confirm the funds before clearing balances.',
                route: 'finance',
                params: { filter: 'pending_verification' },
                icon: CreditCard,
                tone: 'lilac'
            });
        }

        myTasks.slice(0, 2).forEach(task => actions.push({
            key: `task-${task.id}`,
            title: task.title,
            detail: task.dueDate ? `Due ${new Date(task.dueDate).toLocaleDateString()}` : 'Assigned task · No due date',
            route: 'team',
            icon: CheckSquare,
            tone: 'neutral'
        }));

        actionAlerts.slice(0, 4).forEach((alert, index) => actions.push({
            key: `alert-${alert.route}-${index}`,
            title: `${alert.count} ${alert.label}`,
            detail: alert.subLabel,
            route: alert.route,
            params: alert.params,
            icon: alert.icon,
            tone: index % 2 === 0 ? 'brand' : 'warm'
        }));

        return actions.slice(0, 5);
    }, [actionAlerts, checksToDeposit, myTasks, pendingTransfers]);

    const operationsReadiness = Math.round((actionHealth + alertHealth + dataQualityScore + (todaySchedule.length > 0 ? todayAttendanceRate : 100)) / 4);
    const schedulePreview = todaySchedule.slice(0, 5);
    const hasSchoolDay = schedulePreview.length > 0;
    const nextSession = schedulePreview[0];

    return (
        <div className="edu-v1 edu-dashboard-v1" data-testid="education-dashboard-v1">
            <header className="edu-dashboard-v1__welcome">
                <div className="edu-dashboard-v1__welcome-copy">
                    <div className="edu-dashboard-v1__context-row">
                        <span className="edu-dashboard-v1__live-dot" aria-hidden="true" />
                        <EducationKicker>{todayLabel}</EducationKicker>
                        <label className="edu-dashboard-v1__session">
                            <span className="sr-only">Academic session</span>
                            <select value={selectedSession} onChange={event => onSessionChange(event.target.value)}>
                                {availableSessions.map(session => <option key={session} value={session}>{session}</option>)}
                            </select>
                            <ChevronRight size={13} aria-hidden="true" />
                        </label>
                    </div>
                    <h1>{greeting}, {firstName}.</h1>
                    <p>{hasSchoolDay
                        ? `${academyName} has ${todaySchedule.length} ${todaySchedule.length === 1 ? 'session' : 'sessions'} today. ${totalActiveAlerts > 0 ? `${totalActiveAlerts} follow-ups need attention.` : 'Nothing urgent is waiting.'}`
                        : `${academyName} has a clear schedule today. Use the time to close open follow-ups and prepare the next school day.`}
                    </p>
                </div>
                <div className="edu-dashboard-v1__quick-actions" aria-label="Dashboard quick actions">
                    <EducationButton variant="primary" icon={CreditCard} onClick={onRecordPayment}>Record payment</EducationButton>
                    <EducationButton icon={UserPlus} onClick={() => navigateTo('students')}>Add student</EducationButton>
                    <EducationButton variant="quiet" icon={MessageCircle} onClick={() => navigateTo('communications')}>Message families</EducationButton>
                </div>
            </header>

            <section className="edu-dashboard-v1__metrics" aria-label="Academy overview">
                <MetricCard
                    label="Active students"
                    value={activeStudentsCount}
                    note={<><b>+{newStudentsThisMonth}</b> this month</>}
                    icon={Users}
                    role="brand"
                    decorative
                    onClick={() => navigateTo('students')}
                />
                <MetricCard
                    label="Today’s attendance"
                    value={hasSchoolDay ? `${todayAttendanceRate}%` : 'Clear'}
                    note={hasSchoolDay ? `${todaySchedule.length} scheduled sessions` : 'No sessions scheduled'}
                    icon={ClipboardCheck}
                    role="neutral"
                    onClick={() => navigateTo('attendance')}
                />
                <MetricCard
                    label="Payments received"
                    value={formatCurrency(financialStats.totalRevenue)}
                    note={`${selectedSession} · verified payments`}
                    icon={DollarSign}
                    role="ink"
                    onClick={() => navigateTo('finance')}
                />
            </section>

            <section className="edu-dashboard-v1__command-grid" aria-label="Today’s command center">
                <EducationSurface className="edu-dashboard-v1__school-day">
                    <EducationSectionHeader
                        eyebrow="The school day"
                        title="Where learners and staff need to be"
                        description={nextSession ? `The first visible session starts at ${nextSession.time}. Attendance stays one action away.` : 'No class or workshop is scheduled for today.'}
                        action={<EducationButton variant="secondary" icon={ClipboardCheck} onClick={() => navigateTo('attendance')}>Open attendance</EducationButton>}
                    />

                    {hasSchoolDay ? (
                        <div className="edu-dashboard-v1__dayline">
                            {schedulePreview.map((item, index) => {
                                const Icon = item.type === 'workshop' ? Rocket : item.type === 'diy' ? Sparkles : CalendarDays;
                                return (
                                    <button key={`${item.time}-${item.title}-${index}`} type="button" className="edu-dashboard-v1__session-row" onClick={() => navigateTo(item.type === 'workshop' ? 'workshops' : 'attendance')}>
                                        <time>{item.time || 'TBD'}</time>
                                        <span className="edu-dashboard-v1__dayline-marker" data-tone={getScheduleTone(item.type)}><Icon size={16} aria-hidden="true" /></span>
                                        <span className="edu-dashboard-v1__session-copy">
                                            <strong>{item.title}</strong>
                                            <small>{item.count} {item.count === 1 ? 'student' : 'students'} · {item.type === 'workshop' ? 'Workshop' : item.type === 'diy' ? 'Open studio' : 'Class'}</small>
                                        </span>
                                        {item.capacity ? <span className="edu-dashboard-v1__capacity">{item.count}/{item.capacity}</span> : <span className="edu-dashboard-v1__capacity">Roster ready</span>}
                                        <ChevronRight size={16} aria-hidden="true" />
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="edu-dashboard-v1__clear-day">
                            <span><CalendarDays size={22} aria-hidden="true" /></span>
                            <div><strong>The school day is clear</strong><p>Review upcoming programs or use the action queue to close outstanding work.</p></div>
                            <EducationButton icon={ArrowRight} onClick={() => navigateTo('programs')}>Review programs</EducationButton>
                        </div>
                    )}
                </EducationSurface>

                <EducationSurface role="warm" className="edu-dashboard-v1__priorities">
                    <EducationSectionHeader
                        eyebrow="Your attention"
                        title={priorityActions.length > 0 ? `${totalActiveAlerts} open follow-ups` : 'You’re caught up'}
                        description="Only work that can move forward from here appears in this queue."
                    />
                    <div className="edu-dashboard-v1__priority-list">
                        {priorityActions.length > 0 ? priorityActions.map(action => {
                            const Icon = action.icon;
                            return (
                                <button key={action.key} type="button" onClick={() => navigateTo(action.route, action.params)}>
                                    <span data-tone={action.tone}><Icon size={16} aria-hidden="true" /></span>
                                    <span><strong>{action.title}</strong><small>{action.detail}</small></span>
                                    <ChevronRight size={16} aria-hidden="true" />
                                </button>
                            );
                        }) : (
                            <div className="edu-dashboard-v1__caught-up"><CheckCircle2 size={24} aria-hidden="true" /><strong>No decisions are waiting</strong><p>Your payment, task, and operational queues are clear.</p></div>
                        )}
                    </div>
                </EducationSurface>
            </section>

            <section className="edu-dashboard-v1__insights-grid" aria-label="Academy health and finance">
                <EducationSurface className="edu-dashboard-v1__finance">
                    <EducationSectionHeader
                        eyebrow="Collections"
                        title={`${formatCurrency(financialStats.totalRevenue)} received`}
                        description={`Verified payment activity across the last six months of ${selectedSession}.`}
                        action={<EducationButton variant="quiet" icon={ArrowRight} onClick={() => navigateTo('finance')}>View finance</EducationButton>}
                    />
                    <div className="edu-dashboard-v1__finance-chart" aria-label={`Payment history. ${financialStats.chartData.map(point => `${point.month}: ${formatCurrency(point.value)}`).join(', ')}`}>
                        {financialStats.chartData.map((point, index) => {
                            const height = Math.max(8, (point.value / (financialStats.maxRevenue || 1)) * 100);
                            return (
                                <button key={`${point.month}-${index}`} type="button" title={`${point.month}: ${formatCurrency(point.value)}`} onClick={() => navigateTo('finance')}>
                                    <span>{formatCurrency(point.value)}</span>
                                    <i><u style={{ '--edu-bar-height': `${height}%` } as CSSProperties} /></i>
                                    <b>{point.month}</b>
                                </button>
                            );
                        })}
                    </div>
                    <div className="edu-dashboard-v1__finance-actions">
                        <button type="button" onClick={() => navigateTo('finance', { filter: 'check_received' })}><Building2 size={17} aria-hidden="true" /><span><strong>{checksToDeposit}</strong><small>Checks to deposit</small></span></button>
                        <button type="button" onClick={() => navigateTo('finance', { filter: 'pending_verification' })}><CreditCard size={17} aria-hidden="true" /><span><strong>{pendingTransfers}</strong><small>Transfers to verify</small></span></button>
                    </div>
                </EducationSurface>

                <EducationSurface role="brand-soft" className="edu-dashboard-v1__readiness">
                    <div className="edu-dashboard-v1__readiness-top"><span><Activity size={18} aria-hidden="true" /></span><b>{operationsReadiness >= 80 ? 'Healthy' : operationsReadiness >= 60 ? 'Watch' : 'Act now'}</b></div>
                    <EducationKicker>Operations readiness</EducationKicker>
                    <h3>{operationsReadiness}% ready</h3>
                    <p>Readiness combines attendance, open actions, alerts, and student record quality.</p>
                    <div className="edu-dashboard-v1__progress-list">
                        <EducationProgress label="Attendance" value={hasSchoolDay ? todayAttendanceRate : 100} onClick={() => navigateTo('attendance')} />
                        <EducationProgress label="Action queue" value={actionHealth} onClick={() => navigateTo('team')} />
                        <EducationProgress label="Student records" value={dataQualityScore} onClick={() => navigateTo('students')} />
                    </div>
                    <button type="button" className="edu-dashboard-v1__text-link" onClick={() => navigateTo('students')}>
                        Review {incompleteStudentsCount} incomplete {incompleteStudentsCount === 1 ? 'record' : 'records'} <ArrowRight size={15} aria-hidden="true" />
                    </button>
                    <span className="edu-dashboard-v1__readiness-contour" aria-hidden="true" />
                </EducationSurface>

                <EducationSurface role="ink" className="edu-dashboard-v1__community">
                    <div className="edu-dashboard-v1__community-heading"><span><Users size={18} aria-hidden="true" /></span><div><EducationKicker>School community</EducationKicker><h3>People and families</h3></div></div>
                    <button type="button" onClick={() => navigateTo('students')}><span><strong>Student records</strong><small>{incompleteStudentsCount} need attention</small></span><b>{dataQualityScore}%</b></button>
                    <button type="button" onClick={() => navigateTo('marketing')}><span><strong>New family interest</strong><small>{conversionRate}% current conversion</small></span><b>{newLeads}</b></button>
                    <div className="edu-dashboard-v1__birthdays">
                        <span><strong>Birthdays ahead</strong><small>Next 21 days</small></span>
                        <div>
                            {upcomingBirthdays.length > 0 ? upcomingBirthdays.map(student => (
                                <button key={student.id} type="button" title={`${student.name}${student.daysUntilBirthday === 0 ? ' · Today' : student.daysUntilBirthday ? ` · ${student.daysUntilBirthday} days` : ''}`} onClick={() => navigateTo('student-details', { studentId: student.id })}>{student.name.slice(0, 2).toUpperCase()}</button>
                            )) : <span className="edu-dashboard-v1__no-birthdays">None soon</span>}
                        </div>
                    </div>
                </EducationSurface>
            </section>

            <section className="edu-dashboard-v1__workshop">
                <div className="edu-dashboard-v1__workshop-intro">
                    <div><EducationKicker>Family journey</EducationKicker><h2>Workshop follow-up</h2><p>Keep every family moving from reminder to attendance and admission.</p></div>
                    <EducationButton variant="secondary" icon={ArrowRight} onClick={() => navigateTo('workshops')}>Open workshops</EducationButton>
                </div>
                <div className="edu-dashboard-v1__workshop-live">{workshopActionCenter}</div>
            </section>

            <footer className="edu-dashboard-v1__footer"><span>Education UI preview</span><span>Development only · Existing dashboard remains the fallback</span></footer>
        </div>
    );
};
