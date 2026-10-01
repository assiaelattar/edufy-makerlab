import React, { useState } from 'react';
import { ArrowLeft, ArrowUpRight, BookOpen, CheckCircle2, ClipboardCheck, FolderKanban, Plus, Upload, UserRound } from 'lucide-react';
import type { ProjectTemplate, StudentProject } from '../../types';
import { learnerWorkspace, buildProfileAssignmentPatch } from '../../domain/instructorLearner';
import { projectProgress, workbenchStatus } from '../../domain/learnerWorkbench';
import { needsReview, pendingProofCount, reviewTime, reviewQueue } from '../../domain/projectReview';
import { projectAcademicYear, currentAcademicYear } from '../../utils/academicYear';
import { SparkbookDialog } from '../SparkbookDialog';
import { FactoryPage, FactoryPageHeader, factoryButton } from './FactoryPage';
import './instructor-learner.css';

export type LearnerWorkspaceData = ReturnType<typeof learnerWorkspace>;
const date = (value: unknown) => reviewTime(value) ? new Date(reviewTime(value)).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date not recorded';
const outcome = (value: string) => ({ published: 'Mission published', changes_requested: 'Mission changes requested', step_approved: 'Proof approved', step_changes_requested: 'Proof changes requested' }[value] || value.replaceAll('_', ' '));

/** Rendering only: canonical ownership, eligibility and persistence live outside this surface. */
export function InstructorLearnerWorkspace({ learner, data, onBack, onReview, onEdit, onCreate, onImport, onAssign, projectsReady = true, missionsReady = true, membershipsReady = true, notice }: {
  learner: any; data: LearnerWorkspaceData; onBack: () => void;
  onReview: (id: string, tab?: 'proof' | 'history') => void; onEdit: (project: StudentProject) => void;
  onCreate: (mode: 'standard' | 'showcase') => void; onImport: () => void; onAssign: () => void;
  projectsReady?: boolean; missionsReady?: boolean; membershipsReady?: boolean; notice?: React.ReactNode;
}) {
  const [section, setSection] = useState<'projects' | 'missions' | 'history'>('projects');
  const year = currentAcademicYear();
  const [selectedYear, setSelectedYear] = useState(year);
  const years = [...new Set([year, ...learner.projects.map(projectAcademicYear)])].sort().reverse() as string[];
  const projects: StudentProject[] = learner.projects.filter((project: StudentProject) => projectAcademicYear(project) === selectedYear);
  const waiting = [...new Map(reviewQueue(learner.projects).map(item => [item.project.id, item.project])).values()];
  return <FactoryPage className="sq-learner-desk">
    <FactoryPageHeader icon={UserRound} eyebrow="Instructor · learner workspace" title={learner.name}
      description="One place to follow builds, open submitted proof, and plan the next mission."
      actions={<><button type="button" className={factoryButton.secondary} onClick={onBack}><ArrowLeft size={17} /> All students</button><button type="button" className={factoryButton.primary} onClick={onAssign} disabled={!learner.assignable || !missionsReady}><Plus size={17} /> Assign mission</button></>}
      meta={<div className="sq-desk-placements">{!membershipsReady ? <span>Class information unavailable while loading or retrying.</span> : data.placements.length ? data.placements.map(item => <span key={item.id}>{item.program} · {item.grade} · {item.group}</span>) : <span>No active class enrollment. Direct mission assignment is still available.</span>}</div>} />
    {notice}
    {learner.identityIssue && <p className="sq-desk-warning" role="alert">{learner.identityIssue} Existing canonically owned work remains available.</p>}
    <div className="sq-desk-overview">
      <button type="button" className="sq-desk-summary sq-desk-blue" onClick={() => { setSection('projects'); setSelectedYear(year); }}><FolderKanban size={22} /><strong>{projectsReady ? data.current.length : '—'}</strong><span>Projects this year</span></button>
      <button type="button" className="sq-desk-summary sq-desk-amber" onClick={() => { if (waiting[0] && projectsReady) onReview(waiting[0].id); }} disabled={!projectsReady || !waiting.length}><ClipboardCheck size={22} /><strong>{projectsReady ? waiting.length : '—'}</strong><span>Builds needing review · all years</span></button>
      <button type="button" className="sq-desk-summary sq-desk-green" onClick={() => setSection('history')}><CheckCircle2 size={22} /><strong>{projectsReady ? learner.publishedCount : '—'}</strong><span>Published projects · all years</span></button>
    </div>
    {projectsReady && waiting.length > 0 && <section className="sq-desk-review-callout" aria-label="Pending learner reviews"><div><span className="sq-desk-kicker">Feedback comes first</span><h2>{waiting.length === 1 ? 'A build is waiting for you.' : `${waiting.length} builds are waiting for you.`}</h2><p>Open the submitted work before recording a decision. Past-year submissions are included.</p></div><button type="button" className={factoryButton.primary} onClick={() => onReview(waiting[0].id)}>Review latest work <ArrowUpRight size={17} /></button></section>}
    <nav className="sq-desk-sections" aria-label="Learner workspace sections">
      <button type="button" aria-pressed={section === 'projects'} onClick={() => setSection('projects')}><FolderKanban size={18} /> Projects & progress</button>
      <button type="button" aria-pressed={section === 'missions'} onClick={() => setSection('missions')}><BookOpen size={18} /> Available missions {missionsReady ? `(${data.missions.length})` : ''}</button>
      <button type="button" aria-pressed={section === 'history'} onClick={() => setSection('history')}><ClipboardCheck size={18} /> Review history {projectsReady ? `(${data.history.length})` : ''}</button>
    </nav>
    {section === 'projects' && <section aria-label="Learner projects">
      <div className="sq-desk-section-heading"><div><h2>Follow the build.</h2><p>Progress comes from this project’s saved steps, not its current mission template.</p></div><label>School year<select aria-label="Project school year" value={selectedYear} onChange={event => setSelectedYear(event.target.value)}>{years.map(value => <option key={value} value={value}>{value}{value === year ? ' · current' : ' · previous'}</option>)}</select></label></div>
      <div className="sq-desk-tools"><button type="button" className={factoryButton.secondary} disabled={!projectsReady || !learner.assignable} onClick={() => onCreate('standard')}><Plus size={17} /> Add supported project</button><button type="button" className={factoryButton.secondary} disabled={!projectsReady || !learner.assignable} onClick={() => onCreate('showcase')}><Plus size={17} /> Add showcase</button><button type="button" className={factoryButton.secondary} disabled={!projectsReady || !learner.assignable} onClick={onImport}><Upload size={17} /> Import portfolio</button></div>
      {!projectsReady ? <p className="sq-desk-empty" role="status">Projects are unavailable while loading or retrying. No empty portfolio is assumed.</p> : <div className="sq-desk-projects">{projects.map(project => {
        const progress = projectProgress(project);
        return <article key={project.id} className={`sq-desk-project ${needsReview(project) ? 'sq-desk-project-pending' : ''}`}>
          <div className="sq-desk-card-top"><span className={`sq-desk-badge ${needsReview(project) ? 'sq-desk-badge-amber' : project.status === 'published' ? 'sq-desk-badge-green' : 'sq-desk-badge-blue'}`}>{workbenchStatus(project.status)}</span><span>Updated {date(project.updatedAt || project.createdAt)}</span></div>
          <h3>{project.title || 'Untitled project'}</h3><p>{project.description || 'No project description recorded.'}</p>
          <div className="sq-desk-progress-label"><strong>{progress.done} of {progress.total} steps complete</strong><span>{progress.total ? `${progress.percent}%` : 'No roadmap recorded'}</span></div>
          <div className="sq-desk-progress" role="progressbar" aria-label={`${project.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}><span style={{ width: `${progress.percent}%` }} /></div>
          {project.status !== 'published' && <p className="sq-desk-next"><strong>Next saved step:</strong> {progress.next}</p>}
          {pendingProofCount(project) > 0 && <p className="sq-desk-proof-count">{pendingProofCount(project)} step proof{pendingProofCount(project) === 1 ? '' : 's'} awaiting review</p>}
          <div className="sq-desk-tools"><button type="button" className={needsReview(project) ? factoryButton.primary : factoryButton.secondary} onClick={() => onReview(project.id)}>{needsReview(project) ? 'Review submitted proof' : 'Open work & review history'} <ArrowUpRight size={17} /></button><button type="button" className={factoryButton.quiet} onClick={() => onEdit(project)}>Edit portfolio details</button></div>
        </article>;
      })}{!projects.length && <div className="sq-desk-empty"><h3>No projects in {selectedYear}.</h3><p>Check another school year or assign a mission. Assigned missions do not become projects until a learner starts building.</p></div>}</div>}
    </section>}
    {section === 'missions' && <section aria-label="Available learner missions"><div className="sq-desk-section-heading"><div><h2>Ready for the next spark.</h2><p>These missions match the learner’s verified account or active class audience.</p></div><button type="button" className={factoryButton.primary} disabled={!learner.assignable || !missionsReady} onClick={onAssign}><Plus size={17} /> Assign mission</button></div>
      {!missionsReady ? <p className="sq-desk-empty" role="status">Mission availability is unknown until the catalog and enrollments finish loading.</p> : <div className="sq-desk-projects">{data.missions.map(({ mission, projects: builds, direct }) => <article key={mission.id} className="sq-desk-project"><span className={`sq-desk-badge ${direct ? 'sq-desk-badge-blue' : 'sq-desk-badge-green'}`}>{direct ? 'Direct learner assignment' : 'Class assignment'}</span><h3>{mission.title}</h3><p>{mission.description || mission.hook || 'Open Missions to view the full brief.'}</p><p className="sq-desk-next">{builds.length ? `${builds.length} saved build${builds.length === 1 ? '' : 's'} · ${builds.map(build => `${projectAcademicYear(build)} / ${workbenchStatus(build.status)}`).join(', ')}` : 'Not started · ready in the learner’s mission list'}</p>{builds.length > 0 && <button type="button" className={factoryButton.secondary} onClick={() => onReview(builds[0].id)}>Open most recent build <ArrowUpRight size={17} /></button>}</article>)}{!data.missions.length && <p className="sq-desk-empty">No available missions match this learner. Assign a mission directly without changing enrollment.</p>}</div>}
    </section>}
    {section === 'history' && <section aria-label="Learner review timeline"><div className="sq-desk-section-heading"><div><h2>Every decision, in context.</h2><p>Saved instructor decisions across all school years. Open a project to inspect its proof snapshot.</p></div></div>
      {!projectsReady ? <p className="sq-desk-empty" role="status">Review history is unavailable while projects load.</p> : <div className="sq-desk-history">{data.history.map(({ project, review }) => <article key={`${project.id}:${review.id}`}><span className={`sq-desk-badge ${review.outcome.includes('changes') ? 'sq-desk-badge-amber' : 'sq-desk-badge-green'}`}>{outcome(review.outcome)}</span><h3>{project.title}{review.stepTitle ? ` · ${review.stepTitle}` : ''}</h3><p>{review.feedback || 'No written feedback recorded.'}</p><small>{date(review.reviewedAt)} · {review.reviewedByName || 'Instructor'} · {projectAcademicYear(project)}</small><button type="button" className={factoryButton.secondary} onClick={() => onReview(project.id, 'history')}>Open project & proof history <ArrowUpRight size={17} /></button></article>)}{!data.history.length && <p className="sq-desk-empty">No saved instructor decisions yet. Legacy progress alone is not a review record.</p>}</div>}
    </section>}
  </FactoryPage>;
}

export function ProfileMissionAssignmentDialog({ learner, templates, data, organizationId, onClose, onAssign }: { learner: any; templates: ProjectTemplate[]; data: LearnerWorkspaceData; organizationId: string; onClose: () => void; onAssign: (missionId: string) => Promise<unknown> }) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [savedTitle, setSavedTitle] = useState('');
  const eligible = templates.filter(mission => mission.organizationId === organizationId && mission.status !== 'archived');
  const reason = (mission: ProjectTemplate) => {
    if (!learner.assignable) return learner.identityIssue || 'Learner unavailable.';
    if (data.missions.some(item => item.mission.id === mission.id)) return 'Already available to this learner.';
    try { buildProfileAssignmentPatch(mission, learner.id, organizationId); return ''; } catch (cause) { return cause instanceof Error ? cause.message : 'Mission unavailable.'; }
  };
  const selected = eligible.find(mission => mission.id === selectedId);
  const save = async () => {
    if (!selected || busy || reason(selected)) return;
    setBusy(true); setError('');
    try { await onAssign(selected.id); setSavedTitle(selected.title); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Assignment could not be saved. Retry.'); } finally { setBusy(false); }
  };
  return <SparkbookDialog title={savedTitle ? 'Mission assigned' : 'Choose the next mission'} eyebrow="Instructor · individual assignment" tone="blue" size="lg" onClose={() => { if (!busy) onClose(); }} bodyClassName="sq-learner-desk sq-desk-assignment"
    description={`Assign to ${learner.name}. Existing class and learner audiences stay intact.`}
    footer={savedTitle ? <button type="button" className={factoryButton.primary} onClick={onClose}>Back to learner workspace</button> : <><button type="button" className={factoryButton.secondary} disabled={busy} onClick={() => confirming ? setConfirming(false) : onClose()}>{confirming ? 'Change mission' : 'Cancel'}</button><button type="button" className={factoryButton.primary} disabled={busy || !selected || Boolean(selected && reason(selected))} onClick={() => confirming ? void save() : setConfirming(true)}>{busy ? 'Saving assignment…' : confirming ? 'Confirm assignment' : 'Review assignment'}</button></>}>
    {error && <p className="sq-desk-warning" role="alert">{error} The mission selection is preserved.</p>}
    {savedTitle ? <div className="sq-desk-saved" role="status"><CheckCircle2 size={36} /><h2>{savedTitle}</h2><p>The assignment is saved. It is available to this learner in their mission list. No enrollment or project progress was changed.</p></div> : confirming && selected ? <div className="sq-desk-confirm"><span className="sq-desk-badge sq-desk-badge-blue">One learner · additive assignment</span><h2>{selected.title}</h2><p><strong>For:</strong> {learner.name}</p><p>Only this learner is added. Existing class and individual audiences, previous builds, and review history are preserved.</p><p>Assigning makes the mission available. It does not create a build or mark any step complete.</p></div> : <><label className="sq-desk-search">Search missions<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search a mission title" /></label><div className="sq-desk-mission-picker">{eligible.filter(mission => mission.title.toLowerCase().includes(search.trim().toLowerCase())).map(mission => { const disabledReason = reason(mission); return <label key={mission.id} className="sq-desk-mission-option"><input type="radio" name="learner-mission" value={mission.id} checked={selectedId === mission.id} disabled={Boolean(disabledReason)} onChange={() => { setSelectedId(mission.id); setError(''); }} /><span><strong>{mission.title}</strong><small>{disabledReason || `${mission.status === 'assigned' || mission.status === 'featured' ? 'Live mission' : 'Ready draft'} · can be assigned to this learner`}</small></span></label>; })}{!eligible.some(mission => mission.title.toLowerCase().includes(search.trim().toLowerCase())) && <p>No missions match. Create or complete a mission in Missions first.</p>}</div></>}
  </SparkbookDialog>;
}
