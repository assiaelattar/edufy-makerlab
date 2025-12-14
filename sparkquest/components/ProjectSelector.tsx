import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { StudentProject } from '../types';
import { User as UserIcon, X, Zap } from 'lucide-react';
import { AvatarSelector } from './AvatarSelector';
import { getTheme } from '../utils/theme';

interface ProjectSelectorProps {
    studentId: string;
    onSelectProject: (projectId: string) => void;
    onLogout?: () => void;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({ studentId, onSelectProject, onLogout }) => {
    const [projects, setProjects] = useState<StudentProject[]>([]);
    const [loading, setLoading] = useState(true);

    // State for available templates
    // State for available templates
    const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);

    // Avatar State
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string>('');

    useEffect(() => {
        const fetchStudentData = async () => {
            if (!db || !studentId) return;
            try {
                // Try key lookup
                let studentRef = doc(db, 'students', studentId);
                let studentSnap = await getDoc(studentRef);

                // If not found by key, query by loginInfo.uid
                if (!studentSnap.exists()) {
                    const q = query(collection(db, 'students'), where('loginInfo.uid', '==', studentId));
                    const qSnap = await getDocs(q);
                    if (!qSnap.empty) {
                        studentSnap = qSnap.docs[0];
                    } else {
                        // Try parent login info
                        const qParent = query(collection(db, 'students'), where('parentLoginInfo.uid', '==', studentId));
                        const qParentSnap = await getDocs(qParent);
                        if (!qParentSnap.empty) studentSnap = qParentSnap.docs[0];
                    }
                }

                if (studentSnap.exists()) {
                    setAvatarUrl(studentSnap.data().avatarUrl || '');
                }
            } catch (e) {
                console.error("Error fetching student profile:", e);
            }
        };
        fetchStudentData();
    }, [studentId]);

    const handleSaveAvatar = async (url: string) => {
        if (!db || !studentId) return;
        try {
            // 1. Find the correct document ID
            let targetDocId = studentId;
            const directSnap = await getDoc(doc(db, 'students', studentId));

            if (!directSnap.exists()) {
                const q = query(collection(db, 'students'), where('loginInfo.uid', '==', studentId));
                const qSnap = await getDocs(q);
                if (!qSnap.empty) {
                    targetDocId = qSnap.docs[0].id; // Found the real ID
                } else {
                    // Try parent login potentially
                    const qParent = query(collection(db, 'students'), where('parentLoginInfo.uid', '==', studentId));
                    const qParentSnap = await getDocs(qParent);
                    if (!qParentSnap.empty) targetDocId = qParentSnap.docs[0].id;
                    else throw new Error("Student profile not found");
                }
            }

            // 2. Update the verified document
            await (await import('firebase/firestore')).updateDoc(doc(db, 'students', targetDocId), {
                avatarUrl: url
            });
            setAvatarUrl(url);
            setIsProfileOpen(false);
        } catch (e) {
            console.error("Error saving avatar:", e);
            alert("Could not save avatar. Profile not found.");
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!db) return;
            try {
                // 1. Fetch Existing Student Projects
                const qProjects = query(
                    collection(db, 'student_projects'),
                    where('studentId', '==', studentId)
                );
                const projectSnap = await getDocs(qProjects);

                const myProjects: StudentProject[] = [];
                projectSnap.docs.forEach(doc => {
                    const data = { id: doc.id, ...doc.data() } as StudentProject;
                    if (data.studentId === studentId) myProjects.push(data);
                });

                // --- DEDUPLICATION LOGIC (Existing) ---
                // 🧹 AUTO-HEALING: Detect and cleanup duplicates by TITLE
                const groupedByTitle = new Map<string, StudentProject[]>();
                myProjects.forEach(p => {
                    const title = (p.title || 'Untitled').trim();
                    if (!groupedByTitle.has(title)) {
                        groupedByTitle.set(title, []);
                    }
                    groupedByTitle.get(title)?.push(p);
                });

                const finalProjects: StudentProject[] = [];

                for (const [title, group] of groupedByTitle.entries()) {
                    if (group.length > 1) {
                        // Sort by "value" (steps completed, commits, then creation date)
                        // The "best" project comes first
                        group.sort((a, b) => {
                            const scoreA = (a.steps?.filter(s => s.status === 'done').length || 0) * 10
                                + (a.commits?.length || 0) * 5;
                            const scoreB = (b.steps?.filter(s => s.status === 'done').length || 0) * 10
                                + (b.commits?.length || 0) * 5;
                            if (scoreB !== scoreA) return scoreB - scoreA;
                            const getTime = (d: any) => {
                                if (!d) return 0;
                                if (d.seconds) return d.seconds * 1000;
                                if (d.toDate) return d.toDate().getTime();
                                if (d instanceof Date) return d.getTime();
                                return new Date(d).getTime();
                            };
                            return getTime(a.createdAt) - getTime(b.createdAt);
                        });
                        const winner = group[0];
                        finalProjects.push(winner);
                        // Cleanup losers
                        group.slice(1).forEach(async (loser) => {
                            try { await deleteDoc(doc(db, 'student_projects', loser.id)); } catch (e) { console.error(e); }
                        });
                    } else {
                        finalProjects.push(group[0]);
                    }
                }
                setProjects(finalProjects);

                // 2. Fetch Available Templates (Assigned or Featured)
                // Note: In a real app we would filter by Student Grade too
                const templatesSnap = await getDocs(collection(db, 'project_templates'));
                const templates = templatesSnap.docs
                    .map(d => ({ id: d.id, ...d.data() } as any))
                    .filter(t => (t.status === 'assigned' || t.status === 'featured') && t.status !== 'draft');

                // Filter out templates that I have already started
                const startedTemplateIds = new Set(finalProjects.map(p => p.templateId).filter(Boolean));
                const newMissions = templates.filter(t => !startedTemplateIds.has(t.id));

                setAvailableTemplates(newMissions);

            } catch (error) {
                console.error('❌ [ProjectSelector] Error fetching projects:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [studentId]);

    const handleStartMission = async (template: any) => {
        if (!confirm(`Ready to start mission: ${template.title}?`)) return;
        setLoading(true);
        try {
            let initialSteps: any[] = [];

            // 1. Fetch Default Workflow if available
            if (template.defaultWorkflowId) {
                try {
                    const workflowSnap = await getDoc(doc(db, 'process_templates', template.defaultWorkflowId));
                    if (workflowSnap.exists()) {
                        const workflowData = workflowSnap.data();
                        if (workflowData.phases && Array.isArray(workflowData.phases)) {
                            // Map Process Phases to Project Steps
                            initialSteps = workflowData.phases.map((phase: any) => ({
                                id: phase.id || Date.now().toString() + Math.random(),
                                title: phase.name,
                                status: 'todo',
                                description: phase.description || '',
                                isLocked: false
                            }));
                        }
                    }
                } catch (err) {
                    console.error("Error fetching default workflow:", err);
                }
            }

            // 2. Create new Student Project
            const newProject = {
                studentId,
                templateId: template.id,
                title: template.title,
                description: template.description || '',
                station: template.station || 'General',
                difficulty: template.difficulty || 'beginner',
                status: 'planning',
                steps: initialSteps,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Allow Firestore to generate ID
            const docRef = await (await import('firebase/firestore')).addDoc(collection(db, 'student_projects'), newProject);
            onSelectProject(docRef.id);
        } catch (e) {
            console.error("Error starting mission:", e);
            alert("Failed to start mission.");
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
                <div className="text-white text-xl font-bold">Loading your missions...</div>
            </div>
        );
    }

    if (projects.length === 0 && availableTemplates.length === 0) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-8">
                <div className="text-8xl mb-6">🚀</div>
                <h2 className="text-4xl font-black text-white mb-4">No Missions Yet</h2>
                <p className="text-blue-300 text-lg mb-8 text-center max-w-md">
                    Visit the Student Studio in your ERP to accept your first mission!
                </p>
                <a
                    href={`${window.location.protocol}//${window.location.hostname}:5174`}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors"
                >
                    Go to ERP Studio →
                </a>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-slate-900 overflow-y-auto relative selection:bg-blue-500 selection:text-white">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0a] to-black"></div>
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                <svg width="100%" height="100%">
                    <pattern id="selector-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                        <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#60a5fa" strokeWidth="0.5" />
                    </pattern>
                    <rect width="100%" height="100%" fill="url(#selector-grid)" />
                </svg>
            </div>

            {/* Ambient Glows */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
            <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none"></div>

            <div className="relative z-10 container mx-auto px-6 py-12 max-w-7xl">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-center justify-between mb-16 gap-6">
                    <div className="flex items-center gap-6">
                        {/* Avatar Display */}
                        <button
                            onClick={() => setIsProfileOpen(true)}
                            className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-slate-800 border-4 border-indigo-500/50 hover:border-indigo-400 hover:scale-105 transition-all shadow-xl overflow-hidden relative group"
                        >
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Hero" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl">😎</div>
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <span className="text-xs font-bold text-white uppercase">Edit</span>
                            </div>
                        </button>

                        <div className="text-center md:text-left">
                            <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-slate-400 tracking-tight drop-shadow-2xl">
                                MY <span className="text-blue-500">STUDIO</span>
                            </h1>
                            <p className="text-blue-400/80 font-bold text-sm tracking-[0.3em] uppercase mt-2 pl-1">Mission Control Center</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsProfileOpen(true)}
                            className="hidden md:flex items-center gap-2 px-5 py-3 bg-indigo-600/10 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white rounded-2xl text-indigo-400 font-bold transition-all"
                        >
                            <Zap size={18} fill="currentColor" />
                            <span>Customize Hero</span>
                        </button>

                        {onLogout && (
                            <button
                                onClick={onLogout}
                                className="group flex items-center gap-3 px-6 py-3 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/40 rounded-2xl text-red-400 font-bold transition-all hover:scale-105 active:scale-95"
                            >
                                <span className="group-hover:-translate-x-1 transition-transform">🚪</span>
                                <span>Log Out</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Profile Modal */}
                {isProfileOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsProfileOpen(false)}></div>
                        <div className="relative w-full max-w-2xl animate-in zoom-in-95 duration-200">
                            <button
                                onClick={() => setIsProfileOpen(false)}
                                className="absolute -top-12 right-0 text-white hover:text-red-400 transition-colors"
                            >
                                <X size={32} />
                            </button>
                            <AvatarSelector currentAvatarUrl={avatarUrl} onSelect={handleSaveAvatar} />
                        </div>
                    </div>
                )}

                {/* Projects Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Available Missions (Templates) */}
                    {availableTemplates.map(template => (
                        <button
                            key={template.id}
                            onClick={() => handleStartMission(template)}
                            className="group relative min-h-[300px] flex flex-col items-center justify-center p-8 bg-slate-800/30 backdrop-blur-sm border-2 border-dashed border-indigo-500/30 rounded-[2.5rem] hover:border-indigo-500 hover:bg-indigo-600/10 transition-all cursor-pointer"
                        >
                            <div className="absolute top-6 right-6">
                                <span className="px-3 py-1 bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">New</span>
                            </div>
                            <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-slate-600 group-hover:border-indigo-500 text-4xl text-slate-500 group-hover:text-indigo-400">
                                🚀
                            </div>
                            <h3 className="text-2xl font-black text-slate-300 group-hover:text-white transition-colors text-center">{template.title}</h3>
                            <p className="text-slate-500 text-sm font-bold mt-2 text-center max-w-[200px] line-clamp-2">{template.description}</p>
                            <div className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">
                                Start Mission
                            </div>
                        </button>
                    ))}

                    {projects.map((project, idx) => (
                        <button
                            key={project.id}
                            onClick={() => onSelectProject(project.id)}
                            className="group relative flex flex-col text-left bg-gradient-to-b from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 hover:border-blue-500/50 hover:shadow-[0_0_50px_-12px_rgba(59,130,246,0.3)] transition-all duration-300 hover:-translate-y-2 overflow-hidden"
                            style={{ animationDelay: `${idx * 100}ms` }}
                        >
                            {/* Hover Highlight */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-blue-500/0 to-blue-500/0 group-hover:to-blue-500/10 transition-all duration-500"></div>

                            {/* Status Badge */}
                            <div className="flex items-center justify-between mb-6 relative z-10">
                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${project.status === 'planning' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                    project.status === 'building' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                        project.status === 'submitted' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                            project.status === 'published' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                    }`}>
                                    {project.status || 'PLANNING'}
                                </span>
                                <div className="text-4xl filter drop-shadow-lg transform group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300">
                                    {project.station === 'robotics' ? '🤖' :
                                        project.station === 'coding' ? '💻' :
                                            project.station === 'game_design' ? '🎮' :
                                                project.station === 'multimedia' ? '🎬' :
                                                    project.station === 'branding' ? '🎨' :
                                                        project.station === 'engineering' ? '⚙️' : '🚀'}
                                </div>
                            </div>

                            {/* Project Info */}
                            <div className="flex-1 relative z-10">
                                <h3 className="text-2xl font-black text-white mb-3 leading-tight group-hover:text-blue-300 transition-colors">
                                    {project.title || 'Untitled Mission'}
                                </h3>
                                <p className="text-slate-400 text-sm font-medium line-clamp-2 leading-relaxed">
                                    {project.description || 'No briefing available.'}
                                </p>
                            </div>

                            {/* Progress Bar */}
                            <div className="mt-8 relative z-10">
                                {project.steps && project.steps.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            <span>Progress</span>
                                            <span className="text-blue-400">{Math.round((project.steps.filter(s => s.status === 'done').length / project.steps.length) * 100)}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-700/50 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${(project.steps.filter(s => s.status === 'done').length / project.steps.length) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Action Arrow */}
                            <div className="mt-6 flex justify-end relative z-10">
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-lg">
                                    <svg className="w-5 h-5 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Footer Quote */}
                <div className="text-center mt-24 opacity-30 pointer-events-none">
                    <p className="text-white font-serif italic text-lg">"The best way to predict the future is to create it."</p>
                </div>
            </div>
        </div>
    );
};
