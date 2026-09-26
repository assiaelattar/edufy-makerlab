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
import { ArrowLeft, RefreshCw, Wrench } from 'lucide-react';
import { isLocalHostname } from './utils/appUrls';
import { exchangeSparkQuestLaunch } from './services/appBridge';
import { ProcessTemplate, ProjectTemplate } from './types';


import { LoadingScreen } from './components/LoadingScreen';

const StudentWizard = lazy(() => import('./components/StudentWizard').then(module => ({ default: module.StudentWizard })));
const InstructorFactory = lazy(() => import('./components/InstructorFactory').then(module => ({ default: module.InstructorFactory })));
const ProjectDetailsEnhanced = lazy(() => import('./components/ProjectDetailsEnhanced').then(module => ({ default: module.ProjectDetailsEnhanced })));
const ParentShowcase = lazy(() => import('./components/ParentShowcase'));

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
    { id: 'understand', name: 'Understand the plant problem', description: 'Observe the plant and decide what the alert should communicate.', color: 'blue', icon: 'Brain', order: 1 },
    { id: 'plan', name: 'Plan the circuit', description: 'Sketch the sensor, controller, and alert before connecting parts.', color: 'amber', icon: 'Pencil', order: 2 },
    { id: 'build', name: 'Build the guardian', description: 'Wire the circuit and create a stable enclosure.', color: 'indigo', icon: 'Wrench', order: 3 },
    { id: 'test', name: 'Test wet and dry soil', description: 'Collect proof, notice what fails, and improve the response.', color: 'green', icon: 'Check', order: 4 },
  ],
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

    const finalProject = template || {
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
        onLaunch={() => {
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
        onPreviewProject={(projectId) => {
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
  const localPreview = isLocalHostname(window.location.hostname)
    && new URLSearchParams(window.location.search).get('preview') === 'login';

  if (localPreview) return <LoginView />;

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
