import { initializeApp, FirebaseApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore, Firestore, initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { connectAuthEmulator, getAuth, Auth } from "firebase/auth";
import { connectStorageEmulator, getStorage, FirebaseStorage } from "firebase/storage";

// Configuration type definition
export interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId: string;
}

// Your web app's Firebase configuration
const localDemoProject = import.meta.env.DEV && typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1'].includes(window.location.hostname) &&
    /^demo-[a-z0-9-]+$/.test(import.meta.env.VITE_LOCAL_FIREBASE_PROJECT_ID || '')
        ? import.meta.env.VITE_LOCAL_FIREBASE_PROJECT_ID as string : null;

const firebaseConfig: FirebaseConfig = {
    apiKey: "AIzaSyCbSdElE-DXh83x02wszjfUcXl9z0iQj1A",
    authDomain: "edufy-makerlab.firebaseapp.com",
    projectId: "edufy-makerlab",
    storageBucket: "edufy-makerlab.firebasestorage.app",
    messagingSenderId: "273507751238",
    appId: "1:273507751238:web:c8306f6177654befa54147",
    measurementId: "G-KZV1Q7T1H2",
    ...(localDemoProject ? { projectId: localDemoProject, authDomain: `${localDemoProject}.firebaseapp.com`, storageBucket: `${localDemoProject}.appspot.com` } : {})
};

// State containers
let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;
let storage: FirebaseStorage | undefined;
let initializationError: Error | null = null;

// Initialize Firebase
console.log('🔥 Initializing Firebase...');
try {
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase App initialized:', app.name);

    // 🛠️ STABILITY FIX: Force Memory Cache
    // The "Internal Assertion Failed" (ID: b815 / ca9) is caused by Corrupted IndexedDB.
    // We use initializeFirestore with memoryLocalCache to completely bypass the corrupted local storage.
    try {
        db = initializeFirestore(app, {
            localCache: memoryLocalCache()
        });
        console.log('✅ Firestore initialized with Memory Cache (Stability Mode)');
    } catch (e) {
        // Fallback if already initialized (though strictly we want to avoid mixed modes)
        console.warn('⚠️ Firestore already initialized, using existing instance');
        db = getFirestore(app);
    }
    if (localDemoProject && db) connectFirestoreEmulator(db, '127.0.0.1', 8080);

    // 🧹 SAFETY: Attempt to clear persistence if we suspect corruption (simple version: just log it, or try to clear if supported)
    // Note: clearIndexedDbPersistence() can only be called before any data access. 
    // Since we just initialized, we can try.
    // However, if the app is crashing, we might want to FORCE clear.
    // For now, let's keep it standard but with better initialization. 
    console.log('✅ Firestore initialized:', db ? 'Connected' : 'Failed');

    auth = getAuth(app);
    if (localDemoProject) connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    console.log('✅ Auth initialized:', auth ? 'Connected' : 'Failed');

    storage = getStorage(app);
    if (localDemoProject) connectStorageEmulator(storage, '127.0.0.1', 9199);
    console.log('✅ Storage initialized:', storage ? 'Connected' : 'Failed');

} catch (error) {
    console.error("❌ Firebase initialization failed:", error);
    initializationError = error as Error;
}

export { app, db, auth, storage, firebaseConfig, initializationError };
