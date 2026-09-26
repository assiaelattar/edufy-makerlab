import React, { useState, useEffect, useMemo } from 'react';
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
import { SidebarItem } from './SidebarItem';
import { Sidebar } from './Sidebar';
import { MobileNavigation } from './MobileNavigation';
import { currentAcademicYear, matchesAcademicYear, normalizeAcademicYear, previousAcademicYear, projectAcademicYear } from '../utils/academicYear';
import { createVerifiedStudentIdentity } from '../domain/studentIdentity';
import { missionIsVisibleToLearner } from '../domain/missionAssignment';
import { resolveLinkedStudentRecord } from '../services/studentIdentity';

const ProjectDetailsEnhanced = React.lazy(() => import('./ProjectDetailsEnhanced').then(module => ({ default: module.ProjectDetailsEnhanced })));

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
    const [enrollmentHistory, setEnrollmentHistory] = useState<any[]>([]);
    const [selectedArchiveYear, setSelectedArchiveYear] = useState(previousAcademicYear());

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

    const activeAcademicYear = currentAcademicYear();
    const availableArchiveYears = useMemo(() => Array.from(new Set([
        previousAcademicYear(),
        ...projects
            .map(projectAcademicYear)
            .filter(year => year !== 'Unknown year' && year !== activeAcademicYear)
    ])).sort().reverse(), [projects, activeAcademicYear]);

    useEffect(() => {
        if (availableArchiveYears.length && !availableArchiveYears.includes(selectedArchiveYear)) {
            setSelectedArchiveYear(availableArchiveYears.includes(previousAcademicYear())
                ? previousAcademicYear()
                : availableArchiveYears[0]);
        }
    }, [availableArchiveYears, selectedArchiveYear]);

    const matchesProjectFilters = (project: StudentProject) => {
        // 1. Search Filter
        const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase());

        // 2. Tab Filter
        const isCustom = project.templateId === 'free-build-template' || project.templateId === 'showcase-template';
        let matchesType = true;
        if (filterType === 'mission') matchesType = !isCustom;
        if (filterType === 'custom') matchesType = isCustom;

        return matchesSearch && matchesType;
    };

    // Current-year work is actionable. Older work is a read-only learning archive.
    const filteredProjects = projects.filter(project =>
        projectAcademicYear(project) === activeAcademicYear && matchesProjectFilters(project)
    );
    const archivedProjects = projects.filter(project =>
        projectAcademicYear(project) === selectedArchiveYear && matchesProjectFilters(project)
    );
    const selectedArchiveEnrollments = enrollmentHistory.filter(enrollment =>
        matchesAcademicYear(enrollment.session, selectedArchiveYear)
    );

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
                    setEnrollmentHistory(allEnrollmentRecords);
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

                const equals = (left: unknown, right: unknown) => String(left || '').toLowerCase().trim() === String(right || '').toLowerCase().trim();
                const includesValue = (values: unknown[] | undefined, candidates: unknown[]) =>
                    Boolean(values?.some(value => candidates.some(candidate => equals(value, candidate))));
                const shareableLegacyStatuses = new Set(['published', 'delivered', 'submitted', 'completed', 'approved', 'done']);

                const verifiedProjects = myProjects.filter(projectItem => {
                    const projectYear = projectAcademicYear(projectItem);
                    const yearEnrollments = allEnrollmentRecords.filter(enrollment => matchesAcademicYear(enrollment.session, projectYear));
                    if (!yearEnrollments.length) return false;

                    const normalizedStatus = String(projectItem.status || '').toLowerCase();
                    const hasEvidence = Boolean(projectItem.thumbnailUrl || projectItem.coverImage || projectItem.presentationUrl || projectItem.mediaUrls?.length);
                    const wasExplicitlyLinkedByAdmin = Boolean(
                        projectItem.identityLink?.linkedStudentId &&
                        targetStudentIds.includes(String(projectItem.identityLink.linkedStudentId))
                    );
                    if (wasExplicitlyLinkedByAdmin) {
                        return shareableLegacyStatuses.has(normalizedStatus) && hasEvidence;
                    }

                    const hasProjectScope = Boolean(projectItem.programId || projectItem.gradeId || projectItem.groupId);
                    if (hasProjectScope) {
                        return yearEnrollments.some(enrollment =>
                            (!projectItem.programId || equals(projectItem.programId, enrollment.programId)) &&
                            (!projectItem.gradeId || includesValue([projectItem.gradeId], [enrollment.gradeId, enrollment.gradeName])) &&
                            (!projectItem.groupId || includesValue([projectItem.groupId], [enrollment.groupId, enrollment.groupName]))
                        );
                    }

                    const template = allTemplates.find(candidate => candidate.id === projectItem.templateId);
                    if (template) {
                        const targetAudience = template.targetAudience || {};
                        if (includesValue(targetAudience.students, targetStudentIds)) return true;
                        return yearEnrollments.some(enrollment => {
                            const programRequired = Array.isArray(targetAudience.programs) && targetAudience.programs.length > 0;
                            const programMatches = !programRequired || includesValue(targetAudience.programs, [enrollment.programId, enrollment.programName]);
                            const gradeMatches = includesValue(targetAudience.grades, [enrollment.gradeId, enrollment.gradeName]);
                            const groupRequired = Array.isArray(targetAudience.groups) && targetAudience.groups.length > 0;
                            const groupMatches = !groupRequired || includesValue(targetAudience.groups, [enrollment.groupId, enrollment.groupName]);
                            return programMatches && gradeMatches && groupMatches;
                        });
                    }

                    return shareableLegacyStatuses.has(normalizedStatus) && hasEvidence;
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
            const organizationId = authProfile?.organizationId || studentProfileData?.organizationId;
            if (!organizationId) throw new Error('Your Edufy organization could not be resolved.');
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
                workflowId: template.id === 'showcase-template' ? 'showcase' : (template.id === 'free-build-template' ? 'custom-workflow' : (template.defaultWorkflowId || '')), // CRITICAL: Save workflow ID
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
        <div className={`sparkquest-dashboard flex h-screen w-full overflow-hidden relative selection:bg-cyan-400 selection:text-slate-950 transition-colors duration-700 ${activeThemeDef.font || ''}`}>

            {/* Background Effects */}
            <div className="sq-atmosphere absolute inset-0 z-0"></div>
            <div className="sq-grid absolute inset-0 z-0 pointer-events-none">
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
                <div className="sq-content container mx-auto px-5 py-7 md:px-10 md:py-10 max-w-[1800px]">

                    {/* Header */}
                    <header className="sq-hero">
                        <div className="sq-hero__copy">
                            <span className="sq-kicker">MakerLab field lab · {activeAcademicYear}</span>
                            <h2>What will you<br /><em>build next?</em></h2>
                            <p>Choose a mission, collect proof as you build, and keep every finished project in your field log.</p>
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



                    {/* CONTROL BAR: Search & Filter & START BUTTON */}
                    <div className="sq-control-deck flex flex-col md:flex-row gap-4 justify-between items-center mb-10 sticky top-3 z-40 p-3 md:p-4">
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
                                className="sq-search w-full pl-12 pr-4 py-3 text-white placeholder-slate-500 transition-all font-medium"
                            />
                        </div>

                        <div className="flex items-center gap-4">
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
                                className="hidden md:flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-xl font-black uppercase tracking-wide shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-amber-500"
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
                                className="hidden md:flex items-center gap-2 px-6 py-3 bg-purple-500 hover:bg-purple-400 text-purple-950 rounded-xl font-black uppercase tracking-wide shadow-lg shadow-purple-500/20 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-purple-500"
                            >
                                <Award size={18} fill="currentColor" />
                                <span>Showcase Project</span>
                            </button>

                            {/* Filter Tabs */}
                            <div className="sq-filter flex p-1">
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

                    {/* NEW ADVENTURES - Moved to Top */}
                    <section className="sq-missions mb-10">
                        <div className="sq-section-heading">
                            <span>Current route</span>
                            <h3>New adventures</h3>
                            <p>{activeAcademicYear} missions assigned to your class.</p>
                        </div>
                        <div className="flex overflow-x-auto pb-12 -mx-8 px-8 snap-x scroll-pl-8 gap-6 no-scrollbar mask-linear">
                            {availableTemplates.length === 0 && (
                                <div className="w-full rounded-2xl border border-dashed border-cyan-400/30 bg-cyan-400/5 p-8 text-center">
                                    <h4 className="text-lg font-black text-white">No mission assigned to this grade yet</h4>
                                    <p className="mt-2 text-sm text-slate-400">Only projects explicitly assigned to the active grade, group, or student appear here.</p>
                                </div>
                            )}
                            {availableTemplates.map((template, idx) => {
                                const isLocked = template.isLocked;
                                return (
                                    <button
                                        key={template.id}
                                        onClick={() => void openMissionBrief(template)}
                                        disabled={isLocked}
                                        className={`snap-start flex-none w-[280px] lg:w-[340px] aspect-[4/3] group relative rounded-[2rem] overflow-hidden border transition-all duration-300 text-left
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
                                                onClick={(e) => { e.stopPropagation(); void openMissionBrief(template); }}
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
                    </section>

                    {/* LEARNING ARCHIVE: previous academic years stay visible but read-only */}
                    <section className="sq-archive mb-12 p-6 md:p-9">
                        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="sq-archive__kicker">Field log · learning archive</p>
                                <h3 className="mt-2 text-3xl font-black">What you built in {selectedArchiveYear}</h3>
                                <p className="mt-2 max-w-2xl text-sm">Your previous missions stay here, even when a new adventure begins.</p>
                                {selectedArchiveEnrollments.length > 0 && (
                                    <p className="mt-3 text-xs font-bold text-amber-100/80">
                                        {Array.from(new Set(selectedArchiveEnrollments.map(enrollment => [
                                            enrollment.programName,
                                            enrollment.gradeName || enrollment.gradeId,
                                            enrollment.groupName || enrollment.groupId
                                        ].filter(Boolean).join(' · ')))).filter(Boolean).join('  |  ')}
                                    </p>
                                )}
                            </div>
                            <label className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                                School year
                                <select
                                    value={selectedArchiveYear}
                                    onChange={(event) => setSelectedArchiveYear(event.target.value)}
                                    className="sq-year-select min-h-11 rounded-xl px-4 text-sm font-bold outline-none"
                                >
                                    {availableArchiveYears.map(year => (
                                        <option key={year} value={year}>{year}{year === previousAcademicYear() ? ' · Last year' : ''}</option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        {archivedProjects.length ? (
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                {archivedProjects.map(project => {
                                    const badge = getStatusBadge(project.status, project.templateId);
                                    return (
                                        <button
                                            key={project.id}
                                            type="button"
                                            onClick={() => onPreviewProject ? onPreviewProject(project.id) : onSelectProject(project.id)}
                                            className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 text-left transition hover:-translate-y-1 hover:border-amber-300/40 hover:shadow-2xl"
                                        >
                                            <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-slate-800 to-slate-950">
                                                {project.thumbnailUrl || project.coverImage ? (
                                                    <img src={project.thumbnailUrl || project.coverImage} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center text-6xl opacity-40">{getProjectIcon(project.title)}</div>
                                                )}
                                                <span className={`absolute left-3 top-3 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${badge.color} ${badge.border}`}>{badge.label}</span>
                                            </div>
                                            <div className="p-5">
                                                <p className="text-[10px] font-black uppercase tracking-wider text-amber-300">{selectedArchiveYear} · {project.station || 'General'}</p>
                                                <h4 className="mt-2 line-clamp-2 text-lg font-black text-white group-hover:text-amber-100">{project.title}</h4>
                                                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">{project.description || 'Open this project to revisit the work and evidence.'}</p>
                                                <span className="mt-4 inline-flex text-xs font-black text-white">View project →</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/30 p-8 text-center">
                                <h4 className="text-lg font-black">Your field log is waiting to be connected</h4>
                                <p className="mt-2 text-sm">The academy can safely link your {selectedArchiveYear} projects to this verified account. No other learner’s work will appear here.</p>
                            </div>
                        )}
                    </section>

                    {/* HERO SECTION: Last Opened Mission (or First if none opened yet) */}
                    {filteredProjects.length > 0 && (() => {
                        // Get last opened project ID from localStorage
                        const lastOpenedId = localStorage.getItem('sparkquest_last_opened_mission');
                        // Find that project in filtered list, or fall back to first
                        const heroProject = filteredProjects.find(p => p.id === lastOpenedId) || filteredProjects[0];
                        const badge = getStatusBadge(heroProject.status, heroProject.templateId);
                        return (
                            <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <button
                                    onClick={() => {
                                        // Store this as last opened mission
                                        localStorage.setItem('sparkquest_last_opened_mission', heroProject.id);
                                        onSelectProject(heroProject.id);
                                    }}
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

                                        {/* PROGRESS BAR (Hero) */}
                                        <div className="w-full max-w-md mt-4">
                                            <div className="flex justify-between text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                                                <span>Progress</span>
                                                <span>{heroProject.steps?.filter(s => s.status === 'done').length || 0} / {heroProject.steps?.length || 0} Steps</span>
                                            </div>
                                            <div className="h-3 w-full bg-slate-800/50 rounded-full overflow-hidden border border-white/10 backdrop-blur-sm">
                                                <div
                                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                                                    style={{ width: `${Math.round(((heroProject.steps?.filter(s => s.status === 'done').length || 0) / (heroProject.steps?.length || 1)) * 100)}%` }}
                                                ></div>
                                            </div>
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
                                <span>Continue Building</span>
                                <span className="text-sm font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{filteredProjects.length - 1} more</span>
                            </h3>
                            <div className="flex overflow-x-auto pb-8 -mx-8 px-8 snap-x scroll-pl-8 gap-6 no-scrollbar mask-linear">
                                {filteredProjects.slice(1).filter(p => p.templateId !== 'showcase-template').map((project, idx) => {
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
                                                        <span>+{(project as any).xpReward || 50} XP</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* PROGRESS BAR (Card) */}
                                            <div className="absolute top-4 left-4 z-30 w-1/2">
                                                <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden backdrop-blur-md border border-white/10">
                                                    <div
                                                        className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                                        style={{ width: `${Math.round(((project.steps?.filter(s => s.status === 'done').length || 0) / (project.steps?.length || 1)) * 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>

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
                                                    className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity z-10"
                                                    onError={(e) => e.currentTarget.style.display = 'none'}
                                                />
                                            )}

                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent z-20"></div>
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
            <StudentPortfolio
                isOpen={isPortfolioOpen}
                onClose={() => setIsPortfolioOpen(false)}
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
            {
                namingModal.isOpen && (
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
                )
            }
        </div >
    );
};
