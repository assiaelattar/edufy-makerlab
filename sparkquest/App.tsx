import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FactoryProvider } from './context/FactoryContext';
import { useMissionData } from './hooks/useMissionData';
import { useFactoryData } from './hooks/useFactoryData';
import { LoginView } from './components/LoginView';
import { ProjectSelector } from './components/ProjectSelector';
import { SessionProvider } from './context/SessionContext';
import { ThemeProvider } from './context/ThemeContext';
import { config } from './utils/config';
import { SessionOverlay } from './components/SessionOverlay';
import { InactivityMonitor } from './components/InactivityMonitor';
import { PickupNotification } from './components/PickupNotification';
import { FocusSessionProvider } from './context/FocusSessionContext';
import { SessionControls } from './components/SessionControls';
import { ToastProvider } from './context/ToastContext';
import { ArrowLeft, RefreshCw, Wrench, X } from 'lucide-react';
import { isLocalHostname } from './utils/appUrls';
import { exchangeSparkQuestLaunch } from './services/appBridge';
import { Assignment, ProcessTemplate, ProjectTemplate, StudentProject } from './types';
import { assignmentFromMission } from './domain/missionContent';
import { currentAcademicYear, projectAcademicYear } from './utils/academicYear';
import { projectLane } from './domain/learnerWorkbench';
import { buildProjectStepsFromWorkflow, createWorkflowSnapshot } from './domain/workflowPipeline';


import { LoadingScreen } from './components/LoadingScreen';

const StudentWizard = lazy(() => import('./components/StudentWizard').then(module => ({ default: module.StudentWizard })));
const InstructorFactory = lazy(() => import('./components/InstructorFactory').then(module => ({ default: module.InstructorFactory })));
const ProjectDetailsEnhanced = lazy(() => import('./components/ProjectDetailsEnhanced').then(module => ({ default: module.ProjectDetailsEnhanced })));
const ParentShowcase = lazy(() => import('./components/ParentShowcase'));
const StudentProjectDetailsDemo = lazy(() => import('./components/StudentProjectDetailsDemo'));
const SparkStore = lazy(() => import('./components/SparkStore').then(module => ({ default: module.SparkStore })));
const StudentPortfolio = lazy(() => import('./components/StudentPortfolio').then(module => ({ default: module.StudentPortfolio })));
const StudentGallery = lazy(() => import('./components/StudentGallery').then(module => ({ default: module.StudentGallery })));
const CredentialWallet = lazy(() => import('./components/CredentialWallet').then(module => ({ default: module.CredentialWallet })));
const ArcadeView = lazy(() => import('./components/arcade/ArcadeView').then(module => ({ default: module.ArcadeView })));
const AvatarSelector = lazy(() => import('./components/AvatarSelector').then(module => ({ default: module.AvatarSelector })));
const LearnerNavigationPreview = lazy(() => import('./components/LearnerNavigationPreview').then(module => ({ default: module.LearnerNavigationPreview })));
const MissionImportPreview = lazy(() => import('./components/factory/MissionImportPreview'));
const LearnerWorkbenchPreview = lazy(() => import('./components/LearnerWorkbenchPreview'));
const ReviewLoopPreview = lazy(() => import('./components/factory/ReviewLoopPreview'));
const InstructorLearnerPreview = lazy(() => import('./components/factory/InstructorLearnerPreview'));
const ReviewModal = lazy(() => import('./components/factory/ReviewModal').then(module => ({ default: module.ReviewModal })));

const missionDesignPreview: ProjectTemplate = {
  id: 'design-preview-mission',
  title: 'Build a smart plant guardian',
  description: 'Create a small device that notices when a plant needs water and gives a clear signal.',
  thumbnailUrl: '/mission-plant-guardian.svg',
  hook: 'Healthy plants depend on observation, measurement, and thoughtful design.',
  station: 'Circuits',
  difficulty: 'intermediate',
  duration: '3 workshop sessions',
  skills: ['Electronics', 'Prototyping', 'Testing'],
  defaultWorkflowId: 'design-preview-workflow',
  status: 'assigned',
  targetAudience: { programs: ['STEMQuest'], grades: ['Tiny Makers'] },
  technologies: [{ name: 'Microcontroller', icon: 'Cpu' }, { name: 'Moisture sensor', icon: 'Zap' }],
  learningOutcomes: [
    { id: 'signal', title: 'Read a sensor', desc: 'Turn moisture measurements into a useful signal.', theme: 'blue' },
    { id: 'iterate', title: 'Improve a prototype', desc: 'Test the device and make one evidence-based improvement.', theme: 'green' },
  ],
  missionBrief: {
    goal: 'Design, wire, and test a plant monitor that tells someone when the soil is becoming dry.',
    whyItMatters: 'Sensors help people care for living things consistently—even when they cannot check them all day.',
    finalOutcome: 'A working plant guardian with a visible alert and proof that it responds to wet and dry soil.',
    materials: ['Microcontroller', 'Moisture sensor', 'LED', 'Jumper wires', 'Plant or soil sample'],
    prerequisites: ['Watch the sensor introduction', 'Ask your instructor to check the wiring before power-on'],
    safetyNotes: ['Keep water away from the powered circuit.', 'Disconnect power before changing wires.'],
    deliverables: [
      { id: 'prototype', title: 'Working plant guardian', evidenceType: 'video', required: true },
      { id: 'test', title: 'Wet-versus-dry test evidence', evidenceType: 'image', required: true },
      { id: 'reflection', title: 'One improvement you would make next', evidenceType: 'text', required: true },
    ],
  },
  resources: [
    { id: 'sensor-guide', title: 'Moisture sensor quick guide', type: 'file', url: '#' },
    { id: 'wiring-demo', title: 'Watch the wiring demonstration', type: 'video', url: '#' },
  ],
};

const missionDesignWorkflow: ProcessTemplate = {
  id: 'design-preview-workflow',
  name: 'Maker build cycle',
  description: 'Understand, plan, build, test, and share.',
  phases: [
    { id: 'understand', name: 'Understand the plant problem', description: 'Observe the plant and decide what the alert should communicate.', objective: 'Explain who needs the plant guardian and what it should notice.', instructions: 'Observe the plant and write one clear problem statement before choosing parts.', checklist: ['Observe wet and dry soil', 'Write the problem in one sentence'], tools: ['Notebook'], materials: ['Plant or soil sample'], evidenceRequirements: [{ id: 'understand-note', type: 'text', prompt: 'Write your problem statement.', required: true }], estimatedMinutes: 20, required: true, color: 'blue', icon: 'Brain', order: 1 },
    { id: 'plan', name: 'Plan the circuit', description: 'Sketch the sensor, controller, and alert before connecting parts.', objective: 'Create a circuit plan another maker can understand.', instructions: 'Draw how the sensor, controller and LED connect. Ask for a quick mentor check.', checklist: ['Draw the circuit', 'Label every connection', 'Get a mentor check'], tools: ['Pencil', 'Circuit simulator'], materials: ['Planning sheet'], evidenceRequirements: [{ id: 'plan-photo', type: 'image', prompt: 'Add a photo or screenshot of your circuit plan.', required: true }], estimatedMinutes: 30, required: true, color: 'amber', icon: 'Pencil', order: 2 },
    { id: 'build', name: 'Build the guardian', description: 'Wire the circuit and create a stable enclosure.', objective: 'Build a safe first prototype that can read the sensor.', instructions: 'Connect one part at a time. Keep power disconnected while changing wires.', checklist: ['Connect the sensor', 'Add the visible alert', 'Secure loose wires'], tools: ['Wire cutter', 'Computer'], materials: ['Microcontroller', 'Moisture sensor', 'LED', 'Jumper wires'], safetyNotes: ['Disconnect power before changing wires.', 'Keep water away from the powered circuit.'], evidenceRequirements: [{ id: 'build-photo', type: 'image', prompt: 'Photograph your first working prototype.', required: true }], estimatedMinutes: 60, required: true, color: 'indigo', icon: 'Wrench', order: 3 },
    { id: 'test', name: 'Test and improve', description: 'Collect proof, notice what fails, and improve the response.', objective: 'Prove the guardian responds differently to wet and dry soil.', instructions: 'Run the same test twice, record what happens, then improve one part.', checklist: ['Test dry soil', 'Test wet soil', 'Make one improvement'], tools: ['Phone camera'], materials: ['Wet and dry soil samples'], evidenceRequirements: [{ id: 'test-video', type: 'video', prompt: 'Record the wet-versus-dry test.', required: true }], estimatedMinutes: 40, required: true, color: 'emerald', icon: 'Check', order: 4 },
  ],
};

const missionStudioPreviewAssignment: Assignment = assignmentFromMission(missionDesignPreview);
const missionStudioPreviewSnapshot = createWorkflowSnapshot(missionDesignWorkflow, '2026-09-29T00:00:00.000Z');
const missionStudioPreviewProject: StudentProject = {
  id: 'design-preview-student-project',
  studentId: 'design-preview-student',
  organizationId: 'design-preview-organization',
  templateId: missionDesignPreview.id,
  title: missionDesignPreview.title,
  description: missionDesignPreview.description,
  thumbnailUrl: missionDesignPreview.thumbnailUrl,
  coverImage: missionDesignPreview.thumbnailUrl,
  station: missionDesignPreview.station,
  status: 'building',
  workflowId: missionDesignWorkflow.id,
  workflowSnapshot: missionStudioPreviewSnapshot,
  missionBrief: missionDesignPreview.missionBrief,
  resources: missionDesignPreview.resources || [],
  stepResources: {},
  steps: buildProjectStepsFromWorkflow(missionStudioPreviewSnapshot).map((step, index) => ({ ...step, status: index === 0 ? 'done' : index === 1 ? 'doing' : 'todo' })),
  commits: [],
  skills: missionDesignPreview.skills,
};

type StudioPreviewState = 'build' | 'review' | 'revision' | 'approved' | 'complete' | 'submitted';

const getMissionStudioPreviewProject = (state: StudioPreviewState): StudentProject => {
  const steps = missionStudioPreviewProject.steps.map(step => ({ ...step }));

  if (state === 'review') {
    steps[0].status = 'done';
    steps[1] = {
      ...steps[1],
      status: 'PENDING_REVIEW',
      evidence: 'https://example.com/plant-guardian-plan',
      note: 'I labelled the sensor, board, and LED, then checked each connection with my mentor.',
    };
    steps[2].status = 'todo';
  }

  if (state === 'revision') {
    steps[0].status = 'done';
    steps[1] = {
      ...steps[1],
      status: 'REJECTED',
      evidence: 'https://example.com/plant-guardian-plan',
      note: 'I drew the main connections before starting the build.',
      reviewNotes: 'Your idea is clear. Add labels for power and ground so another maker can wire it safely.',
    };
    steps[2].status = 'todo';
  }

  if (state === 'approved') {
    steps[0].status = 'done';
    steps[1] = {
      ...steps[1],
      status: 'done',
      evidence: '/mission-plant-guardian.svg',
      note: 'I labelled every connection and checked the plan before wiring.',
      reviewNotes: 'Clear plan and careful labels. You are ready to build.',
    };
    steps[2].status = 'doing';
  }

  if (state === 'complete' || state === 'submitted') {
    steps.forEach((step, index) => {
      step.status = 'done';
      step.note = `Proof for step ${index + 1} is ready.`;
      step.evidence = index === 1 ? '/mission-plant-guardian.svg' : `https://example.com/plant-guardian-step-${index + 1}`;
    });
  }

  return {
    ...missionStudioPreviewProject,
    status: state === 'submitted' ? 'submitted' : state === 'revision' ? 'changes_requested' : state === 'approved' ? 'published' : 'building',
    ...(state === 'revision' ? {
      feedback: 'Your concept is strong. Label the power path and add one photo of the rover during testing, then send it again.',
      reviewedByName: 'Ms. Lina',
      reviewedAt: '2026-09-30T09:30:00.000Z',
    } : {}),
    ...(state === 'approved' ? {
      feedback: 'Excellent iteration. Your evidence explains both the design choice and what changed after testing.',
      reviewedByName: 'Ms. Lina',
      reviewedAt: '2026-09-30T10:15:00.000Z',
      xpReward: 120,
    } : {}),
    steps,
  };
};

const LazyView: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<LoadingScreen mode="standard" message="Opening your workshop..." />}>
    {children}
  </Suspense>
);

const AccountIssue: React.FC<{ message: string; onSignOut: () => Promise<void> }> = ({ message, onSignOut }) => (
  <main className="sq-entry-shell">
    <section className="sq-entry-card sq-entry-card--issue" aria-labelledby="account-issue-title">
      <div className="sq-entry-mark" aria-hidden="true"><Wrench /></div>
      <p className="sq-entry-eyebrow">Account connection</p>
      <h1 id="account-issue-title">Your workshop pass needs a quick repair.</h1>
      <p className="sq-entry-copy">{message}</p>
      <div className="sq-entry-actions">
        <a className="sq-entry-primary" href={config.erpUrl}><ArrowLeft size={18} /> Return to Edufy</a>
        <button className="sq-entry-secondary" type="button" onClick={() => window.location.reload()}><RefreshCw size={18} /> Try again</button>
      </div>
      <button className="sq-entry-text-action" type="button" onClick={() => void onSignOut()}>Use a different account</button>
    </section>
  </main>
);

// Wrapper component to use Auth Context
const SparkQuestApp: React.FC = () => {
  // 1. ALL HOOKS
  const { user, userProfile, signInWithToken, signOut, loading: authLoading, authIssue } = useAuth();
  const { fetchMission, clearMission, assignment, project, error, isConnected } = useMissionData();
  const { projectTemplates, studentProjects, processTemplates } = useFactoryData();

  const [view, setView] = useState<'HOME' | 'WIZARD' | 'FACTORY' | 'SHOWCASE'>('HOME');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [previewProjectId, setPreviewProjectId] = useState<string | null>(null);
  const [previewProjectData, setPreviewProjectData] = useState<StudentProject | null>(null);

  // URL State Hooks (Moved Up)
  const [initialProjectId, setInitialProjectId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('projectId');
  });
  const launchExchangeStarted = useRef(false);
  const [launchPending, setLaunchPending] = useState(() => new URLSearchParams(window.location.search).has('launch'));
  const [launchIssue, setLaunchIssue] = useState<string | null>(null);

  const [initialRole] = useState<'student' | 'instructor' | 'parent'>(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('role');
    return (r === 'instructor' || r === 'parent') ? r : 'student';
  });

  const [initialViewMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view');
  });

  // Effects
  useEffect(() => { console.log("App Version: Fixed hooks v2"); }, []);

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    if (!currentUrl.searchParams.has('token')) return;
    currentUrl.searchParams.delete('token');
    window.history.replaceState({}, document.title, currentUrl.toString());
    setLaunchIssue('This legacy SparkQuest sign-in link is no longer supported. Return to Edufy and open SparkQuest again.');
  }, []);

  useEffect(() => {
    const launchCode = new URLSearchParams(window.location.search).get('launch');
    if (!launchCode || launchExchangeStarted.current) return;
    launchExchangeStarted.current = true;
    setLaunchPending(true);

    void exchangeSparkQuestLaunch(launchCode)
      .then(async result => {
        if (result.projectId) setInitialProjectId(result.projectId);
        await signInWithToken(result.customToken);
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('launch');
        cleanUrl.searchParams.delete('token');
        window.history.replaceState({}, document.title, cleanUrl.toString());
        setLaunchIssue(null);
      })
      .catch(error => {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('launch');
        cleanUrl.searchParams.delete('token');
        window.history.replaceState({}, document.title, cleanUrl.toString());
        setLaunchIssue(error instanceof Error ? error.message : 'The Edufy launch link is invalid or expired.');
      })
      .finally(() => setLaunchPending(false));
  }, [signInWithToken]);

  // Routing Logic
  useEffect(() => {
    if (!user || authLoading) return;
    console.log("🚦 Routing Check. User:", user.email, "Role:", userProfile?.role, "Current View:", view);

    // If active mission, stay
    if (assignment && project) {
      setView('WIZARD');
      return;
    }

    if (initialViewMode === 'showcase') {
      setView('SHOWCASE' as any);
      return;
    }

    // Role Routing
    if (userProfile?.role === 'instructor' || userProfile?.role === 'admin') {
      setView('FACTORY');
      return;
    }

    setView('HOME');
  }, [user, userProfile, assignment, project, authLoading]);

  // Data Fetching
  useEffect(() => {
    if (user && (selectedProjectId || initialProjectId)) {
      if (userProfile?.role === 'instructor' || userProfile?.role === 'admin') return;
      const pId = selectedProjectId || initialProjectId;
      console.log("🚀 [SparkQuest] Loading Mission:", pId);
      // 🔥 CRITICAL FIX: Use studentId from Profile (Firestore) if available, otherwise fallback to Auth UID (Legacy/Demo)
      const targetStudentId = userProfile?.studentId || user.uid;
      fetchMission(targetStudentId, pId || undefined);
    }
  }, [selectedProjectId, initialProjectId, user, userProfile]);

  // Deep Link Handling for Preview
  useEffect(() => {
    if (initialViewMode === 'details' && initialProjectId && !previewProjectId) {
      setPreviewProjectId(initialProjectId);
    }
  }, [initialViewMode, initialProjectId]);

  const handleLogout = async () => {
    await signOut();
    window.location.reload();
  };

  // 2. EARLY RETURNS (Guard Clauses)
  // 2. EARLY RETURNS (Guard Clauses)

  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('designPreview') === 'mission') {
    return <LazyView><ProjectDetailsEnhanced project={missionDesignPreview} workflow={missionDesignWorkflow} role="student" onBack={() => { window.location.href = window.location.pathname; }} onLaunch={() => undefined} /></LazyView>;
  }

  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('designPreview') === 'studio') {
    const studioStateParam = new URLSearchParams(window.location.search).get('studioState');
    const studioState: StudioPreviewState = ['review', 'revision', 'approved', 'complete', 'submitted'].includes(studioStateParam || '')
      ? studioStateParam as StudioPreviewState
      : 'build';
    return <LazyView><StudentWizard assignment={missionStudioPreviewAssignment} initialProject={getMissionStudioPreviewProject(studioState)} isConnected previewMode onExit={() => { window.location.href = `${window.location.pathname}?designPreview=mission`; }} /></LazyView>;
  }

  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('designPreview') === 'review') {
    const reviewProject: StudentProject = {
      ...getMissionStudioPreviewProject('submitted'),
      id: 'design-preview-showcase',
      title: 'Solar rover field showcase',
      templateId: 'showcase-template',
      workflowId: 'showcase',
      studentName: 'Aya Maker',
      mediaUrls: ['/mission-plant-guardian.svg'],
      presentationUrl: 'https://example.com/solar-rover',
    };
    return <LazyView><ReviewModal projectId={reviewProject.id} previewProject={reviewProject} previewStudentName="Aya Maker" onClose={() => { window.location.href = `${window.location.pathname}?designPreview=studio&studioState=submitted`; }} /></LazyView>;
  }

  if (import.meta.env.DEV && isLocalHostname(window.location.hostname) && ['showcase', 'showcaseReview'].includes(new URLSearchParams(window.location.search).get('designPreview') || '')) {
    const outcome = new URLSearchParams(window.location.search).get('outcome') === 'approved' ? 'published' : 'changes_requested';
    const showcaseProject: StudentProject = {
      ...getMissionStudioPreviewProject(outcome === 'published' ? 'approved' : 'revision'),
      id: 'design-preview-showcase',
      title: 'Solar rover field showcase',
      templateId: 'showcase-template',
      workflowId: 'showcase',
      status: new URLSearchParams(window.location.search).get('designPreview') === 'showcase' ? 'building' : outcome,
      mediaUrls: new URLSearchParams(window.location.search).get('designPreview') === 'showcase' ? [] : ['/mission-plant-guardian.svg'],
      presentationUrl: new URLSearchParams(window.location.search).get('designPreview') === 'showcase' ? '' : 'https://example.com/solar-rover',
    };
    return <LazyView><StudentWizard assignment={missionStudioPreviewAssignment} initialProject={showcaseProject} isConnected previewMode onExit={() => { window.location.href = `${window.location.pathname}?designPreview=review`; }} /></LazyView>;
  }

  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('designPreview') === 'store') {
    return <LazyView><SparkStore isOpen previewMode defaultTab="gadgets" onClose={() => { window.location.href = `${window.location.pathname}?designPreview=studio`; }} /></LazyView>;
  }

  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('designPreview') === 'portfolio') {
    return <LazyView><StudentPortfolio isOpen previewMode onSelectProject={() => undefined} onStartShowcase={() => undefined} onClose={() => { window.location.href = `${window.location.pathname}?designPreview=store`; }} /></LazyView>;
  }

  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('designPreview') === 'arcade') {
    return <LazyView><ArcadeView isOpen previewMode onClose={() => { window.location.href = `${window.location.pathname}?designPreview=portfolio`; }} /></LazyView>;
  }

  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('designPreview') === 'gallery') {
    return <LazyView><StudentGallery isOpen previewMode onClose={() => { window.location.href = `${window.location.pathname}?designPreview=arcade`; }} /></LazyView>;
  }

  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('designPreview') === 'inventory') {
    return <LazyView><CredentialWallet isOpen previewMode onClose={() => { window.location.href = `${window.location.pathname}?designPreview=gallery`; }} /></LazyView>;
  }

  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('designPreview') === 'profile') {
    return <LazyView><main className="sq-profile-preview"><button type="button" onClick={() => { window.location.href = `${window.location.pathname}?designPreview=inventory`; }} aria-label="Close maker profile"><X size={24} /></button><AvatarSelector previewMode studentName="Aya Maker" onSelect={() => undefined} /></main></LazyView>;
  }

  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('designPreview') === 'navigation') {
    return <LazyView><LearnerNavigationPreview onClose={() => { window.location.href = `${window.location.pathname}?designPreview=profile`; }} /></LazyView>;
  }

  // Loading
  if (authLoading) {
    return <LoadingScreen mode="standard" message="Initializing System..." />;
  }

  if (launchPending) {
    return <LoadingScreen mode="standard" message="Opening your verified Edufy workshop..." />;
  }

  if (launchIssue) {
    return <AccountIssue message={launchIssue} onSignOut={handleLogout} />;
  }

  // Auth Guard
  if (!user) {
    return <LoginView />;
  }

  if (authIssue) {
    return <AccountIssue message={authIssue} onSignOut={handleLogout} />;
  }

  if (!userProfile) {
    return <LoadingScreen mode="standard" message="Connecting your Edufy profile..." />;
  }

  // 3. MAIN RENDER LOGIC

  if (view === 'FACTORY') {
    return <LazyView><InstructorFactory /></LazyView>;
  }

  if (view === ('SHOWCASE' as any)) {
    return <LazyView><ParentShowcase
      coverImage={project?.coverImage || project?.thumbnailUrl || undefined}
      onViewProject={() => {
        // If we have a project ID in URL, we could open details, but for now lets go to HOME
        // which is the project selector/showcase
        if (initialProjectId) {
          setPreviewProjectId(initialProjectId);
        } else {
          setView('HOME');
        }
      }} /></LazyView>;
  }

  // PREVIEW / DETAILS INTERSTITIAL
  // Renders if previewProjectId is set (either from ProjectSelector click or Deep Link)
  if (previewProjectId) {
    // Resolve Project Data
    const effectivePreviewId = previewProjectId;
    let template = projectTemplates.find(p => p.id === effectivePreviewId);

    if (!template) {
      const existingProject = studentProjects?.find((p: any) => p.id === effectivePreviewId);
      if (existingProject && existingProject.templateId) {
        template = projectTemplates.find(p => p.id === existingProject.templateId);
      } else if (existingProject) {
        template = existingProject as any;
      }
    }

    const ownedPreview = previewProjectData?.id === effectivePreviewId ? previewProjectData : studentProjects?.find(project => project.id === effectivePreviewId);
    const finalProject = ownedPreview || template || {
      id: effectivePreviewId,
      title: 'Mission Loading...',
      description: 'Fetching details from server...',
      station: 'General',
      difficulty: 'intermediate',
      skills: []
    } as any;

    return <LazyView>{(
      <ProjectDetailsEnhanced
        project={finalProject}
        workflow={processTemplates.find(workflow => workflow.id === (finalProject as any).defaultWorkflowId || workflow.id === (finalProject as any).workflowId)}
        role={initialRole}
        onLaunch={ownedPreview && (projectAcademicYear(ownedPreview) !== currentAcademicYear() || !['active', 'feedback'].includes(projectLane(ownedPreview.status))) ? undefined : () => {
          // If student wants to start, they click Launch.
          // We clear preview, set "selected" which triggers the fetchMission effect
          setPreviewProjectId(null);
          setSelectedProjectId(effectivePreviewId);
        }}
        onBack={() => {
          setPreviewProjectId(null);
          if (initialViewMode === 'details') window.close();
        }}
      />
    )}</LazyView>;
  }

  // Error State
  if (error) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white p-8 text-center space-y-6">
        <h1 className="text-4xl font-black text-red-500">Mission Error</h1>
        <p className="text-lg text-slate-300">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold transition-colors"
        >
          Reboot System
        </button>
      </div>
    );
  }

  // HOME View (Project Selector)
  if (view === 'HOME' && !project) {
    return (
      <ProjectSelector
        studentId={userProfile?.studentId || user.uid}
        onSelectProject={(projectId) => {
          // DIRECT LAUNCH to Wizard (as requested by user)
          console.log("Launching Mission Direct:", projectId);
          setSelectedProjectId(projectId);
        }}
        // We'll need to modify ProjectSelector to accept an onPreview prop if we want the button
        // For now, let's assume we will add it.
        onPreviewProject={(projectId, record) => {
          setPreviewProjectData(record || null);
          setPreviewProjectId(projectId);
        }}
        onLogout={handleLogout}
      />
    );
  }

  // WIZARD View
  return (
    <div className="h-screen w-full flex flex-col bg-slate-900 overflow-hidden relative">
      <LazyView><StudentWizard
        assignment={assignment!}
        initialProject={project!}
        isConnected={isConnected}
        onExit={() => {
          setSelectedProjectId(null);
          clearMission();
          setView('HOME');
          // Clear URL params if any
          window.history.pushState({}, '', window.location.pathname);
        }}
      /></LazyView>
    </div>
  );
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="sq-entry-shell">
          <section className="sq-entry-card sq-entry-card--issue" aria-labelledby="system-issue-title">
          <div className="sq-entry-mark" aria-hidden="true"><Wrench /></div>
          <p className="sq-entry-eyebrow">SparkQuest recovery</p>
          <h1 id="system-issue-title">The studio could not open.</h1>
          <p className="sq-entry-copy">Refresh the page first. If the problem continues, reset only SparkQuest’s local session and sign in again.</p>
          <pre className="sq-entry-error-detail">
            {this.state.error?.toString()}
          </pre>
          <div className="sq-entry-actions">
          <button
            onClick={() => window.location.reload()}
            className="sq-entry-primary"
          >
            <RefreshCw size={18} /> Refresh
          </button>
          <button
            onClick={() => {
              ['sparkquest_bridge_user', 'sparkquest_kiosk_mode', 'sparkquest_boot_complete'].forEach(key => localStorage.removeItem(key));
              window.location.reload();
            }}
            className="sq-entry-secondary"
          >
            Reset SparkQuest session
          </button>
          </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

const App: React.FC = () => {
  const preview = isLocalHostname(window.location.hostname)
    ? new URLSearchParams(window.location.search).get('preview')
    : null;

  if (preview === 'login') return <LoginView />;
  if (preview === 'student-project') return <LazyView><StudentProjectDetailsDemo /></LazyView>;
  if (import.meta.env.DEV && isLocalHostname(window.location.hostname) && new URLSearchParams(window.location.search).get('designPreview') === 'import') return <LazyView><MissionImportPreview /></LazyView>;
  if (import.meta.env.DEV && isLocalHostname(window.location.hostname) && new URLSearchParams(window.location.search).get('designPreview') === 'workbench') return <LazyView><LearnerWorkbenchPreview /></LazyView>;
  if (import.meta.env.DEV && isLocalHostname(window.location.hostname) && new URLSearchParams(window.location.search).get('designPreview') === 'reviewLoop') return <LazyView><ReviewLoopPreview /></LazyView>;
  if (import.meta.env.DEV && isLocalHostname(window.location.hostname) && new URLSearchParams(window.location.search).get('designPreview') === 'learnerDesk') return <LazyView><InstructorLearnerPreview /></LazyView>;

  return (
    <ErrorBoundary>
      <AuthProvider>
        <FactoryProvider>
          <ToastProvider>
            <ThemeProvider>
              <FocusSessionProvider>
                <SessionProvider>
                  <SessionOverlay />
                  <InactivityMonitor />
                  {/* <PickupNotification /> -- TEMPORARILY DISABLED: Missing Firestore indexes */}
                  <SessionControls />
                  <SparkQuestApp />
                </SessionProvider>
              </FocusSessionProvider>
            </ThemeProvider>
          </ToastProvider>
        </FactoryProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App;
