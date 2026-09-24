
import React, { useState } from 'react';
import { useFactoryData } from '../../hooks/useFactoryData';
import { Badge } from '../../types';
import { Plus, Trash2, Edit2, Check, X, Award, Zap, Star, Trophy, Target, Crown, Medal } from 'lucide-react';
import { FactoryEmptyState, FactoryPageHeader, factoryButton } from './FactoryPage';

const ICONS = { Award, Zap, Star, Trophy, Target, Crown, Medal };

export const BadgeManager: React.FC = () => {
    const { badges, actions } = useFactoryData();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [form, setForm] = useState<Partial<Badge>>({
        name: '', description: '', color: 'blue', icon: 'Award',
        criteria: { type: 'project_count', target: 'all', count: 1 }
    });

    const handleEdit = (badge: Badge) => {
        setEditingId(badge.id);
        setForm({ ...badge });
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingId(null);
        setForm({
            name: '', description: '', color: 'amber', icon: 'Award',
            criteria: { type: 'project_count', target: 'all', count: 1 }
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.name) return;

        try {
            if (editingId) {
                await actions.updateBadge(editingId, form);
            } else {
                await actions.addBadge(form as any);
            }
            setIsModalOpen(false);
        } catch (e) {
            console.error(e);
            alert("Error saving badge");
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Delete this badge?")) {
            await actions.deleteBadge(id);
        }
    };

    return (
        <div className="space-y-6">
            <FactoryPageHeader
                icon={Award}
                eyebrow="Recognition"
                title="Design achievement badges"
                description="Create clear rewards tied to project completion or demonstrated skills."
                actions={<button type="button" onClick={handleCreate} className={factoryButton.primary}><Plus size={18} /> New badge</button>}
            />

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {badges.map(badge => (
                    <div key={badge.id} className="group relative flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:border-blue-300 hover:shadow-md">
                        <div className={`w-16 h-16 rounded-full bg-${badge.color}-50 text-${badge.color}-500 flex items-center justify-center mb-4 text-3xl shadow-sm border border-${badge.color}-100`}>
                            {/* Simple Icon Mapping */}
                            {React.createElement((ICONS as any)[badge.icon] || Award, { size: 32 })}
                        </div>
                        <h4 className="text-lg font-black text-slate-800 mb-1">{badge.name}</h4>
                        <p className="text-xs text-slate-500 line-clamp-2">{badge.description}</p>

                        <div className="mt-4 pt-4 border-t border-slate-100 w-full">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {badge.criteria.type === 'project_count'
                                    ? `${badge.criteria.count} ${badge.criteria.target === 'all' ? 'Projects' : badge.criteria.target}`
                                    : `Skill: ${badge.criteria.target}`}
                            </span>
                        </div>

                        <div className="absolute right-2 top-2 flex gap-1">
                            <button onClick={() => handleEdit(badge)} className="grid min-h-11 min-w-11 place-items-center rounded-xl bg-white text-slate-400 hover:bg-blue-50 hover:text-blue-700" aria-label={`Edit ${badge.name}`}>
                                <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleDelete(badge.id)} className="grid min-h-11 min-w-11 place-items-center rounded-xl bg-white text-slate-400 hover:bg-red-50 hover:text-red-700" aria-label={`Delete ${badge.name}`}>
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
                {badges.length === 0 && <FactoryEmptyState icon={Award} title="No badges yet" description="Create the first achievement badge and define exactly how learners earn it." action={<button type="button" onClick={handleCreate} className={factoryButton.primary}><Plus size={18} /> Create badge</button>} />}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div role="dialog" aria-modal="true" aria-labelledby="badge-dialog-title" className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-amber-50/50">
                            <h3 id="badge-dialog-title" className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <Award className="text-amber-500" />
                                {editingId ? 'Edit badge' : 'Forge new badge'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close badge editor">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-4 gap-4">
                                <div className="col-span-1 flex items-center justify-center">
                                    <div className={`w-20 h-20 rounded-full bg-${form.color}-100 text-${form.color}-600 flex items-center justify-center border-4 border-${form.color}-200`}>
                                        {React.createElement((ICONS as any)[form.icon || 'Award'] || Award, { size: 40 })}
                                    </div>
                                </div>
                                <div className="col-span-3 space-y-4">
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Badge Name</label>
                                        <input
                                            className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition-all"
                                            placeholder="e.g. Master Builder"
                                            value={form.name}
                                            onChange={e => setForm({ ...form, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Color</label>
                                        <select
                                            className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-medium outline-none"
                                            value={form.color}
                                            onChange={e => setForm({ ...form, color: e.target.value })}
                                        >
                                            <option value="blue">Blue</option>
                                            <option value="amber">Amber/Gold</option>
                                            <option value="slate">Slate/Silver</option>
                                            <option value="yellow">Yellow/Bronze</option>
                                            <option value="purple">Purple</option>
                                            <option value="emerald">Emerald</option>
                                            <option value="rose">Rose</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Description</label>
                                <textarea
                                    className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition-all resize-none h-24"
                                    placeholder="How to earn this badge..."
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                />
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Criteria</label>
                                <div className="flex gap-4 mb-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={form.criteria?.type === 'project_count'}
                                            onChange={() => setForm({ ...form, criteria: { type: 'project_count', target: 'all', count: 1 } })}
                                            className="text-amber-500 focus:ring-amber-500"
                                        />
                                        <span className="text-sm font-bold text-slate-700">Project Count</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={form.criteria?.type === 'skill'}
                                            onChange={() => setForm({ ...form, criteria: { type: 'skill', target: 'Python', count: 1 } })}
                                            className="text-amber-500 focus:ring-amber-500"
                                        />
                                        <span className="text-sm font-bold text-slate-700">Specific Skill</span>
                                    </label>
                                </div>

                                {form.criteria?.type === 'project_count' ? (
                                    <div className="flex gap-3">
                                        <div className="flex-1">
                                            <span className="text-xs text-slate-400 block mb-1">Target Station</span>
                                            <input
                                                className="w-full p-2 rounded-lg border border-slate-300 text-sm font-medium"
                                                value={form.criteria.target}
                                                onChange={e => setForm({ ...form, criteria: { ...form.criteria!, target: e.target.value } })}
                                                placeholder="all"
                                            />
                                        </div>
                                        <div className="w-20">
                                            <span className="text-xs text-slate-400 block mb-1">Count</span>
                                            <input
                                                type="number"
                                                className="w-full p-2 rounded-lg border border-slate-300 text-sm font-medium"
                                                value={form.criteria.count}
                                                onChange={e => setForm({ ...form, criteria: { ...form.criteria!, count: parseInt(e.target.value) } })}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <span className="text-xs text-slate-400 block mb-1">Skill Name</span>
                                        <input
                                            className="w-full p-2 rounded-lg border border-slate-300 text-sm font-medium"
                                            value={form.criteria?.target}
                                            onChange={e => setForm({ ...form, criteria: { ...form.criteria!, target: e.target.value } })}
                                            placeholder="e.g. 3D Design"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 font-bold text-slate-500 hover:text-slate-700 hover:bg-white rounded-xl transition-colors">Cancel</button>
                            <button onClick={handleSave} className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2">
                                <Check size={20} /> Save Badge
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
