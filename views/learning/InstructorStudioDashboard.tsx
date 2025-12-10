import React, { useMemo } from 'react';
import { Users, GitCommit, CheckCircle, Clock, TrendingUp, Eye, Filter } from 'lucide-react';
import { StudentProject } from '../../types';
import { STUDIO_THEME, studioClass } from '../../utils/studioTheme';
import { formatDate } from '../../utils/helpers';

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

        const pendingReviews = studentProjects.reduce((sum, p) => {
            const pendingSteps = p.steps?.filter(s =>
                s.approvalStatus === 'pending'
            ).length || 0;
            return sum + pendingSteps;
        }, 0);

        const recentCommits = studentProjects
            .flatMap(p => (p.commits || []).map(c => ({ ...c, project: p })))
            .sort((a, b) => {
                const aTime = a.timestamp?.seconds || 0;
                const bTime = b.timestamp?.seconds || 0;
                return bTime - aTime;
            })
            .slice(0, 5);

        return {
            activeProjects: activeProjects.length,
            totalCommits,
            pendingReviews,
            activeStudents: new Set(activeProjects.map(p => p.studentId)).size,
            recentCommits
        };
    }, [studentProjects]);

    return (
        <div className={studioClass(STUDIO_THEME.background.main, 'min-h-screen p-8')}>
            {/* Header */}
            <div className="mb-8">
                <h1 className={studioClass(STUDIO_THEME.text.primary, 'text-4xl font-bold mb-2')}>
                    Instructor Studio
                </h1>
                <p className={STUDIO_THEME.text.secondary}>
                    Monitor student progress, review commits, and approve project steps
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                        <span className={studioClass(STUDIO_THEME.text.accent, 'text-3xl font-bold')}>
                            {stats.activeProjects}
                        </span>
                    </div>
                    <h3 className={studioClass(STUDIO_THEME.text.secondary, 'text-sm font-medium')}>
                        Active Projects
                    </h3>
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
                        <span className={studioClass(STUDIO_THEME.text.accent, 'text-3xl font-bold')}>
                            {stats.activeStudents}
                        </span>
                    </div>
                    <h3 className={studioClass(STUDIO_THEME.text.secondary, 'text-sm font-medium')}>
                        Active Students
                    </h3>
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
                        <span className={studioClass(STUDIO_THEME.text.accent, 'text-3xl font-bold')}>
                            {stats.totalCommits}
                        </span>
                    </div>
                    <h3 className={studioClass(STUDIO_THEME.text.secondary, 'text-sm font-medium')}>
                        Total Commits
                    </h3>
                </div>

                {/* Pending Reviews */}
                <div className={studioClass(
                    STUDIO_THEME.background.card,
                    STUDIO_THEME.border.light,
                    STUDIO_THEME.shadow.card,
                    STUDIO_THEME.rounded.lg,
                    STUDIO_THEME.transition.default,
                    STUDIO_THEME.background.cardHover,
                    'border p-6 cursor-pointer'
                )}
                    onClick={onViewReviews}>
                    <div className="flex items-center justify-between mb-4">
                        <div className={studioClass(
                            STUDIO_THEME.colors.warning,
                            STUDIO_THEME.rounded.md,
                            'p-3'
                        )}>
                            <Clock className="text-white" size={24} />
                        </div>
                        <span className={studioClass(STUDIO_THEME.text.accent, 'text-3xl font-bold')}>
                            {stats.pendingReviews}
                        </span>
                    </div>
                    <h3 className={studioClass(STUDIO_THEME.text.secondary, 'text-sm font-medium')}>
                        Pending Reviews
                    </h3>
                </div>
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
                    <h2 className={studioClass(STUDIO_THEME.text.primary, 'text-2xl font-bold')}>
                        Recent Commits
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
                        View All <Eye size={16} />
                    </button>
                </div>

                {stats.recentCommits.length === 0 ? (
                    <div className="text-center py-12">
                        <GitCommit className={studioClass(STUDIO_THEME.text.tertiary, 'mx-auto mb-4')} size={48} />
                        <p className={STUDIO_THEME.text.secondary}>No commits yet</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {stats.recentCommits.map((commit, idx) => {
                            const project = commit.project as StudentProject;
                            const student = students.find(s => s.id === project.studentId);
                            const step = project.steps?.find(s => s.id === commit.stepId);

                            return (
                                <div
                                    key={idx}
                                    className={studioClass(
                                        STUDIO_THEME.glass.light,
                                        STUDIO_THEME.border.light,
                                        STUDIO_THEME.rounded.md,
                                        STUDIO_THEME.transition.default,
                                        'border p-4 hover:scale-[1.01] cursor-pointer'
                                    )}
                                    onClick={() => onViewProject(project)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={studioClass(STUDIO_THEME.text.primary, 'font-semibold')}>
                                                    {student?.name || 'Unknown Student'}
                                                </span>
                                                <span className={STUDIO_THEME.text.tertiary}>•</span>
                                                <span className={STUDIO_THEME.text.secondary}>
                                                    {project.title}
                                                </span>
                                            </div>
                                            <p className={studioClass(STUDIO_THEME.text.secondary, 'text-sm mb-2')}>
                                                {commit.message}
                                            </p>
                                            {step && (
                                                <span className={studioClass(
                                                    STUDIO_THEME.status.active,
                                                    STUDIO_THEME.rounded.sm,
                                                    'text-xs px-2 py-1 border inline-block'
                                                )}>
                                                    {step.title}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className={studioClass(STUDIO_THEME.text.tertiary, 'text-xs')}>
                                                {commit.timestamp ? formatDate(new Date(commit.timestamp.seconds * 1000)) : 'Just now'}
                                            </p>
                                            {commit.evidenceLink && (
                                                <a
                                                    href={commit.evidenceLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={studioClass(
                                                        STUDIO_THEME.text.accent,
                                                        STUDIO_THEME.text.accentHover,
                                                        'text-xs mt-1 inline-block'
                                                    )}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    View Evidence →
                                                </a>
                                            )}
                                        </div>
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
