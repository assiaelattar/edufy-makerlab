import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, deleteDoc, doc, getDoc, Timestamp, addDoc } from 'firebase/firestore';
import { StudentProject, Station } from '../types';
import { User as UserIcon, X, Zap, Award, Image as ImageIcon, Key, LogOut, Settings, TrendingUp, Trash2, Search, Filter, LayoutGrid, List, Sparkles } from 'lucide-react';

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
import { SidebarItem } from './SidebarItem';
import { Sidebar } from './Sidebar';
import { MobileNavigation } from './MobileNavigation';

interface ProjectSelectorProps {
    studentId: string;
    onSelectProject: (projectId: string) => void;
    onPreviewProject?: (projectId: string) => void; // New prop for details view
    onLogout?: () => void;
    userRole?: string;
}

// Local wrapper removed. ThemeProvider is now at App root.
export const ProjectSelector: React.FC<ProjectSelectorProps> = (props) => {
    return <ProjectSelectorContent {...props} />;
};

const ProjectSelectorContent: React.FC<ProjectSelectorProps> = ({ studentId, onSelectProject, onPreviewProject, onLogout, userRole }) => {
    const { activeTheme, coins, playSound } = useTheme();
    const activeThemeDef = THEMES.find(t => t.id === activeTheme) || THEMES[0];

    // Auth context might be missing if imported in main app
    let authProfile = null;
    let userProfile = null;
    try {
        const auth = useAuth();
        authProfile = auth?.userProfile;
        userProfile = auth?.userProfile;
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

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'mission' | 'custom'>('all');

    // Helper: Get Status Badge
    const getStatusBadge = (status: string, templateId?: string) => {
        const isCustom = templateId === 'free-build-template' || templateId === 'showcase-template';

        // Special handling for Showcase/Free Build
        if (isCustom && status === 'PENDING_REVIEW') {
            return { label: 'Waiting Approval', color: 'bg-amber-500 text-amber-950', border: 'border-amber-500/20' };
        }

        switch (status) {
            case 'COMPLETED':
            case 'DONE':
                return { label: 'Completed', color: 'bg-emerald-500 text-emerald-950', border: 'border-emerald-500/20' };
            case 'IN_PROGRESS':
                return { label: 'In Progress', color: 'bg-blue-500 text-white', border: 'border-blue-500/20' };
            case 'PENDING_REVIEW':
                return { label: 'In Review', color: 'bg-orange-500 text-white', border: 'border-orange-500/20' };
            case 'DRAFT':
                return { label: 'Draft', color: 'bg-slate-500 text-slate-200', border: 'border-slate-500/20' };
            default:
                return { label: status, color: 'bg-slate-700 text-slate-300', border: 'border-slate-700/50' };
        }
    };

    // Filter Logic
    const filteredProjects = projects.filter(project => {
        // 1. Search Filter
        const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase());

        // 2. Tab Filter
        const isCustom = project.templateId === 'free-build-template' || project.templateId === 'showcase-template';
        let matchesType = true;
        if (filterType === 'mission') matchesType = !isCustom;
        if (filterType === 'custom') matchesType = isCustom;

        return matchesSearch && matchesType;
    });

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
                    // SIMPLIFIED: Only query by studentId (rules are permissive now)
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
                    // FIX: Robust string comparison for IDs
                    const isGradeActive = s.activeForGradeIds?.some(gid =>
                        effectiveGradeIds.map(String).includes(String(gid))
                    );
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

                        // 🚨 STRICT Grade filtering (Robust String Check)
                        if (t.targetAudience?.grades && t.targetAudience.grades.length > 0) {
                            const studentHasAccess = t.targetAudience.grades.some((gradeId: any) =>
                                effectiveGradeIds.map(String).includes(String(gradeId))
                            );
                            if (!studentHasAccess) {
                                console.log(`❌ [Filter Debug] Rejected "${t.title}": Grade mismatch. Student Grades: ${effectiveGradeIds}, Target Grades: ${t.targetAudience.grades}`);
                                return false;
                            }
                        } else {
                            console.log(`ℹ️ [Filter Debug] "${t.title}": No specific grades targeted (Open to all?)`);
                        }

                        // 🚨 STRICT Group filtering (Robust String Check)
                        if (t.targetAudience?.groups && t.targetAudience.groups.length > 0) {
                            // If we are in PREVIEW MODE, we ignore group mismatch (act as if we are in valid group)
                            if (previewGradeId) {
                                console.log(`🎭 [Filter Debug] Instructor Preview: Bypassing group check for "${t.title}"`);
                            } else {
                                const studentHasGroupAccess = t.targetAudience.groups.some((groupId: any) =>
                                    effectiveGroupIds.map(String).includes(String(groupId))
                                );
                                if (!studentHasGroupAccess) {
                                    console.log(`❌ [Filter Debug] Rejected "${t.title}": Group mismatch. Student Groups: ${effectiveGroupIds}, Target Groups: ${t.targetAudience.groups}`);
                                    return false;
                                }
                            }
                        }

                        // 🎯 STUDENT SPECIFIC TARGETING (Highest Priority)
                        if (t.targetAudience?.students && t.targetAudience.students.length > 0) {
                            // If explicit students are listed, ONLY they can see it
                            const istargeted = t.targetAudience.students.includes(studentId);
                            if (!istargeted) {
                                console.log(`❌ [Filter Debug] Rejected "${t.title}": Explicitly targeted to other students.`);
                                return false;
                            } else {
                                console.log(`🎯 [Filter Debug] MATCH "${t.title}": Explicitly targeted to this student.`);
                                return true; // Bypass other checks? No, we still want to respect status, but maybe it overrides Grade? 
                                // Taking "Limit to specific students" literally: It implies it must match student ID.
                                // It should probably STILL match Grade if we want to keep it organized, but usually specific targeting overrides weak grade matches.
                                // However, keeping Grade match ensures it appears in the right "context" (Grade view). 
                                // Let's keep strict AND logic: Must match Grade AND Student.
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

                // --- INJECT STATIC TEMPLATES (Free Build & Showcase) ---
                // We inject these AFTER filtering started IDs so they are always available (or available if not currently active?)
                // Actually, "Free Build" should always be available for multiple projects.
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

    const [namingModal, setNamingModal] = useState<{
        isOpen: boolean;
        template: any | null;
        name: string;
    }>({ isOpen: false, template: null, name: '' });

    const handleStartMissionClick = (template: any) => {
        console.log("🚀 [ProjectSelector] Clicked template:", template?.title);
        if (template.isLocked) {
            console.log("🔒 [ProjectSelector] Template is locked");
            return;
        }

        // Force Naming for Free Build & Showcase
        if (template.id === 'free-build-template' || template.id === 'showcase-template') {
            console.log("✏️ [ProjectSelector] Opening Naming Modal for custom project");
            setNamingModal({ isOpen: true, template, name: '' });
            return;
        }

        console.log("❓ [ProjectSelector] Opening Confirmation for standard project");
        setStartMissionAlert({ isOpen: true, template });
    };

    const handleDeleteProject = async (projectId: string, projectTitle: string) => {
        if (!confirm(`Are you sure you want to delete "${projectTitle}"? This cannot be undone.`)) return;

        try {
            if (!db) return;
            await deleteDoc(doc(db, 'student_projects', projectId));
            // Optimistic update
            setProjects(prev => prev.filter(p => p.id !== projectId));

            // Also update availableTemplates if it was a started mission (restore it)
            // But we fetch fresh on load, so maybe just let it be.
            playSound('trash'); // Assuming sound exists or standard generic sound
        } catch (error: any) {
            console.error("Failed to delete project:", error);
            alert(`Could not delete project: ${error.message || 'Unknown error'}`);
        }
    };

    const handleCreateNamedProject = async () => {
        const { template, name } = namingModal;
        if (!template || !name.trim()) return;
        if (!db) {
            alert("Database connection lost. Please refresh.");
            return;
        }

        setNamingModal({ isOpen: false, template: null, name: '' });
        setLoading(true);

        try {
            // 1. Create new Student Project
            const newProject = {
                studentId: effectiveStudentId || studentId,
                organizationId: authProfile?.organizationId || 'makerlab-academy',
                templateId: template.id,
                title: name.trim(),
                description: template.description || '',
                thumbnailUrl: template.thumbnailUrl || '',
                station: template.station || 'General',
                difficulty: template.difficulty || 'beginner',
                status: 'planning',
                workflowId: template.id === 'showcase-template' ? 'showcase' : (template.id === 'free-build-template' ? 'custom-workflow' : (template.defaultWorkflowId || '')),
                steps: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };

            console.log("🚀 Creating Project:", newProject);
            const docRef = await addDoc(collection(db, 'student_projects'), newProject);
            console.log("✅ Project Created ID:", docRef.id);
            onSelectProject(docRef.id);

        } catch (error: any) {
            console.error("Error creating named project:", error);
            setLoading(false);
            alert(`Failed to create project: ${error.message || 'Unknown error'}`);
        }
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

            // SPECIAL HANDLING: Unique Titles for Static Templates to prevent De-Dupe Deletion
            let projectTitle = template.title;
            if (template.id === 'free-build-template') {
                projectTitle = `Free Build #${Math.floor(Math.random() * 1000)}`;
            } else if (template.id === 'showcase-template') {
                projectTitle = `Showcase #${Math.floor(Math.random() * 1000)}`;
            }

            const newProject = {
                studentId: effectiveStudentId || studentId,
                organizationId: authProfile?.organizationId || 'makerlab-academy', // CRITICAL: Restore orgId
                templateId: template.id,
                title: projectTitle,
                description: template.description || '',
                thumbnailUrl: template.thumbnailUrl || '',
                station: template.station || 'General',
                difficulty: template.difficulty || 'beginner',
                status: 'planning',
                workflowId: template.id === 'showcase-template' ? 'showcase' : (template.id === 'free-build-template' ? 'custom-workflow' : (template.defaultWorkflowId || '')), // CRITICAL: Save workflow ID
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
        <div className={`flex h-screen w-full overflow-hidden relative selection:bg-blue-500 selection:text-white transition-colors duration-700 ${activeThemeDef.bgGradient} ${activeThemeDef.font || ''}`}>

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

            {/* SIDEBAR (Desktop) */}
            <Sidebar
                studentName={studentName}
                avatarUrl={avatarUrl}
                coins={coins}
                isAdminOrInstructor={isAdminOrInstructor}
                onEditProfile={() => setIsProfileOpen(true)}
                onOpenStore={() => setIsStoreOpen(true)}
                onOpenArcade={() => setIsArcadeOpen(true)}
                onOpenPortfolio={() => setIsPortfolioOpen(true)}
                onOpenGallery={() => setIsGalleryOpen(true)}
                onOpenPickup={() => setIsPickupOpen(true)}
                onOpenWallet={() => setIsWalletOpen(true)}
                onOpenProgress={() => setIsProgressOpen(true)}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onLogout={() => setIsLogoutConfirmOpen(true)}
            />

            {/* MOBILE NAVIGATION (Bottom Bar) */}
            <MobileNavigation
                onOpenStore={() => setIsStoreOpen(true)}
                onOpenArcade={() => setIsArcadeOpen(true)}
                onOpenPortfolio={() => setIsPortfolioOpen(true)}
                onOpenGallery={() => setIsGalleryOpen(true)}
                onOpenWallet={() => setIsWalletOpen(true)}
                onOpenProfile={() => setIsProfileOpen(true)}
            />

            {/* MODALS */}
            {console.log('🔍 [ProjectSelector] Rendering Portfolio Modal. onPreviewProject passed?', !!onPreviewProject)}
            <StudentPortfolio
                isOpen={isPortfolioOpen}
                onClose={() => setIsPortfolioOpen(false)}
                onSelectProject={(pid) => {
                    console.log('🔗 [ProjectSelector] Portfolio requested preview for:', pid);
                    if (onPreviewProject) onPreviewProject(pid);
                }}
            />

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 overflow-y-auto relative z-10 scroll-smooth pb-32 md:pb-20">
                <div className="container mx-auto px-8 py-10 max-w-[1800px]">

                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-3xl font-black text-white tracking-tight uppercase drop-shadow-lg">Mission Control</h2>
                            <p className="text-slate-400 text-sm font-medium">Select your next objective to launch.</p>
                        </div>
                        {/* Preview Mode Banner */}
                        {isAdminOrInstructor && availableGrades.length > 0 && (
                            <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur px-4 py-2 rounded-full border border-yellow-500/30">
                                <span className="text-yellow-400 text-xs font-bold uppercase">Preview:</span>
                                <select value={previewProjectId || ''} onChange={(e) => setPreviewGradeId(e.target.value || null)} className="bg-transparent text-yellow-100 text-xs outline-none cursor-pointer font-bold uppercase">
                                    <option value="">🔴 Live View</option>
                                    {availableGrades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </div>
                        )}

                        {/* USER CONTROLS (Restored) */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsProfileOpen(true)}
                                className="flex items-center gap-3 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-all border border-white/5 group"
                            >
                                <div className="w-8 h-8 rounded-full bg-indigo-500 border-2 border-white/20 overflow-hidden relative">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-xs font-bold text-white">
                                            {studentName.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <span className="text-white font-bold text-sm hidden md:block group-hover:text-indigo-200 transition-colors">
                                    {studentName}
                                </span>
                            </button>
                            <button
                                onClick={() => setIsLogoutConfirmOpen(true)}
                                className="p-2 bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-full transition-colors"
                                title="Logout"
                            >
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>

                    {/* SHOWCASE SECTION */}
                    {projects.some(p => p.templateId === 'showcase-template') && (
                        <div className="mb-12 animate-in slide-in-from-right duration-500">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-fuchsia-500 rounded-xl shadow-lg shadow-fuchsia-500/20">
                                    <ImageIcon size={20} className="text-white" />
                                </div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight">My Showcase</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {projects.filter(p => p.templateId === 'showcase-template').map(project => (
                                    <div
                                        key={project.id}
                                        onClick={() => onSelectProject(project.id)}
                                        className="group cursor-pointer relative aspect-video rounded-3xl overflow-hidden border border-white/10 hover:border-fuchsia-500/50 transition-all hover:shadow-2xl hover:shadow-fuchsia-500/10"
                                    >
                                        <img
                                            src={project.thumbnailUrl || project.coverImage || "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80"}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-6 flex flex-col justify-end">
                                            <h4 className="text-white font-bold text-lg leading-tight mb-1">{project.title}</h4>
                                            <p className="text-fuchsia-300 text-xs font-bold uppercase tracking-wider">Uploaded Project</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}





                    {/* SHOWCASE SECTION - With Integrated Upload Button */}
                    <div className="mb-12 animate-in slide-in-from-right duration-500">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-xl shadow-lg shadow-fuchsia-500/20">
                                <ImageIcon size={20} className="text-white" />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">My Showcase</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {/* 1. UPLOAD CARD (Always First) */}
                            <button
                                onClick={() => handleStartMissionClick(availableTemplates.find(t => t.id === 'showcase-template') || {
                                    id: 'showcase-template',
                                    title: 'Showcase',
                                    description: 'Upload completed work.',
                                    station: 'General',
                                    status: 'assigned',
                                    isLocked: false,
                                    defaultWorkflowId: 'showcase'
                                })}
                                className="group relative aspect-video rounded-3xl overflow-hidden border-2 border-dashed border-white/20 hover:border-fuchsia-500/50 hover:bg-white/5 transition-all duration-300 flex flex-col items-center justify-center gap-3"
                            >
                                <div className="p-4 bg-white/5 rounded-full group-hover:bg-fuchsia-500 group-hover:scale-110 transition-all duration-300">
                                    <Sparkles size={24} className="text-slate-400 group-hover:text-white" />
                                </div>
                                <div className="text-center">
                                    <span className="block text-white font-bold uppercase text-sm">Upload New</span>
                                    <span className="text-slate-500 text-xs font-medium">Showcase your work</span>
                                </div>
                            </button>

                            {/* 2. SHOWCASE PROJECTS */}
                            {projects.filter(p => p.templateId === 'showcase-template').map(project => (
                                <div
                                    key={project.id}
                                    onClick={() => onSelectProject(project.id)}
                                    className="group cursor-pointer relative aspect-video rounded-3xl overflow-hidden border border-white/10 hover:border-fuchsia-500/50 transition-all hover:shadow-2xl hover:shadow-fuchsia-500/10"
                                >
                                    <img
                                        src={project.thumbnailUrl || project.coverImage || "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80"}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-6 flex flex-col justify-end">
                                        <h4 className="text-white font-bold text-lg leading-tight mb-1 line-clamp-1">{project.title}</h4>
                                        <p className="text-fuchsia-300 text-xs font-bold uppercase tracking-wider">Uploaded Project</p>
                                    </div>

                                    {/* DELETE ACTION */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteProject(project.id, project.title);
                                        }}
                                        className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all z-20 shadow-lg"
                                        title="Delete Project"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CONTROL BAR: Search & Filter & START BUTTON */}
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-8 sticky top-0 z-40 py-4 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 -mx-8 px-8">
                        {/* Search */}
                        <div className="relative w-full md:w-80 group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                <Search size={20} />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Find a mission..."
                                className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-slate-500 transition-all font-medium"
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            {/* START PROJECT BUTTON (Moved Here) */}
                            <button
                                onClick={() => handleStartMissionClick(availableTemplates.find(t => t.id === 'free-build-template') || {
                                    id: 'free-build-template',
                                    title: 'Free Build',
                                    description: 'Start a blank project.',
                                    station: 'General',
                                    status: 'assigned',
                                    isLocked: false,
                                    defaultWorkflowId: 'custom-workflow'
                                })}
                                className="hidden md:flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-xl font-black uppercase tracking-wide shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                            >
                                <Zap size={18} fill="currentColor" />
                                <span>New Project</span>
                            </button>

                            {/* Filter Tabs */}
                            <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800">
                                <button
                                    onClick={() => setFilterType('all')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterType === 'all' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setFilterType('mission')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${filterType === 'mission' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    <LayoutGrid size={14} /> Missions
                                </button>
                                <button
                                    onClick={() => setFilterType('custom')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${filterType === 'custom' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    <Zap size={14} /> My Projects
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* HERO SECTION: Current Active Mission (First Filtered Result) */}
                    {filteredProjects.length > 0 && (() => {
                        const heroProject = filteredProjects[0];
                        const badge = getStatusBadge(heroProject.status, heroProject.templateId);
                        return (
                            <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <button
                                    onClick={() => onSelectProject(heroProject.id)}
                                    className="group relative w-full h-[55vh] min-h-[400px] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl transition-all duration-500 hover:shadow-[0_0_80px_-20px_rgba(59,130,246,0.5)] hover:border-blue-500/50 text-left"
                                >
                                    {/* INFO BUTTON (Hero) - For Details View */}
                                    <div
                                        onClick={(e) => { e.stopPropagation(); onPreviewProject?.(heroProject.id); }}
                                        className="absolute top-6 right-6 z-30 p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 flex items-center gap-2"
                                    >
                                        <span className="text-xs font-bold uppercase tracking-wider">Info</span>
                                        <Search size={20} />
                                    </div>

                                    {/* DELETE BUTTON (Hero) - Only for Custom Projects */}
                                    {(heroProject.templateId === 'free-build-template' || heroProject.templateId === 'showcase-template') && (
                                        <div
                                            onClick={(e) => { e.stopPropagation(); handleDeleteProject(heroProject.id, heroProject.title); }}
                                            className="absolute top-6 right-28 z-30 p-3 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-xl border border-red-500/30 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={20} />
                                        </div>
                                    )}
                                    {/* Hero Background */}
                                    {heroProject.thumbnailUrl ? (
                                        <div className="absolute inset-0">
                                            <img
                                                src={heroProject.thumbnailUrl}
                                                className="w-full h-full object-cover transition-transform duration-[20s] ease-linear group-hover:scale-110"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>
                                            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/40 to-transparent"></div>
                                        </div>
                                    ) : (
                                        <div className={`absolute inset-0 ${heroProject.station === 'Robotics' ? 'bg-gradient-to-br from-red-600 to-orange-900' :
                                            heroProject.station === 'Coding' ? 'bg-gradient-to-br from-blue-600 to-indigo-900' :
                                                'bg-gradient-to-br from-indigo-600 to-purple-900'
                                            }`}>
                                            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
                                        </div>
                                    )}

                                    {/* Hero Content */}
                                    <div className="absolute bottom-0 left-0 p-12 max-w-3xl z-20 flex flex-col gap-6">
                                        <div className="flex items-center gap-3">
                                            <span className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded text-[10px] font-black uppercase tracking-widest text-white shadow-lg">
                                                Active Mission
                                            </span>
                                            <span className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest shadow-lg animate-pulse ${badge.color} border ${badge.border}`}>
                                                {badge.label}
                                            </span>
                                        </div>

                                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[0.9] drop-shadow-2xl tracking-tight">
                                            {heroProject.title}
                                        </h1>

                                        <div className="flex items-center gap-4 mt-2">
                                            <p className="text-slate-300 font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                                {heroProject.station} Station
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-4 mt-4 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 delay-100">
                                            <div className="px-8 py-4 bg-white text-slate-950 rounded-xl font-black uppercase tracking-widest hover:bg-blue-50 transition-colors flex items-center gap-3 text-sm shadow-xl shadow-white/10">
                                                <Zap className="fill-slate-950" size={18} /> Continue Mission
                                            </div>
                                        </div>
                                    </div>

                                    {/* Icon Overlay if no thumbnail */}
                                    {!heroProject.thumbnailUrl && (
                                        <div className="absolute right-12 bottom-12 opacity-20 text-[12rem] text-white rotate-12 transform group-hover:scale-110 transition-transform duration-700">
                                            {getProjectIcon(heroProject.title)}
                                        </div>
                                    )}
                                </button>
                            </div>
                        );
                    })()}


                    {/* SLIDER 1: Continue Watching (Other Active Projects) */}
                    {filteredProjects.length > 1 && (
                        <div className="mb-12">
                            <h3 className="text-xl font-black text-white mb-6 px-2 flex items-center gap-3">
                                <span>Continue Playing</span>
                                <span className="text-sm font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{filteredProjects.length - 1} more</span>
                            </h3>
                            <div className="flex overflow-x-auto pb-8 -mx-8 px-8 snap-x scroll-pl-8 gap-6 no-scrollbar mask-linear">
                                {filteredProjects.slice(1).map((project, idx) => {
                                    const badge = getStatusBadge(project.status, project.templateId);
                                    return (
                                        <button
                                            key={project.id}
                                            onClick={() => onSelectProject(project.id)}
                                            className="snap-start flex-none w-[320px] aspect-[4/3] group relative rounded-3xl overflow-hidden border border-white/10 bg-slate-900 shadow-lg hover:scale-105 hover:z-10 hover:shadow-2xl transition-all duration-300"
                                        >
                                            {/* XP CELEBRATION BADGE */}
                                            {project.status === 'published' && (
                                                <div className="absolute top-3 right-3 z-30 animate-bounce">
                                                    <div className="bg-yellow-400 text-yellow-950 px-2.5 py-1 rounded-full font-black text-[10px] uppercase shadow-[0_0_15px_rgba(250,204,21,0.6)] border-2 border-yellow-200 transform rotate-3 flex items-center gap-1">
                                                        <Sparkles size={12} />
                                                        <span>+{project.xpReward || 50} XP</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Fallback Gradient (Always Rendered) */}
                                            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 group-hover:from-indigo-900 group-hover:to-slate-900 transition-colors">
                                                <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-30 group-hover:scale-110 transition-transform">
                                                    {getProjectIcon(project.title)}
                                                </div>
                                            </div>

                                            {/* Image Overlay */}
                                            {project.thumbnailUrl && (
                                                <img
                                                    src={project.thumbnailUrl}
                                                    className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity z-10"
                                                    onError={(e) => e.currentTarget.style.display = 'none'}
                                                />
                                            )}

                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent z-20"></div>
                                            <div className="absolute bottom-0 left-0 p-6 w-full text-left">
                                                <div className="mb-2 flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${badge.color.split(' ')[0].replace('bg-', 'bg-')}`}></span>
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${badge.color.split(' ')[1]}`}>{badge.label}</span>
                                                    </div>

                                                    {/* INFO BUTTON (Grid) */}
                                                    <div
                                                        onClick={(e) => { e.stopPropagation(); onPreviewProject?.(project.id); }}
                                                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100 border border-slate-700 hover:border-slate-500"
                                                    >
                                                        <Search size={14} />
                                                    </div>

                                                    {/* DELETE BUTTON (Grid) - Only for Custom Projects */}
                                                    {(project.templateId === 'free-build-template' || project.templateId === 'showcase-template') && (
                                                        <div
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id, project.title); }}
                                                            className="p-1.5 hover:bg-red-500/20 text-red-400/50 hover:text-red-400 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Trash2 size={14} />
                                                        </div>
                                                    )}
                                                </div>
                                                <h4 className="text-lg font-black text-white leading-tight line-clamp-2 group-hover:text-blue-200 transition-colors">{project.title}</h4>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}


                    {/* SLIDER 2: New Adventures (Templates) */}
                    <div className="mb-8">
                        <h3 className="text-xl font-black text-white mb-6 px-2">New Adventures</h3>
                        <div className="flex overflow-x-auto pb-12 -mx-8 px-8 snap-x scroll-pl-8 gap-6 no-scrollbar mask-linear">
                            {availableTemplates.map((template, idx) => {
                                const isLocked = template.isLocked;
                                return (
                                    <button
                                        key={template.id}
                                        onClick={() => handleStartMissionClick(template)}
                                        disabled={isLocked}
                                        className={`snap-start flex-none w-[280px] lg:w-[340px] aspect-[3/4] group relative rounded-[2rem] overflow-hidden border transition-all duration-300 text-left
                                        ${isLocked
                                                ? 'bg-slate-900/50 border-slate-800 opacity-60 grayscale'
                                                : 'bg-slate-900/40 border-white/10 hover:border-indigo-500/50 hover:shadow-[0_0_40px_-10px_rgba(99,102,241,0.4)] hover:-translate-y-2'
                                            }`}
                                    >
                                        {/* Thumbnail / Gradient */}
                                        {/* Fallback Gradient (Always Rendered) */}
                                        <div className={`absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity ${template.station === 'Robotics' ? 'bg-gradient-to-br from-red-600 to-amber-700' :
                                            template.station === 'Coding' ? 'bg-gradient-to-br from-blue-600 to-cyan-700' :
                                                'bg-gradient-to-br from-purple-600 to-pink-700'
                                            }`}></div>

                                        {/* Image Overlay */}
                                        {template.thumbnailUrl && (
                                            <div className="absolute inset-0 z-10">
                                                <img
                                                    src={template.thumbnailUrl}
                                                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
                                                    onError={(e) => e.currentTarget.style.display = 'none'}
                                                />
                                            </div>
                                        )}

                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>

                                        {/* Lock Overlay */}
                                        {isLocked && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-20">
                                                <div className="bg-slate-900/90 p-4 rounded-full border border-white/10 shadow-xl">
                                                    <Key className="text-slate-400" size={24} />
                                                </div>
                                            </div>
                                        )}

                                        {/* "New" Badge & Info Button */}
                                        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                                            {/* Info Button */}
                                            <div
                                                onClick={(e) => { e.stopPropagation(); onPreviewProject?.(template.id); }}
                                                className="p-2 bg-slate-900/50 hover:bg-slate-900 text-white rounded-full border border-white/10 backdrop-blur-sm transition-all shadow-lg hover:scale-110"
                                            >
                                                <Search size={16} />
                                            </div>

                                            {!isLocked && !template.thumbnailUrl && (
                                                <div className="">
                                                    <span className="px-3 py-1.5 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">New</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="absolute bottom-0 left-0 p-8 w-full">
                                            {!template.thumbnailUrl && (
                                                <div className="text-4xl mb-4 text-white/50 group-hover:text-white transition-colors group-hover:scale-110 origin-left duration-300">
                                                    {getProjectIcon(template.title)}
                                                </div>
                                            )}
                                            <h4 className="text-2xl font-black text-white leading-tight mb-2 group-hover:text-indigo-200 transition-colors">{template.title}</h4>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 line-clamp-1">{template.station || 'General'} Station</p>

                                            {!isLocked && (
                                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-400 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                                                    Start Mission <span className="text-lg">→</span>
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer Quote */}
                    <div className="text-center mt-12 mb-12 opacity-20 hover:opacity-40 transition-opacity">
                        <p className="text-white font-serif italic text-lg">"The best way to predict the future is to create it."</p>
                    </div>

                </div>
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

            {/* NAMING MODAL */}
            {namingModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                        onClick={() => setNamingModal({ ...namingModal, isOpen: false })}
                    />

                    {/* Modal Content */}
                    <div
                        className="relative w-full max-w-lg bg-slate-900 rounded-3xl border border-slate-700 shadow-2xl p-8 overflow-hidden border-t-4 border-t-white/20"
                    >
                        <div className="absolute inset-0 z-0 bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none"></div>

                        <h3 className="text-3xl font-black text-white mb-2 relative z-10">Name Your Mission</h3>
                        <p className="text-slate-400 mb-8 relative z-10 font-bold">Give a cool name to your {namingModal.template?.title} project.</p>

                        <input
                            autoFocus
                            value={namingModal.name}
                            onChange={(e) => setNamingModal({ ...namingModal, name: e.target.value })}
                            placeholder="e.g. The Moon Base Alpha..."
                            className="w-full bg-slate-800 border-2 border-slate-700 text-white font-bold text-xl p-5 rounded-2xl mb-8 focus:border-blue-500 focus:outline-none placeholder:text-slate-600 relative z-10 shadow-inner"
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateNamedProject()}
                        />

                        <div className="flex gap-4 relative z-10">
                            <button
                                onClick={() => setNamingModal({ ...namingModal, isOpen: false })}
                                className="flex-1 py-4 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateNamedProject}
                                disabled={!namingModal.name.trim()}
                                className="flex-1 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20 active:translate-y-1"
                            >
                                🚀 Launch
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};
