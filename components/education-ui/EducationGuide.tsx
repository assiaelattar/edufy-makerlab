import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { ParentO11Y, type ParentMascotMood } from '../../sparkquest/components/ParentO11Y';
import './education-guide.css';

export type EducationModule = 'dashboard' | 'students' | 'programs' | 'attendance' | 'settings' | 'finance' | 'expenses' | 'pickup' | 'general';
export type GuideState = 'welcome' | 'attention' | 'empty' | 'validation' | 'success' | 'complete' | 'context';
export interface EducationGuideProps {
    module: EducationModule;
    state: GuideState;
    mode: 'hero' | 'compact' | 'inline';
    message: string;
    action?: { label: string; onClick: () => void };
    dismissible?: boolean;
}

export const educationGuideRegistry = {
    students: {
        welcome: 'Start with the learner’s current situation, then open the workspace that needs attention.',
        attention: 'A few details need attention. Choose one item and finish it before moving on.',
        empty: 'This learner’s story is ready for its first record.',
        validation: 'Your changes are still here. Check the highlighted fields and try again.',
        success: 'Saved. The learner record is up to date.',
        complete: 'Everything important is ready for the next school day.',
        context: 'Use the overview for the whole picture, then move into one focused workspace.'
    },
    settings: {
        welcome: 'Set up one part of the school workspace at a time.', attention: 'This setup needs a decision before it can be complete.', empty: 'Begin with the recommended configuration.', validation: 'Check the fields that need attention.', success: 'Settings saved.', complete: 'This configuration is ready.', context: 'Keep advanced controls closed until they are needed.'
    },
    finance: {
        welcome: 'Start with today’s collection and reconciliation priorities.', attention: 'There is a finance item that needs follow-up.', empty: 'There is no finance work in this view.', validation: 'Review the payment details before saving.', success: 'The finance record was saved.', complete: 'This finance task is reconciled.', context: 'Use one finance workspace at a time.'
    },
    expenses: {
        welcome: 'Start with expenses due soon or waiting for review.', attention: 'An outgoing payment needs attention.', empty: 'No expenses match this view.', validation: 'Review the expense details before saving.', success: 'The expense was recorded.', complete: 'This expense task is complete.', context: 'Open details only when you need to verify or edit them.'
    }
} as const;

const moodForState: Record<GuideState, ParentMascotMood> = {
    welcome: 'welcome', attention: 'care', empty: 'curious', validation: 'care', success: 'proud', complete: 'proud', context: 'calm'
};

export const EducationGuide: React.FC<EducationGuideProps> = ({ module, state, mode, message, action, dismissible = false }) => {
    const storageKey = `edufy:guide-dismissed:${module}:${state}`;
    const [dismissed, setDismissed] = useState(() => dismissible && sessionStorage.getItem(storageKey) === 'true');
    const [cue, setCue] = useState(1);
    const mood = useMemo(() => moodForState[state], [state]);

    useEffect(() => { setCue(value => value + 1); }, [message, state]);
    useEffect(() => { setDismissed(dismissible && sessionStorage.getItem(storageKey) === 'true'); }, [dismissible, storageKey]);

    if (dismissed) return null;
    const dismiss = () => { sessionStorage.setItem(storageKey, 'true'); setDismissed(true); };

    return <aside className={`edu-guide edu-guide--${mode} edu-guide--${state}`} data-module={module} aria-label="011Y guide">
        <div className="edu-guide__copy" aria-live={state === 'validation' || state === 'success' ? 'polite' : 'off'}>
            <span>{state === 'attention' ? 'Needs attention' : state === 'success' || state === 'complete' ? 'Nice work' : '011Y guide'}</span>
            <p>{message}</p>
            {action && <button type="button" onClick={action.onClick}>{action.label}<ArrowRight size={16} /></button>}
        </div>
        <div className="edu-guide__mascot"><ParentO11Y cue={cue} mood={mood} /><span key={cue} aria-hidden="true">✦</span></div>
        {dismissible && <button type="button" className="edu-guide__dismiss" onClick={dismiss} aria-label="Dismiss guide"><X size={16} /></button>}
    </aside>;
};
