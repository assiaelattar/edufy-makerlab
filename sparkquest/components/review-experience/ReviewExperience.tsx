import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BellRing, Check, CheckCircle2, ClipboardCheck, ExternalLink, Eye, FileImage, History, RotateCcw, Send, Volume2, VolumeX } from 'lucide-react';
import type { ProjectReview, ProofSubmission, StudentProject } from '../../types';
import { buildReviewPatch, effectiveStepReviewStatus, reviewFingerprint, safeProofUrl, stepReviewFeedback, submittedProof } from '../../domain/projectReview';
import { reviewAlertEntries } from '../../domain/reviewAlerts';

const PROJECT_ID = 'local-proof-relay';
const STEP_ID = 'soil-test';
const ORG_ID = 'local-makerlab-preview';
const IMAGE = '/mission-plant-guardian.svg';
const mentor = { uid: 'local-mentor', role: 'instructor', organizationId: ORG_ID, name: 'Mina' };

function initialProject(): StudentProject {
  return {
    id: PROJECT_ID, organizationId: ORG_ID, studentId: 'local-aya', studentName: 'Aya',
    title: 'Plant guardian', description: 'Build an alert that helps someone care for a plant.',
    station: 'Circuits', status: 'building', reviewProtocolVersion: 1, skills: [], resources: [], commits: [],
    steps: [{ id: STEP_ID, title: 'Test wet and dry soil', status: 'doing', required: true,
      objective: 'Show what your alert does in wet soil and dry soil.',
      instructions: 'Try both conditions. Explain what happened and what you changed.' }],
  };
}

type Role = 'learner' | 'instructor';
type RelayState = 'prepare' | 'waiting' | 'revise' | 'resubmitted' | 'step-approved' | 'final-waiting' | 'published';

function getRelayState(project: StudentProject): RelayState {
  if (project.status === 'published') return 'published';
  if (project.status === 'submitted') return 'final-waiting';
  const step = project.steps[0];
  const status = effectiveStepReviewStatus(project, step);
  if (status === 'done') return 'step-approved';
  if (status === 'rejected') return 'revise';
  if (status === 'pending_review') return (step.submissionHistory?.length || 0) > 1 ? 'resubmitted' : 'waiting';
  return 'prepare';
}

const stateCopy: Record<RelayState, { eyebrow: string; title: string; help: string; station: number }> = {
  prepare: { eyebrow: 'At your workbench', title: 'Show what you made.', help: 'Add your test notes, then send your proof to Mina.', station: 0 },
  waiting: { eyebrow: 'Proof sent', title: 'Mina has your work.', help: 'Your proof is saved. You can come back while Mina reviews it.', station: 1 },
  revise: { eyebrow: 'Feedback ready', title: 'You have a next step.', help: 'Read Mina’s note, improve your test, and send a new proof.', station: 2 },
  resubmitted: { eyebrow: 'Improved proof sent', title: 'Your new version is with Mina.', help: 'The earlier proof and Mina’s note stay in the record.', station: 1 },
  'step-approved': { eyebrow: 'Step approved', title: 'Your test is ready.', help: 'Send the finished mission for its final review.', station: 3 },
  'final-waiting': { eyebrow: 'Mission sent', title: 'One last review.', help: 'Mina is checking your whole mission before it goes into your Field Log.', station: 1 },
  published: { eyebrow: 'Mission approved', title: 'You made it work.', help: 'Your Plant guardian is in your Field Log. Keep the proof and notes for your next build.', station: 4 },
};

function playApprovalChime() {
  const Audio = window.AudioContext;
  if (!Audio) return;
  const context = new Audio();
  const now = context.currentTime;
  [523.25, 659.25, 783.99].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now + index * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.065, now + index * 0.12 + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.12 + 0.38);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now + index * 0.12); oscillator.stop(now + index * 0.12 + 0.4);
  });
  window.setTimeout(() => void context.close(), 1100);
}

function playReviewCue() {
  const Audio = window.AudioContext;
  if (!Audio) return;
  const context = new Audio();
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(587.33, now);
  oscillator.frequency.setValueAtTime(783.99, now + 0.16);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.055, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.43);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(now); oscillator.stop(now + 0.45);
  window.setTimeout(() => void context.close(), 600);
}

/** Status is derived from canonical proof and review state; motion only illustrates the handoff. */
export function ProofRelay({ state, pulse }: { state: RelayState; pulse: number }) {
  const current = stateCopy[state];
  return <section className="pr-relay" aria-label="Proof journey">
    <div className="pr-relay-heading"><span>THE PROOF RELAY</span><strong>{current.eyebrow}</strong></div>
    <ol className="pr-relay-track">
      {['Build', 'With mentor', 'Make changes', 'Step ready', 'Field Log'].map((label, index) => <li key={label} className={index === current.station ? 'is-current' : index < current.station && state !== 'resubmitted' ? 'is-past' : ''}>
        <span className="pr-track-mark" aria-hidden="true">{index < current.station && state !== 'resubmitted' ? <Check size={15} /> : index + 1}</span>
        <span>{label}</span>
      </li>)}
      <span key={pulse} className={`pr-relay-card pr-relay-card-${state}`} aria-hidden="true"><FileImage size={18} /></span>
    </ol>
    <p role="status" className="pr-relay-status">{current.help}</p>
  </section>;
}

export function EvidenceVersion({ proof, number, selected, onSelect }: { proof: ProofSubmission; number: number; selected: boolean; onSelect: () => void }) {
  return <button type="button" className={`pr-version ${selected ? 'is-selected' : ''}`} aria-pressed={selected} onClick={onSelect}>
    <span className="pr-version-number">V{number}</span><span><strong>{number === 1 ? 'First test' : 'Improved test'}</strong><small>{proof.note || 'No note added'}</small></span><Eye size={17} aria-hidden="true" />
  </button>;
}

export function ReviewLedger({ project, onSelectProof }: { project: StudentProject; onSelectProof: (id: string) => void }) {
  const proofs = project.steps[0].submissionHistory || [];
  const reviews = project.reviewHistory || [];
  const systemEvents = [
    ...proofs.map((proof, index) => ({ id: proof.id, title: index === 0 ? 'Proof sent for review' : 'Improved proof sent', detail: `Version ${index + 1} saved for Mina` })),
    ...(project.submittedAt ? [{ id: 'mission-sent', title: 'Finished mission sent', detail: 'Final review requested' }] : []),
    ...(project.status === 'published' ? [{ id: 'field-log', title: 'Added to Field Log', detail: 'Mission approved and published' }] : []),
  ];
  const notes = reviews.filter(review => Boolean(review.feedback));
  return <section className="pr-ledger" aria-label="Evidence and review record">
    <div className="pr-section-title"><div><span className="pr-overline">SAVED RECORD</span><h2>Every version stays here.</h2></div><History size={23} aria-hidden="true" /></div>
    <div className="pr-ledger-grid">
      <div><h3>Evidence versions <span>{proofs.length}</span></h3>{proofs.length ? proofs.map((proof, index) => <article className="pr-ledger-item" key={proof.id}><span className="pr-ledger-type">Proof · V{index + 1}</span><strong>{index === 0 ? 'First soil test' : 'Improved soil test'}</strong><p>{proof.note}</p><button type="button" onClick={() => onSelectProof(proof.id)}>Open this exact version <ArrowRight size={15} /></button></article>) : <p className="pr-empty">Your first proof will appear here after you send it.</p>}</div>
      <div><h3>System events <span>{systemEvents.length}</span></h3>{systemEvents.length ? systemEvents.map(event => <article className="pr-ledger-item" key={event.id}><span className="pr-ledger-type">System event</span><strong>{event.title}</strong><p>{event.detail}</p></article>) : <p className="pr-empty">Sending proof will create the first event.</p>}</div>
      <div><h3>Mentor notes <span>{notes.length}</span></h3>{notes.length ? notes.map((review: ProjectReview) => <article className="pr-ledger-item" key={review.id}><span className="pr-ledger-type">Note · {review.reviewedByName || 'Mentor'}</span><p>{review.feedback}</p><small>{review.stepTitle || 'Final mission'}</small></article>) : <p className="pr-empty">Written guidance will appear here.</p>}</div>
      <div><h3>Decisions <span>{reviews.length}</span></h3>{reviews.length ? reviews.map((review: ProjectReview) => <article className="pr-ledger-item" key={review.id}><span className="pr-ledger-type">Instructor decision</span><strong>{review.outcome === 'step_changes_requested' ? 'Changes requested' : review.outcome === 'step_approved' ? 'Step approved' : review.outcome === 'published' ? 'Mission approved' : 'Mission changes requested'}</strong><small>{review.stepTitle || 'Final mission'}</small></article>) : <p className="pr-empty">Mina’s decisions will appear here after review.</p>}</div>
    </div>
  </section>;
}

export default function ReviewExperience() {
  const [project, setProject] = useState(initialProject);
  const [role, setRole] = useState<Role>('learner');
  const [note, setNote] = useState('');
  const [mentorNote, setMentorNote] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [selectedProofId, setSelectedProofId] = useState<string | null>(null);
  const [openedTarget, setOpenedTarget] = useState(false);
  const [readFeedbackId, setReadFeedbackId] = useState<string | null>(null);
  const [pulse, setPulse] = useState(0);
  const [error, setError] = useState('');
  const mainHeading = useRef<HTMLHeadingElement>(null);
  const state = getRelayState(project);
  const step = project.steps[0];
  const proofs = step.submissionHistory || [];
  const selectedProof = proofs.find(item => item.id === selectedProofId) || proofs.at(-1);
  const currentDecision = project.reviewHistory?.at(-1);
  const unread = currentDecision?.outcome === 'step_changes_requested' && currentDecision.id !== readFeedbackId;
  const alerts = useMemo(() => reviewAlertEntries([project]), [project]);
  const currentAlert = alerts[0];
  const stepPending = state === 'waiting' || state === 'resubmitted';
  const finalPending = state === 'final-waiting';

  useEffect(() => { if (role === 'learner' && state === 'revise' && currentDecision) setReadFeedbackId(currentDecision.id); }, [role, state, currentDecision]);

  const handoff = () => setPulse(value => value + 1);
  const openInstructor = (proofId?: string) => {
    const target = proofs.find(item => item.id === proofId) || proofs.at(-1);
    if (!target) return;
    setRole('instructor'); setSelectedProofId(target.id); setOpenedTarget(target.id === proofs.at(-1)?.id); setError('');
    window.setTimeout(() => document.getElementById('pr-evidence-reader')?.focus(), 0);
  };
  const openAlert = () => {
    if (!currentAlert || currentAlert.projectId !== project.id || (currentAlert.stepId && currentAlert.stepId !== step.id)) {
      setError('This alert no longer points to the current project and step.'); return;
    }
    setRole('instructor'); setOpenedTarget(true); setSelectedProofId(proofs.at(-1)?.id || null); setError('');
    window.setTimeout(() => document.getElementById('pr-evidence-reader')?.focus(), 0);
  };
  const sendProof = () => {
    if (!note.trim()) { setError('Write what happened in both soil tests before sending proof.'); return; }
    const next = submittedProof(step, new URL(IMAGE, window.location.href).href, note.trim(), new Date().toISOString(), 'image/svg+xml');
    setProject(current => ({ ...current, steps: [next] }));
    setSelectedProofId(next.submissionHistory?.at(-1)?.id || null);
    setNote(''); setOpenedTarget(false); setError(''); handoff();
    if (soundEnabled) playReviewCue();
  };
  const decide = (outcome: 'step_changes_requested' | 'step_approved' | 'published') => {
    if (outcome === 'step_changes_requested' && !mentorNote.trim()) { setError('Give Aya one clear change to make before sending feedback.'); return; }
    if (!openedTarget) { setError('Open the submitted proof before deciding.'); return; }
    try {
      const patch = buildReviewPatch(project, {
        id: `local-decision-${crypto.randomUUID()}`, stepId: outcome === 'published' ? undefined : STEP_ID,
        outcome, feedback: mentorNote.trim(), xp: outcome === 'published' ? 50 : undefined,
        expectedFingerprint: reviewFingerprint(project, outcome === 'published' ? undefined : STEP_ID),
      }, mentor, new Date().toISOString());
      setProject(current => ({ ...current, ...patch })); setMentorNote(''); setOpenedTarget(false); setError(''); handoff();
      if (outcome === 'published' && soundEnabled) playApprovalChime();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The decision could not be saved.'); }
  };
  const reset = () => {
    setProject(initialProject()); setRole('learner'); setNote(''); setMentorNote(''); setSelectedProofId(null);
    setOpenedTarget(false); setReadFeedbackId(null); setError(''); handoff();
    window.setTimeout(() => mainHeading.current?.focus(), 0);
  };

  return <main className="pr-page">
    <div className="pr-shell">
      <header className="pr-topbar"><div className="pr-brand"><span className="pr-brand-symbol" aria-hidden="true">✳</span><span>SPARKQUEST <small>MAKERLAB WORKSHOP</small></span></div><span className="pr-preview-flag">LOCAL · SYNTHETIC PREVIEW</span><button type="button" className="pr-reset" onClick={reset}><RotateCcw size={16} /> Reset story</button></header>
      <div className="pr-hero"><div><span className="pr-overline">PLANT GUARDIAN / CIRCUITS</span><h1 tabIndex={-1} ref={mainHeading}>Good work travels<br /><em>both ways.</em></h1><p>Proof, helpful feedback, a better build, and a moment to be proud of.</p></div><div className="pr-hero-meta"><span>01 / TEST THE SENSOR</span><strong>Aya + Mina</strong><small>One mission · two points of view</small></div></div>
      <div className="pr-toolbar"><div className="pr-roles" role="group" aria-label="View as"><button type="button" aria-pressed={role === 'learner'} onClick={() => setRole('learner')}>Aya · learner {unread && <span className="pr-unread-dot" aria-label="Unread feedback" />}</button><button type="button" aria-pressed={role === 'instructor'} onClick={() => setRole('instructor')}>Mina · instructor {currentAlert && <span className="pr-alert-count">1</span>}</button></div><button type="button" className="pr-sound" aria-pressed={soundEnabled} onClick={() => setSoundEnabled(value => !value)}>{soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />} Review and approval sounds {soundEnabled ? 'on' : 'off'}</button></div>
      <ProofRelay state={state} pulse={pulse} />
      {error && <p className="pr-error" role="alert">{error}</p>}
      <div className={`pr-desk pr-desk-${role}`}>
        <section className="pr-panel pr-learner" aria-label="Learner workbench"><div className="pr-panel-head"><span className="pr-panel-icon pr-icon-lime">A</span><div><span className="pr-overline">AYA'S WORKBENCH</span><h2>{stateCopy[state].title}</h2></div></div>
          <p className="pr-panel-lede">{stateCopy[state].help}</p>
          {state === 'prepare' && <div className="pr-task"><span className="pr-task-label">YOUR TEST</span><h3>Wet soil. Dry soil. What did the alert do?</h3><p>Use the sample sensor picture and explain the two tests in your own words.</p><label htmlFor="pr-learner-note">My test notes</label><textarea id="pr-learner-note" value={note} onChange={event => setNote(event.target.value)} placeholder="In dry soil, the light turned on…" rows={4} /><div className="pr-sample"><FileImage size={20} /><span>Sample sensor picture attached</span><Check size={17} /></div><button type="button" className="pr-primary" onClick={sendProof}>Send my proof <Send size={17} /></button></div>}
          {state === 'revise' && <div className="pr-task pr-revision"><span className="pr-task-label">MINA'S NEXT STEP</span><h3>{stepReviewFeedback(project, step)}</h3><p>Your first proof stays saved. Add a new note to show what you changed.</p><label htmlFor="pr-learner-note">What I changed</label><textarea id="pr-learner-note" value={note} onChange={event => setNote(event.target.value)} placeholder="I labelled both readings and tried again…" rows={4} /><button type="button" className="pr-primary" onClick={sendProof}>Send improved proof <Send size={17} /></button></div>}
          {stepPending && <div className="pr-waiting" role="status"><span className="pr-waiting-icon"><Send size={27} /></span><strong>Proof saved · version {proofs.length}</strong><p>Mina will see this exact version in the review inbox. You can check the saved record below.</p></div>}
          {state === 'step-approved' && <div className="pr-task pr-ready"><CheckCircle2 size={35} /><h3>Mina approved your soil test.</h3><p>The proof is ready. Send the finished mission for one final check.</p><button type="button" className="pr-primary" onClick={() => { setProject(current => ({ ...current, status: 'submitted', submittedAt: new Date().toISOString() })); setOpenedTarget(false); handoff(); if (soundEnabled) playReviewCue(); }}>Send finished mission <ArrowRight size={17} /></button></div>}
          {finalPending && <div className="pr-waiting" role="status"><span className="pr-waiting-icon"><ClipboardCheck size={27} /></span><strong>Mission saved for final review</strong><p>Your approved step and proof versions are still attached.</p></div>}
          {state === 'published' && <div className="pr-celebration" role="status"><div className="pr-approval-stamp" aria-hidden="true"><Check size={42} /></div><span className="pr-task-label">APPROVED BY MINA</span><h3>Plant guardian is ready for the Field Log.</h3><p>You tested it, improved it, and showed how it works. That is real maker work.</p><span className="pr-reward">50 XP · mission complete</span></div>}
        </section>
        <section className="pr-panel pr-instructor" aria-label="Instructor review desk"><div className="pr-panel-head"><span className="pr-panel-icon pr-icon-blue">M</span><div><span className="pr-overline">MINA'S REVIEW DESK</span><h2>Look closely. Help clearly.</h2></div></div>
          {currentAlert ? <div className="pr-notice" role="status"><BellRing size={23} /><div><strong>New work from Aya</strong><p>{finalPending ? 'Final mission is ready to check.' : `Plant guardian · soil test · proof V${proofs.length}`}</p></div><span>NEW</span></div> : <div className="pr-inbox-empty"><BellRing size={22} /><span>New proof will appear here when Aya sends it.</span></div>}
          {currentAlert && <button type="button" className="pr-open" onClick={openAlert}>Open exact {finalPending ? 'mission' : `proof V${proofs.length}`} <ArrowRight size={18} /></button>}
          {proofs.length > 0 && <div id="pr-evidence-reader" className={`pr-evidence ${openedTarget ? 'is-open' : ''}`} tabIndex={-1}><div className="pr-evidence-heading"><span className="pr-task-label">EVIDENCE READER</span><strong>{selectedProof?.id === proofs.at(-1)?.id ? `Latest proof · V${proofs.length}` : `Earlier proof · V${proofs.findIndex(item => item.id === selectedProof?.id) + 1}`}</strong></div><div className="pr-evidence-preview"><img src={safeProofUrl(selectedProof?.evidence) || IMAGE} alt="Plant guardian sensor diagram submitted as proof" /></div><p className="pr-evidence-note">“{selectedProof?.note}”</p><a href={safeProofUrl(selectedProof?.evidence) || IMAGE} target="_blank" rel="noopener noreferrer">Open original proof <ExternalLink size={15} /></a>{proofs.length > 1 && <div className="pr-version-list">{proofs.map((proof, index) => <EvidenceVersion key={proof.id} proof={proof} number={index + 1} selected={proof.id === selectedProof?.id} onSelect={() => { setSelectedProofId(proof.id); setOpenedTarget(proof.id === proofs.at(-1)?.id); }} />)}</div>}</div>}
          {(stepPending || finalPending) && openedTarget && <div className="pr-decision"><span className="pr-task-label">{finalPending ? 'FINAL DECISION' : 'STEP DECISION'}</span><label htmlFor="pr-mentor-note">Your note to Aya</label><textarea id="pr-mentor-note" value={mentorNote} onChange={event => setMentorNote(event.target.value)} placeholder={finalPending ? 'What worked especially well?' : 'Name one clear next action…'} rows={3} /><div className="pr-decision-actions">{!finalPending && <button type="button" className="pr-secondary" onClick={() => decide('step_changes_requested')}>Ask for a change</button>}<button type="button" className="pr-primary" onClick={() => decide(finalPending ? 'published' : 'step_approved')}>{finalPending ? 'Approve mission' : 'Approve step'} <Check size={17} /></button></div></div>}
          {proofs.length > 0 && !currentAlert && <p className="pr-reviewed-note"><CheckCircle2 size={19} /> {state === 'published' ? 'Mission approved and recorded.' : 'This proof has a saved decision. Review history is below.'}</p>}
        </section>
      </div>
      <ReviewLedger project={project} onSelectProof={openInstructor} />
      <footer className="pr-footer"><span>MakerLab workshop · proof stays with the build</span><span>Preview actions stay in this tab</span></footer>
    </div>
  </main>;
}
