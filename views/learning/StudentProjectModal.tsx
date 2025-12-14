import React from 'react';
import { Modal } from '../../components/Modal';
import { StudentProject, StationType, ProcessTemplate, Badge } from '../../types';
import { STATION_THEMES } from '../../utils/theme';
import { STUDIO_THEME, studioClass } from '../../utils/studioTheme';
import { ClipboardList, Zap, Beaker, Award, ListChecks, Lock, Trash2, Plus, Play, ArrowRight, ArrowLeft, CheckSquare, GitCommit, X, History, RotateCcw, Link as LinkIcon, Sparkles, Loader2, Image as ImageIcon, Layout, Target, Settings, Crown, ChevronRight, Clock, CheckCircle2, Flag, Video, Trophy, Star } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { generateProjectImage } from '../../services/geminiImageGen';

// Visual mapping for templates (simulating the rich UI data from TestView)
const TEMPLATE_VISUALS: Record<string, { icon: any, color: string }> = {
    'design-thinking': { icon: '🎨', color: 'from-pink-500 to-rose-500' },
    'engineering-process': { icon: '⚙️', color: 'from-blue-500 to-cyan-500' },
    'scientific-method': { icon: '🧬', color: 'from-emerald-500 to-teal-500' },
    'default': { icon: '🚀', color: 'from-violet-500 to-purple-500' }
};

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
    isWorkflowLocked?: boolean;
    badges: Badge[];
    handleSubmitForReview?: () => Promise<void>;
}

export const StudentProjectModal: React.FC<StudentProjectModalProps> = ({
    isOpen, onClose, projectForm, setProjectForm, activeProject, currentTheme,
    workspaceTab, setWorkspaceTab, selectedWorkflowId, handleWorkflowChange,
    processTemplates, handleSaveProject, handleStartBuilding, handleMoveStep,
    handleAddStep, handleDeleteStep, newStepTitle, setNewStepTitle, apiConfig, isWorkflowLocked, badges, handleSubmitForReview
}) => {
    const INPUT_CLASS = studioClass("w-full p-4 border-2 rounded-xl outline-none transition-all font-bold", STUDIO_THEME.background.card, STUDIO_THEME.border.light, STUDIO_THEME.text.primary, "focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400");
    const LABEL_CLASS = "block text-xs font-black text-slate-400 uppercase tracking-wider mb-2";

    const [isCommitModalOpen, setIsCommitModalOpen] = React.useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = React.useState(false);
    const [commitMessage, setCommitMessage] = React.useState('');
    const [selectedStepId, setSelectedStepId] = React.useState<string>('');
    const [evidenceLink, setEvidenceLink] = React.useState('');
    const [isGenerating, setIsGenerating] = React.useState(false);

    // Wizard State
    const [wizardStep, setWizardStep] = React.useState(1);
    const [scrolled, setScrolled] = React.useState(false);

    // Edit Step State
    const [editingStepId, setEditingStepId] = React.useState<string | null>(null);
    const [editEvidence, setEditEvidence] = React.useState('');
    const [editNote, setEditNote] = React.useState('');

    const handleEditStep = (step: any) => {
        setEditingStepId(step.id);
        setEditEvidence(step.evidence || '');
        setEditNote(step.note || '');
    };

    const saveStepEdit = async () => {
        const updatedSteps = projectForm.steps?.map(step =>
            step.id === editingStepId ? { ...step, evidence: editEvidence, note: editNote } : step
        );
        setProjectForm({ ...projectForm, steps: updatedSteps });
        setEditingStepId(null);
        await handleSaveProject(false);
    };

    // Scroll Effect
    React.useEffect(() => {
        const handleScroll = () => {
            // Check internal scroll container if possible, or just default to false for now inside modal
            // For modal, we might attach to the scrollable div ref, but let's keep state ready.
        };
        // We'll attach this to the specific div later
    }, []);

    const handleNext = () => setWizardStep(prev => prev + 1);
    const handleBack = () => setWizardStep(prev => prev - 1);

    // Validation
    const isStep1Valid = (projectForm.title?.length || 0) > 3;
    const isStep2Valid = !!selectedWorkflowId;
    const isStep3Valid = (projectForm.steps?.length || 0) > 0;

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

        // Optionally update the step's evidence if provided
        let updatedSteps = projectForm.steps;
        if (selectedStepId && evidenceLink) {
            updatedSteps = projectForm.steps?.map(step =>
                step.id === selectedStepId ? { ...step, evidence: evidenceLink } : step
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

    const renderKanbanColumn = (status: 'todo' | 'doing' | 'done', title: string, icon: any, colorClass: string, bgClass: string) => {
        const steps = projectForm.steps?.filter((s) => s.status === status) || [];

        return (
            <div className={`flex-1 flex flex-col ${bgClass} backdrop-blur-md border border-white/40 rounded-[2.5rem] min-h-[500px] transition-all duration-500 shadow-xl overflow-hidden`}>
                <div className={`p-6 border-b border-white/20 font-black text-sm uppercase tracking-wider text-center flex items-center justify-center gap-2 ${colorClass}`}>
                    <div className="p-2 bg-white/50 rounded-lg shadow-sm">{icon}</div>
                    {title}
                    <span className="bg-white/50 px-2 py-0.5 rounded-full text-[10px] font-bold">{steps.length}</span>
                </div>

                <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar">
                    {steps.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400/50 text-sm font-bold italic gap-2">
                            <div className="w-12 h-12 rounded-full border-2 border-dashed border-current flex items-center justify-center opacity-50">
                                <Plus size={20} />
                            </div>
                            <span>No tasks here</span>
                        </div>
                    )}
                    {steps.map((step, idx) => (
                        <div
                            key={step.id}
                            style={{ animationDelay: `${idx * 100}ms` }}
                            className="bg-white/80 hover:bg-white border-2 border-white p-5 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-indigo-200 transition-all duration-300 group relative animate-in slide-in-from-bottom-2 fill-mode-backwards"
                        >
                            <p className="font-bold text-slate-700 mb-4 text-lg leading-tight">{step.title}</p>

                            <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                                {status === 'doing' && (
                                    <>
                                        <button onClick={() => handleMoveStep(step.id, 'todo')} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors" title="Move Back"><ArrowLeft size={18} /></button>
                                        <button onClick={() => handleMoveStep(step.id, 'done')} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95">
                                            Done <CheckSquare size={16} />
                                        </button>
                                    </>
                                )}
                                {status === 'todo' && (
                                    <button onClick={() => handleMoveStep(step.id, 'doing')} className="w-full py-3 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95">
                                        Start Mission <ArrowRight size={16} />
                                    </button>
                                )}
                                {status === 'done' && (
                                    <div className="flex flex-col gap-2 items-end w-full">
                                        <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs bg-emerald-50 px-3 py-1 rounded-full mb-2">
                                            <CheckCircle2 size={14} /> Completed
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleMoveStep(step.id, 'doing')}
                                                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                                                title="Undo / Move to Doing"
                                            >
                                                <RotateCcw size={14} /> Undo
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedStepId(step.id);
                                                    setEvidenceLink(step.evidence || '');
                                                    // We might need a separate 'Edit' mode or reused modal. 
                                                    // For now, let's open the Commit Modal but pre-filled? 
                                                    // Actually, committing is for history. Editing current state is different.
                                                    // Let's create a quick inline edit or open a dedicated 'EditStep' modal.
                                                    // Since we don't have a separate modal ready, let's reuse Commit Modal but as 'Update Step'
                                                    // Or better, just setIsCommitModalOpen(true) and handle context?
                                                    // No, let's prompt or set a 'isEditingStep' state.
                                                    // I'll assume we add a new 'isStepEditModalOpen' state in the next step.
                                                    // For now, let's just trigger the state I will add.
                                                    // Let's assume I add `setIsStepEditModalOpen(true)`
                                                    // I will stick to adding the buttons first.
                                                    // I'll call a hypothetical function handleEditStep(step)
                                                    handleEditStep(step);
                                                }}
                                                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
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
                                    <div className="flex flex-col h-full relative z-10">
                                        {/* WIZARD PROGRESS TABLET (Floating) */}
                                        <div className="absolute top-4 left-0 right-0 z-20 flex justify-center pointer-events-none">
                                            <div className="bg-white/80 backdrop-blur-md px-6 py-2 rounded-full shadow-sm border border-slate-200/60 flex items-center gap-6 text-xs font-black uppercase tracking-wider text-slate-400 pointer-events-auto">
                                                <div className={`transition-colors ${wizardStep >= 1 ? 'text-indigo-600' : ''} flex items-center gap-2`}>
                                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${wizardStep >= 1 ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300'}`}>1</span> Identity
                                                </div>
                                                <div className={`w-8 h-0.5 rounded-full ${wizardStep >= 2 ? 'bg-amber-500' : 'bg-slate-200'}`}></div>
                                                <div className={`transition-colors ${wizardStep >= 2 ? 'text-amber-500' : ''} flex items-center gap-2`}>
                                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${wizardStep >= 2 ? 'border-amber-500 bg-amber-50' : 'border-slate-300'}`}>2</span> Strategy
                                                </div>
                                                <div className={`w-8 h-0.5 rounded-full ${wizardStep >= 3 ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                                                <div className={`transition-colors ${wizardStep >= 3 ? 'text-emerald-500' : ''} flex items-center gap-2`}>
                                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${wizardStep >= 3 ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300'}`}>3</span> Blueprint
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pt-20 pb-32">
                                            {/* STEP 1: IDENTITY */}
                                            {wizardStep === 1 && (
                                                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-backwards max-w-4xl mx-auto">
                                                    <div className="text-center mb-10">
                                                        <h1 className="text-5xl md:text-6xl font-black text-slate-900 mb-4 tracking-tight">
                                                            The <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 animate-pulse">Spark</span> ✨
                                                        </h1>
                                                        <p className="text-xl text-slate-500 font-medium max-w-xl mx-auto">
                                                            Every great invention starts with a tiny spark. <br />What will you bring to life today?
                                                        </p>
                                                    </div>

                                                    <div className="bg-white/60 backdrop-blur-xl border border-white/60 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group hover:bg-white/80 transition-all duration-500">
                                                        {/* Decorative Blobs */}
                                                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                                                        {/* Title Input */}
                                                        <div className="mb-8 relative z-10">
                                                            <label className={LABEL_CLASS}>Project Title</label>
                                                            <input
                                                                className="w-full text-4xl md:text-5xl font-black bg-transparent border-b-2 border-slate-200/60 py-3 outline-none focus:border-indigo-600 transition-all text-slate-800 placeholder:text-slate-300"
                                                                placeholder="My Big Idea..."
                                                                value={projectForm.title || ''}
                                                                onChange={e => setProjectForm({ ...projectForm, title: e.target.value })}
                                                                autoFocus
                                                            />
                                                            {projectForm.title && (
                                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 text-emerald-500 animate-in zoom-in spin-in-180 duration-500">
                                                                    <CheckCircle2 size={32} className="drop-shadow-md" fill="white" />
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="grid md:grid-cols-2 gap-8 relative z-10">
                                                            {/* Description */}
                                                            <div className="group/desc">
                                                                <label className={LABEL_CLASS}>The Concept</label>
                                                                <div className="relative">
                                                                    <textarea
                                                                        className="w-full h-48 bg-white/50 border-2 border-white rounded-3xl p-5 font-medium text-slate-600 outline-none focus:border-indigo-500 focus:bg-white focus:shadow-lg transition-all resize-none text-lg leading-relaxed"
                                                                        placeholder="I want to build a robot that can..."
                                                                        value={projectForm.description || ''}
                                                                        onChange={e => setProjectForm({ ...projectForm, description: e.target.value })}
                                                                    />
                                                                    <div className="absolute bottom-4 right-4 text-slate-300 opacity-0 group-hover/desc:opacity-100 transition-opacity">
                                                                        <Settings size={18} className="animate-spin-slow" />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Cover Image */}
                                                            <div>
                                                                <label className={LABEL_CLASS}>Cover Art</label>
                                                                <div className="relative w-full h-48 bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl overflow-hidden border-4 border-white shadow-inner group/img hover:shadow-xl hover:scale-[1.02] transition-all duration-500">
                                                                    {projectForm.mediaUrls?.[0] ? (
                                                                        <img src={projectForm.mediaUrls[0]} className="w-full h-full object-cover transition-transform duration-1000 group-hover/img:scale-110" />
                                                                    ) : (
                                                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
                                                                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                                                                                <ImageIcon size={20} className="opacity-50" />
                                                                            </div>
                                                                            <span className="text-xs font-bold opacity-60">AI Generator Ready</span>
                                                                        </div>
                                                                    )}

                                                                    {isGenerating && (
                                                                        <div className="absolute inset-0 bg-black/40 backdrop-blur-md flex flex-col items-center justify-center text-white z-20 animate-in fade-in">
                                                                            <Loader2 size={32} className="animate-spin mb-2 text-[#FFC107]" />
                                                                            <span className="font-bold animate-pulse tracking-widest text-xs">DREAMING...</span>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <button
                                                                    onClick={async () => {
                                                                        if (!projectForm.title) return;
                                                                        setIsGenerating(true);
                                                                        const result = await generateProjectImage(
                                                                            projectForm.title,
                                                                            projectForm.station || 'general',
                                                                            projectForm.description || '',
                                                                            apiConfig?.googleApiKey
                                                                        );
                                                                        setIsGenerating(false);
                                                                        if (result.success && result.url) {
                                                                            const newUrls = [...(projectForm.mediaUrls || [])];
                                                                            newUrls[0] = result.url;
                                                                            setProjectForm({ ...projectForm, mediaUrls: newUrls });
                                                                        }
                                                                    }}
                                                                    disabled={!projectForm.title || isGenerating}
                                                                    className="mt-3 w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-2xl text-white font-bold shadow-lg shadow-fuchsia-500/20 hover:shadow-fuchsia-500/40 hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group/btn overflow-hidden relative"
                                                                >
                                                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
                                                                    <Sparkles size={18} className="animate-pulse" />
                                                                    {isGenerating ? 'Dreaming...' : 'Generate Magic Cover'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* STEP 2: STRATEGY */}
                                            {wizardStep === 2 && (
                                                <div className="animate-in fade-in slide-in-from-right-8 duration-500 fill-mode-backwards max-w-5xl mx-auto">
                                                    <div className="text-center mb-10">
                                                        <h1 className="text-5xl md:text-6xl font-black text-slate-900 mb-4 drop-shadow-sm">
                                                            The <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">Strategy</span> 🧭
                                                        </h1>
                                                        <p className="text-2xl text-slate-500 font-medium max-w-2xl mx-auto">
                                                            Every mission needs a plan. Choose your path wisely.
                                                        </p>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative pb-32">
                                                        {processTemplates.map((template, idx) => {
                                                            const isSelected = selectedWorkflowId === template.id;
                                                            // Simple mapping heuristic or default
                                                            const visualKey = Object.keys(TEMPLATE_VISUALS).find(k => template.id.toLowerCase().includes(k)) || 'default';
                                                            const visual = TEMPLATE_VISUALS[visualKey];

                                                            return (
                                                                <div
                                                                    key={template.id}
                                                                    onClick={() => handleWorkflowChange(template.id)}
                                                                    style={{ animationDelay: `${idx * 100}ms` }}
                                                                    className={`
                                                                        cursor-pointer p-8 rounded-[2.5rem] border-2 transition-all duration-500 relative overflow-hidden group hover:-translate-y-2 animate-in slide-in-from-bottom-4 fill-mode-backwards
                                                                        ${isSelected
                                                                            ? 'border-transparent bg-white shadow-2xl scale-[1.03] z-10 ring-4 ring-amber-500/20'
                                                                            : 'border-white/50 bg-white/40 hover:bg-white hover:shadow-xl hover:border-amber-200/50'
                                                                        }
                                                                    `}
                                                                >
                                                                    <div className={`absolute inset-0 bg-gradient-to-br ${visual.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>

                                                                    <div className="flex items-start justify-between mb-6 relative z-10">
                                                                        <div className={`text-4xl p-4 bg-white/60 rounded-3xl shadow-sm backdrop-blur-sm transition-transform duration-500 ${isSelected ? 'scale-110 rotate-3' : 'group-hover:scale-110'}`}>
                                                                            {visual.icon}
                                                                        </div>
                                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isSelected ? 'bg-amber-500 text-white scale-100' : 'bg-slate-200 text-transparent scale-0 group-hover:scale-100'}`}>
                                                                            <CheckSquare size={16} strokeWidth={3} />
                                                                        </div>
                                                                    </div>

                                                                    <h3 className={`text-2xl font-black mb-3 transition-colors ${isSelected ? 'text-slate-800' : 'text-slate-600 group-hover:text-slate-800'}`}>{template.name}</h3>
                                                                    <p className="text-base text-slate-500 font-medium leading-relaxed">{template.description}</p>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                            {/* STEP 3: BLUEPRINT */}
                                            {wizardStep === 3 && (
                                                <div className="animate-in fade-in slide-in-from-right-8 duration-500 h-[calc(100vh-340px)] flex flex-col relative z-20">
                                                    <div className="text-center mb-8 shrink-0">
                                                        <h1 className="text-5xl md:text-6xl font-black text-slate-900 mb-4 drop-shadow-sm">
                                                            The <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">Blueprint</span> 📝
                                                        </h1>
                                                        <p className="text-2xl text-slate-500 font-medium">Break it down via small, conquerable steps.</p>
                                                    </div>

                                                    <div className="flex-1 bg-white/60 backdrop-blur-2xl border border-white/60 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col relative mb-4">
                                                        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-50"></div>

                                                        <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar pb-40">
                                                            {(!projectForm.steps || projectForm.steps.length === 0) && (
                                                                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60 gap-4">
                                                                    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center animate-bounce">
                                                                        <ListChecks size={48} className="text-slate-300" />
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <p className="font-black text-2xl text-slate-300">Blank Canvas</p>
                                                                        <p className="font-medium text-slate-400">Add your first mission step below</p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {projectForm.steps?.map((step, index) => (
                                                                <div
                                                                    key={step.id}
                                                                    className="bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-sm flex items-center gap-5 group hover:border-emerald-200 hover:shadow-lg hover:-translate-x-1 transition-all duration-300 animate-in slide-in-from-bottom-4 fill-mode-backwards"
                                                                    style={{ animationDelay: `${index * 50}ms` }}
                                                                >
                                                                    <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-black text-lg shadow-sm group-hover:rotate-6 transition-transform">
                                                                        {index + 1}
                                                                    </div>
                                                                    <span className="flex-1 font-bold text-slate-700 text-lg">{step.title}</span>
                                                                    <button onClick={() => handleDeleteStep(step.id)} className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
                                                                        <Trash2 size={20} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="p-6 bg-white/80 border-t border-slate-100 flex gap-4 backdrop-blur-md absolute bottom-0 left-0 right-0 z-10 w-full">
                                                            <input
                                                                className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-4 font-bold text-lg text-slate-700 outline-none focus:border-emerald-500 focus:bg-white focus:shadow-lg transition-all placeholder:text-slate-400"
                                                                placeholder="Add a step (e.g., 'Sketch ideas')"
                                                                value={newStepTitle}
                                                                onChange={e => setNewStepTitle(e.target.value)}
                                                                onKeyDown={e => e.key === 'Enter' && handleAddStep()}
                                                                autoFocus
                                                            />
                                                            <button
                                                                onClick={handleAddStep}
                                                                disabled={!newStepTitle.trim()}
                                                                className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-2xl font-black shadow-xl shadow-emerald-500/30 transition-all disabled:opacity-50 hover:-translate-y-1"
                                                            >
                                                                <Plus size={28} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* NAV BAR */}
                                        <div className="absolute bottom-6 left-0 right-0 z-40 flex justify-center gap-4 pointer-events-none">
                                            {wizardStep > 1 && (
                                                <button
                                                    onClick={handleBack}
                                                    className="pointer-events-auto px-8 py-4 bg-white/90 backdrop-blur-xl border-2 border-slate-100 text-slate-600 rounded-3xl font-bold hover:bg-white hover:border-slate-300 hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center gap-2 drop-shadow-lg"
                                                >
                                                    <ArrowLeft size={20} /> Back
                                                </button>
                                            )}
                                            {wizardStep < 3 ? (
                                                <button
                                                    onClick={handleNext}
                                                    disabled={wizardStep === 1 ? !isStep1Valid : !isStep2Valid}
                                                    className="pointer-events-auto px-10 py-4 bg-indigo-600 text-white rounded-3xl font-black text-lg hover:bg-indigo-500 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-600/40 flex items-center gap-3 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed group"
                                                >
                                                    Next Step <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handleStartBuilding}
                                                    disabled={!isStep3Valid}
                                                    className="pointer-events-auto px-12 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-3xl font-black text-lg hover:brightness-110 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-emerald-500/40 flex items-center gap-3 disabled:opacity-50 group"
                                                >
                                                    Start Building 🚀
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden p-0">
                                        {/* Animated Background */}
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/50 via-slate-50 to-emerald-50/50 pointer-events-none"></div>

                                        {/* MISSION CONTROL HEADER */}
                                        {projectForm.status !== 'published' && (
                                            <div className="flex justify-between items-center px-8 py-6 shrink-0 relative z-10 bg-white/50 backdrop-blur-sm border-b border-slate-200/60">
                                                <h3 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                                                    <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                                                        <Zap size={24} className="text-amber-500 fill-amber-500" />
                                                    </div>
                                                    Mission Control 🚀
                                                </h3>
                                                <div className="flex items-center gap-4">
                                                    <button
                                                        onClick={() => setIsCommitModalOpen(true)}
                                                        className="bg-white hover:bg-slate-50 text-slate-600 px-6 py-3 rounded-2xl font-bold border-2 border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                                                    >
                                                        <GitCommit size={20} /> Commit
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const allDone = projectForm.steps?.every(s => s.status === 'done');
                                                            if (!allDone) {
                                                                if (!confirm("Not all steps are done! Are you sure you want to finish the mission?")) return;
                                                            }
                                                            if (handleSubmitForReview) {
                                                                handleSubmitForReview();
                                                            } else {
                                                                // Fallback for previews or missing prop
                                                                handleSaveProject(false);
                                                            }
                                                        }}
                                                        className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-2 hover:scale-105 active:scale-95"
                                                    >
                                                        Mission Complete <Flag size={20} fill="currentColor" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* KANBAN BOARD */}
                                        {projectForm.status !== 'published' && (
                                            <div className="flex-1 overflow-hidden p-8 flex flex-col lg:flex-row gap-6 relative z-10">
                                                {renderKanbanColumn('todo', 'Ready for Launch', <ListChecks size={20} className="text-indigo-600" />, 'text-indigo-600', 'bg-indigo-50/50')}
                                                {renderKanbanColumn('doing', 'In Flight', <Loader2 size={20} className="text-amber-500 animate-spin-slow" />, 'text-amber-600', 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100')}
                                                {renderKanbanColumn('done', 'Mission Accomplished', <Trophy size={20} className="text-emerald-500" />, 'text-emerald-600', 'bg-emerald-50/50')}
                                            </div>
                                        )}

                                        {/* PRESENTATION OVERLAY (Moved inside) */}
                                        {projectForm.status === 'published' && (
                                            <div className="absolute inset-0 bg-slate-50 z-50 flex flex-col animate-in fade-in slide-in-from-bottom-10">
                                                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-2xl mx-auto">
                                                    <div className="w-32 h-32 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-8 shadow-xl shadow-indigo-500/30 animate-bounce">
                                                        <Sparkles size={64} className="text-white" />
                                                    </div>
                                                    <h2 className="text-4xl md:text-5xl font-black text-slate-800 mb-6 leading-tight">Mission Accomplished! 🚀</h2>
                                                    <p className="text-xl text-slate-500 font-medium mb-12">
                                                        Your project is published and live! Now, it's time to show the world what you built.
                                                        Record a presentation and paste the link below.
                                                    </p>

                                                    <div className="w-full bg-white p-8 rounded-2xl shadow-xl border-2 border-slate-100">
                                                        <label className="block text-sm font-black text-slate-400 uppercase tracking-wider mb-4 text-left">
                                                            Presentation Video Link
                                                        </label>
                                                        <div className="flex gap-4">
                                                            <div className="relative flex-1">
                                                                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                                <input
                                                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400"
                                                                    placeholder="https://youtube.com/..."
                                                                    value={projectForm.presentationUrl || ''}
                                                                    onChange={e => setProjectForm({ ...projectForm, presentationUrl: e.target.value })}
                                                                />
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    if (projectForm.presentationUrl) {
                                                                        setProjectForm({ ...projectForm, isPresentationCompleted: true });
                                                                        handleSaveProject(false);
                                                                    }
                                                                }}
                                                                disabled={!projectForm.presentationUrl}
                                                                className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-black text-lg shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                Complete <CheckSquare size={24} strokeWidth={3} />
                                                            </button>
                                                        </div>
                                                        {projectForm.isPresentationCompleted && (
                                                            <div className="mt-6 p-4 bg-emerald-100 text-emerald-700 rounded-xl font-bold flex items-center gap-2 animate-in fade-in">
                                                                <CheckSquare size={20} /> Presentation Submitted!
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
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
                </div >
            </Modal >

            {/* Commit Modal */}
            < Modal isOpen={isCommitModalOpen} onClose={() => setIsCommitModalOpen(false)} title="Commit Your Progress 💾" size="md" >
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
            </Modal >

            {/* History Modal */}
            < Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title="Project History 📜" size="lg" >
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
            </Modal >
            {/* Step Edit Modal */}
            <Modal isOpen={!!editingStepId} onClose={() => setEditingStepId(null)} title="Edit Mission Step ✏️" size="md">
                <div className="p-6">
                    <div className="space-y-4">
                        <div>
                            <label className={LABEL_CLASS}>Evidence / Proof Link</label>
                            <div className="relative">
                                <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    className={`${INPUT_CLASS} pl-10`}
                                    placeholder="https://..."
                                    value={editEvidence}
                                    onChange={e => setEditEvidence(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <label className={LABEL_CLASS}>Reflection / Notes</label>
                            <textarea
                                className={INPUT_CLASS}
                                rows={4}
                                placeholder="What did you learn? Any challenges?"
                                value={editNote}
                                onChange={e => setEditNote(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setEditingStepId(null)}
                                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveStepEdit}
                                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    );
};
