import React from 'react';
import { Modal } from '../../components/Modal';
import { StudentProject, StationType, ProcessTemplate } from '../../types';
import { STATION_THEMES } from '../../utils/theme';
import { STUDIO_THEME, studioClass } from '../../utils/studioTheme';
import { ClipboardList, Zap, Beaker, Award, ListChecks, Lock, Trash2, Plus, Play, ArrowRight, ArrowLeft, CheckSquare, GitCommit, X, History, RotateCcw, Link as LinkIcon, Sparkles, Loader2, Image as ImageIcon } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { generateProjectImage } from '../../services/geminiImageGen';

interface StudentProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectForm: Partial<StudentProject>;
    setProjectForm: (form: Partial<StudentProject>) => void;
    activeProject: StudentProject | null;
    currentTheme: any;
    workspaceTab: 'mission' | 'resources';
    setWorkspaceTab: (tab: 'mission' | 'resources') => void;
    selectedWorkflowId: string;
    handleWorkflowChange: (id: string) => void;
    processTemplates: ProcessTemplate[];
    handleSaveProject: (silent?: boolean) => Promise<string | undefined>;
    handleStartBuilding: () => void;
    handleMoveStep: (stepId: string, status: 'todo' | 'doing' | 'done') => void;
    handleAddStep: () => void;
    handleDeleteStep: (stepId: string) => void;
    newStepTitle: string;
    setNewStepTitle: (title: string) => void;
    apiConfig?: { googleApiKey?: string };
}

export const StudentProjectModal: React.FC<StudentProjectModalProps> = ({
    isOpen, onClose, projectForm, setProjectForm, activeProject, currentTheme,
    workspaceTab, setWorkspaceTab, selectedWorkflowId, handleWorkflowChange,
    processTemplates, handleSaveProject, handleStartBuilding, handleMoveStep,
    handleAddStep, handleDeleteStep, newStepTitle, setNewStepTitle, apiConfig
}) => {
    const INPUT_CLASS = studioClass("w-full p-4 border-2 rounded-xl outline-none transition-all font-bold", STUDIO_THEME.background.card, STUDIO_THEME.border.light, STUDIO_THEME.text.primary, "focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400");
    const LABEL_CLASS = "block text-xs font-black text-slate-400 uppercase tracking-wider mb-2";

    const [isCommitModalOpen, setIsCommitModalOpen] = React.useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = React.useState(false);
    const [commitMessage, setCommitMessage] = React.useState('');
    const [selectedStepId, setSelectedStepId] = React.useState<string>('');
    const [evidenceLink, setEvidenceLink] = React.useState('');
    const [isGenerating, setIsGenerating] = React.useState(false);

    const handleCommit = async () => {
        if (!commitMessage.trim()) return;

        const newCommit = {
            id: Date.now().toString(),
            message: commitMessage,
            timestamp: Timestamp.now(),
            snapshot: projectForm.steps || [],
            stepId: selectedStepId || undefined,
            evidenceLink: evidenceLink || undefined
        };

        const updatedCommits = [...(projectForm.commits || []), newCommit];

        // Optionally update the step's proofUrl if provided
        let updatedSteps = projectForm.steps;
        if (selectedStepId && evidenceLink) {
            updatedSteps = projectForm.steps?.map(step =>
                step.id === selectedStepId ? { ...step, proofUrl: evidenceLink } : step
            );
        }

        setProjectForm({ ...projectForm, commits: updatedCommits, steps: updatedSteps });
        setIsCommitModalOpen(false);
        setCommitMessage('');
        setEvidenceLink('');
        setSelectedStepId('');

        // Then save
        await handleSaveProject(false);
    };

    const handleRestoreCommit = (snapshot: any[]) => {
        if (window.confirm("Are you sure? This will overwrite your current steps with this version.")) {
            setProjectForm({ ...projectForm, steps: snapshot });
            setIsHistoryModalOpen(false);
        }
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title="" size="6xl">
                <div className="flex flex-col h-[88vh] -m-6 font-sans">
                    {/* 1. Top HUD (Head Up Display) */}
                    <div className={studioClass("border-b sticky top-0 z-20 backdrop-blur-xl", STUDIO_THEME.background.card, STUDIO_THEME.border.light)}>
                        <div className="px-8 py-6 flex flex-col gap-6">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-4 mb-3">
                                        <h2 className={studioClass("text-3xl md:text-4xl font-black tracking-tight", STUDIO_THEME.text.primary)}>
                                            {projectForm.title || 'Untitled Project'}
                                        </h2>
                                        <span className={`text-xs px-3 py-1.5 rounded-full border uppercase font-black shadow-sm ${currentTheme.bgSoft} ${currentTheme.text} ${currentTheme.border}`}>
                                            {currentTheme.label}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-2 no-scrollbar">
                                        {[
                                            { id: 1, label: 'PLAN', icon: ClipboardList, active: projectForm.status === 'planning' },
                                            { id: 2, label: 'BUILD', icon: Zap, active: projectForm.status === 'building' },
                                            { id: 3, label: 'TEST', icon: Beaker, active: projectForm.status === 'testing' },
                                            { id: 4, label: 'DELIVER', icon: Award, active: ['delivered', 'submitted', 'published'].includes(projectForm.status || '') }
                                        ].map((step, idx) => (
                                            <div key={step.id} className={studioClass("flex items-center gap-2 px-4 py-2 rounded-xl transition-all border-2", step.active ? `${STUDIO_THEME.colors.primary} border-transparent text-white shadow-lg shadow-indigo-900/20` : "bg-slate-50 border-slate-100 text-slate-400")}>
                                                <div className="text-sm font-black flex items-center gap-2">
                                                    <step.icon size={16} strokeWidth={3} />
                                                    <span>{step.id}. {step.label}</span>
                                                </div>
                                                {idx < 3 && !step.active && <div className="w-4 h-0.5 bg-slate-200 mx-1"></div>}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* BIG SAVE BUTTON */}
                                <div className="hidden md:flex gap-3">
                                    <button
                                        onClick={() => setIsHistoryModalOpen(true)}
                                        className={studioClass("flex flex-col items-center justify-center w-20 h-20 rounded-2xl transition-all border-2 group", STUDIO_THEME.background.card, STUDIO_THEME.border.light, "hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10")}
                                        title="View History"
                                    >
                                        <div className="bg-indigo-50 group-hover:bg-indigo-100 p-2 rounded-full mb-1 transition-colors">
                                            <History size={24} className="text-indigo-600" strokeWidth={3} />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 group-hover:text-indigo-600 uppercase tracking-wider">History</span>
                                    </button>

                                    <button
                                        onClick={() => setIsCommitModalOpen(true)}
                                        className={studioClass("flex flex-col items-center justify-center w-20 h-20 rounded-2xl transition-all border-2 group", STUDIO_THEME.background.card, STUDIO_THEME.border.light, "hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10")}
                                        title="Save a version"
                                    >
                                        <div className="bg-indigo-50 group-hover:bg-indigo-100 p-2 rounded-full mb-1 transition-colors">
                                            <GitCommit size={24} className="text-indigo-600" strokeWidth={3} />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 group-hover:text-indigo-600 uppercase tracking-wider">Commit</span>
                                    </button>

                                    <button
                                        onClick={() => handleSaveProject(false)}
                                        className={studioClass("flex flex-col items-center justify-center w-20 h-20 rounded-2xl transition-all border-2 group", STUDIO_THEME.background.card, STUDIO_THEME.border.light, "hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10")}
                                    >
                                        <div className="bg-emerald-50 group-hover:bg-emerald-100 p-2 rounded-full mb-1 transition-colors">
                                            <CheckSquare size={24} className="text-emerald-600" strokeWidth={3} />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 group-hover:text-emerald-600 uppercase tracking-wider">Save</span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-2 shrink-0 bg-slate-100/50 p-1.5 rounded-xl self-start md:self-auto border border-slate-200/50">
                                <button onClick={() => setWorkspaceTab('mission')} className={studioClass("flex-1 px-6 py-3 rounded-lg font-bold text-sm transition-all flex items-center gap-2", workspaceTab === 'mission' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-indigo-600 hover:bg-white/50")}>
                                    <ClipboardList size={18} /> Mission Control
                                </button>
                                <button onClick={() => setWorkspaceTab('resources')} className={studioClass("flex-1 px-6 py-3 rounded-lg font-bold text-sm transition-all flex items-center gap-2", workspaceTab === 'resources' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-indigo-600 hover:bg-white/50")}>
                                    <Beaker size={18} /> Resources
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden flex flex-col p-6 md:p-8 bg-slate-50 relative">
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#2D2B6B 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                        {workspaceTab === 'mission' && (
                            <>
                                {projectForm.status === 'planning' ? (
                                    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar pr-2 relative z-10">
                                        <div className="mb-8 shrink-0 text-center md:text-left">
                                            <h3 className={studioClass("text-3xl md:text-4xl font-black mb-2 flex items-center justify-center md:justify-start gap-4", STUDIO_THEME.text.primary)}>
                                                <div className="p-3 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl shadow-lg shadow-amber-500/20 transform -rotate-3">
                                                    <ClipboardList size={32} className="text-white" strokeWidth={2.5} />
                                                </div>
                                                Plan Your Mission 📋
                                            </h3>
                                            <p className="text-slate-500 text-lg font-medium">Break down your big idea into small steps!</p>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-6">
                                            <div className="space-y-6">
                                                <div className={studioClass("p-6 border-2 shadow-sm", STUDIO_THEME.background.card, STUDIO_THEME.border.light, STUDIO_THEME.rounded.lg)}>
                                                    <label className={LABEL_CLASS}>1. Choose a Strategy</label>
                                                    <select
                                                        className={INPUT_CLASS}
                                                        value={selectedWorkflowId}
                                                        onChange={e => handleWorkflowChange(e.target.value)}
                                                    >
                                                        <option value="">Select a Workflow...</option>
                                                        {processTemplates.map(w => (
                                                            <option key={w.id} value={w.id}>{w.name}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className={studioClass("p-6 border-2 shadow-sm", STUDIO_THEME.background.card, STUDIO_THEME.border.light, STUDIO_THEME.rounded.lg)}>
                                                    <label className={LABEL_CLASS}>2. Project Details</label>
                                                    <div className="space-y-4">
                                                        <input
                                                            className={INPUT_CLASS}
                                                            value={projectForm.title}
                                                            onChange={e => setProjectForm({ ...projectForm, title: e.target.value })}
                                                            placeholder="Name your project..."
                                                        />
                                                        <textarea
                                                            className={`${INPUT_CLASS} h-32 resize-none`}
                                                            value={projectForm.description}
                                                            onChange={e => setProjectForm({ ...projectForm, description: e.target.value })}
                                                            placeholder="What are you going to build?"
                                                        />
                                                    </div>
                                                </div>

                                                <div className={studioClass("p-6 border-2 shadow-sm", STUDIO_THEME.background.card, STUDIO_THEME.border.light, STUDIO_THEME.rounded.lg)}>
                                                    <label className={LABEL_CLASS}>3. Project Cover</label>
                                                    <div className="space-y-4">
                                                        <div className="flex gap-2">
                                                            <input
                                                                className={INPUT_CLASS}
                                                                value={projectForm.mediaUrls?.[0] || ''}
                                                                onChange={e => {
                                                                    const newUrls = [...(projectForm.mediaUrls || [])];
                                                                    newUrls[0] = e.target.value;
                                                                    setProjectForm({ ...projectForm, mediaUrls: newUrls });
                                                                }}
                                                                placeholder="Image URL..."
                                                            />
                                                            <button
                                                                onClick={async () => {
                                                                    if (!projectForm.title) {
                                                                        alert("Please enter a title first!");
                                                                        return;
                                                                    }
                                                                    setIsGenerating(true);
                                                                    setIsGenerating(true);
                                                                    const result = await generateProjectImage(
                                                                        projectForm.title,
                                                                        projectForm.station || 'general',
                                                                        apiConfig?.googleApiKey
                                                                    );
                                                                    setIsGenerating(false);

                                                                    if (result.success && result.url) {
                                                                        const newUrls = [...(projectForm.mediaUrls || [])];
                                                                        newUrls[0] = result.url;
                                                                        setProjectForm({ ...projectForm, mediaUrls: newUrls });
                                                                    } else {
                                                                        alert(`Image Generation Failed:\n${result.error}`);
                                                                    }
                                                                }}
                                                                disabled={isGenerating}
                                                                className="px-4 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl font-bold shadow-lg shadow-fuchsia-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                                                                {isGenerating ? 'Dreaming...' : 'Auto-Generate'}
                                                            </button>
                                                        </div>

                                                        {/* Preview Area */}
                                                        <div className="relative w-full h-48 bg-slate-100 rounded-xl overflow-hidden border-2 border-slate-200 flex items-center justify-center group">
                                                            {projectForm.mediaUrls?.[0] ? (
                                                                <img src={projectForm.mediaUrls[0]} alt="Cover" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="text-slate-400 flex flex-col items-center gap-2">
                                                                    <ImageIcon size={32} />
                                                                    <span className="text-sm font-bold">No Cover Image</span>
                                                                </div>
                                                            )}

                                                            {/* Loading Overlay */}
                                                            {isGenerating && (
                                                                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white z-10 animate-in fade-in">
                                                                    <Loader2 size={40} className="animate-spin mb-2 text-[#FFC107]" />
                                                                    <span className="font-bold animate-pulse">AI is dreaming... 🍌</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className={studioClass("flex flex-col border-2 overflow-hidden shadow-sm h-[500px] lg:h-auto", STUDIO_THEME.background.card, STUDIO_THEME.border.light, STUDIO_THEME.rounded.lg)}>
                                                <div className="p-5 border-b-2 border-slate-100 bg-slate-50/50 shrink-0 flex justify-between items-center">
                                                    <h4 className={studioClass("font-black text-lg flex items-center gap-2", STUDIO_THEME.text.primary)}>
                                                        <ListChecks size={24} className="text-amber-500" />
                                                        Building Steps
                                                    </h4>
                                                    <span className="bg-white border border-slate-200 text-slate-500 text-xs font-bold px-3 py-1 rounded-full">{projectForm.steps?.length || 0} Steps</span>
                                                </div>
                                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                                    {projectForm.steps?.length === 0 && (
                                                        <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-50">
                                                            <ListChecks size={48} className="text-slate-300 mb-4" />
                                                            <p className="text-slate-400 font-bold text-lg">No steps yet!</p>
                                                            <p className="text-slate-400">Add your first step below to get started.</p>
                                                        </div>
                                                    )}
                                                    {projectForm.steps?.map((step, idx) => {
                                                        const colors = [
                                                            'from-cyan-400 to-cyan-500',
                                                            'from-pink-400 to-pink-500',
                                                            'from-orange-400 to-orange-500',
                                                            'from-yellow-400 to-yellow-500'
                                                        ];
                                                        const colorClass = colors[idx % colors.length];

                                                        return (
                                                            <div key={step.id} className="flex items-center gap-4 p-4 bg-white border-2 border-slate-100 rounded-xl group hover:border-indigo-200 transition-all shadow-sm hover:shadow-md hover:scale-[1.01]">
                                                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-lg text-white font-black shadow-sm shrink-0 transform -rotate-3 group-hover:rotate-0 transition-transform`}>{idx + 1}</div>
                                                                <span className={studioClass("flex-1 text-base font-bold", STUDIO_THEME.text.primary)}>{step.title}</span>
                                                                {step.isLocked ? <Lock size={20} className="text-slate-300" /> : <button onClick={() => handleDeleteStep(step.id)} className="text-slate-400 hover:text-red-500 p-3 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={20} /></button>}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                                <div className="p-4 border-t-2 border-slate-100 bg-slate-50/50 flex gap-3 shrink-0">
                                                    <input
                                                        className={INPUT_CLASS}
                                                        placeholder="Type a step here..."
                                                        value={newStepTitle}
                                                        onChange={e => setNewStepTitle(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && handleAddStep()}
                                                    />
                                                    <button onClick={handleAddStep} className="bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-white px-6 py-4 rounded-xl font-black shadow-lg transition-all active:scale-95 hover:shadow-amber-500/20">
                                                        <Plus size={24} strokeWidth={3} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-center pt-6 mt-auto border-t-2 border-slate-200 shrink-0 pb-4">
                                            <button onClick={handleStartBuilding} className="w-full md:w-auto px-12 py-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-2xl font-black text-xl shadow-2xl shadow-emerald-500/30 flex items-center justify-center gap-4 transition-all active:scale-95 transform hover:-translate-y-1">
                                                Start Building 🚀 <Play size={24} fill="currentColor" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 relative z-10">
                                        <div className="flex justify-between items-center mb-6 shrink-0">
                                            <h3 className={studioClass("text-3xl font-black flex items-center gap-3", STUDIO_THEME.text.primary)}>
                                                <Zap size={32} className="text-amber-500 fill-amber-500" />
                                                Building Zone
                                            </h3>
                                            <button onClick={() => handleSaveProject(false)} className="md:hidden px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold text-sm border-2 border-slate-200 shadow-sm">
                                                Save Progress
                                            </button>
                                        </div>

                                        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-4 pb-2">
                                            {/* To Do Column */}
                                            <div className="flex-1 flex flex-col bg-white border-2 border-slate-200 rounded-[2rem] min-h-[200px] shadow-sm">
                                                <div className="p-5 border-b-2 border-slate-200 bg-slate-50 font-black text-sm uppercase text-slate-600 tracking-wider text-center flex items-center justify-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-slate-400"></div> TO DO
                                                </div>
                                                <div className="flex-1 p-5 space-y-4 overflow-y-auto custom-scrollbar">
                                                    {projectForm.steps?.filter(s => s.status === 'todo').map(step => (
                                                        <div key={step.id} className="bg-slate-50 border-2 border-slate-200 p-6 rounded-2xl shadow-sm group hover:border-slate-300 transition-all">
                                                            <p className={studioClass("text-xl font-black mb-4 leading-tight", STUDIO_THEME.text.primary)}>{step.title}</p>
                                                            <button onClick={() => handleMoveStep(step.id, 'doing')} className={`w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black rounded-xl border-2 border-indigo-600 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-indigo-900/10 uppercase tracking-wide`}>
                                                                START <ArrowRight size={18} strokeWidth={3} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {projectForm.steps?.filter(s => s.status === 'todo').length === 0 && (
                                                        <div className="text-center text-slate-400 italic py-8 font-medium">No tasks left! 🎉</div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* In Progress Column */}
                                            <div className={`flex-1 flex flex-col bg-gradient-to-br ${currentTheme.gradient} border-4 ${currentTheme.border} rounded-[2rem] min-h-[200px] shadow-2xl transform scale-[1.02] z-10`}>
                                                <div className={`p-4 border-b-2 ${currentTheme.border} bg-white/20 font-black text-sm uppercase ${currentTheme.text} tracking-wider text-center flex items-center justify-center gap-2`}>
                                                    <Zap size={16} className="fill-current" /> IN PROGRESS
                                                </div>
                                                <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar">
                                                    {projectForm.steps?.filter(s => s.status === 'doing').map(step => (
                                                        <div key={step.id} className={`bg-white border-2 ${currentTheme.border} p-5 rounded-2xl shadow-xl relative overflow-hidden group`}>
                                                            <div className={`absolute top-0 left-0 w-2 h-full bg-current ${currentTheme.text}`}></div>
                                                            <p className={studioClass("text-xl font-black mb-4 pl-3 leading-tight", STUDIO_THEME.text.primary)}>{step.title}</p>
                                                            <div className="flex gap-3">
                                                                <button onClick={() => handleMoveStep(step.id, 'todo')} className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors" title="Move back"><ArrowLeft size={20} strokeWidth={3} /></button>
                                                                <button onClick={() => handleMoveStep(step.id, 'done')} className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white text-sm font-black rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95">
                                                                    DONE! <CheckSquare size={20} strokeWidth={3} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {projectForm.steps?.filter(s => s.status === 'doing').length === 0 && (
                                                        <div className="text-center text-white/50 italic py-12 font-bold text-lg">
                                                            Pick a task to start! 👆
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Done Column */}
                                            <div className="flex-1 flex flex-col bg-white border-2 border-slate-100 rounded-[2rem] min-h-[200px] shadow-sm">
                                                <div className="p-4 border-b-2 border-slate-100 bg-slate-50 font-black text-sm uppercase text-emerald-600 tracking-wider text-center flex items-center justify-center gap-2">
                                                    <CheckSquare size={16} /> DONE
                                                </div>
                                                <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar">
                                                    {projectForm.steps?.filter(s => s.status === 'done').map(step => (
                                                        <div key={step.id} className="bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl opacity-60 hover:opacity-100 transition-all group">
                                                            <div className="flex items-start gap-3 mb-3">
                                                                <div className="bg-emerald-100 text-emerald-600 p-1 rounded-full mt-0.5"><CheckSquare size={16} /></div>
                                                                <p className="text-base text-slate-400 line-through decoration-2 decoration-slate-300 font-medium">{step.title}</p>
                                                            </div>
                                                            <button onClick={() => handleMoveStep(step.id, 'doing')} className={studioClass("text-xs font-bold ml-9 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity", STUDIO_THEME.text.primary)}>
                                                                <ArrowLeft size={12} /> Not done yet?
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                        {workspaceTab === 'resources' && (
                            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                <div className={studioClass("w-24 h-24 rounded-full flex items-center justify-center mb-6 border-4 shadow-sm", STUDIO_THEME.background.card, STUDIO_THEME.border.light)}>
                                    <Beaker size={48} className="text-slate-300" />
                                </div>
                                <h3 className={studioClass("text-2xl font-bold mb-2", STUDIO_THEME.text.primary)}>Resources</h3>
                                <p className="text-slate-500 max-w-md mx-auto">Helpful videos, links, and files for your mission will appear here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Commit Modal */}
            <Modal isOpen={isCommitModalOpen} onClose={() => setIsCommitModalOpen(false)} title="Commit Your Progress 💾" size="md">
                <div className="p-6">
                    <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                        <GitCommit size={32} />
                    </div>
                    <h3 className={studioClass("text-xl font-bold text-center mb-2", STUDIO_THEME.text.primary)}>Save a Version</h3>
                    <p className="text-slate-500 text-center text-sm mb-6">
                        Create a checkpoint for your project. You can come back to this version later if you need to!
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className={LABEL_CLASS}>Commit Message</label>
                            <input
                                autoFocus
                                type="text"
                                className={INPUT_CLASS}
                                placeholder="What did you work on? e.g., Added robot arms"
                                value={commitMessage}
                                onChange={e => setCommitMessage(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCommit()}
                            />
                        </div>

                        <div>
                            <label className={LABEL_CLASS}>Related Step (Optional)</label>
                            <select
                                value={selectedStepId}
                                onChange={e => setSelectedStepId(e.target.value)}
                                className={INPUT_CLASS}
                            >
                                <option value="">-- General Update --</option>
                                {projectForm.steps?.filter(s => s.status === 'doing').map(step => (
                                    <option key={step.id} value={step.id}>{step.title}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className={LABEL_CLASS}>Evidence Link (Optional)</label>
                            <div className="relative">
                                <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    className={`${INPUT_CLASS} pl-10`}
                                    placeholder="https://docs.google.com/..."
                                    value={evidenceLink}
                                    onChange={e => setEvidenceLink(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setIsCommitModalOpen(false)}
                                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCommit}
                                disabled={!commitMessage.trim()}
                                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Save Commit
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* History Modal */}
            <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title="Project History 📜" size="lg">
                <div className="p-6">
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                        {(!projectForm.commits || projectForm.commits.length === 0) && (
                            <div className="text-center py-12 text-slate-400">
                                <History size={48} className="mx-auto mb-4 opacity-50" />
                                <p>No history yet. Make a commit to save a version!</p>
                            </div>
                        )}
                        {projectForm.commits?.slice().reverse().map((commit) => (
                            <div key={commit.id} className={studioClass("p-4 rounded-xl flex justify-between items-center group transition-all border-2", STUDIO_THEME.background.card, STUDIO_THEME.border.light, "hover:border-indigo-500")}>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={studioClass("font-bold", STUDIO_THEME.text.primary)}>{commit.message}</span>
                                        <span className="text-xs text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                                            {commit.timestamp?.seconds ? new Date(commit.timestamp.seconds * 1000).toLocaleString() : 'Just now'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-1">{commit.snapshot?.length || 0} steps</p>
                                    {commit.stepId && (
                                        <p className="text-xs text-slate-400 italic">
                                            Working on: {projectForm.steps?.find(s => s.id === commit.stepId)?.title || 'Unknown Step'}
                                        </p>
                                    )}
                                    {commit.evidenceLink && (
                                        <a href={commit.evidenceLink} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:underline flex items-center gap-1 mt-1">
                                            <LinkIcon size={12} /> View Evidence
                                        </a>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleRestoreCommit(commit.snapshot)}
                                    className="px-4 py-2 bg-white border-2 border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-600 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                                >
                                    <RotateCcw size={14} /> Restore
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>
        </>
    );
};
