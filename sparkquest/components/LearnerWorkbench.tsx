import React, { useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, Hammer, MessageCircle, Pin, Sparkles } from 'lucide-react';
import type { ProjectTemplate, StudentProject } from '../types';
import { projectLane, projectProgress, selectWorkbench, workbenchStatus } from '../domain/learnerWorkbench';
import { getProjectIcon } from '../utils/MindsetLibrary';
import './learner-learning.css';
import './student-dashboard-experience.css';

const ProjectPicture = ({ project }: { project: StudentProject | ProjectTemplate }) => (project.thumbnailUrl || ('coverImage' in project && project.coverImage))
  ? <img src={project.thumbnailUrl || (project as StudentProject).coverImage} alt="" loading="lazy" />
  : <span aria-hidden="true">{getProjectIcon(project.title)}</span>;
const displayStation = (station?: string, labels?: Record<string, string>) => {
  const label = station && labels?.[station];
  return label || (station && !/^[a-z0-9_-]{18,24}$/i.test(station) ? station : 'Maker project');
};

interface WorkbenchProps {
  projects: StudentProject[];
  academicYear: string;
  stationLabels?: Record<string, string>;
  lastOpenedId?: string | null;
  onContinue: (id: string) => void;
  onPreview: (id: string) => void;
  onFieldLog: () => void;
  onDiscoverMissions?: () => void;
  onDelete?: (project: StudentProject) => void;
}

const isPersonal = (project: StudentProject) => ['free-build-template', 'showcase-template'].includes(project.templateId || '');
export function LearnerWorkbench({ projects, academicYear, stationLabels, lastOpenedId, onContinue, onPreview, onFieldLog, onDiscoverMissions, onDelete }: WorkbenchProps) {
  const [showAllBuilds, setShowAllBuilds] = useState(false);
  const { pinned, others, instructor } = selectWorkbench(projects, academicYear, lastOpenedId);
  const progress = pinned && projectProgress(pinned);
  const hasFeedback = instructor.some(project => projectLane(project.status) === 'feedback');
  const visibleOthers = showAllBuilds ? others : others.slice(0, 2);
  return <section className="sq-workbench" aria-labelledby="workbench-title">
    <div className="sq-workbench-heading"><div><p>Your workbench</p><h1 id="workbench-title">{pinned ? 'Pick up where you left off.' : instructor.length ? 'Your work is in review.' : 'Ready for your first build?'}</h1><span className="sq-workbench-heading-note">{pinned ? 'Your ideas are already in motion. Keep the momentum going.' : instructor.length ? 'See your instructor updates, then choose what to make next.' : 'Choose a mission and discover what you can create.'}</span></div><button type="button" onClick={onFieldLog}><BookOpen size={17} /> Field log <ArrowRight size={16} /></button></div>
    {pinned && progress ? <article className="sq-workbench-pin" aria-label={`Current build: ${pinned.title}`}>
      <div className="sq-workbench-copy">
        <div className="sq-workbench-tags"><span><Pin size={14} /> Current build</span><span>En cours · {workbenchStatus(pinned.status)}</span></div>
        <h2>{pinned.title}</h2>
        <div className="sq-workbench-next"><span className="sq-workbench-next-icon"><Sparkles size={22} /></span><div><strong>Your next move</strong><span>{progress.next}</span></div><span className="sq-workbench-next-count">{progress.total ? `${Math.min(progress.done + 1, progress.total)} / ${progress.total}` : 'Start'}</span></div>
        <div className="sq-workbench-progress"><span><strong>{progress.done}</strong> of {progress.total} steps complete</span><span>{progress.percent}%</span><div role="progressbar" aria-label={`${pinned.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}><i style={{ width: `${progress.percent}%` }} /></div></div>
        <div className="sq-workbench-actions"><button type="button" className="sq-workbench-primary" onClick={() => onContinue(pinned.id)}><Hammer size={19} /> Continue building <ArrowRight size={19} /></button><button type="button" onClick={() => onPreview(pinned.id)}>Project brief</button>{onDelete && isPersonal(pinned) && <button type="button" className="sq-workbench-remove" onClick={() => onDelete(pinned)} aria-label={`Delete ${pinned.title}`}>Delete project</button>}</div>
      </div>
      <div className="sq-workbench-picture"><ProjectPicture project={pinned} />{displayStation(pinned.station, stationLabels) !== 'Maker project' && <span>{displayStation(pinned.station, stationLabels)}</span>}</div>
    </article> : <div className="sq-workbench-empty"><Hammer size={28} /><div><h2>{instructor.length ? 'Your builds are with your instructor.' : 'Your next build starts here.'}</h2><p>{hasFeedback ? 'See your instructor feedback in Mentor, or discover a new mission.' : instructor.length ? 'View your submitted work in Mentor, or discover a new mission.' : 'Explore a mission, or start an idea of your own.'}</p></div>{onDiscoverMissions ? <button type="button" onClick={onDiscoverMissions}>Explore missions <ArrowRight size={17} /></button> : <a href="#learner-new-missions">Explore missions <ArrowRight size={17} /></a>}</div>}
    {others.length > 0 && <section className="sq-workbench-others" aria-labelledby="other-builds-title"><div className="sq-workbench-others-head"><h2 id="other-builds-title">Other ongoing builds <small>{others.length}</small></h2>{others.length > 2 && <button type="button" aria-expanded={showAllBuilds} aria-controls="other-builds-list" onClick={() => setShowAllBuilds(value => !value)}>{showAllBuilds ? 'Show fewer' : `View all ${others.length} builds`} <ArrowRight size={16} /></button>}</div><div id="other-builds-list">{visibleOthers.map(project => { const otherProgress = projectProgress(project); return <article key={project.id}><div className="sq-workbench-mini-picture"><ProjectPicture project={project} /></div><div><p>En cours · {workbenchStatus(project.status)}</p><h3>{project.title}</h3><span>{otherProgress.done}/{otherProgress.total} steps complete</span><div className="sq-workbench-mini-progress" role="progressbar" aria-label={`${project.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={otherProgress.percent}><i style={{ width: `${otherProgress.percent}%` }} /></div><button type="button" onClick={() => onContinue(project.id)}>Continue <ArrowRight size={16} /></button>{onDelete && isPersonal(project) && <button type="button" className="sq-workbench-remove" onClick={() => onDelete(project)} aria-label={`Delete ${project.title}`}>Delete project</button>}</div></article>; })}</div></section>}
  </section>;
}

interface MissionBoardProps {
  projects: StudentProject[];
  templates: Array<ProjectTemplate & { isLocked?: boolean }>;
  academicYear: string;
  stationLabels?: Record<string, string>;
  onDiscover: (template: ProjectTemplate) => void;
  onFieldLog: () => void;
  isFiltered?: boolean;
}

interface InstructorUpdatesProps {
  projects: StudentProject[];
  academicYear: string;
  onOpenProject: (id: string) => void;
  onPreview: (id: string) => void;
}

export function LearnerInstructorUpdates({ projects, academicYear, onOpenProject, onPreview }: InstructorUpdatesProps) {
  const { instructor } = selectWorkbench(projects, academicYear);
  return <>
    {instructor.length > 0 && <section className="sq-instructor-updates" aria-labelledby="instructor-updates-title"><div className="sq-workbench-section-head"><div><p>A message for your journey</p><h2 id="instructor-updates-title">With your instructor</h2></div><span>{instructor.length} {instructor.length === 1 ? 'update' : 'updates'}</span></div><div>{instructor.map(project => {
      const feedback = projectLane(project.status) === 'feedback';
      return <article key={project.id} className={feedback ? 'has-feedback' : ''}><span className="sq-instructor-state">{feedback ? <MessageCircle size={17} /> : <CheckCircle2 size={17} />}{workbenchStatus(project.status)}</span><h3>{project.title}</h3><p>{feedback ? project.feedback || 'Your instructor has asked for an improvement. Open your project to see the next action.' : 'Your work is submitted. You can view your proof while your instructor reviews it.'}</p><button type="button" onClick={() => feedback ? onOpenProject(project.id) : onPreview(project.id)}>{feedback ? 'See feedback' : 'View submission'} <ArrowRight size={16} /></button></article>;
    })}</div></section>}
  </>;
}

export function LearnerMissionBoard({ projects, templates, academicYear, stationLabels, onDiscover, onFieldLog, isFiltered }: MissionBoardProps) {
  const { finished } = selectWorkbench(projects, academicYear);
  return <>
    <section className="sq-launchpad" id="learner-new-missions" aria-labelledby="new-missions-title"><div className="sq-workbench-section-head"><div><p>Ready for your next adventure</p><h2 id="new-missions-title">New missions</h2></div><span>{templates.length} ready to discover</span></div>
      {templates.length ? <div className="sq-launchpad-grid">{templates.map(template => <article key={template.id} className={template.isLocked ? 'is-locked' : ''}>
        <div className="sq-launchpad-picture"><ProjectPicture project={template} /><span className="sq-launchpad-sticker"><Sparkles size={14} /> {template.isLocked ? 'Coming soon' : 'Ready to start'}</span></div>
        <div className="sq-launchpad-copy"><p>{displayStation(template.station, stationLabels)}</p><h3>{template.title}</h3><p>{template.description}</p><button type="button" disabled={template.isLocked} onClick={() => onDiscover(template)}>{template.isLocked ? 'Not open yet' : 'Discover mission'} <ArrowRight size={17} /></button></div>
      </article>)}</div> : <div className="sq-workbench-quiet"><p>{isFiltered ? 'No missions match your search. Clear it to see all available missions.' : 'No new missions assigned yet. Your ongoing builds stay on your workbench.'}</p></div>}
    </section>
    <div className="sq-workbench-log-link"><BookOpen size={22} /><p>{finished.length ? `${finished.length} finished ${finished.length === 1 ? 'build' : 'builds'} this year.` : 'Every build has a place in your story.'} Previous years live in your Field log.</p><button type="button" onClick={onFieldLog}>Open Field log <ArrowRight size={17} /></button></div>
  </>;
}
