import React, { useState, useMemo } from 'react';
import { GitCommit, ExternalLink, User, Calendar, Search, Activity } from 'lucide-react';
import { StudentProject } from '../../types';
import { formatDate } from '../../utils/helpers';
import { getTheme } from '../../utils/theme';
import { AtlasCommandHeader, AtlasEmptyState, AtlasSignalCard, AtlasToolbar } from '../../components/atlas/AtlasSurface';

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
        <div className="space-y-5 pb-8">
            <AtlasCommandHeader eyebrow="Studio activity" title="Commit history" description="Follow learner checkpoints across every active project and open the work with its full context." icon={GitCommit} />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <AtlasSignalCard label="All commits" value={allCommits.length} detail="Saved project checkpoints" icon={GitCommit} tone="teal" />
                <AtlasSignalCard label="Current view" value={filteredCommits.length} detail="Matching filters" icon={Search} tone="blue" />
                <AtlasSignalCard label="Contributors" value={new Set(allCommits.map(commit => commit.project.studentId)).size} detail="Learners with activity" icon={User} tone="emerald" />
                <AtlasSignalCard label="Projects moving" value={new Set(allCommits.map(commit => commit.project.id)).size} detail="Projects with commits" icon={Activity} tone="amber" />
            </div>

            {/* Filters */}
            <AtlasToolbar trailing={<span className="text-xs font-bold text-slate-500">{filteredCommits.length} of {allCommits.length} commits</span>}>
                <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search commits, projects, or students..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="min-h-10 w-full rounded-lg border border-white/10 bg-slate-900 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                        />
                    </div>

                    {/* Student Filter */}
                    <select
                        value={filterStudent}
                        onChange={(e) => setFilterStudent(e.target.value)}
                        className="min-h-10 w-full rounded-lg border border-white/10 bg-slate-900 px-3 text-sm text-slate-200 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                    >
                        <option value="all">All Students</option>
                        {students.map(student => (
                            <option key={student.id} value={student.id}>
                                {student.name}
                            </option>
                        ))}
                    </select>
                </div>

            </AtlasToolbar>

            {/* Commit Timeline */}
            <div className="space-y-4">
                {filteredCommits.length === 0 ? (
                    <AtlasEmptyState title={searchTerm || filterStudent !== 'all' ? 'No commits match this view' : 'No project checkpoints yet'} description={searchTerm || filterStudent !== 'all' ? 'Clear the search or choose another learner.' : 'Saved project versions will appear here as learners make progress.'} icon={GitCommit} />
                ) : (
                    filteredCommits.map((commit, idx) => {
                        const project = commit.project;
                        const student = commit.student;
                        const step = project.steps?.find(s => s.id === commit.stepId);
                        const theme = getTheme(project.station || 'general');

                        return (
                            <div
                                key={idx}
                                className="cursor-pointer rounded-lg border border-white/10 bg-slate-900/75 p-4 transition-colors hover:border-teal-300/35 hover:bg-slate-900 sm:p-5"
                                onClick={() => onViewProject(project)}
                            >
                                <div className="flex items-start gap-4">
                                    {/* Timeline dot */}
                                    <div className="flex flex-col items-center">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-400/10">
                                            <GitCommit className="text-teal-300" size={20} />
                                        </div>
                                        {idx < filteredCommits.length - 1 && (
                                            <div className="mt-2 h-full w-px bg-white/10" />
                                        )}
                                    </div>

                                    {/* Commit content */}
                                    <div className="flex-1">
                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <User size={16} className="text-slate-500" />
                                                    <span className="font-bold text-white">
                                                        {student?.name || 'Unknown Student'}
                                                    </span>
                                                    <span className="text-slate-500">committed to</span>
                                                    <span className="font-bold text-teal-300">
                                                        {project.title}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Calendar size={14} className="text-slate-600" />
                                                    <span className="font-mono text-xs text-slate-500">
                                                        {commit.timestamp ? formatDate(new Date(commit.timestamp.seconds * 1000)) : 'Just now'}
                                                    </span>
                                                </div>
                                            </div>
                                            <span
                                                className="rounded-md border px-2 py-1 text-[10px] font-bold uppercase"
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
                                        <p className="mb-3 text-sm font-medium leading-6 text-slate-200">
                                            {commit.message}
                                        </p>

                                        {/* Step and evidence */}
                                        <div className="flex items-center gap-3 flex-wrap">
                                            {step && (
                                                <span className="rounded-md border border-teal-400/20 bg-teal-400/10 px-2 py-1 text-xs text-teal-200">
                                                    Step: {step.title}
                                                </span>
                                            )}
                                            {commit.evidenceLink && (
                                                <a
                                                    href={commit.evidenceLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-xs font-bold text-teal-300 hover:text-teal-200"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <ExternalLink size={14} />
                                                    View Evidence
                                                </a>
                                            )}
                                        </div>

                                        {/* Step count */}
                                        <div className="mt-3 font-mono text-[11px] text-slate-600">
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
