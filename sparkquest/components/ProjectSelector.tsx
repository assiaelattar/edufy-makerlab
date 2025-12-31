import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, deleteDoc, doc, getDoc, Timestamp } from 'firebase/firestore';
import { StudentProject, Station } from '../types';
import { User as UserIcon, X, Zap, Award, Image as ImageIcon, Car, Key, LogOut, Settings, TrendingUp } from 'lucide-react';
import { AvatarSelector } from './AvatarSelector';
import { CredentialWallet } from './CredentialWallet';
import { StudentPortfolio } from './StudentPortfolio';
import { StudentGallery } from './StudentGallery';
import { PickupSchedule } from './PickupSchedule';
import { AdminSettings } from './AdminSettings';
import { ArcadeView } from './arcade/ArcadeView';
import { Gamepad2, ShoppingBag } from 'lucide-react';
import { getProjectIcon } from '../utils/MindsetLibrary';
import { ThemeProvider, useTheme, THEMES } from '../context/ThemeContext';
import { SparkStore } from './SparkStore';
import { ProductivityDashboard } from './ProductivityDashboard';
import { ModernAlert } from './ModernAlert';

interface ProjectSelectorProps {
    studentId: string;
    onSelectProject: (projectId: string) => void;
    onLogout?: () => void;
    userRole?: string;
}

// Local wrapper removed. ThemeProvider is now at App root.
export const ProjectSelector: React.FC<ProjectSelectorProps> = (props) => {
    return <ProjectSelectorContent {...props} />;
};

const ProjectSelectorContent: React.FC<ProjectSelectorProps> = ({ studentId, onSelectProject, onLogout, userRole }) => {
    const { activeTheme, coins } = useTheme();
    const activeThemeDef = THEMES.find(t => t.id === activeTheme) || THEMES[0];

    // Auth context might be missing if imported in main app
    let authProfile = null;
    try {
        const auth = useAuth();
        authProfile = auth?.userProfile;
    } catch (e) { console.log('Auth context missing'); }

    const [projects, setProjects] = useState<StudentProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [studentName, setStudentName] = useState<string>('');

    // Resolved ID state
    const [effectiveStudentId, setEffectiveStudentId] = useState<string | null>(null);

    // State for available templates
    const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);

    // Avatar State
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string>('');

    // Modal States
    const [isPortfolioOpen, setIsPortfolioOpen] = useState(false);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [isPickupOpen, setIsPickupOpen] = useState(false);
    const [isWalletOpen, setIsWalletOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const [isArcadeOpen, setIsArcadeOpen] = useState(false);
    const [isStoreOpen, setIsStoreOpen] = useState(false);
    const [isProgressOpen, setIsProgressOpen] = useState(false);

    // 🎭 INSTRUCTOR PREVIEW MODE - simulate student view for any grade
    const [previewGradeId, setPreviewGradeId] = useState<string | null>(null);
    const [availableGrades, setAvailableGrades] = useState<Array<{ id: string, name: string, programName: string }>>([]);

    // Check if user is admin or instructor
    const role = userRole || authProfile?.role;
    const isAdminOrInstructor = role === 'admin' || role === 'instructor';

    // Logout Confirmation State
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

    // Debug: Log role and desktop mode
    useEffect(() => {
        console.log('🔍 Settings Debug:', {
            userRole: role,
            isAdminOrInstructor,
            isDesktopMode: !!window.sparkquest,
            settingsVisible: isAdminOrInstructor && !!window.sparkquest
        });
        console.log('🎭 Preview Mode Debug:', {
            isAdminOrInstructor,
            availableGradesCount: availableGrades.length,
            availableGrades,
            shouldShowBanner: isAdminOrInstructor && availableGrades.length > 0
        });
    }, [role, isAdminOrInstructor, availableGrades]);

    // Helper to check if a station is future/locked
    const getStationStatus = (station: Station) => {
        const now = Date.now();
        if (station.endDate && station.endDate.toMillis() < now) return 'expired';
        if (station.startDate && station.startDate.toMillis() > now) return 'future';
        return 'active';
    };

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
                    const data = studentSnap.data();
                    setEffectiveStudentId(studentSnap.id); // ✅ RESOLVED ID
                    setAvatarUrl(data.avatarUrl || '');
                    setStudentName(data.name || data.firstName || 'Maker');
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
            // Must have DB. Must have Resolved ID (unless previewing).
            if (!db) return;
            const targetId = effectiveStudentId;

            // Allow fetch if we have an ID OR if we are in preview mode (detached from student ID)
            if (!targetId && !previewGradeId) return;

            try {
                // 1. Fetch Existing Student Projects (Only if we have a student ID)
                const myProjects: StudentProject[] = [];

                if (targetId) {
                    const qProjects = query(
                        collection(db, 'student_projects'),
                        where('studentId', '==', targetId)
                    );
                    const projectSnap = await getDocs(qProjects);

                    projectSnap.docs.forEach(doc => {
                        const data = { id: doc.id, ...doc.data() } as StudentProject;
                        if (data.studentId === targetId) myProjects.push(data);
                    });
                }

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
                            try { if (db) await deleteDoc(doc(db, 'student_projects', loser.id)); } catch (e) { console.error(e); }
                        });
                    } else {
                        finalProjects.push(group[0]);
                    }
                }
                setProjects(finalProjects);

                // 2. Fetch Stations & Determine Future/Active
                if (!db) return;

                let gradeIds: string[] = [];
                let groupIds: string[] = [];

                if (targetId) {
                    console.log(`🔍 [Enrollment] Fetching enrollments for Resolved ID: "${targetId}"`);
                    const qEnrollment = query(collection(db, 'enrollments'), where('studentId', '==', targetId), where('status', '==', 'active'));
                    const enrollmentSnap = await getDocs(qEnrollment);
                    console.log(`📚 [Enrollment] Found ${enrollmentSnap.docs.length} enrollments`);

                    const enrollments = enrollmentSnap.docs.map(d => d.data());
                    gradeIds = enrollments.map(e => e.gradeId).filter(Boolean);
                    groupIds = enrollments.map(e => e.groupId).filter(Boolean);
                }

                console.log(`✅ [Enrollment] Extracted gradeIds:`, gradeIds);
                console.log(`✅ [Enrollment] Extracted groupIds:`, groupIds);

                // 🎭 INSTRUCTOR PREVIEW: Fetch all grades for preview dropdown
                const programsSnap = await getDocs(collection(db, 'programs'));
                const allGrades: Array<{ id: string, name: string, programName: string }> = [];
                programsSnap.docs.forEach(doc => {
                    const program = doc.data();
                    if (program.grades && Array.isArray(program.grades)) {
                        program.grades.forEach((grade: any) => {
                            if (grade.id && grade.name) {
                                allGrades.push({
                                    id: grade.id,
                                    name: grade.name,
                                    programName: program.name || 'Unknown Program'
                                });
                            }
                        });
                    }
                });
                setAvailableGrades(allGrades);

                // 🎯 Use preview grade if instructor has set one, otherwise use real enrollment
                const effectiveGradeIds = previewGradeId ? [previewGradeId] : gradeIds;
                const effectiveGroupIds = previewGradeId ? [] : groupIds; // Preview mode assumes no specific group for now
                console.log(`🎯 [Active Grades] Using gradeIds:`, effectiveGradeIds);

                const stationsSnap = await getDocs(collection(db, 'stations'));

                // Helper to get status
                const getStationState = (s: Station) => {
                    const isGradeActive = s.activeForGradeIds?.some(gid => effectiveGradeIds.includes(gid));
                    if (!isGradeActive) return 'hidden'; // Not for this grade at all

                    const now = Date.now();
                    if (s.startDate && s.startDate.toMillis() > now) return 'future'; // Coming soon
                    if (s.endDate && s.endDate.toMillis() < now) return 'expired'; // Passed
                    return 'active';
                };

                const visibleStations = stationsSnap.docs
                    .map(d => ({ id: d.id, ...d.data() } as Station))
                    .map(s => ({ ...s, status: getStationState(s) }))
                    .filter(s => s.status !== 'hidden'); // Show Active AND Future (Locked)

                // 3. Fetch Available Templates
                const templatesSnap = await getDocs(collection(db, 'project_templates'));
                const templates = templatesSnap.docs
                    .map(d => ({ id: d.id, ...d.data() } as any))
                    .filter(t => {
                        console.log(`🔍 [Filter Debug] Checking template: "${t.title}" (ID: ${t.id})`);

                        // Basic status check
                        if (t.status === 'draft') {
                            console.log(`❌ [Filter Debug] Rejected "${t.title}": Status is draft`);
                            return false;
                        }
                        if (t.status !== 'assigned' && t.status !== 'featured') {
                            console.log(`❌ [Filter Debug] Rejected "${t.title}": Status ${t.status} not assigned/featured`);
                            return false;
                        }

                        // 🚨 STRICT Grade filtering
                        if (t.targetAudience?.grades && t.targetAudience.grades.length > 0) {
                            const studentHasAccess = t.targetAudience.grades.some((gradeId: any) => effectiveGradeIds.includes(gradeId));
                            if (!studentHasAccess) {
                                console.log(`❌ [Filter Debug] Rejected "${t.title}": Grade mismatch. Student Grades: ${effectiveGradeIds}, Target Grades: ${t.targetAudience.grades}`);
                                return false;
                            }
                        } else {
                            console.log(`ℹ️ [Filter Debug] "${t.title}": No specific grades targeted (Open to all?)`);
                        }

                        // 🚨 STRICT Group filtering
                        if (t.targetAudience?.groups && t.targetAudience.groups.length > 0) {
                            // If we are in PREVIEW MODE, we ignore group mismatch (act as if we are in valid group)
                            if (previewGradeId) {
                                console.log(`🎭 [Filter Debug] Instructor Preview: Bypassing group check for "${t.title}"`);
                            } else {
                                const studentHasGroupAccess = t.targetAudience.groups.some((groupId: any) => effectiveGroupIds.includes(groupId));
                                if (!studentHasGroupAccess) {
                                    console.log(`❌ [Filter Debug] Rejected "${t.title}": Group mismatch. Student Groups: ${effectiveGroupIds}, Target Groups: ${t.targetAudience.groups}`);
                                    return false;
                                }
                            }
                        }

                        // Station Logic
                        if (t.station) {
                            const type = t.station.toLowerCase();
                            if (type === 'general') {
                                console.log(`✅ [Filter Debug] Accepted "${t.title}": General station`);
                                return true;
                            }

                            // Find matching station (Active OR Future)
                            const matchingStation = visibleStations.find(s =>
                                s.label.toLowerCase().includes(type) || type.includes(s.label.toLowerCase())
                            );

                            if (!matchingStation) {
                                console.log(`⚠️ [Filter Debug] Station "${t.station}" not active/visible, but ALLOWING mission per hotfix.`);
                                // return false; // <--- DISABLED STRICT CHECK
                            }

                            // Attach lock info to template if future
                            if (matchingStation && matchingStation.status === 'future') {
                                t.isLocked = true;
                                t.unlockDate = matchingStation.startDate;
                                console.log(`🔒 [Filter Debug] Accepted "${t.title}" but LOCKED (Future Station)`);
                            } else {
                                console.log(`✅ [Filter Debug] Accepted "${t.title}": Station Active (or bypassed)`);
                            }
                            return true;
                        }

                        console.log(`✅ [Filter Debug] Accepted "${t.title}": No station constraints`);
                        return true;
                    });

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
    }, [studentId, effectiveStudentId, previewGradeId]); // Refetch when ID resolves or preview changes

    // Start Mission Alert State
    const [startMissionAlert, setStartMissionAlert] = useState<{
        isOpen: boolean;
        template: any | null;
    }>({ isOpen: false, template: null });

    const handleStartMissionClick = (template: any) => {
        if (template.isLocked) return;
        setStartMissionAlert({ isOpen: true, template });
    };

    const confirmStartMission = async () => {
        const template = startMissionAlert.template;
        if (!template || !db) return;

        setStartMissionAlert({ isOpen: false, template: null }); // Close modal immediately or keep loading?

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
                studentId: effectiveStudentId || studentId,
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

    // Remove blocking "No Missions" screen - always show full dashboard with navigation
    // Students can access Arcade, Gallery, Portfolio, Pickup, Inventory even without missions

    return (
        <div className={`min-h-screen w-full overflow-y-auto relative selection:bg-blue-500 selection:text-white pb-20 transition-colors duration-700 ${activeThemeDef.bgGradient} ${activeThemeDef.font || ''}`}>
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

                {/* 🎭 INSTRUCTOR PREVIEW MODE SELECTOR */}
                {isAdminOrInstructor && availableGrades.length > 0 && (
                    <div className="mb-6 p-4 bg-yellow-500/10 border-2 border-yellow-500/30 rounded-2xl backdrop-blur-sm">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                                    <span className="text-2xl">🎭</span>
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-yellow-400 uppercase tracking-wider">Preview Mode</h3>
                                    <p className="text-xs text-yellow-300/70">See what students from each grade see</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <select
                                    value={previewGradeId || ''}
                                    onChange={(e) => setPreviewGradeId(e.target.value || null)}
                                    className="px-4 py-2 bg-slate-900/50 border-2 border-yellow-500/30 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-yellow-400 cursor-pointer"
                                >
                                    <option value="">🔴 Live Mode (Real Data)</option>
                                    {availableGrades.map(grade => (
                                        <option key={grade.id} value={grade.id}>
                                            🎭 Preview: {grade.name} ({grade.programName})
                                        </option>
                                    ))}
                                </select>
                                {previewGradeId && (
                                    <button
                                        onClick={() => setPreviewGradeId(null)}
                                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border-2 border-red-500/50 rounded-xl text-red-300 font-bold text-sm transition-colors"
                                    >
                                        Exit Preview
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* HERO SECTION */}
                <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-8">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => setIsProfileOpen(true)}
                            className="w-24 h-24 rounded-3xl bg-slate-800 border-4 border-indigo-500/50 hover:border-indigo-400 hover:scale-105 transition-all shadow-[0_0_30px_rgba(99,102,241,0.3)] overflow-hidden relative group"
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
                        <div>
                            <h1 className="text-5xl font-black text-white tracking-tight drop-shadow-2xl uppercase">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">{studentName || 'MY'}'S</span> STUDIO
                            </h1>
                            <p className="text-blue-400 font-bold tracking-widest text-sm uppercase mt-1">Ready for the next mission, {studentName || 'Maker'}?</p>
                        </div>
                    </div>

                    {/* Quick Access or Status */}
                    {/* Settings - Only for Admin/Instructor */}
                    {/* Quick Access or Status */}
                    {/* Settings - Only for Admin/Instructor */}
                    <div className="flex gap-4">
                        <button
                            onClick={() => setIsStoreOpen(true)}
                            className="px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border border-yellow-500/30 rounded-2xl font-black flex items-center gap-2 hover:scale-105 transition-transform"
                        >
                            <ShoppingBag size={20} />
                            <span>{coins} 🪙</span>
                        </button>

                        {isAdminOrInstructor && (
                            <button
                                onClick={() => setIsSettingsOpen(true)}
                                className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700 hover:bg-slate-800 transition-colors"
                            >
                                <Settings size={20} className="text-slate-400" />
                            </button>
                        )}
                        {onLogout && (
                            <button
                                onClick={() => setIsLogoutConfirmOpen(true)}
                                className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20 hover:bg-red-500/20 text-red-500 font-bold transition-all"
                            >
                                <LogOut size={20} />
                            </button>
                        )}
                    </div>
                </div>

                {/* GAME MENU CARDS - PRIMARY NAVIGATION */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-16">
                    {/* ARCADE */}
                    <button
                        onClick={() => setIsArcadeOpen(true)}
                        className="group relative h-48 bg-gradient-to-br from-purple-900/50 to-indigo-900/50 rounded-3xl border border-purple-500/30 overflow-hidden hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-all duration-300"
                    >
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&q=80')] bg-cover bg-center opacity-30 group-hover:opacity-50 transition-opacity mix-blend-overlay"></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                        <div className="absolute bottom-6 left-6 text-left">
                            <Gamepad2 className="w-8 h-8 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                            <h3 className="text-2xl font-black text-white p-0 m-0 leading-none">ARCADE</h3>
                            <p className="text-purple-300 text-xs font-bold uppercase tracking-wider mt-1">Play & Learn</p>
                        </div>
                    </button>

                    {/* PORTFOLIO */}
                    <button
                        onClick={() => setIsPortfolioOpen(true)}
                        className="group relative h-48 bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-3xl border border-emerald-500/30 overflow-hidden hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all duration-300"
                    >
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=500&q=80')] bg-cover bg-center opacity-30 group-hover:opacity-50 transition-opacity mix-blend-overlay"></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                        <div className="absolute bottom-6 left-6 text-left">
                            <Award className="w-8 h-8 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                            <h3 className="text-2xl font-black text-white p-0 m-0 leading-none">PORTFOLIO</h3>
                            <p className="text-emerald-300 text-xs font-bold uppercase tracking-wider mt-1">Achievements</p>
                        </div>
                    </button>

                    {/* GALLERY */}
                    <button
                        onClick={() => setIsGalleryOpen(true)}
                        className="group relative h-48 bg-gradient-to-br from-pink-900/50 to-rose-900/50 rounded-3xl border border-pink-500/30 overflow-hidden hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(244,114,182,0.4)] transition-all duration-300"
                    >
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542202229-7d93c33f5d07?w=500&q=80')] bg-cover bg-center opacity-30 group-hover:opacity-50 transition-opacity mix-blend-overlay"></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                        <div className="absolute bottom-6 left-6 text-left">
                            <ImageIcon className="w-8 h-8 text-pink-400 mb-2 group-hover:scale-110 transition-transform" />
                            <h3 className="text-2xl font-black text-white p-0 m-0 leading-none">GALLERY</h3>
                            <p className="text-pink-300 text-xs font-bold uppercase tracking-wider mt-1">Your Creations</p>
                        </div>
                    </button>

                    {/* PICKUP */}
                    <button
                        onClick={() => setIsPickupOpen(true)}
                        className="group relative h-48 bg-gradient-to-br from-amber-900/50 to-orange-900/50 rounded-3xl border border-amber-500/30 overflow-hidden hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] transition-all duration-300"
                    >
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=500&q=80')] bg-cover bg-center opacity-30 group-hover:opacity-50 transition-opacity mix-blend-overlay"></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                        <div className="absolute bottom-6 left-6 text-left">
                            <Car className="w-8 h-8 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                            <h3 className="text-2xl font-black text-white p-0 m-0 leading-none">PICKUP</h3>
                            <p className="text-amber-300 text-xs font-bold uppercase tracking-wider mt-1">Schedule Ride</p>
                        </div>
                    </button>

                    {/* WALLET / INVENTORY */}
                    <button
                        onClick={() => setIsWalletOpen(true)}
                        className="group relative h-48 bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-3xl border border-cyan-500/30 overflow-hidden hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all duration-300"
                    >
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&q=80')] bg-cover bg-center opacity-30 group-hover:opacity-50 transition-opacity mix-blend-overlay"></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                        <div className="absolute bottom-6 left-6 text-left">
                            <Key className="w-8 h-8 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
                            <h3 className="text-2xl font-black text-white p-0 m-0 leading-none">INVENTORY</h3>
                            <p className="text-cyan-300 text-xs font-bold uppercase tracking-wider mt-1">Items & Keys</p>
                        </div>
                    </button>

                    {/* MY PROGRESS */}
                    <button
                        onClick={() => setIsProgressOpen(true)}
                        className="group relative h-48 bg-gradient-to-br from-violet-900/50 to-fuchsia-900/50 rounded-3xl border border-violet-500/30 overflow-hidden hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(167,139,250,0.4)] transition-all duration-300"
                    >
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500&q=80')] bg-cover bg-center opacity-30 group-hover:opacity-50 transition-opacity mix-blend-overlay"></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                        <div className="absolute bottom-6 left-6 text-left">
                            <TrendingUp className="w-8 h-8 text-violet-400 mb-2 group-hover:scale-110 transition-transform" />
                            <h3 className="text-2xl font-black text-white p-0 m-0 leading-none">MY PROGRESS</h3>
                            <p className="text-violet-300 text-xs font-bold uppercase tracking-wider mt-1">Productivity</p>
                        </div>
                    </button>
                </div>


                {/* MISSION CONTROL CENTER */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-slate-600 to-transparent opacity-50"></div>
                    <span className="text-slate-500 font-black tracking-[0.3em] uppercase text-sm">Active Missions</span>
                    <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-slate-600 to-transparent opacity-50"></div>
                </div>

                {/* Projects Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

                    {/* 1. New Missions (Available Templates) */}
                    {availableTemplates.map((template, idx) => {
                        const isRecommended = projects.length === 0 && idx === 0;

                        return (
                            <button
                                key={template.id}
                                onClick={() => handleStartMissionClick(template)}
                                disabled={template.isLocked}
                                className={`group relative min-h-[320px] flex flex-col items-center justify-center p-8 rounded-[2.5rem] border-2 transition-all duration-500
                                ${template.isLocked
                                        ? 'bg-slate-900 border-slate-700 opacity-70 cursor-not-allowed'
                                        : isRecommended
                                            ? 'bg-gradient-to-b from-indigo-900/40 to-slate-900/80 border-indigo-500 shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)] scale-[1.02]'
                                            : 'bg-slate-800/30 backdrop-blur-sm border-dashed border-indigo-500/30 hover:border-indigo-500 hover:bg-indigo-600/10 hover:scale-[1.02] cursor-pointer'
                                    }`}
                            >
                                {/* LOCKED STATE */}
                                {template.isLocked && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-20 backdrop-blur-[2px] rounded-[2.3rem]">
                                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center border-2 border-slate-600 text-slate-400 mb-4">
                                            <Key size={24} />
                                        </div>
                                        <h3 className="text-lg font-black text-white uppercase tracking-wider">Locked</h3>
                                        {template.unlockDate && (
                                            <p className="text-slate-400 text-xs font-bold mt-1">
                                                Opens on {new Date(template.unlockDate.seconds * 1000).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* RECOMMENDED BADGE */}
                                {!template.isLocked && isRecommended && (
                                    <div className="absolute -top-4 w-full flex justify-center z-20">
                                        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
                                            <Zap size={14} className="fill-white" /> Start Here
                                        </div>
                                    </div>
                                )}

                                {!template.isLocked && !isRecommended && (
                                    <div className="absolute top-6 right-6">
                                        <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase tracking-wider rounded-full">New</span>
                                    </div>
                                )}

                                <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 border-4 text-5xl transition-all duration-500 relative
                                ${template.isLocked
                                        ? 'bg-slate-800 border-slate-700 text-slate-600'
                                        : 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-indigo-500/50 text-white group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-[0_0_30px_rgba(99,102,241,0.5)]'}`}>
                                    <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    🚀
                                </div>

                                <h3 className={`text-2xl font-black text-center transition-colors mb-2 ${template.isLocked ? 'text-slate-600' : 'text-white group-hover:text-indigo-300'}`}>
                                    {template.title}
                                </h3>

                                <p className="text-slate-400 text-sm font-medium mt-0 text-center max-w-[240px] line-clamp-2 leading-relaxed">
                                    {template.description}
                                </p>

                                {!template.isLocked && (
                                    <div className={`mt-8 px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-wider transition-all transform flex items-center gap-2
                                    ${isRecommended
                                            ? 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-xl hover:shadow-indigo-500/50 scale-100'
                                            : 'bg-white/10 hover:bg-white/20 text-white translate-y-4 opacity-0 group-hover:opacity-100 group-hover:translate-y-0'
                                        }`}>
                                        Start Mission <span className="group-hover:translate-x-1 transition-transform">→</span>
                                    </div>
                                )}
                            </button>
                        );
                    })}

                    {/* 2. Active Projects */}
                    {projects.map((project, idx) => {
                        const isMostRecent = idx === 0;

                        return (
                            <button
                                key={project.id}
                                onClick={() => onSelectProject(project.id)}
                                className={`group relative flex flex-col text-left bg-gradient-to-b from-slate-800/90 to-slate-900/90 backdrop-blur-xl border rounded-[2.5rem] p-8 transition-all duration-300 overflow-hidden
                                ${isMostRecent
                                        ? 'border-blue-500 shadow-[0_0_50px_-10px_rgba(59,130,246,0.3)] scale-[1.02] ring-4 ring-blue-500/20'
                                        : 'border-white/10 hover:border-blue-500/50 hover:shadow-xl hover:-translate-y-2'
                                    }`}
                                style={{ animationDelay: `${idx * 100}ms` }}
                            >
                                {/* Hover Highlight */}
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-blue-500/0 to-blue-500/0 group-hover:to-blue-500/10 transition-all duration-500"></div>

                                {/* Status Badge */}
                                <div className="flex items-center justify-between mb-8 relative z-10 w-full">
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-2 ${project.status === 'planning' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                        project.status === 'building' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                            project.status === 'submitted' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                project.status === 'published' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                    'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                        }`}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                                        {project.status || 'PLANNING'}
                                    </span>

                                    {isMostRecent && (
                                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest animate-pulse">
                                            Continue
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-6 mb-6 z-10">
                                    <div className="text-5xl filter drop-shadow-xl transform group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
                                        {getProjectIcon(project.title)}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-white leading-tight group-hover:text-blue-300 transition-colors">
                                            {project.title}
                                        </h3>
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">
                                            {project.station} Station
                                        </p>
                                    </div>
                                </div>
                                <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    <span>Progress</span>
                                    <span>In Progress</span>
                                </div>

                                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-lg">
                                        <span className="text-xl">→</span>
                                    </div>
                                </div>
                            </button >
                        );
                    })}
                </div >

                {/* Footer Quote */}
                < div className="text-center mt-24 opacity-30 pointer-events-none" >
                    <p className="text-white font-serif italic text-lg">"The best way to predict the future is to create it."</p>
                </div >
            </div >

            {/* Profile Modal */}
            {
                isProfileOpen && (
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
                )
            }

            {/* Other Modals */}
            <StudentPortfolio isOpen={isPortfolioOpen} onClose={() => setIsPortfolioOpen(false)} />
            <StudentGallery isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} />
            <PickupSchedule isOpen={isPickupOpen} onClose={() => setIsPickupOpen(false)} />
            <CredentialWallet isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />

            <ArcadeView isOpen={isArcadeOpen} onClose={() => setIsArcadeOpen(false)} />
            <SparkStore isOpen={isStoreOpen} onClose={() => setIsStoreOpen(false)} />

            {/* Settings - Only for Admin/Instructor */}
            {
                isAdminOrInstructor && (
                    <AdminSettings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
                )
            }
            {/* MODALS & ALERTS */}
            <ModernAlert
                isOpen={startMissionAlert.isOpen}
                onClose={() => setStartMissionAlert({ isOpen: false, template: null })}
                onConfirm={confirmStartMission}
                title="Start Mission?"
                message={`Are you ready to launch "${startMissionAlert.template?.title}"? This will create a new tracking record for you.`}
                type="confirm"
                confirmLabel="Launch Mission 🚀"
            />

            <ModernAlert
                isOpen={isLogoutConfirmOpen}
                onClose={() => setIsLogoutConfirmOpen(false)}
                onConfirm={() => {
                    setIsLogoutConfirmOpen(false);
                    if (onLogout) onLogout();
                }}
                title="Leaving Studio?"
                message="Are you sure you want to sign out? Your progress is saved."
                type="confirm"
                confirmLabel="Log Out"
                cancelLabel="Stay"
            />
            {/* Productivity Dashboard */}
            <ProductivityDashboard isOpen={isProgressOpen} onClose={() => setIsProgressOpen(false)} />
        </div >
    );
};
