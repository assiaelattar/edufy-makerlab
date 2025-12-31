
import React, { useState } from 'react';
import { useFactoryData } from '../../hooks/useFactoryData';
import { ProcessTemplate, ProcessPhase, Resource } from '../../types';
import { Plus, Trash2, Edit2, GripVertical, Check, X, ArrowRight, LayoutList } from 'lucide-react';

// Default tools available in every workflow step
const DEFAULT_TOOLS: Resource[] = [
    { id: 'gemini', title: 'Gemini AI Assistant', type: 'link', url: 'https://gemini.google.com' },
    { id: 'chatgpt', title: 'ChatGPT', type: 'link', url: 'https://chat.openai.com' },
    { id: 'tldraw', title: 'TLDraw Whiteboard', type: 'link', url: 'https://tldraw.com' }
];

export const WorkflowManager: React.FC = () => {
    const { processTemplates, actions } = useFactoryData();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [form, setForm] = useState<Partial<ProcessTemplate>>({
        name: '', description: '', phases: []
    });

    // Resource Input State (to avoid prompt)
    const [activeResourcePhase, setActiveResourcePhase] = useState<number | null>(null);
    const [resourceForm, setResourceForm] = useState({ title: '', url: '' });

    const handleEdit = (wf: ProcessTemplate) => {
        setEditingId(wf.id);
        setForm({ ...wf });
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingId(null);
        setForm({ name: '', description: '', phases: [], isDefault: false });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.name || !form.phases) return;

        try {
            if (editingId) {
                await actions.updateWorkflow(editingId, form);
            } else {
                await actions.addWorkflow(form as any);
            }
            setIsModalOpen(false);
        } catch (e) {
            console.error(e);
            alert("Error saving workflow");
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Delete this workflow? This cannot be undone.")) {
            await actions.deleteWorkflow(id);
        }
    };

    // Phase Management
    const addPhase = () => {
        const newPhase: ProcessPhase = {
            id: Date.now().toString(),
            name: 'New Phase',
            color: 'blue',
            icon: 'Circle',
            order: (form.phases?.length || 0) + 1,
            description: '',
            resources: DEFAULT_TOOLS  // 🎯 Auto-add default tools to every phase
        };
        setForm({ ...form, phases: [...(form.phases || []), newPhase] });
    };

    const updatePhase = (idx: number, field: keyof ProcessPhase, value: any) => {
        const newPhases = [...(form.phases || [])];
        newPhases[idx] = { ...newPhases[idx], [field]: value };
        setForm({ ...form, phases: newPhases });
    };

    const removePhase = (idx: number) => {
        const newPhases = [...(form.phases || [])];
        newPhases.splice(idx, 1);
        setForm({ ...form, phases: newPhases });
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h3 className="text-2xl font-black text-slate-800">Process Architect</h3>
                    <p className="text-slate-500 font-medium">Design the learning journeys for your students.</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-1"
                >
                    <Plus size={20} /> New Workflow
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {processTemplates.map(wf => (
                    <div key={wf.id} className="group relative bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-xl transition-all hover:border-indigo-400">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h4 className="text-lg font-bold text-slate-800">{wf.name}</h4>
                                    {wf.isDefault && (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-wide">Default</span>
                                    )}
                                </div>
                                <p className="text-slate-500 text-sm mt-1 max-w-xl">{wf.description}</p>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(wf)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                    <Edit2 size={18} />
                                </button>
                                <button onClick={() => handleDelete(wf.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Visualization of Steps */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {wf.phases?.sort((a, b) => a.order - b.order).map((phase, idx) => (
                                <div key={idx} className="flex items-center shrink-0">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-${phase.color}-600 bg-${phase.color}-50 border border-${phase.color}-200 font-bold shadow-sm`}>
                                            {idx + 1}
                                        </div>
                                        <span className="text-xs font-bold text-slate-600">{phase.name}</span>
                                    </div>
                                    {idx < (wf.phases.length - 1) && (
                                        <div className="w-8 h-0.5 bg-slate-200 mx-2 mb-4"></div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <LayoutList className="text-indigo-500" />
                                {editingId ? 'Edit Workflow' : 'New Workflow'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Workflow Name</label>
                                    <input
                                        className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                        placeholder="e.g. Design Thinking"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Description</label>
                                    <input
                                        className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                        placeholder="Short description..."
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider">Phases & Steps</label>
                                    <button onClick={addPhase} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                                        <Plus size={14} /> Add Phase
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {form.phases?.map((phase, idx) => (
                                        <div key={idx} className="flex flex-col gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 group hover:border-indigo-300 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="cursor-move text-slate-400 hover:text-slate-600"><GripVertical size={20} /></div>
                                                <div className="w-10 h-10 shrink-0 flex items-center justify-center bg-white rounded-lg border border-slate-200 font-black text-slate-400">
                                                    {idx + 1}
                                                </div>
                                                <input
                                                    className="flex-1 bg-transparent font-bold text-slate-700 outline-none border-b border-transparent focus:border-indigo-500 px-1"
                                                    placeholder="Phase Name"
                                                    value={phase.name}
                                                    onChange={e => updatePhase(idx, 'name', e.target.value)}
                                                />
                                                <select
                                                    className="bg-white border border-slate-200 text-xs font-medium rounded-lg px-2 py-2 outline-none"
                                                    value={phase.color}
                                                    onChange={e => updatePhase(idx, 'color', e.target.value)}
                                                >
                                                    <option value="slate">Slate</option>
                                                    <option value="blue">Blue</option>
                                                    <option value="indigo">Indigo</option>
                                                    <option value="purple">Purple</option>
                                                    <option value="amber">Amber</option>
                                                    <option value="emerald">Green</option>
                                                    <option value="rose">Red</option>
                                                </select>
                                                <button onClick={() => removePhase(idx)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            {/* Resources Section */}
                                            <div className="pl-12">
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {phase.resources?.map((res, rIdx) => (
                                                        <div key={rIdx} className="flex items-center gap-2 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600">
                                                            <span>🔗 {res.title}</span>
                                                            <button
                                                                onClick={() => {
                                                                    const newRes = [...(phase.resources || [])];
                                                                    newRes.splice(rIdx, 1);
                                                                    updatePhase(idx, 'resources', newRes);
                                                                }}
                                                                className="text-red-400 hover:text-red-600"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        setActiveResourcePhase(idx);
                                                        setResourceForm({ title: '', url: '' });
                                                    }}
                                                    className="text-xs font-bold text-slate-400 hover:text-indigo-500 flex items-center gap-1 mt-2"
                                                >
                                                    <Plus size={12} /> Add Tool/Resource
                                                </button>

                                                {/* Inline Resource Form */}
                                                {activeResourcePhase === idx && (
                                                    <div className="mt-2 p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg animate-in slide-in-from-top-2">
                                                        <div className="flex flex-col gap-2">
                                                            <input
                                                                placeholder="Resource Name (e.g. Tldraw)"
                                                                className="text-xs p-2 border border-slate-200 rounded-md outline-none focus:border-indigo-400"
                                                                value={resourceForm.title}
                                                                onChange={e => setResourceForm({ ...resourceForm, title: e.target.value })}
                                                                autoFocus
                                                            />
                                                            <input
                                                                placeholder="URL (https://...)"
                                                                className="text-xs p-2 border border-slate-200 rounded-md outline-none focus:border-indigo-400"
                                                                value={resourceForm.url}
                                                                onChange={e => setResourceForm({ ...resourceForm, url: e.target.value })}
                                                            />
                                                            <div className="flex gap-2 justify-end">
                                                                <button
                                                                    onClick={() => setActiveResourcePhase(null)}
                                                                    className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        if (!resourceForm.title || !resourceForm.url) return;
                                                                        const newRes = [...(phase.resources || []), {
                                                                            id: Date.now().toString(),
                                                                            title: resourceForm.title,
                                                                            url: resourceForm.url,
                                                                            type: 'link' as const
                                                                        }];
                                                                        updatePhase(idx, 'resources', newRes);
                                                                        setActiveResourcePhase(null);
                                                                    }}
                                                                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-md"
                                                                >
                                                                    Add
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {(!form.phases || form.phases.length === 0) && (
                                        <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                                            No phases added yet. Click "Add Phase" to start.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 font-bold text-slate-500 hover:text-slate-700 hover:bg-white rounded-xl transition-colors">Cancel</button>
                            <button onClick={handleSave} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2">
                                <Check size={20} /> Save Workflow
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
