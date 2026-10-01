
import React, { useState, useRef, useEffect } from 'react';
import { AlertTriangle, ArrowLeft, ArrowUpRight, Camera, Check, ChevronDown, Clock3, Download, File, FileText, Globe, GripVertical, Image, Link as LinkIcon, ListChecks, Map, MessageSquareText, PackageCheck, Pencil, RotateCcw, Save, Send, Target, Trash2, Trophy, Upload, Video, Wrench, X as XIcon } from 'lucide-react';
import { Reorder } from 'framer-motion';
import { StudentProject, Workflow, ProjectStep, TaskStatus, Assignment } from '../types';
import { generateCoverArt, analyzeSubmission } from '../services/gemini';
import { api } from '../services/api';
import { saveLearnerProject } from '../services/projectReview';
import { effectiveStepReviewStatus, stepReviewFeedback, submittedProof } from '../domain/projectReview';
import { db } from '../services/firebase';
import { WizardNode, WizardNodeProps } from './WizardNode';
import { WizardModal } from './WizardModal';
import { ConnectionStatus } from './ConnectionStatus';
import { useSession } from '../context/SessionContext';
import { useAuth } from '../context/AuthContext';
import { useFactoryData } from '../hooks/useFactoryData';
import { TypingChallenge } from './TypingChallenge';
import { useTheme, THEMES } from '../context/ThemeContext';
import { useFocusSession } from '../context/FocusSessionContext';
import { ResourceViewerModal } from './ResourceViewerModal';
import { useToast } from '../context/ToastContext';
import { resolveMissionContent } from '../domain/missionContent';
import {
  buildProjectStepsFromWorkflow,
  createStudentTask,
  createWorkflowSnapshot,
  refreshProjectStepsFromWorkflow,
} from '../domain/workflowPipeline';


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
  updateProject: (updates: Partial<StudentProject>) => Promise<{ success: boolean; error?: string }>;
  closeModal: () => void;
  onShowResources?: () => void;
  previewMode?: boolean;
}

const IdentityStepContent: React.FC<StepContentProps> = ({ project, assignment, updateProject, closeModal, onShowResources }) => {
  const { user, userProfile } = useAuth();
  const [stage, setStage] = useState<'BRIEFING' | 'CUSTOMIZE'>(project.title ? 'CUSTOMIZE' : 'BRIEFING');

  // Typewriter State
  const [displayedText, setDisplayedText] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);

  // Typewriter Effect
  useEffect(() => {
    if (stage === 'BRIEFING') {
      let index = 0;
      const text = assignment.description || "Mission Briefing Unavailable.";
      setDisplayedText('');
      setIsTypingComplete(false);

      const intervalId = setInterval(() => {
        setDisplayedText((prev) => prev + text.charAt(index));
        index++;
        if (index === text.length) {
          clearInterval(intervalId);
          setIsTypingComplete(true);
        }
      }, 30); // Typing speed

      return () => clearInterval(intervalId);
    }
  }, [stage, assignment.description]);

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

  if (stage === 'BRIEFING') {
    return (
      <div className="space-y-4 md:space-y-6">
        <div className="bg-slate-900 text-white p-4 md:p-6 rounded-3xl border-4 border-slate-700 shadow-2xl relative overflow-hidden group">
          {/* Holographic Effect */}
          <div className="absolute inset-0 bg-blue-500/10 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-50"></div>
          <div className="relative z-10 text-center space-y-4">
            <div className="inline-block bg-blue-600 px-3 py-1 md:px-4 md:py-1 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest animate-pulse border border-blue-400">Incoming Mission</div>
            <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-blue-300 drop-shadow-lg">{assignment.title}</h2>
            <div className="flex flex-col md:flex-row justify-center gap-2 md:gap-4 text-slate-400 font-bold uppercase text-xs">
              <span className="flex items-center gap-1 justify-center"><span className="text-xl">🤖</span> Station: {assignment.station}</span>
              <span className="flex items-center gap-1 justify-center"><span className="text-xl">📅</span> Due: Friday</span>
            </div>

            {/* TYPEWRITER DESCRIPTION */}
            <div className="bg-slate-800/80 p-4 md:p-6 rounded-2xl border border-slate-600 text-left min-h-[100px] md:min-h-[120px] flex items-start">
              <p className="text-sm md:text-lg leading-relaxed font-bold text-slate-300 font-mono">
                <span className="text-blue-400 mr-2">Commander:</span>
                {displayedText}
                {!isTypingComplete && <span className="animate-pulse text-blue-400">|</span>}
              </p>
            </div>

            {/* Rewards Section */}
            <div className="pt-2 md:pt-4">
              <p className="text-xs font-black uppercase text-slate-500 mb-3 tracking-widest">Mission Badges Available</p>
              <div className="flex justify-center gap-4 md:gap-6 flex-wrap">
                {assignment.badges.map(b => (
                  <div key={b.id} className="flex flex-col items-center group/badge">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-800 rounded-full flex items-center justify-center text-2xl md:text-3xl border-2 border-slate-600 group-hover/badge:border-yellow-400 group-hover/badge:scale-110 transition-all shadow-lg">
                      {b.icon}
                    </div>
                    <span className="text-[10px] md:text-xs font-bold text-slate-500 mt-2 group-hover/badge:text-yellow-400">{b.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => { playSound('click'); setStage('CUSTOMIZE'); }}
          disabled={!isTypingComplete}
          className={`w-full py-4 rounded-3xl font-black text-lg md:text-xl uppercase tracking-wider border-b-8 transition-all shadow-xl flex items-center justify-center gap-3 ${isTypingComplete
            ? 'bg-blue-600 text-white border-blue-800 active:border-b-0 active:translate-y-2 hover:bg-blue-500 cursor-pointer'
            : 'bg-slate-700 text-slate-500 border-slate-900 cursor-not-allowed opacity-70'
            }`}
        >
          {isTypingComplete ? 'Accept Mission' : 'Receiving Transmission...'}
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
          <label className="block text-sm font-black text-slate-400 uppercase tracking-wider mb-2">
            Codename Your Project <span className="text-red-500">*</span>
          </label>
          <input
            value={project.title}
            onChange={e => updateProject({ title: e.target.value })}
            className={`w-full text-xl md:text-3xl font-black p-3 md:p-4 rounded-3xl border-4 outline-none text-slate-800 text-center transition-all focus:scale-105 ${!project.title ? 'border-red-200 bg-red-50 focus:border-red-400 animate-pulse' : 'border-slate-200 focus:border-blue-400'
              }`}
            placeholder="e.g. Mars Explorer X1"
            autoFocus
          />
          {!project.title && (
            <p className="text-red-400 text-xs font-bold mt-2 animate-bounce">⚠ You must name your project to start</p>
          )}
        </div>

        {/* Read-only Approach Section - "Locked" as per user request to force focus on naming? 
            Or user meant lock the description from Briefing? 
            Assuming 'Your Approach' should assume default or be editable but less emphasized.
            Keeping editable but simplified. */}
        <div>
          <label className="block text-sm font-black text-slate-400 uppercase tracking-wider mb-2">
            Project Cover Image <span className="text-slate-500 font-normal normal-case">(Optional)</span>
          </label>
          <div className="flex items-start gap-4">
            <div className="w-32 h-24 bg-slate-100 rounded-2xl overflow-hidden border-2 border-slate-200 shrink-0 relative group">
              {(project.thumbnailUrl || project.coverImage) ? (
                <img src={project.thumbnailUrl || project.coverImage} className="w-full h-full object-cover" alt="Preview" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <Image size={24} />
                </div>
              )}
            </div>
            <div className="flex-1">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl font-bold transition-colors border-2 border-indigo-100">
                <span className="text-sm">Upload Image</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        alert('File too large (Max 5MB)');
                        return;
                      }

                      try {
                        const organizationId = userProfile?.organizationId;
                        if (!organizationId || !user?.uid) throw new Error('Your student account is not fully linked.');
                        const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                        const path = `student-projects/${organizationId}/${user.uid}/${project.id}/cover-${Date.now()}-${safeFileName}`;
                        const url = await api.uploadFile(file, path);

                        const result = await updateProject({
                          thumbnailUrl: url,
                          coverImage: url,
                          mediaUrls: [url]
                        });
                        if (!result.success) throw new Error(result.error || 'Project image could not be saved.');

                      } catch (error) {
                        console.error("Upload failed", error);
                        alert("Failed to upload image. Please try again.");
                      }
                    }
                  }}
                />
              </label>
              <p className="text-xs text-slate-400 mt-2 font-medium">
                Upload a photo of your project or a screenshot.
              </p>
            </div>
          </div>
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

      <div className="bg-indigo-50 p-4 md:p-6 rounded-[2rem] border-4 border-dashed border-indigo-200 flex flex-col items-center justify-center min-h-[140px] md:min-h-[160px] animate-in zoom-in-95">
        <div className="flex flex-col items-center gap-3">
          <div className="bg-white p-3 rounded-full shadow-md text-2xl md:text-3xl">🧰</div>
          <h3 className="text-lg md:text-xl font-black text-indigo-900">Before you start...</h3>
          <p className="text-xs md:text-sm font-bold text-slate-500 max-w-md">
            Check the mission resources first! Watch the briefing videos and download any necessary files.
          </p>
          {assignment.resources && assignment.resources.length > 0 && (
            <button
              onClick={() => onShowResources && onShowResources()}
              className="mt-2 px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-black rounded-xl shadow-lg transition-all hover:scale-105 flex items-center gap-2"
            >
              <span>Open Resources</span>
              <span className="bg-white/20 px-2 rounded-md text-xs">{assignment.resources.length}</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 md:gap-4">
        <button
          onClick={() => setStage('BRIEFING')}
          className="px-4 py-3 md:px-6 md:py-4 rounded-3xl bg-slate-200 text-slate-500 font-black text-lg md:text-xl border-b-4 md:border-b-8 border-slate-300 active:border-b-0 active:translate-y-2 hover:bg-slate-300 transition-colors"
        >
          Back
        </button>
        <button
          onClick={() => { playSound('success'); closeModal(); }}
          disabled={!project.title}
          className="flex-1 py-3 md:py-4 rounded-3xl bg-green-500 text-white font-black text-lg md:text-xl uppercase tracking-wider border-b-4 md:border-b-8 border-green-700 active:border-b-0 active:translate-y-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-400 transition-colors shadow-lg shadow-green-500/20"
        >
          {project.title ? 'Start Journey 🚀' : 'Name Project to Start 🔒'}
        </button>
      </div>
    </div>
  );
};

const StrategyStepContent: React.FC<StepContentProps> = ({ project, assignment, updateProject, closeModal }) => {
  const { processTemplates } = useFactoryData();
  const { userProfile } = useAuth();

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
          if (!userProfile?.organizationId) throw new Error('Your student account is not fully linked.');
          updateProject({
            workflowId: targetId,
            steps: [],
            organizationId: userProfile.organizationId
          });
        }
        closeModal();
        return;
      }

      if (targetId === 'showcase') {
        console.log("🏆 [StudentWizard] Initializing Showcase");
        if (!userProfile?.organizationId) throw new Error('Your student account is not fully linked.');
        updateProject({
          workflowId: targetId,
          steps: [],
          organizationId: userProfile.organizationId
        }); // No steps needed
        // Allow view to switch to ShowcaseUploadContent automatically on re-render
        return;
      }

      if (templateData?.phases) {
        const templateWithId = { id: targetId, ...templateData };
        const workflowSnapshot = project.workflowSnapshot?.workflowId === targetId
          ? project.workflowSnapshot
          : createWorkflowSnapshot(templateWithId);
        const updatedSteps = (project.steps || []).length === 0
          ? buildProjectStepsFromWorkflow(workflowSnapshot, assignment.stepResources || {})
          : refreshProjectStepsFromWorkflow(project.steps, workflowSnapshot, assignment.stepResources || {});

        updateProject({ workflowId: targetId, workflowSnapshot, steps: updatedSteps });
      } else {
        console.warn("⚠️ [StudentWizard] Workflow template not found for ID:", targetId);
      }
    } catch (e) {
      console.error("Failed to auto-generate steps:", e);
    }

    closeModal();
  };

  // Loading State
  if (processTemplates.length === 0 && !assignment.recommendedWorkflow && !project.workflowSnapshot) {
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
  const assignedWorkflow = processTemplates.find(template =>
    template.id === assignment.recommendedWorkflow || template.name === assignment.recommendedWorkflow
  );
  const assignedPhases = (assignedWorkflow?.phases || project.workflowSnapshot?.phases || [])
    .slice()
    .sort((left, right) => left.order - right.order);
  const assignedDescription = assignedWorkflow?.description || project.workflowSnapshot?.description || '';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
      {assignment.recommendedWorkflow ? (
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="rounded-3xl border border-blue-100 bg-blue-50/70 p-6 text-left">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">Your project process</p>
            <h3 className="mt-2 text-2xl font-black text-slate-950">{recommendedName}</h3>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{assignedDescription || 'Your instructor set this path for the mission. Follow the steps in the roadmap, then add proof as you work.'}</p>
          </div>

          {assignedPhases.length > 0 && (
            <div className="space-y-3">
              {assignedPhases.map((phase, index) => (
                <div key={phase.id || `${phase.name}-${index}`} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-sm font-black text-slate-600">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-black text-slate-900">{phase.name}</h4>
                      {phase.required !== false && <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700">Required</span>}
                    </div>
                    {(phase.objective || phase.description) && <p className="mt-1 text-sm font-semibold leading-5 text-slate-600">{phase.objective || phase.description}</p>}
                    <p className="mt-2 text-xs font-bold text-slate-400">{phase.checklist?.length || 0} checklist items{phase.estimatedMinutes ? ` · ${phase.estimatedMinutes} min` : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => {
              const targetId = assignedWorkflow?.id || project.workflowId || relevantWorkflows[0]?.id || assignment.recommendedWorkflow;
              if (project.workflowSnapshot) {
                closeModal();
                return;
              }
              handleLockIn(targetId);
            }}
            className="w-full rounded-2xl bg-blue-700 px-5 py-4 text-base font-black text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800"
          >
            {project.workflowSnapshot || project.workflowId === (assignedWorkflow?.id || assignment.recommendedWorkflow) ? 'Continue to roadmap' : `Start ${recommendedName}`}
          </button>
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
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const addStep = () => {
    if (!newStep.trim()) return;
    playSound('click');
    const step = createStudentTask(newStep);
    updateProject({ steps: [...(project.steps || []), step] });
    setNewStep('');
  };

  const removeStep = (id: string) => {
    if (!confirm('Are you sure you want to delete this step?')) return;
    playSound('click');
    updateProject({ steps: project.steps.filter(s => s.id !== id) });
  };

  const startEditing = (step: ProjectStep) => {
    setEditingStepId(step.id);
    setEditValue(step.title);
  };

  const saveEdit = () => {
    if (!editingStepId || !editValue.trim()) return;
    const updatedSteps = project.steps.map(s =>
      s.id === editingStepId ? { ...s, title: editValue } : s
    );
    updateProject({ steps: updatedSteps });
    setEditingStepId(null);
    setEditValue('');
    playSound('success');
  };

  const cancelEdit = () => {
    setEditingStepId(null);
    setEditValue('');
  };

  const handleReorder = (newOrder: ProjectStep[]) => {
    // Only update if order actually changed to avoid infinite loops if strict mode
    updateProject({ steps: newOrder });
  };

  const isBuilding = project.status === 'building' || project.status === 'submitted' || project.status === 'published';

  return (
    <div className="space-y-8">
      {/* ALWAYS ACTIVE INPUT */}
      <div className="flex gap-2">
        <input
          value={newStep}
          onChange={e => setNewStep(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addStep()}
          className="flex-1 text-base md:text-lg font-bold p-3 md:p-4 rounded-2xl border-2 border-slate-200 focus:border-blue-400 outline-none"
          placeholder={isBuilding ? "Add another step..." : "Add a mission step..."}
        />
        <button onClick={addStep} className="bg-blue-500 text-white p-3 md:p-4 rounded-2xl font-black text-lg md:text-xl border-b-4 border-blue-700 active:border-b-0 active:translate-y-1 hover:bg-blue-400 transition-colors">➕</button>
      </div>

      <div className="space-y-3">
        {project.steps.length === 0 && <div className="text-center text-slate-400 font-bold italic py-8">No steps yet.</div>}

        <Reorder.Group axis="y" values={project.steps || []} onReorder={handleReorder} className="space-y-3">
          {project.steps.map((step, idx) => (
            <Reorder.Item key={step.id} value={step} className="focus:outline-none">
              <div className={`bg-slate-50 p-4 rounded-2xl border-b-4 border-slate-200 flex items-center justify-between group ${editingStepId === step.id ? 'ring-2 ring-blue-400 border-blue-200 bg-white' : ''}`}>

                <div className="flex items-center gap-3 md:gap-4 flex-1">
                  {/* Drag Handle */}
                  <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 p-1">
                    <GripVertical size={20} />
                  </div>

                  <span className="bg-slate-200 text-slate-500 font-black w-6 h-6 md:w-8 md:h-8 text-sm md:text-base flex items-center justify-center rounded-full shrink-0">
                    {idx + 1}
                  </span>

                  <div className="flex-1">
                    {editingStepId === step.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 font-bold text-slate-700 text-base md:text-lg bg-slate-100 px-2 py-1 rounded outline-none focus:bg-white border focus:border-blue-300"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEdit();
                          }}
                        />
                      </div>
                    ) : (
                      <div>
                        <span className="font-bold text-slate-700 text-base md:text-lg block cursor-pointer hover:text-blue-600 transition-colors" onClick={() => startEditing(step)}>
                          {step.title}
                        </span>
                        {step.resources && step.resources.length > 0 && (
                          <span className="text-[10px] md:text-xs font-bold text-indigo-500 flex items-center gap-1">
                            <span className="text-sm md:text-lg">🧰</span> {step.resources.length} Tools Available
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  {editingStepId === step.id ? (
                    <>
                      <button onClick={saveEdit} className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"><Check size={16} /></button>
                      <button onClick={cancelEdit} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"><XIcon size={16} /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEditing(step)} className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => removeStep(step.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>

              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </div>

      {!isBuilding ? (
        <button
          onClick={() => { playSound('success'); updateProject({ status: 'building' }); closeModal(); }}
          disabled={project.steps.length === 0}
          className="w-full py-4 rounded-3xl bg-green-500 text-white font-black text-xl uppercase tracking-wider border-b-8 border-green-700 active:border-b-0 active:translate-y-2 disabled:opacity-50 hover:bg-green-400 transition-colors"
        >
          Launch Mission (Start Building) 🚀
        </button>
      ) : (
        <button
          onClick={() => { playSound('success'); closeModal(); }}
          className="w-full py-4 rounded-3xl bg-blue-500 text-white font-black text-xl uppercase tracking-wider border-b-8 border-blue-700 active:border-b-0 active:translate-y-2 hover:bg-blue-400 transition-colors"
        >
          Save & Return to Builder 💾
        </button>
      )}
    </div>
  );
};

const TaskStepContent: React.FC<StepContentProps & { taskId: string }> = ({ project, updateProject, closeModal, taskId }) => {
  const { startSession } = useSession();
  const { user, userProfile } = useAuth();
  const realId = taskId.replace('step-', '');
  const step = project.steps.find(s => s.id === realId);

  // WIZARD STEPS: 1=Instructions, 2=Evidence, 3=Notes, 4=Review
  const [wizardStep, setWizardStep] = useState(1);
  const TOTAL_WIZARD_STEPS = 4;

  const [note, setNote] = useState('');
  const [link, setLink] = useState(''); // NEW: Evidence Link
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false); // Upload progress state
  const [uploadProgress, setUploadProgress] = useState(0); // Progress percentage
  const [isEditing, setIsEditing] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [showCommitInput, setShowCommitInput] = useState(false);
  const [isProMode, setIsProMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const taskSheetRef = useRef<HTMLDivElement>(null);

  // Toast notifications
  const { showToast } = useToast();

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
  const reviewStatus = effectiveStepReviewStatus(project, step);
  const canonicalReviewFeedback = stepReviewFeedback(project, step);

  const checklistTotal = step.checklist?.length || 0;
  const checklistDone = step.checklist?.filter((_, index) => Boolean(step.checklistCompleted?.[index])).length || 0;
  const toggleChecklistItem = (index: number) => {
    const nextChecklist = (step.checklist || []).map((_, itemIndex) => Boolean(step.checklistCompleted?.[itemIndex]));
    nextChecklist[index] = !nextChecklist[index];
    playSound('click');
    void updateProject({
      steps: project.steps.map(projectStep => projectStep.id === realId
        ? { ...projectStep, checklistCompleted: nextChecklist }
        : projectStep),
    });
  };

  // INITIALIZE PREVIEW FROM EXISTING EVIDENCE (only on mount or when step changes)
  React.useEffect(() => {
    if (step.evidence && !preview && !link) {
      // Check if it's a URL or Base64
      if (step.evidence.startsWith('http')) {
        setLink(step.evidence);
      } else if (step.evidence.startsWith('data:image')) {
        setPreview(step.evidence);
      }
    }
  }, [step.id, step.evidence]); // Only run when step changes

  // WIZARD NAVIGATION
  const canGoNext = () => {
    switch (wizardStep) {
      case 1: return true; // Instructions - always can proceed
      case 2: return !!(file || preview || link); // Evidence - must have file or link
      case 3: return true; // Notes - optional, always can proceed
      default: return false;
    }
  };

  const handleWizardNext = () => {
    if (canGoNext()) {
      setWizardStep(prev => Math.min(TOTAL_WIZARD_STEPS, prev + 1));
      playSound('click');
    }
  };

  const handleWizardBack = () => {
    setWizardStep(prev => Math.max(1, prev - 1));
    playSound('click');
  };

  useEffect(() => {
    const scroller = taskSheetRef.current?.closest('.sq-work-modal__content') as HTMLElement | null;
    scroller?.scrollTo({ top: 0, behavior: 'auto' });
  }, [wizardStep]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];

      // Storage rules accept project media up to 20 MB.
      if (selectedFile.size > 20 * 1024 * 1024) {
        showToast('File too large. Maximum size is 20 MB.', 'error');
        e.target.value = ''; // Reset input
        return;
      }

      const allowed = /^(image|video|audio)\//.test(selectedFile.type) || ['application/pdf', 'text/plain'].includes(selectedFile.type);
      if (!allowed) {
        showToast('Upload an image, video, audio clip, PDF, or text file.', 'error');
        e.target.value = '';
        return;
      }

      playSound('click');
      setFile(selectedFile);

      // Only images need an in-memory visual preview. Large documents and
      // media remain as File objects until the Storage upload begins.
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result as string);
        reader.readAsDataURL(selectedFile);
      } else {
        setPreview(null);
      }
    }
  };

  const handleSubmit = async () => {
    try {
      playSound('click');
      setSubmitting(true);

      // Prepare Evidence Data
      let evidenceUrl = link;

      // Store binary evidence in Firebase Storage. Keeping Base64 out of the
      // Firestore project document prevents slow writes and the 1 MiB document
      // ceiling from breaking a learner's submission.
      if (file) {
        try {
          setUploading(true);
          setUploadProgress(0);
          console.log("🚀 [Evidence] Uploading file...");
          console.log("📄 [Evidence] File:", file.name, "Size:", file.size);
          const organizationId = userProfile?.organizationId;
          if (!organizationId || !user?.uid) throw new Error('Your student account is not fully linked.');
          const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          evidenceUrl = await api.uploadFile(
            file,
            `student-projects/${organizationId}/${user.uid}/${project.id}/evidence-${realId}-${Date.now()}-${safeFileName}`,
            setUploadProgress
          );
          console.log("✅ [Evidence] Upload complete!");
          setUploading(false);

        } catch (e) {
          console.error("❌ [Evidence] Upload failed:", e);
          setUploading(false);
          setUploadProgress(0);
          showToast(`Upload failed: ${(e as any).message || "Unknown error"}`, 'error');
          setSubmitting(false);
          return;
        }
      } else if (preview && !link) {
        // Fallback or legacy base64
        evidenceUrl = preview;
      }

      const updatedSteps = project.steps.map(s => {
        if (s.id === realId) {
          return submittedProof(s, evidenceUrl, note, new Date().toISOString(), file?.type);
        }
        return s;
      });

      // Optimistic Update
      // AUTO-PROMOTE EVIDENCE TO COVER IMAGE (Fix for Showcase/Teacher View)
      // If no cover exists (or it's a placeholder), use this evidence.
      let autoPromoteUpdates = {};
      if (evidenceUrl && (!file || file.type.startsWith('image/')) && (!project.thumbnailUrl || project.thumbnailUrl.startsWith('data:image/svg') || project.workflowId === 'showcase')) {
        console.log("📸 [StudentWizard] Auto-promoting evidence to Project Cover");
        autoPromoteUpdates = {
          thumbnailUrl: evidenceUrl, // Used for List View
          coverImage: evidenceUrl    // Used for Hero View
        };
      }

      const updatedProject = {
        ...project,
        steps: updatedSteps,
        ...autoPromoteUpdates
      };

      const saveResult = await updateProject(updatedProject);
      if (!saveResult.success) throw new Error(saveResult.error || 'Evidence could not be saved.');

      playSound('success');
      showToast('Proof sent for mentor review.', 'success');

      // Close modal or refresh view handled by parent re-render on project update
      closeModal();

    } catch (error) {
      console.error("Submission failed:", error);
      showToast('Your proof could not be sent. Check the file or link and try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveProgress = async () => {
    if (!commitMessage.trim()) {
      showToast('Add a short note before saving this checkpoint.', 'error');
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

    const saveResult = await updateProject(updatedProject);
    if (!saveResult.success) {
      showToast(`Progress could not be saved: ${saveResult.error || 'Unknown error'}`, 'error');
      return;
    }

    setCommitMessage('');
    setShowCommitInput(false);
    playSound('success');
    showToast('Checkpoint saved.', 'success');
  };

  const evidenceLooksLikeImage = (url?: string) => Boolean(url && (
    url.startsWith('data:image/') || /\.(png|jpe?g|gif|webp|avif|svg)(?:\?|$)/i.test(url)
  ));

  if (reviewStatus === 'done') {
    return (
      <div className="sq-task-result is-approved text-center py-4 md:py-8">
        <div className="sq-task-progress" aria-label="Task progress">
          <span className="is-done"><Check size={13} /> Understand</span>
          <span className="is-done"><Check size={13} /> Proof added</span>
          <span className="is-current"><Check size={13} /> Approved</span>
        </div>
        <span className="sq-task-result__icon"><Trophy size={30} /></span>
        <p className="sq-task-result__eyebrow">Checkpoint passed</p>
        <h3 className="text-xl md:text-2xl font-black text-slate-800">This step is approved.</h3>
        <p className="sq-task-result__copy">Your proof is safely logged. You can move to the next part of the build.</p>
        {step.evidence && (evidenceLooksLikeImage(step.evidence)
          ? <img src={step.evidence} className="sq-task-result__evidence" alt="Approved proof" />
          : <a href={step.evidence} target="_blank" rel="noreferrer" className="sq-task-result__link"><FileText size={18} /> Open approved proof</a>)}
      </div>
    );
  }

  // REJECTED STATE
  if (reviewStatus === 'rejected' && !isEditing) {
    return (
      <div className="sq-task-result is-revision text-center py-8 space-y-6">
        <div className="sq-task-progress" aria-label="Task progress">
          <span className="is-done"><Check size={13} /> Understand</span>
          <span className="is-done"><Check size={13} /> Proof added</span>
          <span className="is-current">Update</span>
        </div>
        <span className="sq-task-result__icon"><AlertTriangle size={30} /></span>
        <div>
          <p className="sq-task-result__eyebrow">Mentor note</p>
          <h3 className="text-2xl font-black">One small update, then try again.</h3>
          <p className="sq-task-result__copy">Your work is saved. Read the note below and improve only what is needed.</p>
        </div>
        <div className="sq-task-feedback text-left">
          <span>What to change</span>
          <p>{canonicalReviewFeedback || 'Please review the instructions and update your proof.'}</p>
        </div>
        {step.evidence && <a href={step.evidence} target="_blank" rel="noreferrer" className="sq-task-result__link"><FileText size={18} /> View my previous proof</a>}
        <button
          onClick={() => {
            setIsEditing(true);
            setWizardStep(2);
            playSound('click');
          }}
          className="sq-task-retry w-full py-4 rounded-3xl bg-slate-800 text-white font-black text-lg hover:bg-slate-700 transition-colors"
        >
          <RotateCcw size={18} /> Update this step
        </button>
      </div>
    );
  }

  console.log('TaskStepContent step:', step);

  return (
    <div ref={taskSheetRef} className="sq-task-sheet space-y-6">
      <div className="sq-task-nameplate bg-blue-50 p-6 rounded-3xl border-4 border-blue-100 text-blue-900 font-bold text-center text-lg relative overflow-hidden">
        <div className="relative z-10">{step.title}</div>
        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-200 rounded-bl-full opacity-50"></div>
      </div>

      {reviewStatus === 'pending_review' && (
        <div className="sq-task-review-state bg-amber-50 p-6 rounded-3xl border-4 border-amber-100 flex flex-col items-center text-center space-y-4 animate-in fade-in slide-in-from-top-4">
          <div className="sq-task-progress w-full" aria-label="Task progress">
            <span className="is-done"><Check size={13} /> Understand</span>
            <span className="is-done"><Check size={13} /> Proof added</span>
            <span className="is-current">In review</span>
          </div>
          <span className="sq-task-review-state__icon"><Clock3 size={26} /></span>
          <div>
            <p className="sq-task-review-state__eyebrow">Proof received</p>
            <h3>Waiting for mentor review</h3>
            <p>Your proof is safe. You can keep building another unlocked step while your mentor checks this one.</p>
          </div>

          {/* SUBMITTED EVIDENCE PREVIEW */}
          {step.evidence && (
            <div className="sq-task-review-proof w-full space-y-3">
              <p>Proof you sent</p>
              <div className="relative">
                {evidenceLooksLikeImage(step.evidence) ? <img
                  src={step.evidence}
                  alt="Proof sent for review"
                  className="w-full max-h-48 object-cover rounded-xl"
                /> : <a href={step.evidence} target="_blank" rel="noreferrer" className="sq-task-review-proof__link"><FileText size={20} /> Open submitted proof</a>}
                <button
                  onClick={() => {
                    setIsEditing(true);
                    playSound('click');
                    // Delay click to ensure file input is rendered
                    setTimeout(() => fileInputRef.current?.click(), 100);
                  }}
                  className="sq-task-review-proof__replace absolute top-2 right-2"
                >
                  <Pencil className="w-4 h-4" />
                  <span>Replace</span>
                </button>
              </div>
            </div>
          )}

          <div className="sq-task-review-note w-full text-left">
            <p>Your build note</p>
            <blockquote>{step.note || 'No build note was added.'}</blockquote>
          </div>
        </div>
      )}


      {/* WIZARD STEP 1: INSTRUCTIONS & RESOURCES */}
      {(wizardStep === 1 && reviewStatus !== 'pending_review') && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="sq-task-progress" aria-label="Task progress">
            <span className="is-current">1 Understand</span>
            <span>2 Add proof</span>
            <span>3 Mentor review</span>
          </div>
          <div className="sq-task-instructions rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm md:p-7">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">What to do</p>
            <h4 className="mt-2 text-xl font-black text-slate-950">{step.objective || step.description || step.title}</h4>
            {step.instructions && <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{step.instructions}</p>}

            {step.checklist && step.checklist.length > 0 && (
              <div className="sq-task-checklist mt-5 rounded-2xl bg-blue-50 p-4">
                <div className="flex items-center justify-between gap-3"><p className="text-[10px] font-black uppercase tracking-wider text-blue-700">Checklist</p><span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-blue-700">{checklistDone}/{checklistTotal} checked</span></div>
                <ul className="mt-3 space-y-2">{step.checklist.map((item, index) => {
                  const isChecked = Boolean(step.checklistCompleted?.[index]);
                  return <li key={`${item}-${index}`}><button type="button" onClick={() => toggleChecklistItem(index)} className={`flex w-full items-start gap-2 rounded-xl px-2 py-2 text-left text-sm font-bold transition ${isChecked ? 'bg-white/80 text-slate-500 line-through' : 'text-slate-700 hover:bg-white/70'}`}><span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 text-[10px] ${isChecked ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-blue-300 bg-white text-blue-700'}`}>{isChecked ? <Check size={13} strokeWidth={3} /> : index + 1}</span><span>{item}</span></button></li>;
                })}</ul>
              </div>
            )}

            {(step.tools?.length || step.materials?.length) ? <div className="sq-task-kit mt-5 grid gap-3 sm:grid-cols-2">
              {step.tools && step.tools.length > 0 && <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-violet-700">Tools</p><p className="mt-2 text-sm font-bold leading-6 text-slate-700">{step.tools.join(' · ')}</p></div>}
              {step.materials && step.materials.length > 0 && <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-amber-800">Materials</p><p className="mt-2 text-sm font-bold leading-6 text-slate-700">{step.materials.join(' · ')}</p></div>}
            </div> : null}

            {step.safetyNotes && step.safetyNotes.length > 0 && <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-rose-700">Work safely</p><p className="mt-2 text-sm font-bold leading-6 text-slate-700">{step.safetyNotes.join(' · ')}</p></div>}
            {step.evidenceRequirements && step.evidenceRequirements.length > 0 && <div className="sq-task-proof-callout mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Proof to add</p><p className="mt-2 text-sm font-bold leading-6 text-slate-700">{step.evidenceRequirements.map(requirement => requirement.prompt).join(' · ')}</p></div>}

            {/* Resources */}
            <div className="mt-5 flex flex-wrap gap-2 md:gap-3">
              {(!step.resources || step.resources.length === 0) && (
                <div className="text-xs italic text-slate-400 md:text-sm">No extra links or files attached to this step.</div>
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
                  className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  <span>{res.title}</span>
                  <span className="text-[10px] md:text-xs opacity-50 bg-slate-100 px-2 py-1 rounded-md">↗</span>
                </button>
              ))}
            </div>

            <div className="h-px bg-slate-200 w-full my-4 md:my-6"></div>

            <button
              onClick={() => { playSound('click'); handleWizardNext(); }}
              className="sq-task-next flex min-h-13 w-full items-center justify-center gap-3 rounded-xl bg-blue-700 px-4 py-4 text-base font-black text-white transition hover:bg-blue-800"
            >
              <span>Add my proof</span>
            </button>
          </div>
        </div>
      )}

      {/* WIZARD STEP 2: EVIDENCE UPLOAD - Show when on step 2 OR editing submitted evidence */}
      {((wizardStep === 2 && reviewStatus !== 'pending_review') || (reviewStatus === 'pending_review' && isEditing)) && (
        <div className="sq-proof-sheet space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="sq-task-progress" aria-label="Task progress">
            <span className="is-done"><Check size={13} /> Understand</span>
            <span className="is-current">2 Add proof</span>
            <span>3 Mentor review</span>
          </div>
          <button
            onClick={() => handleWizardBack()}
            className="sq-task-back text-slate-500 font-bold flex items-center gap-2 mb-2"
          >
            <ArrowLeft size={16} /><span>Back to instructions</span>
          </button>

          <div>
            <div className="sq-proof-heading"><p>Add proof</p><h4>Show what you made or tested.</h4><span>A clear photo, file, recording, or project link is enough.</span></div>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="sq-proof-drop border-4 border-dashed border-slate-300 rounded-3xl p-4 md:p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50 min-h-[160px] md:min-h-[200px] group relative overflow-hidden"
            >
              {preview && (!file || file.type.startsWith('image/')) ? (
                <div className="relative z-10">
                  <img src={preview} alt="Preview" className="h-32 md:h-48 object-cover rounded-2xl shadow-md transform rotate-2 group-hover:rotate-0 transition-transform" />
                </div>
              ) : file ? (
                <div className="relative z-10 rounded-2xl border border-blue-200 bg-white px-5 py-4 text-center shadow-sm"><FileText className="mx-auto text-blue-600" size={30} /><p className="mt-2 max-w-xs truncate text-sm font-black text-slate-800">{file.name}</p><p className="mt-1 text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p></div>
              ) : (
                <div className="relative z-10 flex flex-col items-center">
                  <span className="sq-proof-drop__icon"><Upload size={27} /></span>
                  <strong>Choose a proof file</strong>
                  <span className="text-sm font-bold text-slate-500 text-center">Photo, video, audio, PDF, or text · up to 20 MB</span>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFile} className="hidden" accept="image/*,video/*,audio/*,application/pdf,text/plain" />
            </div>

            {/* UPLOAD PROGRESS BAR */}
            {uploading && (
              <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-blue-600">Uploading evidence...</span>
                  <span className="text-blue-600">{uploadProgress}%</span>
                </div>
                <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* NEW: Evidence Link Input */}
            <div className="sq-proof-link mt-4">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2"><LinkIcon size={14} /> Or paste a project link</label>
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://docs.google.com/..."
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
                        const file = new (window as any).File([blob], "evidence_screenshot.png", { type: "image/png" });
                        setFile(file);
                        playSound('click');
                      });
                  } else {
                    showToast('No workshop screenshot is available yet.', 'error');
                  }
                }}
                className="sq-proof-helper text-sm font-bold flex items-center justify-center gap-2 py-2"
              >
                <Camera size={16} /> Use my latest workshop screenshot
              </button>

              <button
                onClick={() => setShowCommitInput(!showCommitInput)}
                className="sq-proof-helper w-full py-3 rounded-xl font-bold border-2 transition-colors"
              >
                <Save size={16} /> Save a checkpoint for later
              </button>

              {showCommitInput && (
                <div className="p-4 bg-cyan-50 rounded-2xl border-2 border-cyan-100 animate-in fade-in slide-in-from-top-2">
                  <label className="block text-xs font-black text-cyan-700 uppercase tracking-wider mb-2">Checkpoint note</label>
                  <input
                    type="text"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Example: Circuit plan is ready for wiring"
                    className="w-full p-3 bg-white border-2 border-cyan-200 rounded-xl font-medium text-slate-600 outline-none focus:border-cyan-500 mb-2"
                  />
                  <button
                    onClick={handleSaveProgress}
                    className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold transition-colors"
                  >
                    Save checkpoint
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Pro Mode Toggle */}
          <div className="flex justify-end mb-2 mt-4">
            <button
              onClick={() => setIsProMode(!isProMode)}
              className={`sq-writing-challenge text-xs font-black px-3 py-2 rounded-xl border-2 transition-all ${isProMode ? 'is-active' : ''}`}
            >
              {isProMode ? 'Writing challenge active' : 'Try the writing challenge'}
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
              className="sq-proof-note w-full rounded-2xl border-2 border-slate-200 p-4 font-bold text-slate-700 min-h-[110px] outline-none transition-colors resize-none"
              placeholder="What did you try? What changed? What did you notice?"
            />
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || (!note && !file && !link)}
            className="sq-proof-submit w-full py-4 rounded-xl text-white font-black text-lg disabled:opacity-50 transition-all"
          >
            <Send size={18} /> {submitting ? 'Sending proof…' : 'Send proof for review'}
          </button>
        </div>
      )}

      {/* PENDING REVIEW VIEW (Read Only) */}
      {(reviewStatus === 'pending_review' && !isEditing) && (
        <button onClick={closeModal} className="sq-task-review-close w-full py-4 font-bold transition-colors">
          Back to my roadmap
        </button>
      )}

    </div >
  );
};

const ProjectReviewNotice: React.FC<{ project: StudentProject; compact?: boolean }> = ({ project, compact = false }) => {
  if (!project.feedback && !['changes_requested', 'published'].includes(project.status)) return null;
  const approved = project.status === 'published';
  const needsChanges = project.status === 'changes_requested';
  return (
    <section className={`sq-project-review-notice ${approved ? 'is-approved' : needsChanges ? 'is-revision' : 'is-note'} ${compact ? 'is-compact' : ''}`} aria-label="Instructor review">
      <span className="sq-project-review-notice__icon"><MessageSquareText size={22} /></span>
      <div>
        <p>{approved ? 'Approved by your instructor' : needsChanges ? 'Your instructor left a revision note' : 'Instructor note'}</p>
        <h3>{approved ? 'Showcase ready to share' : needsChanges ? 'One more iteration' : 'Feedback received'}</h3>
        {project.feedback && <blockquote>{project.feedback}</blockquote>}
        <small>{project.reviewedByName ? `From ${project.reviewedByName}` : 'From your instructor'}{approved && project.xpReward ? ` · +${project.xpReward} XP` : ''}</small>
      </div>
    </section>
  );
};

const PublishStepContent: React.FC<StepContentProps> = ({ project, updateProject, closeModal }) => {
  const isSubmitted = project.status === 'submitted' || project.status === 'published';
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitMission = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await updateProject({ status: 'submitted' });
      if (!result.success) throw new Error(result.error || 'Your mission could not be sent. Try again.');
      playSound('success');
      closeModal();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your mission could not be sent. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`sq-mission-submit text-center space-y-6 ${isSubmitted ? 'is-submitted' : ''}`}>
      <span className="sq-mission-submit__icon">{isSubmitted ? <Check size={34} /> : <Trophy size={34} />}</span>
      <div>
        <p>{isSubmitted ? 'Mission received' : 'Mission complete'}</p>
        <h3>{isSubmitted ? 'Your project is with your instructor.' : 'Ready for mentor review'}</h3>
        <span>{isSubmitted ? 'Your roadmap and every approved proof are safely logged. You can still look back through your work.' : 'Your build steps and proof are together. Send the mission when you are ready.'}</span>
      </div>
      <div className="sq-mission-submit__summary" aria-label="Submission checklist">
        <span><Check size={16} /> All build steps complete</span>
        <span><Check size={16} /> Proof attached to the roadmap</span>
        <span><Check size={16} /> Reflection notes saved</span>
      </div>
      <div className="sq-mission-submit__action max-w-md mx-auto p-6 rounded-3xl">
        {isSubmitted ? (
          <button onClick={closeModal} className="w-full py-4 rounded-xl font-black transition-colors"><ArrowLeft size={18} /> Back to my roadmap</button>
        ) : (
          <button
            onClick={submitMission}
            disabled={submitting}
            className="w-full py-4 rounded-xl font-black transition-colors"
          >
            <Send size={18} /> {submitting ? 'Sending mission…' : 'Send mission to my instructor'}
          </button>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
    </div>
  );
};

const ShowcaseUploadContent: React.FC<StepContentProps> = ({ project, updateProject, closeModal, previewMode = false }) => {
  const { user, userProfile } = useAuth();
  const [link, setLink] = useState(project.presentationUrl || '');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitPhase, setSubmitPhase] = useState<'idle' | 'uploading' | 'saving'>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(project.mediaUrls?.[0] || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const linkInputId = React.useId();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 20 * 1024 * 1024) {
        setSubmitError('This file is larger than 20 MB. Choose a smaller file and try again.');
        e.target.value = '';
        return;
      }
      const allowed = /^(image|video|audio)\//.test(selectedFile.type) || ['application/pdf', 'text/plain'].includes(selectedFile.type);
      if (!allowed) {
        setSubmitError('Choose an image, video, audio clip, PDF, or text file.');
        e.target.value = '';
        return;
      }
      setSubmitError(null);
      playSound('click');
      setFile(selectedFile);
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result as string);
        reader.readAsDataURL(selectedFile);
      } else {
        setPreview(null);
      }
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    const trimmedLink = link.trim();
    if (trimmedLink && !/^https?:\/\//i.test(trimmedLink)) {
      setSubmitError('Add the full link beginning with https://');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    let activePhase: 'uploading' | 'saving' = 'saving';

    try {
      let finalUrl = preview; // Default to existing preview if no new file

      if (file) {
        activePhase = 'uploading';
        setSubmitPhase('uploading');
        const organizationId = userProfile?.organizationId;
        if (!previewMode && (!organizationId || !user?.uid)) throw new Error('Your student account is not fully linked.');
        const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        finalUrl = previewMode ? null : await api.uploadFile(
          file,
          `student-projects/${organizationId}/${user.uid}/${project.id}/showcase-${Date.now()}-${safeFileName}`
        );
      }

      // update project status and media/link
      activePhase = 'saving';
      setSubmitPhase('saving');
      const result = await updateProject({
        status: 'submitted',
        presentationUrl: trimmedLink,
        thumbnailUrl: file?.type.startsWith('image/') ? finalUrl || project.thumbnailUrl : project.thumbnailUrl,
        coverImage: file?.type.startsWith('image/') ? finalUrl || project.coverImage : project.coverImage,
        mediaUrls: finalUrl ? [finalUrl] : project.mediaUrls
      });

      if (!result?.success) {
        throw new Error(result?.error || "Save failed");
      }

      console.log('✅ [Showcase] Upload complete & Project synced.');
      playSound('success');
      closeModal();
    } catch (e: any) {
      console.error("Showcase upload failed", e);
      const permissionFailure = ['permission-denied', 'storage/unauthorized'].some(code =>
        String(e?.code || e?.message || e).includes(code)
      );
      setSubmitError(permissionFailure
        ? 'Your account could not save this showcase. Sign out and launch SparkQuest again from Edufy, then retry.'
        : `We could not ${activePhase === 'saving' ? 'save' : 'upload'} your showcase. ${e?.message || 'Check your connection and try again.'}`
      );
    } finally {
      setSubmitting(false);
      setSubmitPhase('idle');
    }
  };

  if (project.status === 'submitted' || project.status === 'published') {
    const approved = project.status === 'published';
    return (
      <div className="sq-showcase-review-state">
        <span className={`sq-showcase-review-state__mark ${approved ? 'is-approved' : ''}`}>{approved ? <Trophy size={34} /> : <Clock3 size={34} />}</span>
        <div>
          <p>{approved ? 'Instructor review complete' : 'Showcase received'}</p>
          <h3>{approved ? 'Your project is approved.' : 'Your showcase is waiting for review.'}</h3>
          <span>{approved ? 'Your feedback and reward are saved in your project record.' : 'Your instructor can now open your media, leave a comment, approve it, or ask for another iteration.'}</span>
        </div>
        <ProjectReviewNotice project={project} compact />
        {(project.mediaUrls?.[0] || project.presentationUrl) && <div className="sq-showcase-review-state__proof">
          {project.mediaUrls?.[0] && <a href={project.mediaUrls[0]} target="_blank" rel="noreferrer"><Image size={18} /> Open submitted media</a>}
          {project.presentationUrl && <a href={project.presentationUrl} target="_blank" rel="noreferrer"><ArrowUpRight size={18} /> Open project link</a>}
        </div>}
        <button type="button" className="sq-action sq-action--primary" onClick={closeModal}>Back to my projects</button>
      </div>
    );
  }

  return (
    <div className="sq-showcase-sheet space-y-8 animate-in fade-in slide-in-from-right-8">
      {project.status === 'changes_requested' && <ProjectReviewNotice project={project} compact />}
      <div className="sq-showcase-heading text-center space-y-3">
        <span><Camera size={26} /></span>
        <h3 className="text-3xl font-black text-slate-800">Build showcase</h3>
        <p className="text-slate-500 font-bold">Choose one strong image or file, then add a project link if you have one.</p>
      </div>

      <div className="flex flex-col gap-4 md:gap-6 max-w-xl mx-auto">
        {/* File Upload */}
        <button
          type="button"
          disabled={submitting}
          aria-label={file || preview ? 'Replace showcase media' : 'Choose showcase media'}
          onClick={() => fileInputRef.current?.click()}
          className="sq-proof-drop border-4 border-dashed border-slate-300 rounded-3xl p-4 md:p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50 min-h-[160px] md:min-h-[200px] group relative overflow-hidden"
        >
          {preview ? (
            <img src={preview} alt="Preview" className="h-32 md:h-48 object-cover rounded-2xl shadow-md transform rotate-2 group-hover:rotate-0 transition-transform relative z-10" />
          ) : file ? (
            <div className="relative z-10 rounded-2xl border border-indigo-200 bg-white px-5 py-4 text-center shadow-sm"><FileText className="mx-auto text-indigo-600" size={30} /><p className="mt-2 max-w-xs truncate text-sm font-black text-slate-800">{file.name}</p><p className="mt-1 text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p></div>
          ) : (
            <div className="relative z-10 flex flex-col items-center">
              <span className="sq-proof-drop__icon"><Upload size={27} /></span>
              <strong>Choose showcase media</strong>
              <span className="text-sm font-bold text-slate-500">Photo, video, audio, PDF, or text · up to 20 MB</span>
            </div>
          )}
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFile} disabled={submitting} className="hidden" accept="image/*,video/*,audio/*,application/pdf,text/plain" />

        {/* Link Input */}
        <div>
          <label htmlFor={linkInputId} className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-wider mb-2"><LinkIcon size={14} /> Project link <span className="sq-optional">optional</span></label>
          <input
            id={linkInputId}
            disabled={submitting}
            inputMode="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://youtube.com/..."
            className="w-full p-3 md:p-4 rounded-2xl border-2 border-slate-200 font-bold text-slate-600 focus:border-indigo-400 outline-none text-sm md:text-base"
          />
        </div>

        {submitError && (
          <div role="alert" className="rounded-2xl border-2 border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold leading-6 text-rose-700">
            {submitError}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting || (!file && !preview && !link.trim())}
          className="sq-proof-submit w-full py-4 md:py-5 rounded-xl text-white font-black text-lg disabled:opacity-50 transition-all"
        >
          {submitPhase === 'uploading'
            ? 'Uploading your file…'
            : submitPhase === 'saving'
              ? 'Sending for review…'
              : 'Send showcase for review'}
        </button>
        <p className="sq-showcase-review-help text-center text-xs font-bold leading-5 text-slate-400">Add media or a project link to continue. Your instructor reviews your work before it is published.</p>
      </div>
    </div>
  );
};

interface StudentWizardProps {
  assignment: Assignment;
  initialProject: StudentProject;
  isConnected?: boolean;
  onExit?: () => void;
  previewMode?: boolean;
}

export const StudentWizard: React.FC<StudentWizardProps> = ({ assignment, initialProject, isConnected = true, onExit, previewMode = false }) => {
  const { user, userProfile } = useAuth();

  // Theme
  const { activeTheme } = useTheme();
  const activeThemeDef = THEMES.find(t => t.id === activeTheme) || THEMES[0];

  // State
  const [project, setProject] = useState<StudentProject>(initialProject);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showGlobalResources, setShowGlobalResources] = useState(false);
  const [showMissionBrief, setShowMissionBrief] = useState(false);
  const [viewingResource, setViewingResource] = useState<any>(null);

  // Load Factory Data for Auto-Workflow
  const { processTemplates } = useFactoryData();
  const missionContent = resolveMissionContent(
    assignment,
    processTemplates.find(template => template.id === assignment.recommendedWorkflow || template.id === project.workflowId),
  );

  // Focus Session: Auto-start when working on project
  const { startSession, endSession, activeSession, incrementMissions } = useFocusSession();

  useEffect(() => {
    if (previewMode) return;
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

  // Confirm the compare-and-save before reporting success to a step form.
  const updateProject = async (updates: Partial<StudentProject>) => {
    const mergedProject = { ...project, ...updates };
    // Older SparkQuest projects can predate tenant ownership fields. Always
    // repair those fields from the verified Edufy session before writing so
    // Firestore can authorize the one-time legacy migration.
    const updatedProject: StudentProject = {
      ...mergedProject,
      organizationId: mergedProject.organizationId || userProfile?.organizationId,
      studentId: mergedProject.studentId || userProfile?.studentId || user?.uid,
    };

    if (previewMode) {
      setProject(updatedProject);
      return { success: true };
    }

    // Save against the current record, preserving instructor-owned review fields.
    setIsSaving(true);
    setSaveError(null);

    try {
      if (!db) throw new Error('Your connection is unavailable.');
      const saved = await saveLearnerProject(db, project, updatedProject, { uid: user?.uid || '', organizationId: userProfile?.organizationId || '', studentId: userProfile?.studentId, role: userProfile?.role || '' });
      setProject(saved);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Your work could not be saved. Try again.';
      setSaveError(message);
      return { success: false, error: message };
    } finally { setIsSaving(false); }
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
    if (userProfile?.role !== 'student' || project.status === 'published') return;

    const updates: Partial<StudentProject> = {};
    let hasUpdates = false;

    // Heal Name
    if (user?.displayName && (!project.studentName || project.studentName === 'Student')) {
      updates.studentName = user.displayName;
      hasUpdates = true;
    }

    // Heal Organization ID (Critical for permissions)
    // If we are a student, we should own the project in our organization.
    if (userProfile?.organizationId && (!project.organizationId || project.organizationId === 'makerlab-academy')) {
      if (project.organizationId !== userProfile.organizationId) {
        updates.organizationId = userProfile.organizationId;
        hasUpdates = true;
      }
    }

    if (hasUpdates) {
      console.log('✨ [StudentWizard] Healing project metadata:', updates);
      updateProject(updates);
    }
  }, [user, project.studentName, project.organizationId, userProfile]);



  // --- APPLY THE ASSIGNED WORKFLOW THROUGH THE CANONICAL PIPELINE ---
  useEffect(() => {
    if (assignment.recommendedWorkflow && processTemplates.length > 0) {
      const template = processTemplates.find(t => t.id === assignment.recommendedWorkflow);

      if (template && template.phases) {
        const workflowSnapshot = project.workflowSnapshot?.workflowId === template.id
          ? project.workflowSnapshot
          : createWorkflowSnapshot(template);

        if (!project.workflowId) {
          updateProject({
            workflowId: template.id,
            workflowSnapshot,
            steps: buildProjectStepsFromWorkflow(workflowSnapshot, assignment.stepResources || {}),
          });
        } else if (project.workflowId === template.id && !project.workflowSnapshot) {
          updateProject({
            workflowSnapshot,
            steps: refreshProjectStepsFromWorkflow(project.steps, workflowSnapshot, assignment.stepResources || {}),
          });
        }
      }
    }
  }, [assignment.recommendedWorkflow, project.workflowId, project.workflowSnapshot, processTemplates, updateProject, assignment.stepResources]);

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
      title: 'Project brief',
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
        title: 'Project process',
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
        title: project.workflowId === 'custom-workflow' ? 'Plan my tasks' : 'Review my tasks',
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
        title: 'Submit project',
        status: (project.status === 'submitted' || project.status === 'published') ? 'COMPLETED' : canPublish ? 'ACTIVE' : 'LOCKED',
        icon: '🚀',
        onClick: () => handleNodeClick('publish'),
        onHover: () => playSound('hover')
      });
    }

    return nodes;
  };

  const nodes = getRoadmapNodes();
  // Keep the learner moving: an unlocked build action outranks a previously
  // submitted step that is waiting for mentor review. Review becomes the
  // bench focus only when there is no active making work.
  const activeNodeIndex = (() => {
    const activeIndex = nodes.findIndex(node => node.status === 'ACTIVE');
    return activeIndex >= 0 ? activeIndex : nodes.findIndex(node => node.status === 'REVIEW');
  })();

  // Orientation cards help learners understand the mission but should not
  // inflate the build progress. The meter follows actual project tasks so a
  // learner can immediately tell how much making work remains.
  const taskNodes = nodes.filter(node => node.type === 'TASK');
  const progressNodes = taskNodes.length > 0 ? taskNodes : nodes.filter(node => node.type !== 'IDENTITY');
  const completedNodeCount = progressNodes.filter(node => node.status === 'COMPLETED').length;
  const progressPercent = progressNodes.length ? Math.round((completedNodeCount / progressNodes.length) * 100) : 0;
  const progressLabel = taskNodes.length
    ? `${completedNodeCount} of ${taskNodes.length} tasks complete`
    : `${completedNodeCount} of ${progressNodes.length} steps complete`;
  const nextNode = nodes[activeNodeIndex] || nodes[nodes.length - 1];
  const foundationNodes = nodes.filter(node => ['IDENTITY', 'STRATEGY', 'BLUEPRINT'].includes(node.type));
  const journeyNodes = nodes.filter(node => ['TASK', 'PUBLISH'].includes(node.type));
  const isWaitingForReview = nextNode?.status === 'REVIEW';
  const isMissionSubmitted = project.status === 'submitted' || project.status === 'published';
  const benchLabel = isMissionSubmitted ? 'Mission sent' : isWaitingForReview ? 'Mentor checkpoint' : 'At the bench now';
  const benchCopy = isMissionSubmitted
    ? 'Your complete mission is with your instructor. Your build log and proof stay available here.'
    : isWaitingForReview
      ? 'Your proof is safe and waiting for feedback. Open it any time to review what you sent.'
      : nextNode?.id === 'publish'
        ? 'Every build step is approved. Check the mission once more, then send it to your instructor.'
        : 'Open the next action, add your proof, and keep the build moving.';
  const benchAction = isMissionSubmitted ? 'View completed mission' : isWaitingForReview ? 'View submitted proof' : nextNode?.id === 'publish' ? 'Review and submit' : 'Open next action';
  const journeyActiveIndex = journeyNodes.findIndex(node => node.id === nextNode?.id);
  const journeyProgress = journeyNodes.length > 1
    ? Math.max(0, Math.min(100, Math.round(((journeyActiveIndex >= 0 ? journeyActiveIndex : 0) / (journeyNodes.length - 1)) * 100)))
    : 0;
  const heroImage = project.thumbnailUrl || project.coverImage || assignment.thumbnailUrl;

  // --- SPECIAL VIEW: SHOWCASE MODE ---
  if (project.workflowId === 'showcase' || project.templateId === 'showcase-template') {
    // Re-using the content component but wrapping it in a full-screen layout
    return (
      <div className={`sq-showcase-workspace sq-desktop-workspace ${activeThemeDef.font || ''}`}>
        <header className="sq-workspace-toolbar">
          <button type="button" onClick={onExit}><ArrowLeft size={20} /> Back to workbench</button>
          <div><small>Independent project</small><strong>{project.title || 'My showcase'}</strong></div>
          <span className="sq-workspace-status">{project.status === 'published' ? 'Approved' : project.status === 'submitted' ? 'In review' : project.status === 'changes_requested' ? 'Your turn' : 'In progress'}</span>
        </header>
        <main className="sq-showcase-scroll">
          <section className="sq-showcase-editor" aria-label="Showcase editor">
            <ShowcaseUploadContent
              previewMode={previewMode}
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
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className={`sq-studio-shell ${activeThemeDef.font || ''}`}>
      <ConnectionStatus isConnected={isConnected} isSaving={isSaving} error={saveError} />

      <header className="sq-studio-topbar">
        <div className="sq-studio-brand">
          <span className="sq-studio-brand-mark" aria-hidden="true"><Wrench size={19} /></span>
          <div className="sq-studio-brand-copy">
            <strong>{project.title || assignment.title}</strong>
            <span>{assignment.station || 'Maker workshop'} · My project space</span>
          </div>
        </div>
        <div className="sq-studio-topbar-actions">
          <span className="sq-studio-status">{isSaving ? 'Saving' : 'Your work is safe'}</span>
          <button type="button" className="sq-studio-quiet-button" onClick={() => setShowMissionBrief(value => !value)}><FileText size={15} /> Brief</button>
          {onExit && <button type="button" className="sq-studio-quiet-button" onClick={onExit}>Exit <ArrowUpRight size={15} /></button>}
        </div>
      </header>

      <main className="sq-studio-main">
        <ProjectReviewNotice project={project} />
        <section className="sq-studio-hero" aria-labelledby="studio-heading">
          <div className="sq-studio-hero-copy">
            <div>
              <p className="sq-studio-kicker">Your maker challenge · {assignment.difficulty || 'guided mission'}</p>
              <h1 id="studio-heading">{project.title || assignment.title}</h1>
              <p className="sq-studio-hero-intro">{missionContent.goal}</p>
              <div className="sq-studio-hero-meta">
                {assignment.duration && <span className="sq-studio-chip"><Clock3 size={13} /> {assignment.duration}</span>}
                {assignment.technologies?.slice(0, 2).map(item => <span className="sq-studio-chip" key={item.name}><Target size={13} /> {item.name}</span>)}
              </div>
            </div>
            <div className="sq-studio-hero-footer">
              <div className="sq-studio-meter"><div className="sq-studio-meter-line"><span>{progressLabel}</span><span>{progressPercent}%</span></div><div className="sq-studio-meter-track" aria-label={`${progressPercent}% complete`}><span style={{ width: `${progressPercent}%` }} /></div></div>
            </div>
          </div>
          <div className="sq-studio-hero-media">
            {heroImage ? <img src={heroImage} alt="Mission preview" /> : <div className="sq-studio-hero-media-empty"><Map size={38} /></div>}
            <span className="sq-studio-hero-media-label">Mission inspiration</span>
          </div>
        </section>

        <div className="sq-studio-grid">
          <section className="sq-studio-journey" aria-labelledby="roadmap-heading">
            <p className="sq-studio-section-label">Your build journey</p>
            <h2 id="roadmap-heading" className="sq-studio-section-title">Make it, step by step.</h2>
            <p className="sq-studio-section-intro">Follow the path, save proof as you go, and watch your project come alive.</p>
            {foundationNodes.length > 0 && <div className="sq-studio-foundation" aria-label="Mission setup">
              <div className="sq-studio-foundation-copy"><span>Mission set</span><strong>Your brief and build plan are ready.</strong></div>
              <div className="sq-studio-foundation-actions">
                {foundationNodes.map(node => {
                  const FoundationIcon = node.type === 'IDENTITY' ? FileText : node.type === 'STRATEGY' ? Map : ListChecks;
                  return <button key={node.id} type="button" disabled={node.status === 'LOCKED'} onClick={node.onClick} className={node.status === 'COMPLETED' ? 'is-ready' : node.status === 'ACTIVE' ? 'is-current' : ''}><FoundationIcon size={15} /><span>{node.title}</span>{node.status === 'COMPLETED' && <Check size={13} strokeWidth={3} />}</button>;
                })}
              </div>
            </div>}
            <div className="sq-studio-roadmap" style={{ '--journey-progress': `${journeyProgress}%` } as React.CSSProperties}>
              {journeyNodes.map((node) => {
                const task = node.id.startsWith('step-') ? project.steps.find(step => `step-${step.id}` === node.id) : undefined;
                const taskPosition = task ? project.steps.findIndex(step => step.id === task.id) : -1;
                const checklistTotal = task?.checklist?.length || 0;
                const checklistDone = task?.checklist?.filter((_, itemIndex) => Boolean(task.checklistCompleted?.[itemIndex])).length || 0;
                const isLocked = node.status === 'LOCKED';
                const isComplete = node.status === 'COMPLETED';
                const isReview = node.status === 'REVIEW';
                const isCurrent = node.status === 'ACTIVE';
                const statusLabel = isComplete ? 'Done' : isReview ? 'Mentor review' : isLocked ? 'Coming next' : 'You’re here';
                const TaskIcon = taskPosition === 0 ? Target : taskPosition === 1 ? Pencil : taskPosition === 2 ? Wrench : Check;
                const StepIcon = task ? TaskIcon : Send;
                const marker = isComplete ? <Check size={15} strokeWidth={3} /> : <StepIcon size={16} strokeWidth={2.4} />;
                const phaseClass = task ? `is-task phase-${(taskPosition % 4) + 1}` : 'is-publish';
                return (
                  <button key={node.id} type="button" disabled={isLocked} onClick={node.onClick} className={`sq-studio-step ${phaseClass} ${isCurrent ? 'is-current' : ''} ${isComplete ? 'is-complete' : ''} ${isReview ? 'is-review' : ''}`}>
                    <span className="sq-studio-step-marker">{marker}</span>
                    <span className="sq-studio-step-main">
                      <span className="sq-studio-step-title">{node.title}{task?.source === 'student' && <span className="sq-studio-tag">My task</span>}{task?.required && <span className="sq-studio-tag">Required</span>}</span>
                      {(task?.objective || task?.description) && <span className="sq-studio-step-summary">{task.objective || task.description}</span>}
                      {task && <span className="sq-studio-step-meta">{checklistTotal ? <span><ListChecks size={12} /> {checklistDone}/{checklistTotal} checks</span> : null}{task.resources?.length ? <span><PackageCheck size={12} /> {task.resources.length} resources</span> : null}{task.estimatedMinutes ? <span><Clock3 size={12} /> {task.estimatedMinutes} min</span> : null}</span>}
                    </span>
                    <span className="sq-studio-step-state">{statusLabel}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="sq-studio-dock">
            <div className="sq-studio-rail">
              <div className="sq-studio-rail-head">
                <p>{benchLabel}</p>
                <h3>{nextNode?.title || 'Review your project'}</h3>
                <p className="sq-studio-bench-copy">{benchCopy}</p>
                {nextNode && <button type="button" className="sq-studio-primary" disabled={nextNode.status === 'LOCKED'} onClick={nextNode.onClick}>{benchAction} <ArrowUpRight size={16} /></button>}
              </div>

              <div className="sq-studio-rail-section">
                <button type="button" onClick={() => setShowMissionBrief(value => !value)}><span className="flex items-center gap-2"><FileText size={16} /> Mission brief</span><ChevronDown size={16} className={showMissionBrief ? 'rotate-180' : ''} /></button>
                {showMissionBrief && <div><p>{missionContent.whyItMatters || 'Build, test, and explain a useful solution.'}</p>{missionContent.deliverables.length > 0 && <ul className="sq-studio-rail-list">{missionContent.deliverables.map(item => <li key={item.id}><Check size={14} /> {item.title}</li>)}</ul>}</div>}
              </div>

              <div className="sq-studio-rail-section">
                <button type="button" onClick={() => setShowGlobalResources(value => !value)}><span className="flex items-center gap-2"><Download size={16} /> Mission kit</span><ChevronDown size={16} className={showGlobalResources ? 'rotate-180' : ''} /></button>
                {showGlobalResources && <div className="sq-studio-rail-list">{assignment.resources?.map(resource => <button key={resource.id || resource.url} type="button" onClick={() => setViewingResource(resource)}><LinkIcon size={14} /><span className="truncate">{resource.title}</span></button>)}</div>}
                {missionContent.materials.length > 0 && <div className="sq-studio-build-note"><strong>Bring to the bench:</strong> {missionContent.materials.slice(0, 4).join(' · ')}</div>}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {viewingResource && <ResourceViewerModal isOpen={!!viewingResource} onClose={() => setViewingResource(null)} resource={viewingResource} />}

      {activeNodeId && (
        <WizardModal
          title={nodes.find(n => n.id === activeNodeId)?.title || ''}
          icon={nodes.find(n => n.id === activeNodeId)?.icon}
          onClose={() => setActiveNodeId(null)}
          color={activeNodeId.includes('step') ? 'indigo' : 'blue'}
        >
          {activeNodeId === 'identity' && <IdentityStepContent project={project} assignment={assignment} updateProject={updateProject} closeModal={() => setActiveNodeId(null)} onShowResources={() => setShowGlobalResources(true)} />}
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
