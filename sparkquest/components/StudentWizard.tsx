
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StudentProject, Workflow, ProjectStep, TaskStatus, Assignment } from '../types';
import { generateCoverArt, analyzeSubmission } from '../services/gemini';
import { api } from '../services/api';
import { WizardNode, WizardNodeProps } from './WizardNode';
import { WizardModal } from './WizardModal';
import { ConnectionStatus } from './ConnectionStatus';

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
const WORKFLOWS: Workflow[] = [
  { id: 'design-thinking', name: 'Design Thinking', description: 'Empathize, Define, Ideate, Prototype, Test', color: 'bg-pink-500', icon: '🎨' },
  { id: 'engineering', name: 'Engineering', description: 'Ask, Imagine, Plan, Create, Improve', color: 'bg-blue-500', icon: '⚙️' },
  { id: 'scientific', name: 'Scientific Method', description: 'Hypothesis, Experiment, Analysis, Conclusion', color: 'bg-teal-500', icon: '🧪' },
];

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
  // Auto-select recommended workflow
  useEffect(() => {
    if (assignment.recommendedWorkflow && !project.workflowId) {
      updateProject({ workflowId: assignment.recommendedWorkflow });
    }
  }, [assignment.recommendedWorkflow, project.workflowId, updateProject]);

  const handleLockIn = async () => {
    playSound('success');

    // Auto-generate steps if missing
    if (project.workflowId && (!project.steps || project.steps.length === 0)) {
      try {
        const { getFirestore, doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../services/firebase'); // Dynamic import to avoid collision or if not modifying top

        const workflowSnap = await getDoc(doc(db, 'process_templates', project.workflowId));
        if (workflowSnap.exists()) {
          const data = workflowSnap.data();
          if (data?.phases) {
            const newSteps = data.phases.map((p: any) => ({
              id: p.id || Date.now().toString() + Math.random(),
              title: p.name,
              status: 'todo'
            }));
            console.log('✨ Auto-generating steps from workflow:', newSteps);
            updateProject({ steps: newSteps });
          }
        }
      } catch (e) {
        console.error("Failed to auto-generate steps:", e);
      }
    }

    closeModal();
  };

  return (
    <div className="space-y-8">
      <div className="bg-indigo-50 p-4 rounded-2xl border-2 border-indigo-100 text-center">
        <p className="text-indigo-600 font-bold">Recommended for this mission: <span className="uppercase font-black">{assignment.recommendedWorkflow}</span></p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {WORKFLOWS.map(wf => (
          <div
            key={wf.id}
            onClick={() => { playSound('click'); updateProject({ workflowId: wf.id }); }}
            className={`
                relative p-6 rounded-[2rem] border-4 cursor-pointer transition-all transform hover:scale-105 duration-300
                ${project.workflowId === wf.id ? `${wf.color} border-white shadow-xl scale-105 text-white ring-4 ring-offset-2 ring-blue-200` : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}
              `}
          >
            {/* Highlight Recommended */}
            {wf.id === assignment.recommendedWorkflow && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-sm z-10 whitespace-nowrap">
                Suggested
              </div>
            )}
            <div className="text-5xl mb-4 transform transition-transform group-hover:rotate-12">{wf.icon}</div>
            <h3 className="text-xl font-black mb-2">{wf.name}</h3>
            <p className={`text-sm font-bold ${project.workflowId === wf.id ? 'text-white/90' : 'text-slate-400'}`}>{wf.description}</p>
          </div>
        ))}
      </div>
      <button
        onClick={handleLockIn}
        disabled={!project.workflowId}
        className="w-full py-4 rounded-3xl bg-green-500 text-white font-black text-xl uppercase tracking-wider border-b-8 border-green-700 active:border-b-0 active:translate-y-2 disabled:opacity-50 hover:bg-green-400 transition-colors"
      >
        Lock In Strategy
      </button>
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
            {!isLocked && (
              <button onClick={() => removeStep(step.id)} className="text-red-300 hover:text-red-500 p-2">🗑️</button>
            )}
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
  const realId = taskId.replace('step-', '');
  const step = project.steps.find(s => s.id === realId);

  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // ← MISSING! Causes crash after submission
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const result = await analyzeSubmission(step.title, note, base64);

    // 2. Submit for Review
    if (result.approved) {
      playSound('success');
      // Change status to PENDING_REVIEW instead of DONE
      const updatedSteps = project.steps.map(s => s.id === realId ? {
        ...s,
        status: 'PENDING_REVIEW' as TaskStatus,
        evidence: preview || undefined,
        note: note
      } : s);

      updateProject({ steps: updatedSteps });

      // Background sync (triggers Notification)
      console.log('🔧 [StudentWizard] About to call api.syncProject with station:', project.station);
      await api.syncProject({ ...project, steps: updatedSteps }); // Force immediate sync!
      console.log('🔧 [StudentWizard] api.syncProject completed!');
      api.submitStepEvidence(step.id, { note, image: base64 });

      setTimeout(() => closeModal(), 1500);
    }
    setSubmitting(false);
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

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-6 rounded-3xl border-4 border-blue-100 text-blue-900 font-bold text-center text-lg relative overflow-hidden">
        <div className="relative z-10">Mission: {step.title}</div>
        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-200 rounded-bl-full opacity-50"></div>
      </div>

      {/* PENDING REVIEW BANNER */}
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

      {/* Resources / Tool Links - ALWAYS VISIBLE */}
      {step.resources && step.resources.length > 0 && (
        <div>
          <label className="block text-sm font-black text-slate-400 uppercase tracking-wider mb-3">Mission Tools</label>
          <div className="flex flex-wrap gap-3">
            {step.resources.map((res, idx) => (
              <a
                key={idx}
                href={res.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:scale-105 transition-all shadow-sm"
              >
                <span>{res.title}</span>
                <span className="text-xs opacity-50">↗</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* SUBMISSION FORM (Only if NOT pending OR isEditing) */}
      {step.status !== 'PENDING_REVIEW' || isEditing ? (
        <>
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
          </div>

          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full rounded-3xl border-4 border-slate-200 p-4 font-bold text-slate-600 min-h-[100px] focus:border-blue-400 outline-none transition-colors resize-none"
            placeholder="How did it go? Notes for Commander..."
          />

          <button
            onClick={handleSubmit}
            disabled={submitting || (!note && !file)}
            className="w-full py-4 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xl uppercase tracking-wider border-b-8 border-indigo-800 active:border-b-0 active:translate-y-2 disabled:opacity-50 hover:to-indigo-500 transition-all shadow-xl shadow-blue-500/20"
          >
            {submitting ? 'Transmitting...' : 'Submit for Review'}
          </button>
        </>
      ) : (
        <button onClick={closeModal} className="w-full py-4 rounded-3xl bg-slate-100 text-slate-500 font-bold hover:bg-slate-200 transition-colors">
          Close
        </button>
      )}
    </div>
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

interface StudentWizardProps {
  assignment: Assignment;
  initialProject: StudentProject;
  isConnected?: boolean;
  onExit?: () => void;
}

export const StudentWizard: React.FC<StudentWizardProps> = ({ assignment, initialProject, isConnected = true, onExit }) => {
  // State
  const [project, setProject] = useState<StudentProject>(initialProject);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

    // 2. Strategy
    nodes.push({
      id: 'strategy',
      type: 'STRATEGY',
      title: 'Compass',
      status: !project.title ? 'LOCKED' : project.workflowId ? 'COMPLETED' : 'ACTIVE',
      icon: '🧭',
      onClick: () => handleNodeClick('strategy'),
      onHover: () => playSound('hover')
    });

    // 3. Blueprint
    nodes.push({
      id: 'blueprint',
      type: 'BLUEPRINT',
      title: 'Blueprint',
      status: !project.workflowId ? 'LOCKED' : (project.status === 'building' || project.status === 'submitted' || project.status === 'published') ? 'COMPLETED' : 'ACTIVE',
      icon: '📝',
      onClick: () => handleNodeClick('blueprint'),
      onHover: () => playSound('hover')
    });

    // 4. Tasks
    if (project.status === 'building' || project.status === 'submitted' || project.status === 'published') {
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
          if (!prevStep || prevStep.status === 'DONE' || prevStep.status === 'done') {
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

  return (
    <div className="h-full flex flex-col bg-slate-900 w-full overflow-hidden relative selection:bg-blue-500 selection:text-white">

      {/* Connection Status Indicator */}
      <ConnectionStatus isConnected={isConnected} isSaving={isSaving} error={saveError} />

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
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
            <span className="text-4xl">🪐</span> SparkQuest
          </h1>
          <p className="text-slate-400 font-bold text-sm uppercase tracking-wider pl-12">{assignment.station} | {assignment.title}</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="px-4 py-2 bg-slate-800 text-blue-400 rounded-xl font-black border border-slate-700 shadow-inner">
            Step {activeNodeIndex !== -1 ? activeNodeIndex + 1 : nodes.length} <span className="text-slate-600">/</span> {nodes.length}
          </div>
          {onExit && (
            <button
              onClick={onExit}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-bold transition-colors text-sm"
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
              <div key={node.id} className={`transform transition-all duration-500 ${i % 2 === 0 ? '-translate-y-0' : 'translate-y-10'}`}>
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
          {activeNodeId.startsWith('step-') && <TaskStepContent project={project} assignment={assignment} updateProject={updateProject} closeModal={() => setActiveNodeId(null)} taskId={activeNodeId} />}
          {activeNodeId === 'publish' && <PublishStepContent project={project} assignment={assignment} updateProject={updateProject} closeModal={() => setActiveNodeId(null)} />}
        </WizardModal>
      )}

    </div>
  );
};
