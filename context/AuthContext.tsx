
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { auth, db, firebaseConfig } from '../services/firebase';
import { User, onAuthStateChanged, signOut as firebaseSignOut, getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, getDocs, serverTimestamp, query, where, Timestamp, updateDoc } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { UserProfile, RoleDefinition, RoleType, Organization } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  roleDefinition: RoleDefinition | null;
  // SaaS Context
  currentOrganization: Organization | null;
  isSuperAdmin: boolean;

  loading: boolean;
  roles: RoleDefinition[];
  signOut: () => Promise<void>;
  can: (permission: string) => boolean;
  loginAsDemo: () => Promise<void>;
  switchRole: (role: RoleType) => Promise<void>;
  impersonateUser: (uid: string, email: string, role: RoleType) => Promise<void>;
  createSecondaryUser: (email: string, pass: string) => Promise<string>;
  // Missing properties used by PrivateRoute
  isAuthorized: boolean;
  authError: string | null;
  userRole: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default Roles if not in DB
const DEFAULT_ROLES: RoleDefinition[] = [
  {
    id: 'admin',
    label: 'Administrator',
    description: 'Full access to all system features.',
    permissions: ['*'],
    isSystem: true
  },
  {
    id: 'admission_officer',
    label: 'Admission Officer',
    description: 'Can manage students, enrollments, attendance and record payments.',
    permissions: [
      'dashboard.view',
      'students.view', 'students.edit', 'students.enroll',
      'classes.view',
      'attendance.manage',
      'finance.record_payment', 'finance.view', // Can see list but not totals (handled in UI)
      'expenses.view', // Allow viewing expenses but not totals
      'workshops.manage',
      'programs.view'
    ]
  },
  {
    id: 'accountant',
    label: 'Accountant',
    description: 'Full access to financial records and reports.',
    permissions: [
      'dashboard.view',
      'finance.*',
      'expenses.*', // Full expense management
      'students.view',
      'classes.view'
    ]
  },
  {
    id: 'instructor',
    label: 'Instructor',
    description: 'Can view classes, manage attendance, and manage curriculum.',
    permissions: [
      'dashboard.view',
      'classes.view',
      'attendance.manage',
      'students.view_basic', // Custom permission for restricted view
      'learning.view',
      'learning.manage', // Can create assignments and approve work
      'toolkit.view',
      'toolkit.manage',
      'media.view',
      'media.manage'
    ]
  },
  {
    id: 'content_manager',
    label: 'Content Manager',
    description: 'Manages marketing content and personal tasks. Cannot approve final content.',
    permissions: [
      'dashboard.view',
      'marketing.view',
      'marketing.create', // Can create/edit
      'team.view',
      'team.create',
    ]
  },
  {
    id: 'student',
    label: 'Student',
    description: 'Access to student portal and learning dashboard.',
    permissions: [
      'dashboard.view', // Needed to see dashboard link
      'dashboard.view_student', // Restricts dashboard content
      'learning.view',
      'learning.submit',
      'toolkit.view',
      'media.view',
      'pickup.view',
      'settings.view' // Needed to see profile settings
    ]
  },
  {
    id: 'parent',
    label: 'Parent',
    description: 'Access to child progress and payments.',
    permissions: [
      'dashboard.view',
      'dashboard.view_parent',
      'students.view_children',
      'finance.view_payments'
    ]
  }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [roleDefinition, setRoleDefinition] = useState<RoleDefinition | null>(null);
  const [roles, setRoles] = useState<RoleDefinition[]>(DEFAULT_ROLES);
  const [loading, setLoading] = useState(true);

  // Ref to track demo mode status across closures/effects to prevent auto-logout
  const isDemoMode = useRef(false);

  // 1. Sync Roles from Firestore (or seed if empty)
  useEffect(() => {
    if (!db) return;
    const firestore = db; // Capture strictly typed reference

    const unsubscribe = onSnapshot(collection(firestore, 'roles'), (snap) => {
      if (snap.empty) {
        // Seed default roles if empty
        DEFAULT_ROLES.forEach(role => {
          setDoc(doc(firestore, 'roles', role.id), role);
        });
      } else {
        const loadedRoles = snap.docs.map(d => d.data() as RoleDefinition);

        // Migration & Self-Healing Logic
        // Check for missing roles OR missing permissions in existing roles
        DEFAULT_ROLES.forEach(defRole => {
          const existingRole = loadedRoles.find(r => r.id === defRole.id);

          if (!existingRole) {
            console.log(`Seeding missing role: ${defRole.id}`);
            setDoc(doc(firestore, 'roles', defRole.id), defRole);
          } else {
            // Check if the existing role is missing any new permissions we added in code
            // We assume DEFAULT_ROLES contains the "source of truth" for required permissions
            const missingPerms = defRole.permissions.filter(p => !existingRole.permissions.includes(p));

            if (missingPerms.length > 0) {
              console.log(`Healing role ${defRole.id}: Adding missing permissions`, missingPerms);
              // Merge permissions
              const updatedPerms = Array.from(new Set([...existingRole.permissions, ...defRole.permissions]));
              updateDoc(doc(firestore, 'roles', defRole.id), {
                permissions: updatedPerms,
                description: defRole.description // Keep description updated too
              });
            }
          }
        });

        setRoles(loadedRoles);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Handle Auth State Changes
  useEffect(() => {
    if (!auth || !db) {
      setLoading(false);
      return;
    }
    const firestore = db; // Capture strictly typed reference

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        isDemoMode.current = false;

        // Check if we already have this user loaded to avoid flicker
        if (user?.uid === firebaseUser.uid) {
          setLoading(false);
          return;
        }

        setUser(firebaseUser);

        // Fetch Profile
        let profileData: UserProfile | null = null;

        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          profileData = userDocSnap.data() as UserProfile;
        } else {
          // Check if there is a pre-authorized profile by email
          const q = query(collection(firestore, 'users'), where('email', '==', firebaseUser.email));
          const querySnap = await getDocs(q);

          if (!querySnap.empty) {
            // Found a pre-created profile, update it with UID
            const existingDoc = querySnap.docs[0];
            profileData = existingDoc.data() as UserProfile;

            // Migrate to UID-based doc to secure it
            await setDoc(doc(firestore, 'users', firebaseUser.uid), {
              ...profileData,
              uid: firebaseUser.uid,
              lastLogin: serverTimestamp()
            });
          } else {
            // NO PROFILE FOUND.
            // Check if this is the FIRST USER EVER.
            const allUsersSnap = await getDocs(collection(firestore, 'users'));
            if (allUsersSnap.empty) {
              // Create First Admin & Default Organization
              console.log("Creating Tenant Zero...");
              // 1. Create Default Org
              const orgId = 'makerlab-academy';
              const defaultOrg: Organization = {
                id: orgId,
                name: 'MakerLab Academy',
                slug: 'makerlab',
                ownerUid: firebaseUser.uid,
                createdAt: serverTimestamp() as any,
                status: 'active',
                modules: { erp: true, makerPro: true, sparkQuest: true }
              };
              await setDoc(doc(firestore, 'organizations', orgId), defaultOrg);

              profileData = {
                uid: firebaseUser.uid,
                organizationId: orgId,
                email: firebaseUser.email || '',
                name: firebaseUser.displayName || 'Administrator',
                role: 'admin',
                status: 'active',
                createdAt: serverTimestamp() as any
              };
              await setDoc(doc(firestore, 'users', firebaseUser.uid), profileData);
            } else {
              // Create default Guest profile
              profileData = {
                uid: firebaseUser.uid,
                organizationId: '', // PENDING ASSIGNMENT
                email: firebaseUser.email || '',
                name: firebaseUser.displayName || 'New User',
                role: 'guest',
                status: 'active',
                createdAt: serverTimestamp() as any
              };
              await setDoc(doc(firestore, 'users', firebaseUser.uid), profileData);
            }
          }
        }

        setUserProfile(profileData);

        // 3. Fetch Organization
        if (profileData && profileData.organizationId) {
          const orgSnap = await getDoc(doc(firestore, 'organizations', profileData.organizationId));
          if (orgSnap.exists()) {
            setCurrentOrganization(orgSnap.data() as Organization);
          }
        } else if (profileData?.role === 'admin' && !profileData.organizationId) {
          // BACKWARDS COMPATIBILITY FOR EXISTING ADMIN
          // Force-load 'makerlab-academy' organization for legacy admins
          console.warn("Legacy Admin detected. Defaulting to 'makerlab-academy' for access.");
          try {
            // 1. Try to fetch the tenant zero org
            const orgSnap = await getDoc(doc(firestore, 'organizations', 'makerlab-academy'));
            if (orgSnap.exists()) {
              setCurrentOrganization(orgSnap.data() as Organization);
            } else {
              // 2. Fallback: Create a virtual org object so the app loads
              // This allows the admin to reach Settings > Migration
              console.warn("Tenant Zero not found. Using virtual fallback.");
              setCurrentOrganization({
                id: 'makerlab-academy',
                name: 'Makerlab Academy',
                slug: 'makerlab-academy',
                ownerEmail: profileData?.email || '',
                modules: { activeModules: ['erp', 'makerPro'] },
                subscription: { status: 'active', planId: 'legacy' },
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              } as any);
            }
          } catch (err) {
            console.error("Failed to recover legacy session", err);
          }
        }
      } else {
        // Only clear if we aren't in manual demo mode
        if (!isDemoMode.current) {
          setUser(null);
          setUserProfile(null);
          setRoleDefinition(null);
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [roles]);

  // Update role definition when roles state changes or user profile changes
  useEffect(() => {
    if (userProfile && roles.length > 0) {
      const def = roles.find(r => r.id === userProfile.role) || DEFAULT_ROLES.find(r => r.id === userProfile.role);
      setRoleDefinition(def || null);
    }
  }, [userProfile, roles]);

  const signOut = async () => {
    isDemoMode.current = false;
    setUser(null);
    setUserProfile(null);
    setRoleDefinition(null);
    if (auth) await firebaseSignOut(auth);
  };

  const loginAsDemo = async () => {
    setLoading(true);
    isDemoMode.current = true;

    // Simulate User
    const demoUser = {
      uid: 'demo-admin-id',
      email: 'demo@stemflow.com',
      displayName: 'Demo Administrator',
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
        signInProvider: 'password',
        claims: {},
        authTime: Date.now().toString(),
        issuedAtTime: Date.now().toString(),
        expirationTime: (Date.now() + 3600000).toString(),
      }),
      reload: async () => { },
      toJSON: () => ({}),
      phoneNumber: null,
      photoURL: null
    } as unknown as User;

    // Simulate Profile
    const demoProfile: UserProfile = {
      uid: 'demo-admin-id',
      organizationId: 'makerlab-academy', // Demo org
      email: 'demo@stemflow.com',
      name: 'Demo Admin',
      role: 'admin',
      status: 'active',
      createdAt: Timestamp.now(),
      lastLogin: Timestamp.now()
    };

    // Set State
    setUser(demoUser);
    setUserProfile(demoProfile);
    setRoleDefinition(roles.find(r => r.id === 'admin') || DEFAULT_ROLES[0]);

    setLoading(false);
  };

  const switchRole = async (role: RoleType) => {
    setLoading(true);
    isDemoMode.current = true;

    // Create mock profile based on role
    const mockProfile: UserProfile = {
      uid: `demo-${role}-id`,
      organizationId: 'makerlab-academy',
      email: `demo.${role}@stemflow.com`,
      name: `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`,
      role: role,
      status: 'active',
      createdAt: Timestamp.now(),
      lastLogin: Timestamp.now()
    };

    // Mock User object
    const mockUser = {
      uid: mockProfile.uid,
      email: mockProfile.email,
      displayName: mockProfile.name,
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
        signInProvider: 'password',
        claims: {},
        authTime: Date.now().toString(),
        issuedAtTime: Date.now().toString(),
        expirationTime: (Date.now() + 3600000).toString(),
      }),
      reload: async () => { },
      toJSON: () => ({}),
      phoneNumber: null,
      photoURL: null
    } as unknown as User;

    setUser(mockUser);
    setUserProfile(mockProfile);
    setRoleDefinition(roles.find(r => r.id === role) || DEFAULT_ROLES.find(r => r.id === role) || null);
    setLoading(false);
  };

  const impersonateUser = async (uid: string, email: string, role: RoleType = 'parent') => {
    setLoading(true);
    isDemoMode.current = true;

    // Fetch the REAL profile if it exists, otherwise create a mock one combined with real UID
    let targetProfile: UserProfile | null = null;
    if (db) {
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) {
          targetProfile = snap.data() as UserProfile;
        }
      } catch (e) {
        console.error("Error fetching impersonated profile:", e);
      }
    }

    if (!targetProfile) {
      // Fallback if profile doc is missing but we have UID (shouldn't happen for valid parents)
      targetProfile = {
        uid,
        organizationId: 'makerlab-academy', // Default for impersonation
        email,
        name: 'Impersonated User',
        role,
        status: 'active',
        createdAt: Timestamp.now(),
        lastLogin: Timestamp.now()
      };
    }

    // Create synthetic User object
    const syntheticUser = {
      uid: targetProfile.uid,
      email: targetProfile.email,
      displayName: targetProfile.name,
      emailVerified: true,
      isAnonymous: false,
      metadata: {},
      providerData: [],
      refreshToken: '',
      tenantId: null,
      delete: async () => { },
      getIdToken: async () => 'impersonation-token',
      getIdTokenResult: async () => ({
        token: 'impersonation-token',
        signInProvider: 'custom',
        claims: {},
        authTime: Date.now().toString(),
        issuedAtTime: Date.now().toString(),
        expirationTime: (Date.now() + 3600000).toString(),
      }),
      reload: async () => { },
      toJSON: () => ({}),
      phoneNumber: null,
      photoURL: null
    } as unknown as User;

    setUser(syntheticUser);
    setUserProfile(targetProfile);
    setRoleDefinition(roles.find(r => r.id === role) || DEFAULT_ROLES.find(r => r.id === role) || null);
    setLoading(false);
  };

  const createSecondaryUser = async (email: string, pass: string): Promise<string> => {
    // Use a unique name to prevent app duplication errors if cleanup fails
    const appName = `Secondary_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const secondaryApp = initializeApp(firebaseConfig, appName);
    const secondaryAuth = getAuth(secondaryApp);
    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
      return cred.user.uid;
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        throw new Error("User with this email already exists.");
      }
      throw err;
    } finally {
      // Always clean up the secondary app
      await deleteApp(secondaryApp).catch(console.error);
    }
  };

  const can = (permission: string): boolean => {
    if (!userProfile || userProfile.status !== 'active') return false;
    if (userProfile.role === 'admin') return true;
    if (!roleDefinition) return false;

    // Wildcard check
    if (roleDefinition.permissions.includes('*')) return true;

    // Exact match
    if (roleDefinition.permissions.includes(permission)) return true;

    // Partial wildcard (e.g. "finance.*" matches "finance.view")
    const [scope, action] = permission.split('.');
    if (roleDefinition.permissions.includes(`${scope}.*`)) return true;

    return false;
  };

  // Calculated Properties for PrivateRoute
  const isAuthorized = !!userProfile && userProfile.status === 'active' && !!roleDefinition;
  const userRole = userProfile?.role || null;
  const authError = !userProfile ? 'Profile not found' : userProfile.status !== 'active' ? 'Account inactive' : !roleDefinition ? 'Role not defined' : null;

  const isSuperAdmin = userProfile?.organizationId === 'makerlab-academy' && userProfile?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      user, userProfile, roleDefinition, loading, roles, signOut, can, loginAsDemo, switchRole, impersonateUser, createSecondaryUser,
      isAuthorized, authError, userRole, currentOrganization, isSuperAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
