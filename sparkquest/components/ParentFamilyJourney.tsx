import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Car, Check, ChevronLeft, ChevronRight, CircleAlert, CreditCard, Download, ExternalLink, FileText, Image as ImageIcon, LogOut, RefreshCw, ShieldCheck, Sparkles, Volume2, VolumeX } from 'lucide-react';
import type { ProjectStep, Resource } from '../types';
import type { FamilyChild, FamilyProject } from '../hooks/useParentFamily';
import type { FamilyUpcomingMission } from '../domain/parentUpcoming';
import type { FamilySource } from '../domain/parentFamilyOperations';
import { currentStepReview, effectiveStepReviewStatus, proofKind, reviewTime, stepIsApproved, stepNeedsReview, stepReviewFeedback } from '../domain/projectReview';
import { isSafeFamilyHref, isSafeProjectImage, projectEvidenceImages, resolveParentProjectImage } from '../domain/parentProjectVisual';
import { parentImageSources } from '../domain/parentImage';
import { ParentO11Y, type ParentMascotMood } from './ParentO11Y';
import { ParentFamilyLoading } from './ParentFamilyLoading';
import { ParentPickupExperience } from './ParentPickupExperience';
import { ParentInstallInvitation } from './ParentInstallInvitation';
import { useParentSound } from '../hooks/useParentSound';
import './parent-family-journey.css';

type Screen = 'choose' | 'home' | 'projects' | 'detail' | 'moments' | 'family' | 'pickup';
type Detail = { kind: 'project' | 'upcoming'; id: string; from: 'home' | 'projects'; tone: CardTone };
type StepTone = 'done' | 'active' | 'sent' | 'revise' | 'later';
type CardTone = 'blue' | 'lilac' | 'apricot' | 'mint' | 'lime';
const cardTones: CardTone[] = ['lilac', 'apricot', 'mint', 'lime', 'blue'];
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
const installChoiceKey = (parentUid: string) => `sparkquest:parent-install-choice:v1:${parentUid}`;
const isInstalledApp = () => window.matchMedia('(display-mode: standalone)').matches
  || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

interface Props {
  parentUid: string;
  organizationId: string;
  children: FamilyChild[];
  loading: boolean;
  error: string | null;
  parentName?: string;
  onRefresh: () => void;
  onSignOut: () => void;
  previewMode?: boolean;
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || 'enfant';
const projectTime = (project: FamilyProject) => project.updatedAt?.toMillis?.() || project.createdAt?.toMillis?.() || 0;
const sortedProjects = (projects: FamilyProject[]) => [...projects].sort((a, b) => projectTime(b) - projectTime(a));
const currentProjectFor = (projects: FamilyProject[]) => sortedProjects(projects).find(project => project.status !== 'published');
const projectCover = (project: FamilyProject) => project.familyCoverImage || resolveParentProjectImage(project);
const statusLabel = (status: string) => ({ planning: 'En préparation', building: 'En cours', testing: 'En test', delivered: 'Prêt à partager', submitted: 'Envoyé à MakerLab', changes_requested: 'À améliorer', published: 'Terminé' })[status] || 'En cours';
const reviewLabel = (outcome: string) => ({ published: 'Projet validé', changes_requested: 'Modifications demandées', step_approved: 'Étape validée', step_changes_requested: 'Étape à améliorer' })[outcome] || 'Retour de MakerLab';
const dateLabel = (value: string | Date | { toDate?: () => Date } | null | undefined) => {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value.length === 10 ? `${value}T12:00:00` : value) : value instanceof Date ? value : value.toDate?.();
  return date && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat('fr', { day: 'numeric', month: 'short', year: 'numeric' }).format(date) : null;
};
const money = (amount: number) => new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(amount);
const count = (amount: number, one: string, many: string) => `${amount} ${amount === 1 ? one : many}`;

const stepState = (project: FamilyProject, step: ProjectStep): { label: string; tone: StepTone } => {
  const review = currentStepReview(project, step);
  if (review?.outcome === 'step_approved') return { label: 'Validé par MakerLab', tone: 'done' };
  if (stepIsApproved(project, step)) return { label: 'Étape terminée', tone: 'done' };
  if (review?.outcome === 'step_changes_requested' || effectiveStepReviewStatus(project, step) === 'rejected') return { label: 'À améliorer', tone: 'revise' };
  if (stepNeedsReview(step, project)) return { label: 'Envoyé à MakerLab', tone: 'sent' };
  if (!step.note && !step.evidence && ['todo', 'locked'].includes(effectiveStepReviewStatus(project, step))) return { label: 'À venir', tone: 'later' };
  return { label: 'En cours', tone: 'active' };
};

const OptimizedImage: React.FC<{ src: string; alt: string; loading?: 'lazy' | 'eager'; sizes?: string; onError?: () => void }> = ({ src, alt, loading = 'lazy', sizes = '(max-width: 700px) 92vw, 520px', onError }) => {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const useOriginal = failedSource === src;
  const optimized = parentImageSources(src, window.location.hostname);
  return <img src={optimized && !useOriginal ? optimized.src : src} srcSet={optimized && !useOriginal ? optimized.srcSet : undefined}
    sizes={sizes} alt={alt} loading={loading} decoding="async"
    fetchPriority={loading === 'eager' ? 'high' : undefined}
    onError={() => { if (optimized && !useOriginal) setFailedSource(src); else onError?.(); }} />;
};

const Cover: React.FC<{ src?: string | null; title: string; className?: string; priority?: boolean }> = ({ src, title, className = '', priority = false }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return <span className={`pf-cover ${className}`}>
    {src && isSafeProjectImage(src) && !failed ? <OptimizedImage src={src} alt={`Visuel du projet ${title}`} loading={priority ? 'eager' : 'lazy'} onError={() => setFailed(true)} />
      : <span className="pf-cover-fallback" role="img" aria-label={`Visuel non disponible pour ${title}`}><span className="pf-cover-sun" /><span className="pf-cover-mountain" /><span className="pf-cover-star">✳</span><small>Visuel à venir</small></span>}
  </span>;
};

const ProjectCard: React.FC<{ project: FamilyProject; onOpen: () => void; large?: boolean; tone?: CardTone }> = ({ project, onOpen, large = false, tone = 'blue' }) => {
  const steps = project.steps || [];
  const next = project.status === 'published' ? null : steps.find(step => !stepIsApproved(project, step));
  return <button type="button" className={`pf-project-card is-${tone}${large ? ' is-featured' : ''}`} onClick={onOpen} aria-label={`Voir le projet ${project.title}`}>
    <Cover src={projectCover(project)} title={project.title} />
    <span className="pf-project-card-copy"><span className="pf-pill">{statusLabel(project.status)}</span><strong>{project.title || 'Projet sans titre'}</strong>{next && <small>Prochaine étape · {next.title}</small>}<span className="pf-card-arrow">Voir le projet <ArrowRight size={18} /></span></span>
  </button>;
};

const UpcomingCard: React.FC<{ mission: FamilyUpcomingMission; onOpen: () => void; tone?: CardTone }> = ({ mission, onOpen, tone = 'lilac' }) =>
  <button type="button" className={`pf-upcoming-card is-${tone}`} onClick={onOpen} aria-label={`Découvrir la mission à venir ${mission.title}`}>
    <Cover src={mission.thumbnailUrl} title={mission.title} />
    <span className="pf-upcoming-card-copy"><span className="pf-pill pf-pill-next">À venir</span><strong>{mission.title}</strong><span className="pf-card-arrow">Découvrir <ArrowRight size={17} /></span></span>
  </button>;

const Proof: React.FC<{ url?: string; mime?: string; title: string }> = ({ url, mime, title }) => {
  if (!url) return null;
  const kind = proofKind(url, mime);
  if (kind === 'image' && isSafeProjectImage(url)) return <a className="pf-proof-image" href={isSafeFamilyHref(url) ? url : undefined} target="_blank" rel="noopener noreferrer" aria-label={`Ouvrir le travail ${title}`} onClick={event => { if (!isSafeFamilyHref(url)) event.preventDefault(); }}><OptimizedImage src={url} alt={`Travail partagé : ${title}`} /></a>;
  if (kind === 'video' && isSafeFamilyHref(url)) return <video controls preload="metadata" playsInline src={url} aria-label={`Vidéo de ${title}`} />;
  if (kind === 'audio' && isSafeFamilyHref(url)) return <audio controls preload="none" src={url} aria-label={`Audio de ${title}`} />;
  return isSafeFamilyHref(url) ? <a className="pf-resource-link" href={url} target="_blank" rel="noopener noreferrer"><FileText size={18} /> Ouvrir le fichier partagé <ExternalLink size={16} /></a> : <p className="pf-muted">Ce fichier ancien ne peut pas être ouvert ici.</p>;
};

const SafeResources: React.FC<{ resources?: Resource[] }> = ({ resources }) => {
  const safe = [...new Map((resources || []).filter(resource => isSafeFamilyHref(resource.url)).map(resource => [resource.id || resource.url, resource])).values()];
  return safe.length ? <div className="pf-resource-list">{safe.map(resource => <a className="pf-resource-link" key={resource.id || resource.url} href={resource.url} target="_blank" rel="noopener noreferrer"><BookOpen size={18} /> {resource.title} <ExternalLink size={16} /></a>)}</div> : null;
};

const StepSlide: React.FC<{ project: FamilyProject; step: ProjectStep; index: number; total: number; focusRef: React.Ref<HTMLElement> }> = ({ project, step, index, total, focusRef }) => {
  const state = stepState(project, step);
  const review = currentStepReview(project, step);
  const feedback = stepReviewFeedback(project, step);
  const resources = [...(step.resources || []), ...(project.stepResources?.[step.id] || []), ...(step.phaseId ? project.stepResources?.[step.phaseId] || [] : [])];
  const history = step.submissionHistory || [];
  return <article ref={focusRef} tabIndex={-1} className={`pf-step-slide is-${state.tone}`} aria-label={`Étape ${index + 1} sur ${total} : ${step.title}`}>
    <div className="pf-step-slide-top"><span className="pf-step-number">{String(index + 1).padStart(2, '0')} <i>/ {String(total).padStart(2, '0')}</i></span><span className="pf-step-state">{state.label}</span></div>
    <h3>{step.title}</h3>
    {(step.note || step.evidence) ? <div className="pf-step-work"><p className="pf-mini-label">CE QU’IL A FAIT</p>{step.note && <p className="pf-step-note">{step.note}</p>}<Proof url={step.evidence} mime={step.evidenceMimeType} title={step.title} /></div>
      : <p className="pf-step-empty">Aucune réalisation partagée pour cette étape pour le moment.</p>}
    {feedback && <aside className="pf-step-feedback"><strong>{review ? 'Retour MakerLab sur cette version' : 'Ancien retour enregistré'}{dateLabel(review?.reviewedAt || step.reviewedAt) ? ` · ${dateLabel(review?.reviewedAt || step.reviewedAt)}` : ''}</strong><p>{feedback}</p></aside>}
    {history.length > 1 && <details className="pf-detail-disclosure"><summary>Versions enregistrées · {history.length}</summary><ol>{history.map(item => {
      const matchingReview = project.reviewHistory?.find(entry => entry.stepId === step.id && entry.submission?.submittedAt && entry.submission.submittedAt === item.submittedAt);
      return <li key={item.id}><strong>{dateLabel(item.submittedAt) || 'Version enregistrée'}</strong>{item.note && <p>{item.note}</p>}<Proof url={item.evidence} mime={item.evidenceMimeType} title={step.title} />{matchingReview?.feedback && <p><b>Retour MakerLab :</b> {matchingReview.feedback}</p>}</li>;
    })}</ol></details>}
    {Boolean(step.objective || step.description || step.instructions || step.checklist?.length || resources.length) && <details className="pf-detail-disclosure"><summary>Repères de l’atelier</summary>{(step.objective || step.description) && <p>{step.objective || step.description}</p>}{step.instructions && <p>{step.instructions}</p>}{Boolean(step.checklist?.length) && <ul>{step.checklist?.map((item, i) => <li key={i}>{item}</li>)}</ul>}<SafeResources resources={resources} /></details>}
  </article>;
};

const SourcePanel = <T,>({ title, icon, source, render, retry }: { title: string; icon: React.ReactNode; source: FamilySource<T>; render: (data: T) => React.ReactNode; retry: () => void }) =>
  <article className="pf-source-panel"><span className="pf-source-icon">{icon}</span><h3>{title}</h3>{source.status === 'ready' ? render(source.data) : <><p>{source.reason}</p>{source.status === 'error' && <button type="button" className="pf-inline-action" onClick={retry}>Réessayer <RefreshCw size={16} /></button>}</>}</article>;

const FamilyPickupLink: React.FC<{ child: FamilyChild; onOpen: () => void }> = ({ child, onOpen }) => {
  const workshop = child.operations.workshop;
  const next = workshop.status === 'ready' ? workshop.data.next : null;
  return <button type="button" className="pf-family-pickup-link" onClick={onOpen}>
    <span className="pf-family-pickup-icon"><Car size={24} /></span>
    <span className="pf-family-pickup-copy"><small>ATELIER & RÉCUPÉRATION</small><strong>{next ? `${dateLabel(next.date)} · ${next.startTime}` : 'Voir le prochain rendez-vous'}</strong><span>{next ? `${next.programName}${next.endTime ? ` · fin prévue ${next.endTime}` : ''}` : 'Planning et suivi du départ au même endroit'}</span></span>
    <ArrowRight size={21} aria-hidden="true" />
  </button>;
};

export const ParentFamilyJourney: React.FC<Props> = ({ parentUid, organizationId, children, loading, error, parentName, onRefresh, onSignOut, previewMode = false }) => {
  const [screen, setScreen] = useState<Screen>('choose');
  const [pickupPanel, setPickupPanel] = useState<'status' | 'notes'>('status');
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [upcomingIndex, setUpcomingIndex] = useState(0);
  const [mascotCue, setMascotCue] = useState(0);
  const [showAllMoments, setShowAllMoments] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showInstallInvite, setShowInstallInvite] = useState(false);
  const sound = useParentSound();
  const scrollRef = useRef<HTMLElement>(null);
  const lastScrollTop = useRef(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const upcomingRailRef = useRef<HTMLDivElement>(null);
  const stepTouchStart = useRef<{ x: number; y: number } | null>(null);
  const stepSlideRef = useRef<HTMLElement>(null);
  const activeChild = children.find(child => child.id === selectedChildId);
  const projects = activeChild ? sortedProjects(activeChild.projects) : [];
  const currentProject = currentProjectFor(projects);
  const upcoming = activeChild?.upcoming.status === 'ready' ? activeChild.upcoming.data.missions : [];
  const selectedProject = detail?.kind === 'project' ? projects.find(project => project.id === detail.id) : undefined;
  const selectedMission = detail?.kind === 'upcoming' ? upcoming.find(mission => mission.id === detail.id) : undefined;
  const steps = selectedProject?.steps || [];
  const activeStep = steps[stepIndex];

  useEffect(() => { if (!loading && selectedChildId && !children.some(child => child.id === selectedChildId)) { setSelectedChildId(null); setDetail(null); setScreen('choose'); } }, [children, loading, selectedChildId]);
  useEffect(() => { if (screen !== 'choose') headingRef.current?.focus(); }, [screen, detail?.id]);
  useEffect(() => {
    const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const previousManifest = manifest?.getAttribute('href');
    const previousTitle = document.title;
    const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previousTheme = theme?.content;
    manifest?.setAttribute('href', '/parent-manifest.webmanifest');
    if (theme) theme.content = '#2448eb';
    document.title = 'SparkQuest Famille';
    const onInstall = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
    const onInstalled = () => {
      try { localStorage.setItem(installChoiceKey(parentUid), 'installed'); } catch { /* private browsing */ }
      setShowInstallInvite(false);
      setInstallPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      if (manifest && previousManifest) manifest.setAttribute('href', previousManifest);
      if (theme && previousTheme) theme.content = previousTheme;
      document.title = previousTitle;
      window.removeEventListener('beforeinstallprompt', onInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [parentUid]);

  useEffect(() => {
    if (loading || error || children.length === 0 || isInstalledApp()) return;
    const previewInvite = previewMode && new URLSearchParams(window.location.search).get('installPreview') === '1';
    if (previewMode && !previewInvite) return;
    if (!previewInvite) {
      try { if (localStorage.getItem(installChoiceKey(parentUid))) return; } catch { /* private browsing */ }
    }
    const timer = window.setTimeout(() => setShowInstallInvite(true), 850);
    return () => window.clearTimeout(timer);
  }, [loading, error, children.length, parentUid, previewMode]);

  const dismissInstallInvite = () => {
    setShowInstallInvite(false);
    if (!previewMode) {
      try { localStorage.setItem(installChoiceKey(parentUid), 'dismissed'); } catch { /* private browsing */ }
    }
  };

  const handleScroll = () => {
    const scroller = scrollRef.current;
    if (!scroller || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const top = scroller.scrollTop;
    const delta = top - lastScrollTop.current;
    const nearEnd = scroller.scrollHeight - scroller.clientHeight - top < 90;
    if (top < 90 || nearEnd) setNavHidden(false);
    else if (delta > 12 && top > 180) setNavHidden(true);
    else if (delta < -12) setNavHidden(false);
    if (Math.abs(delta) > 12 || top < 90 || nearEnd) lastScrollTop.current = top;
  };

  const requestInstall = async () => {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        try { localStorage.setItem(installChoiceKey(parentUid), 'accepted'); } catch { /* private browsing */ }
        setShowInstallInvite(false);
      } else dismissInstallInvite();
      setInstallPrompt(null);
    } catch {
      setInstallPrompt(null);
    }
  };

  const move = (next: Screen, cue: 'open' | 'navigate' | 'celebrate' = 'navigate') => {
    sound.play(cue);
    setScreen(next);
    setPickupPanel('status');
    setNavHidden(false);
    lastScrollTop.current = 0;
    setMascotCue(value => value + 1);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  };
  const changePickupPanel = (next: 'status' | 'notes') => {
    sound.play('navigate');
    setPickupPanel(next);
    setNavHidden(false);
    window.requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
      headingRef.current?.focus({ preventScroll: true });
    });
  };
  const choose = (id: string) => { setSelectedChildId(id); setDetail(null); setUpcomingIndex(0); move('home', 'open'); };
  const openProject = (kind: Detail['kind'], id: string, from: Detail['from'], tone: CardTone = 'blue') => {
    setDetail({ kind, id, from, tone });
    const project = kind === 'project' ? projects.find(item => item.id === id) : undefined;
    setStepIndex(project ? Math.max(0, (project.steps || []).findIndex(step => !stepIsApproved(project, step))) : 0);
    move('detail', project?.status === 'published' ? 'celebrate' : 'open');
  };
  const back = () => { if (screen === 'detail') move(detail?.from || 'home'); else if (screen === 'pickup' && pickupPanel === 'notes') changePickupPanel('status'); else if (screen === 'pickup') move('family'); else if (screen === 'moments') move('projects'); else if (screen === 'home') move('choose'); else move('home'); };
  const shiftUpcoming = (direction: number) => {
    if (!upcoming.length) return;
    const next = Math.min(upcoming.length - 1, Math.max(0, upcomingIndex + direction));
    if (next !== upcomingIndex) sound.play('step');
    setUpcomingIndex(next);
    upcomingRailRef.current?.children[next]?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', inline: 'start', block: 'nearest' });
  };
  const changeStep = (next: number) => {
    if (next < 0 || next >= steps.length || next === stepIndex) return;
    sound.play('step');
    setStepIndex(next);
    setMascotCue(value => value + 1);
    window.requestAnimationFrame(() => {
      stepSlideRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
      stepSlideRef.current?.focus({ preventScroll: true });
    });
  };

  const guideMessage = screen === 'choose' ? 'Leurs idées ont tant à raconter.'
    : screen === 'home' ? 'On entre dans son atelier !'
    : screen === 'detail' && selectedMission ? 'Cette idée attend encore son premier pas.'
    : screen === 'detail' && activeStep ? `Étape ${stepIndex + 1} : ${stepState(selectedProject!, activeStep).label.toLowerCase()}.`
    : screen === 'projects' ? 'Toutes ses idées sont ici, une à la fois.'
    : screen === 'moments' ? 'Les petits instants racontent aussi son parcours.'
    : screen === 'pickup' && pickupPanel === 'notes' ? 'Un petit mot, juste entre vous deux.'
    : screen === 'pickup' ? 'On suit son retour, étape après étape.'
    : 'Les informations utiles à la famille.';
  const activeStepTone = selectedProject && activeStep ? stepState(selectedProject, activeStep).tone : null;
  const mascotMood: ParentMascotMood = screen === 'choose' ? 'welcome'
    : screen === 'detail' && (activeStepTone === 'done' || selectedProject?.status === 'published') ? 'proud'
    : screen === 'detail' && activeStepTone === 'revise' ? 'care'
    : screen === 'pickup' || screen === 'family' ? 'calm'
    : screen === 'moments' ? 'proud' : 'curious';
  const mascotSpark = mascotMood === 'proud' ? '✦' : mascotMood === 'care' ? '♡' : mascotMood === 'curious' ? '?' : '✳';

  const gallery = activeChild ? [
    ...(activeChild.media.status === 'ready' ? activeChild.media.data.map(item => ({ id: item.id, url: item.url, caption: item.caption })) : []),
    ...projects.flatMap(project => [
      ...projectEvidenceImages(project).filter(url => url !== projectCover(project)).map((url, index) => ({ id: `${project.id}-${index}`, url, caption: project.title })),
      ...(project.steps || []).filter(step => step.evidence && proofKind(step.evidence, step.evidenceMimeType) === 'image' && isSafeProjectImage(step.evidence)).map(step => ({ id: `${project.id}-${step.id}`, url: step.evidence!, caption: `${project.title} · ${step.title}` }))
    ])
  ] : [];
  const moments = [...new Map(gallery.filter(item => isSafeProjectImage(item.url)).map(item => [item.url, item])).values()];
  const resources = [...new Map(projects.flatMap(project => project.resources || []).filter(item => isSafeFamilyHref(item.url)).map(item => [item.id || item.url, item])).values()];

  if (loading && children.length === 0 && !error) return <ParentFamilyLoading />;

  return <main className={`pf-app pf-screen-${screen}${activeChild ? ' pf-has-nav' : ''}`} ref={scrollRef} onScroll={handleScroll}>
    <header className="pf-header"><div className="pf-brand"><span>✳</span><strong>sparkquest<span>.</span></strong></div><div className="pf-header-actions">{previewMode && <span className="pf-preview-badge">Famille exemple</span>}{installPrompt && <button type="button" onClick={requestInstall} aria-label="Installer SparkQuest Famille" title="Installer SparkQuest Famille"><Download size={19} /></button>}<button type="button" className="pf-sound-toggle" onClick={sound.toggle} aria-label={sound.enabled ? 'Désactiver les sons' : 'Activer les sons'} aria-pressed={sound.enabled} title={sound.enabled ? 'Sons activés' : 'Sons désactivés'}>{sound.enabled ? <Volume2 size={19} /> : <VolumeX size={19} />}</button>{!previewMode && <button type="button" onClick={onRefresh} aria-label="Actualiser" disabled={loading}><RefreshCw size={19} /></button>}<button type="button" onClick={onSignOut} aria-label={previewMode ? 'Quitter l’aperçu' : 'Se déconnecter'}><LogOut size={19} /></button></div></header>
    <div className="pf-page">
      {loading && children.length > 0 && <div className="pf-refresh-state" role="status"><span className="pf-refresh-spinner" aria-hidden="true" /> On actualise son parcours…</div>}
      {error && <div className="pf-state pf-error" role="alert"><CircleAlert size={25} /><p>{error}</p><button type="button" onClick={onRefresh}>Réessayer</button></div>}
      {!loading && !error && children.length === 0 && <div className="pf-state"><BookOpen size={28} /><h1>Aucun enfant lié à ce compte</h1><p>Demandez à l’académie de relier votre compte parent aux enfants concernés.</p></div>}
      {!error && children.length > 0 && <>
        {screen !== 'choose' && <button type="button" className="pf-back" onClick={back}><ArrowLeft size={19} /> {screen === 'detail' ? detail?.from === 'home' ? 'Retour à l’accueil' : 'Retour aux projets' : screen === 'home' ? 'Changer d’enfant' : screen === 'pickup' ? pickupPanel === 'notes' ? 'Retour au suivi de sortie' : 'Retour au suivi famille' : 'Retour'}</button>}
        {!(screen === 'pickup' && pickupPanel === 'notes') && <div className={`pf-guide is-${mascotMood}${screen === 'choose' ? ' is-welcome' : ''}`}><div className="pf-guide-copy"><span className="pf-mini-label">{screen === 'choose' ? 'BIENVENUE DANS LEUR ATELIER' : `LE PARCOURS DE ${firstName(activeChild?.name || '').toLocaleUpperCase()}`}</span><p>{guideMessage}</p></div><span className="pf-guide-mascot"><ParentO11Y cue={mascotCue} mood={mascotMood} /><span key={mascotCue} className="pf-mascot-spark" aria-hidden="true">{mascotSpark}</span></span></div>}

        {screen === 'choose' && <section className="pf-choose" aria-labelledby="pf-title"><span className="pf-kicker">Bonjour{parentName ? ` ${firstName(parentName)}` : ''}.</span><h1 id="pf-title" ref={headingRef}>Qui souhaitez-vous retrouver aujourd’hui ?</h1><p>Choisissez un enfant pour suivre ses projets et ses découvertes.</p><div className="pf-children">{children.map((child, index) => {
          const focus = currentProjectFor(child.projects);
          return <button type="button" className="pf-child-option" key={child.id} onClick={() => choose(child.id)}><span className={`pf-child-avatar is-${index % 3}`}>{firstName(child.name).charAt(0).toUpperCase()}</span><span className="pf-child-copy"><strong>{child.name}</strong><small>{focus ? `En ce moment · ${focus.title}` : child.projects.length ? `${count(child.projects.length, 'projet enregistré', 'projets enregistrés')}` : 'Son parcours commence ici'}</small></span><ArrowRight size={20} /></button>;
        })}</div></section>}

        {activeChild && screen === 'home' && <><section className="pf-home-head"><span className="pf-kicker">{firstName(activeChild.name)} · SON ATELIER</span><h1 ref={headingRef} tabIndex={-1}>Ce que {firstName(activeChild.name)} fabrique en ce moment<span>.</span></h1><p>Un projet à découvrir, étape après étape.</p></section>{activeChild.issue && <p className="pf-source-warning" role="alert">{activeChild.issue}</p>}
          {currentProject ? <section className="pf-home-current" aria-labelledby="pf-current-title"><div className="pf-section-line"><span>01 / EN CE MOMENT</span><strong>{statusLabel(currentProject.status)}</strong></div><h2 id="pf-current-title" className="pf-visually-hidden">Son projet en cours</h2><ProjectCard project={currentProject} large onOpen={() => openProject('project', currentProject.id, 'home')} /></section>
            : <div className="pf-state pf-home-empty"><BookOpen size={27} /><h2>Pas encore de projet commencé</h2><p>Les projets enregistrés apparaîtront ici. Les missions assignées sont juste en dessous.</p></div>}
          <section className="pf-next" aria-labelledby="pf-next-title"><div className="pf-section-line"><span>02 / ET APRÈS ?</span>{upcoming.length > 1 && <span>{upcomingIndex + 1} / {upcoming.length}</span>}</div><h2 id="pf-next-title">Les idées qui l’attendent.</h2>{activeChild.upcoming.status === 'ready' ? <>{upcoming.length ? <><div className="pf-rail" ref={upcomingRailRef}>{upcoming.map((mission, index) => <UpcomingCard key={mission.id} mission={mission} tone={cardTones[index % cardTones.length]} onOpen={() => openProject('upcoming', mission.id, 'home', cardTones[index % cardTones.length])} />)}</div>{upcoming.length > 1 && <div className="pf-rail-controls"><button type="button" onClick={() => shiftUpcoming(-1)} disabled={upcomingIndex === 0} aria-label="Mission précédente"><ChevronLeft size={20} /></button><button type="button" onClick={() => shiftUpcoming(1)} disabled={upcomingIndex === upcoming.length - 1} aria-label="Mission suivante"><ChevronRight size={20} /></button></div>}</> : <p className="pf-quiet-state">Aucune nouvelle mission assignée n’est visible pour cet enfant.</p>}{activeChild.upcoming.data.contextNote && <p className="pf-source-warning">{activeChild.upcoming.data.contextNote}</p>}</> : <div className="pf-quiet-state" role={activeChild.upcoming.status === 'error' ? 'alert' : 'status'}>{activeChild.upcoming.reason}{activeChild.upcoming.status === 'error' && <button type="button" onClick={onRefresh}>Réessayer</button>}</div>}</section>
          <button type="button" className="pf-wide-link" onClick={() => move('projects')}>Voir tous ses projets <ArrowRight size={19} /></button>
        </>}

        {activeChild && screen === 'projects' && <section className="pf-archive"><span className="pf-kicker">TOUTES SES IDÉES</span><h1 ref={headingRef} tabIndex={-1}>Les projets de {firstName(activeChild.name)}.</h1><p>Choisissez un projet pour découvrir son histoire sur une page dédiée.</p>{projects.filter(project => project.status !== 'published').length > 0 && <section><h2>En cours</h2><div className="pf-card-grid">{projects.filter(project => project.status !== 'published').map((project, index) => <ProjectCard key={project.id} project={project} tone={cardTones[index % cardTones.length]} onOpen={() => openProject('project', project.id, 'projects', cardTones[index % cardTones.length])} />)}</div></section>}{upcoming.length > 0 && <section><h2>À venir</h2><div className="pf-card-grid">{upcoming.map((mission, index) => <UpcomingCard key={mission.id} mission={mission} tone={cardTones[(index + 2) % cardTones.length]} onOpen={() => openProject('upcoming', mission.id, 'projects', cardTones[(index + 2) % cardTones.length])} />)}</div></section>}{projects.filter(project => project.status === 'published').length > 0 && <section><h2>Terminés</h2><div className="pf-card-grid">{projects.filter(project => project.status === 'published').map((project, index) => <ProjectCard key={project.id} project={project} tone={cardTones[(index + 1) % cardTones.length]} onOpen={() => openProject('project', project.id, 'projects', cardTones[(index + 1) % cardTones.length])} />)}</div></section>}{!projects.length && !upcoming.length && <div className="pf-state"><BookOpen size={26} /><h2>Encore aucun projet visible</h2><p>Les projets enregistrés et les missions assignées apparaîtront ici.</p></div>}<button type="button" className="pf-wide-link" onClick={() => move('moments')}><ImageIcon size={20} /> Voir ses moments partagés <ArrowRight size={19} /></button></section>}

        {activeChild && screen === 'detail' && (selectedProject || selectedMission) && <section className={`pf-detail is-${detail?.tone || 'blue'}`}><div className="pf-detail-hero"><span className="pf-kicker">{selectedMission ? 'MISSION À VENIR' : 'SON PROJET'}</span><h1 ref={headingRef} tabIndex={-1}>{selectedProject?.title || selectedMission?.title || 'Projet'}</h1><p>{selectedProject?.description || selectedMission?.intention || 'Un projet à découvrir.'}</p><span className="pf-detail-status">{selectedMission ? 'Pas encore commencé' : statusLabel(selectedProject!.status)}</span><Cover src={selectedProject ? projectCover(selectedProject) : selectedMission?.thumbnailUrl} title={selectedProject?.title || selectedMission?.title || 'Projet'} priority /></div>
          {selectedMission ? <div className="pf-detail-intro"><span className="pf-mini-label">LE PROCHAIN PAS</span><h2>Une idée prête à démarrer.</h2><p>Cette mission a été assignée à {firstName(activeChild.name)}. Son travail et ses étapes apparaîtront lorsqu’un projet sera commencé.</p></div>
            : <><div className="pf-detail-intro"><span className="pf-mini-label">SON CHEMIN DE CRÉATION</span><h2>Une étape à la fois.</h2><p>Balayez les étapes, ou utilisez les boutons, pour voir son travail et les retours de MakerLab.</p></div>{steps.length ? <div className="pf-step-carousel" onTouchStart={event => { stepTouchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }} onTouchEnd={event => { const start = stepTouchStart.current; stepTouchStart.current = null; if (!start) return; const dx = event.changedTouches[0].clientX - start.x; const dy = event.changedTouches[0].clientY - start.y; if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.25) changeStep(Math.max(0, Math.min(steps.length - 1, stepIndex + (dx < 0 ? 1 : -1)))); }}><div className="pf-step-progress" role="group" aria-label="Progression des étapes">{steps.map((step, index) => { const state = stepState(selectedProject!, step); return <button type="button" key={step.id} className={`is-${state.tone}${index === stepIndex ? ' is-current' : ''}`} onClick={() => changeStep(index)} aria-label={`Étape ${index + 1} : ${step.title}, ${state.label}`} aria-current={index === stepIndex ? 'step' : undefined}><span>{index + 1}</span></button>; })}</div><StepSlide key={`${selectedProject!.id}-${activeStep.id}`} project={selectedProject!} step={activeStep} index={stepIndex} total={steps.length} focusRef={stepSlideRef} /><div className="pf-step-controls"><button type="button" onClick={() => changeStep(stepIndex - 1)} disabled={stepIndex === 0}><ChevronLeft size={20} /> Précédente</button><button type="button" onClick={() => changeStep(stepIndex + 1)} disabled={stepIndex === steps.length - 1}>Suivante <ChevronRight size={20} /></button></div></div> : <p className="pf-quiet-state">Les étapes enregistrées de ce projet ne sont pas encore disponibles.</p>}
              {selectedProject!.feedback && <aside className="pf-project-feedback"><strong>Dernier retour enregistré sur le projet</strong><p>{selectedProject!.feedback}</p></aside>}
              {(projectEvidenceImages(selectedProject!).length > 0 || selectedProject!.videoUrl || selectedProject!.presentationUrl) && <details className="pf-detail-disclosure"><summary>Autres réalisations partagées</summary><div className="pf-detail-gallery">{projectEvidenceImages(selectedProject!).filter(url => url !== projectCover(selectedProject!)).map((url, index) => <OptimizedImage src={url} key={`${url}-${index}`} alt={`${selectedProject!.title} · réalisation ${index + 1}`} sizes="(max-width: 700px) 44vw, 240px" />)}</div><div className="pf-resource-list">{isSafeFamilyHref(selectedProject!.videoUrl) && <a className="pf-resource-link" href={selectedProject!.videoUrl} target="_blank" rel="noopener noreferrer">Voir sa vidéo <ExternalLink size={16} /></a>}{isSafeFamilyHref(selectedProject!.presentationUrl) && <a className="pf-resource-link" href={selectedProject!.presentationUrl} target="_blank" rel="noopener noreferrer">Ouvrir sa présentation <ExternalLink size={16} /></a>}</div></details>}
              {Boolean(selectedProject!.missionBrief || selectedProject!.resources?.length || selectedProject!.reviewHistory?.length || selectedProject!.skills?.length) && <details className="pf-detail-disclosure"><summary>Le projet et les repères de l’atelier</summary>{selectedProject!.missionBrief && <div><h3>Ce qu’il cherche à réaliser</h3>{selectedProject!.missionBrief.goal && <p>{selectedProject!.missionBrief.goal}</p>}{selectedProject!.missionBrief.whyItMatters && <p>{selectedProject!.missionBrief.whyItMatters}</p>}{selectedProject!.missionBrief.finalOutcome && <p><b>Résultat attendu :</b> {selectedProject!.missionBrief.finalOutcome}</p>}{Boolean(selectedProject!.missionBrief.materials?.length) && <p><b>Matériel :</b> {selectedProject!.missionBrief.materials?.join(' · ')}</p>}</div>}<SafeResources resources={selectedProject!.resources} />{Boolean(selectedProject!.reviewHistory?.length) && <div><h3>Retours de MakerLab</h3>{selectedProject!.reviewHistory?.map(review => <p key={review.id}><b>{reviewLabel(review.outcome)}</b>{dateLabel(review.reviewedAt) && ` · ${dateLabel(review.reviewedAt)}`}<br />{review.feedback}</p>)}</div>}{Boolean(selectedProject!.skills?.length) && <p><b>Compétences :</b> {selectedProject!.skills?.join(' · ')}</p>}</details>}
            </>}
          <p className="pf-readonly"><ShieldCheck size={17} /> Vous consultez ce parcours. L’enfant et l’équipe MakerLab restent responsables des modifications.</p></section>}

        {activeChild && screen === 'moments' && <section className="pf-moments"><span className="pf-kicker">DANS LES COULISSES</span><h1 ref={headingRef} tabIndex={-1}>Ses moments partagés.</h1>{activeChild.media.status !== 'ready' && <p className="pf-source-warning" role="status">{activeChild.media.reason}</p>}{moments.length ? <><div className="pf-moments-grid">{(showAllMoments ? moments : moments.slice(0, 9)).map(moment => <figure key={moment.url}><OptimizedImage src={moment.url} alt={moment.caption} sizes="(max-width: 700px) 44vw, 280px" /><figcaption>{moment.caption}</figcaption></figure>)}</div>{moments.length > 9 && <button type="button" className="pf-wide-link" onClick={() => setShowAllMoments(value => !value)}>{showAllMoments ? 'Voir moins' : `Voir les ${moments.length} moments`}</button>}</> : <p className="pf-quiet-state">Aucune photo partagée pour le moment.</p>}{projects.some(project => isSafeFamilyHref(project.videoUrl) || isSafeFamilyHref(project.presentationUrl)) && <div className="pf-family-block"><h2>Vidéos et présentations</h2>{projects.map(project => <div key={project.id} className="pf-resource-list">{isSafeFamilyHref(project.videoUrl) && <a className="pf-resource-link" href={project.videoUrl} target="_blank" rel="noopener noreferrer">{project.title} · vidéo <ExternalLink size={16} /></a>}{isSafeFamilyHref(project.presentationUrl) && <a className="pf-resource-link" href={project.presentationUrl} target="_blank" rel="noopener noreferrer">{project.title} · présentation <ExternalLink size={16} /></a>}</div>)}</div>}</section>}

        {activeChild && screen === 'family' && <section className="pf-family"><span className="pf-kicker">LES INFORMATIONS UTILES</span><h1 ref={headingRef} tabIndex={-1}>Le suivi de {firstName(activeChild.name)}.</h1><p>Ces informations viennent des dossiers de l’académie et restent en lecture seule.</p><FamilyPickupLink child={activeChild} onOpen={() => move('pickup')} /><div className="pf-family-grid"><SourcePanel title="Présences" icon={<CalendarDays size={23} />} source={activeChild.operations.attendance} retry={onRefresh} render={attendance => <><strong>{attendance.latestStatus ? ({ present: 'Présent', absent: 'Absent', late: 'En retard', excused: 'Absence justifiée' })[attendance.latestStatus] || 'Présence enregistrée' : 'Aucune présence enregistrée'}</strong><p>{attendance.latestDate ? `${dateLabel(attendance.latestDate)} · ${count(attendance.present, 'présence', 'présences')} · ${count(attendance.late, 'retard', 'retards')}` : 'Après sa première séance, le suivi apparaîtra ici.'}</p>{attendance.records.length > 0 && <details className="pf-detail-disclosure"><summary>Voir les séances</summary>{attendance.records.map((item, index) => <p key={`${item.date}-${index}`}>{dateLabel(item.date)} · {item.status}</p>)}</details>}</>} /><SourcePanel title="Paiements" icon={<CreditCard size={23} />} source={activeChild.operations.finance} retry={onRefresh} render={finance => <><strong>{finance.enrollmentCount ? finance.balance > 0 ? `${money(finance.balance)} restants` : 'Tout est réglé' : 'Aucun montant dû'}</strong><p>{finance.enrollmentCount ? `${money(finance.paid)} réglés sur ${money(finance.agreed)}` : 'Aucune inscription facturée enregistrée.'}</p>{finance.enrollments.length > 0 && <details className="pf-detail-disclosure"><summary>Inscriptions et paiements</summary>{finance.enrollments.map(item => <p key={item.id}><b>{item.programName}</b> · {item.packName} · {money(item.paid)} réglés</p>)}{finance.payments.map(item => <p key={item.id}>{dateLabel(item.date)} · {money(item.amount)} · {item.status.replaceAll('_', ' ')}</p>)}</details>}</>} /></div><div className="pf-family-block"><h2>Ressources de ses projets</h2><SafeResources resources={resources} />{resources.length === 0 && <p className="pf-quiet-state">Les guides partagés avec ses projets apparaîtront ici.</p>}</div></section>}

        {activeChild && screen === 'pickup' && <section className="pf-pickup"><span className="pf-kicker">{pickupPanel === 'notes' ? 'UN MOT ENTRE VOUS' : 'SORTIE & ATELIER'}</span><h1 ref={headingRef} tabIndex={-1}>{pickupPanel === 'notes' ? `Notes avec ${firstName(activeChild.name)}.` : `La sortie de ${firstName(activeChild.name)}.`}</h1><ParentPickupExperience child={activeChild} parentUid={parentUid} organizationId={organizationId} currentParentName={parentName} onRefresh={onRefresh} previewMode={previewMode} view={pickupPanel} onViewChange={changePickupPanel} /></section>}
      </>}
      <p className="pf-credit">011Y par <a href="https://rive.app/marketplace/26076-48718-011y/" target="_blank" rel="noopener noreferrer">Patgrivet</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a></p>
    </div>
    {activeChild && <nav className={`pf-nav${navHidden ? ' is-hidden' : ''}`} aria-label="Navigation parent" onFocusCapture={() => setNavHidden(false)}><button type="button" aria-current={screen === 'home' || (screen === 'detail' && detail?.from === 'home') ? 'page' : undefined} onClick={() => move('home')}><Sparkles size={22} /><span>Aujourd’hui</span></button><button type="button" aria-current={screen === 'projects' || screen === 'moments' || (screen === 'detail' && detail?.from === 'projects') ? 'page' : undefined} onClick={() => move('projects')}><BookOpen size={22} /><span>Projets</span></button><button type="button" aria-current={screen === 'pickup' ? 'page' : undefined} onClick={() => move('pickup')}><Car size={22} /><span>Sortie</span></button><button type="button" aria-current={screen === 'family' ? 'page' : undefined} onClick={() => move('family')}><CreditCard size={22} /><span>Famille</span></button></nav>}
    {showInstallInvite && <ParentInstallInvitation nativeReady={Boolean(installPrompt)} onInstall={requestInstall} onDismiss={dismissInstallInvite} />}
  </main>;
};
