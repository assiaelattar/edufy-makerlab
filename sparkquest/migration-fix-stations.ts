// TEMPORARY MIGRATION UTILITY - Run once to fix existing projects
// Add this button somewhere visible in SparkQuest (or run in console)

import { collection, getDocs, updateDoc, doc, Firestore } from 'firebase/firestore';
import { db } from './services/firebase';

const normalizeStation = (stationText: string): string => {
    const text = stationText.toLowerCase();
    if (text.includes('robot') || text.includes('electronic')) return 'robotics';
    if (text.includes('cod') || text.includes('saas') || text.includes('software')) return 'coding';
    if (text.includes('game')) return 'game_design';
    if (text.includes('video') || text.includes('multim')) return 'multimedia';
    if (text.includes('design') || text.includes('brand')) return 'branding';
    if (text.includes('engineer') || text.includes('diy') || text.includes('prototype')) return 'engineering';
    return 'general';
};

export const migrateProjectStations = async () => {
    console.log('🔧 Starting station migration...');

    try {
        if (!db) {
            console.error('❌ Database not initialized');
            return;
        }
        const firestore = db as Firestore;
        const projectsRef = collection(firestore, 'student_projects');
        const snapshot = await getDocs(projectsRef);

        let updated = 0;
        let skipped = 0;

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const oldStation = data.station;
            const newStation = normalizeStation(oldStation);

            if (oldStation !== newStation) {
                await updateDoc(doc(firestore, 'student_projects', docSnap.id), {
                    station: newStation
                });
                console.log(`✅ Updated ${docSnap.id}: "${oldStation}" → "${newStation}"`);
                updated++;
            } else {
                skipped++;
            }
        }

        console.log(`🎉 Migration complete! Updated: ${updated}, Skipped: ${skipped}`);
        alert(`Station migration complete!\\n\\nUpdated: ${updated} projects\\nSkipped: ${skipped} projects (already correct)`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        alert('Migration failed! Check console for details.');
    }
};

// TO RUN: Open browser console in SparkQuest and type:
// migrateProjectStations()
