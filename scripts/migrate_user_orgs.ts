// Migration script to add organizationId to existing user documents
// Run this once to update existing users in the 'users' collection

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCbSdElE-DXh83x02wszjfUcXl9z0iQj1A",
    authDomain: "edufy-makerlab.firebaseapp.com",
    projectId: "edufy-makerlab",
    storageBucket: "edufy-makerlab.firebasestorage.app",
    messagingSenderId: "273507751238",
    appId: "1:273507751238:web:c8306f6177654befa54147",
    measurementId: "G-KZV1Q7T1H2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Default organization ID for existing data
// Replace this with your actual organization ID
const DEFAULT_ORG_ID = 'makerlab-academy';

async function migrateUserOrganizations() {
    console.log('Starting user organization migration...');

    try {
        // Step 1: Get all students to find their organizationId
        console.log('\n1. Loading students data...');
        const studentsSnap = await getDocs(collection(db, 'students'));
        const studentOrgMap = new Map(); // Map student UID to organizationId
        const studentEmailMap = new Map(); // Map student email to organizationId

        studentsSnap.docs.forEach(doc => {
            const student = doc.data();
            const orgId = student.organizationId || DEFAULT_ORG_ID;

            if (student.loginInfo?.uid) {
                studentOrgMap.set(student.loginInfo.uid, orgId);
            }
            if (student.loginInfo?.email) {
                studentEmailMap.set(student.loginInfo.email.toLowerCase(), orgId);
            }
            if (student.email) {
                studentEmailMap.set(student.email.toLowerCase(), orgId);
            }

            // Also map parent info
            if (student.parentLoginInfo?.uid) {
                studentOrgMap.set(student.parentLoginInfo.uid, orgId);
            }
            if (student.parentLoginInfo?.email) {
                studentEmailMap.set(student.parentLoginInfo.email.toLowerCase(), orgId);
            }
        });

        console.log(`  Found ${studentOrgMap.size} UIDs and ${studentEmailMap.size} emails from students`);

        // Step 2: Get all users and update their organizationId
        console.log('\n2. Migrating users collection...');
        const usersSnap = await getDocs(collection(db, 'users'));
        let usersUpdated = 0;
        let usersSkipped = 0;
        let usersNotMatched = 0;

        for (const userDoc of usersSnap.docs) {
            const user = userDoc.data();

            // Skip if already has organizationId
            if (user.organizationId) {
                usersSkipped++;
                continue;
            }

            // Try to find organizationId
            let orgId = studentOrgMap.get(userDoc.id); // Try UID first

            if (!orgId && user.email) {
                orgId = studentEmailMap.get(user.email.toLowerCase()); // Try email
            }

            if (!orgId) {
                // If role is admin, use default org
                if (user.role === 'admin' || user.role === 'admission_officer' || user.role === 'accountant' || user.role === 'instructor') {
                    orgId = DEFAULT_ORG_ID;
                } else {
                    console.log(`  ⚠️  Could not find organizationId for user: ${user.email || userDoc.id} (role: ${user.role})`);
                    usersNotMatched++;
                    // Still assign default org to prevent login issues
                    orgId = DEFAULT_ORG_ID;
                }
            }

            await updateDoc(doc(db, 'users', userDoc.id), {
                organizationId: orgId
            });

            console.log(`  ✓ Updated user: ${user.email || user.name || userDoc.id} → ${orgId}`);
            usersUpdated++;
        }

        console.log(`\n✅ Migration completed!`);
        console.log(`\nSummary:`);
        console.log(`  - Users updated: ${usersUpdated}`);
        console.log(`  - Users skipped (already had organizationId): ${usersSkipped}`);
        console.log(`  - Users not matched with students (assigned default): ${usersNotMatched}`);

        if (usersNotMatched > 0) {
            console.log(`\n⚠️  Warning: ${usersNotMatched} users could not be matched with students.`);
            console.log(`   They were assigned the default organization: ${DEFAULT_ORG_ID}`);
            console.log(`   Please review these users manually if needed.`);
        }

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Run the migration
migrateUserOrganizations()
    .then(() => {
        console.log('\n🎉 All done! Students can now login to SparkQuest.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Migration failed:', error);
        process.exit(1);
    });
