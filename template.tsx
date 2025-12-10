import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Lock,
  Unlock,
  Star,
  Code,
  Bot,
  Glasses,
  Briefcase,
  Gamepad2,
  ChevronRight,
  CheckCircle2,
  Zap,
  TrendingUp,
  ListChecks
} from 'lucide-react';

// --- Data & Configuration ---

// --- Data & Configuration ---

interface Task {
  id: number;
  name: string;
  submissionType: string;
  completed: boolean;
}

interface Project {
  id: number;
  title: string;
  category: string;
  description: string;
  xpReward: number;
  skills: string[];
  badge: string;
  status: string;
  icon: any;
  color: string;
  image: string;
  tasks: Task[];
}

const INITIAL_PROJECTS: Project[] = [
  {
    id: 1,
    title: "Python Essentials",
    category: "coding",
    description: "Write your first script to automate a daily task. Learn variables, loops, and logic.",
    xpReward: 500,
    skills: ["Python", "Logic", "Automation"],
    badge: "Script Kiddie",
    status: "active", // active, completed, locked
    icon: Code,
    color: "emerald",
    image: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&q=80&w=800",
    tasks: [
      { id: 101, name: "Setup VS Code and Python Environment", submissionType: "Screenshot", completed: false },
      { id: 102, name: "Implement a Simple 'Hello World' with Variables", submissionType: "Code Snippet", completed: false },
      { id: 103, name: "Write a Loop to Process a List of Data", submissionType: "Code File", completed: false },
      { id: 104, name: "Final Script Documentation and Delivery", submissionType: "Document", completed: false }
    ]
  },
  {
    id: 2,
    title: "2D Platformer",
    category: "game design",
    description: "Create a simple Mario-style level using Unity. Understand physics and sprites.",
    xpReward: 800,
    skills: ["Unity", "C#", "Level Design"],
    badge: "Pixel Artist",
    status: "locked",
    icon: Gamepad2,
    color: "pink",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800",
    tasks: [
      { id: 201, name: "Game Concept Document (GDD Outline)", submissionType: "Document", completed: false },
      { id: 202, name: "Create Player Sprite and Basic Movement", submissionType: "Video/GIF", completed: false },
      { id: 203, name: "Design and Implement First Game Level", submissionType: "Screenshot", completed: false },
      { id: 204, name: "Implement Basic Scoring and Game Over Logic", submissionType: "Code File", completed: false }
    ]
  },
  {
    id: 3,
    title: "Arduino Line Follower",
    category: "robotics",
    description: "Build a robot that follows a black line on the floor using IR sensors.",
    xpReward: 1200,
    skills: ["Circuitry", "C++", "Sensors"],
    badge: "Mecha Engineer",
    status: "locked",
    icon: Bot,
    color: "cyan",
    image: "https://images.unsplash.com/photo-1535378437327-b710ea15128c?auto=format&fit=crop&q=80&w=800",
    tasks: [
      { id: 301, name: "Components List and Schematic Diagram", submissionType: "Diagram", completed: false },
      { id: 302, name: "Breadboard Circuit Assembly and Wiring", submissionType: "Photo", completed: false },
      { id: 303, name: "Write and Upload Sensor Calibration Code", submissionType: "Code Snippet", completed: false },
      { id: 304, name: "Final Robot Test Run (Video)", submissionType: "Video", completed: false }
    ]
  },
  {
    id: 4,
    title: "VR Museum Tour",
    category: "vr",
    description: "Design an immersive 3D environment for Oculus/WebXR.",
    xpReward: 1500,
    skills: ["3D Modeling", "Spatial Audio", "XR Interaction"],
    badge: "Virtual Voyager",
    status: "locked",
    icon: Glasses,
    color: "violet",
    image: "https://images.unsplash.com/photo-1622979135225-d2ba269fb1bd?auto=format&fit=crop&q=80&w=800",
    tasks: [
      { id: 401, name: "Environment Sketch & Asset List", submissionType: "Document/Sketch", completed: false },
      { id: 402, name: "Create 3D Model Placeholder", submissionType: "3D File", completed: false },
      { id: 403, name: "Implement Teleportation/Movement Script", submissionType: "Code File", completed: false },
      { id: 404, name: "Spatial Audio Placement and Review", submissionType: "Review Report", completed: false }
    ]
  },
  {
    id: 5,
    title: "Tech Startup Pitch",
    category: "business",
    description: "Formulate a business model for your VR game and pitch it to AI investors.",
    xpReward: 2000,
    skills: ["Pitching", "Market Fit", "Finance"],
    badge: "Unicorn Founder",
    status: "locked",
    icon: Briefcase,
    color: "amber",
    image: "https://images.unsplash.com/photo-1559136555-930b7e47e61d?auto=format&fit=crop&q=80&w=800",
    tasks: [
      { id: 501, name: "Competitive Analysis & Market Sizing", submissionType: "Report", completed: false },
      { id: 502, name: "Develop Lean Business Canvas (Diagram)", submissionType: "Diagram", completed: false },
      { id: 503, name: "Financial Projections (3-year)", submissionType: "Spreadsheet", completed: false },
      { id: 504, name: "Final Pitch Deck Presentation (Slides)", submissionType: "Slides", completed: false }
    ]
  }
];

const CATEGORY_COLORS = {
  coding: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  "game design": "text-pink-400 bg-pink-400/10 border-pink-400/20",
  robotics: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  vr: "text-violet-400 bg-violet-400/10 border-violet-400/20",
  business: "text-amber-400 bg-amber-400/10 border-amber-400/20",
};

const GLOW_COLORS = {
  emerald: "shadow-[0_0_20px_rgba(52,211,153,0.5)]",
  pink: "shadow-[0_0_20px_rgba(244,114,182,0.5)]",
  cyan: "shadow-[0_0_20px_rgba(34,211,238,0.5)]",
  violet: "shadow-[0_0_20px_rgba(167,139,250,0.5)]",
  amber: "shadow-[0_0_20px_rgba(251,191,36,0.5)]",
};

// --- Components ---

const Badge = ({ name, unlocked }: { name: string; unlocked: boolean }) => (
  <div className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-500 ${unlocked ? 'opacity-100 scale-100' : 'opacity-30 scale-90 grayscale'}`}>
    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${unlocked ? 'bg-gradient-to-tr from-yellow-400 to-orange-500 shadow-lg' : 'bg-gray-700'}`}>
      <Trophy size={20} className="text-white" />
    </div>
    <span className="text-xs text-center font-medium text-gray-300">{name}</span>
  </div>
);

const SkillTag = ({ skill }: { skill: string }) => (
  <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-700 text-slate-200 border border-slate-600">
    {skill}
  </span>
);

export default function RoadmapApp() {
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [user, setUser] = useState<{ level: number; xp: number; nextLevelXp: number; badges: string[]; skills: string[]; }>({
    level: 1,
    xp: 0,
    nextLevelXp: 1000,
    badges: [],
    skills: []
  });
  const [selectedProject, setSelectedProject] = useState(projects[0]);
  const [showCelebration, setShowCelebration] = useState(false);

  // --- Core Logic Functions ---

  // Calculates the completion percentage for a specific project based on its tasks
  const getProjectProgress = (project: Project) => {
    if (!project.tasks || project.tasks.length === 0) return 0;
    const completedCount = project.tasks.filter(t => t.completed).length;
    return Math.floor((completedCount / project.tasks.length) * 100);
  }

  // Handles the final project completion actions (XP, Badge, Next Project Unlock)
  const handleProjectCompletion = (project: Project) => {
    // 1. Update User Stats
    const newXp = user.xp + project.xpReward;
    let newLevel = user.level;
    let nextXp = user.nextLevelXp;

    // Simple level up logic
    if (newXp >= nextXp) {
      newLevel += 1;
      nextXp = Math.floor(nextXp * 1.5);
    }

    setUser(prevUser => ({
      ...prevUser,
      xp: newXp,
      level: newLevel,
      nextLevelXp: nextXp,
      badges: [...prevUser.badges, project.badge],
      skills: Array.from(new Set([...prevUser.skills, ...project.skills]))
    }));

    // 2. UI Effects
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3000);
  };

  // Handles the completion of a single task within a project
  const handleTaskCompletion = (projectId: number, taskId: number) => {
    // Check if the project is active before allowing task completion
    const currentProject = projects.find(p => p.id === projectId);
    if (!currentProject || currentProject.status !== 'active') return;

    let projectCompleted = false;
    let nextSelectedProject = selectedProject;

    const updatedProjects = projects.map((p, idx) => {
      if (p.id === projectId) {
        // Mark the specific task as complete
        const updatedTasks = p.tasks.map(t =>
          t.id === taskId ? { ...t, completed: true } : t
        );

        const allCompleted = updatedTasks.every(t => t.completed);

        // If all tasks are completed, mark the project as 'completed' and unlock the next one
        if (allCompleted && p.status !== 'completed') {
          projectCompleted = true;

          // Unlock the next project if it exists
          const nextProjectIndex = idx + 1;
          const unlockedProjects = projects.map((proj, projIdx) => {
            if (projIdx === nextProjectIndex) return { ...proj, status: 'active' };
            return proj;
          });

          setProjects(unlockedProjects); // Update state to unlock next project

          handleProjectCompletion({ ...p, tasks: updatedTasks }); // Grant rewards

          const nextProject = unlockedProjects.find(proj => proj.status === 'active' && proj.id !== p.id);
          if (nextProject) {
            nextSelectedProject = nextProject; // Set selection to the newly active project
          }

          return { ...p, tasks: updatedTasks, status: 'completed' };
        }

        // Update the tasks for the current project
        const updatedProject = { ...p, tasks: updatedTasks };
        nextSelectedProject = updatedProject;
        return updatedProject;
      }
      return p;
    });

    if (!projectCompleted) {
      setProjects(updatedProjects); // If not completed, just update tasks
    }

    // Update the selected project immediately to refresh the details card
    setSelectedProject(nextSelectedProject);
  };

  const getProgressWidth = () => {
    return Math.min(100, (user.xp / user.nextLevelXp) * 100);
  };

  // --- Render ---

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30">

      {/* --- Header / HUD --- */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">

          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-lg font-bold shadow-lg border-2 border-slate-800">
                {user.level}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-slate-800 rounded-full p-1">
                <Star size={12} className="text-yellow-400 fill-yellow-400" />
              </div>
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Dev Explorer</h1>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="text-cyan-400 font-mono">{user.xp} XP</span>
                <span>/</span>
                <span>{user.nextLevelXp} XP</span>
              </div>
            </div>
          </div>

          {/* XP Bar */}
          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-1000 ease-out relative"
                style={{ width: `${getProgressWidth()}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
            <div className="text-right text-[10px] text-slate-500 mt-1 uppercase tracking-wider">Next Level Progress</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs text-slate-400">Latest Badge</div>
              <div className="text-sm font-semibold text-yellow-500">
                {user.badges.length > 0 ? user.badges[user.badges.length - 1] : "No badges yet"}
              </div>
            </div>
            <Trophy className={user.badges.length > 0 ? "text-yellow-500" : "text-slate-700"} />
          </div>

        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* --- Left Col: The Roadmap --- */}
        <div className="lg:col-span-7 relative">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <TrendingUp className="text-cyan-400" />
            Project Roadmap
          </h2>

          <div className="relative pl-8 md:pl-12 py-4 space-y-12">
            {/* The Connecting Line */}
            <div className="absolute left-[47px] md:left-[63px] top-6 bottom-6 w-1 bg-slate-800 rounded-full -z-10">
              <div
                className="w-full bg-gradient-to-b from-cyan-500 to-purple-600 transition-all duration-1000"
                style={{ height: `${(projects.filter(p => p.status === 'completed').length / (projects.length - 1)) * 100}%` }}
              />
            </div>

            {projects.map((project, index) => {
              const isActive = project.status === 'active';
              const isCompleted = project.status === 'completed';
              const isLocked = project.status === 'locked';

              return (
                <div
                  key={project.id}
                  onClick={() => !isLocked && setSelectedProject(project)}
                  className={`relative group flex gap-4 cursor-pointer transition-all duration-300 ${isActive ? 'scale-105 translate-x-2' : ''} ${isLocked ? 'opacity-50 cursor-not-allowed' : 'opacity-100'}`}
                >
                  {/* Node Icon */}
                  <div
                    className={`
                      w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center border-2 z-10 transition-all duration-300 bg-slate-900
                      ${isActive ? `border-${project.color}-400 ${GLOW_COLORS[project.color as keyof typeof GLOW_COLORS]}` : ''}
                      ${isCompleted ? 'border-slate-600 text-slate-400' : ''}
                      ${isLocked ? 'border-slate-800 text-slate-700' : ''}
                    `}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={28} className="text-emerald-500" />
                    ) : isLocked ? (
                      <Lock size={24} />
                    ) : (
                      <project.icon size={28} className={`text-${project.color}-400 animate-pulse`} />
                    )}
                  </div>

                  {/* Thumbnail & Label */}
                  <div className={`flex-1 flex gap-4 items-center p-3 rounded-xl border transition-all duration-300 ${isActive ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-900/50 border-transparent hover:bg-slate-800/50'}`}>

                    {/* Tiny Thumbnail */}
                    <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0 hidden sm:block">
                      <img
                        src={project.image}
                        alt={project.title}
                        className={`w-full h-full object-cover transition-all ${isLocked ? 'grayscale opacity-50' : 'group-hover:scale-110'}`}
                        // Fallback in case image fails to load
                        onError={(e) => { (e.target as HTMLImageElement).onerror = null; (e.target as HTMLImageElement).src = "https://placehold.co/100x75/0f172a/ffffff?text=Image"; }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wider ${CATEGORY_COLORS[project.category as keyof typeof CATEGORY_COLORS] || "text-gray-400 border-gray-700"}`}>
                          {project.category}
                        </span>
                        {isActive && <span className="text-[10px] text-cyan-400 font-bold animate-pulse whitespace-nowrap">ACTIVE</span>}
                      </div>
                      <h3 className={`text-base font-bold truncate ${isLocked ? 'text-slate-600' : 'text-slate-100'}`}>
                        {project.title}
                      </h3>
                    </div>

                    {/* Chevron for active/completed */}
                    {!isLocked && (
                      <ChevronRight size={16} className={`text-slate-600 group-hover:text-white transition-colors ${isActive ? 'opacity-100' : 'opacity-0'}`} />
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </div>

        {/* --- Right Col: Detail Card --- */}
        <div className="lg:col-span-5">
          <div className="sticky top-28">
            {selectedProject ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col">

                {/* Hero Image */}
                <div className="h-48 relative overflow-hidden group">
                  <div className={`absolute inset-0 bg-${selectedProject.color}-500/20 mix-blend-overlay z-10`}></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10"></div>
                  <img
                    src={selectedProject.image}
                    alt={selectedProject.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => { (e.target as HTMLImageElement).onerror = null; (e.target as HTMLImageElement).src = "https://placehold.co/800x400/0f172a/ffffff?text=Project+Thumbnail"; }}
                  />
                  <div className="absolute bottom-4 left-6 z-20 flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-slate-900/80 backdrop-blur border border-slate-700 shadow-xl`}>
                      <selectedProject.icon size={24} className={`text-${selectedProject.color}-400`} />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 md:p-8 pt-4 relative z-20">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-2xl font-bold">{selectedProject.title}</h2>
                    <div className="text-right">
                      <div className="text-xl font-bold text-yellow-400 flex items-center justify-end gap-1">
                        <Zap size={18} fill="currentColor" /> {selectedProject.xpReward}
                      </div>
                    </div>
                  </div>

                  <p className="text-slate-400 leading-relaxed mb-6">
                    {selectedProject.description}
                  </p>

                  {/* Project Progress Bar (New Element) */}
                  {selectedProject.tasks && selectedProject.tasks.length > 0 && (
                    <div className="mb-8">
                      <h4 className="text-sm font-bold text-slate-300 mb-1 flex justify-between">
                        <span>Project Progress</span>
                        <span className="text-cyan-400">{getProjectProgress(selectedProject)}%</span>
                      </h4>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-purple-600 transition-all duration-500"
                          style={{ width: `${getProjectProgress(selectedProject)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Tasks List (New Element) */}
                  {selectedProject.tasks && selectedProject.tasks.length > 0 && (
                    <div className="mb-8 border border-slate-800 rounded-xl p-4 bg-slate-950/30">
                      <h4 className="text-xs uppercase text-slate-500 font-bold tracking-wider mb-3 flex items-center gap-1"><ListChecks size={14} /> Mission Steps</h4>
                      <ul className="space-y-3">
                        {selectedProject.tasks.map(task => (
                          <li key={task.id} className="flex items-center justify-between text-sm">
                            <div className={`flex items-start gap-3 ${task.completed ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                              {task.completed ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0" /> : <ChevronRight size={18} className="text-slate-600 shrink-0" />}
                              <div className="flex flex-col">
                                <span>{task.name}</span>
                                <span className="text-[10px] text-slate-600 uppercase font-mono mt-0.5">{task.submissionType} Required</span>
                              </div>
                            </div>

                            {!task.completed && selectedProject.status === 'active' && (
                              <button
                                onClick={() => handleTaskCompletion(selectedProject.id, task.id)}
                                className="px-3 py-1 text-xs bg-cyan-600 hover:bg-cyan-700 text-white rounded-full transition-colors shrink-0 font-semibold"
                              >
                                Submit
                              </button>
                            )}
                            {task.completed && <span className="text-xs text-emerald-500 font-bold shrink-0">DONE</span>}
                            {selectedProject.status === 'locked' && <Lock size={16} className="text-slate-700 shrink-0" />}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Skills Grid */}
                  <div className="mb-8">
                    <h4 className="text-xs uppercase text-slate-500 font-bold tracking-wider mb-3">Skills Acquired</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProject.skills.map(s => <SkillTag key={s} skill={s} />)}
                    </div>
                  </div>

                  {/* Final Status Action (Refactored) */}
                  {selectedProject.status === 'completed' && (
                    <div className="w-full py-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center gap-2 text-emerald-400 font-bold">
                      <CheckCircle2 size={20} /> Project Mission Complete!
                    </div>
                  )}
                  {selectedProject.status === 'locked' && (
                    <div className="w-full py-4 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center gap-2 text-slate-500 font-bold cursor-not-allowed">
                      <Lock size={18} /> Project Locked
                    </div>
                  )}
                  {selectedProject.status === 'active' && getProjectProgress(selectedProject) < 100 && (
                    <div className="w-full py-4 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-center justify-center gap-2 text-purple-400 font-bold">
                      <ListChecks size={18} /> Complete All Steps To Finish
                    </div>
                  )}
                </div>

                {/* Badge Preview */}
                <div className="px-6 pb-6 pt-4 border-t border-slate-800 bg-slate-950/30">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedProject.status === 'completed' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-slate-800 text-slate-600'}`}>
                      <Trophy size={16} />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest">Reward Badge</div>
                      <div className={`text-sm font-bold ${selectedProject.status === 'completed' ? 'text-yellow-400' : 'text-slate-300'}`}>
                        {selectedProject.badge}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-600 border border-dashed border-slate-800 rounded-3xl">
                Select a project to view details
              </div>
            )}
          </div>
        </div>
      </main>

      {/* --- Footer / Collection --- */}
      <footer className="max-w-5xl mx-auto px-8 pb-12 mt-12">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">Your Collection</h3>
        <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 flex flex-wrap gap-4">
          {projects.map(p => (
            <Badge key={p.id} name={p.badge} unlocked={p.status === 'completed'} />
          ))}
          {Array.from({ length: Math.max(0, 5 - projects.length) }).map((_, i) => (
            <div key={i} className="w-20 h-24 flex flex-col items-center justify-center opacity-20">
              <div className="w-12 h-12 rounded-full bg-slate-800 mb-2"></div>
              <div className="h-2 w-12 bg-slate-800 rounded"></div>
            </div>
          ))}
        </div>
      </footer>

      {/* --- Celebration Overlay --- */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="text-center transform animate-bounce">
            <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-orange-500 mb-4 drop-shadow-2xl">
              LEVEL UP!
            </h2>
            <div className="text-white text-xl">Project Completed</div>
            <div className="mt-8 flex justify-center gap-2">
              {[...Array(3)].map((_, i) => (
                <Star key={i} className="text-yellow-400 animate-spin fill-yellow-400" size={48} />
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}