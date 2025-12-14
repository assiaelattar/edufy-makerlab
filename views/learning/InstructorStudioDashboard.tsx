import React, { useMemo } from 'react';
import { Users, GitCommit, CheckCircle, Clock, TrendingUp, Eye, Filter, Bell, ArrowRight, ExternalLink } from 'lucide-react';
import { StudentProject } from '../../types';
import { STUDIO_THEME, studioClass } from '../../utils/studioTheme';
import { formatDate } from '../../utils/helpers';
import { NotificationBell } from '../../components/NotificationBell';

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
    // Calculate stats
    const stats = useMemo(() => {
        const activeProjects = studentProjects.filter(p =>
            ['planning', 'building', 'testing'].includes(p.status || '')
        );

        const totalCommits = studentProjects.reduce((sum, p) =>
            sum + (p.commits?.length || 0), 0
        );

        // SYNC FIX: Use project status 'submitted' instead of step status
        const pendingReviews = studentProjects.filter(p => p.status === 'submitted').length;

        const recentCommits = studentProjects
            .flatMap(p => (p.commits || []).map(c => ({ ...c, project: p })))
            .sort((a, b) => {
                const aTime = a.timestamp?.seconds || 0;
                const bTime = b.timestamp?.seconds || 0;
                return bTime - aTime;
            })
            .slice(0, 5);

        // Get actual pending projects for the queue view
        const pendingProjects = studentProjects.filter(p => p.status === 'submitted');

        return {
            activeProjects: activeProjects.length,
            totalCommits,
            pendingReviews,
            activeStudents: new Set(activeProjects.map(p => p.studentId)).size,
            recentCommits,
            pendingProjects
        };
    }, [studentProjects]);

    return (
        <div className={studioClass(STUDIO_THEME.background.main, 'min-h-screen p-8 animate-in fade-in slide-in-from-right-4')}>
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className={studioClass(STUDIO_THEME.text.primary, 'text-4xl font-bold mb-2')}>
                        Mission Control
                    </h1>
                    <p className={STUDIO_THEME.text.secondary}>
                        Welcome back. Here's what's happening in your studio today.
                    </p>
                </div>
                <div className="flex gap-4">
                    <NotificationBell />
                    <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg hover:shadow-indigo-500/20">
                        Start Session ⚡
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Pending Reviews (Priority) */}
                <div className={studioClass(
                    STUDIO_THEME.background.card,
                    STUDIO_THEME.border.light,
                    STUDIO_THEME.shadow.card,
                    STUDIO_THEME.rounded.lg,
                    STUDIO_THEME.transition.default,
                    STUDIO_THEME.background.cardHover,
                    'border p-6 cursor-pointer group relative overflow-hidden'
                )}
                    onClick={onViewReviews}>
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Clock size={80} />
                    </div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className={studioClass(
                            stats.pendingReviews > 0 ? STUDIO_THEME.colors.warning : 'bg-slate-800 text-slate-500',
                            STUDIO_THEME.rounded.md,
                            'p-3'
                        )}>
                            <Clock className={stats.pendingReviews > 0 ? "text-white" : "text-slate-400"} size={24} />
                        </div>
                        <span className={studioClass(STUDIO_THEME.text.accent, 'text-4xl font-bold')}>
                            {stats.pendingReviews}
                        </span>
                    </div>
                    <h3 className={studioClass(STUDIO_THEME.text.secondary, 'text-sm font-bold uppercase tracking-wider')}>
                        Review Queue
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Pending submissions awaiting grading.</p>
                </div>

                {/* Active Projects */}
                <div className={studioClass(
                    STUDIO_THEME.background.card,
                    STUDIO_THEME.border.light,
                    STUDIO_THEME.shadow.card,
                    STUDIO_THEME.rounded.lg,
                    STUDIO_THEME.transition.default,
                    STUDIO_THEME.background.cardHover,
                    'border p-6'
                )}>
                    <div className="flex items-center justify-between mb-4">
                        <div className={studioClass(
                            STUDIO_THEME.colors.primary,
                            STUDIO_THEME.rounded.md,
                            'p-3'
                        )}>
                            <TrendingUp className="text-white" size={24} />
                        </div>
                        <span className={studioClass(STUDIO_THEME.text.accent, 'text-4xl font-bold')}>
                            {stats.activeProjects}
                        </span>
                    </div>
                    <h3 className={studioClass(STUDIO_THEME.text.secondary, 'text-sm font-bold uppercase tracking-wider')}>
                        Active Missions
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Students building right now.</p>
                </div>

                {/* Active Students */}
                <div className={studioClass(
                    STUDIO_THEME.background.card,
                    STUDIO_THEME.border.light,
                    STUDIO_THEME.shadow.card,
                    STUDIO_THEME.rounded.lg,
                    STUDIO_THEME.transition.default,
                    STUDIO_THEME.background.cardHover,
                    'border p-6'
                )}>
                    <div className="flex items-center justify-between mb-4">
                        <div className={studioClass(
                            STUDIO_THEME.colors.secondary,
                            STUDIO_THEME.rounded.md,
                            'p-3'
                        )}>
                            <Users className="text-white" size={24} />
                        </div>
                        <span className={studioClass(STUDIO_THEME.text.accent, 'text-4xl font-bold')}>
                            {stats.activeStudents}
                        </span>
                    </div>
                    <h3 className={studioClass(STUDIO_THEME.text.secondary, 'text-sm font-bold uppercase tracking-wider')}>
                        Makers Active
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Students active in the last 24h.</p>
                </div>

                {/* Total Commits */}
                <div className={studioClass(
                    STUDIO_THEME.background.card,
                    STUDIO_THEME.border.light,
                    STUDIO_THEME.shadow.card,
                    STUDIO_THEME.rounded.lg,
                    STUDIO_THEME.transition.default,
                    STUDIO_THEME.background.cardHover,
                    'border p-6 cursor-pointer'
                )}
                    onClick={onViewCommits}>
                    <div className="flex items-center justify-between mb-4">
                        <div className={studioClass(
                            STUDIO_THEME.colors.success,
                            STUDIO_THEME.rounded.md,
                            'p-3'
                        )}>
                            <GitCommit className="text-white" size={24} />
                        </div>
                        <span className={studioClass(STUDIO_THEME.text.accent, 'text-4xl font-bold')}>
                            {stats.totalCommits}
                        </span>
                    </div>
                    <h3 className={studioClass(STUDIO_THEME.text.secondary, 'text-sm font-bold uppercase tracking-wider')}>
                        Total Commits
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Code pushes and updates.</p>
                </div>
            </div>

            {/* Priority Review Queue Section */}
            <div className="mb-8">
                <h2 className={studioClass(STUDIO_THEME.text.primary, 'text-lg font-bold mb-4 flex items-center gap-2')}>
                    <Clock className="text-amber-500" size={20} /> Priority Review Queue
                </h2>
                {stats.pendingProjects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {stats.pendingProjects.map(project => (
                            <div key={project.id} onClick={() => onViewProject(project)} className="bg-white border-l-4 border-amber-500 rounded-r-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-all flex justify-between items-center group">
                                <div>
                                    <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{project.title}</h4>
                                    <p className="text-xs text-slate-500">by {project.studentName}</p>
                                    <span className="text-[10px] font-bold uppercase text-amber-600 bg-amber-50 px-2 py-1 rounded mt-1 inline-block">Needs Review</span>
                                </div>
                                <button className="bg-amber-100 text-amber-700 p-2 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-8 flex items-center justify-center gap-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                            <CheckCircle size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-700">All Caught Up!</h4>
                            <p className="text-sm text-slate-500">No pending submissions found.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Recent Activity */}
            <div className={studioClass(
                STUDIO_THEME.background.card,
                STUDIO_THEME.border.light,
                STUDIO_THEME.shadow.card,
                STUDIO_THEME.rounded.lg,
                'border p-6'
            )}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className={studioClass(STUDIO_THEME.text.primary, 'text-lg font-bold flex items-center gap-2')}>
                        <GitCommit className="text-indigo-500" size={20} /> Live Studio Activity
                    </h2>
                    <button
                        onClick={onViewCommits}
                        className={studioClass(
                            STUDIO_THEME.text.accent,
                            STUDIO_THEME.text.accentHover,
                            STUDIO_THEME.transition.default,
                            'text-sm font-medium flex items-center gap-2'
                        )}
                    >
                        View Full Feed <ArrowRight size={16} />
                    </button>
                </div>

                {stats.recentCommits.length === 0 ? (
                    <div className="text-center py-12">
                        <GitCommit className={studioClass(STUDIO_THEME.text.tertiary, 'mx-auto mb-4')} size={48} />
                        <p className={STUDIO_THEME.text.secondary}>No recent activity</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {stats.recentCommits.map((commit, idx) => {
                            const project = commit.project as StudentProject;
                            const student = students.find(s => s.id === project.studentId);
                            const step = project.steps?.find(s => s.id === commit.stepId);

                            // Calculate progress for context
                            const progress = project.steps ? Math.round((project.steps.filter(s => s.status === 'done').length / project.steps.length) * 100) : 0;

                            return (
                                <div
                                    key={idx}
                                    className={studioClass(
                                        STUDIO_THEME.glass.light,
                                        STUDIO_THEME.border.light,
                                        STUDIO_THEME.rounded.md,
                                        STUDIO_THEME.transition.default,
                                        'border p-5 hover:border-indigo-300 transition-all group'
                                    )}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200">
                                                {student?.name?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-sm">{student?.name || 'Unknown Student'}</h4>
                                                <p className="text-xs text-slate-500 truncate max-w-[150px]">{project.title}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">STEP</span>
                                            <div className="text-indigo-600 font-bold text-sm">{progress}%</div>
                                        </div>
                                    </div>

                                    <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <p className="text-sm text-slate-700 italic">"{commit.message}"</p>
                                        {step && (
                                            <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                Current: {step.title}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => onViewProject(project)}
                                            className="flex-1 py-2 bg-white border border-slate-200 hover:border-indigo-500 hover:text-indigo-600 text-slate-600 rounded-lg text-xs font-bold transition-all shadow-sm"
                                        >
                                            View Project
                                        </button>
                                        {commit.evidenceLink && (
                                            <button
                                                onClick={() => window.open(commit.evidenceLink, '_blank')}
                                                className="px-3 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors"
                                                title="View Evidence"
                                            >
                                                <ExternalLink size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
