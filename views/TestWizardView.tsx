import React, { useState } from 'react';
import {
    ArrowLeft,
    ArrowRight,
    Beaker,
    Check,
    CheckCircle2,
    ClipboardList,
    Code2,
    Compass,
    Flag,
    FlaskConical,
    Image as ImageIcon,
    LayoutTemplate,
    Lightbulb,
    Link as LinkIcon,
    Loader2,
    Plus,
    Presentation,
    RotateCcw,
    Sparkles,
    Trash2,
    Trophy,
    Upload,
    Wrench,
    Zap
} from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext';

type ViewMode = 'planning' | 'building' | 'presentation';
type StepStatus = 'todo' | 'doing' | 'done';

const MOCK_TEMPLATES = [
    { id: 'design-thinking', name: 'Design Thinking', description: 'Empathize, Define, Ideate, Prototype, Test', icon: Lightbulb },
    { id: 'engineering-process', name: 'Engineering', description: 'Ask, Imagine, Plan, Create, Improve', icon: Wrench },
    { id: 'scientific-method', name: 'Science', description: 'Hypothesis, Experiment, Analysis, Conclusion', icon: FlaskConical },
    { id: 'coding', name: 'Coding', description: 'Plan, Code, Review, Debug, Deploy', icon: Code2 },
    { id: 'free-build', name: 'Free Build', description: 'No rules. Just you and your imagination.', icon: Sparkles },
    { id: 'showcase', name: 'Showcase', description: 'Already finished? Upload and show it.', icon: Trophy }
];

interface Step {
    id: string;
    title: string;
    status: StepStatus;
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

const INITIAL_PROJECT: ProjectFormState = {
    title: '',
    description: '',
    mediaUrls: [],
    status: 'planning',
    steps: [],
    presentationUrl: '',
    isPresentationCompleted: false
};

const MODE_OPTIONS: Array<{ id: ViewMode; label: string; icon: React.ElementType }> = [
    { id: 'planning', label: 'Plan', icon: ClipboardList },
    { id: 'building', label: 'Build', icon: Zap },
    { id: 'presentation', label: 'Present', icon: Presentation }
];

const STATUS_CONFIG: Record<StepStatus, { title: string; description: string; icon: React.ElementType; tone: string }> = {
    todo: { title: 'Ready', description: 'Planned work', icon: ClipboardList, tone: 'text-slate-600' },
    doing: { title: 'In progress', description: 'Current focus', icon: Zap, tone: 'text-amber-700' },
    done: { title: 'Complete', description: 'Finished work', icon: CheckCircle2, tone: 'text-teal-700' }
};

export const TestWizardView = () => {
    const { confirm } = useConfirm();
    const [viewMode, setViewMode] = useState<ViewMode>('planning');
    const [wizardStep, setWizardStep] = useState(1);
    const [projectForm, setProjectForm] = useState<ProjectFormState>(INITIAL_PROJECT);
    const [selectedWorkflowId, setSelectedWorkflowId] = useState('');
    const [newStepTitle, setNewStepTitle] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleNext = () => setWizardStep(previous => Math.min(3, previous + 1));
    const handleBack = () => setWizardStep(previous => Math.max(1, previous - 1));

    const handleAddStep = () => {
        const title = newStepTitle.trim();
        if (!title) return;
        setProjectForm(previous => ({
            ...previous,
            steps: [...previous.steps, { id: Date.now().toString(), title, status: 'todo' }]
        }));
        setNewStepTitle('');
    };

    const handleDeleteStep = (id: string) => {
        setProjectForm(previous => ({
            ...previous,
            steps: previous.steps.filter(step => step.id !== id)
        }));
    };

    const handleMoveStep = (stepId: string, status: StepStatus) => {
        setProjectForm(previous => ({
            ...previous,
            steps: previous.steps.map(step => step.id === stepId ? { ...step, status } : step)
        }));
    };

    const handleStartBuilding = () => {
        if (selectedWorkflowId === 'showcase') {
            setProjectForm(previous => ({ ...previous, status: 'published', isPresentationCompleted: true }));
            setViewMode('presentation');
            return;
        }

        setProjectForm(previous => ({ ...previous, status: 'building' }));
        setViewMode('building');
    };

    const handleSubmitProject = async () => {
        const shouldLaunch = await confirm({
            title: 'Launch this project?',
            message: 'All build steps are complete. The project will move to presentation mode.',
            confirmText: 'Launch project',
            cancelText: 'Keep building',
            variant: 'info'
        });
        if (!shouldLaunch) return;

        setProjectForm(previous => ({ ...previous, status: 'published' }));
        setViewMode('presentation');
    };

    const handleAutoGenerateImage = async () => {
        if (!projectForm.title) return;
        setIsGenerating(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        const colors = ['0f766e', '0f172a', 'b45309', '0e7490', '4338ca'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const mockUrl = `https://placehold.co/800x600/${randomColor}/ffffff?text=${encodeURIComponent(projectForm.title)}`;

        setProjectForm(previous => ({ ...previous, mediaUrls: [mockUrl] }));
        setIsGenerating(false);
    };

    const resetProject = () => {
        setViewMode('planning');
        setWizardStep(1);
        setProjectForm(INITIAL_PROJECT);
        setSelectedWorkflowId('');
        setNewStepTitle('');
    };

    const isStep1Valid = projectForm.title.length > 3;
    const isStep2Valid = Boolean(selectedWorkflowId);
    const isStep3Valid = selectedWorkflowId === 'showcase'
        ? Boolean(projectForm.presentationUrl || projectForm.mediaUrls.length)
        : projectForm.steps.length > 0;
    const completeSteps = projectForm.steps.filter(step => step.status === 'done').length;
    const progress = projectForm.steps.length ? Math.round((completeSteps / projectForm.steps.length) * 100) : 0;
    const selectedWorkflow = MOCK_TEMPLATES.find(workflow => workflow.id === selectedWorkflowId);

    const renderKanbanColumn = (status: StepStatus) => {
        const config = STATUS_CONFIG[status];
        const Icon = config.icon;
        const steps = projectForm.steps.filter(step => step.status === status);

        return (
            <section className="flex min-h-[360px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <div className="flex items-center gap-3">
                        <span className={`flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 ${config.tone}`}>
                            <Icon size={18} />
                        </span>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">{config.title}</h3>
                            <p className="text-xs text-slate-500">{config.description}</p>
                        </div>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-600">{steps.length}</span>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-3">
                    {steps.length === 0 && (
                        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center text-slate-400">
                            <Icon size={24} />
                            <span className="text-sm font-medium">No steps here</span>
                        </div>
                    )}
                    {steps.map(step => (
                        <article key={step.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                            <p className="mb-4 text-sm font-bold leading-6 text-slate-800">{step.title}</p>
                            {status === 'todo' && (
                                <button
                                    type="button"
                                    onClick={() => handleMoveStep(step.id, 'doing')}
                                    className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 text-sm font-bold text-white transition-colors hover:bg-teal-700"
                                >
                                    Start step <ArrowRight size={16} />
                                </button>
                            )}
                            {status === 'doing' && (
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleMoveStep(step.id, 'todo')}
                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100"
                                        title="Move back to ready"
                                        aria-label="Move back to ready"
                                    >
                                        <ArrowLeft size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleMoveStep(step.id, 'done')}
                                        className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 text-sm font-bold text-white transition-colors hover:bg-teal-700"
                                    >
                                        Mark complete <Check size={16} />
                                    </button>
                                </div>
                            )}
                            {status === 'done' && (
                                <div className="flex items-center gap-2 text-xs font-bold text-teal-700">
                                    <CheckCircle2 size={16} /> Completed
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            </section>
        );
    };

    return (
        <div className="min-h-screen bg-[#F7F1E4] pb-24 text-[#08111F]">
            <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#08111F] text-white">
                <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <button type="button" onClick={() => setViewMode('planning')} className="flex min-w-0 items-center gap-3 text-left">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-500 text-[#08111F]">
                            <Sparkles size={20} />
                        </span>
                        <span className="min-w-0">
                            <span className="block truncate text-base font-black">Project Wizard</span>
                            <span className="block truncate text-xs text-slate-300">
                                {projectForm.title || 'Create a project with a plan that moves'}
                            </span>
                        </span>
                    </button>

                    <div className="flex items-center gap-2 overflow-x-auto">
                        <div className="flex shrink-0 rounded-lg border border-slate-700 bg-[#0F1B2D] p-1" aria-label="Project mode">
                            {MODE_OPTIONS.map(option => {
                                const Icon = option.icon;
                                const isActive = viewMode === option.id;
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => setViewMode(option.id)}
                                        className={`flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold transition-colors ${isActive ? 'bg-teal-500 text-[#08111F]' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                                        aria-pressed={isActive}
                                    >
                                        <Icon size={15} /> {option.label}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="hidden shrink-0 items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 sm:flex">
                            <span className="h-2 w-2 rounded-full bg-amber-400" />
                            {viewMode === 'planning' ? `Plan ${wizardStep} of 3` : viewMode === 'building' ? `${progress}% complete` : 'Presentation'}
                        </div>
                    </div>
                </div>
            </header>

            {viewMode === 'planning' && (
                <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
                    <div className="mb-6 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                        <aside className="self-start rounded-lg border border-slate-200 bg-white p-4 lg:sticky lg:top-24">
                            <p className="mb-3 text-xs font-bold uppercase text-slate-500">Project plan</p>
                            <div className="space-y-1">
                                {[
                                    { step: 1, label: 'Project idea', icon: Lightbulb },
                                    { step: 2, label: 'Workflow', icon: Compass },
                                    { step: 3, label: selectedWorkflowId === 'showcase' ? 'Evidence' : 'Build steps', icon: LayoutTemplate }
                                ].map(item => {
                                    const Icon = item.icon;
                                    const isCurrent = wizardStep === item.step;
                                    const isComplete = wizardStep > item.step;
                                    return (
                                        <button
                                            key={item.step}
                                            type="button"
                                            onClick={() => item.step <= wizardStep && setWizardStep(item.step)}
                                            disabled={item.step > wizardStep}
                                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold ${isCurrent ? 'bg-[#08111F] text-white' : isComplete ? 'text-teal-700 hover:bg-teal-50' : 'cursor-not-allowed text-slate-400'}`}
                                        >
                                            <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${isCurrent ? 'bg-teal-500 text-[#08111F]' : isComplete ? 'bg-teal-100' : 'bg-slate-100'}`}>
                                                {isComplete ? <Check size={15} /> : <Icon size={15} />}
                                            </span>
                                            {item.label}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="mt-5 border-t border-slate-200 pt-4">
                                <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500">
                                    <span>Planning progress</span>
                                    <span className="font-mono text-amber-700">{Math.round((wizardStep / 3) * 100)}%</span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                    <div className="h-full bg-amber-400 transition-[width] duration-200" style={{ width: `${(wizardStep / 3) * 100}%` }} />
                                </div>
                            </div>
                        </aside>

                        <section className="min-w-0 rounded-lg border border-slate-200 bg-white">
                            {wizardStep === 1 && (
                                <div>
                                    <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
                                        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-teal-700">
                                            <Lightbulb size={15} /> Start with the idea
                                        </div>
                                        <h1 className="text-2xl font-black text-[#08111F] sm:text-3xl">What will you bring to life?</h1>
                                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Name the project, capture the concept, and give it a visual starting point.</p>
                                    </div>

                                    <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
                                        <div className="space-y-5">
                                            <label className="block">
                                                <span className="mb-2 block text-xs font-bold uppercase text-slate-500">Project title</span>
                                                <div className="relative">
                                                    <input
                                                        className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 pr-11 text-lg font-bold text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                                                        placeholder="My big idea"
                                                        value={projectForm.title}
                                                        onChange={event => setProjectForm({ ...projectForm, title: event.target.value })}
                                                        autoFocus
                                                    />
                                                    {isStep1Valid && <CheckCircle2 className="absolute right-4 top-3.5 text-teal-600" size={20} />}
                                                </div>
                                                <span className="mt-1.5 block text-xs text-slate-500">Use at least four characters.</span>
                                            </label>

                                            <label className="block">
                                                <span className="mb-2 block text-xs font-bold uppercase text-slate-500">Concept</span>
                                                <textarea
                                                    className="min-h-44 w-full resize-y rounded-lg border border-slate-300 bg-white p-4 text-sm leading-6 text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                                                    placeholder="I want to build a robot that can..."
                                                    value={projectForm.description}
                                                    onChange={event => setProjectForm({ ...projectForm, description: event.target.value })}
                                                />
                                            </label>
                                        </div>

                                        <div>
                                            <span className="mb-2 block text-xs font-bold uppercase text-slate-500">Project cover</span>
                                            <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                                                {projectForm.mediaUrls[0] ? (
                                                    <img src={projectForm.mediaUrls[0]} alt={`${projectForm.title} project cover`} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-slate-500">
                                                        <ImageIcon size={28} />
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-700">Cover generator ready</p>
                                                            <p className="mt-1 text-xs">Your project title becomes a placeholder cover.</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {isGenerating && (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#08111F]/90 text-white">
                                                        <Loader2 size={26} className="animate-spin text-amber-400" />
                                                        <span className="text-xs font-bold uppercase">Generating cover</span>
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleAutoGenerateImage}
                                                disabled={!projectForm.title || isGenerating}
                                                className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-teal-700 bg-teal-50 px-4 text-sm font-bold text-teal-800 transition-colors hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <Sparkles size={17} /> {isGenerating ? 'Generating...' : 'Generate cover'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {wizardStep === 2 && (
                                <div>
                                    <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
                                        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-amber-700">
                                            <Compass size={15} /> Choose a working rhythm
                                        </div>
                                        <h1 className="text-2xl font-black text-[#08111F] sm:text-3xl">How do you want to build?</h1>
                                        <p className="mt-2 text-sm leading-6 text-slate-600">Pick the workflow that best matches the project. Your choice shapes the final planning step.</p>
                                    </div>

                                    <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-7">
                                        {MOCK_TEMPLATES.map(workflow => {
                                            const Icon = workflow.icon;
                                            const isSelected = selectedWorkflowId === workflow.id;
                                            return (
                                                <button
                                                    key={workflow.id}
                                                    type="button"
                                                    onClick={() => setSelectedWorkflowId(workflow.id)}
                                                    className={`flex min-h-32 items-start gap-4 rounded-lg border p-4 text-left transition-colors ${isSelected ? 'border-teal-600 bg-teal-50 ring-2 ring-teal-600/20' : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50'}`}
                                                    aria-pressed={isSelected}
                                                >
                                                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                                        <Icon size={20} />
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="flex items-center justify-between gap-2">
                                                            <span className="font-bold text-slate-900">{workflow.name}</span>
                                                            {isSelected && <CheckCircle2 size={18} className="shrink-0 text-teal-700" />}
                                                        </span>
                                                        <span className="mt-2 block text-sm leading-5 text-slate-600">{workflow.description}</span>
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {wizardStep === 3 && (
                                <div>
                                    <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
                                        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-teal-700">
                                            {selectedWorkflowId === 'showcase' ? <Upload size={15} /> : <LayoutTemplate size={15} />}
                                            {selectedWorkflowId === 'showcase' ? 'Prepare the exhibit' : 'Shape the build'}
                                        </div>
                                        <h1 className="text-2xl font-black text-[#08111F] sm:text-3xl">
                                            {selectedWorkflowId === 'showcase' ? 'Share what you created' : 'Turn the idea into steps'}
                                        </h1>
                                        <p className="mt-2 text-sm leading-6 text-slate-600">
                                            {selectedWorkflowId === 'showcase' ? 'Add project evidence or a public link.' : `Build a practical sequence for ${selectedWorkflow?.name || 'this workflow'}.`}
                                        </p>
                                    </div>

                                    {selectedWorkflowId === 'showcase' ? (
                                        <div className="space-y-5 p-5 sm:p-7">
                                            <div className="flex min-h-44 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                                                <Upload size={28} className="mb-3 text-teal-700" />
                                                <h3 className="text-sm font-bold text-slate-900">Upload evidence</h3>
                                                <p className="mt-1 text-sm text-slate-500">Drag and drop project photos or videos here.</p>
                                            </div>
                                            <label className="block">
                                                <span className="mb-2 block text-xs font-bold uppercase text-slate-500">External link</span>
                                                <div className="relative">
                                                    <LinkIcon className="absolute left-3 top-3 text-slate-400" size={18} />
                                                    <input
                                                        className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm font-medium text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                                                        placeholder="https://..."
                                                        value={projectForm.presentationUrl || ''}
                                                        onChange={event => setProjectForm({ ...projectForm, presentationUrl: event.target.value })}
                                                    />
                                                </div>
                                            </label>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="min-h-64 space-y-2 p-5 sm:p-7">
                                                {projectForm.steps.length === 0 && (
                                                    <div className="flex min-h-48 flex-col items-center justify-center text-center text-slate-500">
                                                        <Beaker size={28} className="mb-3 text-slate-400" />
                                                        <p className="text-sm font-bold text-slate-800">Your blueprint is empty</p>
                                                        <p className="mt-1 text-sm">Add the first practical step below.</p>
                                                    </div>
                                                )}
                                                {projectForm.steps.map((step, index) => (
                                                    <div key={step.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 font-mono text-sm font-bold text-amber-800">{index + 1}</span>
                                                        <span className="min-w-0 flex-1 break-words text-sm font-bold text-slate-800">{step.title}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteStep(step.id)}
                                                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                                                            title="Delete step"
                                                            aria-label={`Delete ${step.title}`}
                                                        >
                                                            <Trash2 size={17} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 p-4 sm:flex-row">
                                                <input
                                                    className="h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                                                    placeholder="Add a step, for example Sketch ideas"
                                                    value={newStepTitle}
                                                    onChange={event => setNewStepTitle(event.target.value)}
                                                    onKeyDown={event => event.key === 'Enter' && handleAddStep()}
                                                    autoFocus
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleAddStep}
                                                    disabled={!newStepTitle.trim()}
                                                    className="flex h-11 items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 text-sm font-bold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <Plus size={18} /> Add step
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>
                    </div>

                    <div className="sticky bottom-4 flex flex-wrap items-center justify-end gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                        {wizardStep > 1 && (
                            <button type="button" onClick={handleBack} className="flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50">
                                <ArrowLeft size={17} /> Back
                            </button>
                        )}
                        {wizardStep < 3 ? (
                            <button
                                type="button"
                                onClick={handleNext}
                                disabled={wizardStep === 1 ? !isStep1Valid : !isStep2Valid}
                                className="flex h-10 items-center gap-2 rounded-lg bg-teal-600 px-5 text-sm font-bold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Continue <ArrowRight size={17} />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleStartBuilding}
                                disabled={!isStep3Valid}
                                className="flex h-10 items-center gap-2 rounded-lg bg-teal-600 px-5 text-sm font-bold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {selectedWorkflowId === 'showcase' ? <Presentation size={17} /> : <Zap size={17} />}
                                {selectedWorkflowId === 'showcase' ? 'Open presentation' : 'Start building'}
                            </button>
                        )}
                    </div>
                </main>
            )}

            {viewMode === 'building' && (
                <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
                    <section className="mb-5 rounded-lg border border-slate-800 bg-[#0F1B2D] p-5 text-white">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-amber-300">
                                    <Zap size={15} /> Active build
                                </div>
                                <h1 className="text-2xl font-black sm:text-3xl">Mission control</h1>
                                <p className="mt-2 max-w-2xl text-sm text-slate-300">Move each project step from ready to complete. Your plan stays visible and focused.</p>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                <div className="min-w-48 rounded-lg border border-slate-700 bg-[#08111F] px-4 py-3">
                                    <div className="mb-2 flex justify-between text-xs font-bold text-slate-300">
                                        <span>{completeSteps} of {projectForm.steps.length} complete</span>
                                        <span className="font-mono text-amber-300">{progress}%</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                                        <div className="h-full bg-amber-400 transition-[width] duration-200" style={{ width: `${progress}%` }} />
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleSubmitProject}
                                    disabled={projectForm.steps.some(step => step.status !== 'done')}
                                    className="flex h-11 items-center justify-center gap-2 rounded-lg bg-teal-500 px-5 text-sm font-black text-[#08111F] transition-colors hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <Flag size={18} /> Launch project
                                </button>
                            </div>
                        </div>
                    </section>

                    <div className="grid gap-4 lg:grid-cols-3">
                        {renderKanbanColumn('todo')}
                        {renderKanbanColumn('doing')}
                        {renderKanbanColumn('done')}
                    </div>
                </main>
            )}

            {viewMode === 'presentation' && (
                <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
                    <section className="overflow-hidden rounded-lg border border-slate-800 bg-[#0F1B2D] text-white">
                        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px]">
                            <div className="p-6 sm:p-9">
                                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-400 text-[#08111F]">
                                    <Trophy size={25} />
                                </div>
                                <div className="mb-2 text-xs font-bold uppercase text-teal-300">Project presentation</div>
                                <h1 className="max-w-2xl text-3xl font-black sm:text-4xl">Mission accomplished</h1>
                                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Reflect on the journey, add the presentation, and keep the finished project ready to share.</p>

                                <div className="mt-7 grid gap-3 sm:grid-cols-3">
                                    <div className="rounded-lg border border-slate-700 bg-[#08111F] p-3">
                                        <span className="block text-xs text-slate-400">Project</span>
                                        <span className="mt-1 block truncate text-sm font-bold">{projectForm.title || 'Untitled project'}</span>
                                    </div>
                                    <div className="rounded-lg border border-slate-700 bg-[#08111F] p-3">
                                        <span className="block text-xs text-slate-400">Workflow</span>
                                        <span className="mt-1 block truncate text-sm font-bold">{selectedWorkflow?.name || 'Open build'}</span>
                                    </div>
                                    <div className="rounded-lg border border-slate-700 bg-[#08111F] p-3">
                                        <span className="block text-xs text-slate-400">Build steps</span>
                                        <span className="mt-1 block font-mono text-sm font-bold text-amber-300">{completeSteps}/{projectForm.steps.length}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="min-h-64 border-t border-slate-700 bg-[#08111F] lg:border-l lg:border-t-0">
                                {projectForm.mediaUrls[0] ? (
                                    <img src={projectForm.mediaUrls[0]} alt={`${projectForm.title} project cover`} className="h-full min-h-64 w-full object-cover" />
                                ) : (
                                    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 p-6 text-center text-slate-400">
                                        <Presentation size={32} />
                                        <span className="text-sm font-bold">Project ready to present</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    <section className="mt-4 rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
                        {!projectForm.isPresentationCompleted ? (
                            <div>
                                <div className="mb-5">
                                    <h2 className="text-lg font-black text-slate-900">Add a presentation link</h2>
                                    <p className="mt-1 text-sm text-slate-600">Connect the final walkthrough, demo, or reflection video.</p>
                                </div>
                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <label className="relative min-w-0 flex-1">
                                        <span className="sr-only">Presentation video link</span>
                                        <LinkIcon className="absolute left-3 top-3 text-slate-400" size={18} />
                                        <input
                                            className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm font-medium text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                                            placeholder="https://youtube.com/..."
                                            value={projectForm.presentationUrl || ''}
                                            onChange={event => setProjectForm({ ...projectForm, presentationUrl: event.target.value })}
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setProjectForm({ ...projectForm, isPresentationCompleted: true })}
                                        disabled={!projectForm.presentationUrl}
                                        className="flex h-11 items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 text-sm font-bold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <CheckCircle2 size={18} /> Complete presentation
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-start gap-3">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700"><CheckCircle2 size={21} /></span>
                                    <div>
                                        <h2 className="text-lg font-black text-slate-900">Presentation complete</h2>
                                        <p className="mt-1 text-sm text-slate-600">The project is recorded and ready for the next idea.</p>
                                    </div>
                                </div>
                                <button type="button" onClick={resetProject} className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50">
                                    <RotateCcw size={17} /> Start another project
                                </button>
                            </div>
                        )}
                    </section>
                </main>
            )}
        </div>
    );
};
