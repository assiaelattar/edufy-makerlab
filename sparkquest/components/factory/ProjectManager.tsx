
import React, { useState } from 'react';
import { useFactoryData } from '../../hooks/useFactoryData';
import { ProjectEditor } from './ProjectEditor';
import { Plus, Edit2, Trash2, Search, Users } from 'lucide-react';

interface ProjectManagerProps {
    onViewSubmissions?: (templateId: string) => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({ onViewSubmissions }) => {
    const { projectTemplates, studentProjects, actions } = useFactoryData();
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
                    <div key={project.id} className="group bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-xl hover:border-indigo-400 transition-all flex flex-col h-full">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${project.station === 'Coding' ? 'bg-blue-100 text-blue-700' :
                                    project.station === 'Robotics' ? 'bg-red-100 text-red-700' :
                                        'bg-slate-100 text-slate-700'
                                    }`}>
                                    {project.station}
                                </span>
                                {/* Submission Counter Badge */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); onViewSubmissions && onViewSubmissions(project.id); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors border border-indigo-100"
                                    title="View Student Submissions"
                                >
                                    <Users size={14} className="fill-indigo-700/20" />
                                    <span className="text-xs font-bold">
                                        {studentProjects?.filter(sp => sp.templateId === project.id).length || 0}
                                    </span>
                                </button>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleEdit(project); }}
                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    title="Edit Mission"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete Mission"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        <h4 className="text-xl font-bold text-slate-800 mb-2 line-clamp-2">{project.title || 'Untitled Mission'}</h4>
                        <p className="text-sm text-slate-500 mb-6 line-clamp-3 flex-1">{project.description || 'No description provided.'}</p>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Station</span>
                                <span className="text-sm font-bold text-slate-700">{project.station || 'General'}</span>
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
