// ADD THIS TO BROWSER CONSOLE TO CREATE ENROLLMENT

// Run this in the browser console while on SparkQuest
async function createTestEnrollment() {
    const { db } = await import('./services/firebase.ts');
    const { collection, addDoc } = await import('firebase/firestore');

    // Replace these IDs with actual values from your Firestore
    const enrollment = {
        studentId: 'IzReENWAxVCQ3JMIGqvH4EdK3z', // Ajlane's ID
        gradeId: 'REPLACE_WITH_TINY_MAKERS_GRADE_ID', // Find this in Firestore grades collection
        programId: 'REPLACE_WITH_STEMQUEST_ID',
        groupId: '4',
        status: 'active',
        createdAt: new Date()
    };

    await addDoc(collection(db, 'enrollments'), enrollment);
    console.log('✅ Enrollment created!');
    location.reload(); // Refresh to load new enrollment
}

// Run: createTestEnrollment()
