import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useMissionData } from './hooks/useMissionData';
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
import './cleanup-projects'; // Import cleanup script for console access
import { config } from './utils/config';
import { SessionOverlay } from './components/SessionOverlay';
import { InactivityMonitor } from './components/InactivityMonitor';
import { PickupNotification } from './components/PickupNotification';
import { FocusSessionProvider } from './context/FocusSessionContext';
import { SessionControls } from './components/SessionControls';

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
  const { user, userProfile, signInWithToken, signOut, loading: authLoading } = useAuth();
  const { fetchMission, assignment, project, loading: missionLoading, error, isConnected } = useMissionData();

  useEffect(() => { console.log("App Version: Fixed hooks"); }, []);

  const [view, setView] = useState<'HOME' | 'WIZARD' | 'FACTORY'>('HOME');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const [bootComplete, setBootComplete] = useState(() => {
    return localStorage.getItem('sparkquest_boot_complete') === 'true'; // Changed to localStorage for persistence across reloads/sessions
  });

  // Parse projectId from URL on mount (ONCE, before auth redirect clears params)
  const [initialProjectId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const pId = params.get('projectId');
    return pId;
  });



  useEffect(() => {
    // Check for token in URL on load (Bridge from ERP Legacy)
    // Only process if we are NOT already logged in, or if we want to switch users (rare)
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      console.log("Token detected, attempting sign in...");
      signInWithToken(token).then(() => {
        // SUCCESS: Do NOT clear token yet. Wait for 'user' state to update.
        // If we clear it now, we race with the AuthProvider update, causing a redirect loop.
        console.log("Sign in promise resolved. Waiting for auth state change...");
      }).catch(err => {
        console.error("Auth Token Error", err);
      });
    }
  }, []);

  // --- CLEANUP TOKEN AFTER LOGIN ---
  useEffect(() => {
    if (user) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('token')) {
        console.log("User authenticated, cleaning up URL token.");
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('token');
        window.history.replaceState({}, document.title, newUrl.toString());
      }
    }
  }, [user]);

  // --- TRAFFIC CONTROL: ROUTING LOGIC ---
  useEffect(() => {
    if (!user || authLoading) return;

    console.log("🚦 Routing Check. User:", user.email, "Role:", userProfile?.role, "Current View:", view);

    // 1. If actively working on a mission (WIZARD mode), stay there
    if (assignment && project) {
      setView('WIZARD');
      return;
    }

    // 2. Role Based Routing
    // FIXED: Route Instructors/Admins to FACTORY
    if (userProfile?.role === 'instructor' || userProfile?.role === 'admin') {
      console.log("👉 Routing to FACTORY (Instructor/Admin)");
      setView('FACTORY');
      return;
    }

    console.log("👉 Routing to HOME (Unified View)");
    setView('HOME');
  }, [user, userProfile, assignment, project, authLoading]);


  // Auto-fetch data ONLY if we have a specific project ID active
  useEffect(() => {
    if (user && (selectedProjectId || initialProjectId)) {
      // INSTRUCTOR GUARD: Instructors should not trigger mission data fetch here
      // They use 'FACTORY' view which has its own data hooks.
      if (userProfile?.role === 'instructor' || userProfile?.role === 'admin') {
        return;
      }

      const pId = selectedProjectId || initialProjectId;
      console.log("🚀 [SparkQuest] Loading Mission:", pId);
      // Logic: If user selects a project, we fetch it. 
      // This hook will eventually set 'project' and 'assignment', causing view -> WIZARD
      fetchMission(user.uid, pId || undefined);
    }
  }, [selectedProjectId, initialProjectId, user, userProfile]);

  const handleLogout = async () => {
    await signOut();
    window.location.reload();
  };

  // --- UNIFIED LOGIN REDIRECT LOGIC (MANUAL TRIGGER ONLY) ---
  const [erpUrl, setErpUrl] = useState(() => localStorage.getItem('erp_url') || import.meta.env.VITE_ERP_URL || 'http://localhost:5173');
  const [showConfig, setShowConfig] = useState(false);

  // REMOVED AUTO REDIRECT EFFECT TO PREVENT LOOPS

  const handleLogin = () => {
    const currentUrl = window.location.href;
    window.location.href = `${erpUrl}?service=sparkquest&redirect=${encodeURIComponent(currentUrl)}`;
  };

  // --- ONBOARDING: BOOT SEQUENCE ---
  if (!bootComplete) {
    return <BootSequence onComplete={() => {
      localStorage.setItem('sparkquest_boot_complete', 'true'); // Persist to localStorage
      setBootComplete(true);
    }} />;
  }

  // --- LOADING STATE ---
  if (authLoading || (missionLoading && view === 'WIZARD')) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white gap-4">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="font-bold text-blue-400 tracking-widest uppercase text-sm animate-pulse">Initializing System...</div>
      </div>
    );
  }

  // --- LOGIN / AUTHENTICATING STATE ---
  if (!user) {
    const params = new URLSearchParams(window.location.search);
    const hasToken = params.get('token');

    // If we have a token, we are currently authenticating. Show spinner.
    if (hasToken) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white p-8 text-center space-y-6">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <h1 className="text-2xl font-bold text-emerald-400">Verifying Identity...</h1>
          <p className="text-slate-400">Please wait while we log you in.</p>
        </div>
      );
    }

    // Otherwise, show Manual Login Screen
    return <LoginView />;
  }

  // --- INSTRUCTOR VIEW: THE FACTORY ---
  if (view === 'FACTORY') {
    return <InstructorFactory />;
  }

  // --- STUDENT VIEW: STUDIO / HOME ---
  if (view === 'HOME' && !project) {
    return (
      <ProjectSelector
        studentId={user.uid}
        onSelectProject={(projectId) => {
          setSelectedProjectId(projectId);
        }}
        onLogout={handleLogout}
      />
    );
  }

  // --- ERROR STATE ---
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

  // --- ACTIVE MISSION: WIZARD ---
  return (
    <div className="h-screen w-full flex flex-col bg-slate-900 overflow-hidden relative">
      <StudentWizard
        assignment={assignment!}
        initialProject={project!}
        isConnected={isConnected}
        onExit={() => {
          // Clear selection to go back to Home
          setSelectedProjectId(null);
          setView('HOME');
          // Force reload to clear hooks is safer for now
          window.location.href = window.location.pathname;
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
