import React from 'react';
import { Modal } from '../../components/Modal';
import { ProjectTemplate, StationType, Grade } from '../../types';
import { STATION_THEMES } from '../../utils/theme';
import { STUDIO_THEME, studioClass } from '../../utils/studioTheme';
import { Database, Play, ExternalLink, List, Trash2, Lock, Star, Rocket, Plus, X, Check } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

interface ProjectFactoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingTemplateId: string | null;
    templateForm: Partial<ProjectTemplate>;
    setTemplateForm: (form: Partial<ProjectTemplate>) => void;
    handleSaveTemplate: (e: React.FormEvent) => Promise<void>;
    activeModalTab: 'details' | 'resources' | 'targeting' | 'publishing';
    setActiveModalTab: (tab: 'details' | 'resources' | 'targeting' | 'publishing') => void;
    availableGrades: Grade[];
    availableGroups: string[];
    wizardStep: number;
    WIZARD_STEPS: any[];
}

export const ProjectFactoryModal: React.FC<ProjectFactoryModalProps> = ({
    isOpen, onClose, editingTemplateId, templateForm, setTemplateForm, handleSaveTemplate,
    activeModalTab, setActiveModalTab, availableGrades, availableGroups, wizardStep, WIZARD_STEPS
}) => {

    const INPUT_CLASS = studioClass("w-full p-4 border-2 rounded-xl outline-none transition-all font-bold", STUDIO_THEME.background.card, STUDIO_THEME.border.light, STUDIO_THEME.text.primary, "focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400");
    const LABEL_CLASS = "block text-xs font-black text-slate-400 uppercase tracking-wider mb-2";

    const tabs = ['details', 'resources', 'targeting', 'publishing'];
    const currentTabIndex = tabs.indexOf(activeModalTab);
    const isFirstTab = currentTabIndex === 0;
    const isLastTab = currentTabIndex === tabs.length - 1;

    const handleNext = () => {
        if (!isLastTab) {
            setActiveModalTab(tabs[currentTabIndex + 1] as any);
        }
    };

    const handlePrevious = () => {
        if (!isFirstTab) {
            setActiveModalTab(tabs[currentTabIndex - 1] as any);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={editingTemplateId ? "✏️ Edit Project" : "✨ Create New Project"} size="xl">
            <form onSubmit={handleSaveTemplate} className="flex flex-col h-[80vh] md:h-auto">
                {/* Tabs */}
                <div className="flex items-center justify-between border-b border-slate-200 shrink-0 px-6 pt-2">
                    <div className="flex overflow-x-auto">
                        {tabs.map(tab => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveModalTab(tab as any)}
                                className={`px-6 py-4 text-sm font-bold capitalize transition-all border-b-2 whitespace-nowrap ${activeModalTab === tab ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ml-4"
                    >
                        💾 Save Draft
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {/* DETAILS TAB */}
                    {activeModalTab === 'details' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                <div className="md:col-span-12">
                                    <label className={LABEL_CLASS}>Project Title</label>
                                    <input required className={INPUT_CLASS} value={templateForm.title} onChange={e => setTemplateForm({ ...templateForm, title: e.target.value })} placeholder="e.g. Mars Rover Expedition" />
                                </div>
                                <div className="md:col-span-6">
                                    <label className={LABEL_CLASS}>Station / Category</label>
                                    <select className={INPUT_CLASS} value={templateForm.station} onChange={e => setTemplateForm({ ...templateForm, station: e.target.value as any })}>
                                        {Object.keys(STATION_THEMES).map(k => <option key={k} value={k}>{STATION_THEMES[k as StationType].label}</option>)}
                                    </select>
                                </div>
                                <div className="md:col-span-6">
                                    <label className={LABEL_CLASS}>Difficulty</label>
                                    <select className={INPUT_CLASS} value={templateForm.difficulty} onChange={e => setTemplateForm({ ...templateForm, difficulty: e.target.value as any })}>
                                        <option value="beginner">Beginner</option>
                                        <option value="intermediate">Intermediate</option>
                                        <option value="advanced">Advanced</option>
                                    </select>
                                </div>
                                <div className="md:col-span-12">
                                    <label className={LABEL_CLASS}>Description</label>
                                    <textarea className={`${INPUT_CLASS} h-32 resize-none`} value={templateForm.description} onChange={e => setTemplateForm({ ...templateForm, description: e.target.value })} placeholder="Describe the mission..." />
                                </div>
                                <div className="md:col-span-12">
                                    <label className={LABEL_CLASS}>Skills (comma separated)</label>
                                    <input className={INPUT_CLASS} value={Array.isArray(templateForm.skills) ? templateForm.skills.join(', ') : templateForm.skills} onChange={e => setTemplateForm({ ...templateForm, skills: e.target.value as any })} placeholder="Logic, Python, Design..." />
                                </div>
                                <div className="md:col-span-12">
                                    <label className={LABEL_CLASS}>Mandatory Steps (comma separated)</label>
                                    <input className={INPUT_CLASS} value={Array.isArray(templateForm.defaultSteps) ? templateForm.defaultSteps.join(', ') : templateForm.defaultSteps} onChange={e => setTemplateForm({ ...templateForm, defaultSteps: e.target.value as any })} placeholder="Research, Design, Prototype, Test..." />
                                </div>
                            </div>

                            {/* Navigation Buttons */}
                            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                                >
                                    Next: Resources →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* RESOURCES TAB */}
                    {activeModalTab === 'resources' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-200">
                                <h4 className={studioClass("text-sm font-bold mb-4 flex items-center gap-2", STUDIO_THEME.text.primary)}>
                                    <Database size={16} className="text-indigo-500" /> Attached Resources
                                </h4>

                                <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                    {templateForm.resources?.map((res, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-white p-4 rounded-xl border-2 border-slate-100 group hover:border-indigo-200 transition-all shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                                    {res.type === 'video' ? <Play size={16} className="text-red-500" /> : res.type === 'link' ? <ExternalLink size={16} className="text-blue-500" /> : <List size={16} className="text-amber-500" />}
                                                </div>
                                                <div>
                                                    <p className={studioClass("text-sm font-bold", STUDIO_THEME.text.primary)}>{res.title}</p>
                                                    <p className="text-xs text-slate-400 truncate max-w-[200px]">{res.url}</p>
                                                </div>
                                            </div>
                                            <button type="button" onClick={() => {
                                                const newRes = [...(templateForm.resources || [])];
                                                newRes.splice(idx, 1);
                                                setTemplateForm({ ...templateForm, resources: newRes });
                                            }} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                    {(!templateForm.resources || templateForm.resources.length === 0) && (
                                        <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl bg-white">
                                            <p className="text-sm text-slate-400 font-medium">No resources added yet.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Add Resource Inputs */}
                                <div className="bg-white p-4 rounded-xl border-2 border-slate-200 shadow-sm">
                                    <h5 className="text-xs font-bold text-slate-400 uppercase mb-3">Add New Resource</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                        <div className="md:col-span-4">
                                            <input id="res-title" placeholder="Resource Title" className={INPUT_CLASS} />
                                        </div>
                                        <div className="md:col-span-3">
                                            <select id="res-type" className={INPUT_CLASS}>
                                                <option value="link">Link</option>
                                                <option value="video">Video</option>
                                                <option value="file">File</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-5 flex gap-2">
                                            <input id="res-url" placeholder="URL" className={`${INPUT_CLASS} flex-1`} />
                                            <button type="button" onClick={() => {
                                                const title = (document.getElementById('res-title') as HTMLInputElement).value;
                                                const type = (document.getElementById('res-type') as HTMLSelectElement).value as any;
                                                const url = (document.getElementById('res-url') as HTMLInputElement).value;
                                                if (title && url) {
                                                    setTemplateForm({ ...templateForm, resources: [...(templateForm.resources || []), { id: Date.now().toString(), title, type, url }] });
                                                    (document.getElementById('res-title') as HTMLInputElement).value = '';
                                                    (document.getElementById('res-url') as HTMLInputElement).value = '';
                                                }
                                            }} className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
                                                <Plus size={24} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Navigation Buttons */}
                            <div className="flex justify-between gap-3 pt-6 mt-6 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={handlePrevious}
                                    className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors flex items-center gap-2"
                                >
                                    ← Back: Details
                                </button>
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                                >
                                    Next: Targeting →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* TARGETING TAB */}
                    {activeModalTab === 'targeting' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                            <div>
                                <label className={LABEL_CLASS}>Target Grades</label>
                                <div className="flex flex-wrap gap-3">
                                    {availableGrades.length > 0 ? availableGrades.map(g => (
                                        <button
                                            key={g.id}
                                            type="button"
                                            onClick={() => {
                                                const current = templateForm.targetAudience?.grades || [];
                                                const newGrades = current.includes(g.id) ? current.filter(x => x !== g.id) : [...current, g.id];
                                                setTemplateForm({ ...templateForm, targetAudience: { ...templateForm.targetAudience, grades: newGrades } });
                                            }}
                                            className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all flex items-center gap-2 ${templateForm.targetAudience?.grades?.includes(g.id) ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-500'}`}
                                        >
                                            {templateForm.targetAudience?.grades?.includes(g.id) && <Check size={14} />}
                                            {g.name}
                                        </button>
                                    )) : (
                                        <p className="text-sm text-slate-500 italic">No active grades found. Please check Programs.</p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className={LABEL_CLASS}>Target Groups</label>
                                <div className="flex flex-wrap gap-3">
                                    {availableGroups.length > 0 ? availableGroups.map(g => (
                                        <button
                                            key={g}
                                            type="button"
                                            onClick={() => {
                                                const current = templateForm.targetAudience?.groups || [];
                                                const newGroups = current.includes(g) ? current.filter(x => x !== g) : [...current, g];
                                                setTemplateForm({ ...templateForm, targetAudience: { ...templateForm.targetAudience, groups: newGroups } });
                                            }}
                                            className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all flex items-center gap-2 ${templateForm.targetAudience?.groups?.includes(g) ? 'bg-purple-50 border-purple-500 text-purple-600' : 'bg-white border-slate-200 text-slate-500 hover:border-purple-300 hover:text-purple-500'}`}
                                        >
                                            {templateForm.targetAudience?.groups?.includes(g) && <Check size={14} />}
                                            {g}
                                        </button>
                                    )) : (
                                        <p className="text-sm text-slate-500 italic">No groups found.</p>
                                    )}
                                </div>
                            </div>

                            {/* Navigation Buttons */}
                            <div className="flex justify-between gap-3 pt-6 mt-6 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={handlePrevious}
                                    className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors flex items-center gap-2"
                                >
                                    ← Back: Resources
                                </button>
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                                >
                                    Next: Publishing →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* PUBLISHING TAB */}
                    {activeModalTab === 'publishing' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    { id: 'draft', label: 'Draft', desc: 'Only visible to you.', icon: Lock, color: 'slate', border: 'border-slate-300', activeBorder: 'border-slate-500', bg: 'bg-slate-50', activeBg: 'bg-slate-100', text: 'text-slate-600' },
                                    { id: 'featured', label: 'Featured', desc: 'Visible as "Coming Soon".', icon: Star, color: 'amber', border: 'border-amber-200', activeBorder: 'border-amber-500', bg: 'bg-amber-50', activeBg: 'bg-amber-100', text: 'text-amber-600' },
                                    { id: 'assigned', label: 'Assigned', desc: 'Students can start working.', icon: Rocket, color: 'emerald', border: 'border-emerald-200', activeBorder: 'border-emerald-500', bg: 'bg-emerald-50', activeBg: 'bg-emerald-100', text: 'text-emerald-600' }
                                ].map(opt => (
                                    <div
                                        key={opt.id}
                                        onClick={() => setTemplateForm({ ...templateForm, status: opt.id as any })}
                                        className={`p-6 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center gap-4 ${templateForm.status === opt.id ? `${opt.activeBg} ${opt.activeBorder} shadow-lg` : `bg-white ${opt.border} hover:border-slate-400 opacity-60 hover:opacity-100`}`}
                                    >
                                        <div className={`p-4 rounded-full ${opt.bg} ${opt.text}`}><opt.icon size={24} /></div>
                                        <div>
                                            <h4 className={`font-bold text-lg ${templateForm.status === opt.id ? 'text-slate-900' : 'text-slate-400'}`}>{opt.label}</h4>
                                            <p className="text-xs text-slate-500 mt-1">{opt.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {templateForm.status === 'assigned' && (
                                <div className="animate-in fade-in slide-in-from-top-2 bg-emerald-50 p-6 rounded-2xl border border-emerald-200">
                                    <label className={LABEL_CLASS}>Due Date (Optional)</label>
                                    <input type="date" className={INPUT_CLASS} onChange={(e) => {
                                        if (e.target.valueAsDate) {
                                            setTemplateForm({ ...templateForm, dueDate: Timestamp.fromDate(e.target.valueAsDate) });
                                        }
                                    }} />
                                </div>
                            )}

                            {/* Navigation Buttons */}
                            <div className="flex justify-between gap-3 pt-6 mt-6 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={handlePrevious}
                                    className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors flex items-center gap-2"
                                >
                                    ← Back: Targeting
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-200 flex justify-between gap-4 shrink-0 bg-white/80 backdrop-blur-sm rounded-b-2xl">
                    <button type="button" onClick={onClose} className="px-6 py-3 text-slate-500 hover:text-slate-700 font-bold transition-colors">Cancel</button>
                    <button type="submit" className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-900/20 hover:shadow-emerald-900/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2">
                        {templateForm.status === 'assigned' ? '🚀 Assign Project' : templateForm.status === 'featured' ? '🌟 Publish as Featured' : '✅ Finish & Save'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
