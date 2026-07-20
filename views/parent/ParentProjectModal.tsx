import React from 'react';
import { BookOpen, Calendar, ExternalLink, Image as ImageIcon, Tag, Trophy, User, X } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { StudentProject } from '../../types';
import { formatDate } from '../../utils/helpers';
import { getTheme } from '../../utils/theme';

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
    const originalProjectUrl = project.externalLink || project.presentationUrl || project.embedUrl;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="" size="xl">
            <div className="-m-6 overflow-hidden bg-[#08111F] text-slate-100">
                <header className="relative min-h-56 overflow-hidden border-b border-white/10 md:min-h-64">
                    {coverImage ? (
                        <img src={coverImage} alt={project.title} className="absolute inset-0 h-full w-full object-cover opacity-55" />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                            <theme.icon size={64} className="text-teal-300/20" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-[#08111F]/75" />
                    <button onClick={onClose} aria-label="Close project" title="Close" className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-slate-950/90 text-slate-300 transition-colors hover:bg-slate-900 hover:text-white">
                        <X size={19} />
                    </button>

                    <div className="absolute inset-x-0 bottom-0 z-10 p-6 md:p-8">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/85 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-200">
                                <theme.icon size={12} /> {theme.label}
                            </span>
                            {project.status === 'published' && (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-400/25 bg-teal-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-teal-200">
                                    <Trophy size={12} /> Published work
                                </span>
                            )}
                        </div>
                        <h2 className="max-w-3xl text-2xl font-black leading-tight text-white md:text-3xl">{project.title}</h2>
                        <p className="mt-2 text-xs text-slate-400">A project by {studentName}</p>
                    </div>
                </header>

                <div className="grid gap-8 p-6 md:grid-cols-[minmax(0,1fr)_260px] md:p-8">
                    <main className="min-w-0 space-y-8">
                        <section>
                            <div className="mb-3 flex items-center gap-2 border-b border-white/10 pb-3">
                                <BookOpen size={17} className="text-teal-300" />
                                <h3 className="text-sm font-black text-white">About this project</h3>
                            </div>
                            <p className={`whitespace-pre-wrap text-sm leading-7 ${project.description ? 'text-slate-300' : 'italic text-slate-500'}`}>
                                {project.description || 'No project description has been added yet.'}
                            </p>
                        </section>

                        {project.skillsAcquired && project.skillsAcquired.length > 0 && (
                            <section>
                                <div className="mb-3 flex items-center gap-2 border-b border-white/10 pb-3">
                                    <Tag size={17} className="text-teal-300" />
                                    <h3 className="text-sm font-black text-white">Skills demonstrated</h3>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {project.skillsAcquired.map((skill, index) => (
                                        <span key={`${skill}-${index}`} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-slate-300">{skill}</span>
                                    ))}
                                </div>
                            </section>
                        )}

                        {project.instructorFeedback && (
                            <section>
                                <div className="mb-3 flex items-center gap-2 border-b border-white/10 pb-3">
                                    <User size={17} className="text-amber-200" />
                                    <h3 className="text-sm font-black text-white">Instructor feedback</h3>
                                </div>
                                <blockquote className="border-l-2 border-amber-300/60 pl-4 text-sm italic leading-7 text-amber-100/80">{project.instructorFeedback}</blockquote>
                            </section>
                        )}

                        {project.mediaUrls && project.mediaUrls.length > 0 && (
                            <section>
                                <div className="mb-3 flex items-center gap-2 border-b border-white/10 pb-3">
                                    <ImageIcon size={17} className="text-teal-300" />
                                    <h3 className="text-sm font-black text-white">Project media</h3>
                                    <span className="ml-auto rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-slate-400">{project.mediaUrls.length}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                    {project.mediaUrls.map((url, index) => (
                                        <a key={`${url}-${index}`} href={url} target="_blank" rel="noopener noreferrer" className="group relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-slate-900">
                                            <img src={url} alt={`Project evidence ${index + 1}`} className="h-full w-full object-cover transition-opacity group-hover:opacity-80" />
                                            <ExternalLink size={14} className="absolute right-2 top-2 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                                        </a>
                                    ))}
                                </div>
                            </section>
                        )}
                    </main>

                    <aside className="space-y-5 border-t border-white/10 pt-6 md:border-l md:border-t-0 md:pl-6 md:pt-0">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400"><User size={16} /></div>
                                <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Creator</p><p className="truncate text-sm font-bold text-white">{studentName}</p></div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400"><Calendar size={16} /></div>
                                <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Updated</p><p className="text-sm font-bold text-white">{project.updatedAt ? formatDate(project.updatedAt) : 'Recently'}</p></div>
                            </div>
                        </div>

                        {originalProjectUrl && (
                            <a href={originalProjectUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-teal-300/30 bg-teal-500 px-3.5 py-2 text-sm font-black text-slate-950 transition-colors hover:bg-teal-400">
                                <ExternalLink size={16} /> Open original
                            </a>
                        )}
                    </aside>
                </div>
            </div>
        </Modal>
    );
};
