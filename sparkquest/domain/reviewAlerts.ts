import type { StudentProject } from '../types.ts';
import { projectNeedsReview, reviewFingerprint, reviewTime, stepNeedsReview, stepSubmissionFingerprint } from './projectReview.ts';

export interface ReviewAlertEntry {
  key: string;
  projectId: string;
  studentId?: string;
  stepId?: string;
  learnerName: string;
  projectTitle: string;
  scopeLabel: string;
  submittedAt: number;
}

export const MAX_STORED_REVIEW_ALERTS = 240;

interface ReviewAlertStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

// Alert IDs are browser bookkeeping, not security tokens. Two independent
// 32-bit accumulators keep even legacy base64 proof fingerprints fixed-size.
export function compactReviewAlertKey(value: string): string {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ (code + index), 0x85ebca6b);
  }
  return `v2:${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}`;
}

export function normalizeSeenReviewAlertKeys(value: unknown, limit = MAX_STORED_REVIEW_ALERTS): string[] {
  if (!Array.isArray(value)) return [];
  const normalized = value
    .filter((key): key is string => typeof key === 'string' && Boolean(key))
    .map(key => /^v2:[0-9a-f]{16}$/i.test(key) ? key.toLowerCase() : compactReviewAlertKey(key));
  return Array.from(new Set(normalized)).slice(-limit);
}

export function readSeenReviewAlertKeys(storage: ReviewAlertStorage, storageKey: string): string[] {
  try {
    return normalizeSeenReviewAlertKeys(JSON.parse(storage.getItem(storageKey) || '[]'));
  } catch {
    return [];
  }
}

export function persistSeenReviewAlertKeys(storage: ReviewAlertStorage, storageKey: string, keys: Iterable<string>) {
  const normalized = normalizeSeenReviewAlertKeys(Array.from(keys));
  try {
    storage.setItem(storageKey, JSON.stringify(normalized));
    return { keys: normalized, persisted: true };
  } catch {
    // Browser storage can be full, blocked, or unavailable in private mode.
    // Alert delivery continues from the in-memory set for this session.
    return { keys: normalized, persisted: false };
  }
}

const learnerName = (project: StudentProject, students: any[]) => {
  const student = students.find(item => String(item.id) === String(project.studentId));
  return student?.name || student?.firstName || project.studentName || 'A student';
};

export function reviewAlertEntries(projects: StudentProject[], students: any[] = []): ReviewAlertEntry[] {
  const entries: ReviewAlertEntry[] = [];

  projects.forEach(project => {
    const name = learnerName(project, students);
    (project.steps || []).filter(step => stepNeedsReview(step, project)).forEach(step => {
      const rawKey = `${project.id}:step:${step.id}:${stepSubmissionFingerprint(step)}`;
      entries.push({
        key: compactReviewAlertKey(rawKey),
        projectId: project.id,
        studentId: project.studentId,
        stepId: step.id,
        learnerName: name,
        projectTitle: project.title || 'Untitled project',
        scopeLabel: step.title || 'Step proof',
        submittedAt: reviewTime(step.submittedAt || project.updatedAt || project.createdAt),
      });
    });

    if (projectNeedsReview(project)) {
      const rawKey = `${project.id}:project:${reviewFingerprint(project)}`;
      entries.push({
        key: compactReviewAlertKey(rawKey),
        projectId: project.id,
        studentId: project.studentId,
        learnerName: name,
        projectTitle: project.title || 'Untitled project',
        scopeLabel: 'Final mission',
        submittedAt: reviewTime(project.submittedAt || project.updatedAt || project.createdAt),
      });
    }
  });

  return entries.sort((a, b) => b.submittedAt - a.submittedAt || a.key.localeCompare(b.key));
}

