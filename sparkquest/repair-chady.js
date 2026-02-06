// 🛠️ REPAIR SCRIPT FOR CHADY
// Copy and paste this ENTIRE block into the browser console (F12 > Console) while on the SparkQuest page.

async function repairChadyEnrollment() {
    console.log("🛠️ Starting Repair for Chady...");
    const { db } = await import('./services/firebase.ts');
    const { collection, getDocs, query, where, updateDoc, doc } = await import('firebase/firestore');
    const { getAuth } = await import('firebase/auth');

    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
        console.error("❌ You must be logged in as Chady to run this!");
        return;
    }

    console.log(`👤 Logged in as: ${user.email} (${user.uid})`);

    // 1. Find ANY enrollment for this email (even if ID is wrong)
    // Assuming we had some way to link them, but since we suspect the ID is wrong, we might need to search by something else.
    // Actually, let's search for enrollments that MIGHT match by program or just list them to see.
    // Since we can't easily guess the OLD ID, let's try to find Orphaned Enrollments if possible or just create a NEW proper one if missing.

    // Strategy: Just CREATE a new correct enrollment for him forcing the mission he needs.
    // Use the details provided in screens: "First Vibe Engineering App" sounds like a project title.
    // The MISSION/PROGRAM ID is likely "mission-engineering-vibe" or similar.
    // Let's try to query ALL enrollments and assume the one with matching Program is the target? No too risky.

    // Better Strategy: SEARCH for the project "First Vibe" and adopt it.
    const projQ = query(
        collection(db, 'student_projects'),
        where('title', '==', 'First Vibe Engineering App')
    );

    const snap = await getDocs(projQ);

    if (snap.empty) {
        console.log("❌ Could not find project 'First Vibe Engineering App'. Checking generally...");
    } else {
        snap.forEach(async (d) => {
            const data = d.data();
            console.log(`FOUND PROJECT: ${d.id} | Student: ${data.studentId} | Name: ${data.studentName}`);

            if (data.studentId !== user.uid) {
                console.log(`⚠️ Project belongs to OLD ID: ${data.studentId}. Migrating to NEW ID: ${user.uid}...`);
                await updateDoc(doc(db, 'student_projects', d.id), {
                    studentId: user.uid,
                    studentEmail: user.email, // Add email for future safety
                    studentName: user.displayName || 'Chady Cheddadi'
                });
                console.log("✅ Project MIGRATED successfully!");
            } else {
                console.log("✅ Project is already linked to current UID.");
            }
        });
    }

    // Also check for 'Build an app NFC Built-In'
    const projQ2 = query(collection(db, 'student_projects'), where('title', '==', 'Build an app NFC Built-In'));
    const snap2 = await getDocs(projQ2);
    snap2.forEach(async (d) => {
        const data = d.data();
        if (data.studentId !== user.uid) {
            console.log(`⚠️ Migrating NFC Project (${d.id}) to new UID...`);
            await updateDoc(doc(db, 'student_projects', d.id), {
                studentId: user.uid,
                studentEmail: user.email
            });
            console.log("✅ NFC Project Migrated.");
        }
    });

    console.log("🏁 Repair Scan Complete. Please refresh the page.");
}

repairChadyEnrollment();
