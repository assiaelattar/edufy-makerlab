import { db } from './services/firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';

/**
 * CLEANUP SCRIPT - Delete all projects for a specific student
 * Run this once to clean the database
 */

/**
 * CLEANUP SCRIPT - WIPE ALL DATA
 * Deletes all projects and templates to reset the system.
 */
async function wipeAllData() {
    if (!db) {
        console.error('❌ Firestore not initialized');
        return;
    }

    if (!confirm('⚠️ DANGER: This will delete ALL student projects and templates. Are you sure?')) {
        return;
    }

    try {
        console.log('🧹 Starting Full System Wipe...');

        // 1. Delete Student Projects
        const projectsSnap = await getDocs(collection(db, 'student_projects'));
        console.log(`📚 Found ${projectsSnap.size} student projects`);
        for (const d of projectsSnap.docs) {
            await deleteDoc(doc(db, 'student_projects', d.id));
        }
        console.log('✅ Deleted all student projects');

        // 2. Delete Project Templates
        const templatesSnap = await getDocs(collection(db, 'project_templates'));
        console.log(`📋 Found ${templatesSnap.size} project templates`);
        for (const d of templatesSnap.docs) {
            await deleteDoc(doc(db, 'project_templates', d.id));
        }
        console.log('✅ Deleted all project templates');

        console.log('✨ System Cleaned Successfully');

    } catch (error) {
        console.error('❌ Wipe failed:', error);
    }
}

// Make it available globally
(window as any).wipeAllData = wipeAllData;

console.log('🧹 Cleanup script loaded.');
console.log('   Run wipeAllData() in console to delete ALL projects & templates.');
