
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StudentProject, Workflow, ProjectStep, TaskStatus, Assignment } from '../types';
import { generateCoverArt, analyzeSubmission } from '../services/gemini';
import { api } from '../services/api';
import { WizardNode, WizardNodeProps } from './WizardNode';
import { WizardModal } from './WizardModal';
import { ConnectionStatus } from './ConnectionStatus';
import { useSession } from '../context/SessionContext';
import { useAuth } from '../context/AuthContext';
import { useFactoryData } from '../hooks/useFactoryData';
import { getRandomMindset, getProjectIcon, MINDSET_LIBRARY } from '../utils/MindsetLibrary';
import { TypingChallenge } from './TypingChallenge';
import { useTheme, THEMES } from '../context/ThemeContext';
import { useFocusSession } from '../context/FocusSessionContext';
import { ResourceViewerModal } from './ResourceViewerModal';

// --- Sound Utility (Synthesizer) ---
const playSound = (type: 'hover' | 'click' | 'success' | 'open') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'hover') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'click') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'open') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(600, now + 0.3);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'success') {
      const playNote = (freq: number, time: number) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = freq;
        o.connect(g);
        g.connect(ctx.destination);
        g.gain.setValueAtTime(0.1, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
        o.start(time);
        o.stop(time + 0.5);
      };
      playNote(523.25, now); // C5
      playNote(659.25, now + 0.1); // E5
      playNote(783.99, now + 0.2); // G5
      playNote(1046.50, now + 0.3); // C6
    }
  } catch (e) {
    // Ignore audio errors
  }
};

// --- Static Data ---
// --- Static Data ---
// Removed MOCK WORKFLOWS as per request to rely on DB data only.

// --- Sub-Components ---

interface StepContentProps {
  project: StudentProject;
  assignment: Assignment;
  updateProject: (updates: Partial<StudentProject>) => void;
  closeModal: () => void;
}

const IdentityStepContent: React.FC<StepContentProps> = ({ project, assignment, updateProject, closeModal }) => {
  const [stage, setStage] = useState<'BRIEFING' | 'CUSTOMIZE'>(project.title ? 'CUSTOMIZE' : 'BRIEFING');
  const [generating, setGenerating] = useState(false);

  // Pre-fill student fields with mission context if empty
  useEffect(() => {
    // If first time opening
    if (!project.title && stage === 'CUSTOMIZE') {
      // Auto set station
      if (project.station !== assignment.station) {
        updateProject({ station: assignment.station });
      }
      // Auto suggest concept
      if (!project.description) {
        updateProject({ description: `My plan for the ${assignment.title} is to build...` });
      }
    }
  }, [stage, project.title, project.station, project.description, assignment, updateProject]);

  const handleGenerate = async () => {
    if (!project.title || !project.description) return;
    playSound('click');
    setGenerating(true);
    const art = await generateCoverArt(project.title, project.description);
    updateProject({ coverImage: art || `https://placehold.co/600x400/indigo/white?text=${encodeURIComponent(project.title)}` });
    setGenerating(false);
    playSound('success');
  };

  if (stage === 'BRIEFING') {
    return (
      <div className="space-y-6">
        <div className="bg-slate-900 text-white p-6 rounded-3xl border-4 border-slate-700 shadow-2xl relative overflow-hidden group">
          {/* Holographic Effect */}
          <div className="absolute inset-0 bg-blue-500/10 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-50"></div>
          <div className="relative z-10 text-center space-y-4">
            <div className="inline-block bg-blue-600 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest animate-pulse border border-blue-400">Incoming Mission</div>
            <h2 className="text-4xl font-black uppercase tracking-tight text-blue-300 drop-shadow-lg">{assignment.title}</h2>
            <div className="flex justify-center gap-4 text-slate-400 font-bold uppercase text-xs">
              <span className="flex items-center gap-1"><span className="text-xl">🤖</span> Station: {assignment.station}</span>
              <span className="flex items-center gap-1"><span className="text-xl">📅</span> Due: Friday</span>
            </div>
            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-600 text-left">
              <p className="text-lg leading-relaxed font-bold text-slate-300">
                <span className="text-blue-400">Commander:</span> "{assignment.description}"
              </p>
            </div>

            {/* Rewards Section */}
            <div className="pt-4">
              <p className="text-xs font-black uppercase text-slate-500 mb-3 tracking-widest">Mission Badges Available</p>
              <div className="flex justify-center gap-6">
                {assignment.badges.map(b => (
                  <div key={b.id} className="flex flex-col items-center group/badge">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-3xl border-2 border-slate-600 group-hover/badge:border-yellow-400 group-hover/badge:scale-110 transition-all shadow-lg">
                      {b.icon}
                    </div>
                    <span className="text-xs font-bold text-slate-500 mt-2 group-hover/badge:text-yellow-400">{b.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => { playSound('click'); setStage('CUSTOMIZE'); }}
          className="w-full py-4 rounded-3xl bg-blue-600 text-white font-black text-xl uppercase tracking-wider border-b-8 border-blue-800 active:border-b-0 active:translate-y-2 hover:bg-blue-500 transition-colors shadow-xl"
        >
          Accept Mission
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-center animate-in fade-in slide-in-from-right-8">
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-100 mb-6">
          <p className="text-blue-500 font-black uppercase text-xs tracking-wider">Mission Accepted: {assignment.title}</p>
        </div>

        <div>
          <label className="block text-sm font-black text-slate-400 uppercase tracking-wider mb-2">Codename Your Project</label>
          <input
            value={project.title}
            onChange={e => updateProject({ title: e.target.value })}
            className="w-full text-3xl font-black p-4 rounded-3xl border-4 border-slate-200 focus:border-blue-400 outline-none text-slate-800 text-center transition-all focus:scale-105"
            placeholder="e.g. Mars Explorer X1"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-black text-slate-400 uppercase tracking-wider mb-2">Your Approach</label>
          <textarea
            value={project.description}
            onChange={e => updateProject({ description: e.target.value })}
            className="w-full text-lg font-bold p-4 rounded-3xl border-4 border-slate-200 focus:border-blue-400 outline-none text-slate-600 min-h-[120px] transition-all focus:scale-105"
            placeholder="How will you solve the mission?"
          />
        </div>
      </div>

      <div className="bg-slate-50 p-6 rounded-[2rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center min-h-[200px]">
        {project.coverImage ? (
          <div className="relative group">
            <img src={project.coverImage} alt="Cover" className="rounded-2xl shadow-lg max-h-64 object-cover transform rotate-2 group-hover:rotate-0 transition-transform duration-500" />
            <button onClick={handleGenerate} className="absolute -bottom-4 -right-4 bg-white p-3 rounded-full shadow-lg border-2 border-slate-100 hover:scale-110 transition-transform">🔄</button>
          </div>
        ) : (
          <button onClick={handleGenerate} disabled={generating || !project.title} className={`flex flex-col items-center gap-2 p-4 transition-all ${generating ? 'opacity-50' : 'hover:scale-105'}`}>
            <span className="text-5xl animate-bounce">{generating ? '🔮' : '🎨'}</span>
            <span className="font-black text-slate-400 uppercase">{generating ? 'Conjuring...' : 'Generate Mission Cover'}</span>
          </button>
        )}
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => setStage('BRIEFING')}
          className="px-6 py-4 rounded-3xl bg-slate-200 text-slate-500 font-black text-xl border-b-8 border-slate-300 active:border-b-0 active:translate-y-2 hover:bg-slate-300 transition-colors"
        >
          Back
        </button>
        <button
          onClick={() => { playSound('success'); closeModal(); }}
          disabled={!project.title}
          className="flex-1 py-4 rounded-3xl bg-green-500 text-white font-black text-xl uppercase tracking-wider border-b-8 border-green-700 active:border-b-0 active:translate-y-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-400 transition-colors"
        >
          Start Journey
        </button>
      </div>
    </div>
  );
};

const StrategyStepContent: React.FC<StepContentProps> = ({ project, assignment, updateProject, closeModal }) => {
  const { processTemplates } = useFactoryData();

  // Map ProcessTemplate -> Workflow UI format
  const displayWorkflows = processTemplates.map(pt => ({
    id: pt.id,
    name: pt.name,
    description: pt.description || 'Custom Workflow',
    color: 'bg-indigo-500',
    icon: '🚀'
  }));

  // Add Static Templates
  displayWorkflows.push(
    { id: 'custom-workflow', name: 'Free Build', description: 'No rules. Just you and your imagination.', color: 'bg-amber-500', icon: '✨' },
    { id: 'showcase', name: 'Showcase', description: 'Already finished? Upload and show off!', color: 'bg-fuchsia-600', icon: '🏆' }
  );

  // Auto-select recommended workflow
  // Auto-select recommended workflow
  useEffect(() => {
    // If mission has a recommended workflow
    if (assignment.recommendedWorkflow) {
      // Find it in our available list
      const recommended = displayWorkflows.find(w => w.id === assignment.recommendedWorkflow);

      // If found, and not already set (or set to something else), force it
      if (recommended && project.workflowId !== recommended.id) {
        console.log("Auto-selecting assigned workflow:", recommended.name);
        updateProject({ workflowId: recommended.id });
      }
    }
  }, [assignment.recommendedWorkflow, project.workflowId, updateProject, displayWorkflows]);

  // Refactored to accept ID directly to avoid state race conditions
  const handleLockIn = async (specificWorkflowId?: string) => {
    const targetId = specificWorkflowId || project.workflowId;

    if (!targetId) {
      console.error("❌ [StudentWizard] Cannot lock in: No workflow ID provided or selected.");
      return;
    }

    console.log("🔒 [StudentWizard] Locking in strategy:", targetId);
    playSound('success');

    // Update project state first if it's a new selection
    if (specificWorkflowId && project.workflowId !== specificWorkflowId) {
      updateProject({ workflowId: specificWorkflowId });
    }

    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../services/firebase');
      if (!db) throw new Error("Firestore not initialized");

      // Check if we have the template data in memory first (faster)
      let templateData: any = processTemplates.find(t => t.id === targetId);

      // If not, fetch from DB
      if (!templateData) {
        console.log("⚠️ [StudentWizard] Template not in memory, fetching from DB...");
        const workflowSnap = await getDoc(doc(db as any, 'process_templates', targetId));
        if (workflowSnap.exists()) {
          templateData = workflowSnap.data();
        }
      }

      // Handle Custom/Showcase Logic
      if (targetId === 'custom-workflow') {
        console.log("✨ [StudentWizard] Initializing Free Build");
        if ((project.steps || []).length === 0) {
          updateProject({ workflowId: targetId, steps: [] });
        }
        closeModal();
        return;
      }

      if (targetId === 'showcase') {
        console.log("🏆 [StudentWizard] Initializing Showcase");
        updateProject({ workflowId: targetId, steps: [] }); // No steps needed
        closeModal();
        return;
      }

      if (templateData) {
        console.log("🔥 [StudentWizard] Using Workflow Template Data:", templateData);

        if (templateData?.phases) {
          let updatedSteps = [...(project.steps || [])];
          let hasChanges = false;

          // SCENARIO 1: No steps yet -> Generate all
          if (updatedSteps.length === 0) {
            updatedSteps = templateData.phases.map((p: any) => ({
              id: p.id || Date.now().toString() + Math.random(),
              title: p.name,
              status: 'todo',
              resources: p.resources || []
            }));
            hasChanges = true;
            console.log('✨ Generated new steps from workflow');
          }
          // SCENARIO 2: Steps exist -> MERGE Resources (Fix for existing missions)
          else {
            updatedSteps = updatedSteps.map((step, idx) => {
              const phase = templateData.phases[idx];
              // If titles match (or index alignment assumed), update resources
              if (phase && (phase.name === step.title || idx < templateData.phases.length)) {
                // Force update resources
                return { ...step, resources: phase.resources || [] };
              }
              return step;
            });
            hasChanges = true;
            console.log('🔧 Merged resources into existing steps');
          }

          if (hasChanges) {
            updateProject({
              workflowId: targetId,
              steps: updatedSteps
            });
          }
        }
      } else {
        console.warn("⚠️ [StudentWizard] Workflow template not found for ID:", targetId);
      }
    } catch (e) {
      console.error("Failed to auto-generate steps:", e);
    }

    closeModal();
  };

  // Loading State
  if (processTemplates.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl animate-spin mb-4">⏳</div>
        <p className="font-black text-slate-400 uppercase tracking-wider">Accessing Strategy Database...</p>
      </div>
    );
  }

  // Determine which workflows to show (Restrict if assigned)
  // Support matching by ID OR Name
  const relevantWorkflows = assignment.recommendedWorkflow
    ? displayWorkflows.filter(w => w.id === assignment.recommendedWorkflow || w.name === assignment.recommendedWorkflow)
    : displayWorkflows;

  // Get name for header (Look up from our list using the ID, or fallback to Name match, or Raw Value)
  const recommendedName = assignment.recommendedWorkflow
    ? (
      displayWorkflows.find(w => w.id === assignment.recommendedWorkflow)?.name ||
      displayWorkflows.find(w => w.name === assignment.recommendedWorkflow)?.name ||
      assignment.recommendedWorkflow
    )
    : null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
      {assignment.recommendedWorkflow ? (
        <div className="text-center space-y-6 max-w-lg mx-auto">
          <div className="w-24 h-24 bg-indigo-100 rounded-full mx-auto flex items-center justify-center text-5xl shadow-inner animate-pulse">
            🎯
          </div>
          <div>
            <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tight mb-2">Protocol Assigned</h3>
            <p className="text-slate-500 font-bold text-lg leading-relaxed">
              Commander has designated the <span className="text-indigo-600 font-black">"{recommendedName}"</span> strategy for your mission.
            </p>
          </div>

          <div className="bg-blue-50 p-6 rounded-3xl border-4 border-blue-100/50">
            <p className="text-blue-800 font-bold italic">
              "Are you ready to initialize this strategy and discover your tasks?"
            </p>
          </div>

          <div className="pt-4">
            {/* We only show the ONE card, centered and larger */}
            {relevantWorkflows.map(wf => (
              <div key={wf.id} className="hidden">
                {/* Hidden because we just want the button to act as the confirmation now, or we can show a mini preview */}
              </div>
            ))}

            <button
              onClick={() => {
                // Force selection of the first matching workflow
                const targetWf = relevantWorkflows[0];
                const targetId = targetWf ? targetWf.id : assignment.recommendedWorkflow;

                console.log("🚀 Initializing Protocol:", targetId);
                handleLockIn(targetId);
              }}
              className="w-full py-5 rounded-3xl bg-indigo-600 text-white font-black text-2xl uppercase tracking-wider border-b-8 border-indigo-800 active:border-b-0 active:translate-y-2 hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-3"
            >
              <span>🚀 Initialize {recommendedName}</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-200 text-center">
            <p className="text-slate-500 font-bold">Select a protocol to begin your mission</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {displayWorkflows.map(wf => (
              <div
                key={wf.id}
                onClick={() => { playSound('click'); updateProject({ workflowId: wf.id }); }}
                className={`
                    relative p-8 rounded-[2rem] border-4 cursor-pointer transition-all transform hover:scale-105 duration-300 flex flex-col items-center text-center
                    ${project.workflowId === wf.id ? `${wf.color} border-white shadow-xl scale-105 text-white ring-4 ring-offset-2 ring-blue-200` : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}
                  `}
              >
                <div className="text-6xl mb-6 transform transition-transform group-hover:rotate-12 mt-2">{wf.icon}</div>
                <h3 className="text-2xl font-black mb-2">{wf.name}</h3>
                <p className={`text-sm font-bold leading-relaxed ${project.workflowId === wf.id ? 'text-white/90' : 'text-slate-400'}`}>{wf.description}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => handleLockIn()}
            disabled={!project.workflowId}
            className="w-full py-4 rounded-3xl bg-green-500 text-white font-black text-xl uppercase tracking-wider border-b-8 border-green-700 active:border-b-0 active:translate-y-2 disabled:opacity-50 hover:bg-green-400 transition-colors shadow-lg shadow-green-500/30"
          >
            Lock In Strategy
          </button>
        </>
      )}
    </div>
  );
};

const BlueprintStepContent: React.FC<StepContentProps> = ({ project, updateProject, closeModal }) => {
  const [newStep, setNewStep] = useState('');

  const addStep = () => {
    if (!newStep.trim()) return;
    playSound('click');
    const step: ProjectStep = { id: Date.now().toString(), title: newStep, status: 'todo' };
    updateProject({ steps: [...project.steps, step] });
    setNewStep('');
  };
  const removeStep = (id: string) => {
    playSound('click');
    updateProject({ steps: project.steps.filter(s => s.id !== id) });
  };

  const isLocked = project.status === 'building' || project.status === 'submitted' || project.status === 'published';

  return (
    <div className="space-y-8">
      {!isLocked && (
        <div className="flex gap-2">
          <input
            value={newStep}
            onChange={e => setNewStep(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addStep()}
            className="flex-1 text-lg font-bold p-4 rounded-2xl border-2 border-slate-200 focus:border-blue-400 outline-none"
            placeholder="Add a mission step..."
          />
          <button onClick={addStep} className="bg-blue-500 text-white p-4 rounded-2xl font-black text-xl border-b-4 border-blue-700 active:border-b-0 active:translate-y-1 hover:bg-blue-400 transition-colors">➕</button>
        </div>
      )}

      <div className="space-y-3">
        {project.steps.length === 0 && <div className="text-center text-slate-400 font-bold italic py-8">No steps yet.</div>}
        {project.steps.map((step, idx) => (
          <div key={step.id} className="bg-slate-50 p-4 rounded-2xl border-b-4 border-slate-200 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-4">
              <span className="bg-slate-200 text-slate-500 font-black w-8 h-8 flex items-center justify-center rounded-full">{idx + 1}</span>
              <span className="font-bold text-slate-700 text-lg">{step.title}</span>
            </div>
            {/* Delete button removed to lock workflow */}
          </div>
        ))}
      </div>

      {!isLocked ? (
        <button
          onClick={() => { playSound('success'); updateProject({ status: 'building' }); closeModal(); }}
          disabled={project.steps.length === 0}
          className="w-full py-4 rounded-3xl bg-green-500 text-white font-black text-xl uppercase tracking-wider border-b-8 border-green-700 active:border-b-0 active:translate-y-2 disabled:opacity-50 hover:bg-green-400 transition-colors"
        >
          Launch Mission (Start Building) 🚀
        </button>
      ) : (
        <div className="text-center p-4 bg-green-100 rounded-2xl text-green-700 font-bold">
          Mission in progress! Steps are locked.
        </div>
      )}
    </div>
  );
};

const TaskStepContent: React.FC<StepContentProps & { taskId: string }> = ({ project, updateProject, closeModal, taskId }) => {
  const { startSession } = useSession();
  const realId = taskId.replace('step-', '');
  const step = project.steps.find(s => s.id === realId);

  // STAGE MANAGEMENT: 'INSTRUCTION' | 'EVIDENCE'
  const [submissionStage, setSubmissionStage] = useState<'INSTRUCTION' | 'EVIDENCE'>('INSTRUCTION');

  const [note, setNote] = useState('');
  const [link, setLink] = useState(''); // NEW: Evidence Link
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [showCommitInput, setShowCommitInput] = useState(false);
  const [isProMode, setIsProMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Theme Hook
  const { activeTheme } = useTheme();
  const theme = THEMES.find(t => t.id === activeTheme) || THEMES[0];

  const [viewingResource, setViewingResource] = useState<{ title: string; url: string; type: 'file' | 'image' | 'video' | 'link' } | null>(null);

  const EMAIL_TEMPLATE = `Subject: Mission Report - ${step?.title || 'Unknown Step'}

          Dear Commander,

          I have successfully completed the tasks for this mission step.
          Attached is the evidence of my work.

          Key Learnings:
          - [Enter 1 key learning here]

          Ready for inspection.

          Signed,
          ${project.studentId || 'Cadet'}`;

  if (!step) return <div>Error: Step not found</div>;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      playSound('click');
      setFile(e.target.files[0]);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    playSound('click');
    setSubmitting(true);
    let base64 = undefined;
    if (preview) base64 = preview.split(',')[1];

    // 1. AI Analysis (Optional Check)
    setSubmitting(false);
  };

  const handleSaveProgress = async () => {
    if (!commitMessage.trim()) {
      alert('Please enter a commit message');
      return;
    }

    playSound('click');
    const newCommit = {
      id: `commit-${Date.now()}`,
      timestamp: new Date(),
      message: commitMessage,
      stepId: realId
    };

    const updatedProject = {
      ...project,
      commits: [...(project.commits || []), newCommit]
    };

    updateProject(updatedProject);
    await api.syncProject(updatedProject);

    setCommitMessage('');
    setShowCommitInput(false);
    playSound('success');
    alert('✅ Progress saved!');
  };

  if (step.status === 'done') {
    return (
      <div className="text-center py-8">
        <div className="text-6xl mb-4 animate-bounce">🏆</div>
        <h3 className="text-2xl font-black text-slate-800">Step Completed!</h3>
        <p className="text-green-600 font-bold">Commander Approved</p>
        {step.evidence && <img src={step.evidence} className="mt-6 rounded-2xl shadow-lg mx-auto max-h-60 border-4 border-white transform -rotate-1" alt="Evidence" />}
      </div>
    );
  }

  // REJECTED STATE
  if (step.status === 'REJECTED') {
    return (
      <div className="text-center py-8 space-y-6">
        <div className="w-24 h-24 mx-auto bg-red-100 rounded-full flex items-center justify-center animate-bounce">
          <span className="text-5xl">⚠️</span>
        </div>
        <div>
          <h3 className="text-2xl font-black text-red-600">Revision Required</h3>
          <p className="text-slate-500 font-bold">Commander Feedback:</p>
        </div>
        <div className="bg-red-50 p-6 rounded-2xl border-2 border-red-100 text-left max-w-sm mx-auto shadow-sm">
          <p className="text-red-800 font-bold">"{step.reviewNotes || 'Please review instructions and try again.'}"</p>
        </div>
        <button
          onClick={() => {
            // Reset to DOING to allow retry
            const updatedSteps = project.steps.map(s => s.id === realId ? { ...s, status: 'DOING' as TaskStatus } : s);
            updateProject({ steps: updatedSteps });
          }}
          className="w-full py-4 rounded-3xl bg-slate-800 text-white font-black text-xl uppercase tracking-wider hover:bg-slate-700 transition-colors shadow-lg"
        >
          Retry Mission Step
        </button>
      </div>
    );
  }

  console.log('TaskStepContent step:', step);

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-6 rounded-3xl border-4 border-blue-100 text-blue-900 font-bold text-center text-lg relative overflow-hidden">
        <div className="relative z-10">{step.title}</div>
        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-200 rounded-bl-full opacity-50"></div>
      </div>

      {step.status === 'PENDING_REVIEW' && (
        <div className="bg-amber-50 p-6 rounded-3xl border-4 border-amber-100 flex flex-col items-center text-center space-y-4 animate-in fade-in slide-in-from-top-4">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center animate-pulse text-3xl">
            ⏳
          </div>
          <div>
            <h3 className="text-lg font-black text-amber-600 uppercase tracking-wide">Under Review</h3>
            <p className="text-amber-800/70 font-bold text-sm">Mission Control is analyzing your data...</p>
          </div>
          <div className="w-full bg-white/50 p-4 rounded-xl border border-amber-200/50 text-left">
            <p className="text-xs font-black uppercase text-amber-400 mb-1">Your Note</p>
            <p className="text-slate-600 text-sm italic">"{step.note || 'No notes'}"</p>
          </div>
        </div>
      )}

      {/* STAGE 1: INSTRUCTION & RESOURCES */}
      {(submissionStage === 'INSTRUCTION' && step.status !== 'PENDING_REVIEW') && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="bg-slate-50 p-6 rounded-3xl border-4 border-slate-100 text-center">
            <p className="text-slate-500 font-bold text-lg mb-4">
              Execute the tasks below using your tools.
            </p>

            {/* Resources */}
            <div className="flex flex-wrap justify-center gap-4 mb-6">
              {(!step.resources || step.resources.length === 0) && (
                <div className="text-sm text-slate-400 italic">No specific tools required for this step.</div>
              )}
              {step.resources && step.resources.map((res, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const lowerUrl = res.url.toLowerCase();
                    const isEmbeddable = lowerUrl.endsWith('.pdf') || res.type === 'image' || res.type === 'file' || /\.(jpg|jpeg|png|gif|webp)$/i.test(lowerUrl);

                    if (isEmbeddable) {
                      setViewingResource(res);
                      playSound('open');
                    } else {
                      const isElectron = !!(window as any).electron;
                      if (isElectron) {
                        console.log("Launching session for:", res.url);
                        startSession(res.url, 30, res.title, project);
                      } else {
                        window.open(res.url, '_blank');
                      }
                    }
                  }}
                  className="flex items-center gap-3 px-6 py-4 bg-white border-b-4 border-slate-200 rounded-2xl font-black text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:-translate-y-1 transition-all shadow-sm text-lg"
                >
                  <span>{res.title}</span>
                  <span className="text-xs opacity-50 bg-slate-100 px-2 py-1 rounded-md">↗</span>
                </button>
              ))}
            </div>

            <div className="h-px bg-slate-200 w-full my-6"></div>

            <button
              onClick={() => { playSound('click'); setSubmissionStage('EVIDENCE'); }}
              className="w-full py-5 rounded-3xl bg-indigo-600 text-white font-black text-xl uppercase tracking-wider border-b-8 border-indigo-800 active:border-b-0 active:translate-y-2 hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-3"
            >
              <span>✅ I Have Finished This Step</span>
            </button>
          </div>
        </div>
      )}

      {/* STAGE 2: EVIDENCE UPLOAD */}
      {(submissionStage === 'EVIDENCE' || (step.status === 'PENDING_REVIEW' && isEditing)) && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <button
            onClick={() => setSubmissionStage('INSTRUCTION')}
            className="text-slate-400 font-bold hover:text-slate-600 flex items-center gap-2 mb-2"
          >
            <span>← Back to Instructions</span>
          </button>

          <div>
            <label className="block text-sm font-black text-slate-400 uppercase tracking-wider mb-3">Evidence</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-4 border-dashed border-slate-300 rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors bg-slate-50 min-h-[200px] group relative overflow-hidden"
            >
              {preview ? (
                <img src={preview} alt="Preview" className="h-48 object-cover rounded-2xl shadow-md transform rotate-2 group-hover:rotate-0 transition-transform relative z-10" />
              ) : (
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-500 group-hover:scale-110 transition-transform shadow-sm">📷</div>
                  <span className="text-lg font-bold text-slate-400">Upload Photo / Screenshot</span>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFile} className="hidden" accept="image/*" />
            </div>

            {/* NEW: Evidence Link Input */}
            <div className="mt-4">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Or add a Link (Google Doc, Video, etc.)</label>
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://..."
                className="w-full p-4 rounded-2xl border-2 border-slate-200 font-bold text-slate-600 focus:border-blue-400 outline-none"
              />
            </div>

            {/* SCREENSHOT IMPORT & SAVE */}
            <div className="mt-4 flex flex-col gap-3">
              <button
                onClick={() => {
                  const stored = sessionStorage.getItem('temp_evidence');
                  if (stored) {
                    setPreview(stored);
                    fetch(stored)
                      .then(res => res.blob())
                      .then(blob => {
                        const file = new File([blob], "evidence_screenshot.png", { type: "image/png" });
                        setFile(file);
                        playSound('click');
                      });
                  } else {
                    alert("No screenshot found! Take a photo in the Mission Tool/Session first.");
                  }
                }}
                className="text-xs font-bold text-indigo-500 hover:text-indigo-700 underline flex items-center justify-center gap-1 py-2"
              >
                📸 Use Last Session Screenshot
              </button>

              <button
                onClick={() => setShowCommitInput(!showCommitInput)}
                className="w-full py-3 bg-cyan-50 text-cyan-600 rounded-xl font-bold border-2 border-cyan-100 hover:bg-cyan-100 transition-colors"
              >
                💾 Save Progress for Later
              </button>

              {showCommitInput && (
                <div className="p-4 bg-cyan-50 rounded-2xl border-2 border-cyan-100 animate-in fade-in slide-in-from-top-2">
                  <label className="block text-xs font-black text-cyan-600 uppercase tracking-wider mb-2">Commit Message</label>
                  <input
                    type="text"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="e.g., Finished motor assembly"
                    className="w-full p-3 bg-white border-2 border-cyan-200 rounded-xl font-medium text-slate-600 outline-none focus:border-cyan-500 mb-2"
                  />
                  <button
                    onClick={handleSaveProgress}
                    className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold transition-colors"
                  >
                    Save Commit
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Pro Mode Toggle */}
          <div className="flex justify-end mb-2 mt-4">
            <button
              onClick={() => setIsProMode(!isProMode)}
              className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border transition-all ${isProMode ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-slate-400 border-slate-300'}`}
            >
              {isProMode ? '⚡ Pro Mode Active' : 'Enable Pro Mode'}
            </button>
          </div>

          {isProMode ? (
            <TypingChallenge
              template={EMAIL_TEMPLATE}
              onComplete={(text) => {
                setNote(text);
                setIsProMode(false);
                playSound('success');
              }}
              onCancel={() => setIsProMode(false)}
            />
          ) : (
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full rounded-3xl border-4 border-slate-200 p-4 font-bold text-slate-600 min-h-[100px] focus:border-blue-400 outline-none transition-colors resize-none"
              placeholder="How did it go? Notes for Commander..."
            />
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || (!note && !file && !link)}
            className="w-full py-4 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xl uppercase tracking-wider border-b-8 border-indigo-800 active:border-b-0 active:translate-y-2 disabled:opacity-50 hover:to-indigo-500 transition-all shadow-xl shadow-blue-500/20"
          >
            {submitting ? 'Transmitting...' : 'Submit Evidence & Complete'}
          </button>
        </div>
      )}

      {/* PENDING REVIEW VIEW (Read Only) */}
      {(step.status === 'PENDING_REVIEW' && !isEditing) && (
        <button onClick={closeModal} className="w-full py-4 rounded-3xl bg-slate-100 text-slate-500 font-bold hover:bg-slate-200 transition-colors">
          Close
        </button>
      )}

    </div >
  );
};

const PublishStepContent: React.FC<StepContentProps> = ({ project, updateProject, closeModal }) => (
  <div className="text-center space-y-8">
    <div className="text-6xl animate-bounce">🎉</div>
    <h3 className="text-3xl font-black text-slate-800">Ready to Launch!</h3>
    <p className="text-slate-500 font-bold">You've completed all steps. Share your victory!</p>
    <div className="max-w-md mx-auto bg-slate-50 p-6 rounded-3xl border-4 border-slate-200">
      <input className="w-full text-lg font-bold p-3 rounded-2xl border-2 border-slate-200 mb-4" placeholder="YouTube Link..." />
      <button
        onClick={() => { playSound('success'); updateProject({ status: 'submitted' }); closeModal(); }}
        className="w-full bg-indigo-500 text-white py-3 rounded-2xl font-black border-b-4 border-indigo-700 active:border-b-0 active:translate-y-1 hover:bg-indigo-400 transition-colors"
      >
        🚀 PUBLISH TO WORLD
      </button>
    </div>
  </div>
);

const ShowcaseUploadContent: React.FC<StepContentProps> = ({ project, updateProject, closeModal }) => {
  const [link, setLink] = useState(project.presentationUrl || '');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(project.mediaUrls?.[0] || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      playSound('click');
      setFile(e.target.files[0]);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        // Auto-save preview to project mediaUrls logic would go here or on submit
        // For now, let's just update local state until they click submit
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    playSound('success');

    // Simplistic save: update project status and media/link
    updateProject({
      status: 'submitted',
      presentationUrl: link,
      // If we had real file upload, we'd upload here. 
      // For now storing base64 preview in mediaUrls if exists
      mediaUrls: preview ? [preview] : project.mediaUrls
    });

    closeModal();
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-8">
      <div className="text-center space-y-4">
        <h3 className="text-3xl font-black text-slate-800">Showcase Your Work 📸</h3>
        <p className="text-slate-500 font-bold">Upload a photo or paste a link to your completed project.</p>
      </div>

      <div className="flex flex-col gap-6 max-w-xl mx-auto">
        {/* File Upload */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-4 border-dashed border-slate-300 rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors bg-slate-50 min-h-[200px] group relative overflow-hidden"
        >
          {preview ? (
            <img src={preview} alt="Preview" className="h-48 object-cover rounded-2xl shadow-md transform rotate-2 group-hover:rotate-0 transition-transform relative z-10" />
          ) : (
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4 text-indigo-500 group-hover:scale-110 transition-transform shadow-sm">📷</div>
              <span className="text-lg font-bold text-slate-400">Upload Photo</span>
            </div>
          )}
          <input type="file" ref={fileInputRef} onChange={handleFile} className="hidden" accept="image/*" />
        </div>

        {/* Link Input */}
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Video / Project Link</label>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://youtube.com/..."
            className="w-full p-4 rounded-2xl border-2 border-slate-200 font-bold text-slate-600 focus:border-indigo-400 outline-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!preview && !link}
          className="w-full py-5 rounded-3xl bg-indigo-600 text-white font-black text-xl uppercase tracking-wider border-b-8 border-indigo-800 active:border-b-0 active:translate-y-2 disabled:opacity-50 hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/30"
        >
          🚀 Publish to Gallery
        </button>
      </div>
    </div>
  );
};



interface StudentWizardProps {
  assignment: Assignment;
  initialProject: StudentProject;
  isConnected?: boolean;
  onExit?: () => void;
}

export const StudentWizard: React.FC<StudentWizardProps> = ({ assignment, initialProject, isConnected = true, onExit }) => {
  const { user, userProfile } = useAuth();

  // Theme
  const { activeTheme } = useTheme();
  const activeThemeDef = THEMES.find(t => t.id === activeTheme) || THEMES[0];

  // State
  const [project, setProject] = useState<StudentProject>(initialProject);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [mindset] = useState(getRandomMindset()); // Random quote for this session
  const [projectIcon, setProjectIcon] = useState('⚡');

  // Load Factory Data for Auto-Workflow
  const { processTemplates } = useFactoryData();

  // Peer Mock Data (Simulating other students working)
  const [peers] = useState([
    { id: 'p1', name: 'Alex', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex', stepId: 'strategy', color: 'bg-pink-500' },
    { id: 'p2', name: 'Sam', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sam', stepId: 'step-1700000000000', color: 'bg-blue-500' }, // ID match logic needed if real
    { id: 'p3', name: 'Jordan', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan', stepId: 'publish', color: 'bg-emerald-500' }
  ]);

  // Update icon when title changes
  useEffect(() => {
    if (project.title) {
      setProjectIcon(getProjectIcon(project.title));
    }
  }, [project.title]);

  // Focus Session: Auto-start when working on project
  const { startSession, endSession, activeSession, incrementMissions } = useFocusSession();

  useEffect(() => {
    // Auto-start session when student opens wizard to work
    if (!activeSession) {
      startSession();
      console.log('🎯 Auto-started focus session for project work');
    }
    // Increment mission counter when entering
    if (activeSession) {
      incrementMissions();
    }

    // End session when leaving the wizard
    return () => {
      endSession();
      console.log('🛑 Auto-ending focus session on exit');
    };
  }, []); // Only on mount



  // Sync state if prop changes (e.g. from real-time listener)
  useEffect(() => {
    console.log('📥 [StudentWizard] Received project update from parent:', initialProject.id);
    setProject(initialProject);
  }, [initialProject]);

  // Helper to update project with IMMEDIATE sync (optimistic update)
  const updateProject = async (updates: Partial<StudentProject>) => {
    const updatedProject = { ...project, ...updates };

    // 1. Optimistically update UI immediately
    setProject(updatedProject);

    // 2. Save to Firestore in background
    setIsSaving(true);
    setSaveError(null);

    const result = await api.syncProject(updatedProject);

    setIsSaving(false);

    if (!result.success) {
      console.error('❌ [StudentWizard] Save failed:', result.error);
      setSaveError(result.error || 'Failed to save');
      // Optionally: rollback to previous state
      // setProject(project);
    } else {
      console.log('✅ [StudentWizard] Save successful');
    }
  };

  // SELF-HEALING: Ensure studentName is set on the project if missing
  // Placed AFTER updateProject is defined
  // SELF-HEALING: Ensure studentName is set on the project if missing
  // Placed AFTER updateProject is defined
  useEffect(() => {
    // Safety: Only heal if the user is a logged-in student (prevents instructors from overwriting names)
    // We check userProfile.role or assume if missing? Safer to require role check if possible.
    // If checking 'student' role strictly:
    const isStudent = userProfile?.role === 'student' || !userProfile?.role; // Default to allow if no profile yet? No, risky. 
    // Actually, safest is just check if we have a display name.
    // But to prevent instructor overwrite:
    if (userProfile?.role === 'instructor' || userProfile?.role === 'admin') return;

    if (user?.displayName && (!project.studentName || project.studentName === 'Student')) {
      // Only heal if we have a real name to give
      console.log('✨ [StudentWizard] Healing missing student name:', user.displayName);
      updateProject({ studentName: user.displayName });
    }
  }, [user, project.studentName, userProfile]);



  // --- AUTO-APPLY RECOMMENDED WORKFLOW ---
  useEffect(() => {
    // Only run if:
    // 1. Assignment has a recommended workflow
    // 2. Project doesn't imply it's already set up (no steps or explicit ID mismatch)
    // 3. We have templates loaded
    // 3. We have templates loaded
    if (assignment.recommendedWorkflow && processTemplates.length > 0) {
      const template = processTemplates.find(t => t.id === assignment.recommendedWorkflow);

      if (template && template.phases) {
        // CASE 1: Brand New Project (No Workflow)
        if (!project.workflowId) {
          console.log("⚡ [Auto-Workflow] Applying NEW workflow:", template.name);
          const newSteps = template.phases.map((p: any) => {
            const templateResources = p.resources || [];
            const specificResources = assignment.stepResources?.[p.id] || [];
            return {
              id: p.id || Date.now().toString() + Math.random(),
              title: p.name,
              status: 'todo' as TaskStatus,
              resources: [...templateResources, ...specificResources]
            };
          });
          updateProject({ workflowId: template.id, steps: newSteps });
        }
        // CASE 2: Existing Project (Sync Resources)
        else if (project.workflowId === template.id) {
          // Check if we need to inject missing resources (Mission-Specific ones)
          let hasUpdates = false;
          const updatedSteps = project.steps.map((step, index) => {
            // STRATEGY 1: Match by ID (Best)
            let phase = template.phases.find((p: any) => p.id === step.id);

            // STRATEGY 2: Match by Index (Fallback for legacy steps with random IDs)
            // We only do this if IDs don't match but we are confident found the corresponding phase
            if (!phase && template.phases[index]) {
              // Verify title similarity or just trust index for locked workflows?
              // For now, valid assumption: workflow steps don't move.
              phase = template.phases[index];
              console.log(`[Auto-Workflow] Matched step '${step.title}' to phase '${phase.name}' by index ${index}`);
            }

            if (!phase) return step; // No corresponding template phase found

            // Get resources keyed by the TEMPLATE PHASE ID
            const specificResources = assignment.stepResources?.[phase.id] || [];

            if (specificResources.length > 0) {
              const currentResourceUrls = new Set(step.resources?.map(r => r.url));
              const missingResources = specificResources.filter(r => !currentResourceUrls.has(r.url));

              if (missingResources.length > 0) {
                hasUpdates = true;
                console.log(`⚡ [Auto-Workflow] Injecting ${missingResources.length} new resources into step '${step.title}'`);
                return {
                  ...step,
                  resources: [...(step.resources || []), ...missingResources]
                };
              }
            }
            return step;
          });

          if (hasUpdates) {
            updateProject({ steps: updatedSteps });
          }
        }
      }
    }
  }, [assignment.recommendedWorkflow, project.workflowId, processTemplates, updateProject, assignment.stepResources]); // Added assignment.stepResources to dependency

  const handleNodeClick = (id: string) => {
    playSound('open');
    setActiveNodeId(id);
  };

  // --- Derived State for Nodes ---
  const getRoadmapNodes = (): WizardNodeProps[] => {
    const nodes: WizardNodeProps[] = [];

    // 1. Identity
    nodes.push({
      id: 'identity',
      type: 'IDENTITY',
      title: 'The Spark',
      status: project.title ? 'COMPLETED' : 'ACTIVE',
      icon: '✨',
      onClick: () => handleNodeClick('identity'),
      onHover: () => playSound('hover')
    });



    // 2. Strategy - Show always (modified to allow viewing assigned workflow)
    // HIDE STRATEGY for Free Build (Custom Workflow)
    if (project.workflowId !== 'custom-workflow') {
      nodes.push({
        id: 'strategy',
        type: 'STRATEGY',
        title: 'Compass',
        status: !project.title ? 'LOCKED' : project.workflowId ? 'COMPLETED' : 'ACTIVE',
        icon: '🧭',
        onClick: () => handleNodeClick('strategy'),
        onHover: () => playSound('hover')
      });
    }



    // 3. Blueprint OR Showcase Upload
    if (project.workflowId === 'showcase') {
      nodes.push({
        id: 'showcase_upload',
        type: 'BLUEPRINT', // Visual type
        title: 'Exhibit',
        status: (project.status === 'submitted' || project.status === 'published') ? 'COMPLETED' : 'ACTIVE',
        icon: '📸',
        onClick: () => handleNodeClick('showcase_upload'),
        onHover: () => playSound('hover')
      });
    } else {
      nodes.push({
        id: 'blueprint',
        type: 'BLUEPRINT',
        title: project.workflowId === 'custom-workflow' ? 'Workbench' : 'Blueprint',
        status: !project.workflowId ? 'LOCKED' : (project.status === 'building' || project.status === 'submitted' || project.status === 'published') ? 'COMPLETED' : 'ACTIVE',
        icon: project.workflowId === 'custom-workflow' ? '🔨' : '📝',
        onClick: () => handleNodeClick('blueprint'),
        onHover: () => playSound('hover')
      });
    }

    // 4. Tasks (Hide for Showcase)
    if (project.workflowId !== 'showcase' && (project.status === 'building' || project.status === 'submitted' || project.status === 'published')) {
      project.steps.forEach((step, index) => {
        let status: 'LOCKED' | 'ACTIVE' | 'COMPLETED' | 'REVIEW' = 'LOCKED';
        if (step.status === 'done') {
          status = 'COMPLETED';
        } else if (step.status === 'PENDING_REVIEW') {
          status = 'REVIEW';
        } else if (step.status === 'REJECTED') {
          status = 'ACTIVE';
        } else {
          const prevStep = project.steps[index - 1];
          if (!prevStep || prevStep.status === 'done' || prevStep.status === 'PENDING_REVIEW') {
            status = 'ACTIVE';
          }
        }
        if (project.status === 'submitted' || project.status === 'published') status = 'COMPLETED';

        let icon = '🔨';
        if (step.status === 'done') icon = '✅';
        if (step.status === 'PENDING_REVIEW') icon = '⏳';
        if (step.status === 'REJECTED') icon = '⚠️';

        nodes.push({
          id: `step-${step.id}`,
          type: 'TASK',
          title: step.title,
          status: status,
          icon: icon,
          onClick: () => handleNodeClick(`step-${step.id}`),
          onHover: () => playSound('hover')
        });
      });
    }

    // 5. Publish
    // 5. Publish (Hide for Showcase as Upload handles it)
    if (project.workflowId !== 'showcase') {
      const allStepsDone = project.steps.length > 0 && project.steps.every(s => s.status === 'done');
      const canPublish = project.status === 'building' && allStepsDone;

      nodes.push({
        id: 'publish',
        type: 'PUBLISH',
        title: 'Launch',
        status: (project.status === 'submitted' || project.status === 'published') ? 'COMPLETED' : canPublish ? 'ACTIVE' : 'LOCKED',
        icon: '🚀',
        onClick: () => handleNodeClick('publish'),
        onHover: () => playSound('hover')
      });
    }

    return nodes;
  };

  const nodes = getRoadmapNodes();
  const activeNodeIndex = nodes.findIndex(n => n.status === 'ACTIVE' || n.status === 'REVIEW');

  // Auto-scroll
  useEffect(() => {
    if (scrollContainerRef.current && activeNodeIndex !== -1) {
      const itemWidth = 300;
      const scrollPos = (activeNodeIndex * itemWidth) + 150 - (window.innerWidth / 2) + (itemWidth / 2);
      scrollContainerRef.current.scrollTo({ left: Math.max(0, scrollPos), behavior: 'smooth' });
    }
  }, [activeNodeIndex, project.steps.length, project.status]);


  // --- Logic to Generate Two Paths (Base + Progress) ---
  const generatePaths = useCallback(() => {
    const nodeCount = nodes.length;
    if (nodeCount < 2) return { basePath: '', progressPath: '' };

    const itemWidth = 300;
    const startY = 200; // Adjusted for padding

    let d = `M 150 ${startY}`;

    for (let i = 0; i < nodeCount - 1; i++) {
      const currentX = 150 + (i * itemWidth);
      const nextX = 150 + ((i + 1) * itemWidth);

      const currentY = startY + (i % 2 === 0 ? 0 : 40);
      const nextY = startY + ((i + 1) % 2 === 0 ? 0 : 40);

      const cp1X = currentX + (itemWidth / 2);
      const cp1Y = currentY;
      const cp2X = currentX + (itemWidth / 2);
      const cp2Y = nextY;

      d += ` C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${nextX} ${nextY}`;
    }

    // Progress Path: Same logic but truncated based on active node + partial curve
    // For simplicity, we just rebuild the path string up to the active node.
    // If a node is ACTIVE, we draw the line TO it.

    let pD = `M 150 ${startY}`;
    let progressLimit = -1;

    // Find the last completed or active node index
    // Actually, we want the line to go solid up to the active node.
    if (activeNodeIndex > 0) {
      progressLimit = activeNodeIndex;
    } else if (activeNodeIndex === -1 && project.status === 'published') {
      progressLimit = nodeCount; // All done
    }

    for (let i = 0; i < progressLimit; i++) {
      // If we are at the end of nodes, stop
      if (i >= nodeCount - 1) break;

      const currentX = 150 + (i * itemWidth);
      const nextX = 150 + ((i + 1) * itemWidth);
      const currentY = startY + (i % 2 === 0 ? 0 : 40);
      const nextY = startY + ((i + 1) % 2 === 0 ? 0 : 40);
      const cp1X = currentX + (itemWidth / 2);
      const cp1Y = currentY;
      const cp2X = currentX + (itemWidth / 2);
      const cp2Y = nextY;

      pD += ` C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${nextX} ${nextY}`;
    }

    return { basePath: d, progressPath: progressLimit > 0 ? pD : '' };
  }, [nodes, activeNodeIndex, project.status]);

  const { basePath, progressPath } = generatePaths();

  // --- SPECIAL VIEW: SHOWCASE MODE ---
  if (project.workflowId === 'showcase') {
    // Re-using the content component but wrapping it in a full-screen layout
    return (
      <div className={`h-full flex flex-col w-full overflow-hidden relative selection:bg-blue-500 selection:text-white transition-colors duration-700 ${activeThemeDef.bgGradient} ${activeThemeDef.font || ''}`}>
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <svg width="100%" height="100%"><pattern id="cosmic-grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="#60a5fa" strokeWidth="1" /></pattern><rect width="100%" height="100%" fill="url(#cosmic-grid)" /></svg>
        </div>

        {/* Simple Header */}
        <div className="relative z-20 px-8 py-6 flex justify-between items-center">
          <button
            onClick={onExit}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black border border-white/20 backdrop-blur-md flex items-center gap-2 transition-all"
          >
            ← Back to Mission Control
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-8 relative z-10">
          <div className="max-w-2xl w-full bg-white/90 backdrop-blur-xl p-8 rounded-[3rem] shadow-2xl border-4 border-white/50 animate-in zoom-in-95 duration-500">
            <ShowcaseUploadContent
              project={project}
              assignment={assignment}
              updateProject={updateProject}
              closeModal={() => {
                // On submit/close, maybe we exit or show success?
                // For now, let's play sound and exit
                playSound('success');
                if (onExit) onExit();
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col w-full overflow-hidden relative selection:bg-blue-500 selection:text-white transition-colors duration-700 ${activeThemeDef.bgGradient} ${activeThemeDef.font || ''}`}>

      {/* Connection Status Indicator - HIDDEN as per user request */}
      {/* <ConnectionStatus isConnected={isConnected} isSaving={isSaving} error={saveError} /> */}

      {/* --- COSMIC BACKGROUND --- */}
      {/* Grid */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <svg width="100%" height="100%"><pattern id="cosmic-grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="#60a5fa" strokeWidth="1" /></pattern><rect width="100%" height="100%" fill="url(#cosmic-grid)" /></svg>
      </div>
      {/* Stars/Particles */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-10 left-1/4 w-2 h-2 bg-white rounded-full animate-pulse opacity-50"></div>
        <div className="absolute bottom-1/3 right-1/4 w-1 h-1 bg-blue-300 rounded-full animate-pulse opacity-70" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-10 w-3 h-3 bg-indigo-400 rounded-full animate-pulse opacity-40" style={{ animationDelay: '2s' }}></div>
        {/* Glowing Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px]"></div>
      </div>

      {/* Header */}
      <div className="relative z-20 px-8 py-6 bg-slate-900/80 backdrop-blur-md border-b border-slate-700 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-6">
          {/* Student Avatar & XP (Mock for now, replacing previous simple header) */}
          <div className="flex items-center gap-3 pr-6 border-r border-slate-700">
            <div className="relative">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${project.studentId || 'You'}`} className="w-12 h-12 rounded-full border-2 border-slate-500 bg-slate-800" />
              <div className="absolute -bottom-1 -right-1 bg-amber-500 text-amber-900 text-[10px] font-black px-1.5 py-0.5 rounded-md border border-amber-400">
                LVL 3
              </div>
            </div>
            <div>
              <h4 className="text-white font-bold text-sm leading-tight">Cadet Builder</h4>
              <div className="w-20 h-1.5 bg-slate-700 rounded-full mt-1 overflow-hidden">
                <div className="h-full bg-blue-500 w-[60%] animate-pulse"></div>
              </div>
              <p className="text-[10px] text-blue-400 font-bold mt-0.5">850 / 1000 XP</p>
            </div>
          </div>

          <div>
            <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight flex items-center gap-4 filter drop-shadow-lg">
              <span className="text-5xl animate-bounce">{projectIcon}</span> {project.title || assignment.title}
            </h1>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-wider pl-16 flex items-center gap-2">
              <span className="text-blue-400">{assignment.station}</span>
              <span className="text-slate-600">•</span>
              <span>SparkQuest Mission</span>
            </p>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          {/* Mindset Widget */}
          <div className="hidden lg:flex flex-col items-end mr-4 max-w-[200px]">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Creator's Mindset</p>
            <div className="bg-slate-800/50 border border-slate-700 p-2 rounded-xl text-right">
              <p className="text-xs text-slate-300 italic">"{mindset.text}"</p>
              {mindset.author && <p className="text-[10px] text-slate-500 font-bold mt-1">- {mindset.author}</p>}
            </div>
          </div>

          {/* Step Counter - Enlarged */}
          <div className="px-6 py-3 bg-slate-800 text-blue-400 rounded-2xl font-black border-2 border-slate-700 shadow-inner text-lg">
            Step {activeNodeIndex !== -1 ? activeNodeIndex + 1 : nodes.length} <span className="text-slate-600">/</span> {nodes.length}
          </div>
          {onExit && (
            <button
              onClick={onExit}
              className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-white border-b-4 border-emerald-700 active:border-b-0 active:translate-y-1 rounded-2xl font-black transition-all text-lg flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              Exit Mission 🚪
            </button>
          )}
        </div>
      </div>

      {/* Roadmap Container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden relative no-scrollbar flex items-center"
      >
        <div className="relative h-[500px] flex items-center px-[calc(50vw-150px)] min-w-max">

          {/* SVG Path Layer */}
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-visible">
            {/* 1. Base dashed path */}
            <path d={basePath} stroke="#334155" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray="20 10" />

            {/* 2. Glow underlying progress */}
            {progressPath && (
              <path d={progressPath} stroke="#3b82f6" strokeWidth="12" fill="none" strokeLinecap="round" className="opacity-30 blur-md" />
            )}

            {/* 3. Solid Progress path */}
            {progressPath && (
              <path d={progressPath} stroke="#3b82f6" strokeWidth="8" fill="none" strokeLinecap="round" className="animate-pulse" />
            )}
          </svg>

          {/* Nodes */}
          <div className="flex gap-[108px] z-10 pl-[50px]">
            {nodes.map((node, i) => (
              <div key={node.id} className={`transform transition-all duration-500 ${i % 2 === 0 ? '-translate-y-0' : 'translate-y-10'} relative group`}>
                {/* Peer Avatars on Node - ALWAYS VISIBLE & LARGER */}
                {/* Peer Avatars on Node - ALWAYS VISIBLE & LARGER */}
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 flex -space-x-4 z-50 pointer-events-auto">
                  {/* Logic: Show peers based on stepId match OR fallback distribution for liveness */}
                  {peers.filter(p => p.stepId === node.id || (
                    // Fallback: Distribute peers to generic nodes based on index to ensure they appear
                    !nodes.some(n => n.id === p.stepId) && ((i + 1) % 2 === parseInt(p.id.replace(/\D/g, '')) % 2)
                  )).map(peer => (
                    <div
                      key={peer.id}
                      className="w-14 h-14 rounded-full border-4 border-slate-900 bg-slate-700 overflow-hidden relative shadow-xl transform hover:scale-125 hover:z-50 transition-all cursor-pointer"
                      title={`${peer.name} is working on ${node.title}`}
                    >
                      <img src={peer.avatar} className="w-full h-full object-cover" alt={peer.name} />
                      {/* Status Indicator */}
                      <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-slate-900 ${peer.color || 'bg-green-500'}`}></div>
                    </div>
                  ))}
                </div>

                <WizardNode
                  {...node}
                  isFirst={i === activeNodeIndex}
                />
              </div>
            ))}
          </div>

          {/* End Flag */}
          <div className="ml-24 opacity-50 flex flex-col items-center">
            <span className="text-6xl filter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">🏁</span>
          </div>

        </div>
      </div>

      {/* Modals */}
      {activeNodeId && (
        <WizardModal
          title={nodes.find(n => n.id === activeNodeId)?.title || ''}
          icon={nodes.find(n => n.id === activeNodeId)?.icon}
          onClose={() => setActiveNodeId(null)}
          color={activeNodeId.includes('step') ? 'indigo' : 'blue'}
        >
          {activeNodeId === 'identity' && <IdentityStepContent project={project} assignment={assignment} updateProject={updateProject} closeModal={() => setActiveNodeId(null)} />}
          {activeNodeId === 'strategy' && <StrategyStepContent project={project} assignment={assignment} updateProject={updateProject} closeModal={() => setActiveNodeId(null)} />}
          {activeNodeId === 'blueprint' && <BlueprintStepContent project={project} assignment={assignment} updateProject={updateProject} closeModal={() => setActiveNodeId(null)} />}
          {activeNodeId === 'showcase_upload' && <ShowcaseUploadContent project={project} assignment={assignment} updateProject={updateProject} closeModal={() => setActiveNodeId(null)} />}
          {activeNodeId.startsWith('step-') && <TaskStepContent project={project} assignment={assignment} updateProject={updateProject} closeModal={() => setActiveNodeId(null)} taskId={activeNodeId} />}
          {activeNodeId === 'publish' && <PublishStepContent project={project} assignment={assignment} updateProject={updateProject} closeModal={() => setActiveNodeId(null)} />}
        </WizardModal>
      )}

    </div>
  );
};
