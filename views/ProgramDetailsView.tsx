import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { ArrowLeft, ArrowRight, Users, DollarSign, Clock, LayoutGrid, List, UserPlus, FileText, CheckCircle2, Printer, Link as LinkIcon, Copy, Tablet, Download, ExternalLink, BookOpen, Layers3, X, Pencil, AlertCircle, WalletCards, CalendarDays, Gauge, GraduationCap, ChevronDown } from 'lucide-react';
import { Program, Lead } from '../types';
import { formatCurrency } from '../utils/helpers';
import { useConfirm } from '../context/ConfirmContext';
import { useAuth } from '../context/AuthContext';
import { getProgramReadiness } from '../utils/program-readiness';
import { buildLegacyProgramOperationsPreview } from '../utils/programOperations';
import { ProgramOperationsPreviewPanel } from '../components/programs/ProgramOperationsPreview';
import {
    AtlasActionButton,
    AtlasCommandHeader,
    AtlasEmptyState,
    AtlasSectionHeader,
    AtlasSignalCard
} from '../components/atlas/AtlasSurface';

interface ProgramDetailsViewProps {
    onEnrollLead?: (lead: Lead) => void;
    programIdProp?: string; // NEW: For Modal usage
    onClose?: () => void; // NEW: For Modal usage
    onPrintProgram?: (program: Program) => void; // NEW: Print Trigger
    onEditProgram?: (program: Program) => void;
    onQuoteProgram?: (program: Program) => void;
    onOpenEnrollmentAccess?: (program: Program) => void;
}

type ProgramGroupWithCapacity = Program['grades'][number]['groups'][number] & {
    capacity?: number;
    maxStudents?: number;
};

export const ProgramDetailsView: React.FC<ProgramDetailsViewProps> = ({ onEnrollLead, programIdProp, onClose, onPrintProgram, onEditProgram, onQuoteProgram, onOpenEnrollmentAccess }) => {
    const { programs, viewParams, navigateTo, leads, enrollments, settings } = useAppContext();
    const { currentOrganization } = useAuth();
    const { alert: showAlert } = useConfirm();
    const [activeTab, setActiveTab] = useState<'operations' | 'overview' | 'classes' | 'students' | 'waiting-list' | 'financials' | 'resources'>('operations');
    const [linkCopied, setLinkCopied] = useState(false);
    const [expandedGradeIds, setExpandedGradeIds] = useState<string[]>([]);
    const workspaceRef = useRef<HTMLDivElement>(null);
    const baseUrl = window.location.origin;

    // Get the program (Prioritize Prop -> then URL Param)
    const targetId = programIdProp || viewParams.programId;
    const program = useMemo(() =>
        programs.find(p => p.id === targetId),
        [programs, targetId]
    );

    useEffect(() => {
        if (!program?.id) return;
        const workspace = workspaceRef.current;
        if (!workspace) return;

        const frame = window.requestAnimationFrame(() => {
            setActiveTab('operations');
            setExpandedGradeIds(program.grades?.length === 1 ? [program.grades[0].id] : []);
            workspace.scrollIntoView({ block: 'start' });
            workspace.focus({ preventScroll: true });
        });

        return () => window.cancelAnimationFrame(frame);
    }, [program?.id]);

    if (!program) {
        return (
            <AtlasEmptyState
                icon={BookOpen}
                title="Program not found"
                description={`The program ${targetId || ''} is unavailable or may have been archived.`}
                action={programIdProp
                    ? <AtlasActionButton icon={X} onClick={() => onClose?.()}>Close workspace</AtlasActionButton>
                    : <AtlasActionButton icon={ArrowLeft} onClick={() => navigateTo('programs')}>Back to programs</AtlasActionButton>}
            />
        );
    }

    // Derived Data
    const programLeads = leads.filter(l => l.organizationId === currentOrganization?.id && (l.programId === program.id || l.interests?.includes(program.name)) && l.status !== 'converted' && l.status !== 'closed');
    const programEnrollments = enrollments.filter(e => e.organizationId === currentOrganization?.id && e.programId === program.id && e.status === 'active' && (!e.session || e.session === settings.academicYear));
    const totalRevenue = programEnrollments.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
    const totalPaid = programEnrollments.reduce((sum, enrollment) => sum + (enrollment.paidAmount || 0), 0);
    const totalBalance = programEnrollments.reduce((sum, enrollment) => sum + (enrollment.balance || 0), 0);
    const programGrades = program.grades || [];
    const programReadiness = getProgramReadiness(program);
    const activeClassesCount = programGrades.reduce((sum, grade) => sum + (grade.groups?.length || 0), 0);
    const isEnrollmentReady = programReadiness.isReady;
    const groupOperations = programGrades.flatMap(grade => (grade.groups || []).map(rawGroup => {
        const group = rawGroup as ProgramGroupWithCapacity;
        const roster = programEnrollments.filter(enrollment => {
            if (enrollment.groupId) return enrollment.groupId === group.id;
            return enrollment.groupName === group.name && (!enrollment.gradeId || enrollment.gradeId === grade.id);
        });
        const configuredCapacity = Number(group.capacity ?? group.maxStudents ?? 0);
        const capacity = Number.isFinite(configuredCapacity) && configuredCapacity > 0 ? configuredCapacity : null;
        const isScheduled = Boolean(group.day?.trim() && group.time?.trim());
        const seatsLeft = capacity === null ? null : Math.max(0, capacity - roster.length);
        const utilization = capacity === null ? null : Math.round((roster.length / capacity) * 100);

        return { grade, group, roster, capacity, isScheduled, seatsLeft, utilization };
    }));
    const scheduledGroupsCount = programReadiness.validGroups.length;
    const capacityReadyGroupsCount = groupOperations.filter(item => item.capacity !== null).length;
    const assignedEnrollmentIds = new Set(groupOperations.flatMap(item => item.roster.map(enrollment => enrollment.id)));
    const unassignedEnrollments = programEnrollments.filter(enrollment => !assignedEnrollmentIds.has(enrollment.id));
    const sortedEnrollments = [...programEnrollments].sort((a, b) => {
        const placementDelta = Number(assignedEnrollmentIds.has(a.id)) - Number(assignedEnrollmentIds.has(b.id));
        return placementDelta || a.studentName.localeCompare(b.studentName);
    });
    const programOperationsPreview = buildLegacyProgramOperationsPreview(program, {
        academicPeriod: settings.academicYear,
        rosterByGroupId: Object.fromEntries(groupOperations.map(item => [item.group.id, item.roster.length]))
    });
    const readinessChecks = [
        { label: 'Pricing ready', detail: programReadiness.hasPricing ? `${program.packs.length} plan${program.packs.length === 1 ? '' : 's'} available` : 'Add a priced plan families can choose', complete: programReadiness.hasPricing, tab: 'overview' as const },
        { label: 'Groups created', detail: activeClassesCount ? `${activeClassesCount} group${activeClassesCount === 1 ? '' : 's'} across ${programGrades.length} level${programGrades.length === 1 ? '' : 's'}` : 'Create the first teaching group', complete: activeClassesCount > 0, tab: 'classes' as const },
        { label: 'Schedules complete', detail: activeClassesCount ? `${scheduledGroupsCount} of ${activeClassesCount} groups have a day and time` : 'Available after groups are created', complete: activeClassesCount > 0 && scheduledGroupsCount === activeClassesCount, tab: 'classes' as const },
        { label: 'Capacity visible', detail: activeClassesCount ? `${capacityReadyGroupsCount} of ${activeClassesCount} groups have a seat limit` : 'Available after groups are created', complete: activeClassesCount > 0 && capacityReadyGroupsCount === activeClassesCount, tab: 'classes' as const },
        { label: 'Roster placed', detail: unassignedEnrollments.length ? `${unassignedEnrollments.length} learner${unassignedEnrollments.length === 1 ? ' still needs' : 's still need'} a group` : programEnrollments.length ? 'Every active learner has a group' : 'No active learners yet', complete: programEnrollments.length > 0 && unassignedEnrollments.length === 0, tab: 'students' as const }
    ];
    const readinessCompleted = readinessChecks.filter(check => check.complete).length;
    const readinessPercent = Math.round((readinessCompleted / readinessChecks.length) * 100);

    const nextAction = (() => {
        if (!programReadiness.hasPricing) return { title: 'Add a priced plan', detail: 'Families need a clear offer before enrollment can open.', label: 'Configure pricing', icon: DollarSign, action: () => onEditProgram?.(program), disabled: !onEditProgram };
        if (!activeClassesCount) return { title: 'Create the first group', detail: 'Set a level, day, and time so learners can be placed.', label: 'Configure groups', icon: Layers3, action: () => onEditProgram?.(program), disabled: !onEditProgram };
        if (scheduledGroupsCount < activeClassesCount) return { title: 'Finish the class schedule', detail: `${activeClassesCount - scheduledGroupsCount} group${activeClassesCount - scheduledGroupsCount === 1 ? '' : 's'} still need a day or time.`, label: 'Review groups', icon: CalendarDays, action: () => setActiveTab('classes'), disabled: false };
        if (capacityReadyGroupsCount < activeClassesCount) return { title: 'Set group capacity', detail: `${activeClassesCount - capacityReadyGroupsCount} group${activeClassesCount - capacityReadyGroupsCount === 1 ? '' : 's'} do not have a visible seat limit.`, label: 'Review capacity', icon: Gauge, action: () => setActiveTab('classes'), disabled: false };
        if (unassignedEnrollments.length) return { title: 'Place learners into groups', detail: `${unassignedEnrollments.length} active learner${unassignedEnrollments.length === 1 ? '' : 's'} need a class placement.`, label: 'Review roster', icon: GraduationCap, action: () => setActiveTab('students'), disabled: false };
        if (programLeads.length) return { title: 'Follow up waiting families', detail: `${programLeads.length} famil${programLeads.length === 1 ? 'y is' : 'ies are'} ready for an enrollment decision.`, label: 'Open waiting list', icon: UserPlus, action: () => setActiveTab('waiting-list'), disabled: false };
        if (groupOperations.length) return { title: 'Open the next class workspace', detail: 'The program is ready for daily delivery and attendance.', label: 'Open classes', icon: CalendarDays, action: () => setActiveTab('classes'), disabled: false };
        return { title: 'Review program setup', detail: 'Confirm the offer and delivery plan before inviting families.', label: 'Review setup', icon: Pencil, action: () => onEditProgram?.(program), disabled: !onEditProgram };
    })();

    const copyEnrollmentLink = async () => {
        if (program.status !== 'active' || !isEnrollmentReady) {
            await showAlert('Enrollment link disabled', program.status !== 'active' ? 'Activate the program before sharing its public enrollment form.' : 'Add at least one pricing plan and one scheduled group before sharing enrollment.', 'warning');
            return;
        }
        try {
            await navigator.clipboard.writeText(`${baseUrl}/enroll?program=${program.id}`);
            setLinkCopied(true);
            window.setTimeout(() => setLinkCopied(false), 1800);
        } catch (error) {
            console.error('Could not copy enrollment link:', error);
            await showAlert('Link could not be copied', 'Open the enrollment kiosk and copy its address from the browser.', 'warning');
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'operations':
                return (
                    <ProgramOperationsPreviewPanel
                        preview={programOperationsPreview}
                        onEditSetup={onEditProgram ? () => onEditProgram(program) : undefined}
                    />
                );
            case 'overview':
                return (
                    <div className="grid grid-cols-1 gap-4 animate-in fade-in duration-200 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
                        <section className="rounded-lg border border-white/10 bg-slate-900/55 p-4 sm:p-5">
                            <AtlasSectionHeader title="Ready to run" description="Complete these steps in order. Edufy keeps the next unfinished step easy to find." icon={CheckCircle2} meta={<span className="text-xs font-black text-teal-300">{readinessCompleted}/{readinessChecks.length}</span>} />
                            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-800" aria-label={`${readinessPercent}% ready`}>
                                <div className="h-full rounded-full bg-teal-400 transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${readinessPercent}%` }} />
                            </div>
                            <div className="mt-4 divide-y divide-white/10">
                                {readinessChecks.map((check, index) => (
                                    <button
                                        key={check.label}
                                        type="button"
                                        onClick={() => setActiveTab(check.tab)}
                                        className="group flex w-full items-center gap-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-400/60"
                                    >
                                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-black transition-colors ${check.complete ? 'border-teal-400/25 bg-teal-400/10 text-teal-300' : 'border-white/10 bg-slate-950 text-slate-500 group-hover:border-amber-300/30 group-hover:text-amber-200'}`}>
                                            {check.complete ? <CheckCircle2 size={15} /> : index + 1}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-bold text-white">{check.label}</span>
                                            <span className="block text-xs leading-5 text-slate-500">{check.detail}</span>
                                        </span>
                                        <ArrowRight size={16} className="shrink-0 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-300 motion-reduce:transition-none" />
                                    </button>
                                ))}
                            </div>
                        </section>

                        <div className="space-y-4">
                            <section className="rounded-lg border border-white/10 bg-slate-900/55 p-4 sm:p-5">
                                <AtlasSectionHeader title="Program essentials" description="The information families and staff rely on." icon={BookOpen} />
                                <dl className="mt-4 divide-y divide-white/10 text-sm">
                                    <div className="flex items-center justify-between gap-4 py-3"><dt className="text-slate-500">Duration</dt><dd className="text-right font-bold text-white">{program.duration || 'Not set'}</dd></div>
                                    <div className="flex items-center justify-between gap-4 py-3"><dt className="text-slate-500">Audience</dt><dd className="text-right font-bold capitalize text-white">{program.targetAudience || 'All learners'}</dd></div>
                                    <div className="flex items-center justify-between gap-4 py-3"><dt className="text-slate-500">Pricing</dt><dd className="text-right font-bold text-white">{program.packs?.length || 0} plan{program.packs?.length === 1 ? '' : 's'}</dd></div>
                                    <div className="flex items-center justify-between gap-4 py-3"><dt className="text-slate-500">Enrollment</dt><dd className="text-right font-bold text-white">{program.enrollmentPolicy?.mode === 'rolling_membership' ? `${program.enrollmentPolicy.membershipDurationMonths || 12}-month rolling` : program.enrollmentPolicy?.mode === 'modular' ? `By ${program.enrollmentPolicy.moduleLabel || 'module'}` : 'Fixed run dates'}</dd></div>
                                    <div className="flex items-center justify-between gap-4 py-3"><dt className="text-slate-500">Delivery</dt><dd className="text-right font-bold text-white">{activeClassesCount} group{activeClassesCount === 1 ? '' : 's'}</dd></div>
                                </dl>
                            </section>

                            <details className="group rounded-lg border border-white/10 bg-slate-900/55">
                                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-400/60">
                                    <span><span className="block text-sm font-black text-white">Pricing plans</span><span className="block text-xs text-slate-500">Open only when you need offer details</span></span>
                                    <span className="text-xs font-bold text-teal-300">{program.packs?.length || 0} plans</span>
                                </summary>
                                <div className="space-y-2 border-t border-white/10 p-4">
                                    {program.packs?.map((pack, index) => (
                                        <div key={`${pack.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-slate-950/70 px-3 py-3">
                                            <div className="min-w-0"><p className="truncate text-sm font-bold text-white">{pack.name}</p>{pack.promoPrice && <p className="text-[10px] font-bold uppercase text-emerald-300">Promotion active</p>}</div>
                                            <p className="shrink-0 font-black text-white">{formatCurrency(pack.promoPrice || pack.priceAnnual || pack.price || 0)}</p>
                                        </div>
                                    ))}
                                    {!program.packs?.length && <AtlasEmptyState title="No pricing plans" description="Add a plan before opening enrollment." icon={DollarSign} action={onEditProgram ? <AtlasActionButton icon={Pencil} variant="primary" onClick={() => onEditProgram(program)}>Configure pricing</AtlasActionButton> : undefined} />}
                                </div>
                            </details>
                        </div>
                    </div>
                );
            case 'classes':
                return programGrades.length === 0 ? (
                    <AtlasEmptyState
                        title="No levels or class groups"
                        description="Add levels and scheduled groups so admissions can place learners correctly."
                        icon={Layers3}
                        action={onEditProgram ? <AtlasActionButton icon={Pencil} variant="primary" onClick={() => onEditProgram(program)}>Configure schedule</AtlasActionButton> : undefined}
                    />
                ) : (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        <AtlasSectionHeader title="Groups and schedule" description="Scan readiness first, then open a group for attendance and daily delivery." icon={CalendarDays} actions={onEditProgram ? <AtlasActionButton icon={Pencil} onClick={() => onEditProgram(program)}>Edit groups</AtlasActionButton> : undefined} />
                        {programGrades.map(grade => {
                            const gradeGroups = groupOperations.filter(item => item.grade.id === grade.id);
                            const gradeRosterSize = gradeGroups.reduce((sum, item) => sum + item.roster.length, 0);
                            const isExpanded = expandedGradeIds.includes(grade.id);
                            return (
                                <section key={grade.id} className="overflow-hidden rounded-lg border border-white/10 bg-slate-900/55">
                                    <button
                                        type="button"
                                        aria-expanded={isExpanded}
                                        aria-controls={`grade-groups-${grade.id}`}
                                        onClick={() => setExpandedGradeIds(current => current.includes(grade.id) ? current.filter(id => id !== grade.id) : [...current, grade.id])}
                                        className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-400/60 sm:px-5"
                                    >
                                        <span className="min-w-0"><span className="block truncate text-sm font-black text-white">{grade.name}</span><span className="block text-xs text-slate-500">{grade.groups.length} group{grade.groups.length === 1 ? '' : 's'} / {gradeRosterSize} learner{gradeRosterSize === 1 ? '' : 's'}</span></span>
                                        <span className="flex shrink-0 items-center gap-2 text-xs font-bold text-teal-300">{isExpanded ? 'Hide' : 'View'} groups<ChevronDown size={15} className={`transition-transform motion-reduce:transition-none ${isExpanded ? 'rotate-180' : ''}`} /></span>
                                    </button>
                                    {isExpanded && <div id={`grade-groups-${grade.id}`} className="space-y-2 border-t border-white/10 p-3 animate-in fade-in duration-150 sm:p-4">
                                        {gradeGroups.map(item => {
                                            const isFull = item.capacity !== null && item.roster.length >= item.capacity;
                                            const needsAttention = !item.isScheduled || item.capacity === null;
                                            return (
                                                <div key={item.group.id} className="grid gap-3 rounded-lg border border-white/10 bg-slate-950/70 p-3 transition-colors hover:border-white/20 sm:grid-cols-[minmax(0,1.3fr)_minmax(150px,0.7fr)_auto] sm:items-center">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="truncate text-sm font-black text-white">{item.group.name || 'Unnamed group'}</p>
                                                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${needsAttention ? 'bg-amber-300/10 text-amber-200' : isFull ? 'bg-sky-400/10 text-sky-300' : 'bg-teal-400/10 text-teal-300'}`}>{needsAttention ? 'Setup needed' : isFull ? 'Full' : 'Ready'}</span>
                                                        </div>
                                                        <p className={`mt-1 flex items-center gap-1.5 text-xs ${item.isScheduled ? 'text-slate-400' : 'text-amber-200'}`}><Clock size={13} />{item.isScheduled ? `${item.group.day} / ${item.group.time}` : 'Day or time missing'}</p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 text-xs sm:block sm:text-right">
                                                        <p className="font-bold text-white">{item.roster.length} learner{item.roster.length === 1 ? '' : 's'}</p>
                                                        <p className={item.capacity === null ? 'text-amber-200' : 'text-slate-500'}>{item.capacity === null ? 'Capacity not set' : `${item.seatsLeft} seat${item.seatsLeft === 1 ? '' : 's'} open`}</p>
                                                    </div>
                                                    <AtlasActionButton icon={ArrowRight} variant="quiet" className="w-full sm:w-auto" onClick={() => navigateTo('classes', { classId: { pId: program.id, gId: grade.id, grpId: item.group.id } })}>Open class</AtlasActionButton>
                                                </div>
                                            );
                                        })}
                                        {!gradeGroups.length && <div className="rounded-lg border border-dashed border-white/10 p-5 text-center"><p className="text-sm font-bold text-white">No groups in this level</p><p className="mt-1 text-xs text-slate-500">Add a day and time before placing learners.</p></div>}
                                    </div>}
                                </section>
                            );
                        })}
                    </div>
                );
            case 'students':
                return (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        <AtlasSectionHeader title="Program roster" description="Unplaced learners appear first so every family reaches the correct class." icon={Users} meta={<span className="text-xs font-black text-teal-300">{programEnrollments.length}</span>} />
                        {unassignedEnrollments.length > 0 && (
                            <div className="flex items-start gap-3 rounded-lg border border-amber-300/20 bg-amber-300/[0.06] p-4">
                                <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-200" />
                                <div><p className="text-sm font-black text-amber-100">{unassignedEnrollments.length} learner{unassignedEnrollments.length === 1 ? '' : 's'} need a group</p><p className="mt-1 text-xs leading-5 text-slate-400">Open each profile to confirm level and class placement.</p></div>
                            </div>
                        )}
                        {programEnrollments.length === 0 ? (
                            <AtlasEmptyState title="No active enrollments" description="New enrollments for this program will appear here." icon={Users} />
                        ) : (
                            <>
                                <div className="space-y-2 md:hidden">
                                    {sortedEnrollments.map(enrollment => {
                                        const isPlaced = assignedEnrollmentIds.has(enrollment.id);
                                        return (
                                            <article key={enrollment.id} className={`rounded-lg border p-4 ${isPlaced ? 'border-white/10 bg-slate-900/55' : 'border-amber-300/20 bg-amber-300/[0.05]'}`}>
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0"><p className="truncate text-sm font-black text-white">{enrollment.studentName}</p><p className={`mt-1 text-xs ${isPlaced ? 'text-slate-500' : 'text-amber-200'}`}>{isPlaced ? enrollment.groupName : 'Group not assigned'}</p></div>
                                                    <span className={`shrink-0 rounded px-2 py-1 text-[10px] font-bold ${isPlaced ? 'bg-teal-400/10 text-teal-300' : 'bg-amber-300/10 text-amber-200'}`}>{isPlaced ? 'Placed' : 'Needs placement'}</span>
                                                </div>
                                                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/10 pt-3 text-xs"><div><p className="text-slate-500">Plan</p><p className="mt-1 truncate font-bold text-slate-200">{enrollment.packName || 'Not set'}</p></div><div><p className="text-slate-500">Started</p><p className="mt-1 font-bold text-slate-200">{enrollment.startDate || 'Not set'}</p></div></div>
                                                <AtlasActionButton icon={ArrowRight} variant="quiet" className="mt-3 w-full" onClick={() => navigateTo('student-details', { studentId: enrollment.studentId })}>Open learner</AtlasActionButton>
                                            </article>
                                        );
                                    })}
                                </div>
                                <div className="hidden overflow-x-auto rounded-lg border border-white/10 bg-slate-900/55 md:block">
                                    <table className="min-w-[720px] w-full text-left">
                                        <thead className="border-b border-slate-800 bg-slate-950 text-[10px] font-bold uppercase text-slate-500">
                                            <tr><th className="p-4">Learner</th><th className="p-4">Group</th><th className="p-4">Plan</th><th className="p-4">Started</th><th className="p-4 text-right">Action</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {sortedEnrollments.map(enrollment => {
                                                const isPlaced = assignedEnrollmentIds.has(enrollment.id);
                                                return (
                                                    <tr key={enrollment.id} className={`transition-colors hover:bg-white/[0.03] ${isPlaced ? '' : 'bg-amber-300/[0.04]'}`}>
                                                        <td className="p-4 font-bold text-white">{enrollment.studentName}</td>
                                                        <td className="p-4"><span className={`text-sm font-bold ${isPlaced ? 'text-slate-300' : 'text-amber-200'}`}>{isPlaced ? enrollment.groupName : 'Needs placement'}</span></td>
                                                        <td className="p-4 text-sm text-slate-300">{enrollment.packName || 'Not set'}</td>
                                                        <td className="p-4 text-sm text-slate-400">{enrollment.startDate || 'Not set'}</td>
                                                        <td className="p-4 text-right"><AtlasActionButton icon={ArrowRight} variant="quiet" onClick={() => navigateTo('student-details', { studentId: enrollment.studentId })}>Open learner</AtlasActionButton></td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                );
            case 'waiting-list':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in">
                        {programLeads.length === 0 ? (
                            <div className="col-span-full"><AtlasEmptyState title="No one is waiting" description="New program leads and pre-enrollments will appear here." icon={List} /></div>
                        ) : (
                            programLeads.map(lead => (
                                <article key={lead.id} className="group flex flex-col gap-4 rounded-lg border border-white/10 bg-slate-900/55 p-5 transition-colors hover:border-amber-300/25">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-400 border border-slate-700 text-lg">
                                                {lead.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-white">{lead.name}</div>
                                                <div className="text-xs text-slate-400">{lead.phone}</div>
                                            </div>
                                        </div>
                                        <span className="text-[10px] uppercase font-bold bg-amber-500/10 text-amber-500 px-2 py-1 rounded border border-amber-500/20">
                                            {lead.status}
                                        </span>
                                    </div>

                                    <div className="bg-slate-950 p-3 rounded-lg space-y-2 border border-slate-800/50">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">Slot Pref:</span>
                                            <span className="text-white font-medium">{lead.selectedSlot || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">Pack:</span>
                                            <span className="text-white font-medium">{lead.selectedPack || 'N/A'}</span>
                                        </div>
                                    </div>

                                    {onEnrollLead && (
                                        <button
                                            onClick={() => onEnrollLead(lead)}
                                            className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-amber-300/25 bg-amber-300 px-3 py-2.5 font-bold text-slate-950 transition-colors hover:bg-amber-200"
                                        >
                                            <UserPlus size={16} /> Enroll Now
                                        </button>
                                    )}
                                </article>
                            ))
                        )}
                    </div>
                );
            case 'financials':
                return (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <AtlasSignalCard label="Tuition booked" value={formatCurrency(totalRevenue)} detail="Active enrollments" icon={DollarSign} tone="blue" />
                            <AtlasSignalCard label="Collected" value={formatCurrency(totalPaid)} detail={totalRevenue ? `${Math.round((totalPaid / totalRevenue) * 100)}% of booked tuition` : 'No tuition booked'} icon={CheckCircle2} tone="emerald" />
                            <AtlasSignalCard label="Balance due" value={formatCurrency(totalBalance)} detail={totalBalance > 0 ? 'Family follow-up required' : 'No outstanding balance'} icon={WalletCards} tone={totalBalance > 0 ? 'amber' : 'teal'} />
                        </div>

                        <section className="overflow-hidden rounded-lg border border-white/10 bg-slate-900/55">
                            <div className="p-5">
                                <AtlasSectionHeader title="Enrollment balances" description="Open a learner profile to review the enrollment and payment history." icon={WalletCards} />
                            </div>
                            {programEnrollments.length === 0 ? (
                                <div className="p-5 pt-0"><AtlasEmptyState title="No active enrollment balances" description="Financial rows appear when learners are enrolled in this program." icon={DollarSign} /></div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[680px] text-left">
                                        <thead className="border-y border-white/10 bg-slate-950/70 text-[10px] font-bold uppercase text-slate-500">
                                            <tr><th className="p-3">Learner</th><th className="p-3">Plan</th><th className="p-3 text-right">Tuition</th><th className="p-3 text-right">Paid</th><th className="p-3 text-right">Balance</th><th className="p-3 text-right">Action</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/10">
                                            {programEnrollments.map(enrollment => (
                                                <tr key={enrollment.id} className="transition-colors hover:bg-white/[0.03]">
                                                    <td className="p-3"><div className="font-bold text-white">{enrollment.studentName}</div><div className="text-xs text-slate-500">{enrollment.groupName || 'Group not assigned'}</div></td>
                                                    <td className="p-3 text-sm text-slate-300">{enrollment.packName || 'Not set'}</td>
                                                    <td className="p-3 text-right text-sm text-slate-300">{formatCurrency(enrollment.totalAmount || 0)}</td>
                                                    <td className="p-3 text-right text-sm font-bold text-emerald-300">{formatCurrency(enrollment.paidAmount || 0)}</td>
                                                    <td className={`p-3 text-right text-sm font-black ${enrollment.balance > 0 ? 'text-amber-200' : 'text-slate-400'}`}>{formatCurrency(enrollment.balance || 0)}</td>
                                                    <td className="p-3 text-right"><button type="button" onClick={() => navigateTo('student-details', { studentId: enrollment.studentId })} className="min-h-9 rounded-lg px-3 text-sm font-bold text-teal-300 transition-colors hover:bg-teal-300/10 hover:text-white">Open profile</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    </div>
                );
            case 'resources':
                return (
                    <div className="grid grid-cols-1 gap-4 animate-in fade-in md:grid-cols-2">
                        {/* Kiosk / Public Link Card */}
                        <section className="space-y-4 rounded-lg border border-white/10 bg-slate-900/55 p-5">
                            <div className="flex items-start gap-4">
                                <div className="rounded-lg bg-teal-400/10 p-3 text-teal-300">
                                    <Tablet size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">Public Enrollment Kiosk</h3>
                                    <p className="text-sm text-slate-400 mt-1">Direct link for parents/students to enroll in this program.</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-950 p-4">
                                <div className="text-xs font-bold text-slate-500 uppercase">Public URL</div>
                                <div className="text-sm text-blue-400 truncate font-mono bg-slate-900/50 p-2 rounded">
                                    {`${baseUrl}/enroll?program=${program.id}`}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <AtlasActionButton
                                    onClick={() => window.open(`${baseUrl}/enroll?program=${program.id}`, '_blank', 'noopener,noreferrer')}
                                    icon={ExternalLink}
                                    variant="primary"
                                    disabled={program.status !== 'active' || !isEnrollmentReady}
                                >
                                    Open kiosk
                                </AtlasActionButton>
                                <AtlasActionButton
                                    onClick={copyEnrollmentLink}
                                    icon={linkCopied ? CheckCircle2 : Copy}
                                    disabled={program.status !== 'active' || !isEnrollmentReady}
                                >
                                    {linkCopied ? 'Copied' : 'Copy Link'}
                                </AtlasActionButton>
                                <AtlasActionButton
                                    onClick={() => onOpenEnrollmentAccess?.(program)}
                                    icon={Tablet}
                                    disabled={!onOpenEnrollmentAccess || program.status !== 'active' || !isEnrollmentReady}
                                >
                                    Show QR
                                </AtlasActionButton>
                            </div>
                        </section>

                        {/* Print Materials */}
                        <section className="space-y-4 rounded-lg border border-white/10 bg-slate-900/55 p-5">
                            <div className="flex items-start gap-4">
                                <div className="rounded-lg bg-emerald-500/10 p-3 text-emerald-400">
                                    <Printer size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">Printable Materials</h3>
                                    <p className="text-sm text-slate-400 mt-1">Generate enrollment forms and schedules.</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    type="button"
                                    onClick={() => onQuoteProgram?.(program)}
                                    disabled={!onQuoteProgram || !program.packs?.length}
                                    className="group flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-4 transition-colors hover:border-teal-400/30 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                    <div className="flex items-center gap-3">
                                        <FileText size={20} className="text-slate-400 group-hover:text-amber-200" />
                                        <div className="text-left">
                                            <div className="font-bold text-slate-200 group-hover:text-white">Prepare a quote</div>
                                            <div className="text-xs text-slate-500">Choose plans and apply an approved discount</div>
                                        </div>
                                    </div>
                                    <ArrowRight size={16} className="text-slate-600 group-hover:text-amber-200" />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => onPrintProgram?.(program)}
                                    disabled={!onPrintProgram}
                                    className="group flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-4 transition-colors hover:border-teal-400/30 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                    <div className="flex items-center gap-3">
                                        <FileText size={20} className="text-slate-400 group-hover:text-emerald-400" />
                                        <div className="text-left">
                                            <div className="font-bold text-slate-200 group-hover:text-white">Print Schedule & Form</div>
                                            <div className="text-xs text-slate-500">Official signup sheet with schedule</div>
                                        </div>
                                    </div>
                                    <Printer size={16} className="text-slate-600 group-hover:text-emerald-400" />
                                </button>

                                {/* Placeholder for Brochure */}
                                {program.brochureUrl ? (
                                    <a
                                        href={program.brochureUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-4 transition-colors hover:border-teal-400/30 hover:bg-slate-900"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Download size={20} className="text-slate-400 group-hover:text-blue-400" />
                                            <div className="text-left">
                                                <div className="font-bold text-slate-200 group-hover:text-white">Download Brochure</div>
                                                <div className="text-xs text-slate-500">Program PDF Guide</div>
                                            </div>
                                        </div>
                                        <ExternalLink size={16} className="text-slate-600 group-hover:text-blue-400" />
                                    </a>
                                ) : (
                                    <button
                                        type="button"
                                        disabled={!onEditProgram}
                                        onClick={() => onEditProgram?.(program)}
                                        className="flex w-full items-center justify-between rounded-lg border border-dashed border-amber-300/20 bg-amber-300/[0.05] p-4 text-left transition-colors hover:border-amber-300/40 disabled:cursor-not-allowed disabled:opacity-55"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Download size={20} className="text-amber-200" />
                                            <div>
                                                <div className="font-bold text-slate-200">Add brochure link</div>
                                                <div className="text-xs text-slate-500">Connect an existing PDF URL in program setup.</div>
                                            </div>
                                        </div>
                                        {onEditProgram && <Pencil size={16} className="text-amber-200" />}
                                    </button>
                                )}
                            </div>
                        </section>
                    </div>
                );
            default:
                return null;
        }
    }

    const NextActionIcon = nextAction.icon;

    return (
        <div ref={workspaceRef} tabIndex={-1} className="flex flex-col gap-4 pb-6 outline-none">
            <AtlasCommandHeader
                eyebrow="Program workspace"
                title={program.name}
                description="Keep the offer, teaching groups, schedule, and learner roster ready from one workspace."
                icon={BookOpen}
                badges={
                    <>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-bold uppercase text-slate-300">{program.type}</span>
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${program.status === 'active' ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-white/10 bg-white/[0.04] text-slate-400'}`}>{program.status}</span>
                        {program.partnerName && <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[10px] font-bold text-amber-200">{program.partnerName}</span>}
                    </>
                }
                actions={
                    <>
                        <AtlasActionButton icon={programIdProp ? X : ArrowLeft} variant="quiet" onClick={() => programIdProp ? onClose?.() : navigateTo('programs')}>
                            {programIdProp ? 'Close' : 'Programs'}
                        </AtlasActionButton>
                        {onPrintProgram && <AtlasActionButton icon={Printer} variant="quiet" title="Print program" aria-label="Print program" onClick={() => onPrintProgram(program)}><span className="hidden xl:inline">Print</span></AtlasActionButton>}
                        {onEditProgram && <AtlasActionButton icon={Pencil} variant="primary" onClick={() => onEditProgram(program)}>Edit setup</AtlasActionButton>}
                    </>
                }
            />

            {program.status === 'active' && (
                <section className="relative overflow-hidden rounded-lg border border-teal-400/20 bg-slate-900/70 p-4 sm:p-5">
                    <div className="absolute inset-y-0 left-0 w-1 bg-teal-400" />
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-400/10 text-teal-300"><NextActionIcon size={20} /></span>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase text-teal-300">Next best action</p>
                                <h3 className="mt-1 text-base font-black text-white">{nextAction.title}</h3>
                                <p className="mt-1 text-xs leading-5 text-slate-400">{nextAction.detail}</p>
                            </div>
                        </div>
                        <AtlasActionButton icon={ArrowRight} variant="primary" className="w-full shrink-0 sm:w-auto" onClick={nextAction.action} disabled={nextAction.disabled}>{nextAction.label}</AtlasActionButton>
                    </div>
                </section>
            )}

            {program.status === 'archived' && (
                <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-slate-900/60 p-4">
                    <AlertCircle className="mt-0.5 shrink-0 text-slate-400" size={18} />
                    <div>
                        <p className="text-sm font-black text-white">This program is archived</p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">Public enrollment sharing is disabled. Historical classes, enrollments, and balances remain available.</p>
                    </div>
                </div>
            )}

            {program.status === 'draft' && (
                <div className="flex items-start gap-3 rounded-lg border border-sky-300/20 bg-sky-300/[0.06] p-4">
                    <AlertCircle className="mt-0.5 shrink-0 text-sky-300" size={18} />
                    <div>
                        <p className="text-sm font-black text-white">This program is a draft</p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">Its setup is preserved, but enrollment links and operational classes stay closed until the program is activated.</p>
                    </div>
                </div>
            )}

            <section className="grid grid-cols-2 overflow-hidden rounded-lg border border-white/10 bg-slate-900/55 lg:grid-cols-4">
                {[
                    { label: 'Readiness', value: `${readinessPercent}%`, detail: `${readinessCompleted} of ${readinessChecks.length} complete`, icon: CheckCircle2, tab: 'overview' as const, attention: readinessPercent < 100 },
                    { label: 'Groups', value: activeClassesCount, detail: `${scheduledGroupsCount} scheduled`, icon: CalendarDays, tab: 'classes' as const, attention: scheduledGroupsCount < activeClassesCount },
                    { label: 'Roster', value: programEnrollments.length, detail: unassignedEnrollments.length ? `${unassignedEnrollments.length} need placement` : 'All placed', icon: Users, tab: 'students' as const, attention: unassignedEnrollments.length > 0 },
                    { label: 'Waiting', value: programLeads.length, detail: programLeads.length ? 'Ready for follow-up' : 'No waiting families', icon: List, tab: 'waiting-list' as const, attention: programLeads.length > 0 }
                ].map((item, index) => (
                    <button key={item.label} type="button" onClick={() => setActiveTab(item.tab)} className={`group flex min-h-[88px] items-center gap-3 p-3 text-left transition-colors hover:bg-white/[0.04] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-400/60 sm:p-4 ${index % 2 ? '' : 'border-r border-white/10'} ${index < 2 ? 'border-b border-white/10 lg:border-b-0' : ''} ${index > 0 ? 'lg:border-l lg:border-white/10' : ''}`}>
                        <item.icon size={17} className={item.attention ? 'shrink-0 text-amber-200' : 'shrink-0 text-teal-300'} />
                        <span className="min-w-0"><span className="block text-lg font-black text-white">{item.value}</span><span className="block text-[10px] font-bold uppercase text-slate-500">{item.label}</span><span className={`mt-0.5 block truncate text-xs ${item.attention ? 'text-amber-200' : 'text-slate-500'}`}>{item.detail}</span></span>
                    </button>
                ))}
            </section>

            <div role="tablist" aria-label="Program workspace" className="custom-scrollbar sticky top-0 z-20 flex gap-1 overflow-x-auto rounded-lg border border-white/10 bg-slate-950/95 p-1.5 shadow-lg shadow-slate-950/20 backdrop-blur">
                {[
                    { id: 'operations', label: 'Program plan', icon: CalendarDays },
                    { id: 'overview', label: 'Overview', icon: LayoutGrid },
                    { id: 'classes', label: 'Groups & schedule', icon: CalendarDays, count: activeClassesCount },
                    { id: 'students', label: 'Roster', icon: Users, count: programEnrollments.length },
                    { id: 'waiting-list', label: 'Waiting', icon: List, count: programLeads.length },
                    { id: 'financials', label: 'Finance', icon: DollarSign },
                    { id: 'resources', label: 'Sharing', icon: LinkIcon },
                ].map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === tab.id}
                        aria-controls="program-tab-panel"
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 ${activeTab === tab.id ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'}`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                        {tab.count !== undefined && (
                            <span className={`ml-1 rounded px-1.5 py-0.5 text-[10px] ${activeTab === tab.id ? 'bg-slate-950/20 text-slate-950' : 'bg-white/[0.06] text-slate-300'}`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <div id="program-tab-panel" role="tabpanel" className="min-w-0 flex-1">
                {renderTabContent()}
            </div>
        </div>
    );
};
