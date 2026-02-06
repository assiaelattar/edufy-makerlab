// Migration script to add organizationId to existing workshop data
// Run this once to update existing workshops, slots, and bookings

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';

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

async function migrateWorkshopData() {
    console.log('Starting workshop data migration...');

    try {
        // Migrate Workshop Templates
        console.log('\n1. Migrating workshop_templates...');
        const templatesSnap = await getDocs(collection(db, 'workshop_templates'));
        let templatesUpdated = 0;
        let templatesSkipped = 0;

        for (const templateDoc of templatesSnap.docs) {
            const data = templateDoc.data();
            if (!data.organizationId) {
                await updateDoc(doc(db, 'workshop_templates', templateDoc.id), {
                    organizationId: DEFAULT_ORG_ID
                });
                console.log(`  ✓ Updated template: ${data.title || templateDoc.id}`);
                templatesUpdated++;
            } else {
                templatesSkipped++;
            }
        }
        console.log(`  Templates: ${templatesUpdated} updated, ${templatesSkipped} already had organizationId`);

        // Migrate Workshop Slots
        console.log('\n2. Migrating workshop_slots...');
        const slotsSnap = await getDocs(collection(db, 'workshop_slots'));
        let slotsUpdated = 0;
        let slotsSkipped = 0;

        // We need to get the organizationId from the template
        const templateMap = new Map();
        templatesSnap.docs.forEach(doc => {
            const data = doc.data();
            templateMap.set(doc.id, data.organizationId || DEFAULT_ORG_ID);
        });

        for (const slotDoc of slotsSnap.docs) {
            const data = slotDoc.data();
            if (!data.organizationId) {
                const orgId = templateMap.get(data.workshopTemplateId) || DEFAULT_ORG_ID;
                await updateDoc(doc(db, 'workshop_slots', slotDoc.id), {
                    organizationId: orgId
                });
                console.log(`  ✓ Updated slot: ${slotDoc.id}`);
                slotsUpdated++;
            } else {
                slotsSkipped++;
            }
        }
        console.log(`  Slots: ${slotsUpdated} updated, ${slotsSkipped} already had organizationId`);

        // Migrate Bookings
        console.log('\n3. Migrating bookings...');
        const bookingsSnap = await getDocs(collection(db, 'bookings'));
        let bookingsUpdated = 0;
        let bookingsSkipped = 0;

        for (const bookingDoc of bookingsSnap.docs) {
            const data = bookingDoc.data();
            if (!data.organizationId) {
                const orgId = templateMap.get(data.workshopTemplateId) || DEFAULT_ORG_ID;
                await updateDoc(doc(db, 'bookings', bookingDoc.id), {
                    organizationId: orgId
                });
                console.log(`  ✓ Updated booking: ${data.kidName || bookingDoc.id}`);
                bookingsUpdated++;
            } else {
                bookingsSkipped++;
            }
        }
        console.log(`  Bookings: ${bookingsUpdated} updated, ${bookingsSkipped} already had organizationId`);

        console.log('\n✅ Migration completed successfully!');
        console.log(`\nSummary:`);
        console.log(`  - Templates: ${templatesUpdated} updated`);
        console.log(`  - Slots: ${slotsUpdated} updated`);
        console.log(`  - Bookings: ${bookingsUpdated} updated`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Run the migration
migrateWorkshopData()
    .then(() => {
        console.log('\n🎉 All done! You can now deploy the updated application.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Migration failed:', error);
        process.exit(1);
    });
