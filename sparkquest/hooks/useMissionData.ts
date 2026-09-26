import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, setDoc, Timestamp } from 'firebase/firestore';
import { User, Assignment, StudentProject, RoadmapStep, StepStatus } from '../types';
import { createVerifiedStudentIdentity, projectBelongsToStudent } from '../domain/studentIdentity';
import { assignmentFromMission } from '../domain/missionContent';

// Helper to normalize station names to match ERP's expected keys
const normalizeStation = (stationText: string): string => {
    const text = stationText.toLowerCase();
    if (text.includes('robot') || text.includes('electronic')) return 'robotics';
    if (text.includes('cod') || text.includes('saas') || text.includes('software')) return 'coding';
    if (text.includes('game')) return 'game_design';
    if (text.includes('video') || text.includes('multim')) return 'multimedia';
    if (text.includes('design') || text.includes('brand')) return 'branding';
    if (text.includes('engineer') || text.includes('diy') || text.includes('prototype')) return 'engineering';
    return 'general'; // Fallback for unrecognized stations
};

const currentAcademicYear = () => {
    const now = new Date();
    const startYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
    return `${startYear}-${startYear + 1}`;
};

import { useAuth } from '../context/AuthContext';

export const useMissionData = () => {
    const { user, userProfile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [project, setProject] = useState<StudentProject | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(true);

    const fetchMission = async (studentId: string, projectId?: string) => {
        if (!db) return;

        // OPTIMIZATION: Cache Hit Check
        // If we already have this project loaded (and it's not a demo switch), skip the loading screen.
        if (project && projectId && project.id === projectId) {
            console.log(`⚡ [useMissionData] Cache Hit: ${projectId}. Skipping fetch.`);
            return;
        }

        setLoading(true);
        try {
            // DEMO MODE BYPASS
            if (studentId === 'demo-student-id') {
                // ... (existing demo logic - abbreviated for safety, assuming file content is preserved if I match correctly) ...
                const demoAssignment: Assignment = {
                    id: 'demo-mission-01',
                    title: 'Mars Rover Prototype',
                    description: 'Design and build a prototype rover capable of traversing the rocky terrain of Mars.',
                    station: 'Station 1: Prototyping',
                    badges: [],
                    recommendedWorkflow: 'engineering-design'
                };

                setAssignment(demoAssignment);

                setProject({
                    id: `proj_demo_${Date.now()}`,
                    title: demoAssignment.title,
                    description: demoAssignment.description,
                    station: normalizeStation(demoAssignment.station),
                    status: 'building',
                    workflowId: demoAssignment.recommendedWorkflow,
                    steps: [
                        { id: '1', title: 'Empathize', status: 'done' },
                        { id: '2', title: 'Define', status: 'done' },
                        { id: '3', title: 'Ideate', status: 'todo' },
                        { id: '4', title: 'Prototype', status: 'todo' }, // Was LOCKED, mapped to todo but can be locked by UI logic
                        { id: '5', title: 'Test', status: 'todo' }
                    ],
                    commits: [],
                    skills: [],
                    resources: []
                });
                setLoading(false);
                return;
            }

            if (!user || !userProfile?.organizationId) {
                throw new Error('Your Edufy account is not connected to an organization.');
            }

            const identity = createVerifiedStudentIdentity({
                authUid: user.uid,
                organizationId: userProfile.organizationId,
                student: studentId === user.uid ? undefined : {
                    id: studentId,
                    organizationId: userProfile.organizationId,
                    loginInfo: { uid: user.uid },
                },
            });

            // 1. Specific Project Fetch (Deep Link)
            if (projectId) {
                console.log(`[useMissionData] Attempting to fetch specific project: ${projectId}`);
                const docRef = doc(db, 'student_projects', projectId);
                const snap = await getDoc(docRef);

                if (snap.exists()) {
                    console.log(`[useMissionData] Project found!`, snap.data());
                    // 🔥 CRITICAL FIX: Add document ID to data (Firestore doesn't include it automatically)
                    const pData = { id: snap.id, ...snap.data() } as StudentProject;
                    if (!projectBelongsToStudent(pData, identity)) {
                        throw new Error('This project does not belong to the signed-in student.');
                    }
                    console.log('✅ [useMissionData] Project with ID:', pData.id);
                    // 🔥 CRITICAL FIX: Fetch Template Resources
                    let stepResources = pData.stepResources || {};
                    let globalResources: any[] = pData.resources || [];
                    let templateData: any = null;

                    if (pData.templateId) {
                        try {
                            const templateSnap = await getDoc(doc(db, 'project_templates', pData.templateId));
                            if (templateSnap.exists()) {
                                const tData = templateSnap.data();
                                templateData = tData;
                                // Merge: Template resources (base) + Project (overrides)
                                stepResources = { ...(tData.stepResources || {}), ...stepResources };

                                // Merge global resources
                                if (tData.resources) {
                                    globalResources = [...tData.resources, ...globalResources];
                                    // Deduplicate by URL
                                    const seen = new Set();
                                    globalResources = globalResources.filter(r => {
                                        const duplicate = seen.has(r.url);
                                        seen.add(r.url);
                                        return !duplicate;
                                    });
                                }

                                console.log('[useMissionData] Merged resources from template (Deep Link):', pData.templateId);
                            }
                        } catch (e) {
                            console.warn('[useMissionData] Failed to load template resources:', e);
                        }
                    }

                    // Construct minimal assignment object needed for the wizard context
                    const missionSource = templateData
                        ? { ...templateData, ...pData, missionBrief: pData.missionBrief || templateData.missionBrief }
                        : pData;
                    const derivedAssignment = {
                        ...assignmentFromMission(missionSource as StudentProject, globalResources, stepResources),
                        station: normalizeStation(pData.station),
                    };
                    setAssignment(derivedAssignment);
                    setProject(pData);
                    setLoading(false);
                    return;
                } else {
                    console.error(`[useMissionData] Project ${projectId} NOT found in DB.`);
                    setError(`Project not found (ID: ${projectId}). Check if you have permission or if the link is correct.`);
                    setLoading(false);
                    return; // Stop here, do not fallback
                }
            }

            // 2. Find Active Enrollment/Project using only verified owner IDs.
            const enrollmentSnapshots = await Promise.all(identity.ownerIds.map(ownerId => getDocs(query(
                collection(db, 'enrollments'),
                where('studentId', '==', ownerId),
                where('organizationId', '==', identity.organizationId)
            ))));
            const activeEnrollments = enrollmentSnapshots
                .flatMap(snapshot => snapshot.docs)
                .filter(enrollmentDoc => String(enrollmentDoc.data().status || '').toLowerCase() === 'active');

            if (activeEnrollments.length === 0) {
                const projectSnapshots = await Promise.all(identity.ownerIds.map(ownerId => getDocs(query(
                    collection(db, 'student_projects'),
                    where('studentId', '==', ownerId),
                    where('organizationId', '==', identity.organizationId)
                ))));
                const activeProjects = projectSnapshots
                    .flatMap(snapshot => snapshot.docs)
                    .filter(projectDoc => ['planning', 'building', 'submitted', 'changes_requested', 'published'].includes(String(projectDoc.data().status)));

                if (activeProjects.length > 0) {
                    // 🔥 CRITICAL FIX: Add document ID
                    const pData = { id: activeProjects[0].id, ...activeProjects[0].data() } as StudentProject;

                    // ... (rest of logic) ...
                    // Let's just return here to avoid touching the rest of the block in this replacement if possible, 
                    // but the block structure requires me to match the existing indentation.

                    // Since I cannot change the whole block easily without massive context, I will continue the logic path
                    // But I need to output the REST of the logic that was inside the if(!projSnap.empty) block
                    // The previous tool call output shows lines 155-204. I must include them.

                    // 🔥 CRITICAL FIX: Add document ID
                    // (Repeating logic from original file for safety in replacement)
                    // 🔥 CRITICAL FIX: Fetch Template Resources
                    let stepResources = pData.stepResources || {};
                    let globalResources: any[] = pData.resources || [];
                    let templateData: any = null;

                    if (pData.templateId) {
                        try {
                            const templateSnap = await getDoc(doc(db, 'project_templates', pData.templateId));
                            if (templateSnap.exists()) {
                                const tData = templateSnap.data();
                                templateData = tData;
                                // Merge: Template resources (base) + Project (overrides)
                                stepResources = { ...(tData.stepResources || {}), ...stepResources };

                                // Merge global resources
                                if (tData.resources) {
                                    globalResources = [...tData.resources, ...globalResources];
                                    // Deduplicate by URL
                                    const seen = new Set();
                                    globalResources = globalResources.filter(r => {
                                        const duplicate = seen.has(r.url);
                                        seen.add(r.url);
                                        return !duplicate;
                                    });
                                }
                                console.log('[useMissionData] Merged resources from template:', pData.templateId);
                            }
                        } catch (e) {
                            console.warn('[useMissionData] Failed to load template resources:', e);
                        }
                    }

                    const missionSource = templateData
                        ? { ...templateData, ...pData, missionBrief: pData.missionBrief || templateData.missionBrief }
                        : pData;
                    const derivedAssignment = {
                        ...assignmentFromMission(missionSource as StudentProject, globalResources, stepResources),
                        station: normalizeStation(pData.station),
                    };
                    setAssignment(derivedAssignment);
                    setProject(pData);
                    setLoading(false);
                    return;
                }
                throw new Error("No active enrollment or project found.");
            }

            const enrollment = activeEnrollments[0].data();
            const programId = enrollment.programId;

            // 3. Fetch Program/Mission Details
            const progDoc = await getDoc(doc(db, 'programs', programId));
            if (!progDoc.exists()) throw new Error("Program not found");

            const progData = progDoc.data();

            const mappedAssignment: Assignment = {
                id: progDoc.id,
                title: progData.name,
                description: progData.description || "Complete your training mission.",
                station: normalizeStation(progData.type || "Station 1"),
                badges: [],
                recommendedWorkflow: 'default',
            };

            const stepsData = progData.steps || [];
            const initialSteps = stepsData.length > 0 ? stepsData : [
                { id: '1', title: 'Briefing', status: 'todo' },
                { id: '2', title: 'Execution', status: 'todo' }
            ];

            setAssignment(mappedAssignment);

            // Check verified learner projects before creating. Project titles are
            // never used as identity or de-duplication evidence.
            const projectSnapshots = await Promise.all(identity.ownerIds.map(ownerId => getDocs(query(
                collection(db, 'student_projects'),
                where('studentId', '==', ownerId),
                where('organizationId', '==', identity.organizationId)
            ))));
            const existingProjectDoc = projectSnapshots
                .flatMap(snapshot => snapshot.docs)
                .find(projectDoc => projectDoc.data().templateId === programId || projectDoc.data().programId === programId);

            if (existingProjectDoc) {
                // Use existing project - 🔥 CRITICAL FIX: Add document ID
                const existingProj = { id: existingProjectDoc.id, ...existingProjectDoc.data() } as StudentProject;
                console.log('[useMissionData] Found existing project for this program:', existingProj.id);
                setProject(existingProj);
            } else {
                    // Create new project with verified student and organization IDs.
                    const newProject: StudentProject = {
                        id: `proj_${identity.studentId}_${Date.now()}`,
                        studentId: identity.studentId,
                        studentName: user?.displayName || 'Student', // ✅ CRITICAL FIX: Add studentName for Manager View
                        organizationId: identity.organizationId,
                        programId,
                        templateId: programId,
                        title: mappedAssignment.title,
                        description: mappedAssignment.description,
                        station: normalizeStation(mappedAssignment.station),
                        status: 'planning',
                        workflowId: '',
                        steps: initialSteps,
                        commits: [],
                        skills: [],
                        resources: [],
                        academicYearId: currentAcademicYear(),
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now()
                    };
                    console.log('[useMissionData] Creating new project:', newProject.id);

                    // ✅ CRITICAL FIX: Save to Firestore IMMEDIATELY to ensure persistence
                    try {
                        const projectRef = doc(db, 'student_projects', newProject.id);
                        await setDoc(projectRef, {
                            ...newProject,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        });
                        console.log('✅ [useMissionData] New project saved to Firestore:', newProject.id);
                    } catch (saveError) {
                        console.error('❌ [useMissionData] Failed to save new project:', saveError);
                        throw new Error('Failed to create project in database');
                    }

                    setProject(newProject);
            }
        } catch (err: any) {
            console.error("Error fetching mission:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Real-time sync: Subscribe to project changes
    useEffect(() => {
        if (!project?.id || !db) return;

        console.log(`🔄 [useMissionData] Setting up real-time listener for project: ${project.id}`);

        const unsubscribe = onSnapshot(
            doc(db, 'student_projects', project.id),
            (snapshot) => {
                if (snapshot.exists()) {
                    // 🔥 CRITICAL FIX: Add document ID to real-time updates
                    const serverData = { id: snapshot.id, ...snapshot.data() } as StudentProject;
                    console.log('🔄 [useMissionData] Received update from Firestore:', serverData);
                    setProject(serverData);
                    setIsConnected(true);
                } else {
                    console.warn('🔄 [useMissionData] Project document deleted');
                }
            },
            (error) => {
                console.error('🔄 [useMissionData] Firestore sync error:', error);
                setIsConnected(false);
                setError('Connection lost - changes may not be saved');
            }
        );

        return () => {
            console.log('🔄 [useMissionData] Cleaning up real-time listener');
            unsubscribe();
        };
    }, [project?.id]);

    const clearMission = () => {
        setAssignment(null);
        setProject(null);
        setError(null);
    };

    return { fetchMission, clearMission, assignment, project, loading, error, isConnected };
};
