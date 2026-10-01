import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, deleteDoc, doc, getDoc, Timestamp, addDoc } from 'firebase/firestore';
import { ProcessTemplate, StudentProject, Station } from '../types';
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
import { SparkbookDialog } from './SparkbookDialog';
import { NameMissionDialog } from './NameMissionDialog';
import { SidebarItem } from './SidebarItem';
import { Sidebar } from './Sidebar';
import { MobileNavigation } from './MobileNavigation';
import { currentAcademicYear, matchesAcademicYear, normalizeAcademicYear, projectAcademicYear } from '../utils/academicYear';
import { createVerifiedStudentIdentity } from '../domain/studentIdentity';
import { missionIsVisibleToLearner } from '../domain/missionAssignment';
import { resolveLinkedStudentRecord } from '../services/studentIdentity';
import { buildProjectStepsFromWorkflow, createWorkflowSnapshot } from '../domain/workflowPipeline';
import { LearnerWorkbench, LearnerMissionBoard } from './LearnerWorkbench';
import { isVerifiedOwnedProject, readWorkbenchPin, rememberWorkbenchPin, workbenchStorageKey } from '../domain/learnerWorkbench';

const ProjectDetailsEnhanced = React.lazy(() => import('./ProjectDetailsEnhanced').then(module => ({ default: module.ProjectDetailsEnhanced })));

interface ProjectSelectorProps {
    studentId: string;
    onSelectProject: (projectId: string) => void;
    onPreviewProject?: (projectId: string, project?: StudentProject) => void;
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
    let authUser = null;
    try {
        const auth = useAuth();
        authProfile = auth?.userProfile;
        userProfile = auth?.userProfile;
        authUser = auth?.user;
    } catch (e) { console.log('Auth context missing'); }

    const [projects, setProjects] = useState<StudentProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [studentName, setStudentName] = useState<string>('');

    // Resolved ID state
    const [effectiveStudentId, setEffectiveStudentId] = useState<string | null>(null);
    const [verifiedStudentOwnerIds, setVerifiedStudentOwnerIds] = useState<string[]>([]);
    const [identityIssue, setIdentityIssue] = useState<string | null>(null);

    // State for available templates
    const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
    const [briefingTemplate, setBriefingTemplate] = useState<any | null>(null);
    const [briefingWorkflow, setBriefingWorkflow] = useState<ProcessTemplate | undefined>();

    // Student Profile Data (for Group/Grade visibility fallback)
    const [studentProfileData, setStudentProfileData] = useState<any>(null);
    const [assignmentContext, setAssignmentContext] = useState<{
        programId?: string;
        gradeId?: string;
        gradeName?: string;
        groupId?: string;
        groupName?: string;
    }>({});

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
    const [deleteCandidate, setDeleteCandidate] = useState<StudentProject | null>(null);
    const [deletingProject, setDeletingProject] = useState(false);
    const [deleteError, setDeleteError] = useState('');

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
                setIdentityIssue(null);
                let studentSnap = null as any;

                if (isAdminOrInstructor) {
                    const directSnapshot = await getDoc(doc(db, 'students', studentId));
                    if (directSnapshot.exists()) studentSnap = directSnapshot;
                } else if (authUser?.uid && authProfile?.organizationId) {
                    const studentRecord = await resolveLinkedStudentRecord({
                        db,
                        authUid: authUser.uid,
                        organizationId: authProfile.organizationId,
                        pointedStudentId: authProfile.studentId || studentId,
                    });
                    if (studentRecord) {
                        studentSnap = {
                            id: studentRecord.id,
                            exists: () => true,
                            data: () => studentRecord,
                        };
                    }
                }

                if (studentSnap?.exists()) {
                    const data = studentSnap.data();
                    const record = { id: studentSnap.id, ...data };
                    const ownerIds = isAdminOrInstructor
                        ? Array.from(new Set([studentSnap.id, data.loginInfo?.uid].filter(Boolean))) as string[]
                        : createVerifiedStudentIdentity({
                            authUid: authUser!.uid,
                            organizationId: authProfile!.organizationId,
                            student: record,
                        }).ownerIds;
                    setEffectiveStudentId(studentSnap.id);
                    setAvatarUrl(data.avatarUrl || '');
                    setStudentName(data.name || data.firstName || 'Maker');
                    setStudentProfileData(record);
                    setVerifiedStudentOwnerIds(ownerIds);
                } else {
                    if (!authUser?.uid || !authProfile?.organizationId) {
                        throw new Error('The learner profile could not be resolved from Edufy.');
                    }
                    const identity = createVerifiedStudentIdentity({
                        authUid: authUser.uid,
                        organizationId: authProfile.organizationId,
                    });
                    setEffectiveStudentId(identity.studentId);
                    setStudentName(authProfile?.name || authUser?.displayName || 'Maker');
                    setVerifiedStudentOwnerIds(identity.ownerIds);
                }
            } catch (e: any) {
                console.error("Error fetching student profile:", e);
                setEffectiveStudentId(null);
                setVerifiedStudentOwnerIds([]);
                setIdentityIssue(e?.message || 'The learner profile could not be verified.');
                setLoading(false);
            }
        };
        fetchStudentData();
    }, [studentId, authUser?.uid, authProfile?.organizationId, isAdminOrInstructor]);

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'mission' | 'custom'>('all');

    const activeAcademicYear = currentAcademicYear();
    const workbenchKey = workbenchStorageKey(authProfile?.organizationId, effectiveStudentId);
    const [lastOpenedId, setLastOpenedId] = useState<string | null>(null);
    useEffect(() => { setLastOpenedId(readWorkbenchPin(workbenchKey)); }, [workbenchKey]);
    const continueProject = (id: string) => {
        rememberWorkbenchPin(workbenchKey, id);
        setLastOpenedId(id);
        onSelectProject(id);
    };
    const previewProject = (id: string, record?: StudentProject) => {
        if (onPreviewProject) onPreviewProject(id, record || projects.find(project => project.id === id));
    };
    const matchesProjectFilters = (project: StudentProject) => {
        const isCustom = project.templateId === 'free-build-template' || project.templateId === 'showcase-template';
        return project.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
            (filterType === 'all' || (filterType === 'custom' ? isCustom : !isCustom));
    };
    const filteredProjects = projects.filter(matchesProjectFilters);
    const filteredTemplates = availableTemplates.filter(template => {
        const isCustom = template.id === 'free-build-template' || template.id === 'showcase-template';
        return template.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
            (filterType === 'all' || (filterType === 'custom' ? isCustom : !isCustom));
    });

    const handleSaveAvatar = async (url: string) => {
        if (!db || !effectiveStudentId) return;
        try {
            await (await import('firebase/firestore')).updateDoc(doc(db, 'students', effectiveStudentId), {
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
            const organizationId = authProfile?.organizationId || studentProfileData?.organizationId;

            // Allow fetch if we have an ID OR if we are in preview mode (detached from student ID)
            if (!targetId && !previewGradeId) return;
            if (targetId && !organizationId) {
                setIdentityIssue('The learner does not have an organization link in Edufy.');
                setLoading(false);
                return;
            }

            try {
                // 1. Fetch Existing Student Projects (Only if we have a student ID)
                const myProjects: StudentProject[] = [];
                const ownerIds = targetId
                    ? (verifiedStudentOwnerIds.length
                        ? verifiedStudentOwnerIds
                        : Array.from(new Set([
                            targetId,
                            studentProfileData?.loginInfo?.uid,
                            role === 'student' ? authUser?.uid : undefined
                        ].filter(Boolean))) as string[])
                    : [];

                // These reads do not depend on one another. Starting them as one
                // batch removes several serial network round-trips from login.
                const [projectResults, enrollmentResults, programsSnap, stationsSnap, templatesSnap] = await Promise.all([
                    Promise.allSettled(ownerIds.map(ownerId => getDocs(query(
                        collection(db, 'student_projects'),
                        where('studentId', '==', ownerId),
                        where('organizationId', '==', organizationId)
                    )))),
                    Promise.allSettled(ownerIds.map(ownerId => getDocs(query(
                        collection(db, 'enrollments'),
                        where('studentId', '==', ownerId),
                        where('organizationId', '==', organizationId)
                    )))),
                    getDocs(collection(db, 'programs')),
                    getDocs(collection(db, 'stations')),
                    getDocs(collection(db, 'project_templates')),
                ]);

                if (targetId) {
                    // Student sessions may only use the verified learner document and
                    // its linked Auth UID. A stale users/{uid}.studentId pointer must
                    // never pull another learner's projects into this dashboard.
                    projectResults.forEach(result => {
                        if (result.status !== 'fulfilled') return;
                        result.value.docs.forEach(projectDoc => {
                            const data = { id: projectDoc.id, ...projectDoc.data() } as StudentProject;
                            if (!myProjects.some(project => project.id === data.id)) myProjects.push(data);
                        });
                    });

                    if (projectResults.length > 0 && projectResults.every(result => result.status === 'rejected')) {
                        throw projectResults[0].reason;
                    }
                }

                // Never delete learner history during a read. Duplicate-looking
                // records require an explicit, audited admin merge workflow.
                // 2. Fetch Stations & Determine Future/Active
                if (!db) return;

                let gradeIds: string[] = [];
                let groupIds: string[] = [];
                let programIds: string[] = [];
                let enrollments: any[] = [];
                let allEnrollmentRecords: any[] = [];

                if (targetId) {
                    console.log(`🔍 [Enrollment] Fetching enrollments for Resolved ID: "${targetId}"`);
                    const enrollmentMap = new Map<string, any>();
                    enrollmentResults.forEach(result => {
                        if (result.status !== 'fulfilled') return;
                        result.value.docs.forEach(enrollmentDoc => enrollmentMap.set(enrollmentDoc.id, enrollmentDoc.data()));
                    });
                    allEnrollmentRecords = Array.from(enrollmentMap.values());
                    const activeEnrollmentRecords = allEnrollmentRecords.filter(enrollment =>
                        String(enrollment.status || '').toLowerCase() === 'active'
                    );
                    const calendarYear = currentAcademicYear();
                    const calendarEnrollments = activeEnrollmentRecords.filter(enrollment =>
                        matchesAcademicYear(enrollment.session, calendarYear)
                    );
                    const latestActiveEnrollment = [...activeEnrollmentRecords].sort((left, right) =>
                        String(normalizeAcademicYear(right.session) || '').localeCompare(String(normalizeAcademicYear(left.session) || ''))
                    )[0];
                    const fallbackAcademicYear = normalizeAcademicYear(latestActiveEnrollment?.session);
                    enrollments = calendarEnrollments.length
                        ? calendarEnrollments
                        : activeEnrollmentRecords.filter(enrollment =>
                            Boolean(fallbackAcademicYear) && matchesAcademicYear(enrollment.session, fallbackAcademicYear!)
                        );
                    console.log(`📚 [Enrollment] Found ${enrollments.length} enrollments across linked IDs`);
                    programIds = enrollments.flatMap(e => [e.programId, e.programName]).filter(Boolean);
                    gradeIds = enrollments.flatMap(e => [e.gradeId, e.gradeName]).filter(Boolean);
                    groupIds = enrollments.flatMap(e => [e.groupId, e.groupName]).filter(Boolean);

                    // Deduplicate
                    programIds = [...new Set(programIds)];
                    gradeIds = [...new Set(gradeIds)];
                    groupIds = [...new Set(groupIds)];
                    const primaryEnrollment = enrollments[0];
                    setAssignmentContext(primaryEnrollment ? {
                        programId: primaryEnrollment.programId,
                        gradeId: primaryEnrollment.gradeId,
                        gradeName: primaryEnrollment.gradeName,
                        groupId: primaryEnrollment.groupId,
                        groupName: primaryEnrollment.groupName
                    } : {});
                }

                console.log(`✅ [Enrollment] Extracted gradeIds:`, gradeIds);
                console.log(`✅ [Enrollment] Extracted groupIds:`, groupIds);

                // 🎭 INSTRUCTOR PREVIEW: Fetch all grades for preview dropdown
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
                const previewProgram = previewGradeId
                    ? programsSnap.docs.find(programDoc => (programDoc.data().grades || []).some((grade: any) => String(grade.id) === String(previewGradeId)))
                    : undefined;
                const effectiveProgramIds = previewProgram
                    ? [previewProgram.id, previewProgram.data().name, previewProgram.data().title].filter(Boolean).map(String)
                    : programIds.map(String);
                console.log(`🎯 [Active Grades] Using gradeIds:`, effectiveGradeIds);

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
                const allTemplates = templatesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

                const targetStudentIds = (verifiedStudentOwnerIds.length
                    ? verifiedStudentOwnerIds
                    : Array.from(new Set([
                        targetId,
                        studentProfileData?.loginInfo?.uid,
                        role === 'student' ? authUser?.uid : undefined
                    ].filter(Boolean))))
                    .map(String);

                const templates = allTemplates
                    .filter(t => {
                        // Tenant-owned templates must stay inside their organization.
                        // Legacy templates without an organization remain readable
                        // until an audited migration can classify them.
                        if (t.organizationId && t.organizationId !== organizationId) return false;
                        // Basic status check
                        if (t.status === 'draft') {
                            return false;
                        }

                        if (!missionIsVisibleToLearner(t, {
                            ownerIds: targetStudentIds,
                            programIds: effectiveProgramIds,
                            gradeIds: effectiveGradeIds.map(String),
                            // Grade preview deliberately ignores group constraints so
                            // instructors can inspect the complete grade experience.
                            groupIds: previewGradeId
                                ? (t.targetAudience?.groups || []).map(String)
                                : effectiveGroupIds.map(String),
                        })) return false;

                        // Station Logic
                        if (t.station) {
                            const type = t.station.toLowerCase();
                            if (type === 'general') {
                                return true;
                            }

                            // Find matching station (Active OR Future)
                            const matchingStation = visibleStations.find(s =>
                                s.label.toLowerCase().includes(type) || type.includes(s.label.toLowerCase())
                            );

                            if (!matchingStation) {
                                // Audience assignment is authoritative. A missing or
                                // inactive station must not silently remove a mission
                                // that an instructor explicitly dispatched.
                                return true;
                            }

                            // Attach lock info to template if future
                            if (matchingStation && matchingStation.status === 'future') {
                                t.isLocked = true;
                                t.unlockDate = matchingStation.startDate;
                            }
                            return true;
                        }

                        return true;
                    });

                // Enrollment targets NEW missions, not access to already-owned work.
                const verifiedProjects = myProjects.filter(projectItem => {
                    if (!isVerifiedOwnedProject(projectItem, organizationId, targetStudentIds)) return false;
                    if (!projectItem.identityLink) return true;
                    // Preserve the stricter explicitly-linked historical-record contract.
                    const hasEvidence = Boolean(projectItem.thumbnailUrl || projectItem.coverImage || projectItem.presentationUrl || projectItem.mediaUrls?.length);
                    return targetStudentIds.includes(String(projectItem.identityLink.linkedStudentId)) &&
                        ['published', 'delivered', 'submitted', 'completed', 'approved', 'done'].includes(String(projectItem.status).toLowerCase()) &&
                        hasEvidence && allEnrollmentRecords.some(enrollment => matchesAcademicYear(enrollment.session, projectAcademicYear(projectItem)));
                });

                setProjects(verifiedProjects);
                const startedTemplateIds = new Set(verifiedProjects
                    .filter(projectItem => projectAcademicYear(projectItem) === activeAcademicYear)
                    .map(projectItem => projectItem.templateId)
                    .filter(Boolean));
                setAvailableTemplates(templates.filter(template => !startedTemplateIds.has(template.id)));

            } catch (error) {
                console.error('❌ [ProjectSelector] Error fetching projects:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [studentId, effectiveStudentId, verifiedStudentOwnerIds, previewGradeId, studentProfileData, authUser?.uid, authProfile?.organizationId, role, activeAcademicYear]); // Refetch when ID resolves or preview changes

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
    const [creatingNamedProject, setCreatingNamedProject] = useState(false);
    const [namingError, setNamingError] = useState('');

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
            setNamingError('');
            return;
        }

        console.log("❓ [ProjectSelector] Opening Confirmation for standard project");
        setStartMissionAlert({ isOpen: true, template });
    };

    const openMissionBrief = async (template: any) => {
        if (template.isLocked) return;
        setBriefingTemplate(template);
        setBriefingWorkflow(undefined);
        if (!db || !template.defaultWorkflowId) return;
        try {
            const workflowSnap = await getDoc(doc(db, 'process_templates', template.defaultWorkflowId));
            if (workflowSnap.exists()) setBriefingWorkflow({ id: workflowSnap.id, ...workflowSnap.data() } as ProcessTemplate);
        } catch (error) {
            console.warn('[ProjectSelector] Mission workflow preview unavailable:', error);
        }
    };

    const handleDeleteProject = async () => {
        if (!deleteCandidate || deletingProject || !db) return;
        const organizationId = authProfile?.organizationId || studentProfileData?.organizationId;
        if (!isVerifiedOwnedProject(deleteCandidate, organizationId || '', verifiedStudentOwnerIds) ||
            !['free-build-template', 'showcase-template'].includes(deleteCandidate.templateId || '') ||
            projectAcademicYear(deleteCandidate) !== activeAcademicYear) { setDeleteError('Only your current-year personal projects can be deleted here.'); return; }
        setDeletingProject(true);
        setDeleteError('');
        try {
            await deleteDoc(doc(db, 'student_projects', deleteCandidate.id));
            setProjects(prev => prev.filter(p => p.id !== deleteCandidate.id));
            setDeleteCandidate(null);
            playSound('trash');
        } catch (error: any) {
            console.error("Failed to delete project:", error);
            setDeleteError('The project could not be deleted. Your saved work is unchanged. Check your connection or ask an instructor.');
        } finally { setDeletingProject(false); }
    };

    const handleCreateNamedProject = async () => {
        const { template, name } = namingModal;
        if (!template || !name.trim() || creatingNamedProject) return;
        if (!db) {
            setNamingError('Your connection is unavailable. Your name is safe here — reconnect and try again.');
            return;
        }

        setCreatingNamedProject(true);
        setNamingError('');

        try {
            const organizationId = authProfile?.organizationId || studentProfileData?.organizationId;
            if (!organizationId) throw new Error('Your Edufy organization could not be resolved.');
            // 1. Create new Student Project
            const newProject = {
                studentId: effectiveStudentId || studentId,
                organizationId,
                academicYearId: activeAcademicYear,
                ...(assignmentContext.programId ? { programId: assignmentContext.programId } : {}),
                ...(assignmentContext.gradeId ? { gradeId: assignmentContext.gradeId } : {}),
                ...(assignmentContext.groupId ? { groupId: assignmentContext.groupId } : {}),
                templateId: template.id,
                title: name.trim(),
                description: template.description || '',
                missionBrief: template.missionBrief || {},
                hook: template.hook || '',
                duration: template.duration || '',
                thumbnailUrl: template.thumbnailUrl || '',
                station: template.station || 'General',
                difficulty: template.difficulty || 'beginner',
                status: 'planning',
                reviewProtocolVersion: 1,
                workflowId: template.id === 'showcase-template' ? 'showcase' : (template.id === 'free-build-template' ? 'custom-workflow' : (template.defaultWorkflowId || '')),
                steps: [],
                resources: template.resources || [],
                stepResources: template.stepResources || {},
                createdAt: new Date(),
                updatedAt: new Date()
            };

            console.log("🚀 Creating Project:", newProject);
            const docRef = await addDoc(collection(db, 'student_projects'), newProject);
            console.log("✅ Project Created ID:", docRef.id);
            setNamingModal({ isOpen: false, template: null, name: '' });
            onSelectProject(docRef.id);

        } catch (error: any) {
            console.error("Error creating named project:", error);
            setNamingError('We could not create your mission. Your name is still here. Check your connection or ask an instructor, then try again.');
        } finally { setCreatingNamedProject(false); }
    };

    const confirmStartMission = async () => {
        const template = startMissionAlert.template;
        if (!template || !db) return;

        setStartMissionAlert({ isOpen: false, template: null }); // Close modal immediately or keep loading?

        setLoading(true);
        try {
            const organizationId = authProfile?.organizationId || studentProfileData?.organizationId;
            if (!organizationId) throw new Error('Your Edufy organization could not be resolved.');
            let initialSteps: any[] = [];
            let workflowSnapshot = template.workflowSnapshot;

            // 1. Fetch Default Workflow if available
            if (template.defaultWorkflowId) {
                try {
                    const workflowSnap = await getDoc(doc(db, 'process_templates', template.defaultWorkflowId));
                    if (workflowSnap.exists()) {
                        const workflowData = { id: workflowSnap.id, ...workflowSnap.data() } as ProcessTemplate;
                        workflowSnapshot = createWorkflowSnapshot(workflowData);
                        initialSteps = buildProjectStepsFromWorkflow(workflowSnapshot, template.stepResources || {});
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
                organizationId,
                academicYearId: activeAcademicYear,
                ...(assignmentContext.programId ? { programId: assignmentContext.programId } : {}),
                ...(assignmentContext.gradeId ? { gradeId: assignmentContext.gradeId } : {}),
                ...(assignmentContext.groupId ? { groupId: assignmentContext.groupId } : {}),
                templateId: template.id,
                title: projectTitle,
                description: template.description || '',
                missionBrief: template.missionBrief || {},
                hook: template.hook || '',
                duration: template.duration || '',
                thumbnailUrl: template.thumbnailUrl || '',
                station: template.station || 'General',
                difficulty: template.difficulty || 'beginner',
                status: 'planning',
                reviewProtocolVersion: 1,
                workflowId: template.id === 'showcase-template' ? 'showcase' : (template.id === 'free-build-template' ? 'custom-workflow' : (template.defaultWorkflowId || '')), // CRITICAL: Save workflow ID
                ...(workflowSnapshot ? { workflowSnapshot } : {}),
                steps: initialSteps,
                resources: template.resources || [],
                stepResources: template.stepResources || {},
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

    if (identityIssue) {
        return (
            <main className="sq-entry-shell">
                <section className="sq-entry-card sq-entry-card--issue">
                    <p className="sq-entry-eyebrow">Learner link</p>
                    <h1>This project bench needs an Edufy repair.</h1>
                    <p className="sq-entry-copy">{identityIssue}</p>
                    <div className="sq-entry-actions">
                        <button className="sq-entry-primary" type="button" onClick={() => window.location.reload()}>Try again</button>
                        {onLogout && <button className="sq-entry-secondary" type="button" onClick={onLogout}>Use a different account</button>}
                    </div>
                </section>
            </main>
        );
    }

    if (briefingTemplate) {
        return <React.Suspense fallback={<div className="grid min-h-screen place-items-center bg-slate-950 text-sm font-black text-white">Opening mission brief…</div>}><ProjectDetailsEnhanced project={briefingTemplate} workflow={briefingWorkflow} role="student" onBack={() => setBriefingTemplate(null)} onLaunch={() => { const template = briefingTemplate; setBriefingTemplate(null); handleStartMissionClick(template); }} /></React.Suspense>;
    }

    // Remove blocking "No Missions" screen - always show full dashboard with navigation
    // Students can access Arcade, Gallery, Portfolio, Pickup, Inventory even without missions

    return (
        <div className={`sparkquest-dashboard sq-sparkbook sq-desktop-workspace flex h-screen w-full overflow-hidden relative selection:bg-orange-300 selection:text-slate-950 transition-colors duration-700 ${activeThemeDef.font || ''}`}>

            {/* Background Effects */}
            <div className="sq-atmosphere absolute inset-0 z-0"></div>
            <div className="sq-grid absolute inset-0 z-0 pointer-events-none">
                <svg width="100%" height="100%">
                    <pattern id="selector-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                        <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#191920" strokeWidth="0.5" />
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
                onHome={() => document.getElementById('sq-workbench-home')?.scrollIntoView({ block: 'start' })}
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

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 overflow-y-auto relative z-10 scroll-smooth pb-32 md:pb-20">
                <div className="sq-content container mx-auto px-5 py-7 md:px-10 md:py-10 max-w-[1800px]">

                    {/* Header */}
                    <header id="sq-workbench-home" className="sq-dashboard-greeting">
                        <div className="sq-hero__copy">
                            <span className="sq-kicker">Your workbench · {activeAcademicYear}</span>
                            <h2>Hi, {studentName || 'Maker'}.</h2>
                            <p className={`sq-enrollment ${assignmentContext.gradeId || assignmentContext.gradeName ? 'is-ready' : 'is-waiting'}`}>
                                {assignmentContext.gradeId || assignmentContext.gradeName
                                    ? `${activeAcademicYear} · ${assignmentContext.gradeName || assignmentContext.gradeId}${assignmentContext.groupName ? ` · ${assignmentContext.groupName}` : ''}`
                                    : `No active enrollment found for ${activeAcademicYear}`}
                            </p>
                        </div>
                        {/* Preview Mode Banner */}
                        {isAdminOrInstructor && availableGrades.length > 0 && (
                            <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur px-4 py-2 rounded-full border border-yellow-500/30">
                                <span className="text-yellow-400 text-xs font-bold uppercase">Preview:</span>
                                <select value={previewGradeId || ''} onChange={(e) => setPreviewGradeId(e.target.value || null)} className="bg-transparent text-yellow-100 text-xs outline-none cursor-pointer font-bold uppercase">
                                    <option value="">🔴 Live View</option>
                                    {availableGrades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </div>
                        )}

                        {/* USER CONTROLS (Restored) */}
                        <div className="sq-profile flex items-center gap-3">
                            <button
                                onClick={() => setIsProfileOpen(true)}
                                className="flex items-center gap-3 px-4 py-2 transition-all group"
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
                                className="sq-logout p-2 text-slate-400 hover:text-red-300 rounded-full transition-colors"
                                title="Logout"
                            >
                                <LogOut size={20} />
                            </button>
                        </div>
                    </header>



                    <LearnerWorkbench projects={projects} academicYear={activeAcademicYear} lastOpenedId={lastOpenedId}
                        onContinue={continueProject} onPreview={previewProject}
                        onDelete={project => { setDeleteError(''); setDeleteCandidate(project); }}
                        onFieldLog={() => setIsPortfolioOpen(true)} />

                    {/* CONTROL BAR: Search & Filter & START BUTTON */}
                    <div className="sq-control-deck sq-dashboard-controls flex flex-col md:flex-row gap-4 justify-between items-center mb-10 sticky top-3 z-40 p-3 md:p-4">
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
                                aria-label="Find a mission"
                                className="sq-search w-full pl-12 pr-4 py-3 text-white placeholder-slate-500 transition-all font-medium"
                            />
                        </div>

                        <div className="sq-dashboard-control-actions flex items-center gap-4">
                            {/* START PROJECT BUTTON (Moved Here) */}
                            <button
                                title="Start a personal project"
                                onClick={() => handleStartMissionClick(availableTemplates.find(t => t.id === 'free-build-template') || {
                                    id: 'free-build-template',
                                    title: 'Free Build',
                                    description: 'Start a blank project.',
                                    station: 'General',
                                    status: 'assigned',
                                    isLocked: false,
                                    defaultWorkflowId: 'custom-workflow'
                                })}
                                className="sq-new-project flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-xl font-black uppercase tracking-wide shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-amber-500"
                            >
                                <Zap size={18} fill="currentColor" />
                                <span>New Project</span>
                            </button>

                            {/* Showcase Project Button */}
                            <button
                                title="Create a showcase project"
                                onClick={() => handleStartMissionClick({
                                    id: 'showcase-template',
                                    title: 'Showcase Project',
                                    description: 'Create a showcase for your project.',
                                    station: 'Showcase',
                                    status: 'assigned',
                                    isLocked: false,
                                    defaultWorkflowId: 'showcase-workflow'
                                })}
                                className="sq-showcase-project flex items-center gap-2 px-6 py-3 bg-purple-500 hover:bg-purple-400 text-purple-950 rounded-xl font-black uppercase tracking-wide shadow-lg shadow-purple-500/20 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-purple-500"
                            >
                                <Award size={18} fill="currentColor" />
                                <span>Showcase Project</span>
                            </button>

                            {/* Filter Tabs */}
                            <div className="sq-filter flex p-1">
                                <button
                                    onClick={() => setFilterType('all')}
                                    aria-pressed={filterType === 'all'}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterType === 'all' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setFilterType('mission')}
                                    aria-pressed={filterType === 'mission'}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${filterType === 'mission' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    <LayoutGrid size={14} /> Missions
                                </button>
                                <button
                                    onClick={() => setFilterType('custom')}
                                    aria-pressed={filterType === 'custom'}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${filterType === 'custom' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    <Zap size={14} /> My Projects
                                </button>
                            </div>
                        </div>
                    </div>

                    <LearnerMissionBoard projects={filteredProjects} templates={filteredTemplates} academicYear={activeAcademicYear}
                        onDiscover={template => void openMissionBrief(template)} onOpenProject={continueProject}
                        onPreview={previewProject}
                        onFieldLog={() => setIsPortfolioOpen(true)} isFiltered={Boolean(searchQuery || filterType !== 'all')} />

                    {/* Footer Quote */}
                    <div className="text-center mt-12 mb-12 opacity-20 hover:opacity-40 transition-opacity">
                        <p className="text-white font-serif italic text-lg">"The best way to predict the future is to create it."</p>
                    </div>

                </div>
            </div >

            {/* Profile Modal */}
            {
                isProfileOpen && (
                    <div className="sq-profile-overlay" role="dialog" aria-modal="true" aria-label="Maker profile">
                        <button type="button" className="sq-profile-backdrop" onClick={() => setIsProfileOpen(false)} aria-label="Close maker profile" />
                        <div className="sq-profile-dialog">
                            <button type="button" onClick={() => setIsProfileOpen(false)} className="sq-profile-close" aria-label="Close maker profile"><X size={24} /></button>
                            <AvatarSelector currentAvatarUrl={avatarUrl} onSelect={handleSaveAvatar} studentName={studentName} />
                        </div>
                    </div>
                )
            }

            {/* Other Modals */}
            <StudentPortfolio
                isOpen={isPortfolioOpen}
                sourceProjects={projects}
                onClose={() => setIsPortfolioOpen(false)}
                onSelectProject={onPreviewProject ? previewProject : undefined}
                onStartShowcase={() => {
                    const showcaseTemplate = availableTemplates.find(t => t.id === 'showcase-template') || {
                        id: 'showcase-template',
                        title: 'Showcase',
                        description: 'Upload completed work.',
                        station: 'General',
                        status: 'assigned',
                        isLocked: false,
                        defaultWorkflowId: 'showcase'
                    };
                    handleStartMissionClick(showcaseTemplate);
                }}
            />
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
            <SparkbookDialog isOpen={Boolean(deleteCandidate)} onClose={() => { if (!deletingProject) setDeleteCandidate(null); }} title="Delete this personal project?" eyebrow="Project options" tone="rose" size="sm" footer={<div className="sq-alert-actions"><button type="button" className="sq-action sq-action--quiet" disabled={deletingProject} onClick={() => setDeleteCandidate(null)}>Keep project</button><button type="button" className="sq-action sq-action--danger" disabled={deletingProject} onClick={() => void handleDeleteProject()}>{deletingProject ? 'Deleting…' : 'Delete project'}</button></div>}>
                <p>“{deleteCandidate?.title}” and its project record will be permanently removed. This cannot be undone. Uploaded files are not removed by this action.</p>
                {deleteError && <p role="alert">{deleteError}</p>}
            </SparkbookDialog>
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

            <NameMissionDialog isOpen={namingModal.isOpen} name={namingModal.name} showcase={namingModal.template?.id === 'showcase-template'} busy={creatingNamedProject} error={namingError} onChange={name => setNamingModal(previous => ({ ...previous, name }))} onClose={() => setNamingModal(previous => ({ ...previous, isOpen: false }))} onSubmit={() => void handleCreateNamedProject()} />
        </div >
    );
};
