import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, onAuthStateChanged, signInWithCustomToken, signInAnonymously, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';

import { UserProfile } from '../types';

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
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
    const [isKioskMode, setIsKioskMode] = useState(() => localStorage.getItem('sparkquest_kiosk_mode') === 'true');
    const isDemoMode = useRef(false);

    // Helper to fetch custom profile from Firestore 'users' collection
    const fetchUserProfile = async (uid: string) => {
        if (!db) return;
        try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
                const data = userDoc.data() as UserProfile;
                if (!data.organizationId) {
                    console.warn("⚠️ Legacy User detected: Defaulting to 'makerlab-academy'", data);
                    data.organizationId = 'makerlab-academy';
                }
                setUserProfile(data);
            } else {
                // Fallback if no user doc exists yet
                setUserProfile({
                    uid,
                    name: 'Student',
                    email: '',
                    role: 'student',
                    organizationId: 'makerlab-academy' // Default for new uninitialized users too
                });
            }
        } catch (err) {
            console.error("Error fetching user profile:", err);
        }
    };

    useEffect(() => {
        // 1. Check for persisted Bridge Session (Local Mock)
        const storedBridge = localStorage.getItem('sparkquest_bridge_user');
        if (storedBridge) {
            try {
                const payload = JSON.parse(storedBridge);
                if (payload && payload.uid) {
                    console.log("Restoring Bridge Session from Storage");
                    isDemoMode.current = true; // Prevent Firebase from clearing this
                    const mockUser = {
                        uid: payload.uid,
                        displayName: payload.name || 'Explorer',
                        email: payload.email,
                        emailVerified: true,
                        isAnonymous: false,
                        getIdToken: async () => 'bridge-token',
                        getIdTokenResult: async () => ({
                            token: 'bridge-token',
                            claims: { role: payload.role },
                        }),
                        photoURL: payload.photoURL || null,
                    } as unknown as User;

                    setUser(mockUser);
                    setUserProfile(payload);

                    // 🔑 Restore Firebase Session (needed for RLS)
                    if (auth && !auth.currentUser) {
                        signInAnonymously(auth).catch(e => console.warn("Restoring Anon Auth failed", e));
                    }

                    setLoading(false);
                    // We still listen to Firebase, but isDemoMode protects us
                }
            } catch (e) {
                console.error("Failed to restore bridge session", e);
                localStorage.removeItem('sparkquest_bridge_user');
            }
        }

        if (!auth) {
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            // URL Token Priority: If we have a bridge token, ignore existing Firebase session
            // forcing the app to use the signInWithToken logic instead.
            const params = new URLSearchParams(window.location.search);
            if (params.get('token')) {
                console.log("🔒 Bridge Token Detected: Ignoring Firebase Session to allow impersonation.");
                return;
            }

            if (currentUser) {
                // GUARD: If we are in Kiosk/Demo Mode and the user is Anonymous, 
                // it means we just signed in anonymously for Firestore access.
                // We MUST NOT overwrite the Mock User/Student Profile with the raw anonymous user.
                if (currentUser.isAnonymous && isDemoMode.current) {
                    console.log("👻 Kiosk: Anonymous Auth verified. Keeping Kiosk Session active.");
                    return;
                }

                isDemoMode.current = false;
                setUser(currentUser);
                await fetchUserProfile(currentUser.uid);
            } else {
                // Only clear if we are NOT in a bridge/demo mode
                if (!isDemoMode.current) {
                    setUser(null);
                    setUserProfile(null);
                }
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const signInWithToken = async (token: string) => {
        if (!auth) return;
        try {
            // In a real scenario, this 'token' should be a verify/custom token from Firebase Admin.
            // For this demo/client-side, we might simulating or passing a real ID token if possible,
            // BUT client SDK `signInWithCustomToken` requires a backend-minted token.

            // TEMPORARY HACK: If we don't have a backend to mint custom tokens, 
            // we can't fully "secure" this without a cloud function.
            // OPTION: We will assume the user IS ALREADY LOGGED IN if they are on same domain (localStorage shares auth),
            // OR we implement a simple "mock" login for now if the token is "demo-token".

            // 1. Try Bridge Token (Base64 JSON from ERP)
            try {
                // Decode base64 with unicode support
                const decoded = decodeURIComponent(atob(token).split('').map(function (c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));

                // Simple validation to ensure it looks like JSON
                if (decoded.trim().startsWith('{')) {
                    const payload = JSON.parse(decoded);
                    if (payload && payload.uid && payload.email) {
                        console.log("Bridge Token Verified", payload);
                        const mockUser = {
                            uid: payload.uid,
                            displayName: payload.name || 'Explorer',
                            email: payload.email,
                            emailVerified: true,
                            isAnonymous: false,
                            metadata: {},
                            providerData: [],
                            refreshToken: '',
                            tenantId: null,
                            delete: async () => { },
                            getIdToken: async () => token,
                            getIdTokenResult: async () => ({
                                token: token,
                                signInProvider: 'custom',
                                claims: { role: payload.role },
                                authTime: Date.now().toString(),
                                issuedAtTime: Date.now().toString(),
                                expirationTime: (Date.now() + 3600000).toString(),
                                signInSecondFactor: null,
                            }),
                            reload: async () => { },
                            toJSON: () => ({}),
                            phoneNumber: null,
                            photoURL: payload.photoURL || null,
                        } as unknown as User;

                        // PERSIST SESSION
                        localStorage.setItem('sparkquest_bridge_user', JSON.stringify(payload));
                        isDemoMode.current = true; // Mark as local session

                        // 🔑 CRITICAL: Sign in anonymously to satisfy Firestore Security Rules
                        try {
                            if (!auth.currentUser) {
                                await signInAnonymously(auth);
                                console.log("🔑 Bridge: Signed in Anonymously for Firestore Access");
                            }
                        } catch (err) {
                            console.warn("Bridge Anon Auth failed", err);
                        }

                        setUser(mockUser);
                        setUserProfile(payload);
                        return;
                    }
                }
            } catch (e) {
                // Not a base64 token or failed verification, fall through
                console.debug("Token sent is not a bridge token", e);
            }

            if (token === 'demo-token') {
                console.warn("Using demo token mode");
                isDemoMode.current = true;
                const mockUser = {
                    uid: 'demo-student-id',
                    displayName: 'Demo Student',
                    email: 'student@makerlab.academy',
                    emailVerified: true,
                    isAnonymous: false,
                    metadata: {},
                    providerData: [],
                    refreshToken: '',
                    tenantId: null,
                    delete: async () => { },
                    getIdToken: async () => 'demo-token',
                    getIdTokenResult: async () => ({
                        token: 'demo-token',
                        signInProvider: 'custom',
                        claims: {},
                        authTime: Date.now().toString(),
                        issuedAtTime: Date.now().toString(),
                        expirationTime: (Date.now() + 3600000).toString(),
                        signInSecondFactor: null,
                    }),
                    reload: async () => { },
                    toJSON: () => ({}),
                    phoneNumber: null,
                    photoURL: null,
                } as unknown as User;

                setUser(mockUser);
                setUserProfile({
                    uid: 'demo-student-id',
                    name: 'Demo Student',
                    email: 'student@makerlab.academy',
                    role: 'student'
                });
            } else {
                await signInWithCustomToken(auth, token);
            }

        } catch (error) {
            console.error("Login failed", error);
            throw error;
        }
    };

    const signOut = async () => {
        localStorage.removeItem('sparkquest_bridge_user'); // Clear local session
        if (!auth) return;
        await firebaseSignOut(auth);
    };

    const updateCredits = async (amount: number) => {
        if (!user || isDemoMode.current) {
            // In demo/bridge mode, just update local state
            if (userProfile) {
                setUserProfile({
                    ...userProfile,
                    arcadeCredits: (userProfile.arcadeCredits || 0) + amount
                });
            }
            return;
        }

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
        setIsKioskMode(true);
        localStorage.setItem('sparkquest_kiosk_mode', 'true');
    };

    const exitKioskMode = () => {
        setIsKioskMode(false);
        localStorage.removeItem('sparkquest_kiosk_mode');
    };

    const kioskLogin = async (studentId: string, pin: string): Promise<boolean> => {
        if (!db) return false;
        try {
            // Verify PIN against Firestore
            const studentDoc = await getDoc(doc(db, 'students', studentId));
            if (!studentDoc.exists()) return false;

            const studentData = studentDoc.data();
            if (studentData.pinCode !== pin) return false;

            // PIN Valid -> Create Bridge Session
            const payload = {
                uid: studentData.loginInfo?.uid || studentData.id,
                email: studentData.loginInfo?.email || studentData.email || `${studentData.id}@kiosk.local`,
                role: 'student',
                name: studentData.name,
                photoURL: null,
                organizationId: studentData.organizationId || 'makerlab-academy' // Ensure Org ID is captured
            };

            // PERSIST SESSION
            localStorage.setItem('sparkquest_bridge_user', JSON.stringify(payload));
            isDemoMode.current = true; // Mark as local session

            // REAL AUTH: Sign in anonymously to satisfy Firestore Security Rules (request.auth != null)
            // This allows us to pass 'isSignedIn()' checks in rules.
            // The rules will then see we have no User Profile in 'users' collection (getOrgId() == null),
            // and fallback to allowing access if we are Kiosk.
            try {
                await signInAnonymously(auth);
                console.log("👻 Kiosk: Signed in Anonymously for Firestore Access");
            } catch (authErr) {
                console.warn("Kiosk Anon Auth failed, falling back to pure mock", authErr);
            }

            const mockUser = {
                uid: payload.uid,
                displayName: payload.name || 'Explorer',
                email: payload.email,
                emailVerified: true,
                isAnonymous: true, // It IS anonymous now
                getIdToken: async () => 'kiosk-token',
                getIdTokenResult: async () => ({
                    token: 'kiosk-token',
                    claims: { role: 'student' },
                }),
                photoURL: null,
            } as unknown as User;

            setUser(mockUser);
            setUserProfile(payload);
            return true;



        } catch (e) {
            console.error("Kiosk Login Error", e);
            return false;
        }
    };

    return (
        <AuthContext.Provider value={{ user, userProfile, loading, signInWithToken, signOut, updateCredits, kioskLogin, isKioskMode, enableKioskMode, exitKioskMode }}>
            {children}
        </AuthContext.Provider>
    );
};
