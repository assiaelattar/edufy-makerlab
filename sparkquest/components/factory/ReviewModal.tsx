import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { ClipboardCheck, ExternalLink } from 'lucide-react';
import { useFactoryData } from '../../hooks/useFactoryData';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { submitInstructorReview } from '../../services/projectReview';
import { buildReviewPatch, effectiveStepReviewStatus, normalizedReviewStatus, proofKind, projectNeedsReview, reviewFingerprint, reviewTime, safeProofUrl, stepIsApproved, stepNeedsReview, stepReviewFeedback, type ReviewCommand } from '../../domain/projectReview';
import type { StudentProject } from '../../types';
import { SparkbookDialog } from '../SparkbookDialog';
import './review-workspace.css';

interface ReviewModalProps {
  projectId: string;
  onClose: () => void;
  initialStepId?: string;
  initialTab?: 'proof' | 'history';
  previewProject?: StudentProject;
  previewStudentName?: string;
}
export const reviewDate = (value: unknown) => reviewTime(value) ? new Date(reviewTime(value)).toLocaleString() : 'Submission time not recorded';
const statusLabel = (value: unknown) => ({ pending_review: 'Awaiting review', submitted: 'Awaiting review', rejected: 'Changes requested', done: 'Approved', changes_requested: 'Changes requested', published: 'Published' }[normalizedReviewStatus(value)] || String(value || 'Not started').replace(/_/g, ' '));
const outcomeLabel = { published: 'Mission approved & published', changes_requested: 'Mission changes requested', step_approved: 'Proof approved', step_changes_requested: 'Proof changes requested' };

export function ProofPreview({ url, mime, title }: { url?: string; mime?: string; title: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  const safe = safeProofUrl(url);
  if (!url) return <p className="sq-review-muted">No file attached. Read the student's note below.</p>;
  if (!safe) return <p role="alert">This attachment does not have a supported, safe URL.</p>;
  const kind = proofKind(safe, mime);
  return <div className="sq-review-proof">
    {!failed && kind === 'image' && <img src={safe} alt={title} onError={() => setFailed(true)} />}
    {!failed && kind === 'video' && <video src={safe} controls preload="metadata" onError={() => setFailed(true)} aria-label={title} />}
    {!failed && kind === 'audio' && <audio src={safe} controls preload="metadata" onError={() => setFailed(true)} aria-label={title} />}
    {kind === 'pdf' && <p>PDF attachment — open the original to read every page.</p>}
    {failed && <p role="status">The preview could not load. Open the original, or check file access before reviewing.</p>}
    <a href={safe} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /> {kind === 'link' ? 'Open submitted work' : 'Open original attachment'}</a>
  </div>;
}
interface ReviewWorkspaceProps {
  project: StudentProject;
  studentName?: string;
  initialStepId?: string;
  initialTab?: 'proof' | 'history';
  onClose: () => void;
  onReview: (command: ReviewCommand) => Promise<StudentProject>;
}
/** Pure surface also used by the local, write-free acceptance fixture. */
export function ReviewWorkspace({ project, studentName, initialStepId, initialTab = 'proof', onClose, onReview }: ReviewWorkspaceProps) {
  const firstStep = initialStepId || project.steps?.find(item => stepNeedsReview(item, project))?.id || '';
  const [selection, setSelection] = useState(() => ({ id: firstStep, token: reviewFingerprint(project, firstStep || undefined) }));
  const [tab, setTab] = useState<'proof' | 'history'>(initialTab);
  const [feedback, setFeedback] = useState('');
  const [xp, setXp] = useState(50);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState('');
  const step = project.steps?.find(item => item.id === selection.id);
  const changed = selection.token !== reviewFingerprint(project, selection.id || undefined);
  const waiting = step ? stepNeedsReview(step, project) : projectNeedsReview(project);
  const blockedPublication = !step && project.steps?.some(item => item.required !== false && !stepIsApproved(project, item));
  const select = (id: string) => {
    setSelection({ id, token: reviewFingerprint(project, id || undefined) });
    setFeedback(''); setError(null); setSaved(''); setTab('proof');
  };
  const decide = async (outcome: ReviewCommand['outcome']) => {
    if (busy || changed) return;
    setBusy(true); setError(null); setSaved('');
    try {
      const updated = await onReview({ id: `review-${crypto.randomUUID()}`, stepId: step?.id, outcome, feedback, xp: outcome === 'published' ? xp : undefined, expectedFingerprint: selection.token });
      setSelection({ id: selection.id, token: reviewFingerprint(updated, selection.id || undefined) });
      setSaved(`${outcomeLabel[outcome]}. The decision and submitted proof are saved in history.`);
      setFeedback('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The review could not be saved. Try again.'); }
    finally { setBusy(false); }
  };
  return <SparkbookDialog title={project.title || 'Project review'} eyebrow="Instructor · proof review" description={`Maker: ${studentName || project.studentName || 'Student'}`} icon={<ClipboardCheck size={24} />} size="xl" tone="blue" onClose={() => { if (!busy) onClose(); }} bodyClassName="sq-review-workspace">
    <nav className="sq-review-tabs" aria-label="Review sections">
      <button type="button" aria-pressed={tab === 'proof'} onClick={() => setTab('proof')}>Proof & progress</button>
      <button type="button" aria-pressed={tab === 'history'} onClick={() => setTab('history')}>Review history ({project.reviewHistory?.length || 0})</button>
    </nav>
    {error && <p className="sq-review-alert" role="alert">{error}</p>}
    {saved && <p className="sq-review-success" role="status">{saved}</p>}
    {tab === 'history' ? <section className="sq-review-history" aria-label="Review history">
      {!(project.reviewHistory || []).length && <p>No instructor decisions recorded yet.</p>}
      {[...(project.reviewHistory || [])].reverse().map(review => <article key={review.id}>
        <h3>{outcomeLabel[review.outcome] || review.outcome}</h3>
        <p>{review.stepTitle || 'Final mission'} · {review.reviewedByName || 'Instructor'} · {reviewDate(review.reviewedAt)}</p>
        {review.feedback && <blockquote>{review.feedback}</blockquote>}
        {review.xpAwarded !== undefined && <p>Completion reward: {review.xpAwarded} XP</p>}
        {review.submission?.note && <p className="sq-review-note">Student note at review: {review.submission.note}</p>}
        {review.submission?.evidence && <ProofPreview url={review.submission.evidence} mime={review.submission.evidenceMimeType} title={`Reviewed proof: ${review.stepTitle || project.title}`} />}
        {review.submission?.mediaUrls?.map((url, index) => <ProofPreview key={`${url}-${index}`} url={url} title={`Reviewed showcase ${index + 1}`} />)}
        {review.submission?.presentationUrl && <ProofPreview url={review.submission.presentationUrl} title="Reviewed project link" />}
      </article>)}
    </section> : <div className="sq-review-layout">
      <aside className="sq-review-roadmap" aria-label="Project progress">
        <p className="sq-review-kicker">Saved roadmap</p>
        <p>{(project.steps || []).filter(item => stepIsApproved(project, item)).length} of {project.steps?.length || 0} steps approved</p>
        {(project.steps || []).map((item, index) => <button type="button" key={item.id} disabled={busy} aria-pressed={selection.id === item.id} onClick={() => select(item.id)}>
          <span>{index + 1}. {item.title}</span><small>{statusLabel(effectiveStepReviewStatus(project, item))}</small>
        </button>)}
        <button type="button" disabled={busy} aria-pressed={!selection.id} onClick={() => select('')}><span>Final mission / showcase</span><small>{statusLabel(project.status)}</small></button>
      </aside>
      <section className="sq-review-content" aria-label="Submitted work">
        <header><p className="sq-review-kicker">{step ? 'Step proof' : 'Final submission'} · {statusLabel(step ? effectiveStepReviewStatus(project, step) : project.status)}</p><h3>{step?.title || 'Mission showcase'}</h3><p className="sq-review-muted">{reviewDate(step?.submittedAt || project.submittedAt)}</p></header>
        {changed && <div className="sq-review-alert" role="alert">This submission changed. Inspect the latest proof before deciding.<button type="button" disabled={busy} onClick={() => { setSelection({ id: selection.id, token: reviewFingerprint(project, selection.id || undefined) }); setError(null); }}>Review latest version</button></div>}
        {step ? <>
          {(step.objective || step.instructions || step.description) && <details><summary>What the student was asked to do</summary><p>{step.objective}</p><p>{step.instructions || step.description}</p></details>}
          <ProofPreview url={step.evidence} mime={step.evidenceMimeType} title={`Submitted proof: ${step.title}`} />
          <section><h4>Student's explanation</h4><p className="sq-review-note">{step.note || 'No explanation added.'}</p></section>
          {stepReviewFeedback(project, step) && <blockquote>Last instructor note: {stepReviewFeedback(project, step)}</blockquote>}
          {(step.submissionHistory?.length || 0) > 1 && <details><summary>Earlier submissions ({step.submissionHistory!.length - 1})</summary>{step.submissionHistory!.slice(0, -1).reverse().map(proof => <article key={proof.id}><p>{reviewDate(proof.submittedAt)}</p><p className="sq-review-note">{proof.note}</p><ProofPreview url={proof.evidence} mime={proof.evidenceMimeType} title="Earlier submitted proof" /></article>)}</details>}
        </> : <>
          {project.description && <p className="sq-review-note">{project.description}</p>}
          {(project.mediaUrls || []).map((url, index) => <ProofPreview key={`${url}-${index}`} url={url} title={`Showcase attachment ${index + 1}`} />)}
          {project.presentationUrl && <ProofPreview url={project.presentationUrl} title="Project link" />}
          {!project.presentationUrl && !project.mediaUrls?.length && <p>No separate showcase file. Inspect the saved step proofs using the roadmap.</p>}
          {project.feedback && <blockquote>Last mission feedback: {project.feedback}</blockquote>}
        </>}
        {waiting && <section className="sq-review-decision" aria-label="Instructor decision">
          <label>Feedback / next action<textarea value={feedback} disabled={busy} onChange={event => setFeedback(event.target.value)} placeholder="What worked? What should the student do next?" maxLength={4000} /></label>
          {!step && <label>Completion XP<input type="number" min={0} max={1000} step={1} value={xp} disabled={busy} onChange={event => setXp(Number(event.target.value))} /></label>}
          {blockedPublication && <p>Approve every required step proof before publishing this mission.</p>}
          <div className="sq-review-actions">
            <button type="button" className="sq-review-primary" disabled={busy || changed || blockedPublication} onClick={() => decide(step ? 'step_approved' : 'published')}>{busy ? 'Saving decision…' : step ? 'Approve this proof' : 'Approve & publish mission'}</button>
            <button type="button" disabled={busy || changed || !feedback.trim()} onClick={() => decide(step ? 'step_changes_requested' : 'changes_requested')}>Request changes</button>
          </div>
          <small>Changes require a clear next action. Decisions are saved with the proof you reviewed.</small>
        </section>}
      </section>
    </div>}
  </SparkbookDialog>;
}
function LocalReview({ previewProject, previewStudentName, onClose, initialStepId, initialTab }: ReviewModalProps) {
  const [project, setProject] = useState(previewProject!);
  return <ReviewWorkspace project={project} studentName={previewStudentName} initialStepId={initialStepId} initialTab={initialTab} onClose={onClose} onReview={async command => {
    const updated = { ...project, ...buildReviewPatch(project, command, { uid: 'preview-instructor', organizationId: project.organizationId!, role: 'instructor', name: 'Demo instructor' }, new Date().toISOString()) };
    setProject(updated); return updated;
  }} />;
}
function LiveReview({ projectId, onClose, initialStepId, initialTab }: ReviewModalProps) {
  const { students } = useFactoryData();
  const { user, userProfile } = useAuth();
  const [project, setProject] = useState<StudentProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setProject(null); setLoading(true); setError(null);
    if (!db || !user || !userProfile?.organizationId || !['admin', 'instructor'].includes(userProfile.role)) {
      setError('Your instructor session is unavailable. Sign in again.'); setLoading(false); return;
    }
    return onSnapshot(doc(db, 'student_projects', projectId), snapshot => {
      const record = snapshot.exists() ? { ...snapshot.data(), id: snapshot.id } as StudentProject : null;
      if (!record || record.organizationId !== userProfile.organizationId) { setError('This project is unavailable to your organization.'); setProject(null); }
      else { setProject(record); setError(null); }
      setLoading(false);
    }, () => { setProject(null); setLoading(false); setError('The project could not be opened. Check access or retry.'); });
  }, [projectId, user?.uid, userProfile?.organizationId, userProfile?.role, attempt]);
  if (!project || error) return <SparkbookDialog title="Open project review" onClose={onClose} tone="blue"><p role={error ? 'alert' : 'status'}>{loading ? 'Loading the latest submitted work…' : error}</p>{error && <button type="button" className="sq-review-primary" onClick={() => setAttempt(value => value + 1)}>Retry opening project</button>}</SparkbookDialog>;
  const student = students.find((item: any) => item.id === project.studentId || item.loginInfo?.uid === project.studentId);
  return <ReviewWorkspace key={projectId} project={project} studentName={student?.name} initialStepId={initialStepId} initialTab={initialTab} onClose={onClose} onReview={async command => {
    if (!db || !user || !userProfile) throw new Error('Sign in again before reviewing.');
    const updated = await submitInstructorReview(db, projectId, command, { uid: user.uid, organizationId: userProfile.organizationId, role: userProfile.role, name: userProfile.name || user.displayName || 'Instructor' });
    setProject(updated); return updated;
  }} />;
}
export const ReviewModal: React.FC<ReviewModalProps> = props => props.previewProject ? <LocalReview {...props} /> : <LiveReview {...props} />;
