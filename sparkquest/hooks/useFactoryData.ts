
import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, Firestore } from 'firebase/firestore';
import { db } from '../services/firebase';
import { ProjectTemplate, ProcessTemplate, Station, Badge, StudentProject } from '../types'; // Ensure types are imported

export const useFactoryData = () => {
    const [projectTemplates, setProjectTemplates] = useState<ProjectTemplate[]>([]);
    const [processTemplates, setProcessTemplates] = useState<ProcessTemplate[]>([]);
    const [stations, setStations] = useState<Station[]>([]);
    const [badges, setBadges] = useState<Badge[]>([]);
    const [programs, setPrograms] = useState<any[]>([]);
    const [studentProjects, setStudentProjects] = useState<StudentProject[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!db) return;
        const firestore = db as Firestore;

        const unsubProjectTemplates = onSnapshot(collection(firestore, 'project_templates'), (snapshot) => {
            setProjectTemplates(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProjectTemplate)));
        });

        const unsubProcessTemplates = onSnapshot(collection(firestore, 'process_templates'), (snapshot) => {
            setProcessTemplates(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProcessTemplate)));
        });

        const unsubStations = onSnapshot(
            query(collection(firestore, 'stations'), orderBy('order', 'asc')),
            (snapshot) => {
                setStations(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Station)));
            }
        );

        const unsubBadges = onSnapshot(collection(firestore, 'badges'), (snapshot) => {
            setBadges(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Badge)));
        });

        const unsubPrograms = onSnapshot(collection(firestore, 'programs'), (snapshot) => {
            setPrograms(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Fetch all student projects for Dashboard/Review
        const unsubStudentProjects = onSnapshot(collection(firestore, 'student_projects'), (snapshot) => {
            setStudentProjects(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StudentProject)));
        });

        setLoading(false);

        return () => {
            unsubProjectTemplates();
            unsubProcessTemplates();
            unsubStations();
            unsubBadges();
            unsubPrograms();
            unsubStudentProjects();
        };
    }, []);

    // Helper to get available grades from programs
    const availableGrades = programs.reduce((acc: any[], prog) => {
        if (prog.grades) {
            prog.grades.forEach((g: any) => {
                // Deduplicate by ID and Name to catch all "Doubles"
                const exists = acc.find(existing => existing.id === g.id || existing.name === g.name);
                if (!exists) {
                    acc.push({ id: g.id, name: g.name });
                }
            });
        }
        return acc;
    }, []);

    // Helper to get available groups from programs
    const availableGroups = programs.reduce((acc: string[], prog) => {
        if (prog.grades) {
            prog.grades.forEach((grade: any) => {
                if (grade.groups && Array.isArray(grade.groups)) {
                    grade.groups.forEach((group: any) => {
                        if (group.name && !acc.includes(group.name)) {
                            acc.push(group.name);
                        }
                    });
                }
            });
        }
        return acc;
    }, []);

    // --- ACTIONS ---

    // Badges
    const addBadge = async (badge: Omit<Badge, 'id'>) => {
        if (!db) return;
        await addDoc(collection(db as Firestore, 'badges'), { ...badge, createdAt: serverTimestamp() });
    };
    const updateBadge = async (id: string, data: Partial<Badge>) => {
        if (!db) return;
        await updateDoc(doc(db as Firestore, 'badges', id), data);
    };
    const deleteBadge = async (id: string) => {
        if (!db) return;
        await deleteDoc(doc(db as Firestore, 'badges', id));
    };

    // Workflows (Process Templates)
    const addWorkflow = async (workflow: Omit<ProcessTemplate, 'id'>) => {
        if (!db) return;
        await addDoc(collection(db as Firestore, 'process_templates'), { ...workflow, createdAt: serverTimestamp() });
    };
    const updateWorkflow = async (id: string, data: Partial<ProcessTemplate>) => {
        if (!db) return;
        await updateDoc(doc(db as Firestore, 'process_templates', id), data);
    };
    const deleteWorkflow = async (id: string) => {
        if (!db) return;
        await deleteDoc(doc(db as Firestore, 'process_templates', id));
    };

    // Stations
    const addStation = async (station: Omit<Station, 'id'>) => {
        if (!db) return;
        await addDoc(collection(db as Firestore, 'stations'), { ...station, order: stations.length });
    };
    const updateStation = async (id: string, data: Partial<Station>) => {
        if (!db) return;
        await updateDoc(doc(db as Firestore, 'stations', id), data);
    };
    const deleteStation = async (id: string) => {
        if (!db) return;
        await deleteDoc(doc(db as Firestore, 'stations', id));
    };

    // Project Templates
    const addProjectTemplate = async (template: Omit<ProjectTemplate, 'id'>) => {
        if (!db) return;
        await addDoc(collection(db as Firestore, 'project_templates'), { ...template, createdAt: serverTimestamp() });
    };
    const updateProjectTemplate = async (id: string, data: Partial<ProjectTemplate>) => {
        if (!db) return;
        await updateDoc(doc(db as Firestore, 'project_templates', id), { ...data, updatedAt: serverTimestamp() });
    };
    const deleteProjectTemplate = async (id: string) => {
        if (!db) return;
        const firestore = db as Firestore;
        const batch = (await import('firebase/firestore')).writeBatch(firestore);

        // 1. Delete the Template
        batch.delete(doc(firestore, 'project_templates', id));

        // 2. Find and Delete ALL Student Submissions for this template
        // We query directly to ensure we catch everything on the server
        const submissionsQuery = query(collection(firestore, 'student_projects'), (await import('firebase/firestore')).where('templateId', '==', id));
        const submissionsSnapshot = await (await import('firebase/firestore')).getDocs(submissionsQuery);

        submissionsSnapshot.forEach(subDoc => {
            batch.delete(subDoc.ref);
        });

        await batch.commit();
    };

    // Complex Actions
    const toggleStationActivation = async (stationId: string, gradeId: string, currentStations: Station[]) => {
        if (!db) return;
        const firestore = db as Firestore;
        const batch = (await import('firebase/firestore')).writeBatch(firestore);
        const targetStation = currentStations.find(s => s.id === stationId);

        if (!targetStation) return;

        const isCurrentlyActive = targetStation.activeForGradeIds?.includes(gradeId);

        if (isCurrentlyActive) {
            // Deactivate
            const newActiveIds = (targetStation.activeForGradeIds || []).filter(id => id !== gradeId);
            batch.update(doc(firestore, 'stations', stationId), { activeForGradeIds: newActiveIds });
        } else {
            // Activate for this station
            const newActiveIds = [...(targetStation.activeForGradeIds || []), gradeId];
            batch.update(doc(firestore, 'stations', stationId), { activeForGradeIds: newActiveIds });

            // Deactivate for ALL other stations for this grade (Mutual Exclusivity)
            currentStations.forEach(st => {
                if (st.id !== stationId && st.activeForGradeIds?.includes(gradeId)) {
                    const filteredIds = (st.activeForGradeIds || []).filter(id => id !== gradeId);
                    batch.update(doc(firestore, 'stations', st.id), { activeForGradeIds: filteredIds });
                }
            });
        }
        await batch.commit();
    };

    // Users (Students)
    const [students, setStudents] = useState<any[]>([]);

    useEffect(() => {
        if (!db) return;
        const firestore = db as Firestore;

        // Fetch students (users with role 'student' or just all users for mapping)
        // Optimization: In a real app we might only fetch needed users, but for now we fetch all to ensure we have names.
        const unsubUsers = onSnapshot(collection(firestore, 'users'), (snapshot) => {
            const allUsers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            // Filter client-side if needed, or just keep all for mapping instructor names too
            setStudents(allUsers);
        });

        return () => {
            unsubUsers();
        };
    }, []);

    // Enrollments (for Grade Resolution)
    const [enrollments, setEnrollments] = useState<any[]>([]);
    useEffect(() => {
        if (!db) return;
        const firestore = db as Firestore;
        const unsubEnrollments = onSnapshot(collection(firestore, 'enrollments'), (snapshot) => {
            setEnrollments(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsubEnrollments();
    }, []);

    return {
        projectTemplates,
        processTemplates,
        stations,
        badges,
        programs, // Export programs for grade-specific data
        studentProjects,
        students, // Export students
        enrollments, // Export enrollments
        availableGrades,
        availableGroups, // Export groups
        loading,
        actions: {
            addBadge, updateBadge, deleteBadge,
            addWorkflow, updateWorkflow, deleteWorkflow,
            addStation, updateStation, deleteStation, toggleStationActivation,
            addProjectTemplate, updateProjectTemplate, deleteProjectTemplate
        }
    };
};
