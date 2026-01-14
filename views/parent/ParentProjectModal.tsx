import React from 'react';
import { ExternalLink, X, BookOpen, Trophy, Calendar, User, Tag, PlayCircle, Image as ImageIcon } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { StudentProject } from '../../types';
import { getTheme } from '../../utils/theme';
import { formatDate } from '../../utils/helpers';

interface ParentProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: StudentProject | null;
    studentName: string;
}

export const ParentProjectModal: React.FC<ParentProjectModalProps> = ({ isOpen, onClose, project, studentName }) => {
    if (!project) return null;

    const theme = getTheme(project.station);
    const coverImage = (project as any).thumbnailUrl || project.mediaUrls?.[0];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="" size="xl">
            <div className="-m-6">
                {/* Hero Section */}
                <div className="relative h-64 md:h-80 bg-slate-900 overflow-hidden">
                    {coverImage ? (
                        <>
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10" />
                            <img
                                src={coverImage}
                                alt={project.title}
                                className="w-full h-full object-cover opacity-80"
                            />
                        </>
                    ) : (
                        <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-600 to-violet-600`}>
                            <theme.icon size={80} className="text-white/20" />
                        </div>
                    )}

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-20 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-md transition-colors"
                    >
                        <X size={24} />
                    </button>

                    <div className="absolute bottom-0 left-0 right-0 p-8 z-20">
                        <div className="flex items-center gap-3 mb-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-black/50 backdrop-blur border border-white/20 text-white flex items-center gap-2`}>
                                <theme.icon size={12} />
                                {theme.label}
                            </span>
                            {project.status === 'published' && (
                                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                                    <Trophy size={12} /> Published Work
                                </span>
                            )}
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-white leading-tight drop-shadow-md">
                            {project.title}
                        </h2>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 bg-slate-50 min-h-[400px]">
                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Main Info */}
                        <div className="flex-1 space-y-8">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                                    <BookOpen size={20} className="text-indigo-600" />
                                    About this Project
                                </h3>
                                <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    {project.description ? (
                                        <p className="whitespace-pre-wrap">{project.description}</p>
                                    ) : (
                                        <p className="italic text-slate-400">No description provided.</p>
                                    )}
                                </div>
                            </div>

                            {/* Skills / Tags */}
                            {project.skillsAcquired && project.skillsAcquired.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                                        <Tag size={20} className="text-fuchsia-600" />
                                        Skills & Disciplines
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {project.skillsAcquired.map((skill, idx) => (
                                            <span
                                                key={idx}
                                                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-bold shadow-sm hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Instructor Feedback (Optional) */}
                            {project.instructorFeedback && (
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                                        <User size={20} className="text-amber-500" />
                                        Instructor Feedback
                                    </h3>
                                    <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl text-amber-900 italic relative">
                                        <div className="absolute -top-3 left-6 w-6 h-6 bg-amber-50 border-t border-l border-amber-100 rotate-45"></div>
                                        "{project.instructorFeedback}"
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sidebar / Actions */}
                        <div className="w-full md:w-80 shrink-0 space-y-6">
                            {/* Meta Card */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                <div className="flex items-center gap-3 text-slate-600">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase">Creator</p>
                                        <p className="font-bold">{studentName}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-slate-600">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                                        <Calendar size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase">Published On</p>
                                        <p className="font-bold">{project.updatedAt ? formatDate(project.updatedAt) : 'Recent'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-3">
                                {(project.externalLink || project.presentationUrl || project.embedUrl) && (
                                    <a
                                        href={project.externalLink || project.presentationUrl || project.embedUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 hover:-translate-y-1 transition-all"
                                    >
                                        <ExternalLink size={20} />
                                        View Original Project
                                    </a>
                                )}

                                {project.mediaUrls && project.mediaUrls.length > 0 && (
                                    <button className="w-full py-4 bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                                        <ImageIcon size={20} />
                                        View All Media ({project.mediaUrls.length})
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
