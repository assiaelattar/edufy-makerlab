import React, { useMemo } from 'react';
import { AlertTriangle, ArrowUpRight, Bell, CheckCircle2, ChevronRight, Clock, Microscope, Rocket, Target, Users, Zap } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { AtlasActionButton, AtlasCommandHeader, AtlasEmptyState, AtlasSectionHeader, AtlasSignalCard } from '../components/atlas/AtlasSurface';
import { config } from '../utils/config';

export const InstructorDashboardView = () => {
    const { students, enrollments, studentProjects, navigateTo } = useAppContext();
    const { userProfile } = useAuth();
    const { unreadCount } = useNotifications();
    const firstName = userProfile?.name?.split(' ')[0] || 'Instructor';

    const pendingReviews = useMemo(() => {
        const queue: any[] = [];
        (studentProjects || []).forEach(project => {
            project.steps?.forEach(step => {
                if (step.status !== 'PENDING_REVIEW') return;
                const student = students?.find(item => item.id === project.studentId);
                queue.push({
                    projectId: project.id,
                    projectTitle: project.title,
                    studentName: student?.name || 'Unknown learner',
                    submissionDate: step.reviewedAt || new Date().toISOString(),
                    step
                });
            });
        });
        return queue.sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());
    }, [studentProjects, students]);

    const liveClass = useMemo(() => {
        const now = new Date();
        const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
        const active = (enrollments || []).find(enrollment => (enrollment.groupTime?.includes(currentDay) || enrollment.secondGroupTime?.includes(currentDay)) && enrollment.status === 'active');
        if (!active || now.getHours() < 9 || now.getHours() > 18) return null;
        return {
            name: active.groupName || 'Current class',
            program: active.programName,
            studentsCount: enrollments.filter(enrollment => enrollment.groupName === active.groupName).length,
            timeLeft: '45 mins'
        };
    }, [enrollments]);

    const atRiskStudents = useMemo(() => students
        .filter(student => student.status === 'active')
        .map(student => {
            const projects = (studentProjects || []).filter(project => project.studentId === student.id);
            const isStalled = projects.length === 0 || projects.every(project => project.status === 'planning');
            return isStalled ? { id: student.id, name: student.name, issue: 'Stuck in planning', daysInactive: 5 } : null;
        })
        .filter(Boolean)
        .slice(0, 5), [students, studentProjects]);

    const activeProjects = useMemo(() => (studentProjects || [])
        .filter(project => project.status === 'building' || project.status === 'testing')
        .map(project => {
            const totalSteps = project.steps?.length || 0;
            const doneSteps = project.steps?.filter(step => (step.status || '').toLowerCase() === 'done').length || 0;
            const student = students?.find(item => item.id === project.studentId);
            const currentStep = project.steps?.find(step => step.status === 'doing' || step.status === 'PENDING_REVIEW');
            return {
                id: project.id,
                projectTitle: project.title,
                studentName: student?.name || 'Unknown learner',
                progress: totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0,
                currentStepName: currentStep?.title || 'Building',
                lastUpdated: project.updatedAt
            };
        })
        .sort((a, b) => {
            const dateA = a.lastUpdated ? (typeof (a.lastUpdated as any).toDate === 'function' ? (a.lastUpdated as any).toDate() : new Date(a.lastUpdated as any)) : new Date(0);
            const dateB = b.lastUpdated ? (typeof (b.lastUpdated as any).toDate === 'function' ? (b.lastUpdated as any).toDate() : new Date(b.lastUpdated as any)) : new Date(0);
            return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 8), [studentProjects, students]);

    return (
        <div className="mx-auto max-w-7xl space-y-5 pb-24 md:pb-8">
            <AtlasCommandHeader
                eyebrow="Instructor service desk"
                title={`Good to see you, ${firstName}`}
                description="Reviews, live sessions, and learners needing a nudge are ready in one working view."
                icon={Zap}
                badges={unreadCount > 0 ? <span className="rounded-full border border-rose-300/20 bg-rose-400/10 px-2.5 py-1 text-[10px] font-bold text-rose-200">{unreadCount} notifications</span> : undefined}
                actions={(
                    <>
                        <AtlasActionButton icon={Rocket} onClick={() => window.open(config.sparkQuestUrl, '_blank')}>Open SparkQuest</AtlasActionButton>
                        <AtlasActionButton icon={Bell} onClick={() => navigateTo('team')}>Notifications</AtlasActionButton>
                        <AtlasActionButton icon={Zap} variant="primary" onClick={() => navigateTo('classes')}>Start session</AtlasActionButton>
                    </>
                )}
            />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <AtlasSignalCard label="Review queue" value={pendingReviews.length} detail={pendingReviews.length > 0 ? 'Submissions need coaching' : 'All learner work is reviewed'} icon={Microscope} tone={pendingReviews.length > 0 ? 'amber' : 'emerald'} onClick={() => navigateTo('review')} />
                <AtlasSignalCard label={liveClass ? 'Live now' : 'Session status'} value={liveClass?.name || 'No active class'} detail={liveClass ? `${liveClass.studentsCount} learners / ${liveClass.timeLeft} remaining` : 'Open Classes to prepare the next group'} icon={Clock} tone={liveClass ? 'teal' : 'slate'} onClick={() => navigateTo('classes')} />
                <AtlasSignalCard label="Attention needed" value={atRiskStudents.length} detail={atRiskStudents.length > 0 ? 'Learners stalled in planning' : 'Every active learner is moving'} icon={AlertTriangle} tone={atRiskStudents.length > 0 ? 'red' : 'emerald'} onClick={() => navigateTo('students')} />
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <div className="space-y-5 lg:col-span-2">
                    <section className="rounded-lg border border-white/10 bg-slate-950/45 p-4">
                        <AtlasSectionHeader title="Priority review queue" description="Open the next submission with learner context already attached." icon={Microscope} meta={<span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-200">{pendingReviews.length}</span>} actions={pendingReviews.length > 0 ? <AtlasActionButton onClick={() => navigateTo('review')}>Open queue</AtlasActionButton> : undefined} />
                        {pendingReviews.length === 0 ? (
                            <div className="mt-4"><AtlasEmptyState title="Reviews are caught up" description="New learner submissions will appear here automatically." icon={CheckCircle2} /></div>
                        ) : (
                            <div className="mt-3 divide-y divide-white/[0.07]">
                                {pendingReviews.slice(0, 5).map(item => (
                                    <button type="button" key={`${item.projectId}-${item.step.id}`} onClick={() => navigateTo('review', { projectId: item.projectId })} className="group flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-300/15 bg-amber-400/10 text-sm font-black text-amber-200">{item.studentName.charAt(0)}</div>
                                        <div className="min-w-0 flex-1"><div className="truncate text-sm font-black text-white">{item.step.title}</div><div className="mt-0.5 truncate text-xs text-slate-500"><span className="font-bold text-slate-300">{item.studentName}</span> / {item.projectTitle}</div></div>
                                        <span className="hidden items-center gap-1 text-xs font-bold text-teal-300 sm:flex">Review <ChevronRight size={14} /></span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="rounded-lg border border-white/10 bg-slate-950/45 p-4">
                        <AtlasSectionHeader title="Studio activity" description="Active builds ordered by their latest update." icon={Rocket} meta={<span className="text-xs text-slate-500">{activeProjects.length} active</span>} />
                        {activeProjects.length === 0 ? (
                            <div className="mt-4"><AtlasEmptyState title="No active builds" description="Projects in building or testing will appear here." icon={Rocket} /></div>
                        ) : (
                            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                                {activeProjects.map(project => (
                                    <button type="button" key={project.id} onClick={() => navigateTo('review', { projectId: project.id })} className="rounded-lg border border-white/[0.07] bg-white/[0.025] p-3 text-left transition-colors hover:border-teal-300/25 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60">
                                        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-black text-white">{project.projectTitle}</div><div className="mt-0.5 truncate text-xs text-slate-500">{project.studentName}</div></div><span className="font-mono text-xs font-bold text-teal-300">{project.progress}%</span></div>
                                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full rounded-full bg-teal-400 transition-[width] duration-300" style={{ width: `${project.progress}%` }} /></div>
                                        <div className="mt-2 truncate text-xs text-slate-400">Current: {project.currentStepName}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                <section className="rounded-lg border border-white/10 bg-slate-950/45 p-4">
                    <AtlasSectionHeader title="Attention needed" description="A short intervention list for the next check-in." icon={Target} meta={<span className="text-xs text-slate-500">{atRiskStudents.length}</span>} />
                    {atRiskStudents.length === 0 ? (
                        <div className="mt-4"><AtlasEmptyState title="Learners are on track" description="No active learner is currently stalled in planning." icon={CheckCircle2} /></div>
                    ) : (
                        <div className="mt-3 space-y-2">
                            {atRiskStudents.map(student => student && (
                                <button type="button" key={student.id} onClick={() => navigateTo('student-details', { studentId: student.id })} className="group flex w-full items-center gap-3 rounded-lg border border-white/[0.07] bg-white/[0.025] p-3 text-left transition-colors hover:border-amber-300/25 hover:bg-amber-300/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60">
                                    <span className="h-2 w-2 shrink-0 rounded-full bg-amber-300" /><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold text-white">{student.name}</div><div className="mt-0.5 text-xs text-amber-200">{student.issue}</div></div><ArrowUpRight size={16} className="text-slate-600 transition-colors group-hover:text-amber-200" />
                                </button>
                            ))}
                            <AtlasActionButton className="mt-2 w-full" icon={Users} onClick={() => navigateTo('students')}>Open student list</AtlasActionButton>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};
