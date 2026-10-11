import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, CalendarDays, Car, CheckCircle2, CircleAlert, CreditCard, ExternalLink, Image as ImageIcon, LogOut, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import type { StudentProject } from '../types';
import { useParentFamily, type FamilyChild, type FamilyProject } from '../hooks/useParentFamily';
import { stepIsApproved, stepReviewFeedback } from '../domain/projectReview';
import { unavailableOperations, type FamilyOperations, type FamilySource } from '../domain/parentFamilyOperations';
import { projectEvidenceImages, resolveParentProjectImage } from '../domain/parentProjectVisual';
import { getProjectIcon } from '../utils/MindsetLibrary';
import './parent-family-workspace.css';

interface Props {
  parentUid: string;
  organizationId: string;
  parentName?: string;
  onSignOut: () => void;
  previewChildren?: FamilyChild[];
}

const statusLabel = (status?: string) => ({
  planning: 'Planning', building: 'Building', testing: 'Testing', delivered: 'Ready to review',
  submitted: 'With instructor', changes_requested: 'Improving', published: 'Published'
})[status || ''] || 'In progress';

const projectProgress = (project: StudentProject) => {
  const steps = Array.isArray(project.steps) ? project.steps : [];
  const finished = steps.filter(step => stepIsApproved(project, step)).length;
  return { finished, total: steps.length };
};

const ProjectPicture: React.FC<{ project: FamilyProject }> = ({ project }) => {
  const [failed, setFailed] = useState(false);
  const image = project.familyCoverImage || resolveParentProjectImage(project);
  useEffect(() => setFailed(false), [image]);
  return image && !failed
    ? <img src={image} alt={`${project.title || 'Learner'} project cover`} loading="lazy" onError={() => setFailed(true)} />
    : <span className="sq-family-project-fallback" aria-hidden="true"><b>{getProjectIcon(project.title || '')}</b><small>Project story</small></span>;
};

const formatMoney = (amount: number) => new Intl.NumberFormat('en', {
  style: 'currency', currency: 'MAD', maximumFractionDigits: 0
}).format(amount);

const formatDate = (value: string | null) => value
  ? new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00`))
  : null;

const pickupLabel = (status: string | null) => ({
  on_the_way: 'Picker is on the way', arrived: 'Picker is at the gate', released: 'Released by staff',
  confirmed: 'Pickup complete', cancelled: 'Pickup cancelled', exception: 'Staff review needed'
})[status || ''] || 'No pickup in progress';

const attendanceLabel = (status: string | null) => ({
  present: 'Present', absent: 'Absent', late: 'Late', excused: 'Excused'
})[status || ''] || 'No attendance yet';

const SourceCard = <T,>({ icon, label, source, ready, onRetry, tone }: {
  icon: React.ReactNode;
  label: string;
  source: FamilySource<T>;
  ready: (data: T) => React.ReactNode;
  onRetry: () => void;
  tone: 'citrus' | 'sky' | 'coral';
}) => <article className={`sq-family-source sq-family-source-${tone}`}>
  <div className="sq-family-source-head"><span>{icon}</span><strong>{label}</strong></div>
  {source.status === 'ready' ? ready(source.data) : <div className="sq-family-source-message">
    <b>{source.status === 'error' ? 'Couldn’t load' : 'Access not enabled'}</b>
    <p>{source.reason}</p>
    {source.status === 'error' && <button type="button" onClick={onRetry}><RefreshCw size={14} /> Retry</button>}
  </div>}
</article>;

const FamilyEssentials: React.FC<{ operations?: FamilyOperations; onRetry: () => void }> = ({ operations, onRetry }) => {
  const sources = operations || unavailableOperations();
  return <div className="sq-family-essentials">
    <div className="sq-family-subsection-title"><ShieldCheck size={18} /><span>Family essentials</span></div>
    <div className="sq-family-source-grid">
      <SourceCard icon={<CreditCard size={19} />} label="Payments" source={sources.finance} tone="citrus" onRetry={onRetry} ready={finance => <>
        <strong className="sq-family-source-value">{finance.enrollmentCount === 0 ? 'No charges yet' : finance.balance > 0 ? `${formatMoney(finance.balance)} remaining` : 'All settled'}</strong>
        <p>{finance.enrollmentCount > 0 ? `${formatMoney(finance.paid)} paid of ${formatMoney(finance.agreed)}` : 'No enrollment finance records are available.'}</p>
        {finance.pendingPaymentCount > 0 && <span className="sq-family-source-tag">{finance.pendingPaymentCount} awaiting verification</span>}
      </>} />
      <SourceCard icon={<CalendarDays size={19} />} label="Attendance" source={sources.attendance} tone="sky" onRetry={onRetry} ready={attendance => <>
        <strong className="sq-family-source-value">{attendanceLabel(attendance.latestStatus)}</strong>
        <p>{attendance.latestDate ? `${formatDate(attendance.latestDate)} · ${attendance.present} present · ${attendance.late} late` : 'New attendance records will appear here.'}</p>
        {attendance.absent > 0 && <span className="sq-family-source-tag">{attendance.absent} absent</span>}
      </>} />
      <SourceCard icon={<Car size={19} />} label="Pickup" source={sources.pickup} tone="coral" onRetry={onRetry} ready={pickup => <>
        <strong className="sq-family-source-value">{pickupLabel(pickup.status)}</strong>
        <p>{pickup.pickerName ? `${pickup.pickerName} · ${pickup.isPreviousDay ? 'open from ' : ''}${formatDate(pickup.sessionDate)}` : `Status for ${formatDate(pickup.sessionDate)}`}</p>
        <span className="sq-family-source-tag">{pickup.initiatedByCurrentGuardian === false ? 'Another guardian started this · actions wait for the shared release' : 'Pickup actions arrive with the coordinated release'}</span>
      </>} />
    </div>
  </div>;
};

export const ParentFamilyWorkspace: React.FC<Props> = ({ parentUid, organizationId, parentName, onSignOut, previewChildren }) => {
  const family = useParentFamily(previewChildren ? undefined : parentUid, previewChildren ? undefined : organizationId);
  const { children, loading, error, refresh } = previewChildren
    ? { children: previewChildren, loading: false, error: null, refresh: () => undefined }
    : family;
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);
  const projectCount = children.reduce((total, child) => total + child.projects.length, 0);
  const needsAttention = children.some(child => child.issue);

  return <main className="sq-family">
    <header className="sq-family-header">
      <div className="sq-family-brand"><span className="sq-family-brand-mark">✳</span><span>MakerLab <b>/ SparkQuest</b></span></div>
      <button type="button" className="sq-family-quiet-button" onClick={onSignOut}><LogOut size={17} /> Sign out</button>
    </header>

    <section className="sq-family-hero" aria-labelledby="family-title">
      <div>
        <p className="sq-family-eyebrow"><Sparkles size={16} /> Family workspace</p>
        <h1 id="family-title">Your family, all in one place.</h1>
        <p>Welcome{parentName ? `, ${parentName.split(' ')[0]}` : ''}. Follow every linked learner’s projects, payments, attendance, and today’s pickup status.</p>
        <p className="sq-family-signin-note"><ShieldCheck size={16} /> Use the MakerLab email and password shared by the academy. If you lose access, ask the team to issue a secure reset.</p>
      </div>
      <div className="sq-family-summary" aria-label="Family summary">
        <span><strong>{children.length}</strong> linked {children.length === 1 ? 'learner' : 'learners'}</span>
        <span><strong>{projectCount}</strong> {projectCount === 1 ? 'project' : 'projects'}</span>
      </div>
    </section>

    <div className="sq-family-content">
      <div className="sq-family-section-head">
        <div><p className="sq-family-eyebrow">Learning together</p><h2>Your learners</h2></div>
        <button type="button" className="sq-family-quiet-button" onClick={refresh} disabled={loading}><RefreshCw size={17} /> Refresh</button>
      </div>

      {loading && <div className="sq-family-state" role="status">Loading your family’s projects…</div>}
      {error && <div className="sq-family-alert" role="alert"><CircleAlert size={20} /><p>{error}</p><button type="button" onClick={refresh}>Try again</button></div>}
      {!loading && !error && children.length === 0 && <div className="sq-family-state"><BookOpen size={25} /><h3>No verified learner links yet</h3><p>Ask the academy to connect your children to this parent account in Edufy.</p></div>}
      {!loading && !error && needsAttention && <div className="sq-family-note" role="alert"><CircleAlert size={18} /><span>Some learning records need attention. Details appear with the affected learner below.</span></div>}

      {!loading && !error && children.map(child => <section className="sq-family-child" key={child.id} aria-labelledby={`child-${child.id}`}>
        <div className="sq-family-child-head">
          <div className="sq-family-avatar" aria-hidden="true">{child.name.slice(0, 1).toUpperCase()}</div>
          <div><p className="sq-family-eyebrow">Learner</p><h3 id={`child-${child.id}`}>{child.name}</h3></div>
          <span className="sq-family-child-count">{child.projects.length} {child.projects.length === 1 ? 'project' : 'projects'}</span>
        </div>
        {child.issue && <div className="sq-family-child-alert" role="alert"><CircleAlert size={17} /><span>{child.issue}</span></div>}
        <FamilyEssentials operations={child.operations} onRetry={refresh} />
        <div className="sq-family-subsection-title sq-family-learning-title"><BookOpen size={18} /><span>Projects & feedback</span></div>
        {child.projects.length === 0 && !child.issue && <p className="sq-family-empty">No projects yet. New work will appear here when this learner starts a project.</p>}
        {child.projects.length > 0 && <div className="sq-family-projects">{child.projects.map(project => {
          const progress = projectProgress(project);
          const isOpen = openProjectId === project.id;
          const steps = Array.isArray(project.steps) ? project.steps : [];
          const coverImage = project.familyCoverImage || resolveParentProjectImage(project);
          const evidenceImages = projectEvidenceImages(project).filter(url => url !== coverImage);
          return <article className={`sq-family-project${isOpen ? ' is-open' : ''}`} key={project.id}>
            <button type="button" className="sq-family-project-trigger" aria-expanded={isOpen} aria-controls={`family-project-${project.id}`} onClick={() => setOpenProjectId(isOpen ? null : project.id)}>
              <span className="sq-family-project-media"><ProjectPicture project={project} /><span>{statusLabel(project.status)}</span></span>
              <span className="sq-family-project-main"><strong>{project.title || 'Untitled project'}</strong>{project.description && <span>{project.description}</span>}<small>{progress.total ? `${progress.finished} of ${progress.total} steps finished` : 'Project in progress'}</small>{progress.total > 0 && <span className="sq-family-project-progress" role="progressbar" aria-label={`${project.title} progress`} aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.finished}><i style={{ width: `${Math.round((progress.finished / progress.total) * 100)}%` }} /></span>}</span>
              <ArrowRight className={isOpen ? 'is-open' : ''} size={19} />
            </button>
            {isOpen && <div className="sq-family-project-detail" id={`family-project-${project.id}`}>
              {project.description && <p>{project.description}</p>}
              {(evidenceImages.length > 0 || project.presentationUrl) && <section className="sq-family-evidence" aria-labelledby={`family-evidence-${project.id}`}><h4 id={`family-evidence-${project.id}`}><ImageIcon size={17} /> Project evidence</h4>{evidenceImages.length > 0 && <div className="sq-family-evidence-grid">{evidenceImages.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt={`${project.title} evidence ${index + 1}`} loading="lazy" /></a>)}</div>}{project.presentationUrl && <a className="sq-family-presentation-link" href={project.presentationUrl} target="_blank" rel="noreferrer">Open project presentation <ExternalLink size={15} /></a>}</section>}
              {steps.length > 0 && <div className="sq-family-steps"><h4>Build steps</h4><ol>{steps.map(step => <li key={step.id}><CheckCircle2 size={16} /><span><strong>{step.title}</strong>{step.note && <small>“{step.note}”</small>}{stepReviewFeedback(project, step) && <small>Instructor: {stepReviewFeedback(project, step)}</small>}</span></li>)}</ol></div>}
              {project.feedback && <div className="sq-family-feedback"><strong>Instructor feedback</strong><p>{project.feedback}</p></div>}
              {project.skills?.length > 0 && <div className="sq-family-skills">{project.skills.map(skill => <span key={skill}>{skill}</span>)}</div>}
            </div>}
          </article>;
        })}</div>}
      </section>)}
    </div>
  </main>;
};
