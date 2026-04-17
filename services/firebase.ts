
import { initializeApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";
import { getStorage, FirebaseStorage } from "firebase/storage";

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
const firebaseConfig: FirebaseConfig = {
  apiKey: "AIzaSyCbSdElE-DXh83x02wszjfUcXl9z0iQj1A",
  authDomain: "edufy-makerlab.firebaseapp.com",
  projectId: "edufy-makerlab",
  storageBucket: "edufy-makerlab.firebasestorage.app",
  messagingSenderId: "273507751238",
  appId: "1:273507751238:web:c8306f6177654befa54147",
  measurementId: "G-KZV1Q7T1H2"
};

import { getMessaging, Messaging } from "firebase/messaging";

// State containers
let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;
let storage: FirebaseStorage | undefined;
let messaging: Messaging | undefined;
let initializationError: Error | null = null;

// Initialize Firebase
console.log('🔥 Initializing Firebase...');
try {
  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase App initialized:', app.name);

  db = getFirestore(app);
  console.log('✅ Firestore initialized:', db ? 'Connected' : 'Failed');

  auth = getAuth(app);
  console.log('✅ Auth initialized:', auth ? 'Connected' : 'Failed');

  try {
    storage = getStorage(app);
    console.log('✅ Storage initialized');
  } catch (e) {
    console.warn('⚠️ Firebase Storage could not be initialized:', e);
  }

  if (typeof window !== 'undefined') {
    try {
      messaging = getMessaging(app);
      console.log('✅ Messaging initialized');
    } catch (e) {
      console.warn('⚠️ Firebase Messaging could not be initialized:', e);
    }
  }

} catch (error) {
  console.error("❌ Firebase initialization failed:", error);
  initializationError = error as Error;
}

export { app, db, auth, storage, messaging, firebaseConfig, initializationError };
