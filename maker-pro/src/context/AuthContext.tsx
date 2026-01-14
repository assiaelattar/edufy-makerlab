import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Student, Enrollment, Program } from '../types';

interface AuthContextType {
    user: User | null;
    studentProfile: Student | null;
    userRole: 'student' | 'instructor' | 'parent' | null;
    loading: boolean;
    isAuthorized: boolean;
    authError: string | null;
    signOut: () => Promise<void>;
    enterInstructorDemo: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    studentProfile: null,
    userRole: null,
    loading: true,
    isAuthorized: false,
    authError: null,
    signOut: async () => { },
    enterInstructorDemo: () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [studentProfile, setStudentProfile] = useState<Student | null>(null);
    const [userRole, setUserRole] = useState<'student' | 'instructor' | 'parent' | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    useEffect(() => {
        if (!auth || !db) {
            setLoading(false);
            return;
        }

        const firestore = db as any; // Firestore is guaranteed not null here due to early return
        const fetchStudentProfile = async (currentUser: User, retryCount = 0): Promise<void> => {
            try {
                // 1. Try finding a STUDENT profile
                const studentsRef = collection(firestore, 'students');
                const q = query(studentsRef, where('loginInfo.email', '==', currentUser.email));
                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    // 1b. Try direct ID lookup for Student
                    const directDoc = await getDoc(doc(firestore, 'students', currentUser.uid));

                    if (directDoc.exists()) {
                        const studentData = { id: directDoc.id, ...directDoc.data() } as Student;
                        verifyAccess(currentUser, studentData, firestore);
                        return;
                    }

                    // 1c. Try identifying as PARENT
                    const parentQ = query(studentsRef, where('parentLoginInfo.email', '==', currentUser.email));
                    const parentSnap = await getDocs(parentQ);

                    if (!parentSnap.empty) {
                        setIsAuthorized(true);
                        setUserRole('parent');
                        // Parent doesn't have a specific "student profile", but is authorized
                        setStudentProfile(null);
                        setLoading(false);
                        return;
                    }

                    // 2. RETRY LOGIC (Only for students) - If just created
                    if (retryCount < 2) {
                        console.log(`Student not found, retrying... (${retryCount + 1}/3)`);
                        setTimeout(() => fetchStudentProfile(currentUser, retryCount + 1), 1000);
                        return;
                    }

                    // 3. Fallback: Check if INSTRUCTOR (in 'users' collection)
                    // Note: In real app, we might check 'users' first or parallel, but here we prioritize students
                    console.log('Checking for instructor account...');
                    const usersRef = collection(firestore, 'users');
                    const userQ = query(usersRef, where('email', '==', currentUser.email));
                    const userSnap = await getDocs(userQ);

                    if (!userSnap.empty) {
                        const userData = userSnap.docs[0].data();
                        if (userData.role === 'instructor' || userData.role === 'admin') {
                            setIsAuthorized(true);
                            setUserRole('instructor');
                            // Create a mock student profile for UI compatibility or just handle null specific pages
                            setStudentProfile({
                                id: userSnap.docs[0].id,
                                name: userData.name || 'Instructor',
                                email: userData.email,
                                badges: []
                            });
                            setLoading(false);
                            return;
                        }
                    }

                    console.warn('User logged in but no matching student or instructor record found.');
                    setIsAuthorized(false);
                    setAuthError('No authorized account found.');
                    setStudentProfile(null);
                    setUserRole(null);
                    setLoading(false);
                } else {
                    const studentData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Student;
                    verifyAccess(currentUser, studentData, firestore);
                }

            } catch (err: any) {
                console.error("Auth verification error:", err);
                setAuthError(err.message);
                setIsAuthorized(false);
                setLoading(false);
            }
        };

        const verifyAccess = async (user: User, studentData: Student, firestore: any) => {
            // 2. Check Enrollments for Adult Programs
            const enrollmentsRef = collection(firestore, 'enrollments');
            const enrQ = query(enrollmentsRef, where('studentId', '==', studentData.id), where('status', '==', 'active'));
            const enrSnapshot = await getDocs(enrQ);

            let isAdult = false;

            if (!enrSnapshot.empty) {
                const programIds = enrSnapshot.docs.map((d: any) => d.data().programId);
                const uniqueProgramIds = [...new Set(programIds)];

                for (const pid of uniqueProgramIds) {
                    // Hack for Demo: Check if ID is our mock one, otherwise fetch
                    if (pid === 'program_ai_industry') {
                        isAdult = true;
                        break;
                    }

                    const progDoc = await getDoc(doc(firestore, 'programs', pid));
                    if (progDoc.exists()) {
                        const progData = progDoc.data() as Program;
                        if (progData.targetAudience === 'adults') {
                            isAdult = true;
                            break;
                        }
                    }
                }
            }

            if (isAdult) {
                setIsAuthorized(true);
                setStudentProfile(studentData);
                setUserRole('student');
            } else {
                setIsAuthorized(false);
                setAuthError('Access Restricted: This portal is for MakerPro (Adult 18+) participants only.');
                setStudentProfile(studentData);
            }
            setLoading(false);
        }

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            setAuthError(null);

            if (currentUser) {
                fetchStudentProfile(currentUser);
            } else {
                setStudentProfile(null);
                setIsAuthorized(false);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const signOut = async () => {
        if (auth) {
            await firebaseSignOut(auth);
            setUser(null);
            setStudentProfile(null);
            setUserRole(null);
            setIsAuthorized(false);
        }
    };

    const enterInstructorDemo = () => {
        const mockUser: any = {
            uid: 'demo-instructor-id',
            email: 'instructor@demo.com',
            displayName: 'Demo Instructor',
            emailVerified: true,
        };
        setUser(mockUser);
        setStudentProfile({
            id: 'demo-instructor-id',
            name: 'Demo Instructor',
            email: 'instructor@demo.com',
            badges: []
        } as any);
        setUserRole('instructor');
        setIsAuthorized(true);
        setLoading(false);
    };

    return (
        <AuthContext.Provider value={{ user, studentProfile, userRole, loading, isAuthorized, authError, signOut, enterInstructorDemo }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
