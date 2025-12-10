
import { initializeApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";

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

// State containers
let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;
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

} catch (error) {
  console.error("❌ Firebase initialization failed:", error);
  initializationError = error as Error;
}

export { app, db, auth, firebaseConfig, initializationError };
