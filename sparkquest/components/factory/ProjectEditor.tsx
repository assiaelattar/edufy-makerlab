
import React, { useState } from 'react';
import { useFactoryData } from '../../hooks/useFactoryData';
import { ProjectTemplate, StationType } from '../../types';
import { Save, X, ArrowRight, ArrowLeft, Layout, Database, Users, Rocket, Check, Plus, Trash2, Link, Video, FileText } from 'lucide-react';

interface ProjectEditorProps {
    templateId?: string | null;
    initialViewProject?: ProjectTemplate;
    onClose: () => void;
}

const TABS = ['details', 'resources', 'targeting', 'publishing'];

export const ProjectEditor: React.FC<ProjectEditorProps> = ({ templateId, initialViewProject, onClose }) => {
    const { projectTemplates, stations, processTemplates, availableGrades, availableGroups, programs, actions } = useFactoryData();

    // Initialize Form
    const defaults = {
        title: '',
        description: '',
        difficulty: 'beginner' as const,
        skills: [],
        station: 'Robotics' as StationType,
        resources: [],
        status: 'draft' as const,
        targetAudience: { grades: [], groups: [] },
        defaultWorkflowId: ''
    };

    // Prioritize passed project data, then lookup, then defaults
    const sourceData = initialViewProject || (templateId ? projectTemplates.find(t => t.id === templateId) : null);

    const initialData = sourceData || defaults;

    // Deep merge defaults with initialData to ensure no undefined objects
    const mergedData = {
        ...defaults,
        ...initialData,
        targetAudience: { ...defaults.targetAudience, ...(initialData?.targetAudience || {}) }
    };

    // Smart grade matching: If grade IDs don't match availableGrades, use first available grade
    if (mergedData.targetAudience?.grades?.length > 0 && availableGrades.length > 0) {
        const matchedGrades: string[] = [];
        mergedData.targetAudience.grades.forEach(gradeId => {
            // Try exact ID match first
            const exactMatch = availableGrades.find(g => g.id === gradeId);
            if (exactMatch) {
                matchedGrades.push(gradeId);
                console.log(`[ProjectEditor] ✓ Exact match for grade ID: ${gradeId}`);
            } else {
                // Fallback: Use the first available grade ID
                // This happens when creating from a different program's grade
                if (availableGrades.length > 0) {
                    const fallbackGrade = availableGrades[0];
                    matchedGrades.push(fallbackGrade.id);
                    console.warn(`[ProjectEditor] Grade ID ${gradeId} not found, using fallback: ${fallbackGrade.name} (${fallbackGrade.id})`);
                } else {
                    // Keep original ID if no grades available
                    matchedGrades.push(gradeId);
                }
            }
        });
        mergedData.targetAudience.grades = matchedGrades;
    }

    const [form, setForm] = useState<Partial<ProjectTemplate>>(mergedData);
    const [activeTab, setActiveTab] = useState('details');

    // Debug: Log initial data
    console.log('[ProjectEditor] Initialized with:', {
        templateId,
        initialViewProject,
        mergedData: mergedData.targetAudience,
        availableGrades: availableGrades.map(g => ({ id: g.id, name: g.name })),
        preSelectedGrades: mergedData.targetAudience?.grades,
        matchFound: mergedData.targetAudience?.grades?.map(gradeId =>
            availableGrades.find(g => g.id === gradeId) ? 'MATCH' : 'NO MATCH for ' + gradeId
        )
    });

    const handleSave = async () => {
        try {
            console.log('💾 [ProjectEditor] Saving mission with targetAudience:', {
                grades: form.targetAudience?.grades,
                gradeNames: form.targetAudience?.grades?.map(gradeId =>
                    availableGrades.find(g => g.id === gradeId)?.name || `Unknown (${gradeId})`
                ),
                groups: form.targetAudience?.groups
            });

            if (templateId) {
                await actions.updateProjectTemplate(templateId, form);
            } else {
                await actions.addProjectTemplate(form as any);
            }
            onClose();
        } catch (e) {
            console.error(e);
            alert("Error saving project template");
        }
    };

    const handleDelete = async () => {
        if (!templateId) return;
        if (confirm("Are you sure you want to PERMANENTLY delete this mission?\n\nWARNING: This will also delete ALL student submissions associated with this mission. This action cannot be undone.")) {
            try {
                await actions.deleteProjectTemplate(templateId);
                onClose();
            } catch (e) {
                console.error("Error deleting project:", e);
                alert("Failed to delete project");
            }
        }
    };

    // Helper for navigation
    const nextTab = () => {
        const idx = TABS.indexOf(activeTab);
        if (idx < TABS.length - 1) setActiveTab(TABS[idx + 1]);
    };

    const prevTab = () => {
        const idx = TABS.indexOf(activeTab);
        if (idx > 0) setActiveTab(TABS[idx - 1]);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={24} />
                    </button>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            {templateId ? 'Edit Project' : 'New Project'}
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">v1.1</span>
                        </h2>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{activeTab}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    {templateId && (
                        <button
                            onClick={handleDelete}
                            className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold transition-all"
                        >
                            <Trash2 size={18} /> <span className="hidden md:inline">Delete</span>
                        </button>
                    )}
                    <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all">
                        <Save size={18} /> Save & Close
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex px-8 border-b border-slate-200 bg-white shrink-0">
                {TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === tab
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full">

                {/* DETAILS TAB */}
                {activeTab === 'details' && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="col-span-2">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Project Title</label>
                                <input
                                    className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl font-black text-2xl text-slate-800 outline-none focus:border-indigo-500 transition-all"
                                    placeholder="e.g. Mars Rover Expedition"
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Station</label>
                                <select
                                    className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-500"
                                    value={form.station}
                                    onChange={e => setForm({ ...form, station: e.target.value as any })}
                                >
                                    {stations.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Difficulty</label>
                                <div className="flex gap-2">
                                    {['beginner', 'intermediate', 'advanced'].map(d => (
                                        <button
                                            key={d}
                                            onClick={() => setForm({ ...form, difficulty: d as any })}
                                            className={`flex-1 py-3 rounded-xl font-bold uppercase text-xs border-2 transition-all ${form.difficulty === d
                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                                : 'border-slate-200 bg-white text-slate-400 hover:border-indigo-200'
                                                }`}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="col-span-2">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Mission Briefing</label>
                                <textarea
                                    className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl font-medium text-slate-600 outline-none focus:border-indigo-500 h-40 resize-none"
                                    placeholder="Describe the mission objectives..."
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Process Workflow</label>
                                <select
                                    className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-500"
                                    value={form.defaultWorkflowId || ''}
                                    onChange={e => setForm({ ...form, defaultWorkflowId: e.target.value })}
                                >
                                    <option value="">-- Let Student Choose --</option>
                                    {processTemplates.map(wf => (
                                        <option key={wf.id} value={wf.id}>{wf.name}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-400 mt-2">If selected, students will skip the workflow selection screen.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* RESOURCES TAB */}
                {activeTab === 'resources' && (
                    <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                        <div className="bg-indigo-50 p-6 rounded-2xl border-2 border-indigo-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-indigo-900">Resource Library</h3>
                                <p className="text-sm text-indigo-700">Attach videos, links, and files to help students.</p>
                            </div>
                            <div>
                                <h3 className="font-bold text-indigo-900">Resource Library</h3>
                                <p className="text-sm text-indigo-700">Attach videos, links, and files to help students.</p>
                            </div>
                        </div>

                        {/* Add Resource Form */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Add New Resource</h4>
                            <div className="flex gap-2">
                                <input
                                    placeholder="Resource Title (e.g. Tutorial Video)"
                                    className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-indigo-500"
                                    id="new-res-title"
                                />
                                <select className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none" id="new-res-type">
                                    <option value="link">Link 🔗</option>
                                    <option value="video">Video 🎥</option>
                                    <option value="file">File 📄</option>
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    placeholder="URL (https://...)"
                                    className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 font-mono"
                                    id="new-res-url"
                                />
                                <button
                                    onClick={() => {
                                        const titleEl = document.getElementById('new-res-title') as HTMLInputElement;
                                        const urlEl = document.getElementById('new-res-url') as HTMLInputElement;
                                        const typeEl = document.getElementById('new-res-type') as HTMLSelectElement;

                                        if (titleEl.value && urlEl.value) {
                                            setForm({
                                                ...form,
                                                resources: [...(form.resources || []), {
                                                    id: Date.now().toString(),
                                                    title: titleEl.value,
                                                    url: urlEl.value,
                                                    type: typeEl.value as any
                                                }]
                                            });
                                            titleEl.value = '';
                                            urlEl.value = '';
                                        }
                                    }}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-2 whitespace-nowrap"
                                >
                                    <Plus size={16} /> Add
                                </button>
                            </div>

                            <div className="space-y-3">
                                {form.resources?.map((res, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                                                {res.type === 'video' ? <Video size={20} /> : res.type === 'file' ? <FileText size={20} /> : <Link size={20} />}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800">{res.title}</h4>
                                                <p className="text-xs text-slate-400">{res.url}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const newRes = [...(form.resources || [])];
                                                newRes.splice(idx, 1);
                                                setForm({ ...form, resources: newRes });
                                            }}
                                            className="text-slate-300 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                ))}
                                {(!form.resources || form.resources.length === 0) && (
                                    <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                                        No resources attached.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* TARGETING TAB */}
                {activeTab === 'targeting' && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-300">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Target Grades</label>
                            <div className="flex flex-wrap gap-3">
                                {availableGrades.length > 0 ? availableGrades.map(g => {
                                    const isSelected = form.targetAudience?.grades?.includes(g.id);
                                    return (
                                        <button
                                            key={g.id}
                                            onClick={() => {
                                                const current = form.targetAudience?.grades || [];
                                                const newGrades = isSelected ? current.filter(id => id !== g.id) : [...current, g.id];
                                                setForm({ ...form, targetAudience: { ...form.targetAudience, grades: newGrades } });
                                            }}
                                            className={`px-5 py-3 rounded-xl font-bold flex items-center gap-2 border-2 transition-all ${isSelected
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105'
                                                : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                                                }`}
                                        >
                                            {isSelected && <Check size={16} />}
                                            {g.name}
                                        </button>
                                    );
                                }) : (
                                    <p className="text-slate-400 italic">No grades found in Programs.</p>
                                )}
                            </div>
                        </div>

                        {/* Target Groups */}
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Target Groups (Optional)</label>
                            <p className="text-xs text-slate-500 mb-3 italic">Leave empty to target all groups in selected grades</p>
                            <div className="flex flex-wrap gap-3">
                                {(() => {
                                    // Get groups only from selected grades
                                    const selectedGradeIds = form.targetAudience?.grades || [];
                                    const gradeSpecificGroups: string[] = [];

                                    if (selectedGradeIds.length > 0 && programs.length > 0) {
                                        // Find the grades in programs and extract their groups
                                        programs.forEach(program => {
                                            if (program.grades) {
                                                program.grades.forEach((grade: any) => {
                                                    if (selectedGradeIds.includes(grade.id)) {
                                                        // This grade is selected, add its groups
                                                        if (grade.groups && Array.isArray(grade.groups)) {
                                                            grade.groups.forEach((group: any) => {
                                                                if (group.name && !gradeSpecificGroups.includes(group.name)) {
                                                                    gradeSpecificGroups.push(group.name);
                                                                }
                                                            });
                                                        }
                                                    }
                                                });
                                            }
                                        });
                                    }

                                    return gradeSpecificGroups.length > 0 ? (
                                        <>
                                            {/* All Groups Option */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setForm({ ...form, targetAudience: { ...form.targetAudience, groups: [] } });
                                                }}
                                                className={`px-5 py-3 rounded-xl font-bold flex items-center gap-2 border-2 transition-all ${(!form.targetAudience?.groups || form.targetAudience.groups.length === 0)
                                                    ? 'bg-purple-600 text-white border-purple-600 shadow-md transform scale-105'
                                                    : 'bg-white text-slate-500 border-slate-200 hover:border-purple-300'
                                                    }`}
                                            >
                                                {(!form.targetAudience?.groups || form.targetAudience.groups.length === 0) && <Check size={16} />}
                                                All Groups
                                            </button>

                                            {/* Individual Groups */}
                                            {gradeSpecificGroups.map(groupName => {
                                                const isSelected = form.targetAudience?.groups?.includes(groupName);
                                                return (
                                                    <button
                                                        key={groupName}
                                                        type="button"
                                                        onClick={() => {
                                                            const current = form.targetAudience?.groups || [];
                                                            const newGroups = isSelected ? current.filter(g => g !== groupName) : [...current, groupName];
                                                            setForm({ ...form, targetAudience: { ...form.targetAudience, groups: newGroups } });
                                                        }}
                                                        className={`px-5 py-3 rounded-xl font-bold flex items-center gap-2 border-2 transition-all ${isSelected
                                                            ? 'bg-purple-600 text-white border-purple-600 shadow-md transform scale-105'
                                                            : 'bg-white text-slate-500 border-slate-200 hover:border-purple-300'
                                                            }`}
                                                    >
                                                        {isSelected && <Check size={16} />}
                                                        {groupName}
                                                    </button>
                                                );
                                            })}
                                        </>
                                    ) : selectedGradeIds.length > 0 ? (
                                        <p className="text-slate-400 italic">No groups found for selected grades.</p>
                                    ) : (
                                        <p className="text-slate-400 italic">Please select a grade first to see available groups.</p>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )}

                {/* PUBLISHING TAB */}
                {activeTab === 'publishing' && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { id: 'draft', label: 'Draft', desc: 'Hidden from students', icon: Layout, color: 'slate' },
                                { id: 'featured', label: 'Featured', desc: 'Promoted in the library', icon: Rocket, color: 'amber' },
                                { id: 'assigned', label: 'Assigned', desc: 'Active for targeted grades', icon: Users, color: 'emerald' }
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => setForm({ ...form, status: opt.id as any })}
                                    className={`relative p-8 rounded-2xl border-2 text-left transition-all ${form.status === opt.id
                                        ? `border-${opt.color}-500 bg-${opt.color}-50`
                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                        }`}
                                >
                                    <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center ${form.status === opt.id ? `bg-${opt.color}-500 text-white` : 'bg-slate-100 text-slate-400'
                                        }`}>
                                        <opt.icon size={24} />
                                    </div>
                                    <h3 className={`text-xl font-black ${form.status === opt.id ? `text-${opt.color}-900` : 'text-slate-800'}`}>
                                        {opt.label}
                                    </h3>
                                    <p className={`text-sm mt-1 font-medium ${form.status === opt.id ? `text-${opt.color}-700` : 'text-slate-500'}`}>
                                        {opt.desc}
                                    </p>
                                    {form.status === opt.id && (
                                        <div className={`absolute top-4 right-4 text-${opt.color}-500`}>
                                            <Check size={24} />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Navigation */}
            <div className="p-6 border-t border-slate-200 bg-white flex justify-between shrink-0">
                <button
                    onClick={prevTab}
                    disabled={activeTab === 'details'}
                    className="flex items-center gap-2 px-6 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                    <ArrowLeft size={20} /> Previous
                </button>
                <button
                    onClick={nextTab}
                    disabled={activeTab === 'publishing'}
                    className="flex items-center gap-2 px-6 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                    Next <ArrowRight size={20} />
                </button>
            </div>
        </div >
    );
};
