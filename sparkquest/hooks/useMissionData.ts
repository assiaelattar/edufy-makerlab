import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, setDoc } from 'firebase/firestore';
import { User, Assignment, StudentProject, RoadmapStep, StepStatus } from '../types';

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

            // 1. Specific Project Fetch (Deep Link)
            if (projectId) {
                console.log(`[useMissionData] Attempting to fetch specific project: ${projectId}`);
                const docRef = doc(db, 'student_projects', projectId);
                const snap = await getDoc(docRef);

                if (snap.exists()) {
                    console.log(`[useMissionData] Project found!`, snap.data());
                    // 🔥 CRITICAL FIX: Add document ID to data (Firestore doesn't include it automatically)
                    const pData = { id: snap.id, ...snap.data() } as StudentProject;
                    console.log('✅ [useMissionData] Project with ID:', pData.id);
                    // Ensure studentId is set (for older projects that might not have it)
                    if (!pData.studentId) {
                        pData.studentId = studentId;
                    }
                    // Construct minimal assignment object needed for the wizard context
                    const derivedAssignment: Assignment = {
                        id: pData.templateId || 'custom-mission',
                        title: pData.title,
                        description: pData.description,
                        station: normalizeStation(pData.station),
                        badges: [],
                        recommendedWorkflow: pData.workflowId || 'default',
                        stepResources: pData.stepResources || {}
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

            // 2. Find Active Enrollment/Project for Student (Default)
            // QUERY: Get latest active enrollment
            const q = query(collection(db, 'enrollments'), where('studentId', '==', studentId), where('status', '==', 'active'));
            const snap = await getDocs(q);

            if (snap.empty) {
                // Check for ANY active project (planning or building)
                const projQ = query(collection(db, 'student_projects'), where('studentId', '==', studentId), where('status', 'in', ['planning', 'building', 'submitted', 'changes_requested', 'published']));
                const projSnap = await getDocs(projQ);
                if (!projSnap.empty) {
                    // 🔥 CRITICAL FIX: Add document ID
                    const pData = { id: projSnap.docs[0].id, ...projSnap.docs[0].data() } as StudentProject;
                    // Ensure studentId
                    if (!pData.studentId) {
                        pData.studentId = studentId;
                    }
                    const derivedAssignment: Assignment = {
                        id: pData.templateId || 'custom-mission',
                        title: pData.title,
                        description: pData.description,
                        station: normalizeStation(pData.station),
                        badges: [],
                        recommendedWorkflow: pData.workflowId || 'default',
                        stepResources: pData.stepResources || {}
                    };
                    setAssignment(derivedAssignment);
                    setProject(pData);
                    setLoading(false);
                    return;
                }
                throw new Error("No active enrollment or project found.");
            }

            const enrollment = snap.docs[0].data();
            const programId = enrollment.programId;

            // 3. Fetch Program/Mission Details
            const progDoc = await getDoc(doc(db, 'programs', programId));
            if (!progDoc.exists()) throw new Error("Program not found");

            const progData = progDoc.data();

            const mappedAssignment: Assignment = {
                id: progData.id,
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

            // Check if project already exists for this student+program combo
            const existingProjQ = query(
                collection(db, 'student_projects'),
                where('studentId', '==', studentId),
                where('templateId', '==', programId)
            );
            const existingProjSnap = await getDocs(existingProjQ);

            if (!existingProjSnap.empty) {
                // Use existing project - 🔥 CRITICAL FIX: Add document ID
                const existingProj = { id: existingProjSnap.docs[0].id, ...existingProjSnap.docs[0].data() } as StudentProject;
                console.log('[useMissionData] Found existing project for this program:', existingProj.id);
                setProject(existingProj);
            } else {
                // 🛡️ DOUBLE CHECK: Look for project by TITLE before creating new one
                // This prevents duplicates if templateId mismatch occurs
                const titleQuery = query(
                    collection(db, 'student_projects'),
                    where('studentId', '==', studentId),
                    where('title', '==', mappedAssignment.title)
                );
                const titleSnap = await getDocs(titleQuery);

                if (!titleSnap.empty) {
                    // Start using this "orphaned" project instead of creating a duplicate
                    const existingProj = { id: titleSnap.docs[0].id, ...titleSnap.docs[0].data() } as StudentProject;
                    console.log('🛡️ [useMissionData] Found existing project by TITLE fallback:', existingProj.id);

                    // Update it with templateId so it matches next time
                    try {
                        await setDoc(doc(db, 'student_projects', existingProj.id), {
                            templateId: programId
                        }, { merge: true });
                    } catch (err) {
                        console.warn("Could not link project to template", err);
                    }

                    setProject(existingProj);
                } else {
                    // Create new project with proper studentId
                    const newProject: StudentProject = {
                        id: `proj_${studentId}_${Date.now()}`,
                        studentId: studentId, // CRITICAL: Add studentId for queries to work
                        studentName: user?.displayName || 'Student', // ✅ CRITICAL FIX: Add studentName for Manager View
                        templateId: programId,
                        title: mappedAssignment.title,
                        description: mappedAssignment.description,
                        station: normalizeStation(mappedAssignment.station),
                        status: 'planning',
                        workflowId: '',
                        steps: initialSteps,
                        commits: [],
                        skills: [],
                        resources: []
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
