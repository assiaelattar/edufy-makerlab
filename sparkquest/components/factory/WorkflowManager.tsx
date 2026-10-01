
import React, { useState } from 'react';
import { useFactoryData } from '../../hooks/useFactoryData';
import { ProcessTemplate, ProcessPhase, Resource } from '../../types';
import { Plus, Trash2, Edit2, GripVertical, Check, X, ArrowRight, LayoutList, ArrowUp, ArrowDown, Clock3, ShieldCheck } from 'lucide-react';
import { FactoryEmptyState, FactoryPageHeader, factoryButton } from './FactoryPage';
import { normalizeWorkflowPhase } from '../../domain/workflowPipeline';

const phaseTone: Record<string, string> = {
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    purple: 'border-purple-200 bg-purple-50 text-purple-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
};

export const WorkflowManager: React.FC = () => {
    const { processTemplates, projectTemplates, actions } = useFactoryData();
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
        if (!form.name?.trim() || !form.phases?.length) return;

        try {
            const payload = {
                name: form.name.trim(),
                description: form.description?.trim() || '',
                phases: form.phases.map((phase, index) => normalizeWorkflowPhase({ ...phase, order: index + 1 }, index)),
                isDefault: Boolean(form.isDefault),
                version: editingId ? Math.max(1, Number(form.version) || 1) + 1 : 1,
                status: form.status || 'published' as const,
                ...(form.organizationId ? { organizationId: form.organizationId } : {}),
            };
            if (editingId) {
                await actions.updateWorkflow(editingId, payload);
            } else {
                await actions.addWorkflow(payload as any);
            }
            setIsModalOpen(false);
        } catch (e) {
            console.error(e);
            alert("Error saving workflow");
        }
    };

    const handleDelete = async (id: string) => {
        const usageCount = projectTemplates.filter(template => template.defaultWorkflowId === id).length;
        if (usageCount > 0) {
            alert(`This workflow is used by ${usageCount} mission${usageCount === 1 ? '' : 's'}. Reassign those missions before deleting it.`);
            return;
        }
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
            objective: '',
            instructions: '',
            checklist: [],
            tools: [],
            materials: [],
            safetyNotes: [],
            evidenceRequirements: [],
            estimatedMinutes: 30,
            required: true,
            resources: []
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

    const movePhase = (idx: number, direction: -1 | 1) => {
        const nextIndex = idx + direction;
        const phases = [...(form.phases || [])];
        if (nextIndex < 0 || nextIndex >= phases.length) return;
        [phases[idx], phases[nextIndex]] = [phases[nextIndex], phases[idx]];
        setForm({ ...form, phases: phases.map((phase, index) => ({ ...phase, order: index + 1 })) });
    };

    return (
        <div className="space-y-6">
            <FactoryPageHeader
                icon={LayoutList}
                eyebrow="Mission builder"
                title="Design repeatable learning workflows"
                description="Create the phases, instructions, and tools students follow inside a mission."
                actions={<button type="button" onClick={handleCreate} className={factoryButton.primary}><Plus size={18} /> New workflow</button>}
            />

            <div className="grid grid-cols-1 gap-4">
                {processTemplates.map(wf => {
                    const usageCount = projectTemplates.filter(template => template.defaultWorkflowId === wf.id).length;
                    return (
                    <div key={wf.id} className="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h4 className="text-lg font-bold text-slate-800">{wf.name}</h4>
                                    {wf.isDefault && (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-wide">Default</span>
                                    )}
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500">v{wf.version || 1}</span>
                                </div>
                                <p className="text-slate-500 text-sm mt-1 max-w-xl">{wf.description}</p>
                                <p className="mt-2 text-xs font-bold text-slate-400">{usageCount} mission{usageCount === 1 ? '' : 's'} using this workflow</p>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => handleEdit(wf)} className="grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-400 hover:bg-blue-50 hover:text-blue-700" aria-label={`Edit ${wf.name}`}>
                                    <Edit2 size={18} />
                                </button>
                                <button onClick={() => handleDelete(wf.id)} className="grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-700" aria-label={`Delete ${wf.name}`}>
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Visualization of Steps */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {wf.phases?.slice().sort((a, b) => a.order - b.order).map((phase, idx) => (
                                <div key={idx} className="flex items-center shrink-0">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border font-bold shadow-sm ${phaseTone[phase.color] || phaseTone.blue}`}>
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
                )})}
                {processTemplates.length === 0 && <FactoryEmptyState icon={LayoutList} title="No workflows yet" description="Create a reusable sequence of phases, tools, and evidence requirements for your missions." action={<button type="button" onClick={handleCreate} className={factoryButton.primary}><Plus size={18} /> Create workflow</button>} />}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div role="dialog" aria-modal="true" aria-labelledby="workflow-dialog-title" className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 id="workflow-dialog-title" className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <LayoutList className="text-indigo-500" />
                                {editingId ? 'Edit workflow' : 'New workflow'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close workflow editor">
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
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider">Phases and learner tasks</label>
                                    <button onClick={addPhase} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                                        <Plus size={14} /> Add Phase
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {form.phases?.map((phase, idx) => (
                                        <div key={phase.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-indigo-300">
                                            <div className="flex items-center gap-3">
                                                <div className="text-slate-300"><GripVertical size={20} /></div>
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

                                            <div className="grid gap-3 pl-12 md:grid-cols-2">
                                                <label className="text-xs font-black uppercase tracking-wide text-slate-500 md:col-span-2">What students achieve
                                                    <input value={phase.objective || ''} onChange={e => updatePhase(idx, 'objective', e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold normal-case tracking-normal text-slate-700 outline-none focus:border-indigo-500" placeholder="Example: Define the problem in one clear sentence" />
                                                </label>
                                                <label className="text-xs font-black uppercase tracking-wide text-slate-500 md:col-span-2">Instructions
                                                    <textarea value={phase.instructions || ''} onChange={e => updatePhase(idx, 'instructions', e.target.value)} className="mt-1 min-h-20 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium normal-case tracking-normal text-slate-700 outline-none focus:border-indigo-500" placeholder="Short, direct instructions the learner can follow" />
                                                </label>
                                                <label className="text-xs font-black uppercase tracking-wide text-slate-500">Checklist · one per line
                                                    <textarea value={(phase.checklist || []).join('\n')} onChange={e => updatePhase(idx, 'checklist', e.target.value.split('\n'))} className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium normal-case tracking-normal text-slate-700 outline-none focus:border-indigo-500" placeholder={'Sketch one idea\nAsk for feedback'} />
                                                </label>
                                                <label className="text-xs font-black uppercase tracking-wide text-slate-500">Tools · one per line
                                                    <textarea value={(phase.tools || []).join('\n')} onChange={e => updatePhase(idx, 'tools', e.target.value.split('\n'))} className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium normal-case tracking-normal text-slate-700 outline-none focus:border-indigo-500" placeholder={'Laptop\nWire cutter'} />
                                                </label>
                                                <label className="text-xs font-black uppercase tracking-wide text-slate-500">Materials · one per line
                                                    <textarea value={(phase.materials || []).join('\n')} onChange={e => updatePhase(idx, 'materials', e.target.value.split('\n'))} className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium normal-case tracking-normal text-slate-700 outline-none focus:border-indigo-500" placeholder={'Cardboard\nCopper tape'} />
                                                </label>
                                                <label className="text-xs font-black uppercase tracking-wide text-slate-500">Safety · one per line
                                                    <textarea value={(phase.safetyNotes || []).join('\n')} onChange={e => updatePhase(idx, 'safetyNotes', e.target.value.split('\n'))} className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium normal-case tracking-normal text-slate-700 outline-none focus:border-indigo-500" placeholder="Ask a mentor before using powered tools" />
                                                </label>
                                                <label className="text-xs font-black uppercase tracking-wide text-slate-500 md:col-span-2">Proof students must add
                                                    <input value={phase.evidenceRequirements?.[0]?.prompt || ''} onChange={e => updatePhase(idx, 'evidenceRequirements', e.target.value ? [{ id: `${phase.id}-proof`, type: phase.evidenceRequirements?.[0]?.type || 'any', prompt: e.target.value, required: true }] : [])} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold normal-case tracking-normal text-slate-700 outline-none focus:border-indigo-500" placeholder="Example: Add a photo of the tested prototype" />
                                                </label>
                                                <div className="flex flex-wrap items-center gap-3 md:col-span-2">
                                                    <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500"><Clock3 size={15} /> Time
                                                        <input type="number" min="5" step="5" value={phase.estimatedMinutes || 30} onChange={e => updatePhase(idx, 'estimatedMinutes', Number(e.target.value))} className="w-20 rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-700" /> min
                                                    </label>
                                                    <label className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600"><ShieldCheck size={15} className="text-emerald-600" /><input type="checkbox" checked={phase.required !== false} onChange={e => updatePhase(idx, 'required', e.target.checked)} /> Required phase</label>
                                                    <div className="ml-auto flex gap-1">
                                                        <button type="button" onClick={() => movePhase(idx, -1)} disabled={idx === 0} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-30" aria-label={`Move ${phase.name} up`}><ArrowUp size={16} /></button>
                                                        <button type="button" onClick={() => movePhase(idx, 1)} disabled={idx === (form.phases?.length || 0) - 1} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-30" aria-label={`Move ${phase.name} down`}><ArrowDown size={16} /></button>
                                                    </div>
                                                </div>
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
