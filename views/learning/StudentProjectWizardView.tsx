
import React from 'react';
import { StudentProject, StationType, ProcessTemplate, Badge } from '../../types';
import { STATION_THEMES } from '../../utils/theme';
import { STUDIO_THEME, studioClass } from '../../utils/studioTheme';
import { ClipboardList, Zap, Beaker, Award, ListChecks, Lock, Trash2, Plus, Play, ArrowRight, ArrowLeft, CheckSquare, GitCommit, X, History, RotateCcw, Link as LinkIcon, Sparkles, Loader2, Image as ImageIcon, Layout, Target, Settings, Crown, ChevronRight, Clock, CheckCircle2, Flag, Video, Trophy, Star, Upload, AlertCircle, AlertOctagon } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { generateProjectImage } from '../../services/geminiImageGen';

// Visual mapping for templates
const TEMPLATE_VISUALS: Record<string, { icon: any, color: string }> = {
    'design-thinking': { icon: '🎨', color: 'from-pink-500 to-rose-500' },
    'engineering-process': { icon: '⚙️', color: 'from-blue-500 to-cyan-500' },
    'scientific-method': { icon: '🧬', color: 'from-emerald-500 to-teal-500' },
    'default': { icon: '🚀', color: 'from-violet-500 to-purple-500' }
};

interface StudentProjectWizardProps {
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

export const StudentProjectWizardView: React.FC<StudentProjectWizardProps> = ({
    onClose, projectForm, setProjectForm, activeProject, currentTheme,
    workspaceTab, setWorkspaceTab, selectedWorkflowId, handleWorkflowChange,
    processTemplates, handleSaveProject, handleStartBuilding, handleMoveStep,
    handleAddStep, handleDeleteStep, newStepTitle, setNewStepTitle, apiConfig, isWorkflowLocked, badges, handleSubmitForReview
}) => {
    const INPUT_CLASS = studioClass("w-full p-4 border-2 rounded-xl outline-none transition-all font-bold", STUDIO_THEME.background.card, STUDIO_THEME.border.light, STUDIO_THEME.text.primary, "focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400");
    const LABEL_CLASS = "block text-xs font-black text-slate-400 uppercase tracking-wider mb-2";

    const [isCommitModalOpen, setIsCommitModalOpen] = React.useState(false);
    const [commitMessage, setCommitMessage] = React.useState('');
    const [selectedStepId, setSelectedStepId] = React.useState<string>('');
    const [evidenceLink, setEvidenceLink] = React.useState('');
    const [isGenerating, setIsGenerating] = React.useState(false);

    // Wizard State
    // Default to Step 3 (Blueprint) if steps exist, otherwise Step 1
    const [wizardStep, setWizardStep] = React.useState((projectForm.steps && projectForm.steps.length > 0) ? 3 : 1);

    // Internal Modal States
    const [showProofModal, setShowProofModal] = React.useState(false);
    const [proofStepId, setProofStepId] = React.useState<string | null>(null);
    const [proofFile, setProofFile] = React.useState<string | null>(null);
    const [alertState, setAlertState] = React.useState<{ isOpen: boolean; title: string; message: string; type: 'alert' | 'confirm' | 'success'; onConfirm?: () => void }>({
        isOpen: false, title: '', message: '', type: 'alert'
    });

    // Handlers
    const handleNext = () => setWizardStep(prev => prev + 1);
    const handleBack = () => setWizardStep(prev => prev - 1);

    // Custom Alert/Confirm Helpers
    const showAlert = (title: string, message: string) => {
        setAlertState({ isOpen: true, title, message, type: 'alert' });
    };

    const showConfirm = (title: string, message: string, onConfirm: () => void) => {
        setAlertState({ isOpen: true, title, message, type: 'confirm', onConfirm });
    };

    const isStep1Valid = (projectForm.title?.length || 0) > 3;
    const isStep2Valid = !!selectedWorkflowId;
    const isStep3Valid = (projectForm.steps?.length || 0) > 0;

    // Internal Move Handler (Intercepts 'done' for proof)
    const handleInternalMoveStep = (stepId: string, status: 'todo' | 'doing' | 'done') => {
        if (status === 'done') {
            setProofStepId(stepId);
            setProofFile(null);
            setShowProofModal(true);
        } else {
            handleMoveStep(stepId, status);
        }
    };

    const handleInternalProofSubmit = () => {
        if (!proofStepId || !proofFile) return;

        // Update local form state immediately for UI responsiveness
        const updatedSteps = projectForm.steps?.map(s => s.id === proofStepId ? {
            ...s,
            status: 'done' as const,
            proofUrl: proofFile
        } : s);

        setProjectForm({ ...projectForm, steps: updatedSteps });

        // Call parent handler to ensure persistence if needed, though we just updated the form
        // We manually trigger the move since we intercepted it
        handleMoveStep(proofStepId, 'done');

        // Close modal and show success
        setShowProofModal(false);
        setProofStepId(null);
        setProofFile(null);

        // Optional: Trigger a success toast/alert
        setAlertState({
            isOpen: true,
            title: 'Proof Uploaded!',
            message: 'Great job capturing your progress.',
            type: 'success'
        });
        setTimeout(() => setAlertState(prev => ({ ...prev, isOpen: false })), 2000);
    };

    const handleProofFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProofFile(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

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

        await handleSaveProject(false);
    };

    const handleGenerateImage = async () => {
        if (!apiConfig?.googleApiKey) {
            showAlert("AI Unavailable", "AI generation is disabled (API Key missing).");
            return;
        }

        if (!projectForm.title) {
            showAlert("Title Missing", "Please enter a project title first.");
            return;
        }

        setIsGenerating(true);
        try {
            // Using the updated service signature: (title, station, description, apiKey)
            const result = await generateProjectImage(
                projectForm.title,
                projectForm.station || 'general',
                projectForm.description || '',
                apiConfig.googleApiKey
            );

            if (result.success && result.url) {
                // Ensure we append the new image to existing ones
                setProjectForm({ ...projectForm, mediaUrls: [result.url, ...(projectForm.mediaUrls || [])] });
            } else {
                console.error("Image gen error:", result.error);
                showAlert("Generation Failed", result.error || "Could not generate image. Please try again.");
            }
        } catch (error) {
            console.error("Image generation failed:", error);
            showAlert("Error", "Failed to generate image. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const renderKanbanColumn = (status: 'todo' | 'doing' | 'done', title: string, icon: any, colorClass: string, bgClass: string) => {
        const steps = projectForm.steps?.filter((s) => s.status?.toLowerCase() === status) || [];

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
                            {step.proofUrl && (
                                <div className="mb-4 rounded-xl overflow-hidden border border-slate-100 h-24 relative group/proof">
                                    <img src={step.proofUrl} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover/proof:opacity-100 transition-opacity">
                                        <span className="text-white text-xs font-bold flex items-center gap-1"><CheckSquare size={12} /> Proof</span>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                                {status === 'doing' && (
                                    <>
                                        <button onClick={() => handleInternalMoveStep(step.id, 'todo')} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors" title="Move Back"><ArrowLeft size={18} /></button>
                                        <button onClick={() => handleInternalMoveStep(step.id, 'done')} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95">
                                            Done <CheckSquare size={16} />
                                        </button>
                                    </>
                                )}
                                {status === 'todo' && (
                                    <button onClick={() => handleInternalMoveStep(step.id, 'doing')} className="w-full py-3 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95">
                                        Start Mission <ArrowRight size={16} />
                                    </button>
                                )}
                                {status === 'done' && (
                                    <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs bg-emerald-50 px-3 py-1 rounded-full">
                                        <CheckCircle2 size={14} /> Completed
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
        <div className="fixed inset-0 z-50 bg-slate-50 overflow-hidden flex flex-col font-sans animate-in fade-in duration-300">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#2D2B6B 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

            {/* Top HUD */}
            <div className="border-b relative z-20 bg-white/80 backdrop-blur-xl border-slate-200/60 shrink-0">
                <div className="px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-500 flex items-center justify-center transition-colors">
                            <X size={20} />
                        </button>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight text-slate-800">
                                {projectForm.title || 'Untitled Project'}
                            </h2>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                <span>{currentTheme.label}</span>
                                <span>•</span>
                                <span className={projectForm.status === 'planning' ? 'text-indigo-600' : 'text-emerald-600'}>
                                    {projectForm.status === 'planning' ? 'Planning Phase' : 'Mission Active'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handleSaveProject(false)}
                            className="bg-white border-2 border-slate-100 text-indigo-600 font-bold px-6 py-2.5 rounded-xl hover:border-indigo-100 hover:bg-indigo-50 hover:shadow-sm transition-all flex items-center gap-2"
                        >
                            <CheckSquare size={18} /> Save Draft
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden relative">
                {/* Planning Phase (Wizard) */}
                {projectForm.status === 'planning' && (
                    <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
                        <div className="min-h-full p-8 md:p-12 pb-32 max-w-7xl mx-auto flex flex-col">

                            {/* Wizard Progress */}
                            <div className="flex justify-center mb-12 sticky top-0 z-30 pt-4">
                                <div className="bg-white/90 backdrop-blur-xl px-8 py-3 rounded-full shadow-lg shadow-indigo-500/10 border border-white/50 flex items-center gap-6 text-xs font-black uppercase tracking-wider text-slate-400">
                                    <div className={`transition-colors ${wizardStep >= 1 ? 'text-indigo-600' : ''} flex items-center gap-3`}>
                                        <span className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-sm ${wizardStep >= 1 ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-slate-300'}`}>1</span> Identity
                                    </div>
                                    <div className={`w-12 h-0.5 rounded-full ${wizardStep >= 2 ? 'bg-amber-500' : 'bg-slate-200'}`}></div>
                                    <div className={`transition-colors ${wizardStep >= 2 ? 'text-amber-500' : ''} flex items-center gap-3`}>
                                        <span className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-sm ${wizardStep >= 2 ? 'border-amber-500 bg-amber-50 shadow-sm' : 'border-slate-300'}`}>2</span> Strategy
                                    </div>
                                    <div className={`w-12 h-0.5 rounded-full ${wizardStep >= 3 ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                                    <div className={`transition-colors ${wizardStep >= 3 ? 'text-emerald-500' : ''} flex items-center gap-3`}>
                                        <span className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-sm ${wizardStep >= 3 ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-300'}`}>3</span> Blueprint
                                    </div>
                                </div>
                            </div>

                            {/* STEP 1: IDENTITY */}
                            {wizardStep === 1 && (
                                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-backwards w-full max-w-4xl mx-auto">
                                    <div className="text-center mb-10">
                                        <h1 className="text-6xl md:text-7xl font-black text-slate-900 mb-6 tracking-tight drop-shadow-sm">
                                            The <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 animate-pulse">Spark</span> ✨
                                        </h1>
                                        <p className="text-2xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
                                            Every great invention starts with a tiny spark. <br />What will you bring to life today?
                                        </p>
                                    </div>

                                    <div className="bg-white/70 backdrop-blur-2xl border border-white/50 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group hover:bg-white/80 transition-all duration-500 ring-1 ring-white/50">
                                        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                                        <div className="mb-10 relative z-10">
                                            <label className={LABEL_CLASS}>Project Title</label>
                                            <input
                                                autoFocus
                                                value={projectForm.title || ''}
                                                onChange={e => setProjectForm({ ...projectForm, title: e.target.value })}
                                                placeholder="My Big Idea..."
                                                className="w-full bg-transparent border-b-4 border-slate-200 text-5xl md:text-6xl font-black text-slate-800 placeholder:text-slate-300 focus:border-indigo-600 outline-none pb-4 transition-all"
                                            />
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-10 items-start">
                                            <div className="relative z-10">
                                                <label className={LABEL_CLASS}>The Concept</label>
                                                <textarea
                                                    value={projectForm.description || ''}
                                                    onChange={e => setProjectForm({ ...projectForm, description: e.target.value })}
                                                    placeholder="Describe your mission in a few sentences..."
                                                    className="w-full h-48 bg-slate-50/50 border-2 border-slate-200 rounded-3xl p-6 text-lg font-medium text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:shadow-xl transition-all resize-none leading-relaxed"
                                                />
                                            </div>

                                            {/* AI Image Gen Card */}
                                            <div className="relative group/image">
                                                <div className="aspect-square rounded-[2.5rem] bg-indigo-50 border-4 border-indigo-100 flex flex-col items-center justify-center relative overflow-hidden shadow-inner group-hover/image:border-indigo-200 transition-all">
                                                    {projectForm.mediaUrls?.[0] ? (
                                                        <>
                                                            <img src={projectForm.mediaUrls[0]} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover/image:scale-110" />
                                                            <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity flex justify-center">
                                                                <button onClick={handleGenerateImage} className="px-4 py-2 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-xl font-bold text-sm hover:bg-white/30 transition-all flex items-center gap-2">
                                                                    <RotateCcw size={14} /> Regenerate
                                                                </button>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="text-center p-6 relative z-10">
                                                            <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-4 mx-auto rotate-3 group-hover/image:rotate-6 transition-transform hover:scale-110 duration-300">
                                                                {isGenerating ? <Loader2 className="animate-spin text-indigo-600" size={32} /> : <Sparkles className="text-indigo-400" size={32} fill="currentColor" />}
                                                            </div>
                                                            <h3 className="text-lg font-black text-indigo-900 mb-2">Cover Art</h3>
                                                            {projectForm.title && projectForm.description ? (
                                                                <button
                                                                    onClick={handleGenerateImage}
                                                                    disabled={isGenerating}
                                                                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all text-sm flex items-center gap-2 mx-auto"
                                                                >
                                                                    {isGenerating ? 'Dreaming...' : 'Generate with Magic ✨'}
                                                                </button>
                                                            ) : (
                                                                <p className="text-sm font-medium text-indigo-400/80 max-w-[200px]">Type a title and description to magic up some cover art!</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: STRATEGY */}
                            {wizardStep === 2 && (
                                <div className="animate-in fade-in slide-in-from-right-8 duration-500 w-full max-w-6xl mx-auto">
                                    <div className="text-center mb-12">
                                        <h1 className="text-5xl md:text-6xl font-black text-slate-900 mb-4 drop-shadow-sm">
                                            The <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">Strategy</span> 🧭
                                        </h1>
                                        <p className="text-2xl text-slate-500 font-medium">Choose your path to victory.</p>
                                    </div>

                                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {processTemplates.map((template, idx) => {
                                            const isSelected = selectedWorkflowId === template.id;
                                            const visualKey = Object.keys(TEMPLATE_VISUALS).find(k => template.name.toLowerCase().includes(k.replace('-', ' '))) || 'default';
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
                                <div className="animate-in fade-in slide-in-from-right-8 duration-500 w-full max-w-4xl mx-auto flex flex-col h-full max-h-[calc(100vh-250px)]">
                                    <div className="text-center mb-8 shrink-0">
                                        <h1 className="text-5xl md:text-6xl font-black text-slate-900 mb-4 drop-shadow-sm">
                                            The <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">Blueprint</span> 📝
                                        </h1>
                                        <p className="text-2xl text-slate-500 font-medium">Break it down via small, conquerable steps.</p>
                                    </div>

                                    <div className="flex-1 bg-white/60 backdrop-blur-2xl border border-white/60 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col relative mb-4">
                                        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-50"></div>

                                        <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar pb-32">
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
                        {/* Navigation Footer */}
                        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white/80 to-transparent z-40 flex justify-center gap-4 pointer-events-none">
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
                )}

                {/* Building Phase (Mission Control) */}
                {projectForm.status !== 'planning' && (
                    <div className="flex-1 overflow-hidden flex flex-col bg-slate-50 relative p-8">
                        {/* Animated Background */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/50 via-slate-50 to-emerald-50/50 pointer-events-none"></div>

                        {/* Mission Header */}
                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <h3 className="text-4xl font-black text-slate-800 flex items-center gap-4">
                                <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                                    <Zap size={32} className="text-amber-500 fill-amber-500" />
                                </div>
                                Mission Control 🚀
                            </h3>
                            {projectForm.status !== 'published' && (
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setIsCommitModalOpen(true)}
                                        className="bg-white hover:bg-slate-50 text-slate-600 px-8 py-4 rounded-2xl font-bold border-2 border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center gap-2 text-lg"
                                    >
                                        <GitCommit size={24} /> Commit
                                    </button>
                                    <button
                                        onClick={() => {
                                            const allDone = projectForm.steps?.every(s => s.status === 'done');

                                            const proceed = () => {
                                                if (handleSubmitForReview) {
                                                    handleSubmitForReview();
                                                } else {
                                                    handleSaveProject(false);
                                                }
                                            };

                                            if (!allDone) {
                                                showConfirm(
                                                    "Mission Incomplete",
                                                    "Not all steps are done! Are you sure you want to finish the mission?",
                                                    proceed
                                                );
                                            } else {
                                                proceed();
                                            }
                                        }}
                                        className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-10 py-4 rounded-2xl font-black shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-3 hover:scale-105 active:scale-95 text-xl"
                                    >
                                        Mission Complete <Flag size={24} fill="currentColor" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Kanban Board */}
                        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-8 relative z-10 pb-4">
                            {renderKanbanColumn('todo', 'Ready for Launch', <ListChecks size={24} className="text-indigo-600" />, 'text-indigo-600', 'bg-indigo-50/50')}
                            {renderKanbanColumn('doing', 'In Flight', <Loader2 size={24} className="text-amber-500 animate-spin-slow" />, 'text-amber-600', 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100')}
                            {renderKanbanColumn('done', 'Mission Accomplished', <Trophy size={24} className="text-emerald-500" />, 'text-emerald-600', 'bg-emerald-50/50')}
                        </div>

                        {/* PRESENTATION OVERLAY */}
                        {projectForm.status === 'published' && !projectForm.isPresentationCompleted && (
                            <div className="absolute inset-0 bg-slate-50 z-50 flex flex-col animate-in fade-in slide-in-from-bottom-10">
                                <div className="flex-1 flex flex-col items-center justify-start pt-12 md:pt-24 p-8 text-center max-w-3xl mx-auto overflow-y-auto custom-scrollbar">
                                    <div className="w-32 h-32 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-indigo-500/30 animate-bounce shrink-0">
                                        <Sparkles size={64} className="text-white" />
                                    </div>
                                    <h2 className="text-5xl md:text-6xl font-black text-slate-800 mb-6 leading-tight">Mission Accomplished! 🚀</h2>
                                    <p className="text-xl text-slate-500 font-medium mb-10 max-w-2xl">
                                        Your project is published and live! <br />Now, time to show the world what you built.
                                    </p>

                                    <div className="w-full bg-white p-8 rounded-3xl shadow-xl border-4 border-slate-100 shrink-0">
                                        <label className="block text-sm font-black text-slate-400 uppercase tracking-wider mb-4 text-left">
                                            Presentation Video Link
                                        </label>
                                        <div className="flex gap-4">
                                            <div className="relative flex-1">
                                                <LinkIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
                                                <input
                                                    className="w-full pl-16 pr-6 py-6 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-xl text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400"
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
                                                className="px-10 py-6 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-black text-xl shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Complete <CheckSquare size={28} strokeWidth={3} />
                                            </button>
                                        </div>
                                        {projectForm.isPresentationCompleted && (
                                            <div className="mt-8 p-6 bg-emerald-100/50 border-2 border-emerald-100 text-emerald-700 rounded-2xl font-bold flex items-center gap-4 justify-center animate-in fade-in text-lg">
                                                <CheckSquare size={24} /> Presentation Submitted!
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Commit Modal (Reused Logic) */}
            {isCommitModalOpen && (
                <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8">
                            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600">
                                <GitCommit size={32} />
                            </div>
                            <h3 className="text-2xl font-black text-center mb-2 text-slate-800">Save a Version</h3>
                            <p className="text-slate-500 text-center font-medium mb-8">
                                Create a checkpoint for your project.
                            </p>

                            <div className="space-y-6">
                                <div>
                                    <label className={LABEL_CLASS}>Commit Message</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        className={INPUT_CLASS}
                                        placeholder="e.g., Added robot arms"
                                        value={commitMessage}
                                        onChange={e => setCommitMessage(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleCommit()}
                                    />
                                </div>

                                <div className="flex gap-4 pt-2">
                                    <button
                                        onClick={() => setIsCommitModalOpen(false)}
                                        className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCommit}
                                        disabled={!commitMessage.trim()}
                                        className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        Save Checkpoint
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Proof of Work Modal */}
            {showProofModal && (
                <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border-4 border-slate-100 relative">
                        <div className="p-8 text-center">
                            <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 relative group overflow-hidden border-4 border-white shadow-lg">
                                {proofFile ? (
                                    <img src={proofFile} className="w-full h-full object-cover" />
                                ) : (
                                    <ImageIcon size={40} className="text-indigo-600" />
                                )}
                                <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <Upload size={24} className="text-white" />
                                    <input type="file" accept="image/*" className="hidden" onChange={handleProofFileSelect} />
                                </label>
                            </div>

                            <h3 className="text-3xl font-black text-slate-800 mb-2">Proof of Success! 📸</h3>
                            <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                                Capture a photo of your work to clear this mission step.
                            </p>

                            <div className="flex gap-4">
                                <button onClick={() => setShowProofModal(false)} className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold rounded-2xl transition-all">
                                    Cancel
                                </button>
                                <button
                                    onClick={handleInternalProofSubmit}
                                    disabled={!proofFile}
                                    className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                                >
                                    Mark Done
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Internal Alert/Confirm Modal */}
            {alertState.isOpen && (
                <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border-2 border-slate-100">
                        <div className="p-8 text-center">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${alertState.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
                                alertState.type === 'confirm' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'
                                }`}>
                                {alertState.type === 'success' ? <CheckCircle2 size={32} /> :
                                    alertState.type === 'confirm' ? <AlertCircle size={32} /> : <AlertOctagon size={32} />}
                            </div>
                            <h3 className="text-xl font-black text-slate-800 mb-2">{alertState.title}</h3>
                            <p className="text-slate-500 font-medium mb-8">{alertState.message}</p>
                            <div className="flex gap-3">
                                {alertState.type === 'confirm' && (
                                    <button
                                        onClick={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
                                        className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        if (alertState.type === 'confirm' && alertState.onConfirm) alertState.onConfirm();
                                        setAlertState(prev => ({ ...prev, isOpen: false }));
                                    }}
                                    className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 ${alertState.type === 'success' ? 'bg-emerald-500 shadow-emerald-500/30' :
                                        alertState.type === 'confirm' ? 'bg-indigo-600 shadow-indigo-600/30' : 'bg-rose-500 shadow-rose-500/30'
                                        }`}
                                >
                                    {alertState.type === 'confirm' ? 'Yes, Continue' : 'Got it'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
