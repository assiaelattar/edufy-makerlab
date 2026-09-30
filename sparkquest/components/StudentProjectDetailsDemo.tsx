import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BatteryCharging,
  BookOpen,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  Cpu,
  Droplets,
  Leaf,
  Lock,
  Play,
  Radio,
  Sparkles,
  Trophy,
  User,
  Zap,
} from 'lucide-react';
import './student-project-details-demo.css';
import { ProjectTemplate, StudentProject } from '../types';

type MissionStep = {
  id: string;
  title: string;
  description: string;
  reward: number;
  state: 'complete' | 'current' | 'locked';
};

const demoMissionSteps: MissionStep[] = [
  {
    id: '1',
    title: 'Spot the problem',
    description: 'Choose a plant and record what makes it hard to keep healthy.',
    reward: 40,
    state: 'complete',
  },
  {
    id: '2',
    title: 'Wire the moisture sensor',
    description: 'Connect the sensor to your micro:bit and capture one clear proof photo.',
    reward: 80,
    state: 'current',
  },
  {
    id: '3',
    title: 'Code the thirsty alert',
    description: 'Make your prototype show an alert when the soil is dry.',
    reward: 120,
    state: 'locked',
  },
  {
    id: '4',
    title: 'Test and improve',
    description: 'Run three tests, note what changed, and share your final build.',
    reward: 160,
    state: 'locked',
  },
];

type StudentProjectDetailsProps = {
  project?: ProjectTemplate | StudentProject;
  onLaunch?: () => void;
  onBack?: () => void;
};

const buildMissionSteps = (project?: ProjectTemplate | StudentProject): MissionStep[] => {
  if (!project) return demoMissionSteps;
  const source = project as any;
  const rawSteps = source.steps?.length
    ? source.steps
    : source.defaultSteps?.length
      ? source.defaultSteps.map((title: string, index: number) => ({ id: `step-${index + 1}`, title }))
      : source.keyChallenges?.length
        ? source.keyChallenges.map((challenge: any, index: number) => ({ id: `challenge-${index + 1}`, title: challenge.title, description: challenge.desc }))
        : [{ id: 'start', title: 'Open your mission brief', description: 'Review the challenge, gather your tools, and plan your first build session.' }];

  const firstIncompleteIndex = Math.max(0, rawSteps.findIndex((step: any) => !['done', 'DONE', 'COMPLETED'].includes(step.status)));
  return rawSteps.map((step: any, index: number) => {
    const isComplete = ['done', 'DONE', 'COMPLETED'].includes(step.status);
    const isExplicitlyLocked = step.isLocked || ['LOCKED'].includes(step.status);
    const state: MissionStep['state'] = isComplete
      ? 'complete'
      : isExplicitlyLocked || index > firstIncompleteIndex
        ? 'locked'
        : 'current';

    return {
      id: String(step.id || `step-${index + 1}`),
      title: String(step.title || `Quest step ${index + 1}`),
      description: String(step.description || step.note || 'Open this step to see the instructions and add your proof.'),
      reward: Number(step.xpReward || step.reward || (index + 1) * 40),
      state,
    };
  });
};

const StepIcon: React.FC<{ state: MissionStep['state'] }> = ({ state }) => {
  if (state === 'complete') return <Check aria-hidden="true" />;
  if (state === 'locked') return <Lock aria-hidden="true" />;
  return <Circle aria-hidden="true" />;
};

export const StudentProjectDetailsDemo: React.FC<StudentProjectDetailsProps> = ({ project, onLaunch, onBack }) => {
  const p = project as any;
  const missionSteps = useMemo(() => buildMissionSteps(project), [project]);
  const initialStepId = missionSteps.find(step => step.state === 'current')?.id || missionSteps[0]?.id || '';
  const [selectedStep, setSelectedStep] = useState(initialStepId);
  const activeStep = missionSteps.find(step => step.id === selectedStep) ?? missionSteps[0];
  const completeCount = missionSteps.filter(step => step.state === 'complete').length;
  const progress = missionSteps.length ? Math.round((completeCount / missionSteps.length) * 100) : 0;
  const title = p?.title || 'Smart plant monitor';
  const description = p?.hook || p?.description || 'Build a tiny plant guardian that senses dry soil and tells its owner when it is time to water.';
  const station = p?.station || 'Robotics';
  const duration = p?.duration || `${Math.max(1, missionSteps.length)} sessions`;
  const difficulty = p?.difficulty || 'Intermediate';
  const totalReward = missionSteps.reduce((sum, step) => sum + step.reward, 0);
  const outcomes = p?.learningOutcomes?.length
    ? p.learningOutcomes.slice(0, 3).map((outcome: any) => ({ title: outcome.title, description: outcome.desc }))
    : p?.skills?.length
      ? p.skills.slice(0, 3).map((skill: string) => ({ title: skill, description: `Practice ${skill.toLowerCase()} while building and testing your idea.` }))
      : [
          { title: 'Plan your build', description: 'Turn the mission brief into a clear sequence of actions.' },
          { title: 'Prototype safely', description: 'Test each part before assembling the complete solution.' },
          { title: 'Improve from evidence', description: 'Use your proof and observations to refine the result.' },
        ];
  const kit = p?.technologies?.length
    ? p.technologies.slice(0, 5).map((tech: any) => tech.name)
    : p?.resources?.length
      ? p.resources.slice(0, 5).map((resource: any) => resource.title)
      : ['Mission brief', 'Maker notebook', 'Prototype materials'];

  useEffect(() => {
    if (!missionSteps.some(step => step.id === selectedStep && step.state !== 'locked')) {
      setSelectedStep(initialStepId);
    }
  }, [initialStepId, missionSteps, selectedStep]);

  return (
    <main className="sqp-demo">
      <div className="sqp-demo__paper-grid" aria-hidden="true" />

      <header className="sqp-topbar">
        <button className="sqp-back" type="button" aria-label="Back to quests" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          <span>All quests</span>
        </button>

        <div className="sqp-brand" aria-label="SparkQuest">
          <span className="sqp-brand__mark"><Zap aria-hidden="true" /></span>
          <span>Spark<span>Quest</span></span>
        </div>

        <div className="sqp-profile">
          <div className="sqp-profile__copy">
            <strong>{p?.studentName || 'Builder'}</strong>
            <span>MakerLab learner</span>
          </div>
          <span className="sqp-profile__avatar"><User aria-hidden="true" /></span>
        </div>
      </header>

      <div className="sqp-page">
        <section className="sqp-hero" aria-labelledby="sqp-project-title">
          <div className="sqp-hero__copy">
            <div className="sqp-label-row">
              <span className="sqp-label"><Radio aria-hidden="true" /> {station}</span>
              <span className="sqp-label sqp-label--soft">{String(p?.status || 'Ready').replace(/_/g, ' ')}</span>
            </div>

            <p className="sqp-kicker">MakerLab quest · Build with proof</p>
            <h1 id="sqp-project-title">{title}</h1>
            <p className="sqp-hero__intro">
              {description}
            </p>

            <div className="sqp-hero__meta" aria-label="Mission information">
              <span><Clock3 aria-hidden="true" /> {duration}</span>
              <span><Trophy aria-hidden="true" /> {totalReward} Sparks</span>
              <span><BadgeCheck aria-hidden="true" /> {difficulty}</span>
            </div>
          </div>

          <div className={`sqp-hero__visual${p?.thumbnailUrl || p?.coverImage ? ' sqp-hero__visual--image' : ''}`} aria-label="Mission cover">
            <span className="sqp-orbit" aria-hidden="true" />
            {p?.thumbnailUrl || p?.coverImage ? (
              <img className="sqp-mission-image" src={p.thumbnailUrl || p.coverImage} alt="" />
            ) : (
              <>
                <div className="sqp-plant">
                  <span className="sqp-plant__leaf sqp-plant__leaf--left"><Leaf aria-hidden="true" /></span>
                  <span className="sqp-plant__leaf sqp-plant__leaf--right"><Leaf aria-hidden="true" /></span>
                  <span className="sqp-plant__stem" />
                  <span className="sqp-plant__pot"><Droplets aria-hidden="true" /></span>
                </div>
                <div className="sqp-sensor-card">
                  <Cpu aria-hidden="true" />
                  <span><strong>Ready</strong> maker bench</span>
                </div>
              </>
            )}
          </div>

          <div className="sqp-progress-card">
            <div>
              <span className="sqp-progress-card__eyebrow">Quest progress</span>
              <strong>{completeCount} of {missionSteps.length} steps complete</strong>
            </div>
            <div className="sqp-progress" role="progressbar" aria-label="Quest progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
              <span style={{ width: `${progress}%` }} />
            </div>
            <span className="sqp-progress-card__value">{progress}%</span>
          </div>
        </section>

        <section className="sqp-layout" aria-label="Mission details">
          <div className="sqp-main-column">
            <div className="sqp-section-heading">
              <div>
                <p>Build route</p>
                <h2>Your quest steps</h2>
              </div>
              <span className="sqp-section-heading__note">Finish each proof to unlock the next step.</span>
            </div>

            <ol className="sqp-step-list">
              {missionSteps.map(step => (
                <li key={step.id}>
                  <button
                    className={`sqp-step sqp-step--${step.state}${selectedStep === step.id ? ' is-selected' : ''}`}
                    type="button"
                    onClick={() => step.state !== 'locked' && setSelectedStep(step.id)}
                    disabled={step.state === 'locked'}
                    aria-current={selectedStep === step.id ? 'step' : undefined}
                  >
                    <span className="sqp-step__number"><StepIcon state={step.state} /></span>
                    <span className="sqp-step__copy">
                      <strong>{step.title}</strong>
                      <span>{step.description}</span>
                    </span>
                    <span className="sqp-step__reward"><Sparkles aria-hidden="true" /> +{step.reward}</span>
                    <ChevronRight className="sqp-step__arrow" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ol>

            <section className="sqp-brief" aria-labelledby="sqp-brief-title">
              <div className="sqp-brief__icon"><BookOpen aria-hidden="true" /></div>
              <div>
                <p>Mission brief</p>
                <h2 id="sqp-brief-title">What you will learn</h2>
              </div>
              <div className="sqp-skill-grid">
                {outcomes.map((outcome: any, index: number) => {
                  const Icon = [Cpu, BatteryCharging, Sparkles][index] || Sparkles;
                  return <article key={`${outcome.title}-${index}`}><Icon aria-hidden="true" /><strong>{outcome.title}</strong><span>{outcome.description}</span></article>;
                })}
              </div>
            </section>
          </div>

          <aside className="sqp-side-column" aria-label="Current quest action">
            <section className="sqp-next-card">
              <div className="sqp-next-card__topline">
                <span>Up next</span>
                <span>Step {missionSteps.findIndex(step => step.id === activeStep.id) + 1} of {missionSteps.length}</span>
              </div>
              <span className="sqp-next-card__icon"><Cpu aria-hidden="true" /></span>
              <h2>{activeStep.title}</h2>
              <p>{activeStep.description}</p>

              <div className="sqp-reward-ticket">
                <span><Sparkles aria-hidden="true" /> Step reward</span>
                <strong>+{activeStep.reward} Sparks</strong>
              </div>

              <button className="sqp-primary-action" type="button" onClick={onLaunch}>
                <Play aria-hidden="true" />
                Open this step
                <ArrowRight aria-hidden="true" />
              </button>
              <button className="sqp-text-action" type="button">Preview materials</button>
            </section>

            <section className="sqp-kit-card">
              <div>
                <p>Maker kit</p>
                <h2>Bring these to your bench</h2>
              </div>
              <ul>{kit.map((item: string, index: number) => <li key={`${item}-${index}`}><span>{index + 1}</span> {item}</li>)}</ul>
            </section>
          </aside>
        </section>
      </div>

      <div className="sqp-mobile-action">
        <div><span>Up next</span><strong>{activeStep.title}</strong></div>
        <button type="button" aria-label="Open current step" onClick={onLaunch}><Play aria-hidden="true" /></button>
      </div>
    </main>
  );
};

export default StudentProjectDetailsDemo;
