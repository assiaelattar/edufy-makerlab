import React, { useState, useEffect } from 'react';
import { ClipboardList, Zap, Beaker, Award, ListChecks, Lock, Trash2, Plus, Play, ArrowRight, ArrowLeft, CheckSquare, Sparkles, Loader2, Image as ImageIcon, Layout, Target, Settings, Crown, ChevronRight, Clock, CheckCircle2, Flag, Video, Link as LinkIcon, RotateCcw, Trophy, Star } from 'lucide-react';

// Mocks
const MOCK_TEMPLATES = [
    { id: 'design-thinking', name: 'Design Thinking', description: 'Empathize, Define, Ideate, Prototype, Test', icon: '🎨', color: 'from-pink-500 to-rose-500' },
    { id: 'engineering-process', name: 'Engineering', description: 'Ask, Imagine, Plan, Create, Improve', icon: '⚙️', color: 'from-blue-500 to-cyan-500' },
    { id: 'scientific-method', name: 'Science', description: 'Hypothesis, Experiment, Analysis, Conclusion', icon: '🧬', color: 'from-emerald-500 to-teal-500' },
    { id: 'coding', name: 'Coding', description: 'Plan, Code, Review, Debug, Deploy', icon: '💻', color: 'from-violet-500 to-purple-500' },
];
// Types
interface Step {
    id: string;
    title: string;
    status: 'todo' | 'doing' | 'done';
}

interface ProjectFormState {
    title: string;
    description: string;
    mediaUrls: string[];
    status: 'planning' | 'building' | 'published';
    steps: Step[];
    presentationUrl?: string;
    isPresentationCompleted?: boolean;
}

export const TestWizardView = () => {
    // -- STATE --
    const [viewMode, setViewMode] = useState<'planning' | 'building' | 'presentation'>('planning');
    const [wizardStep, setWizardStep] = useState(1);

    // Project Data
    const [projectForm, setProjectForm] = useState<ProjectFormState>({
        title: '',
        description: '',
        mediaUrls: [],
        status: 'planning',
        steps: [],
        presentationUrl: '',
        isPresentationCompleted: false
    });

    const [selectedWorkflowId, setSelectedWorkflowId] = useState('');
    const [scrolled, setScrolled] = useState(false);

    // Inputs
    const [newStepTitle, setNewStepTitle] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // -- ANIMATIONS --
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // -- HANDLERS --
    const handleNext = () => setWizardStep(prev => prev + 1);
    const handleBack = () => setWizardStep(prev => prev - 1);

    const handleAddStep = () => {
        if (!newStepTitle.trim()) return;
        setProjectForm(prev => ({
            ...prev,
            steps: [...(prev.steps || []), { id: Date.now().toString(), title: newStepTitle, status: 'todo' }]
        }));
        setNewStepTitle('');
    };

    const handleDeleteStep = (id: string) => {
        setProjectForm(prev => ({
            ...prev,
            steps: prev.steps.filter((s) => s.id !== id)
        }));
    };

    const handleMoveStep = (stepId: string, newStatus: 'todo' | 'doing' | 'done') => {
        setProjectForm(prev => ({
            ...prev,
            steps: prev.steps.map(s => s.id === stepId ? { ...s, status: newStatus } : s)
        }));
    };

    const handleStartBuilding = () => {
        // Confetti effect or transition here
        setViewMode('building');
        setProjectForm(prev => ({ ...prev, status: 'building' }));
    };

    const handleSubmitProject = () => {
        if (confirm("Ready to launch your mission? 🚀")) {
            setProjectForm(prev => ({ ...prev, status: 'published' }));
            setViewMode('presentation');
        }
    };

    const handleAutoGenerateImage = async () => {
        if (!projectForm.title) return;
        setIsGenerating(true);
        await new Promise(r => setTimeout(r, 1500));
        const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const mockUrl = `https://placehold.co/800x600/${randomColor.replace('#', '')}/ffffff?text=${encodeURIComponent(projectForm.title)}`;

        setProjectForm(prev => ({ ...prev, mediaUrls: [mockUrl] }));
        setIsGenerating(false);
    };

    // -- RENDER HELPERS --
    const isStep1Valid = projectForm.title.length > 3;
    const isStep2Valid = !!selectedWorkflowId;
    const isStep3Valid = (projectForm.steps?.length || 0) > 0;

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

    // --- MAIN RENDER ---
    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 selection:bg-indigo-500/20 pb-20 overflow-x-hidden">
            {/* AMBIENT BACKGROUND */}
            <div className="fixed inset-0 pointer-events-none">
                <div className={`absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 transition-all duration-1000 ${viewMode === 'building' ? 'opacity-0' : 'opacity-100'}`}></div>
                <div className={`absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-amber-500/10 to-orange-500/10 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4 transition-all duration-1000 ${viewMode === 'building' ? 'opacity-0' : 'opacity-100'}`}></div>

                {/* Building Mode Background */}
                <div className={`absolute inset-0 bg-slate-900 transition-opacity duration-1000 ${viewMode === 'building' ? 'opacity-5' : 'opacity-0'}`}></div>
            </div>

            {/* HEADER */}
            <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-white/80 backdrop-blur-xl shadow-lg border-b border-white/20 py-2' : 'bg-transparent py-6'}`}>
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setViewMode('planning')}>
                        <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/30 group-hover:scale-110 transition-transform duration-300">
                                <Sparkles className="text-white" size={24} />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full animate-pulse"></div>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-black text-2xl tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">Project<span className="text-indigo-600 group-hover:text-slate-900">Wizard</span></span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${viewMode === 'planning' ? 'bg-indigo-500' : 'bg-slate-300'}`}></span>
                                {viewMode === 'planning' ? 'Planning Phase' : viewMode === 'building' ? 'Active Mission' : 'Debrief'}
                            </span>
                        </div>
                    </div>

                    {/* PHASE INDICATOR PILLS */}
                    <div className="hidden md:flex items-center bg-white/60 backdrop-blur-md p-1.5 rounded-full border border-white/50 shadow-sm">
                        {[
                            { id: 'planning', icon: ClipboardList, label: 'Plan' },
                            { id: 'building', icon: Zap, label: 'Build' },
                            { id: 'presentation', icon: Trophy, label: 'Launch' }
                        ].map((phase, idx) => {
                            const isActive = viewMode === phase.id;
                            return (
                                <button
                                    key={phase.id}
                                    onClick={() => setViewMode(phase.id as any)}
                                    className={`
                                        flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-300
                                        ${isActive
                                            ? 'bg-slate-900 text-white shadow-lg scale-105'
                                            : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
                                        }
                                    `}
                                >
                                    <phase.icon size={14} />
                                    {phase.label}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </header>

            {/* --- VIEW: PLANNING WIZARD --- */}
            {viewMode === 'planning' && (
                <main className="pt-32 px-6 max-w-5xl mx-auto relative z-10 pb-32">

                    {/* WIZARD PROGRESS BAR */}
                    <div className="mb-12 max-w-xl mx-auto">
                        <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
                            <span className={wizardStep >= 1 ? 'text-indigo-600' : ''}>Identity</span>
                            <span className={wizardStep >= 2 ? 'text-amber-500' : ''}>Strategy</span>
                            <span className={wizardStep >= 3 ? 'text-emerald-500' : ''}>Blueprint</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-1000 ease-out`}
                                style={{ width: `${(wizardStep / 3) * 100}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* STEP 1: IDENTITY */}
                    {wizardStep === 1 && (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-backwards">
                            <div className="text-center mb-12">
                                <h1 className="text-6xl md:text-7xl font-black text-slate-900 mb-6 tracking-tight drop-shadow-sm">
                                    The <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 animate-pulse">Spark</span> ✨
                                </h1>
                                <p className="text-2xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
                                    Every great invention starts with a tiny spark. <br />What will you bring to life today?
                                </p>
                            </div>

                            <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-10 rounded-[2.5rem] shadow-2xl shadow-indigo-900/5 relative overflow-hidden group hover:bg-white/60 transition-all duration-500">
                                {/* Decorative Blobs inside card */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                                {/* Title Input */}
                                <div className="mb-10 relative z-10">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Project Title</label>
                                    <input
                                        className="w-full text-5xl md:text-6xl font-black bg-transparent border-b-2 border-slate-200/60 py-4 outline-none focus:border-indigo-600 transition-all text-slate-800 placeholder:text-slate-300"
                                        placeholder="My Big Idea..."
                                        value={projectForm.title}
                                        onChange={e => setProjectForm({ ...projectForm, title: e.target.value })}
                                        autoFocus
                                    />
                                    {projectForm.title && (
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 text-emerald-500 animate-in zoom-in spin-in-180 duration-500">
                                            <CheckCircle2 size={40} className="drop-shadow-lg" fill="white" />
                                        </div>
                                    )}
                                </div>

                                <div className="grid md:grid-cols-2 gap-8 relative z-10">
                                    {/* Description */}
                                    <div className="group/desc">
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">The Concept</label>
                                        <div className="relative">
                                            <textarea
                                                className="w-full h-48 bg-white/50 border-2 border-white rounded-3xl p-6 font-medium text-slate-600 outline-none focus:border-indigo-500 focus:bg-white focus:shadow-xl transition-all resize-none text-xl leading-relaxed"
                                                placeholder="I want to build a robot that can..."
                                                value={projectForm.description}
                                                onChange={e => setProjectForm({ ...projectForm, description: e.target.value })}
                                            />
                                            <div className="absolute bottom-4 right-4 text-slate-300 opacity-0 group-hover/desc:opacity-100 transition-opacity">
                                                <Settings size={20} className="animate-spin-slow" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cover Image */}
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Cover Art</label>
                                        <div className="relative w-full h-48 bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl overflow-hidden border-4 border-white shadow-inner group/img hover:shadow-2xl hover:scale-[1.02] transition-all duration-500">
                                            {projectForm.mediaUrls?.[0] ? (
                                                <img src={projectForm.mediaUrls[0]} className="w-full h-full object-cover transition-transform duration-1000 group-hover/img:scale-110" />
                                            ) : (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3">
                                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                                                        <ImageIcon size={24} className="opacity-50" />
                                                    </div>
                                                    <span className="text-sm font-bold opacity-60">AI Art Generator Ready</span>
                                                </div>
                                            )}

                                            {isGenerating && (
                                                <div className="absolute inset-0 bg-black/40 backdrop-blur-md flex flex-col items-center justify-center text-white z-20 animate-in fade-in">
                                                    <Loader2 size={40} className="animate-spin mb-2 text-[#FFC107]" />
                                                    <span className="font-bold animate-pulse tracking-widest text-sm">DREAMING...</span>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={handleAutoGenerateImage}
                                            disabled={!projectForm.title || isGenerating}
                                            className="mt-4 w-full py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-2xl text-white font-bold shadow-xl shadow-fuchsia-500/20 hover:shadow-fuchsia-500/40 hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group/btn overflow-hidden relative"
                                        >
                                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
                                            <Sparkles size={20} className="animate-pulse" />
                                            {isGenerating ? 'Dreaming...' : 'Generate Magic Cover'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: STRATEGY */}
                    {wizardStep === 2 && (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-500 fill-mode-backwards">
                            <div className="text-center mb-12">
                                <h1 className="text-6xl font-black text-slate-900 mb-4 drop-shadow-sm">
                                    The <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">Strategy</span> 🧭
                                </h1>
                                <p className="text-2xl text-slate-500 font-medium max-w-2xl mx-auto">
                                    Every mission needs a plan. Choose your path wisely.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative pb-32">
                                {MOCK_TEMPLATES.map((workflow, idx) => {
                                    const isSelected = selectedWorkflowId === workflow.id;
                                    return (
                                        <div
                                            key={workflow.id}
                                            onClick={() => setSelectedWorkflowId(workflow.id)}
                                            style={{ animationDelay: `${idx * 100}ms` }}
                                            className={`
                                                cursor-pointer p-8 rounded-[2.5rem] border-2 transition-all duration-500 relative overflow-hidden group hover:-translate-y-2 animate-in slide-in-from-bottom-4 fill-mode-backwards
                                                ${isSelected
                                                    ? 'border-transparent bg-white shadow-2xl scale-[1.03] z-10 ring-4 ring-amber-500/20'
                                                    : 'border-white/50 bg-white/40 hover:bg-white hover:shadow-xl hover:border-amber-200/50'
                                                }
                                            `}
                                        >
                                            {/* Background Gradient on Hover */}
                                            <div className={`absolute inset-0 bg-gradient-to-br ${workflow.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>

                                            <div className="flex items-start justify-between mb-6 relative z-10">
                                                <div className={`text-5xl p-4 bg-white/60 rounded-3xl shadow-sm backdrop-blur-sm transition-transform duration-500 ${isSelected ? 'scale-110 rotate-3' : 'group-hover:scale-110'}`}>
                                                    {workflow.icon}
                                                </div>
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isSelected ? 'bg-amber-500 text-white scale-100' : 'bg-slate-200 text-transparent scale-0 group-hover:scale-100'}`}>
                                                    <CheckSquare size={16} strokeWidth={3} />
                                                </div>
                                            </div>

                                            <h3 className={`text-2xl font-black mb-3 transition-colors ${isSelected ? 'text-slate-800' : 'text-slate-600 group-hover:text-slate-800'}`}>{workflow.name}</h3>
                                            <p className="text-base text-slate-500 font-medium leading-relaxed">{workflow.description}</p>
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
                                <h1 className="text-6xl font-black text-slate-900 mb-4 drop-shadow-sm">
                                    The <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">Blueprint</span> 📝
                                </h1>
                                <p className="text-2xl text-slate-500 font-medium">Break it down via small, conquerable steps.</p>
                            </div>

                            <div className="flex-1 bg-white/60 backdrop-blur-2xl border border-white/60 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col relative">
                                <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-50"></div>

                                <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                                    {projectForm.steps?.length === 0 && (
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
                                <div className="p-6 bg-white/80 border-t border-slate-100 flex gap-4 backdrop-blur-md">
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
                </main>
            )}

            {/* --- VIEW: BUILDING KANBAN --- */}
            {viewMode === 'building' && (
                <main className="pt-32 px-6 max-w-8xl mx-auto relative z-10 animate-in zoom-in-95 duration-700">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                        <div>
                            <h1 className="text-5xl font-black text-slate-900 mb-2 flex items-center gap-4">
                                <span className="bg-gradient-to-br from-amber-400 to-orange-600 text-white p-3 rounded-2xl shadow-lg rotate-3"><Zap size={40} fill="currentColor" /></span>
                                Mission Control
                            </h1>
                            <div className="flex items-center gap-2 text-slate-500 font-bold ml-2">
                                <Clock size={16} /> Time Elapsed: 00:00:00
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="bg-white p-2 rounded-xl border border-slate-200 flex -space-x-2">
                                {[1, 2, 3].map(i => <div key={i} className="w-8 h-8 rounded-full bg-slate-300 border-2 border-white"></div>)}
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 border-2 border-white">+2</div>
                            </div>
                            <button
                                onClick={handleSubmitProject}
                                disabled={projectForm.steps.some(s => s.status !== 'done')}
                                className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-2xl shadow-indigo-500/40 hover:scale-105 active:scale-95 hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:grayscale flex items-center gap-3"
                            >
                                <Flag size={20} fill="currentColor" /> Submit Mission
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-8">
                        {renderKanbanColumn('todo', 'To Do', <ClipboardList size={20} />, 'text-slate-500', 'bg-white/40')}
                        {renderKanbanColumn('doing', 'In Progress', <Zap size={20} className="text-amber-500 fill-amber-500" />, 'text-amber-600', 'bg-amber-50/50 border-amber-200/50')}
                        {renderKanbanColumn('done', 'Completed', <CheckSquare size={20} className="text-emerald-500" />, 'text-emerald-600', 'bg-emerald-50/50 border-emerald-200/50')}
                    </div>
                </main>
            )}

            {/* --- VIEW: PRESENTATION --- */}
            {viewMode === 'presentation' && (
                <main className="pt-32 px-6 max-w-4xl mx-auto relative z-10 flex flex-col items-center animate-in slide-in-from-bottom-10 duration-700 pb-32">
                    <div className="relative mb-10 group cursor-pointer">
                        <div className="absolute inset-0 bg-indigo-500 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000"></div>
                        <div className="w-40 h-40 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl shadow-indigo-500/30 animate-bounce relative z-10">
                            <Trophy size={80} className="text-white drop-shadow-md" />
                        </div>
                        <div className="absolute -bottom-2 w-full text-center">
                            <div className="inline-block bg-amber-400 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-lg transform rotate-3">
                                Level Up!
                            </div>
                        </div>
                    </div>

                    <h2 className="text-6xl md:text-7xl font-black text-slate-800 mb-6 leading-tight text-center tracking-tight">
                        Mission <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">Accomplished!</span> 🚀
                    </h2>

                    <p className="text-2xl text-slate-500 font-medium mb-12 text-center max-w-2xl leading-relaxed">
                        Your project is live! Now, reflect on your journey and show the world what you built.
                    </p>

                    <div className="w-full bg-white/80 backdrop-blur-xl p-10 rounded-[3rem] shadow-2xl border-4 border-white relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500"></div>

                        {!projectForm.isPresentationCompleted ? (
                            <div className="relative z-10">
                                <label className="block text-sm font-black text-slate-400 uppercase tracking-widest mb-4 text-left ml-1">
                                    Presentation Video Link
                                </label>

                                <div className="flex gap-4 mb-8">
                                    <div className="relative flex-1 group/input">
                                        <div className="absolute inset-0 bg-indigo-100 rounded-2xl scale-95 opacity-0 group-hover/input:opacity-100 group-hover/input:scale-100 transition-all duration-500"></div>
                                        <LinkIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-indigo-500 transition-colors" />
                                        <input
                                            className="relative w-full pl-14 pr-6 py-6 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-xl text-slate-700 outline-none focus:border-indigo-500 focus:bg-white focus:shadow-xl transition-all placeholder:text-slate-400"
                                            placeholder="https://youtube.com/..."
                                            value={projectForm.presentationUrl || ''}
                                            onChange={e => setProjectForm({ ...projectForm, presentationUrl: e.target.value })}
                                        />
                                    </div>
                                    <button
                                        onClick={() => setProjectForm({ ...projectForm, isPresentationCompleted: true })}
                                        disabled={!projectForm.presentationUrl}
                                        className="px-12 py-6 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-black text-xl shadow-xl shadow-emerald-500/20 hover:scale-[1.03] active:scale-[0.98] hover:shadow-emerald-500/40 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                    >
                                        Complete <CheckSquare size={28} strokeWidth={3} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-center gap-2 text-slate-400 text-sm font-bold bg-slate-50 py-3 rounded-xl border border-slate-100 dashed">
                                    <Video size={16} /> Paste your video link above to unlock your Presentation Badge! 🏅
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 animate-in zoom-in duration-500">
                                <div className="inline-block p-6 bg-emerald-100 rounded-full text-emerald-600 mb-6 animate-bounce">
                                    <CheckCircle2 size={64} />
                                </div>
                                <h3 className="text-4xl font-black text-slate-800 mb-4">You're All Done!</h3>
                                <p className="text-xl text-slate-500 font-medium mb-10 max-w-md mx-auto">Your project has been recorded in the archives of innovation.</p>
                                <button onClick={() => { setViewMode('planning'); setWizardStep(1); setProjectForm({ title: '', description: '', mediaUrls: [], status: 'planning', steps: [], presentationUrl: '', isPresentationCompleted: false }); }} className="px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-2 mx-auto">
                                    <RotateCcw size={20} /> Start Another Mission
                                </button>
                            </div>
                        )}
                    </div>
                </main>
            )}

            {/* NAV BAR (ONLY FOR PLANNING) */}
            {viewMode === 'planning' && (
                <div className="fixed bottom-8 left-0 right-0 z-40 flex justify-center gap-4 pointer-events-none">
                    {wizardStep > 1 && (
                        <button
                            onClick={handleBack}
                            className="pointer-events-auto px-10 py-5 bg-white/90 backdrop-blur-xl border-2 border-slate-100 text-slate-600 rounded-3xl font-bold hover:bg-white hover:border-slate-300 hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center gap-3 drop-shadow-xl"
                        >
                            <ArrowLeft size={24} /> Back
                        </button>
                    )}
                    {wizardStep < 3 ? (
                        <button
                            onClick={handleNext}
                            disabled={wizardStep === 1 ? !isStep1Valid : !isStep2Valid}
                            className="pointer-events-auto px-12 py-5 bg-indigo-600 text-white rounded-3xl font-black text-xl hover:bg-indigo-500 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-indigo-600/40 flex items-center gap-4 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed group"
                        >
                            Next Step <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    ) : (
                        <button
                            onClick={handleStartBuilding}
                            disabled={!isStep3Valid}
                            className="pointer-events-auto px-16 py-5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-3xl font-black text-xl hover:brightness-110 hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-emerald-500/40 flex items-center gap-4 disabled:opacity-50 group"
                        >
                            Start Building 🚀
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
