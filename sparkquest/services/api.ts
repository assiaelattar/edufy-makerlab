import { db } from './firebase';
import { doc, setDoc, updateDoc, collection, addDoc, Firestore } from 'firebase/firestore';
import { StudentProject, User, Assignment } from '../types';

// Helper to simulate network latency (optional, reduced)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to normalize station names to match ERP's expected keys
const normalizeStation = (stationText: string): string => {
  const text = stationText.toLowerCase();
  if (text.includes('robot') || text.includes('electronic')) return 'robotics';
  if (text.includes('cod') || text.includes('saas') || text.includes('software')) return 'coding';
  if (text.includes('game')) return 'game_design';
  if (text.includes('video') || text.includes('multim')) return 'multimedia';
  if (text.includes('design') || text.includes('brand')) return 'branding';
  if (text.includes('engineer') || text.includes('diy') || text.includes('prototype')) return 'engineering';
  return 'general'; // Fallback for unrecognized stations
};

// --- API CLIENT ---

export const api = {
  /**
   * Initialize Session
   * (Depreated in favor of useMissionData hook, kept for interface compatibility if needed)
   */
  async initializeSession(token: string): Promise<any> {
    console.warn("api.initializeSession is deprecated. Use useMissionData hook.");
    return null;
  },

  /**
   * Sync Project State
   * Called whenever the student makes a significant change (chooses workflow, adds step).
   * Persists to Firestore 'student_projects' collection.
   * Now includes retry logic for network resilience.
   */
  async syncProject(project: StudentProject): Promise<{ success: boolean; error?: string }> {
    if (!project || !project.id) {
      return { success: false, error: 'Invalid project data' };
    }

    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 500;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (!db) throw new Error("Database not initialized");
        const firestore = db as Firestore;
        console.log(`[ERP] Syncing project state... (attempt ${attempt}/${MAX_RETRIES})`, project.id);
        const ref = doc(firestore, 'student_projects', project.id);

        // CRITICAL: Normalize station before saving to match ERP expectations
        const normalizedProject = {
          ...project,
          station: normalizeStation(project.station),
          updatedAt: new Date().toISOString()
        };

        console.log(`✅ [SparkQuest] Saving project with normalized station: "${project.station}" → "${normalizedProject.station}"`);

        // We use setDoc with merge to ensure we save it even if it's new
        await setDoc(ref, normalizedProject, { merge: true });

        console.log(`✅ [SparkQuest] Project saved successfully on attempt ${attempt}`);
        return { success: true };
      } catch (error: any) {
        console.error(`❌ [SparkQuest] Failed to sync project (attempt ${attempt}/${MAX_RETRIES}):`, error);

        if (attempt === MAX_RETRIES) {
          return { success: false, error: error.message || 'Failed to save after multiple attempts' };
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
      }
    }

    return { success: false, error: 'Failed to sync project' };
  },

  async submitStepEvidence(stepId: string, data: { note: string; image?: string }): Promise<boolean> {
    console.log(`[ERP] Submitting evidence for step ${stepId}`);

    // Create Notification for Instructor
    try {
      if (!db) return false;
      await setDoc(doc(collection(db as Firestore, 'notifications')), {
        type: 'submission',
        title: 'Mission Step Submitted',
        message: `A student submitted evidence for step: ${stepId}`,
        read: false,
        timestamp: new Date().toISOString(),
        entityId: stepId,
        link: '/review',
        userId: 'all' // Ensure all instructors see this
      });

      // Also update the step status in the project document is handled by syncProject usually,
      // but if we want to be explicit or if syncProject didn't catch specific fields:
      // We rely on the Frontend calling updateProject() -> syncProject() immediately after this.
      // So this function purely handles "Side Effects" like notifications.
    } catch (e) {
      console.error("Failed to send notification", e);
    }
    return true;
  }
};
