import type { StudentProject } from '../types.ts';
import { projectAcademicYear } from '../utils/academicYear.ts';

const normalize = (status: string) => String(status || '').toLowerCase();
export const projectLane = (status: string): 'active' | 'feedback' | 'review' | 'finished' | 'other' => {
  const value = normalize(status);
  if (['planning', 'building', 'testing', 'in_progress', 'draft'].includes(value)) return 'active';
  if (value === 'changes_requested') return 'feedback';
  if (['submitted', 'pending_review'].includes(value)) return 'review';
  if (['published', 'delivered', 'completed', 'approved', 'done'].includes(value)) return 'finished';
  return 'other';
};

export const workbenchStatus = (status: string) => {
  const value = normalize(status);
  return ({ planning: 'Planning', building: 'Building', testing: 'Testing', in_progress: 'In progress', draft: 'Planning', changes_requested: 'Feedback received', submitted: 'Awaiting feedback', pending_review: 'Awaiting feedback' } as Record<string, string>)[value] || status.replaceAll('_', ' ');
};

const timestamp = (value: unknown): number => {
  if (!value) return 0;
  try {
    const candidate = value as { toMillis?: () => number; seconds?: number };
    const result = candidate.toMillis ? candidate.toMillis() : typeof candidate.seconds === 'number' ? candidate.seconds * 1000 : new Date(value as string).getTime();
    return Number.isFinite(result) ? result : 0;
  } catch { return 0; }
};
export const sortRecentProjects = (projects: StudentProject[]) => [...projects].sort((left, right) =>
  (timestamp(right.updatedAt) || timestamp(right.createdAt)) - (timestamp(left.updatedAt) || timestamp(left.createdAt)) || left.id.localeCompare(right.id)
);

export const selectWorkbench = (projects: StudentProject[], year: string, lastOpenedId?: string | null) => {
  const current = sortRecentProjects(projects.filter(project => projectAcademicYear(project) === year));
  const active = current.filter(project => projectLane(project.status) === 'active');
  const pinned = active.find(project => project.id === lastOpenedId) || active[0];
  return {
    pinned,
    others: active.filter(project => project.id !== pinned?.id),
    instructor: current.filter(project => ['feedback', 'review'].includes(projectLane(project.status))).sort((left, right) => Number(projectLane(right.status) === 'feedback') - Number(projectLane(left.status) === 'feedback')),
    finished: current.filter(project => projectLane(project.status) === 'finished'),
  };
};

export const projectProgress = (project: StudentProject) => {
  const steps = project.steps || [];
  const done = steps.filter(step => String(step.status).toLowerCase() === 'done' || String(step.status).toLowerCase() === 'completed').length;
  const next = steps.find(step => String(step.status).toLowerCase() === 'doing' || String(step.status).toLowerCase() === 'active') || steps.find(step => !['done', 'completed'].includes(String(step.status).toLowerCase()));
  return { done, total: steps.length, percent: steps.length ? Math.round(done / steps.length * 100) : 0, next: next?.title || (steps.length ? 'Review your proof and share your build' : 'Open your project to plan the next step') };
};

export const workbenchStorageKey = (organizationId?: string, studentId?: string | null) => organizationId && studentId
  ? `sparkquest:workbench:${encodeURIComponent(organizationId)}:${encodeURIComponent(studentId)}` : null;
export const readWorkbenchPin = (key: string | null) => {
  try { return key && typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null; } catch { return null; }
};
export const rememberWorkbenchPin = (key: string | null, id: string) => {
  try { if (key && typeof localStorage !== 'undefined') localStorage.setItem(key, id); } catch { /* Storage is optional; project access is not. */ }
};

/** Only verified owner aliases may reach this predicate; enrollment is not project ownership. */
export const isVerifiedOwnedProject = (project: StudentProject, organizationId: string, ownerIds: string[]) =>
  Boolean(organizationId && project.organizationId === organizationId && project.studentId && ownerIds.includes(project.studentId));

export const fieldLogYears = (projects: StudentProject[], currentYear: string) => Array.from(new Set(projects.map(projectAcademicYear).filter(year => year !== currentYear))).sort().reverse();
export const selectFieldLog = (projects: StudentProject[], currentYear: string, tab: 'current' | 'previous', year: string) =>
  sortRecentProjects(projects.filter(project => tab === 'previous' ? projectAcademicYear(project) === year : projectAcademicYear(project) === currentYear && projectLane(project.status) !== 'active'));
