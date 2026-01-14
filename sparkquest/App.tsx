import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useMissionData } from './hooks/useMissionData';
import { useFactoryData } from './hooks/useFactoryData';
import { StudentWizard } from './components/StudentWizard';
import { InstructorFactory } from './components/InstructorFactory';
import { RoadmapStep, StepStatus, Peer, User, Assignment, StudentProject } from './types';
import { Roadmap } from './components/Roadmap';
import { SubmissionModal } from './components/SubmissionModal';
import { StyleGuide } from './components/StyleGuide';
import { api } from './services/api';
import { LoginPage } from './components/LoginPage';
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
import { ProjectDetailsEnhanced } from './components/ProjectDetailsEnhanced';


// Mock Data for Old Roadmap (Legacy View)
const INITIAL_STEPS: RoadmapStep[] = [
  { id: 1, title: 'Concept', description: 'Draw your robot car idea on paper. What features does it have?', status: StepStatus.ACTIVE, proofType: 'image', xpReward: 50 },
  { id: 2, title: 'Design', description: 'Use Tinkercad to create a 3D model of your chassis.', status: StepStatus.LOCKED, proofType: 'link', xpReward: 100 },
  { id: 3, title: 'Build', description: '3D Print or Laser Cut your parts. Show us the physical parts!', status: StepStatus.LOCKED, proofType: 'image', xpReward: 150 },
  { id: 4, title: 'Wiring', description: 'Wire up the motors and battery pack. Careful with polarity!', status: StepStatus.LOCKED, proofType: 'image', xpReward: 150 },
  { id: 5, title: 'Code', description: 'Write the code to make it move. Upload a screenshot of your code.', status: StepStatus.LOCKED, proofType: 'image', xpReward: 200 },
  { id: 6, title: 'Launch', description: 'Record a video or photo of your robot driving!', status: StepStatus.LOCKED, proofType: 'image', xpReward: 500 },
];

const MOCK_PEERS: Peer[] = [
  { id: 'p1', name: 'Alex', avatarColor: 'bg-red-500', currentStepId: 2 },
  { id: 'p2', name: 'Sarah', avatarColor: 'bg-yellow-500', currentStepId: 2 },
  { id: 'p3', name: 'Jordan', avatarColor: 'bg-purple-500', currentStepId: 4 },
  { id: 'p4', name: 'Mike', avatarColor: 'bg-green-500', currentStepId: 1 },
];

const INITIAL_USER: User = {
  name: 'Explorer',
  level: 1,
  xp: 0,
  currentStepId: 1
};


import { BootSequence } from './components/BootSequence';

// Wrapper component to use Auth Context
const SparkQuestApp: React.FC = () => {
  // 1. ALL HOOKS
  const { user, userProfile, signInWithToken, signOut, loading: authLoading } = useAuth();
  const { fetchMission, clearMission, assignment, project, loading: missionLoading, error, isConnected } = useMissionData();
  const { projectTemplates, studentProjects } = useFactoryData();

  const [view, setView] = useState<'HOME' | 'WIZARD' | 'FACTORY'>('HOME');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [previewProjectId, setPreviewProjectId] = useState<string | null>(null);

  const [bootComplete, setBootComplete] = useState(() => {
    return localStorage.getItem('sparkquest_boot_complete') === 'true';
  });

  // URL State Hooks (Moved Up)
  const [initialProjectId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('projectId');
  });

  const [initialRole] = useState<'student' | 'instructor' | 'parent'>(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('role');
    return (r === 'instructor' || r === 'parent') ? r : 'student';
  });

  const [initialViewMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view');
  });

  const [erpUrl, setErpUrl] = useState(() => localStorage.getItem('erp_url') || import.meta.env.VITE_ERP_URL || 'http://localhost:5173');
  const [showConfig, setShowConfig] = useState(false);

  // Effects
  useEffect(() => { console.log("App Version: Fixed hooks v2"); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      console.log("Token detected, attempting sign in...");
      signInWithToken(token).then(() => {
        console.log("Sign in promise resolved.");
      }).catch(err => console.error("Auth Token Error", err));
    }
  }, []);

  useEffect(() => {
    if (user) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('token')) {
        const timer = setTimeout(() => {
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('token');
          window.history.replaceState({}, document.title, newUrl.toString());
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  // Routing Logic
  useEffect(() => {
    if (!user || authLoading) return;
    console.log("🚦 Routing Check. User:", user.email, "Role:", userProfile?.role, "Current View:", view);

    // If active mission, stay
    if (assignment && project) {
      setView('WIZARD');
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
      fetchMission(user.uid, pId || undefined);
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

  const handleLogin = () => {
    const currentUrl = window.location.href;
    window.location.href = `${erpUrl}?service=sparkquest&redirect=${encodeURIComponent(currentUrl)}`;
  };

  // 2. EARLY RETURNS (Guard Clauses)
  // 2. EARLY RETURNS (Guard Clauses)

  // Boot
  if (!bootComplete) {
    return <BootSequence onComplete={() => {
      localStorage.setItem('sparkquest_boot_complete', 'true');
      setBootComplete(true);
    }} />;
  }

  // Loading
  // Removed missionLoading to prevent blocking UI on navigation
  if (authLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white gap-4">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="font-bold text-blue-400 tracking-widest uppercase text-sm animate-pulse">Initializing System...</div>
      </div>
    );
  }

  // Auth Guard
  if (!user) {
    const params = new URLSearchParams(window.location.search);
    if (params.get('token')) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white p-8 text-center space-y-6">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <h1 className="text-2xl font-bold text-emerald-400">Verifying Identity...</h1>
          <p className="text-slate-400">Please wait while we log you in.</p>
        </div>
      );
    }
    return <LoginView />;
  }

  // 3. MAIN RENDER LOGIC

  if (view === 'FACTORY') {
    return <InstructorFactory />;
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

    return (
      <ProjectDetailsEnhanced
        project={finalProject}
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
    );
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
        studentId={user.uid}
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
      <StudentWizard
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
      />
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
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white p-8 text-center space-y-6">
          <h1 className="text-4xl font-black text-red-500">System Failure</h1>
          <p className="text-lg text-slate-300 max-w-2xl bg-slate-800 p-4 rounded-xl font-mono text-sm text-left overflow-auto max-h-64">
            {this.state.error?.toString()}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-red-600 hover:bg-red-700 rounded-xl font-bold transition-colors"
          >
            Reboot System
          </button>
          <button
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.reload();
            }}
            className="px-8 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold transition-colors text-sm"
          >
            Emergency Reset (Logout)
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <FocusSessionProvider>
            <SessionProvider>
              <SessionOverlay />
              <InactivityMonitor />
              <PickupNotification />
              <SessionControls />
              <SparkQuestApp />
            </SessionProvider>
          </FocusSessionProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App;
