
import React, { useDeferredValue, useState } from 'react';
import { useFactoryData } from '../../hooks/useFactoryData';
import { ProjectEditor } from './ProjectEditor';
import { AssignMissionModal } from './AssignMissionModal';
import { MissionGallery } from './MissionGallery';
import { Plus, Edit2, Trash2, Search, Users, Eye, Send, FilePlus, BookOpen, CircleDot } from 'lucide-react';
import { FactoryEmptyState } from './FactoryPage';

interface ProjectManagerProps {
    onViewSubmissions?: (templateId: string) => void;
    onPreviewProject?: (templateId: string) => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({ onViewSubmissions, onPreviewProject }) => {
    const { projectTemplates, actions } = useFactoryData();
    const [editingProject, setEditingProject] = useState<any | null>(null);
    const [assigningProject, setAssigningProject] = useState<any | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [showSourceModal, setShowSourceModal] = useState(false);
    const [showGallerySelector, setShowGallerySelector] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'assigned'>('all');
    const deferredSearchTerm = useDeferredValue(searchTerm);

    const handleCreateClick = () => {
        setShowSourceModal(true);
    };

    const handleCreateBlank = () => {
        setEditingProject(null);
        setIsEditorOpen(true);
        setShowSourceModal(false);
    };

    const handleOpenGallery = () => {
        setShowGallerySelector(true);
        setShowSourceModal(false);
    };

    const handleSelectTemplate = (template: any) => {
        const newMission = {
            ...template,
            id: undefined,
            title: `Copy of ${template.title}`,
            status: 'draft'
        };
        setEditingProject(newMission);
        setIsEditorOpen(true);
        setShowGallerySelector(false);
    };

    const handleEdit = (project: any) => {
        setEditingProject(project);
        setIsEditorOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Deleting this mission will permanently delete all student submissions and history associated with it.\n\nAre you sure you want to proceed?")) {
            await actions.deleteProjectTemplate(id);
        }
    };

    // Filter projects
    const filteredProjects = projectTemplates.filter(p => {
        const matchesSearch = p.title?.toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
            p.station?.toLowerCase().includes(deferredSearchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'draft' ? (!p.status || p.status === 'draft') : ['assigned', 'featured'].includes(p.status || ''));
        return matchesSearch && matchesStatus;
    });

    const audienceSummary = (project: any) => {
        const audience = project.targetAudience || {};
        if (audience.students?.length) return `${audience.students.length} student${audience.students.length === 1 ? '' : 's'}`;
        if (audience.groups?.length) return `${audience.groups.length} group target${audience.groups.length === 1 ? '' : 's'}`;
        if (audience.grades?.length) return `${audience.grades.length} grade${audience.grades.length === 1 ? '' : 's'}`;
        return 'No audience';
    };

    if (isEditorOpen) {
        return <ProjectEditor templateId={editingProject?.id} initialViewProject={editingProject} onClose={() => setIsEditorOpen(false)} />;
    }

    return (
        <div className="mx-auto max-w-[1320px] space-y-6 p-4 pb-24 sm:p-7 md:pb-8">
            <div className="flex flex-col gap-5 rounded-[28px] bg-[#10233f] p-6 text-white shadow-xl shadow-slate-900/10 sm:flex-row sm:items-end sm:justify-between sm:p-8">
                <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-sky-300">Mission library</p>
                    <h3 className="mt-2 text-3xl font-black tracking-tight">Build, target, assign</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Create the learning brief, then assign it to a grade, selected groups, or specific learners. Assignment never changes Edufy enrollments.</p>
                </div>
                <button
                    onClick={handleCreateClick}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#ffb000] px-6 font-black text-slate-950 transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                    <Plus size={20} /> New Mission
                </button>
            </div>

            {/* SOURCE SELECTION MODAL */}
            {showSourceModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowSourceModal(false)}>
                    <div role="dialog" aria-modal="true" aria-labelledby="create-mission-title" className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8" onClick={e => e.stopPropagation()}>
                        <h3 id="create-mission-title" className="mb-6 text-center text-2xl font-black text-slate-800">Create New Mission</h3>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                            <button
                                onClick={handleCreateBlank}
                                className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all group text-center"
                            >
                                <div className="w-20 h-20 rounded-full bg-slate-100 group-hover:bg-indigo-200 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                                    <FilePlus size={40} />
                                </div>
                                <div>
                                    <h4 className="text-xl font-bold text-slate-800 group-hover:text-indigo-700">Blank Mission</h4>
                                    <p className="text-sm text-slate-500 mt-2">Start from scratch with an empty canvas.</p>
                                </div>
                            </button>

                            <button
                                onClick={handleOpenGallery}
                                className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border-2 border-slate-100 hover:border-purple-500 hover:bg-purple-50 transition-all group text-center"
                            >
                                <div className="w-20 h-20 rounded-full bg-slate-100 group-hover:bg-purple-200 flex items-center justify-center text-slate-400 group-hover:text-purple-600 transition-colors">
                                    <BookOpen size={40} />
                                </div>
                                <div>
                                    <h4 className="text-xl font-bold text-slate-800 group-hover:text-purple-700">From Gallery</h4>
                                    <p className="text-sm text-slate-500 mt-2">Select a template from the mission library.</p>
                                </div>
                            </button>
                        </div>
                        <button onClick={() => setShowSourceModal(false)} className="w-full mt-6 py-3 text-slate-400 font-bold hover:text-slate-600">Cancel</button>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="relative block flex-1">
                    <span className="sr-only">Search missions</span>
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                    <input
                        className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-base font-semibold text-slate-800 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100"
                        placeholder="Search missions by title or station"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </label>
                <div className="flex gap-2" aria-label="Filter missions by status">
                    {[
                        ['all', 'All'],
                        ['draft', 'Drafts'],
                        ['assigned', 'Assigned'],
                    ].map(([id, label]) => (
                        <button key={id} onClick={() => setStatusFilter(id as typeof statusFilter)} className={`min-h-11 rounded-xl px-4 text-sm font-bold transition ${statusFilter === id ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{label}</button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProjects.map(project => (
                    <article
                        key={project.id}
                        onClick={() => onPreviewProject && onPreviewProject(project.id)}
                        onKeyDown={event => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                onPreviewProject?.(project.id);
                            }
                        }}
                        role="button"
                        tabIndex={0}
                        className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-blue-300 hover:shadow-md"
                    >

                        {/* COVER IMAGE */}
                        <div className="h-40 relative bg-slate-100 overflow-hidden">
                            {project.thumbnailUrl ? (
                                <img
                                    src={project.thumbnailUrl}
                                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                                    alt=""
                                    loading="lazy"
                                />
                            ) : (
                                <div className="relative flex h-full w-full items-center justify-center bg-slate-900">
                                    <div className="text-white/20">
                                        <Users size={64} />
                                    </div>
                                </div>
                            )}

                            {/* Overlay Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

                            {/* Top Actions */}
                            <div className="absolute top-3 right-3 flex gap-1 z-10">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onPreviewProject && onPreviewProject(project.id); }}
                                    className="grid min-h-11 min-w-11 place-items-center rounded-xl bg-white/90 text-slate-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-blue-700"
                                    aria-label={`Preview ${project.title}`}
                                >
                                    <Eye size={14} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleEdit(project); }}
                                    className="grid min-h-11 min-w-11 place-items-center rounded-xl bg-white/90 text-slate-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-blue-700"
                                    aria-label={`Edit ${project.title}`}
                                >
                                    <Edit2 size={14} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}
                                    className="grid min-h-11 min-w-11 place-items-center rounded-xl bg-white/90 text-slate-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-red-50 hover:text-red-600"
                                    aria-label={`Delete ${project.title}`}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            {/* Station Badge (Bottom Left) */}
                            <div className="absolute bottom-3 left-3">
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider backdrop-blur-md border border-white/20 text-white shadow-sm
                                    ${project.station === 'Coding' ? 'bg-blue-500/80' :
                                        project.station === 'Robotics' ? 'bg-red-500/80' :
                                            'bg-indigo-500/80'}`}>
                                    {project.station}
                                </span>
                            </div>
                            <div className="absolute bottom-3 right-3 rounded-lg border border-white/20 bg-slate-950/75 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-sm">
                                {project.status || 'draft'}
                            </div>
                        </div>

                        <div className="p-5 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="text-lg font-bold text-slate-800 line-clamp-2 leading-tight">{project.title || 'Untitled Mission'}</h4>
                            </div>
                            <p className="text-sm text-slate-500 mb-6 line-clamp-3 flex-1">{project.description || 'No description provided.'}</p>

                            <div className="mb-4 flex items-center gap-2 text-xs font-bold text-slate-500">
                                <CircleDot size={14} className={project.targetAudience?.grades?.length || project.targetAudience?.students?.length ? 'text-emerald-600' : 'text-slate-300'} />
                                {audienceSummary(project)}
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setAssigningProject(project); }}
                                    className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                                >
                                    <Send size={16} />
                                    Assign audience
                                </button>
                            </div>
                        </div>
                    </article>
                ))}

                {/* Empty State */}
                {filteredProjects.length === 0 && <FactoryEmptyState icon={BookOpen} title="No missions match" description="Clear the filters or create the first mission for this organization." action={<button type="button" onClick={handleCreateClick} className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-black text-white hover:bg-blue-700">Create mission</button>} />}
            </div>

            {/* ASSIGN MODAL */}
            {assigningProject && (
                <AssignMissionModal
                    mission={assigningProject}
                    onClose={() => setAssigningProject(null)}
                />
            )}
        </div>
    );
};
