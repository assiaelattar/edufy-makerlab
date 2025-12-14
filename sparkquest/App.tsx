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
import { ProjectSelector } from './components/ProjectSelector';
import './cleanup-projects'; // Import cleanup script for console access

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


// Wrapper component to use Auth Context
const SparkQuestApp: React.FC = () => {
  const { user, userProfile, signInWithToken, signOut, loading: authLoading } = useAuth();
  const { fetchMission, assignment, project, loading: missionLoading, error, isConnected } = useMissionData();

  const [view, setView] = useState<'HOME' | 'WIZARD' | 'FACTORY'>('HOME');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

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

    // 1. If actively working on a mission (WIZARD mode), stay there
    if (assignment && project) {
      setView('WIZARD');
      return;
    }

    // 2. Role Based Routing
    if (userProfile?.role === 'instructor' || userProfile?.role === 'admin') {
      setView('FACTORY');
    } else {
      // Students go to Home/Studio
      setView('HOME');
    }
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
      fetchMission(user.uid, pId);
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
    const currentUrl = window.location.href;

    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white p-8 text-center space-y-8 animate-in fade-in duration-500 relative">
        <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/20 mb-4 animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" x2="3" y1="12" y2="12" /></svg>
        </div>
        <div>
          <h1 className="text-3xl font-black mb-2">Welcome to SparkQuest</h1>
          <p className="text-slate-400">Connect to your Makerlab account to access missions.</p>
        </div>

        <button
          onClick={handleLogin}
          className="px-8 py-4 bg-white text-slate-950 hover:bg-slate-200 rounded-2xl font-black shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:scale-105 transition-all text-lg flex items-center gap-3"
        >
          <span>Log In with School Account</span>
        </button>

        {/* Configuration Toggle */}
        <div className="pt-8">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="text-xs text-slate-600 hover:text-slate-400 underline"
          >
            {showConfig ? 'Hide Settings' : 'Connection Settings'}
          </button>

          {showConfig && (
            <div className="mt-4 p-4 bg-slate-900 border border-slate-700 rounded-xl w-full max-w-sm mx-auto animate-in slide-in-from-bottom-2">
              <label className="text-xs text-slate-400 block mb-1 text-left">ERP Server URL</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:border-blue-500 outline-none"
                  value={erpUrl}
                  onChange={(e) => {
                    setErpUrl(e.target.value);
                  }}
                />
                <button
                  onClick={() => {
                    localStorage.setItem('erp_url', erpUrl);
                    alert("URL Saved");
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs font-bold"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
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
        studentName={userProfile?.name || user.displayName || 'Explorer'}
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
        <SparkQuestApp />
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App;
