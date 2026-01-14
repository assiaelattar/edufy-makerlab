
import React, { useState } from 'react';
import { useFactoryData } from '../../hooks/useFactoryData';
import { ProjectEditor } from './ProjectEditor';
import { Plus, Edit2, Trash2, Search, Users, Eye } from 'lucide-react';

interface ProjectManagerProps {
    onViewSubmissions?: (templateId: string) => void;
    onPreviewProject?: (templateId: string) => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({ onViewSubmissions, onPreviewProject }) => {
    const { projectTemplates, studentProjects, actions, availableGrades } = useFactoryData();
    const [editingProject, setEditingProject] = useState<any | null>(null); // Using any temporarily to avoid strict type refactoring if ProjectTemplate isn't imported deeply, but logic assumes it matches.
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const handleCreate = () => {
        setEditingProject(null);
        setIsEditorOpen(true);
    };

    const handleEdit = (project: any) => {
        setEditingProject(project);
        setIsEditorOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("⚠️ DANGER ZONE ⚠️\n\nDeleting this mission will PERMANENTLY DELETE ALL student submissions and history associated with it.\n\nAre you sure you want to proceed?")) {
            await actions.deleteProjectTemplate(id);
        }
    };

    // Filter projects
    const filteredProjects = projectTemplates.filter(p =>
        p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.station?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isEditorOpen) {
        return <ProjectEditor templateId={editingProject?.id} initialViewProject={editingProject} onClose={() => setIsEditorOpen(false)} />;
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight">Mission Control</h3>
                    <p className="text-slate-500 font-medium text-lg">Design and deployment of learning missions.</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-1"
                >
                    <Plus size={20} /> New Mission
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                    className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-600 outline-none focus:border-indigo-500 transition-all"
                    placeholder="Search missions by title or station..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProjects.map(project => (
                    <div
                        key={project.id}
                        onClick={() => onPreviewProject && onPreviewProject(project.id)}
                        className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:border-indigo-400 transition-all flex flex-col h-full relative cursor-pointer"
                    >

                        {/* COVER IMAGE */}
                        <div className="h-40 relative bg-slate-100 overflow-hidden">
                            {project.thumbnailUrl ? (
                                <img
                                    src={project.thumbnailUrl}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                            ) : (
                                <div className={`w-full h-full flex items-center justify-center relative
                                    ${project.station === 'Robotics' ? 'bg-gradient-to-br from-red-500 to-orange-600' :
                                        project.station === 'Coding' ? 'bg-gradient-to-br from-blue-500 to-cyan-600' :
                                            project.station === 'Design' ? 'bg-gradient-to-br from-purple-500 to-pink-600' :
                                                project.station === 'Circuits' ? 'bg-gradient-to-br from-yellow-400 to-amber-600' :
                                                    'bg-gradient-to-br from-indigo-500 to-blue-600'
                                    }`}>
                                    <div className="text-white/20 transform scale-150 rotate-12">
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
                                    className="p-1.5 bg-white/90 hover:bg-white text-slate-700 hover:text-indigo-600 rounded-lg shadow-sm backdrop-blur-sm transition-colors"
                                    title="View Mission Details"
                                >
                                    <Eye size={14} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleEdit(project); }}
                                    className="p-1.5 bg-white/90 hover:bg-white text-slate-700 rounded-lg shadow-sm backdrop-blur-sm transition-colors"
                                    title="Edit Mission"
                                >
                                    <Edit2 size={14} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}
                                    className="p-1.5 bg-white/90 hover:bg-red-50 text-slate-700 hover:text-red-500 rounded-lg shadow-sm backdrop-blur-sm transition-colors"
                                    title="Delete Mission"
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
                        </div>

                        <div className="p-5 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="text-lg font-bold text-slate-800 line-clamp-2 leading-tight">{project.title || 'Untitled Mission'}</h4>
                            </div>
                            <p className="text-sm text-slate-500 mb-6 line-clamp-3 flex-1">{project.description || 'No description provided.'}</p>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Station</span>
                                    <span className="text-sm font-bold text-slate-700">{project.station || 'General'}</span>
                                </div>

                                {/* GRADE BADGES */}
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">Target</span>
                                    <div className="flex flex-wrap gap-1 justify-center max-w-[120px]">
                                        {project.targetAudience?.grades && project.targetAudience.grades.length > 0 ? (
                                            project.targetAudience.grades.map((gradeId: any) => {
                                                const gradeName = availableGrades.find(g => String(g.id) === String(gradeId))?.name;
                                                return gradeName ? (
                                                    <span key={gradeId} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 font-bold">
                                                        {gradeName}
                                                    </span>
                                                ) : null;
                                            })
                                        ) : (
                                            <span className="text-[10px] text-slate-400 italic">Generic</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Difficulty</span>
                                    <span className={`text-sm font-bold capitalize ${project.difficulty === 'advanced' ? 'text-purple-600' :
                                        project.difficulty === 'intermediate' ? 'text-indigo-600' :
                                            'text-emerald-600'
                                        }`}>{project.difficulty || 'Beginner'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Empty State */}
                {filteredProjects.length === 0 && (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl">
                        <p className="text-slate-400 font-bold text-lg">No missions found.</p>
                        <button onClick={handleCreate} className="mt-4 text-indigo-600 font-bold hover:underline">
                            Create your first mission
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
