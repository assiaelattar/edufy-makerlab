import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, CalendarDays, Camera, Car, CheckCircle2, CircleAlert, CreditCard, ExternalLink, FileText, Image as ImageIcon, LogOut, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import type { ProjectStep, Resource, StudentProject } from '../types';
import { useParentFamily, type FamilyChild, type FamilyProject } from '../hooks/useParentFamily';
import { stepIsApproved, stepReviewFeedback } from '../domain/projectReview';
import { unavailableOperations, type FamilyOperations, type FamilySource } from '../domain/parentFamilyOperations';
import { isSafeFamilyHref, isSafeProjectImage, projectEvidenceImages, resolveParentProjectImage } from '../domain/parentProjectVisual';
import { getProjectIcon } from '../utils/MindsetLibrary';
import './parent-family-workspace.css';

interface Props {
  parentUid: string;
  organizationId: string;
  parentName?: string;
  onSignOut: () => void;
  previewChildren?: FamilyChild[];
}

type FamilySection = 'journey' | 'moments' | 'records' | 'pickup';
const sections: Array<{ id: FamilySection; label: string; icon: React.ReactNode }> = [
  { id: 'journey', label: 'Journey', icon: <BookOpen size={20} /> },
  { id: 'moments', label: 'Moments', icon: <Camera size={20} /> },
  { id: 'records', label: 'Records', icon: <CreditCard size={20} /> },
  { id: 'pickup', label: 'Pickup', icon: <Car size={20} /> }
];

const statusLabel = (status?: string) => ({
  planning: 'Planning', building: 'Building', testing: 'Testing', delivered: 'Ready to review',
  submitted: 'With instructor', changes_requested: 'Improving', published: 'Published'
})[status || ''] || 'In progress';

const projectProgress = (project: StudentProject) => {
  const steps = Array.isArray(project.steps) ? project.steps : [];
  return { finished: steps.filter(step => stepIsApproved(project, step)).length, total: steps.length };
};

const ProjectPicture: React.FC<{ project: FamilyProject }> = ({ project }) => {
  const [failed, setFailed] = useState(false);
  const image = project.familyCoverImage || resolveParentProjectImage(project);
  useEffect(() => setFailed(false), [image]);
  return image && !failed
    ? <img src={image} alt={(project.title || 'Learner') + ' project cover'} loading="lazy" onError={() => setFailed(true)} />
    : <span className="sq-family-project-fallback" aria-hidden="true"><b>{getProjectIcon(project.title || '')}</b><small>Project story</small></span>;
};

const formatMoney = (amount: number) => new Intl.NumberFormat('en', {
  style: 'currency', currency: 'MAD', maximumFractionDigits: 0
}).format(amount);

const formatDate = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(value.length === 10 ? value + 'T12:00:00' : value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
};

const pickupLabel = (status: string | null) => ({
  on_the_way: 'Picker is on the way', arrived: 'Picker is at the gate', released: 'Released by staff',
  confirmed: 'Pickup complete', cancelled: 'Pickup cancelled', exception: 'Staff review needed'
})[status || ''] || 'No pickup in progress';

const attendanceLabel = (status: string | null) => ({
  present: 'Present', absent: 'Absent', late: 'Late', excused: 'Excused'
})[status || ''] || 'No attendance yet';

const SafeAttachment: React.FC<{ url?: string; label: string }> = ({ url, label }) =>
  isSafeFamilyHref(url)
    ? <a className="sq-family-attachment" href={url} target="_blank" rel="noopener noreferrer"><FileText size={17} /><span>{label}</span><ExternalLink size={15} /></a>
    : null;

const ResourceLinks: React.FC<{ resources?: Resource[]; title: string }> = ({ resources, title }) => {
  const safe = (resources || []).filter(resource => isSafeFamilyHref(resource.url));
  if (!safe.length) return null;
  return <section className="sq-family-resource-section"><h5>{title}</h5><div className="sq-family-resource-list">{safe.map(resource =>
    <a key={resource.id} href={resource.url} target="_blank" rel="noopener noreferrer"><BookOpen size={17} /><span><strong>{resource.title}</strong>{resource.description && <small>{resource.description}</small>}</span><ExternalLink size={15} /></a>
  )}</div></section>;
};

const StepStory: React.FC<{ step: ProjectStep; project: FamilyProject }> = ({ step, project }) => {
  const approved = stepIsApproved(project, step);
  const feedback = stepReviewFeedback(project, step);
  const stepResources = [...(step.resources || []), ...(project.stepResources?.[step.id] || []), ...(step.phaseId ? project.stepResources?.[step.phaseId] || [] : [])];
  const uniqueResources = [...new Map(stepResources.map(resource => [resource.id, resource])).values()];
  const evidenceIsImage = Boolean(step.evidence && isSafeProjectImage(step.evidence) &&
    (step.evidenceMimeType?.startsWith('image/') || /^data:image\//i.test(step.evidence) || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(step.evidence)));
  return <li className="sq-family-step">
    <span className={'sq-family-step-mark' + (approved ? ' is-approved' : '')}><CheckCircle2 size={18} /></span>
    <div>
      <div className="sq-family-step-heading"><strong>{step.title}</strong><span>{approved ? 'Approved' : step.status === 'PENDING_REVIEW' ? 'With instructor' : step.status === 'REJECTED' ? 'Improving' : 'In progress'}</span></div>
      {(step.description || step.objective) && <p>{step.objective || step.description}</p>}
      {step.instructions && <p className="sq-family-step-instructions">{step.instructions}</p>}
      {step.checklist?.length > 0 && <ul className="sq-family-checklist">{step.checklist.map((item, index) => <li key={index}>{item}</li>)}</ul>}
      {step.note && <p className="sq-family-reflection"><b>Learner reflection</b> {step.note}</p>}
      {evidenceIsImage && <img className="sq-family-step-image" src={step.evidence} alt={step.title + ' uploaded proof'} loading="lazy" />}
      <SafeAttachment url={step.evidence} label="Open uploaded proof" />
      {step.evidence && !evidenceIsImage && !isSafeFamilyHref(step.evidence) && <p className="sq-family-history-count">This older proof format cannot be opened here. Ask the academy for a copy.</p>}
      {step.submissionHistory?.length > 1 && <details className="sq-family-proof-history"><summary>{step.submissionHistory.length} saved proof submissions</summary>
        <ol>{step.submissionHistory.map(item => <li key={item.id}><strong>{formatDate(item.submittedAt) || 'Saved proof'}</strong>{item.note && <p>{item.note}</p>}<SafeAttachment url={item.evidence} label="Open this submission" /></li>)}</ol>
      </details>}
      {feedback && <p className="sq-family-mentor-note"><b>Mentor feedback</b> {feedback}</p>}
      <ResourceLinks resources={uniqueResources} title="Resources for this step" />
    </div>
  </li>;
};

const ProjectStory: React.FC<{ project: FamilyProject; isOpen: boolean; onToggle: () => void }> = ({ project, isOpen, onToggle }) => {
  const progress = projectProgress(project);
  const steps = Array.isArray(project.steps) ? project.steps : [];
  const images = projectEvidenceImages(project).filter(url => url !== (project.familyCoverImage || resolveParentProjectImage(project)));
  return <article className={'sq-family-project' + (isOpen ? ' is-open' : '')}>
    <button type="button" className="sq-family-project-trigger" aria-expanded={isOpen} aria-controls={'family-project-' + project.id} onClick={onToggle}>
      <span className="sq-family-project-media"><ProjectPicture project={project} /><span>{statusLabel(project.status)}</span></span>
      <span className="sq-family-project-main"><strong>{project.title || 'Untitled project'}</strong>{project.station && <small>{project.station}{project.session ? ' · ' + project.session : ''}</small>}{project.description && <span>{project.description}</span>}<small>{progress.total ? progress.finished + ' of ' + progress.total + ' steps approved' : 'Project in progress'}</small>{progress.total > 0 && <span className="sq-family-project-progress" role="progressbar" aria-label={(project.title || 'Project') + ' progress'} aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.finished}><i style={{ width: Math.round(progress.finished / progress.total * 100) + '%' }} /></span>}</span>
      <ArrowRight className={isOpen ? 'is-open' : ''} size={19} />
    </button>
    {isOpen && <div className="sq-family-project-detail" id={'family-project-' + project.id}>
      <p className="sq-family-readonly"><ShieldCheck size={16} /> A window into the workshop. Only the learner and mentors can change this project.</p>
      {project.missionBrief && <section className="sq-family-brief">
        <h4>What they are building</h4>
        {project.missionBrief.goal && <p>{project.missionBrief.goal}</p>}
        {project.missionBrief.whyItMatters && <p><b>Why it matters</b> {project.missionBrief.whyItMatters}</p>}
        {project.missionBrief.finalOutcome && <p><b>Final outcome</b> {project.missionBrief.finalOutcome}</p>}
        {project.missionBrief.materials?.length > 0 && <p><b>Materials</b> {project.missionBrief.materials.join(' · ')}</p>}
      </section>}
      <ResourceLinks resources={project.resources} title="Workshop resources" />
      {(images.length > 0 || project.presentationUrl || project.videoUrl) && <section className="sq-family-evidence">
        <h4><ImageIcon size={17} /> Build media</h4>
        {images.length > 0 && <div className="sq-family-evidence-grid">{images.map((url, index) =>
          isSafeFamilyHref(url)
            ? <a key={url} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={(project.title || 'Project') + ' media ' + (index + 1)} loading="lazy" /></a>
            : <div key={url}><img src={url} alt={(project.title || 'Project') + ' media ' + (index + 1)} loading="lazy" /></div>
        )}</div>}
        <SafeAttachment url={project.presentationUrl} label="Open presentation" />
        <SafeAttachment url={project.videoUrl} label="Open project video" />
      </section>}
      {steps.length > 0 && <section className="sq-family-steps"><h4>Workshop journey</h4><ol>{steps.map(step => <StepStory key={step.id} step={step} project={project} />)}</ol></section>}
      {project.feedback && <div className="sq-family-feedback"><strong>Instructor feedback</strong><p>{project.feedback}</p></div>}
      {project.reviewHistory?.length > 0 && <section className="sq-family-review-history"><h4>Mentor review history</h4>{project.reviewHistory.map(review =>
        <div key={review.id}><strong>{review.outcome.replaceAll('_', ' ')}</strong><small>{formatDate(review.reviewedAt)}</small><p>{review.feedback}</p></div>
      )}</section>}
      {project.skills?.length > 0 && <div className="sq-family-skills">{project.skills.map(skill => <span key={skill}>{skill}</span>)}</div>}
    </div>}
  </article>;
};

const SourceMessage = <T,>({ source, onRetry }: { source: FamilySource<T>; onRetry: () => void }) =>
  source.status === 'ready' ? null : <div className="sq-family-source-message"><b>{source.status === 'error' ? 'Couldn’t load' : 'Access not enabled'}</b><p>{source.reason}</p>{source.status === 'error' && <button type="button" onClick={onRetry}><RefreshCw size={15} /> Retry</button>}</div>;

const RecordsSection: React.FC<{ operations: FamilyOperations; onRetry: () => void }> = ({ operations, onRetry }) => <div className="sq-family-record-grid">
  <section className="sq-family-panel"><h3><CreditCard size={20} /> Payments</h3><SourceMessage source={operations.finance} onRetry={onRetry} />
    {operations.finance.status === 'ready' && <><p className="sq-family-panel-lead">{operations.finance.data.balance > 0 ? formatMoney(operations.finance.data.balance) + ' remaining' : 'All settled'}</p>
      <p>{formatMoney(operations.finance.data.paid)} paid of {formatMoney(operations.finance.data.agreed)}</p>
      {operations.finance.data.enrollments.map(item => <div className="sq-family-record" key={item.id}><strong>{item.programName}</strong><small>{[item.packName, item.session].filter(Boolean).join(' · ')}</small><span>{formatMoney(item.paid)} paid · {formatMoney(item.balance)} remaining</span></div>)}
      {operations.finance.data.payments.length > 0 && <h4>Payment history</h4>}
      {operations.finance.data.payments.map(item => <div className="sq-family-record" key={item.id}><strong>{formatMoney(item.amount)} · {item.status.replaceAll('_', ' ')}</strong><small>{formatDate(item.date)}{item.method ? ' · ' + item.method : ''}</small></div>)}
      {operations.finance.data.enrollments.length === 0 && <p>No enrollment charges are recorded yet.</p>}
    </>}
  </section>
  <section className="sq-family-panel"><h3><CalendarDays size={20} /> Attendance</h3><SourceMessage source={operations.attendance} onRetry={onRetry} />
    {operations.attendance.status === 'ready' && <><p className="sq-family-panel-lead">{attendanceLabel(operations.attendance.data.latestStatus)}</p>
      <p>{operations.attendance.data.present} present · {operations.attendance.data.late} late · {operations.attendance.data.absent} absent</p>
      {operations.attendance.data.records.map((item, index) => <div className="sq-family-record sq-family-attendance-row" key={item.enrollmentId + item.date + index}><strong>{formatDate(item.date)}</strong><span>{attendanceLabel(item.status)}</span></div>)}
      {operations.attendance.data.records.length === 0 && <p>Attendance appears here after the first workshop session.</p>}
    </>}
  </section>
</div>;

const MomentsSection: React.FC<{ child: FamilyChild; onRetry: () => void }> = ({ child, onRetry }) => {
  const projectImages = child.projects.flatMap(project => projectEvidenceImages(project).map((url, index) => ({
    id: project.id + '-media-' + index, url, caption: project.title || 'Project moment'
  })));
  const stepImages = child.projects.flatMap(project => (project.steps || []).filter(step => step.evidence && isSafeProjectImage(step.evidence) &&
    (step.evidenceMimeType?.startsWith('image/') || /^data:image\//i.test(step.evidence) || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(step.evidence))).map(step => ({
      id: project.id + '-step-' + step.id, url: step.evidence!, caption: (project.title || 'Project') + ' · ' + step.title
    })));
  const gallery = child.media.status === 'ready' ? child.media.data.map(item => ({ id: item.id, url: item.url, caption: item.caption })) : [];
  const items = [...new Map([...gallery, ...projectImages, ...stepImages].map(item => [item.url, item])).values()];
  return <section className="sq-family-panel sq-family-moments"><h3><Camera size={20} /> Workshop moments</h3><p>Photos shared by mentors and proof saved by {child.name}. View only.</p>
    <SourceMessage source={child.media} onRetry={onRetry} />
    {items.length ? <div className="sq-family-moments-grid">{items.map(item => <figure key={item.id}><img src={item.url} alt={item.caption} loading="lazy" /><figcaption>{item.caption}</figcaption></figure>)}</div>
      : child.media.status === 'ready' && <p className="sq-family-empty">New workshop moments will appear here when photos or build proof are saved.</p>}
  </section>;
};

const PickupSection: React.FC<{ source: FamilyOperations['pickup']; onRetry: () => void }> = ({ source, onRetry }) => <section className="sq-family-panel sq-family-pickup">
  <h3><Car size={20} /> Pickup status</h3><SourceMessage source={source} onRetry={onRetry} />
  {source.status === 'ready' && <><p className="sq-family-panel-lead">{pickupLabel(source.data.status)}</p>
    <p>{source.data.pickerName ? source.data.pickerName + ' · ' : ''}{formatDate(source.data.sessionDate)}</p>
    {source.data.isPreviousDay && <p className="sq-family-note">This is an open pickup from the previous day. Ask the academy to confirm its status.</p>}
    <p className="sq-family-readonly"><ShieldCheck size={16} /> Status is view only. Contact MakerLab staff to change pickup arrangements.</p>
  </>}
</section>;

export const ParentFamilyWorkspace: React.FC<Props> = ({ parentUid, organizationId, parentName, onSignOut, previewChildren }) => {
  const family = useParentFamily(previewChildren ? undefined : parentUid, previewChildren ? undefined : organizationId);
  const { children, loading, error, refresh } = previewChildren
    ? { children: previewChildren, loading: false, error: null, refresh: () => undefined }
    : family;
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [section, setSection] = useState<FamilySection>('journey');
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);
  const activeHeadingRef = useRef<HTMLDivElement>(null);
  const selectedChild = children.find(child => child.id === selectedChildId) || children[0];
  const projectCount = children.reduce((total, child) => total + child.projects.length, 0);
  useEffect(() => setOpenProjectId(null), [selectedChild?.id, section]);
  const moveToContent = () => requestAnimationFrame(() => activeHeadingRef.current?.scrollIntoView({ block: 'start' }));

  const navigation = <nav className="sq-family-nav" aria-label="Parent sections">{sections.map(item =>
    <button key={item.id} type="button" className={section === item.id ? 'is-active' : ''} aria-current={section === item.id ? 'page' : undefined} onClick={() => { setSection(item.id); moveToContent(); }}>{item.icon}<span>{item.label}</span></button>
  )}</nav>;

  return <main className="sq-family">
    <header className="sq-family-header">
      <div className="sq-family-brand"><span className="sq-family-brand-mark">✳</span><span>MakerLab <b>/ SparkQuest</b></span></div>
      <button type="button" className="sq-family-quiet-button" onClick={onSignOut}><LogOut size={17} /> Sign out</button>
    </header>
    <section className="sq-family-hero" aria-labelledby="family-title">
      <div><p className="sq-family-eyebrow"><Sparkles size={16} /> Family journey</p><h1 id="family-title">See what they build.</h1>
        <p>Welcome{parentName ? ', ' + parentName.split(' ')[0] : ''}. Follow your children’s workshop stories, photos and the essentials in one place.</p>
        <p className="sq-family-signin-note"><ShieldCheck size={16} /> Your SparkQuest parent view is read only. MakerLab staff can issue a new password if you lose access.</p>
      </div>
      <div className="sq-family-summary" aria-label="Family summary"><span><strong>{children.length}</strong> linked {children.length === 1 ? 'learner' : 'learners'}</span><span><strong>{projectCount}</strong> {projectCount === 1 ? 'project' : 'projects'}</span></div>
    </section>
    <div className="sq-family-content">
      <div className="sq-family-section-head"><div><p className="sq-family-eyebrow">Their MakerLab journey</p><h2>Your family</h2></div><button type="button" className="sq-family-quiet-button" onClick={refresh} disabled={loading}><RefreshCw size={17} /> Refresh</button></div>
      {loading && <div className="sq-family-state" role="status">Loading your family’s projects…</div>}
      {error && <div className="sq-family-alert" role="alert"><CircleAlert size={20} /><p>{error}</p><button type="button" onClick={refresh}>Try again</button></div>}
      {!loading && !error && children.length === 0 && <div className="sq-family-state"><BookOpen size={25} /><h3>No verified learner links yet</h3><p>Ask the academy to connect your children to this parent account in Edufy.</p></div>}
      {!loading && !error && selectedChild && <>
        <div className="sq-family-child-switcher" role="group" aria-label="Choose a learner">{children.map(child =>
          <button key={child.id} type="button" className={child.id === selectedChild.id ? 'is-active' : ''} aria-pressed={child.id === selectedChild.id} onClick={() => { setSelectedChildId(child.id); moveToContent(); }}><span>{child.name.slice(0, 1).toUpperCase()}</span>{child.name}</button>
        )}</div>
        {selectedChild.issue && <div className="sq-family-child-alert" role="alert"><CircleAlert size={17} /><span>{selectedChild.issue}</span></div>}
        {navigation}
        <div className="sq-family-section-head sq-family-active-head" ref={activeHeadingRef}><div><p className="sq-family-eyebrow">{selectedChild.name}</p><h2>{sections.find(item => item.id === section)?.label}</h2></div><span className="sq-family-viewonly"><ShieldCheck size={16} /> View only</span></div>
        {section === 'journey' && <section aria-label={selectedChild.name + ' projects'}>{selectedChild.projects.length === 0
          ? <p className="sq-family-state">No projects yet. New work will appear when this learner starts a project.</p>
          : <div className="sq-family-projects">{selectedChild.projects.map(project => <ProjectStory key={project.id} project={project} isOpen={openProjectId === project.id} onToggle={() => setOpenProjectId(openProjectId === project.id ? null : project.id)} />)}</div>}</section>}
        {section === 'moments' && <MomentsSection child={selectedChild} onRetry={refresh} />}
        {section === 'records' && <RecordsSection operations={selectedChild.operations || unavailableOperations()} onRetry={refresh} />}
        {section === 'pickup' && <PickupSection source={(selectedChild.operations || unavailableOperations()).pickup} onRetry={refresh} />}
      </>}
    </div>
  </main>;
};
