
import { initializeApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";

export interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId: string;
}

// Connected to the same 'edufy-makerlab' backend
const firebaseConfig: FirebaseConfig = {
    apiKey: "AIzaSyCbSdElE-DXh83x02wszjfUcXl9z0iQj1A",
    authDomain: "edufy-makerlab.firebaseapp.com",
    projectId: "edufy-makerlab",
    storageBucket: "edufy-makerlab.firebasestorage.app",
    messagingSenderId: "273507751238",
    appId: "1:273507751238:web:c8306f6177654befa54147",
    measurementId: "G-KZV1Q7T1H2"
};

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log('[MakerPro] Firebase initialized successfully');
} catch (error) {
    console.error("[MakerPro] Firebase initialization failed:", error);
}

export { app, db, auth };
