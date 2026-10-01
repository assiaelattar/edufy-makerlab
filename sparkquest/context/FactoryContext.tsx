import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, where, Firestore } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';
import { ProjectTemplate, ProcessTemplate, Station, Badge, StudentProject } from '../types';
import { buildMissionAssignmentPatch, MissionAudienceInput } from '../domain/missionAssignment';
import { omitUndefinedDeep } from '../domain/firestorePayload';
import { persistImportedMission, publishImportedMission } from '../services/missionImport';
import type { ImportCatalog, ImportDraft } from '../domain/missionImport';
import { assignMissionToLearner, saveMissionAudience } from '../services/profileAssignment';

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
    const [studentProjectsLoading, setStudentProjectsLoading] = useState(true);
    const [studentProjectsError, setStudentProjectsError] = useState<string | null>(null);
    const [projectReadAttempt, setProjectReadAttempt] = useState(0);
    const [directoryLoading, setDirectoryLoading] = useState(true);
    const [directoryError, setDirectoryError] = useState<string | null>(null);
    const [catalogLoading, setCatalogLoading] = useState(true);
    const [catalogError, setCatalogError] = useState<string | null>(null);
    const [factoryReadAttempt, setFactoryReadAttempt] = useState(0);
    // Gamification Data
    const [gadgets, setGadgets] = useState<any[]>([]);
    const [contests, setContests] = useState<any[]>([]);
    const [purchaseRequests, setPurchaseRequests] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]); // Added students state
    const [loading, setLoading] = useState(true);

    const { user, userProfile, loading: authLoading } = useAuth();
    const organizationId = userProfile?.organizationId;

    useEffect(() => {
        if (authLoading) return;
        setStudents([]); setProjectTemplates([]); setPrograms([]);
        setDirectoryLoading(true); setDirectoryError(null); setCatalogLoading(true); setCatalogError(null);
        if (!db || !user || !userProfile || !organizationId) {
            setProjectTemplates([]);
            setProcessTemplates([]);
            setStations([]);
            setBadges([]);
            setPrograms([]);
            setStudentProjects([]);
            setGadgets([]);
            setContests([]);
            setPurchaseRequests([]);
            setStudents([]);
            setLoading(false);
            setDirectoryLoading(false); setCatalogLoading(false);
            return;
        }
        const firestore = db as Firestore;
        const isElevated = userProfile.role === 'admin' || userProfile.role === 'instructor';

        // Student startup stays deliberately small. The dashboard owns its
        // enrollment/mission reads, while the wizard only needs these two
        // catalogues. Admin-only live listeners were adding network work and
        // permission noise to every learner login.
        if (!isElevated) {
            setDirectoryLoading(false); setCatalogLoading(false);
            setStations([]);
            setBadges([]);
            setPrograms([]);
            setStudentProjects([]);
            setGadgets([]);
            setContests([]);
            setPurchaseRequests([]);
            setStudents([]);

            const unsubProjectTemplates = onSnapshot(
                collection(firestore, 'project_templates'),
                snapshot => setProjectTemplates(snapshot.docs
                    .map(d => ({ id: d.id, ...d.data() } as ProjectTemplate))
                    .filter(template => !template.organizationId || template.organizationId === organizationId)),
                error => console.error('Template Error:', error)
            );
            const unsubProcessTemplates = onSnapshot(
                collection(firestore, 'process_templates'),
                snapshot => setProcessTemplates(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProcessTemplate))),
                error => console.error('Workflow Error:', error)
            );
            setLoading(false);
            return () => {
                unsubProjectTemplates();
                unsubProcessTemplates();
            };
        }

        // Content: Global or Shared? For now, fetch all templates. 
        // ideally, templates should also be org-scoped or 'public'
        let templatesReady = false;
        let programsReady = false;
        const updateCatalogLoading = () => setCatalogLoading(!templatesReady || !programsReady);
        const unsubProjectTemplates = onSnapshot(collection(firestore, 'project_templates'), (snapshot) => {
            setProjectTemplates(snapshot.docs
                .map(d => ({ ...d.data(), id: d.id } as ProjectTemplate))
                .filter(template => !template.organizationId || template.organizationId === organizationId));
            templatesReady = true; updateCatalogLoading();
        }, () => { templatesReady = true; updateCatalogLoading(); setCatalogError('Mission catalog could not load. Retry before assigning.'); });

        const unsubProcessTemplates = onSnapshot(collection(firestore, 'process_templates'), (snapshot) => {
            setProcessTemplates(snapshot.docs
                .map(d => ({ id: d.id, ...d.data() } as ProcessTemplate & { organizationId?: string }))
                .filter(template => !template.organizationId || template.organizationId === organizationId));
        });

        const unsubStations = onSnapshot(
            query(collection(firestore, 'stations'), orderBy('order', 'asc')),
            (snapshot) => {
                setStations(snapshot.docs
                    .map(d => ({ id: d.id, ...d.data() } as Station & { organizationId?: string }))
                    .filter(station => !station.organizationId || station.organizationId === organizationId));
            }, (error) => console.error("Station Error:", error)
        );

        const unsubBadges = onSnapshot(collection(firestore, 'badges'), (snapshot) => {
            setBadges(snapshot.docs
                .map(d => ({ id: d.id, ...d.data() } as Badge & { organizationId?: string }))
                .filter(badge => !badge.organizationId || badge.organizationId === organizationId));
        });

        const programsQuery = query(collection(firestore, 'programs'), where('organizationId', '==', organizationId));
        const unsubPrograms = onSnapshot(programsQuery, (snapshot) => {
            const allPrograms = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));

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
            programsReady = true; updateCatalogLoading();
        }, () => { programsReady = true; updateCatalogLoading(); setCatalogError('Program catalog could not load. Retry to check class assignments.'); });


        const unsubGadgets = onSnapshot(collection(firestore, 'gadgets'), (snap) => {
            setGadgets(snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter((gadget: any) => !gadget.organizationId || gadget.organizationId === organizationId));
        });

        const unsubContests = onSnapshot(collection(firestore, 'contests'), (snap) => {
            setContests(snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter((contest: any) => !contest.organizationId || contest.organizationId === organizationId));
        });

        // Admin view of requests
        let unsubRequests = () => { };
        if (isElevated) {
            const reqQuery = query(collection(firestore, 'purchase_requests'), where('organizationId', '==', organizationId));
            unsubRequests = onSnapshot(reqQuery, (snap) => {
                setPurchaseRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            }, (error) => console.error("Requests Error:", error));
        } else {
            setPurchaseRequests([]);
        }

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
                // Identity links only. Names, email addresses, phone numbers and
                // birth dates are display data and must never merge learner records.
                const alreadyExists = Array.from(studentMap.values()).some((s: any) =>
                    s.id === u.id || s.loginInfo?.uid === u.id
                );

                if (!alreadyExists) {
                    studentMap.set(u.id, { ...u, _source: 'user_auth' });
                }
            });

            setStudents(Array.from(studentMap.values()));
        };

        let unsubUsersList = () => { };
        let unsubStudentsList = () => { };
        let usersReady = false;
        let studentsReady = false;
        const updateDirectoryLoading = () => setDirectoryLoading(!usersReady || !studentsReady);
        if (isElevated) {
            const usersQuery = query(collection(firestore, 'users'), where('organizationId', '==', organizationId));
            unsubUsersList = onSnapshot(usersQuery, (snap) => {
                usersCache = snap.docs.map(d => ({ ...d.data(), id: d.id }));
                updateCombinedStudents();
                usersReady = true; updateDirectoryLoading();
            }, () => { usersReady = true; updateDirectoryLoading(); setDirectoryError('Learner account links could not load. Retry before opening a profile.'); });

            const studentsQuery = query(collection(firestore, 'students'), where('organizationId', '==', organizationId));
            unsubStudentsList = onSnapshot(studentsQuery, (snap) => {
                studentsCache = snap.docs.map(d => ({ ...d.data(), id: d.id }));
                updateCombinedStudents();
                studentsReady = true; updateDirectoryLoading();
            }, () => { studentsReady = true; updateDirectoryLoading(); setDirectoryError('Learner profiles could not load. Retry before opening a profile.'); });
        } else {
            setStudents([]);
        }

        setLoading(false);

        return () => {
            unsubProjectTemplates();
            unsubProcessTemplates();
            unsubStations();
            unsubBadges();
            unsubPrograms();
            unsubUsersList();
            unsubStudentsList();
            unsubGadgets();
            unsubContests();
            unsubRequests();
        };
    }, [authLoading, organizationId, user?.uid, userProfile, factoryReadAttempt]);

    // Keep review loading/error state independent from the catalog listeners.
    useEffect(() => {
        if (authLoading) return;
        setStudentProjects([]);
        setStudentProjectsError(null);
        const elevated = userProfile?.role === 'admin' || userProfile?.role === 'instructor';
        if (!db || !user?.uid || !organizationId || !elevated) {
            setStudentProjectsLoading(false);
            return;
        }
        setStudentProjectsLoading(true);
        return onSnapshot(
            query(collection(db, 'student_projects'), where('organizationId', '==', organizationId)),
            snapshot => {
                setStudentProjects(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as StudentProject)));
                setStudentProjectsLoading(false);
                setStudentProjectsError(null);
            },
            () => {
                setStudentProjectsLoading(false);
                setStudentProjectsError('Projects could not be loaded. Retry, or check your instructor access.');
            }
        );
    }, [authLoading, organizationId, user?.uid, userProfile?.role, projectReadAttempt]);

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
        if (!db || !organizationId) throw new Error('Your instructor organization could not be resolved.');
        await addDoc(collection(db as Firestore, 'badges'), { ...badge, organizationId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    };
    const updateBadge = async (id: string, data: Partial<Badge>) => {
        if (!db || !organizationId) throw new Error('Your instructor organization could not be resolved.');
        await updateDoc(doc(db as Firestore, 'badges', id), { ...data, organizationId, updatedAt: serverTimestamp() });
    };
    const deleteBadge = async (id: string) => {
        if (!db) return;
        await deleteDoc(doc(db as Firestore, 'badges', id));
    };

    const addWorkflow = async (workflow: Omit<ProcessTemplate, 'id'>) => {
        if (!db || !organizationId) throw new Error('Your instructor organization could not be resolved.');
        await addDoc(collection(db as Firestore, 'process_templates'), { ...workflow, organizationId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    };
    const updateWorkflow = async (id: string, data: Partial<ProcessTemplate>) => {
        if (!db || !organizationId) throw new Error('Your instructor organization could not be resolved.');
        await updateDoc(doc(db as Firestore, 'process_templates', id), { ...data, organizationId, updatedAt: serverTimestamp() });
    };
    const deleteWorkflow = async (id: string) => {
        if (!db) return;
        await deleteDoc(doc(db as Firestore, 'process_templates', id));
    };

    const addStation = async (station: Omit<Station, 'id'>) => {
        if (!db || !organizationId) throw new Error('Your instructor organization could not be resolved.');
        await addDoc(collection(db as Firestore, 'stations'), { ...station, organizationId, order: stations.length, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    };
    const updateStation = async (id: string, data: Partial<Station>) => {
        if (!db || !organizationId) throw new Error('Your instructor organization could not be resolved.');
        await updateDoc(doc(db as Firestore, 'stations', id), { ...data, organizationId, updatedAt: serverTimestamp() });
    };
    const deleteStation = async (id: string) => {
        if (!db) return;
        await deleteDoc(doc(db as Firestore, 'stations', id));
    };

    const addProjectTemplate = async (template: Omit<ProjectTemplate, 'id'>) => {
        if (!db || !organizationId || !user?.uid) throw new Error('Your instructor organization could not be resolved.');
        const cleanTemplate = omitUndefinedDeep(template);
        await addDoc(collection(db as Firestore, 'project_templates'), {
            ...cleanTemplate,
            organizationId,
            createdBy: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
    };
    const importMission = async (draft: ImportDraft, catalog: ImportCatalog, source: string) => {
        if (!db || !organizationId || !user?.uid) throw new Error('Your instructor organization could not be resolved.');
        return persistImportedMission(db as Firestore, organizationId, user.uid, draft, catalog, source);
    };
    const assignImportedMission = async (id: string) => {
        if (!db || !organizationId || !user?.uid) throw new Error('Your instructor organization could not be resolved.');
        return publishImportedMission(db as Firestore, organizationId, user.uid, id);
    };
    const updateProjectTemplate = async (id: string, data: Partial<ProjectTemplate>) => {
        if (!db || !organizationId) throw new Error('Your instructor organization could not be resolved.');
        const cleanData = omitUndefinedDeep(data);
        await saveMissionAudience(db as Firestore, id, {
            ...cleanData,
            organizationId,
        }, { uid: user?.uid || '', organizationId, role: userProfile?.role || '' });
    };
    const assignProjectTemplate = async (
        id: string,
        audience: Omit<MissionAudienceInput, 'organizationId'>
    ) => {
        if (!db || !organizationId || !user?.uid) throw new Error('Your instructor organization could not be resolved.');
        const patch = buildMissionAssignmentPatch({ ...audience, organizationId });
        await saveMissionAudience(db as Firestore, id, {
            ...patch,
            assignedAt: serverTimestamp(),
            assignedBy: user.uid,
        }, { uid: user.uid, organizationId, role: userProfile?.role || '' });
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
    const [enrollmentsLoading, setEnrollmentsLoading] = useState(true);
    const [enrollmentsError, setEnrollmentsError] = useState<string | null>(null);
    useEffect(() => {
        setEnrollments([]); setEnrollmentsLoading(true); setEnrollmentsError(null);
        if (!db || !user || !userProfile || !organizationId || (userProfile.role !== 'admin' && userProfile.role !== 'instructor')) {
            setEnrollments([]);
            setEnrollmentsLoading(false);
            return;
        }
        const firestore = db as Firestore;
        const enrollmentQuery = query(collection(firestore, 'enrollments'), where('organizationId', '==', organizationId));
        const unsubEnrollments = onSnapshot(enrollmentQuery, (snapshot) => {
            setEnrollments(snapshot.docs.map(d => ({ ...d.data(), id: d.id })));
            setEnrollmentsLoading(false);
        }, () => { setEnrollmentsLoading(false); setEnrollmentsError('Class enrollments could not load. Retry to check mission availability.'); });
        return () => unsubEnrollments();
    }, [organizationId, user?.uid, userProfile, factoryReadAttempt]);

    const buyGadget = async (userId: string, userName: string, gadget: any) => {
        if (!db || !organizationId) return;
        const firestore = db as Firestore;
        const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
        await addDoc(collection(firestore, 'purchase_requests'), {
            organizationId, userId, userName, gadgetId: gadget.id, gadgetName: gadget.name, cost: gadget.cost, status: 'pending', createdAt: serverTimestamp()
        });
    };

    const value = {
        projectTemplates, processTemplates, stations, badges, programs, studentProjects, studentProjectsLoading, studentProjectsError, retryStudentProjects: () => setProjectReadAttempt(attempt => attempt + 1), students, enrollments, availableGrades, availableGroups, loading, gadgets, contests, purchaseRequests,
        directoryLoading, directoryError, catalogLoading, catalogError, enrollmentsLoading, enrollmentsError,
        retryLearnerWorkspace: () => { setFactoryReadAttempt(attempt => attempt + 1); setProjectReadAttempt(attempt => attempt + 1); },
        actions: {
            addBadge, updateBadge, deleteBadge,
            addWorkflow, updateWorkflow, deleteWorkflow,
            addStation, updateStation, deleteStation, toggleStationActivation,
            addProjectTemplate, updateProjectTemplate, assignProjectTemplate, deleteProjectTemplate, importMission, assignImportedMission,
            buyGadget,
            assignLearnerMission: async (missionId: string, studentId: string, source: 'student_profile' | 'user_auth') => {
                if (!db || !user?.uid || !organizationId) throw new Error('Your instructor session is unavailable.');
                return assignMissionToLearner(db as Firestore, missionId, studentId, { uid: user.uid, organizationId, role: userProfile?.role || '' }, source);
            }
        }
    };

    return (
        <FactoryContext.Provider value={value}>
            {children}
        </FactoryContext.Provider>
    );
};
