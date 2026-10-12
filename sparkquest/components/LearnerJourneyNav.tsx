import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Compass, Hammer, MessageCircle } from 'lucide-react';
import { ParentO11Y } from './ParentO11Y';
import './learner-journey.css';

export type LearnerJourneyView = 'today' | 'missions' | 'mentor';

interface Props {
  view: LearnerJourneyView;
  onChange: (view: LearnerJourneyView) => void;
  firstName: string;
  academicYear: string;
  hasCurrentBuild: boolean;
  needsRevision: boolean;
  updateCount: number;
  onFieldLog: () => void;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

const views: Array<{ id: LearnerJourneyView; label: string; icon: typeof Hammer }> = [
  { id: 'today', label: 'My build', icon: Hammer },
  { id: 'missions', label: 'Explore', icon: Compass },
  { id: 'mentor', label: 'Mentor', icon: MessageCircle },
];

export const LearnerJourneyNav: React.FC<Props> = ({ view, onChange, firstName, academicYear, hasCurrentBuild, needsRevision, updateCount, onFieldLog, actions, children }) => {
  const [cue, setCue] = useState(0);
  useEffect(() => { setCue(value => value + 1); }, [view, needsRevision]);
  const mood = view === 'mentor' ? (needsRevision ? 'care' : 'proud') : view === 'missions' ? 'curious' : hasCurrentBuild ? 'proud' : 'welcome';
  const guide = view === 'mentor'
    ? needsRevision ? 'Your mentor left you a clue. Let’s use it to make your build stronger.' : updateCount ? 'Your work is with your mentor. See what happens next.' : 'When your mentor replies, you’ll find it here.'
    : view === 'missions' ? 'Choose an idea that sparks your curiosity. You can build it your way.'
      : hasCurrentBuild ? 'One small step today can move your whole project forward.' : 'Your maker story starts with one idea. Let’s find yours.';
  return <div className="sq-learner-journey" id="sq-journey-start">
    <div className="sq-learner-journey-top"><span className="sq-learner-journey-brand">✳ <strong>SparkQuest</strong> Studio</span><div className="sq-learner-journey-actions"><button type="button" onClick={onFieldLog}><BookOpen size={17} /> Field log</button>{actions}</div></div>
    <div className={`sq-learner-guide is-${mood}`}>
      <div className="sq-learner-guide-copy"><span>YOUR MAKER JOURNEY · {academicYear}</span><h1>{view === 'today' ? `Hi, ${firstName}.` : view === 'missions' ? 'Find your next spark.' : 'Your mentor, your momentum.'}</h1><p>{guide}</p></div>
      <ParentO11Y cue={cue} mood={mood} />
    </div>
    <nav className="sq-learner-journey-tabs" aria-label="Maker journey">
      {views.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-current={view === id ? 'page' : undefined} onClick={() => { if (view !== id) onChange(id); }}><Icon size={18} /><span>{label}</span>{id === 'mentor' && updateCount > 0 && <i aria-label={`${updateCount} mentor updates`}>{updateCount}</i>}{view === id && <ArrowRight size={15} className="sq-journey-arrow" />}</button>)}
    </nav>
    {children}
  </div>;
};
