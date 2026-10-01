import type { ProjectReview, ProjectStep, ProjectStepReviewState, StudentProject } from '../types.ts';

export const normalizedReviewStatus = (value: unknown) => String(value || '').trim().toLowerCase().replace(/[ -]+/g, '_');
export const stepSubmissionFingerprint = (step: ProjectStep) => JSON.stringify([
  step.evidence || '',
  step.evidenceMimeType || '',
  step.note || '',
  step.submittedAt || '',
  (step.submissionHistory || []).map(item => item.id),
]);
const hasSubmittedProof = (step: ProjectStep) => Boolean(step.submittedAt || step.submissionHistory?.length);
export function currentStepReview(project: StudentProject, step: ProjectStep): ProjectStepReviewState | undefined {
  const review = project.stepReviews?.[step.id];
  return review?.submissionFingerprint === stepSubmissionFingerprint(step) ? review : undefined;
}
export function effectiveStepReviewStatus(project: StudentProject, step: ProjectStep): string {
  const review = currentStepReview(project, step);
  if (review) return review.outcome === 'step_approved' ? 'done' : 'rejected';
  const storedStatus = normalizedReviewStatus(step.status);
  if (project.reviewProtocolVersion === 1) {
    if (hasSubmittedProof(step)) return 'pending_review';
    return ['done', 'rejected', 'pending_review', 'submitted'].includes(storedStatus) ? 'doing' : storedStatus;
  }
  return storedStatus;
}
export const stepReviewFeedback = (project: StudentProject, step: ProjectStep) => currentStepReview(project, step)?.feedback || (project.reviewProtocolVersion === 1 ? '' : step.reviewNotes || '');
export function stepIsApproved(project: StudentProject, step: ProjectStep): boolean {
  const review = currentStepReview(project, step);
  if (review) return review.outcome === 'step_approved';
  return project.reviewProtocolVersion === 1 ? false : normalizedReviewStatus(step.status) === 'done';
}
export const stepNeedsReview = (step: ProjectStep, project?: StudentProject) => {
  if (!project) return ['pending_review', 'submitted'].includes(normalizedReviewStatus(step.status));
  if (currentStepReview(project, step)) return false;
  if (project.reviewProtocolVersion === 1 && hasSubmittedProof(step)) return true;
  return ['pending_review', 'submitted'].includes(normalizedReviewStatus(step.status));
};
export const projectNeedsReview = (project: StudentProject) => ['submitted', 'pending_review'].includes(normalizedReviewStatus(project.status));
export const pendingProofCount = (project: StudentProject) => (project.steps || []).filter(step => stepNeedsReview(step, project)).length;
export const needsReview = (project: StudentProject) => projectNeedsReview(project) || pendingProofCount(project) > 0;
export function reviewTime(value: any): number {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000 + (value.nanoseconds || 0) / 1e6;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function reviewQueue(projects: StudentProject[]) {
  return projects.filter(needsReview).map(project => ({
    project,
    pendingSteps: (project.steps || []).filter(step => stepNeedsReview(step, project)).sort((a, b) => reviewTime(b.submittedAt) - reviewTime(a.submittedAt)),
    projectSubmitted: projectNeedsReview(project),
    submittedAt: Math.max(projectNeedsReview(project) ? reviewTime(project.submittedAt || project.updatedAt || project.createdAt) : 0,
      ...(project.steps || []).filter(step => stepNeedsReview(step, project)).map(step => reviewTime(step.submittedAt || project.updatedAt || project.createdAt))),
  })).sort((a, b) => b.submittedAt - a.submittedAt || a.project.id.localeCompare(b.project.id));
}

export function safeProofUrl(value?: string): string | null {
  if (!value) return null;
  // Existing raster data URLs remain viewable; never embed arbitrary SVG/HTML.
  if (/^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(value)) return value;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}
export function proofKind(value?: string, mime?: string): 'image' | 'video' | 'audio' | 'pdf' | 'link' {
  if (mime?.startsWith('image/') && mime !== 'image/svg+xml') return 'image';
  if (mime?.startsWith('video/')) return 'video';
  if (mime?.startsWith('audio/')) return 'audio';
  if (mime === 'application/pdf') return 'pdf';
  if (/^data:image\/(png|jpe?g|gif|webp);/i.test(value || '')) return 'image';
  let path = ''; try { path = decodeURIComponent(new URL(value || '').pathname); } catch { /* unknown legacy attachment */ }
  if (/\.(png|jpe?g|gif|webp|avif)$/i.test(path)) return 'image';
  if (/\.(mp4|webm|mov|ogv)$/i.test(path)) return 'video';
  if (/\.(mp3|wav|ogg|m4a)$/i.test(path)) return 'audio';
  return /\.pdf$/i.test(path) ? 'pdf' : 'link';
}

// Token binds a decision to the proof visible in the instructor's open panel.
export function reviewFingerprint(project: StudentProject, stepId?: string) {
  const step = stepId ? (project.steps || []).find(item => item.id === stepId) : null;
  return JSON.stringify(stepId
    ? [project.status, step?.status, step?.evidence, step?.note, step?.submittedAt, step?.submissionHistory?.map(item => item.id)]
    : [project.status, project.submittedAt, project.presentationUrl, project.mediaUrls, (project.steps || []).map(item => [item.id, item.status, item.evidence, item.note, item.submittedAt]), project.reviewHistory?.map(item => item.id)]);
}
export function learnerSaveFingerprint(project: StudentProject) {
  // Firestore map field order differs from JavaScript insertion order.
  const canonical = (value: any): any => value instanceof Date ? { time: value.getTime() }
    : value && typeof value.toMillis === 'function' ? { time: value.toMillis() }
    : Array.isArray(value) ? value.map(canonical)
    : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => [key, canonical(value[key])])) : value;
  const { updatedAt, ...content } = project;
  return JSON.stringify(canonical(content));
}

export function submittedProof(step: ProjectStep, evidence: string, note: string, submittedAt: string, mime?: string): ProjectStep {
  mime = mime || (evidence === step.evidence ? step.evidenceMimeType : undefined);
  const history = [...(step.submissionHistory || [])];
  if (!history.length && (step.evidence || step.note)) history.push({ id: `legacy-${step.id}`, submittedAt: step.submittedAt,
    evidence: step.evidence?.startsWith('http') ? step.evidence : undefined, note: step.note, evidenceMimeType: step.evidenceMimeType });
  history.push({ id: `proof-${step.id}-${submittedAt}`, submittedAt, evidence: evidence.startsWith('http') ? evidence : undefined, note, evidenceMimeType: mime });
  return { ...step, status: 'PENDING_REVIEW', evidence, note, evidenceMimeType: mime, submittedAt, reviewNotes: '', submissionHistory: history };
}

export interface ReviewActor { uid: string; organizationId: string; role: string; name?: string; studentId?: string }
export interface ReviewCommand { id: string; stepId?: string; outcome: ProjectReview['outcome']; feedback: string; xp?: number; expectedFingerprint: string }
export function buildReviewPatch(project: StudentProject, command: ReviewCommand, actor: ReviewActor, reviewedAt: string): Partial<StudentProject> {
  if (!actor.uid || !actor.organizationId || !['admin', 'instructor'].includes(actor.role) || project.organizationId !== actor.organizationId) throw new Error('Your instructor account cannot review this project.');
  if (!command.id || !['published', 'changes_requested', 'step_approved', 'step_changes_requested'].includes(command.outcome)) throw new Error('Choose a valid review decision.');
  if ((project.reviewHistory || []).some(review => review.id === command.id)) return {};
  if (reviewFingerprint(project, command.stepId) !== command.expectedFingerprint) throw new Error('This submission changed while you were reviewing. Reopen the latest proof before deciding.');
  const step = command.stepId ? (project.steps || []).find(item => item.id === command.stepId) : undefined;
  const isStep = command.outcome.startsWith('step_');
  if (isStep !== Boolean(command.stepId) || (isStep ? !step || !stepNeedsReview(step, project) : !projectNeedsReview(project))) throw new Error('This submission is no longer waiting for review.');
  if (command.outcome.endsWith('changes_requested') && !command.feedback.trim()) throw new Error('Add a clear next action for the student.');
  if (command.outcome === 'published' && (project.steps || []).some(item => item.required !== false && !stepIsApproved(project, item))) throw new Error('Approve all required step proofs before publishing the mission.');
  if (command.xp !== undefined && (!Number.isInteger(command.xp) || command.xp < 0 || command.xp > 1000)) throw new Error('Completion XP must be a whole number from 0 to 1000.');
  const review: ProjectReview = { id: command.id, scope: isStep ? 'step' : 'project', outcome: command.outcome, feedback: command.feedback.trim(), reviewedAt, reviewedById: actor.uid, reviewedByName: actor.name || 'Instructor',
    ...(step ? { stepId: step.id, stepTitle: step.title, submission: { evidence: step.evidence?.startsWith('http') ? step.evidence : undefined, evidenceMimeType: step.evidenceMimeType, note: step.note, submittedAt: step.submittedAt } } : { submission: { submittedAt: project.submittedAt, mediaUrls: project.mediaUrls, presentationUrl: project.presentationUrl } }),
    ...(command.outcome === 'published' ? { xpAwarded: command.xp ?? 50 } : {}) };
  const reviewHistory = [...(project.reviewHistory || []), review];
  if (step) {
    const stepReview: ProjectStepReviewState = { outcome: command.outcome as ProjectStepReviewState['outcome'], feedback: command.feedback.trim(), reviewedAt, reviewedById: actor.uid, reviewedByName: review.reviewedByName, submissionFingerprint: stepSubmissionFingerprint(step) };
    return { steps: project.steps.map(item => item.id === step.id ? { ...item, status: command.outcome === 'step_approved' ? 'done' : 'REJECTED', reviewedAt, reviewNotes: command.feedback.trim() } : item), reviewHistory, reviewProtocolVersion: 1, stepReviews: { ...(project.stepReviews || {}), [step.id]: stepReview } };
  }
  return { status: command.outcome as 'published' | 'changes_requested', feedback: command.feedback.trim(), reviewedAt, reviewedById: actor.uid, reviewedByName: review.reviewedByName, reviewHistory, ...(command.outcome === 'published' ? { xpReward: command.xp ?? 50 } : {}) };
}
