import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc, writeBatch } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCbSdElE-DXh83x02wszjfUcXl9z0iQj1A",
    authDomain: "edufy-makerlab.firebaseapp.com",
    projectId: "edufy-makerlab",
    storageBucket: "edufy-makerlab.firebasestorage.app",
    messagingSenderId: "273507751238",
    appId: "1:273507751238:web:c8306f6177654befa54147",
    measurementId: "G-KZV1Q7T1H2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COLLECTIONS = [
    'students',
    'programs',
    'enrollments',
    'payments',
    'expenses',
    'expense_templates',
    'workshop_templates',
    'workshop_slots',
    'bookings',
    'attendance',
    'users', // Special handling for users?
    'tasks',
    'projects',
    'messages',
    'marketing_posts',
    'campaigns',
    'leads',
    'project_templates',
    'student_projects',
    'process_templates',
    'stations',
    'badges',
    'tool_links',
    'archive_links',
    'gallery_items',
    'assets',
    'pickup_queue'
];

async function migrate() {
    console.log("🚀 Starting Migration to Tenant Zero (makerlab-academy)...");

    for (const colName of COLLECTIONS) {
        console.log(`Processing ${colName}...`);
        const snap = await getDocs(collection(db, colName));

        if (snap.empty) {
            console.log(`- ${colName} is empty. Skipping.`);
            continue;
        }

        let batch = writeBatch(db);
        let count = 0;
        let totalUpdated = 0;

        for (const docSnap of snap.docs) {
            const data = docSnap.data();
            if (!data.organizationId) {
                const ref = doc(db, colName, docSnap.id);
                batch.update(ref, { organizationId: 'makerlab-academy' });
                count++;
            }

            if (count >= 400) {
                await batch.commit();
                totalUpdated += count;
                console.log(`  - Committed batch of ${count} updates for ${colName}`);
                batch = writeBatch(db);
                count = 0;
            }
        }

        if (count > 0) {
            await batch.commit();
            totalUpdated += count;
            console.log(`  - Committed final batch of ${count} updates for ${colName}`);
        }

        console.log(`✅ Finished ${colName}: Updated ${totalUpdated} docs.`);
    }

    console.log("🏁 Migration Complete!");
    console.log("\n IMPORTANT: Now run the AppContext refactor step.");
}

migrate().catch(console.error);
