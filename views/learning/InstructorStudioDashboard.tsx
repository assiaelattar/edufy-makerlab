import React, { useMemo } from 'react';
import { ArrowRight, CheckCircle, Clock, ExternalLink, GitCommit, Radio, Rocket, TrendingUp, Users } from 'lucide-react';
import { StudentProject } from '../../types';
import { NotificationBell } from '../../components/NotificationBell';
import { AtlasActionButton, AtlasCommandHeader, AtlasEmptyState, AtlasSectionHeader, AtlasSignalCard } from '../../components/atlas/AtlasSurface';

interface InstructorStudioDashboardProps {
    studentProjects: StudentProject[];
    students: any[];
    onViewProject: (project: StudentProject) => void;
    onViewCommits: () => void;
    onViewReviews: () => void;
}

export const InstructorStudioDashboard: React.FC<InstructorStudioDashboardProps> = ({
    studentProjects,
    students,
    onViewProject,
    onViewCommits,
    onViewReviews
}) => {
    const stats = useMemo(() => {
        const activeProjects = studentProjects.filter(project => ['planning', 'building', 'testing'].includes(project.status || ''));
        const totalCommits = studentProjects.reduce((sum, project) => sum + (project.commits?.length || 0), 0);
        const pendingProjects = studentProjects.filter(project => project.status === 'submitted');
        const recentCommits = studentProjects
            .flatMap(project => (project.commits || []).map(commit => ({ ...commit, project })))
            .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0))
            .slice(0, 5);

        return {
            activeProjects: activeProjects.length,
            totalCommits,
            pendingReviews: pendingProjects.length,
            activeStudents: new Set(activeProjects.map(project => project.studentId)).size,
            recentCommits,
            pendingProjects
        };
    }, [studentProjects]);

    return (
        <div className="space-y-5 pb-8 animate-in fade-in duration-200">
            <AtlasCommandHeader
                eyebrow="Instructor studio"
                title="Mission control"
                description="Review learner momentum, clear submitted work, and return to the projects that need attention."
                icon={Rocket}
                actions={<><NotificationBell /><AtlasActionButton icon={Radio} variant="primary">Start session</AtlasActionButton></>}
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <AtlasSignalCard label="Review queue" value={stats.pendingReviews} detail="Submitted projects waiting" icon={Clock} tone={stats.pendingReviews > 0 ? 'amber' : 'slate'} onClick={onViewReviews} />
                <AtlasSignalCard label="Active missions" value={stats.activeProjects} detail="Projects currently moving" icon={TrendingUp} tone="teal" />
                <AtlasSignalCard label="Active makers" value={stats.activeStudents} detail="Learners building now" icon={Users} tone="blue" />
                <AtlasSignalCard label="Project commits" value={stats.totalCommits} detail="Saved learner checkpoints" icon={GitCommit} tone="emerald" onClick={onViewCommits} />
            </div>

            <section className="space-y-4">
                <AtlasSectionHeader
                    title="Priority review queue"
                    description="Submitted projects ready for instructor feedback."
                    icon={Clock}
                    actions={stats.pendingProjects.length > 0 ? <AtlasActionButton onClick={onViewReviews}>Open queue</AtlasActionButton> : undefined}
                />
                {stats.pendingProjects.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {stats.pendingProjects.map(project => (
                            <button key={project.id} type="button" onClick={() => onViewProject(project)} className="group flex min-h-28 items-center justify-between rounded-lg border border-amber-300/20 bg-slate-900/80 p-4 text-left transition-colors hover:border-amber-300/45">
                                <div className="min-w-0">
                                    <h4 className="truncate font-bold text-white transition-colors group-hover:text-amber-200">{project.title}</h4>
                                    <p className="mt-1 truncate text-xs text-slate-500">by {project.studentName}</p>
                                    <span className="mt-2 inline-block rounded-md border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[10px] font-bold uppercase text-amber-200">Needs review</span>
                                </div>
                                <span className="ml-3 shrink-0 rounded-lg border border-white/10 bg-white/[0.05] p-2 text-slate-400 transition-colors group-hover:text-amber-200"><ArrowRight size={16} /></span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <AtlasEmptyState title="Review queue is clear" description="New submitted projects will appear here when learners are ready for feedback." icon={CheckCircle} />
                )}
            </section>

            <section className="space-y-4">
                <AtlasSectionHeader title="Live studio activity" description="Recent learner checkpoints with project context." icon={GitCommit} actions={<AtlasActionButton icon={ArrowRight} onClick={onViewCommits}>View feed</AtlasActionButton>} />
                {stats.recentCommits.length === 0 ? (
                    <AtlasEmptyState title="No recent studio activity" description="Learner commits will collect here as projects move forward." icon={GitCommit} />
                ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {stats.recentCommits.map((commit, index) => {
                            const project = commit.project as StudentProject;
                            const student = students.find(item => item.id === project.studentId);
                            const step = project.steps?.find(item => item.id === commit.stepId);
                            const progress = project.steps?.length ? Math.round((project.steps.filter(item => item.status === 'done').length / project.steps.length) * 100) : 0;

                            return (
                                <article key={`${project.id}-${commit.id || index}`} className="rounded-lg border border-white/10 bg-slate-900/70 p-4 transition-colors hover:border-teal-300/30">
                                    <div className="mb-3 flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-sm font-black text-slate-300">{student?.name?.charAt(0) || '?'}</div>
                                            <div className="min-w-0">
                                                <h4 className="truncate text-sm font-bold text-white">{student?.name || 'Unknown student'}</h4>
                                                <p className="truncate text-xs text-slate-500">{project.title}</p>
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-right"><span className="block text-[9px] font-bold uppercase text-slate-600">Progress</span><span className="font-mono text-sm font-bold text-teal-300">{progress}%</span></div>
                                    </div>
                                    <div className="mb-3 rounded-lg border border-white/10 bg-slate-950/60 p-3">
                                        <p className="text-sm text-slate-300">{commit.message}</p>
                                        {step && <p className="mt-1 text-xs text-slate-500">Current: {step.title}</p>}
                                    </div>
                                    <div className="flex gap-2">
                                        <AtlasActionButton className="flex-1" onClick={() => onViewProject(project)}>View project</AtlasActionButton>
                                        {commit.evidenceLink && <AtlasActionButton aria-label="View evidence" title="View evidence" icon={ExternalLink} onClick={() => window.open(commit.evidenceLink, '_blank')} />}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
};
