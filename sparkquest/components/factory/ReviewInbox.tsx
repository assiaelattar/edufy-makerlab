import React, { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { useFactoryData } from '../../hooks/useFactoryData';
import { reviewQueue } from '../../domain/projectReview';
import type { StudentProject } from '../../types';
import { FactoryPage, FactoryPageHeader } from './FactoryPage';
import { reviewDate } from './ReviewModal';
import './review-workspace.css';

interface QueueProps {
  projects: StudentProject[];
  students?: any[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onReviewProject: (id: string, stepId?: string) => void;
}
export function ReviewQueuePanel({ projects, students = [], loading, error, onRetry, onReviewProject }: QueueProps) {
  const [search, setSearch] = useState('');
  const studentName = (project: StudentProject) => students.find(item => item.id === project.studentId || item.loginInfo?.uid === project.studentId)?.name || project.studentName || 'Learner';
  const queue = reviewQueue(projects);
  const proofCount = queue.reduce((sum, item) => sum + item.pendingSteps.length, 0);
  const visible = queue.filter(item => [item.project.title, studentName(item.project), ...item.pendingSteps.map(step => step.title)].join(' ').toLowerCase().includes(search.trim().toLowerCase()));
  return <section className="sq-review-queue" aria-label="Review inbox">
    <label>Find a learner, project, or step<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search submitted work…" /></label>
    {loading ? <p role="status">Loading submitted projects…</p> : error ? <div className="sq-review-alert" role="alert"><p>{error}</p>{onRetry && <button type="button" onClick={onRetry}>Retry loading projects</button>}</div> : <>
      <p role="status">{queue.length} {queue.length === 1 ? 'project needs' : 'projects need'} review · {proofCount} step {proofCount === 1 ? 'proof' : 'proofs'} · newest submissions first</p>
      {visible.map(item => <article key={item.project.id}>
        <div><p className="sq-review-kicker">{studentName(item.project)}</p><h3>{item.project.title || 'Untitled project'}</h3><p>{item.pendingSteps.length ? `${item.pendingSteps.length} step proof${item.pendingSteps.length === 1 ? '' : 's'} awaiting review` : 'Final mission awaiting review'}{item.pendingSteps.length > 0 && item.projectSubmitted ? ' · Final mission also submitted' : ''}</p><p>{item.pendingSteps.map(step => step.title).join(' · ')}</p><p>{reviewDate(item.submittedAt)}</p></div>
        <button type="button" className="sq-review-primary" onClick={() => onReviewProject(item.project.id, item.pendingSteps[0]?.id)}>Open submitted work</button>
      </article>)}
      {!visible.length && <p>{queue.length ? 'No submissions match this search.' : 'No projects are waiting for review. New student submissions will appear here.'}</p>}
    </>}
  </section>;
}
export function ReviewInbox({ onReviewProject }: Pick<QueueProps, 'onReviewProject'>) {
  const { studentProjects, students, studentProjectsLoading, studentProjectsError, retryStudentProjects } = useFactoryData();
  return <FactoryPage><FactoryPageHeader icon={ClipboardCheck} eyebrow="Instructor review" title="Review inbox" description="Open the latest student proof, give a clear next action, and keep every decision in history." /><ReviewQueuePanel projects={studentProjects} students={students} loading={studentProjectsLoading} error={studentProjectsError} onRetry={retryStudentProjects} onReviewProject={onReviewProject} /></FactoryPage>;
}
