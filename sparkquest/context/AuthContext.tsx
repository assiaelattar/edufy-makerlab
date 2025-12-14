import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, onAuthStateChanged, signInWithCustomToken, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface UserProfile {
    uid: string;
    name: string;
    email: string;
    role: string;
    schoolId?: string;
    photoURL?: string;
}

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    signInWithToken: (token: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userProfile: null,
    loading: true,
    signInWithToken: async () => { },
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const isDemoMode = useRef(false);

    // Helper to fetch custom profile from Firestore 'users' collection
    const fetchUserProfile = async (uid: string) => {
        if (!db) return;
        try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
                setUserProfile(userDoc.data() as UserProfile);
            } else {
                // Fallback if no user doc exists yet
                setUserProfile({ uid, name: 'Student', email: '', role: 'student' });
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
            if (currentUser) {
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
                const decoded = atob(token);
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

    return (
        <AuthContext.Provider value={{ user, userProfile, loading, signInWithToken, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};
