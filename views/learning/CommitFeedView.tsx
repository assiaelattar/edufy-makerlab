import React, { useState, useMemo } from 'react';
import { GitCommit, ExternalLink, User, Calendar, Filter, Search } from 'lucide-react';
import { StudentProject } from '../../types';
import { STUDIO_THEME, studioClass } from '../../utils/studioTheme';
import { formatDate } from '../../utils/helpers';
import { getTheme } from '../../utils/theme';

interface CommitFeedViewProps {
    studentProjects: StudentProject[];
    students: any[];
    onViewProject: (project: StudentProject) => void;
}

export const CommitFeedView: React.FC<CommitFeedViewProps> = ({
    studentProjects,
    students,
    onViewProject
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStudent, setFilterStudent] = useState<string>('all');

    // Flatten all commits with project context
    const allCommits = useMemo(() => {
        return studentProjects
            .flatMap(project =>
                (project.commits || []).map(commit => ({
                    ...commit,
                    project,
                    student: students.find(s => s.id === project.studentId)
                }))
            )
            .sort((a, b) => {
                const aTime = a.timestamp?.seconds || 0;
                const bTime = b.timestamp?.seconds || 0;
                return bTime - aTime;
            });
    }, [studentProjects, students]);

    // Filter commits
    const filteredCommits = useMemo(() => {
        return allCommits.filter(commit => {
            const matchesSearch =
                commit.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                commit.project.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                commit.student?.name.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStudent =
                filterStudent === 'all' || commit.project.studentId === filterStudent;

            return matchesSearch && matchesStudent;
        });
    }, [allCommits, searchTerm, filterStudent]);

    return (
        <div className={studioClass(STUDIO_THEME.background.main, 'min-h-screen p-8')}>
            {/* Header */}
            <div className="mb-8">
                <h1 className={studioClass(STUDIO_THEME.text.primary, 'text-4xl font-bold mb-2')}>
                    Commit History
                </h1>
                <p className={STUDIO_THEME.text.secondary}>
                    Complete timeline of all student commits across projects
                </p>
            </div>

            {/* Filters */}
            <div className={studioClass(
                STUDIO_THEME.background.card,
                STUDIO_THEME.border.light,
                STUDIO_THEME.shadow.card,
                STUDIO_THEME.rounded.lg,
                'border p-6 mb-6'
            )}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className={studioClass(STUDIO_THEME.text.tertiary, 'absolute left-3 top-1/2 -translate-y-1/2')} size={20} />
                        <input
                            type="text"
                            placeholder="Search commits, projects, or students..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={studioClass(
                                STUDIO_THEME.border.light,
                                STUDIO_THEME.rounded.md,
                                'w-full pl-10 pr-4 py-2 border focus:outline-none focus:ring-2 focus:ring-indigo-500'
                            )}
                        />
                    </div>

                    {/* Student Filter */}
                    <select
                        value={filterStudent}
                        onChange={(e) => setFilterStudent(e.target.value)}
                        className={studioClass(
                            STUDIO_THEME.border.light,
                            STUDIO_THEME.rounded.md,
                            'w-full px-4 py-2 border focus:outline-none focus:ring-2 focus:ring-indigo-500'
                        )}
                    >
                        <option value="all">All Students</option>
                        {students.map(student => (
                            <option key={student.id} value={student.id}>
                                {student.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mt-4 flex items-center gap-4 text-sm">
                    <span className={STUDIO_THEME.text.secondary}>
                        Showing {filteredCommits.length} of {allCommits.length} commits
                    </span>
                </div>
            </div>

            {/* Commit Timeline */}
            <div className="space-y-4">
                {filteredCommits.length === 0 ? (
                    <div className={studioClass(
                        STUDIO_THEME.background.card,
                        STUDIO_THEME.border.light,
                        STUDIO_THEME.shadow.card,
                        STUDIO_THEME.rounded.lg,
                        'border p-12 text-center'
                    )}>
                        <GitCommit className={studioClass(STUDIO_THEME.text.tertiary, 'mx-auto mb-4')} size={48} />
                        <p className={STUDIO_THEME.text.secondary}>
                            {searchTerm || filterStudent !== 'all' ? 'No commits match your filters' : 'No commits yet'}
                        </p>
                    </div>
                ) : (
                    filteredCommits.map((commit, idx) => {
                        const project = commit.project;
                        const student = commit.student;
                        const step = project.steps?.find(s => s.id === commit.stepId);
                        const theme = getTheme(project.station || 'general');

                        return (
                            <div
                                key={idx}
                                className={studioClass(
                                    STUDIO_THEME.background.card,
                                    STUDIO_THEME.border.light,
                                    STUDIO_THEME.shadow.card,
                                    STUDIO_THEME.rounded.lg,
                                    STUDIO_THEME.transition.default,
                                    STUDIO_THEME.shadow.cardHover,
                                    'border p-6 cursor-pointer'
                                )}
                                onClick={() => onViewProject(project)}
                            >
                                <div className="flex items-start gap-4">
                                    {/* Timeline dot */}
                                    <div className="flex flex-col items-center">
                                        <div className={studioClass(
                                            STUDIO_THEME.colors.primary,
                                            STUDIO_THEME.rounded.full,
                                            'w-10 h-10 flex items-center justify-center'
                                        )}>
                                            <GitCommit className="text-white" size={20} />
                                        </div>
                                        {idx < filteredCommits.length - 1 && (
                                            <div className={studioClass(STUDIO_THEME.border.light, 'w-0.5 h-full mt-2 border-l-2')} />
                                        )}
                                    </div>

                                    {/* Commit content */}
                                    <div className="flex-1">
                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <User size={16} className={STUDIO_THEME.text.secondary} />
                                                    <span className={studioClass(STUDIO_THEME.text.primary, 'font-semibold')}>
                                                        {student?.name || 'Unknown Student'}
                                                    </span>
                                                    <span className={STUDIO_THEME.text.tertiary}>committed to</span>
                                                    <span className={studioClass(STUDIO_THEME.text.accent, 'font-medium')}>
                                                        {project.title}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Calendar size={14} className={STUDIO_THEME.text.tertiary} />
                                                    <span className={STUDIO_THEME.text.secondary}>
                                                        {commit.timestamp ? formatDate(new Date(commit.timestamp.seconds * 1000)) : 'Just now'}
                                                    </span>
                                                </div>
                                            </div>
                                            <span
                                                className={studioClass(
                                                    STUDIO_THEME.rounded.sm,
                                                    'text-xs px-2 py-1 border'
                                                )}
                                                style={{
                                                    backgroundColor: `${theme.colorHex}20`,
                                                    borderColor: `${theme.colorHex}40`,
                                                    color: theme.colorHex
                                                }}
                                            >
                                                {project.station}
                                            </span>
                                        </div>

                                        {/* Commit message */}
                                        <p className={studioClass(STUDIO_THEME.text.primary, 'mb-3 font-medium')}>
                                            {commit.message}
                                        </p>

                                        {/* Step and evidence */}
                                        <div className="flex items-center gap-3 flex-wrap">
                                            {step && (
                                                <span className={studioClass(
                                                    STUDIO_THEME.status.active,
                                                    STUDIO_THEME.rounded.sm,
                                                    'text-xs px-2 py-1 border'
                                                )}>
                                                    Step: {step.title}
                                                </span>
                                            )}
                                            {commit.evidenceLink && (
                                                <a
                                                    href={commit.evidenceLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={studioClass(
                                                        STUDIO_THEME.text.accent,
                                                        STUDIO_THEME.text.accentHover,
                                                        STUDIO_THEME.transition.default,
                                                        'text-xs flex items-center gap-1'
                                                    )}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <ExternalLink size={14} />
                                                    View Evidence
                                                </a>
                                            )}
                                        </div>

                                        {/* Step count */}
                                        <div className={studioClass(STUDIO_THEME.text.tertiary, 'text-xs mt-3')}>
                                            {commit.snapshot?.length || 0} steps in this snapshot
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
