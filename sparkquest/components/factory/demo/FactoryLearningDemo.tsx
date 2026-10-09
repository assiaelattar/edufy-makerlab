import { useEffect, useState } from 'react';
import {
  ArrowRight, ArrowUpRight, Bell, BookOpen, Check, CheckCheck, ChevronDown,
  CircleHelp, ClipboardCheck, Compass, FilePenLine, Flame,
  Heart, LayoutGrid, Lightbulb, Menu, Plus, Search,
  Send, Shapes, Sparkles, Star, Users, X,
} from 'lucide-react';

type Proof = { id: number; initials: string; learner: string; title: string; step: string; submitted: string; color: string; note: string };
type Draft = { id: number; title: string; category: string; stage: string; icon: 'shapes' | 'light' | 'book' };
type Group = 'Robotics · G5' | 'Code Lab · G4' | 'Maker Studio · G6';
type Section = 'Today' | 'Missions' | 'Learners' | 'Progress' | 'Resources';

const initialProofs: Proof[] = [
  { id: 1, initials: 'AL', learner: 'Amira L.', title: 'Plant Guardian', step: 'Sensor test · Step 4 of 5', submitted: '12 min ago', color: 'peach', note: 'The soil sensor now triggers the blue light when the plant needs water. I tested it three times.' },
  { id: 2, initials: 'YB', learner: 'Youssef B.', title: 'Mini Mars Rover', step: 'Build journal · Step 3 of 6', submitted: '38 min ago', color: 'lavender', note: 'I changed the wheel spacing so the rover can turn without catching on the frame.' },
  { id: 3, initials: 'SM', learner: 'Sara M.', title: 'Light-Up City', step: 'Circuit proof · Step 2 of 4', submitted: '1 hour ago', color: 'mint', note: 'Here is the first working streetlight circuit with a switch.' },
];

const initialDrafts: Draft[] = [
  { id: 1, title: 'Build a tiny weather station', category: 'Electronics', stage: '4 of 5 sections ready', icon: 'light' },
  { id: 2, title: 'Robot rescue challenge', category: 'Robotics', stage: 'Ready to assign', icon: 'shapes' },
];

const groupStats: Record<Group, { active: number; learners: number; finished: number; progress: number; label: string }> = {
  'Robotics · G5': { active: 18, learners: 24, finished: 6, progress: 75, label: '18 of 24 makers building' },
  'Code Lab · G4': { active: 13, learners: 18, finished: 5, progress: 72, label: '13 of 18 makers building' },
  'Maker Studio · G6': { active: 15, learners: 21, finished: 6, progress: 71, label: '15 of 21 makers building' },
};

const nav: { label: Section; icon: typeof LayoutGrid; target: string }[] = [
  { label: 'Today', icon: LayoutGrid, target: 'today' },
  { label: 'Missions', icon: Shapes, target: 'missions' },
  { label: 'Learners', icon: Users, target: 'learners' },
  { label: 'Progress', icon: Compass, target: 'progress' },
  { label: 'Resources', icon: BookOpen, target: 'resources' },
];

function SparkMark({ small = false }: { small?: boolean }) {
  return <span className={`lf-spark-mark${small ? ' is-small' : ''}`} aria-hidden="true"><span /></span>;
}

function CardIcon({ kind }: { kind: Draft['icon'] }) {
  const Icon = kind === 'shapes' ? Shapes : kind === 'light' ? Lightbulb : BookOpen;
  return <span className={`lf-draft-icon is-${kind}`}><Icon size={24} strokeWidth={2.5} /></span>;
}

function LevelBadge({ icon: Icon, children, tone = 'blue' }: { icon: typeof Star; children: React.ReactNode; tone?: string }) {
  return <span className={`lf-level-badge is-${tone}`}><Icon size={15} strokeWidth={2.6} />{children}</span>;
}

export function FactoryLearningDemo() {
  const [proofs, setProofs] = useState(initialProofs);
  const [drafts, setDrafts] = useState(initialDrafts);
  const [group, setGroup] = useState<Group>('Robotics · G5');
  const [section, setSection] = useState<Section>('Today');
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeProof, setActiveProof] = useState<Proof | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [missionName, setMissionName] = useState('');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [assigned, setAssigned] = useState<number[]>([]);
  const [completedReviews, setCompletedReviews] = useState(0);
  const stats = groupStats[group];
  const visibleProofs = proofs.filter(proof => `${proof.learner} ${proof.title} ${proof.step}`.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!activeProof && !composerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setActiveProof(null); setComposerOpen(false); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeProof, composerOpen]);

  const scrollTo = (target: string) => {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
    document.getElementById(target)?.scrollIntoView({ behavior, block: 'start' });
  };

  const navigate = (item: typeof nav[number]) => {
    setSection(item.label);
    setMenuOpen(false);
    scrollTo(item.target);
  };

  const decideProof = (decision: 'approved' | 'changes requested') => {
    if (!activeProof) return;
    setProofs(current => current.filter(proof => proof.id !== activeProof.id));
    if (decision === 'approved') setCompletedReviews(current => current + 1);
    setToast(`${activeProof.learner}'s ${activeProof.step.split(' · ')[0].toLowerCase()} ${decision} in this demo.`);
    setActiveProof(null);
  };

  const createDraft = (event: React.FormEvent) => {
    event.preventDefault();
    const title = missionName.trim();
    if (!title) return;
    setDrafts(current => [{ id: Date.now(), title, category: 'New mission', stage: '1 of 5 sections ready', icon: 'book' }, ...current]);
    setComposerOpen(false);
    setMissionName('');
    setToast(`“${title}” added to mission drafts in this demo.`);
    scrollTo('missions');
  };

  const handleDraftAction = (draft: Draft) => {
    if (draft.stage !== 'Ready to assign') {
      setToast(`“${draft.title}” needs its remaining sections before assignment.`);
      return;
    }
    setAssigned(current => [...current, draft.id]);
    setToast(`“${draft.title}” assigned to ${group} in this demo.`);
  };

  return <div className="lf-stage">
    <div className="lf-app">
      <div className="lf-demo-ribbon"><Sparkles size={14} /> Design concept <span>·</span> Sample data <span>·</span> No account</div>
      <header className="lf-header">
        <div className="lf-brand"><SparkMark /><div><strong>SparkQuest</strong><span>FACTORY</span></div></div>
        <nav className={`lf-nav${menuOpen ? ' is-open' : ''}`} aria-label="Dashboard sections">
          {nav.map(item => { const Icon = item.icon; return <button key={item.label} type="button" className={section === item.label ? 'is-active' : ''} aria-current={section === item.label ? 'page' : undefined} onClick={() => navigate(item)}><Icon size={16} strokeWidth={2.4} />{item.label}</button>; })}
        </nav>
        <div className="lf-header-actions"><button type="button" className="lf-header-icon" aria-label="Show demo notice" onClick={() => setToast('This concept uses sample data. Nothing is saved to an account.')}><Bell size={20} /><i /></button><button type="button" className="lf-profile" onClick={() => setToast('Instructor profile is a visual demo.')}><span className="lf-profile-initials">JD</span><span className="lf-profile-text">Jamie D.<ChevronDown size={15} /></span></button><button type="button" className="lf-menu" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}>{menuOpen ? <X size={23} /> : <Menu size={23} />}</button></div>
      </header>

      <main className="lf-main" id="today">
        <section className="lf-intro" aria-labelledby="lf-title"><div><div className="lf-eyebrow"><span className="lf-online-dot" /> Thursday, 8 October <span className="lf-eyebrow-divider">/</span> Your classroom today</div><h1 id="lf-title">Good morning, Jamie <span className="lf-title-star" aria-hidden="true">✳</span></h1><p>Small steps make big makers. Here’s what your class needs next.</p></div><button type="button" className="lf-button lf-button-blue lf-create-top" onClick={() => setComposerOpen(true)}><Plus size={20} strokeWidth={3} /> Create a mission</button></section>

        <div className="lf-overview-grid">
          <section className="lf-card lf-journey" aria-labelledby="lf-journey-title"><div className="lf-card-head"><div><span className="lf-kicker">YOUR TEACHING TRAIL</span><h2 id="lf-journey-title">Keep the momentum going</h2></div><LevelBadge icon={Flame} tone="coral">3 steps today</LevelBadge></div><div className="lf-trail">
            <button type="button" className="lf-trail-step is-current" onClick={() => { setSection('Learners'); scrollTo('learners'); }}><span className="lf-trail-node"><ClipboardCheck size={22} strokeWidth={2.7} /></span><span className="lf-trail-copy"><strong>Review new proof</strong><small>{proofs.length ? `${proofs.length} makers are waiting for feedback` : 'Inbox is clear — lovely work!'}</small></span><span className="lf-trail-arrow"><ArrowRight size={18} /></span></button>
            <button type="button" className="lf-trail-step" onClick={() => { setSection('Missions'); scrollTo('missions'); }}><span className="lf-trail-node"><Send size={20} strokeWidth={2.6} /></span><span className="lf-trail-copy"><strong>Launch a mission</strong><small>{drafts.length} ideas on your mission bench</small></span><span className="lf-trail-arrow"><ArrowRight size={18} /></span></button>
            <button type="button" className="lf-trail-step" onClick={() => { setSection('Progress'); scrollTo('progress'); }}><span className="lf-trail-node"><Compass size={22} strokeWidth={2.6} /></span><span className="lf-trail-copy"><strong>Check the class pulse</strong><small>See who may need a hand today</small></span><span className="lf-trail-arrow"><ArrowRight size={18} /></span></button>
          </div><div className="lf-journey-footer"><div className="lf-micro-avatars"><span>A</span><span>Y</span><span>S</span><span>+21</span></div><p>Every maker moves at their own pace.</p><span className="lf-star-burst" aria-hidden="true"><Star size={34} fill="currentColor" /></span></div></section>

          <section className="lf-card lf-proof-metric" aria-labelledby="lf-proof-metric-title"><div className="lf-metric-head"><span className="lf-circle-icon lf-coral"><ClipboardCheck size={22} strokeWidth={2.6} /></span><span className="lf-small-pill">Needs feedback</span></div><strong className="lf-metric-number">{proofs.length.toString().padStart(2, '0')}</strong><h2 id="lf-proof-metric-title">Proofs to review</h2><p>What your makers tried, tested, and learned.</p><button type="button" className="lf-button lf-button-ink" onClick={() => { setSection('Learners'); scrollTo('learners'); }}>Open review queue <ArrowUpRight size={18} /></button><div className="lf-metric-decoration" aria-hidden="true"><span /><span /><span /></div></section>

          <section className="lf-card lf-class-metric" id="progress" aria-labelledby="lf-class-title"><div className="lf-card-head lf-metric-top"><div><span className="lf-kicker">CLASS PULSE</span><h2 id="lf-class-title">Makers in motion</h2></div><span className="lf-circle-icon lf-blue"><Users size={21} strokeWidth={2.5} /></span></div><label className="lf-select-label" htmlFor="lf-group">Group</label><div className="lf-select-wrap"><select id="lf-group" value={group} onChange={event => setGroup(event.target.value as Group)}>{Object.keys(groupStats).map(name => <option key={name}>{name}</option>)}</select><ChevronDown size={17} /></div><div className="lf-class-center"><div><strong>{stats.active}<span>/{stats.learners}</span></strong><small>active builds</small></div><div className="lf-progress-art" role="img" aria-label={`${stats.progress}% of learners have an active build`}><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="47" className="lf-progress-track" /><circle cx="60" cy="60" r="47" className="lf-progress-fill" style={{ strokeDasharray: `${stats.progress * 2.95} 295` }} /></svg><span><SparkMark small /></span></div></div><div className="lf-class-legend"><span><i className="is-blue" /> {stats.label}</span><span><i className="is-yellow" /> {stats.finished} ready for next step</span></div><button type="button" className="lf-text-action" onClick={() => setToast(`Class progress for ${group} is a sample in this demo.`)}>Explore class progress <ArrowRight size={16} /></button></section>
        </div>

        <div className="lf-work-grid">
          <section className="lf-card lf-reviews" id="learners" aria-labelledby="lf-reviews-title"><div className="lf-section-head"><div><span className="lf-circle-icon lf-peach"><Heart size={20} strokeWidth={2.6} /></span><div><span className="lf-kicker">LEARNER WORK</span><h2 id="lf-reviews-title">Fresh from the workshop</h2></div></div><LevelBadge icon={Star} tone="coral">{completedReviews} celebrated today</LevelBadge></div><div className="lf-review-tools"><p>Open a proof to see the maker’s thinking.</p><label className="lf-search"><Search size={17} /><span className="lf-visually-hidden">Search learner proof</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a maker or mission" /></label></div><div className="lf-proof-list">{visibleProofs.map(proof => <button type="button" className="lf-proof-row" key={proof.id} onClick={() => setActiveProof(proof)}><span className={`lf-avatar is-${proof.color}`}>{proof.initials}</span><span className="lf-proof-main"><strong>{proof.learner} <span>shared proof</span></strong><small>{proof.title} · {proof.step}</small></span><span className="lf-proof-time">{proof.submitted}</span><span className="lf-row-arrow"><ArrowUpRight size={18} /></span></button>)}{!visibleProofs.length && <div className="lf-proof-empty"><CheckCheck size={26} /><strong>{proofs.length ? 'No matching proof' : 'Proof inbox is clear'}</strong><span>{proofs.length ? 'Try another maker or mission name.' : 'New learner submissions will land here.'}</span></div>}</div><div className="lf-card-bottom"><span><i className="lf-online-dot" /> Sample proof queue</span><button type="button" className="lf-text-action" onClick={() => setToast('This preview shows the full sample proof queue.')}>View all activity <ArrowRight size={16} /></button></div></section>

          <div className="lf-side-stack"><section className="lf-card lf-missions" id="missions" aria-labelledby="lf-missions-title"><div className="lf-section-head"><div><span className="lf-circle-icon lf-blue"><Shapes size={21} strokeWidth={2.5} /></span><div><span className="lf-kicker">YOUR NEXT LAUNCH</span><h2 id="lf-missions-title">Mission bench</h2></div></div><button type="button" className="lf-round-action" aria-label="Create mission" onClick={() => setComposerOpen(true)}><Plus size={20} /></button></div><p>Pick up a draft, then send it when you’re ready.</p><div className="lf-draft-list">{drafts.map(draft => <div className="lf-draft-row" key={draft.id}><CardIcon kind={draft.icon} /><span><strong>{draft.title}</strong><small>{draft.category} <span>·</span> {assigned.includes(draft.id) ? 'Assigned in demo' : draft.stage}</small></span><button type="button" className={`lf-mini-action${assigned.includes(draft.id) ? ' is-done' : ''}`} aria-label={assigned.includes(draft.id) ? `${draft.title} assigned` : draft.stage === 'Ready to assign' ? `Assign ${draft.title}` : `Prepare ${draft.title}`} disabled={assigned.includes(draft.id)} onClick={() => handleDraftAction(draft)}>{assigned.includes(draft.id) ? <Check size={16} /> : <ArrowRight size={17} />}</button></div>)}</div><button type="button" className="lf-button lf-button-outline" onClick={() => setComposerOpen(true)}><Plus size={17} /> Start a new mission</button></section>

          <section className="lf-card lf-resource" id="resources" aria-labelledby="lf-resource-title"><div className="lf-resource-art" aria-hidden="true"><span><BookOpen size={31} strokeWidth={2.3} /></span><i className="lf-resource-spark-one" /><i className="lf-resource-spark-two" /></div><div><span className="lf-kicker">TEACHER TOOLKIT</span><h2 id="lf-resource-title">A little help, right when you need it.</h2><p>Find a quick activity, guide, or tool for the next build.</p><button type="button" className="lf-text-action" onClick={() => setToast('Resource library interactions are planned for a later prototype.')}>Explore resources <ArrowRight size={17} /></button></div></section></div>
        </div>
        <footer className="lf-footer"><span><SparkMark small /> SparkQuest Factory concept</span><span>Sample data · local design preview · no account access</span><button type="button" onClick={() => setToast('This is a visual prototype for design direction, not the live Factory.')}>About this demo <CircleHelp size={15} /></button></footer>
      </main>
      <nav className="lf-bottom-nav" aria-label="Mobile dashboard sections">{nav.slice(0, 4).map(item => { const Icon = item.icon; return <button type="button" key={item.label} className={section === item.label ? 'is-active' : ''} onClick={() => navigate(item)}><Icon size={21} strokeWidth={2.5} /><span>{item.label}</span></button>; })}</nav>
    </div>

    {activeProof && <div className="lf-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setActiveProof(null); }}><section className="lf-modal" role="dialog" aria-modal="true" aria-labelledby="lf-proof-modal-title"><button type="button" className="lf-modal-close" aria-label="Close proof" onClick={() => setActiveProof(null)}><X size={20} /></button><span className="lf-kicker">LEARNER PROOF · SAMPLE</span><div className="lf-modal-maker"><span className={`lf-avatar is-${activeProof.color}`}>{activeProof.initials}</span><div><strong>{activeProof.learner}</strong><span>{activeProof.submitted}</span></div></div><h2 id="lf-proof-modal-title">{activeProof.title}</h2><p className="lf-modal-step">{activeProof.step}</p><div className="lf-proof-note"><span>MAKER’S NOTE</span><p>“{activeProof.note}”</p></div><p className="lf-modal-hint">Try a decision to see how the dashboard responds. No learner record is changed.</p><div className="lf-modal-actions"><button type="button" className="lf-button lf-button-outline" onClick={() => decideProof('changes requested')}>Request a revision</button><button type="button" className="lf-button lf-button-blue" onClick={() => decideProof('approved')}><Check size={18} /> Celebrate & approve</button></div></section></div>}

    {composerOpen && <div className="lf-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setComposerOpen(false); }}><section className="lf-modal" role="dialog" aria-modal="true" aria-labelledby="lf-composer-title"><button type="button" className="lf-modal-close" aria-label="Close mission draft" onClick={() => setComposerOpen(false)}><X size={20} /></button><span className="lf-kicker">MISSION BENCH · SAMPLE</span><span className="lf-composer-icon"><FilePenLine size={27} /></span><h2 id="lf-composer-title">What will your makers build next?</h2><p>Give the idea a name. You can shape the steps later.</p><form onSubmit={createDraft}><label htmlFor="lf-mission-name">Mission name</label><input id="lf-mission-name" value={missionName} onChange={event => setMissionName(event.target.value)} placeholder="e.g. Build a sound machine" autoFocus maxLength={80} required /><div className="lf-modal-actions"><button type="button" className="lf-button lf-button-outline" onClick={() => setComposerOpen(false)}>Cancel</button><button type="submit" className="lf-button lf-button-blue"><Plus size={18} /> Create draft</button></div></form></section></div>}
    {toast && <div className="lf-toast" role="status"><SparkMark small /><span>{toast}</span><button type="button" aria-label="Dismiss notification" onClick={() => setToast('')}><X size={16} /></button></div>}
  </div>;
}
