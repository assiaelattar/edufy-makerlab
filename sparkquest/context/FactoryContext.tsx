import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, where, Firestore } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';
import { ProjectTemplate, ProcessTemplate, Station, Badge, StudentProject } from '../types';

const FactoryContext = createContext<any>(null);

export const useFactoryData = () => {
    const context = useContext(FactoryContext);
    if (!context) {
        throw new Error("useFactoryData must be used within a FactoryProvider");
    }
    return context;
};

export const FactoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [projectTemplates, setProjectTemplates] = useState<ProjectTemplate[]>([]);
    const [processTemplates, setProcessTemplates] = useState<ProcessTemplate[]>([]);
    const [stations, setStations] = useState<Station[]>([]);
    const [badges, setBadges] = useState<Badge[]>([]);
    const [programs, setPrograms] = useState<any[]>([]);
    const [studentProjects, setStudentProjects] = useState<StudentProject[]>([]);
    // Gamification Data
    const [gadgets, setGadgets] = useState<any[]>([]);
    const [contests, setContests] = useState<any[]>([]);
    const [purchaseRequests, setPurchaseRequests] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]); // Added students state
    const [loading, setLoading] = useState(true);

    const { userProfile } = useAuth();
    // Default to 'makerlab-academy' to handle legacy data or uninitialized profiles safely (though restrictive is better for SaaS)
    const organizationId = userProfile?.organizationId || 'makerlab-academy';

    useEffect(() => {
        if (!db) return;
        const firestore = db as Firestore;

        // Content: Global or Shared? For now, fetch all templates. 
        // ideally, templates should also be org-scoped or 'public'
        const unsubProjectTemplates = onSnapshot(collection(firestore, 'project_templates'), (snapshot) => {
            setProjectTemplates(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProjectTemplate)));
        }, (error) => console.error("Template Error:", error));

        const unsubProcessTemplates = onSnapshot(collection(firestore, 'process_templates'), (snapshot) => {
            setProcessTemplates(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProcessTemplate)));
        });

        const unsubStations = onSnapshot(
            query(collection(firestore, 'stations'), orderBy('order', 'asc')),
            (snapshot) => {
                setStations(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Station)));
            }, (error) => console.error("Station Error:", error)
        );

        const unsubBadges = onSnapshot(collection(firestore, 'badges'), (snapshot) => {
            setBadges(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Badge)));
        });

        const unsubPrograms = onSnapshot(collection(firestore, 'programs'), (snapshot) => {
            const allPrograms = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            // Filter out Adult/Maker-Pro Programs for SparkQuest
            const filteredPrograms = allPrograms.filter((p: any) => {
                // Check all relevant fields
                const searchStr = [
                    p.name,
                    p.title,
                    p.description,
                    p.targetAudience // Catch '18+' in target audience field if string
                ].map(s => (s || '').toString().toLowerCase()).join(' ');

                // Exclusion Keywords
                if (searchStr.includes('+18')) return false;
                if (searchStr.includes('18+')) return false;
                if (searchStr.includes('adult')) return false; // Covers 'adults', 'adulte'
                if (searchStr.includes('teacher')) return false;
                if (searchStr.includes('maker-pro')) return false;

                return true;
            });
            setPrograms(filteredPrograms);
        }, (error) => console.error("Programs Error:", error));

        // Fetch all student projects for Dashboard/Review - SIMPLIFIED (no org filter)
        // OPTIMIZATION: Only fetch all projects for Admins/Instructors to avoid listener conflicts
        let unsubStudentProjects = () => { };

        if (userProfile?.role === 'admin' || userProfile?.role === 'instructor') {
            const projectsQuery = query(
                collection(firestore, 'student_projects')
            );

            unsubStudentProjects = onSnapshot(projectsQuery, (snapshot) => {
                setStudentProjects(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StudentProject)));
            }, (error) => console.error("Projects Error:", error));
        }

        const unsubGadgets = onSnapshot(collection(firestore, 'gadgets'), (snap) => {
            setGadgets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const unsubContests = onSnapshot(collection(firestore, 'contests'), (snap) => {
            setContests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Admin view of requests
        const reqQuery = query(
            collection(firestore, 'purchase_requests'),
        );
        const unsubRequests = onSnapshot(collection(firestore, 'purchase_requests'), (snap) => {
            setPurchaseRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Fetch Users (Auth) AND Students (Legacy/Profile) - SCOPED TO ORG
        let usersCache: any[] = [];
        let studentsCache: any[] = [];

        const updateCombinedStudents = () => {
            const studentMap = new Map();

            // 1. Source of Truth: 'students' collection (Rich Profiles created by Admin/ERP)
            studentsCache.forEach(s => {
                studentMap.set(s.id, { ...s, _source: 'student_profile' });
            });

            // 2. Secondary Source: 'users' collection (Auth Profiles)
            usersCache.forEach(u => {
                const alreadyExists = Array.from(studentMap.values()).some((s: any) => {
                    const emailMatch = s.email && u.email && s.email.toLowerCase() === u.email.toLowerCase();
                    const nameMatch = s.name && u.name && s.name.toLowerCase() === u.name.toLowerCase();
                    const idMatch = s.id === u.id || s.loginInfo?.uid === u.id;

                    return emailMatch || nameMatch || idMatch;
                });

                if (!alreadyExists) {
                    studentMap.set(u.id, { ...u, _source: 'user_auth' });
                }
            });

            setStudents(Array.from(studentMap.values()));
        };

        const usersQuery = query(collection(firestore, 'users'), where('organizationId', '==', organizationId));
        const unsubUsersList = onSnapshot(usersQuery, (snap) => {
            usersCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            updateCombinedStudents();
        }, (error) => console.error("Users Error:", error));

        const studentsQuery = query(collection(firestore, 'students'), where('organizationId', '==', organizationId));
        const unsubStudentsList = onSnapshot(studentsQuery, (snap) => {
            studentsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            updateCombinedStudents();
        }, (error) => console.error("Students Error:", error));

        setLoading(false);

        return () => {
            unsubProjectTemplates();
            unsubProcessTemplates();
            unsubStations();
            unsubBadges();
            unsubPrograms();
            unsubStudentProjects();
            unsubUsersList();
            unsubStudentsList();
            unsubGadgets();
            unsubContests();
            unsubRequests();
        };
    }, [organizationId, userProfile]);

    // Helper to get available grades from programs
    const availableGrades = programs.reduce((acc: any[], prog) => {
        if (prog.grades) {
            prog.grades.forEach((g: any) => {
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
        batch.delete(doc(firestore, 'project_templates', id));
        const submissionsQuery = query(collection(firestore, 'student_projects'), (await import('firebase/firestore')).where('templateId', '==', id));
        const submissionsSnapshot = await (await import('firebase/firestore')).getDocs(submissionsQuery);
        submissionsSnapshot.forEach(subDoc => {
            batch.delete(subDoc.ref);
        });
        await batch.commit();
    };

    const toggleStationActivation = async (stationId: string, gradeId: string, currentStations: Station[]) => {
        if (!db) return;
        const firestore = db as Firestore;
        const batch = (await import('firebase/firestore')).writeBatch(firestore);
        const targetStation = currentStations.find(s => s.id === stationId);
        if (!targetStation) return;
        const isCurrentlyActive = targetStation.activeForGradeIds?.includes(gradeId);
        if (isCurrentlyActive) {
            const newActiveIds = (targetStation.activeForGradeIds || []).filter(id => id !== gradeId);
            batch.update(doc(firestore, 'stations', stationId), { activeForGradeIds: newActiveIds });
        } else {
            const newActiveIds = [...(targetStation.activeForGradeIds || []), gradeId];
            batch.update(doc(firestore, 'stations', stationId), { activeForGradeIds: newActiveIds });
            currentStations.forEach(st => {
                if (st.id !== stationId && st.activeForGradeIds?.includes(gradeId)) {
                    const filteredIds = (st.activeForGradeIds || []).filter(id => id !== gradeId);
                    batch.update(doc(firestore, 'stations', st.id), { activeForGradeIds: filteredIds });
                }
            });
        }
        await batch.commit();
    };

    // Enrollments
    const [enrollments, setEnrollments] = useState<any[]>([]);
    useEffect(() => {
        if (!db) return;
        const firestore = db as Firestore;
        const unsubEnrollments = onSnapshot(collection(firestore, 'enrollments'), (snapshot) => {
            setEnrollments(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsubEnrollments();
    }, []);

    const buyGadget = async (userId: string, userName: string, gadget: any) => {
        if (!db) return;
        const firestore = db as Firestore;
        const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
        await addDoc(collection(firestore, 'purchase_requests'), {
            userId, userName, gadgetId: gadget.id, gadgetName: gadget.name, cost: gadget.cost, status: 'pending', createdAt: serverTimestamp()
        });
    };

    const value = {
        projectTemplates, processTemplates, stations, badges, programs, studentProjects, students, enrollments, availableGrades, availableGroups, loading, gadgets, contests, purchaseRequests,
        actions: {
            addBadge, updateBadge, deleteBadge,
            addWorkflow, updateWorkflow, deleteWorkflow,
            addStation, updateStation, deleteStation, toggleStationActivation,
            addProjectTemplate, updateProjectTemplate, deleteProjectTemplate,
            buyGadget
        }
    };

    return (
        <FactoryContext.Provider value={value}>
            {children}
        </FactoryContext.Provider>
    );
};
