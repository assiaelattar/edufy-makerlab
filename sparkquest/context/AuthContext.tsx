import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, onAuthStateChanged, signInWithCustomToken, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, increment, onSnapshot, Unsubscribe, updateDoc } from 'firebase/firestore';

import { UserProfile } from '../types';
import { createVerifiedStudentIdentity } from '../domain/studentIdentity';
import { resolveLinkedStudentRecord } from '../services/studentIdentity';

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    authIssue: string | null;
    signInWithToken: (token: string) => Promise<void>;
    signOut: () => Promise<void>;
    updateCredits: (amount: number) => Promise<void>;
    kioskLogin: (studentId: string, pin: string) => Promise<boolean>;
    isKioskMode: boolean;
    enableKioskMode: () => void;
    exitKioskMode: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userProfile: null,
    loading: true,
    authIssue: null,
    signInWithToken: async () => { },
    signOut: async () => { },
    updateCredits: async () => { },
    kioskLogin: async () => false,
    isKioskMode: false,
    enableKioskMode: () => { },
    exitKioskMode: () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [authIssue, setAuthIssue] = useState<string | null>(null);
    const [isKioskMode, setIsKioskMode] = useState(false);

    const userProfileUnsubscribe = useRef<Unsubscribe | null>(null);

    // Helper to fetch custom profile from Firestore 'users' collection
    const subscribeToUserProfile = (uid: string) => {
        if (!db) return;

        // Cleanup previous subscription if exists
        if (userProfileUnsubscribe.current) {
            userProfileUnsubscribe.current();
            userProfileUnsubscribe.current = null;
        }

        try {
            const unsubscribe = onSnapshot(doc(db, 'users', uid), async (userDoc) => {
                if (userDoc.exists()) {
                    const data = { ...userDoc.data() } as UserProfile;
                    if (!data.organizationId) {
                        setUserProfile(null);
                        setAuthIssue('This account is not connected to an Edufy organization. Ask an administrator to repair the account.');
                        return;
                    }

                    if (data.role === 'student') {
                        try {
                            const studentRecord = await resolveLinkedStudentRecord({
                                db,
                                authUid: uid,
                                organizationId: data.organizationId,
                                pointedStudentId: data.studentId,
                            });

                            const identity = createVerifiedStudentIdentity({
                                authUid: uid,
                                organizationId: data.organizationId,
                                student: studentRecord,
                            });
                            data.studentId = identity.studentId;
                        } catch (recoveryErr) {
                            console.error('Failed to verify student identity', recoveryErr);
                            setUserProfile(null);
                            setAuthIssue(
                                recoveryErr instanceof Error && recoveryErr.message.includes('More than one')
                                    ? 'More than one learner profile is linked to this login. Ask an administrator to resolve the duplicate.'
                                    : 'SparkQuest could not verify the learner profile. Ask an administrator to check the Edufy account link.'
                            );
                            return;
                        }
                    }

                    setAuthIssue(null);
                    setUserProfile(data);
                } else {
                    setUserProfile(null);
                    setAuthIssue('This login does not have an Edufy profile yet. Ask an administrator to finish the account setup.');
                }
            }, (err) => {
                console.error("Error fetching user profile:", err);
                setUserProfile(null);
                setAuthIssue('SparkQuest could not load the Edufy account profile. Check the connection and try again.');
            });

            userProfileUnsubscribe.current = unsubscribe;
        } catch (err) {
            console.error("Error setting up profile listener:", err);
        }
    };

    useEffect(() => {
        // Remove legacy client-authenticated bridge and kiosk sessions. They did
        // not create a real Firebase identity and cannot satisfy tenant rules.
        localStorage.removeItem('sparkquest_bridge_user');
        localStorage.removeItem('sparkquest_kiosk_mode');

        if (!auth) {
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                subscribeToUserProfile(currentUser.uid);
            } else {
                setUser(null);
                setUserProfile(null);
                setAuthIssue(null);
                if (userProfileUnsubscribe.current) {
                    userProfileUnsubscribe.current();
                    userProfileUnsubscribe.current = null;
                }
            }
            setLoading(false);
        });
        return () => {
            unsubscribe();
            if (userProfileUnsubscribe.current) {
                userProfileUnsubscribe.current();
            }
        };
    }, []);

    const signInWithToken = async (token: string) => {
        if (!auth) return;
        try {
            if (!token.trim()) throw new Error('Missing sign-in token.');
            await signInWithCustomToken(auth, token.trim());
        } catch (error) {
            console.error("Login failed", error);
            setAuthIssue('The Edufy sign-in link is invalid or expired. Return to Edufy and launch SparkQuest again.');
            throw error;
        }
    };

    const signOut = async () => {
        localStorage.removeItem('sparkquest_bridge_user');
        if (!auth) return;
        await firebaseSignOut(auth);
    };

    const updateCredits = async (amount: number) => {
        if (!user) return;

        try {
            if (db) {
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, {
                    arcadeCredits: increment(amount)
                });

                // Optimistic update
                setUserProfile(prev => prev ? {
                    ...prev,
                    arcadeCredits: (prev.arcadeCredits || 0) + amount
                } : null);
            }
        } catch (e) {
            console.error("Failed to update credits:", e);
        }
    };

    const enableKioskMode = () => {
        setIsKioskMode(false);
        localStorage.removeItem('sparkquest_kiosk_mode');
        setAuthIssue('Classroom PIN mode is temporarily unavailable while its secure sign-in service is being rebuilt. Students can sign in with their Edufy accounts.');
    };

    const exitKioskMode = () => {
        setIsKioskMode(false);
        localStorage.removeItem('sparkquest_kiosk_mode');
    };

    const kioskLogin = async (): Promise<boolean> => false;

    return (
        <AuthContext.Provider value={{ user, userProfile, loading, authIssue, signInWithToken, signOut, updateCredits, kioskLogin, isKioskMode, enableKioskMode, exitKioskMode }}>
            {children}
        </AuthContext.Provider>
    );
};
