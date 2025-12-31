import { db } from './firebase';
import { doc, updateDoc, getDoc, increment, arrayUnion } from 'firebase/firestore';

export const LEVEL_THRESHOLDS = [
    0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500, 6600, 7800, 9100, 10500
];

export const GamificationService = {
    awardPoints: async (studentId: string, amount: number, reason: string) => {
        if (!db) return;

        const studentRef = doc(db, 'students', studentId);

        try {
            const studentSnap = await getDoc(studentRef);
            if (!studentSnap.exists()) return;

            const currentData = studentSnap.data();
            const currentXP = (currentData.xp || 0) + amount;
            const currentPoints = (currentData.points || 0) + amount;

            // Calculate new level
            let newLevel = currentData.level || 1;
            // Simple loop to find level based on XP
            for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
                if (currentXP >= LEVEL_THRESHOLDS[i]) {
                    newLevel = i + 1;
                }
            }

            await updateDoc(studentRef, {
                points: currentPoints,
                xp: currentXP,
                level: newLevel,
                // Optional: Store history of point awards in a subcollection or array if needed
            });

            return {
                newLevel,
                levelUp: newLevel > (currentData.level || 1)
            };

        } catch (error) {
            console.error("Error awarding points:", error);
            throw error;
        }
    },

    getLevelForXP: (xp: number) => {
        for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
            if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
        }
        return 1;
    }
};
