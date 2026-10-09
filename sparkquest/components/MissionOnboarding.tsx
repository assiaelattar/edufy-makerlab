import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Clock3, ExternalLink, FlaskConical, Hammer, Lightbulb, PackageCheck, Play, Search, Share2, ShieldCheck, Sparkles, Target, Wrench } from 'lucide-react';
import type { ProcessTemplate, ProjectTemplate } from '../types';
import { resolveMissionContent } from '../domain/missionContent';
import './mission-onboarding.css';

interface MissionOnboardingProps {
  project: ProjectTemplate;
  workflow?: ProcessTemplate;
  onLaunch?: () => void;
  onBack?: () => void;
}

const chapters = ['Your mission', 'Why it matters', 'Think like an engineer', 'Get ready', 'Start building'];
const engineerSteps = [
  { label: 'Ask', detail: 'What are we trying to solve?', icon: Search },
  { label: 'Imagine', detail: 'What could work?', icon: Lightbulb },
  { label: 'Build', detail: 'Make a first version.', icon: Hammer },
  { label: 'Test', detail: 'Try it and improve it.', icon: FlaskConical },
  { label: 'Share', detail: 'Show what you learned.', icon: Share2 },
];

export function MissionOnboarding({ project, workflow, onLaunch, onBack }: MissionOnboardingProps) {
  const [chapter, setChapter] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [activeEngineeringStep, setActiveEngineeringStep] = useState(0);
  const [readyMaterials, setReadyMaterials] = useState<number[]>([]);
  const [showMore, setShowMore] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const content = resolveMissionContent(project, workflow);
  const coverImage = project.thumbnailUrl || '';
  const firstStep = content.steps[0];
  const selectedEngineeringStep = engineerSteps[activeEngineeringStep];
  const SelectedEngineeringIcon = selectedEngineeringStep.icon;
  const toggleMaterial = (index: number) => setReadyMaterials(current => current.includes(index) ? current.filter(value => value !== index) : [...current, index]);
  const goTo = (index: number) => {
    if (index === chapter) return;
    setDirection(index > chapter ? 'forward' : 'backward');
    setChapter(index);
  };
  const next = () => goTo(Math.min(chapter + 1, chapters.length - 1));
  const previous = () => goTo(Math.max(chapter - 1, 0));

  useEffect(() => {
    if (chapter > 0) heading.current?.focus();
  }, [chapter]);

  return <main className={`sq-onboard sq-onboard--${chapter}`}>
    <div className="sq-onboard-shell">
      <header className="sq-onboard-topbar">
        <button type="button" className="sq-onboard-exit" onClick={onBack} disabled={!onBack} aria-label="Back to missions"><ArrowLeft size={19} /> <span>All missions</span></button>
        <div className="sq-onboard-brand"><span><Sparkles size={19} /></span><strong>SparkQuest</strong><small>Mission briefing</small></div>
        <span className="sq-onboard-count">{chapter + 1} of {chapters.length}</span>
      </header>

      <nav className="sq-onboard-progress" aria-label="Mission introduction progress">
        {chapters.map((label, index) => <button key={label} type="button" className={index === chapter ? 'is-current' : index < chapter ? 'is-done' : ''} onClick={() => goTo(index)} aria-current={index === chapter ? 'step' : undefined} aria-label={`Go to ${label}, step ${index + 1} of ${chapters.length}`}><span /><small>{label}</small></button>)}
      </nav>

      <div className="sq-onboard-stage" key={chapter} data-direction={direction}>
        {chapter === 0 && <section className="sq-onboard-panel sq-onboard-welcome" aria-label="Mission introduction">
          <div className="sq-onboard-copy">
            <span className="sq-onboard-kicker"><Sparkles size={17} /> New maker mission</span>
            <h1 ref={heading} tabIndex={-1}>{project.title}</h1>
            <p className="sq-onboard-lead">{content.goal}</p>
            <div className="sq-onboard-meta"><span><Wrench size={16} /> {project.station || 'MakerLab'}</span>{project.duration && <span><Clock3 size={16} /> {project.duration}</span>}</div>
            <div className="sq-onboard-target"><span>Your build target</span><strong>{content.finalOutcome}</strong></div>
          </div>
          <div className="sq-onboard-image">{coverImage ? <img src={coverImage} alt="" /> : <div className="sq-onboard-image-fallback"><Wrench size={76} strokeWidth={1.5} /></div>}<span className="sq-onboard-image-sticker"><Target size={18} /> Your next build</span><span className="sq-onboard-image-spark" aria-hidden="true"><Sparkles size={26} /></span></div>
        </section>}

        {chapter === 1 && <section className="sq-onboard-panel sq-onboard-purpose" aria-label="Mission purpose">
          <div className="sq-onboard-copy">
            <span className="sq-onboard-kicker"><Lightbulb size={17} /> The reason</span>
            <h1 ref={heading} tabIndex={-1}>Why does this matter?</h1>
            <p className="sq-onboard-lead">{content.whyItMatters || content.goal}</p>
            <div className="sq-onboard-thought"><span><Search size={27} /></span><p>Look closely at the problem. Your idea starts there.</p></div>
          </div>
          <div className="sq-onboard-impact">
            <div className="sq-onboard-impact-picture">{coverImage ? <img src={coverImage} alt="" /> : <Wrench size={82} strokeWidth={1.5} />}<span><Target size={19} /> The mission</span></div>
            <div className="sq-onboard-impact-answer"><span><ArrowRight size={17} /> Your maker response</span><strong>{content.finalOutcome}</strong></div>
          </div>
        </section>}

        {chapter === 2 && <section className="sq-onboard-panel sq-onboard-process" aria-label="Engineering process">
          <div className="sq-onboard-copy">
            <span className="sq-onboard-kicker"><Hammer size={17} /> Your maker mindset</span>
            <h1 ref={heading} tabIndex={-1}>Think like an engineer.</h1>
            <p className="sq-onboard-lead">You can try, change your idea, and try again. That is how makers learn.</p>
            <p className="sq-onboard-process-hint">Choose a stage to explore.</p>
          </div>
          <div className="sq-onboard-process-demo">
            <div className={`sq-onboard-process-feature is-step-${activeEngineeringStep}`} key={activeEngineeringStep} aria-live="polite"><span className="sq-onboard-process-number">{String(activeEngineeringStep + 1).padStart(2, '0')} / 05</span><span className="sq-onboard-process-big-icon"><SelectedEngineeringIcon size={56} strokeWidth={1.9} /></span><h2>{selectedEngineeringStep.label}</h2><p>{selectedEngineeringStep.detail}</p></div>
            <div className="sq-onboard-process-choices" aria-label="Explore engineering stages">{engineerSteps.map(({ label, icon: Icon }, index) => <button key={label} type="button" className={index === activeEngineeringStep ? 'is-active' : ''} onClick={() => setActiveEngineeringStep(index)} aria-pressed={index === activeEngineeringStep} aria-label={`Explore ${label}, engineering stage ${index + 1} of 5`}><Icon size={20} /><span>{label}</span></button>)}</div>
          </div>
        </section>}

        {chapter === 3 && <section className="sq-onboard-panel sq-onboard-ready" aria-label="Mission preparation">
          <div className="sq-onboard-copy">
            <span className="sq-onboard-kicker"><PackageCheck size={17} /> Before you begin</span>
            <h1 ref={heading} tabIndex={-1}>Get your bench ready.</h1>
            <p className="sq-onboard-lead">Select what you have. Ask your instructor for anything you still need.</p>
            {content.materials.length ? <><p className="sq-onboard-material-count" role="status">{readyMaterials.length} of {content.materials.length} ready</p><ul className="sq-onboard-materials">{content.materials.map((item, index) => <li key={`${item}-${index}`}><button type="button" className={readyMaterials.includes(index) ? 'is-ready' : ''} onClick={() => toggleMaterial(index)} aria-pressed={readyMaterials.includes(index)}><span>{readyMaterials.includes(index) && <Check size={16} strokeWidth={3} />}</span>{item}</button></li>)}</ul></> : <div className="sq-onboard-note">Your instructor will tell you which materials to bring.</div>}
          </div>
          <aside className="sq-onboard-ready-side">
            {content.safetyNotes.length > 0 && <div className="sq-onboard-safety"><ShieldCheck size={27} /><div><strong>Safety check</strong><ul>{content.safetyNotes.map(item => <li key={item}>{item}</li>)}</ul></div></div>}
            {(content.prerequisites.length > 0 || Boolean(project.resources?.length)) && <details className="sq-onboard-extra" open={showMore} onToggle={event => setShowMore(event.currentTarget.open)}><summary><BookOpen size={20} /> Helpful things to check</summary>{content.prerequisites.map(item => <p key={item}>{item}</p>)}{project.resources?.map(resource => <a key={resource.id} href={resource.url} target="_blank" rel="noopener noreferrer">{resource.title} <ExternalLink size={15} /></a>)}</details>}
            {!content.safetyNotes.length && !content.prerequisites.length && !project.resources?.length && <div className="sq-onboard-ready-symbol" aria-hidden="true"><Wrench size={68} strokeWidth={1.5} /></div>}
          </aside>
        </section>}

        {chapter === 4 && <section className="sq-onboard-panel sq-onboard-launch" aria-label="Ready to start building">
          <div className="sq-onboard-copy">
            <span className="sq-onboard-kicker"><Sparkles size={17} /> Ready, maker?</span>
            <h1 ref={heading} tabIndex={-1}>Your first step is waiting.</h1>
            <p className="sq-onboard-lead">Your build space will guide you through each step. Here is where you begin.</p>
            <div className="sq-onboard-first"><span>First step</span><strong>{firstStep.title}</strong>{firstStep.description && <p>{firstStep.description}</p>}</div>
          </div>
          <div className="sq-onboard-launch-art" aria-hidden="true"><div className="sq-onboard-pass"><div className="sq-onboard-pass-picture">{coverImage ? <img src={coverImage} alt="" /> : <Wrench size={70} strokeWidth={1.5} />}</div><div className="sq-onboard-pass-stamp"><Sparkles size={20} /> Mission ready</div><div className="sq-onboard-pass-foot"><span>YOUR NEXT BUILD</span><strong>{project.title}</strong></div></div><i /></div>
        </section>}
      </div>

      <footer className="sq-onboard-footer">
        <button type="button" className="sq-onboard-secondary" onClick={previous} disabled={chapter === 0}><ArrowLeft size={18} /> Previous</button>
        <span className="sq-onboard-footer-label">{chapters[chapter]}</span>
        {chapter < chapters.length - 1 ? <button type="button" className="sq-onboard-primary" onClick={next}>Continue <ArrowRight size={20} /></button> : onLaunch ? <button type="button" className="sq-onboard-primary" onClick={onLaunch}><Play size={19} fill="currentColor" /> Start building</button> : <span className="sq-onboard-preview-end">Mission preview complete</span>}
      </footer>
    </div>
  </main>;
}
