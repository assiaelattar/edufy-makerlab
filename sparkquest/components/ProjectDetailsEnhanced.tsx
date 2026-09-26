import React from 'react';
import {
    ArrowLeft, ArrowRight, BookOpen, Check, ClipboardCheck, Clock3,
    ExternalLink, FileText, Flag, Image, Link2, PlayCircle, ShieldCheck,
    Target, Users, Video, Wrench,
} from 'lucide-react';
import { ProcessTemplate, ProjectTemplate, Resource, StudentProject } from '../types';
import { getMissionReadiness, resolveMissionContent } from '../domain/missionContent';
import { StudentMissionDetails as StudentMissionDetailsV2 } from './StudentMissionDetails';

interface ProjectDetailsEnhancedProps {
    project: ProjectTemplate | StudentProject;
    workflow?: ProcessTemplate;
    role?: 'parent' | 'instructor' | 'student';
    onLaunch?: () => void;
    onBack?: () => void;
    onEdit?: () => void;
}

const resourceIcon = (resource: Resource) => {
    if (resource.type === 'video') return Video;
    if (resource.type === 'image') return Image;
    if (resource.type === 'link') return Link2;
    return FileText;
};

const evidenceLabel: Record<string, string> = {
    image: 'Photo', video: 'Video', document: 'Document', link: 'Link', text: 'Reflection', any: 'Any proof',
};

const StudentMissionDetails: React.FC<{
    project: ProjectTemplate | StudentProject;
    workflow?: ProcessTemplate;
    onLaunch?: () => void;
    onBack?: () => void;
}> = ({ project, workflow, onLaunch, onBack }) => {
    const content = resolveMissionContent(project, workflow);
    const resources = project.resources || [];
    const isExistingProject = 'templateId' in project;
    const actionLabel = isExistingProject ? 'Continue my build' : 'I understand — start mission';
    const coverImage = project.thumbnailUrl || ('coverImage' in project ? project.coverImage : '');
    const outcomes = 'learningOutcomes' in project ? project.learningOutcomes || [] : [];

    return <main className="min-h-screen bg-[#f5f7fa] pb-24 text-[#10213b] sm:pb-0">
        <header className="sticky top-0 z-40 border-b border-[#dce5f0] bg-white/95 backdrop-blur">
            <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
                <div className="flex min-w-0 items-center gap-3">
                    {onBack && <button type="button" onClick={onBack} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-[#dce5f0] text-[#10213b] transition hover:bg-[#eef3f8]" aria-label="Back to missions"><ArrowLeft size={19} /></button>}
                    <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0b5fff]">SparkQuest mission</p><p className="truncate text-sm font-black">{project.title}</p></div>
                </div>
                {onLaunch && <button type="button" onClick={onLaunch} className="hidden min-h-11 items-center gap-2 rounded-xl bg-[#ffb703] px-5 text-sm font-black text-[#2c2100] shadow-[0_4px_0_#d99b00] transition hover:-translate-y-0.5 hover:bg-[#ffc52c] sm:inline-flex">{actionLabel} <ArrowRight size={17} /></button>}
            </div>
        </header>

        <section className="relative overflow-hidden bg-[#071525] text-white">
            <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(92,143,201,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(92,143,201,.12)_1px,transparent_1px)] [background-size:32px_32px]" />
            <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#0b5fff]/20 blur-3xl" />
            <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1.15fr_.85fr] lg:px-8 lg:py-16">
                <div className="flex flex-col justify-center">
                    <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-[#5c8fc9]/40 bg-[#0b5fff]/15 px-3 py-1 text-xs font-black text-[#bcd8ff]">{project.station || 'MakerLab'}</span>
                        {'difficulty' in project && project.difficulty && <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-black capitalize text-slate-200">{project.difficulty}</span>}
                        {project.duration && <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-black text-slate-200"><Clock3 size={13} /> {project.duration}</span>}
                    </div>
                    <p className="mt-8 text-xs font-black uppercase tracking-[0.24em] text-[#ffca3a]">The challenge</p>
                    <h1 className="mt-3 max-w-4xl text-4xl font-black leading-[1.02] tracking-[-0.04em] sm:text-6xl lg:text-7xl">{project.title}</h1>
                    <p className="mt-6 max-w-2xl text-base font-semibold leading-7 text-[#c9d7e8] sm:text-xl sm:leading-8">{content.goal}</p>
                    <nav className="mt-8 flex flex-wrap gap-2" aria-label="Mission sections">
                        {[['#route', 'Build map'], ['#submit', 'What to submit'], ...(resources.length ? [['#resources', 'Resources']] : [])].map(([href, label]) => <a key={href} href={href} className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-black text-slate-200 transition hover:border-[#5c8fc9] hover:bg-white/10">{label}</a>)}
                    </nav>
                </div>
                <div className="relative min-h-[320px] overflow-hidden rounded-[28px] border border-white/10 bg-[#10243d] shadow-2xl">
                    {coverImage ? <img src={coverImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" /> : <div className="absolute inset-0 grid place-items-center"><div className="grid h-32 w-32 place-items-center rounded-full border border-dashed border-[#5c8fc9]/50 bg-[#0b5fff]/10 text-[#bcd8ff]"><Wrench size={48} strokeWidth={1.4} /></div></div>}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#071525] via-[#071525]/25 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ffca3a]">You are making</p><p className="mt-2 text-2xl font-black leading-tight">{content.finalOutcome}</p></div>
                </div>
            </div>
        </section>

        <div className="mx-auto grid max-w-7xl items-start gap-6 px-4 py-7 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_330px] lg:px-8">
            <div className="space-y-6">
                {content.whyItMatters && <section className="grid gap-5 rounded-3xl border border-[#dce5f0] bg-white p-6 shadow-sm sm:grid-cols-[150px_1fr] sm:p-8"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#0b5fff]">Why this matters</p></div><p className="text-lg font-bold leading-8 text-[#31445f]">{content.whyItMatters}</p></section>}

                <section id="route" className="scroll-mt-24 overflow-hidden rounded-3xl border border-[#cbd8e7] bg-white shadow-sm">
                    <div className="border-b border-[#dce5f0] px-6 py-6 sm:px-8"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#0b5fff]">Your build route</p><h2 className="mt-2 text-3xl font-black tracking-[-0.03em]">One step at a time</h2></div><span className="rounded-lg bg-[#eef4ff] px-3 py-2 text-xs font-black text-[#0b5fff]">{content.steps.length} checkpoints</span></div></div>
                    <ol className="relative grid gap-0 p-4 sm:p-6 md:grid-cols-2">
                        {content.steps.map((step, index) => <li key={step.id} className="relative m-2 min-h-40 overflow-hidden rounded-2xl border border-[#dce5f0] bg-[#f8fafc] p-5"><div className="absolute right-3 top-1 text-6xl font-black text-[#dce5f0]/70">{String(index + 1).padStart(2, '0')}</div><h3 className="relative mt-1 pr-12 text-lg font-black">{step.title}</h3>{step.description && <p className="relative mt-3 text-sm font-semibold leading-6 text-[#60728a]">{step.description}</p>}{step.resourceCount > 0 && <p className="relative mt-3 inline-flex items-center gap-1 text-xs font-black text-[#0b5fff]"><BookOpen size={14} /> {step.resourceCount} resource{step.resourceCount === 1 ? '' : 's'}</p>}</li>)}
                    </ol>
                </section>

                <section id="submit" className="scroll-mt-24 rounded-3xl border border-[#b9e5d6] bg-[#effaf6] p-6 sm:p-8">
                    <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#00a676] text-white"><ClipboardCheck size={24} /></span><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#007f5b]">Finish line</p><h2 className="mt-1 text-2xl font-black">Show what you made</h2><p className="mt-2 text-sm font-semibold leading-6 text-[#49675e]">Upload clear proof for every required item. Your instructor will review it and leave feedback.</p></div></div>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">{(content.deliverables.length ? content.deliverables : [{ id: 'proof', title: 'A finished project with clear build evidence', evidenceType: 'any' as const }]).map(item => <div key={item.id} className="flex gap-3 rounded-2xl border border-[#c8eadf] bg-white p-4"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#d8f4e9] text-[#007f5b]"><Check size={15} strokeWidth={3} /></span><div><p className="text-sm font-black">{item.title}</p>{item.description && <p className="mt-1 text-sm leading-5 text-[#60728a]">{item.description}</p>}<p className="mt-2 text-[10px] font-black uppercase tracking-wider text-[#007f5b]">Proof: {evidenceLabel[item.evidenceType || 'any']}</p></div></div>)}</div>
                </section>

                {resources.length > 0 && <section id="resources" className="scroll-mt-24 rounded-3xl border border-[#dce5f0] bg-white p-6 shadow-sm sm:p-8"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#0b5fff]">Mission resources</p><h2 className="mt-2 text-2xl font-black">Open these before you build</h2><div className="mt-6 grid gap-3 sm:grid-cols-2">{resources.map(resource => { const Icon = resourceIcon(resource); return <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer" className="group flex min-h-20 items-center gap-3 rounded-2xl border border-[#dce5f0] p-4 transition hover:-translate-y-0.5 hover:border-[#8db9ff] hover:shadow-md"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#eef4ff] text-[#0b5fff]"><Icon size={20} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-black">{resource.title}</span><span className="mt-1 block text-xs font-bold capitalize text-[#60728a]">{resource.type}</span></span><ExternalLink size={16} className="text-[#8ca0b8] transition group-hover:text-[#0b5fff]" /></a>; })}</div></section>}

                {outcomes.length > 0 && <section className="rounded-3xl border border-[#dce5f0] bg-white p-6 shadow-sm sm:p-8"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#0b5fff]">Skills you will practice</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{outcomes.map(outcome => <div key={outcome.id} className="border-l-4 border-[#0b5fff] bg-[#f8fafc] px-4 py-3"><p className="font-black">{outcome.title}</p><p className="mt-1 text-sm leading-5 text-[#60728a]">{outcome.desc}</p></div>)}</div></section>}
            </div>

            <aside className="space-y-4 lg:sticky lg:top-24">
                <section className="rounded-3xl border border-[#dce5f0] bg-white p-6 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0b5fff]">Ready check</p><h2 className="mt-2 text-xl font-black">Before you begin</h2>
                    <div className="mt-5 space-y-5">
                        <div><p className="text-[10px] font-black uppercase tracking-wider text-[#60728a]">Bring to the bench</p>{content.materials.length ? <ul className="mt-2 space-y-2">{content.materials.map(item => <li key={item} className="flex gap-2 text-sm font-bold"><Check size={15} className="mt-0.5 shrink-0 text-[#00a676]" />{item}</li>)}</ul> : <p className="mt-2 text-sm font-semibold text-[#60728a]">Your instructor will confirm the materials.</p>}</div>
                        {content.prerequisites.length > 0 && <div className="border-t border-[#e7edf4] pt-4"><p className="text-[10px] font-black uppercase tracking-wider text-[#60728a]">Do first</p><ul className="mt-2 space-y-2">{content.prerequisites.map(item => <li key={item} className="flex gap-2 text-sm font-bold"><span className="text-[#0b5fff]">→</span>{item}</li>)}</ul></div>}
                        {content.safetyNotes.length > 0 && <div className="rounded-2xl border border-[#ffe29a] bg-[#fff8e6] p-4"><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#916600]"><ShieldCheck size={15} /> Safety check</p><ul className="mt-2 space-y-2">{content.safetyNotes.map(item => <li key={item} className="text-sm font-bold text-[#624b0d]">{item}</li>)}</ul></div>}
                    </div>
                    {onLaunch && <button type="button" onClick={onLaunch} className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#ffb703] px-5 text-center font-black text-[#2c2100] shadow-[0_4px_0_#d99b00] transition hover:-translate-y-0.5 hover:bg-[#ffc52c]"><PlayCircle size={20} /> {actionLabel}</button>}
                </section>
            </aside>
        </div>
        {onLaunch && <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#dce5f0] bg-white p-3 sm:hidden"><button type="button" onClick={onLaunch} className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#ffb703] px-4 font-black text-[#2c2100] shadow-[0_3px_0_#d99b00]"><PlayCircle size={19} /> {actionLabel}</button></div>}
    </main>;
};

export const ProjectDetailsEnhanced: React.FC<ProjectDetailsEnhancedProps> = ({
    project, workflow, role = 'student', onLaunch, onBack, onEdit,
}) => {
    const content = resolveMissionContent(project, workflow);
    const isInstructor = role === 'instructor';
    const isStudent = role === 'student';
    const template = project as ProjectTemplate;
    const readiness = getMissionReadiness(template);
    const resources = project.resources || [];
    const isExistingProject = 'templateId' in project;
    const learnerActionLabel = isExistingProject ? 'Continue project' : 'Start this mission';
    const audience = template.targetAudience;
    const audienceCount = (audience?.programs?.length || 0) + (audience?.grades?.length || 0)
        + (audience?.groups?.length || 0) + (audience?.students?.length || 0);
    const coverImage = project.thumbnailUrl || ('coverImage' in project ? project.coverImage : '');

    if (isStudent) {
        return <StudentMissionDetailsV2 project={project} workflow={workflow} onLaunch={onLaunch} onBack={onBack} />;
    }

    return (
        <main className="min-h-screen bg-[#f3f6f9] text-slate-950">
            <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
                <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
                    <div className="flex min-w-0 items-center gap-3">
                        {onBack && <button type="button" onClick={onBack} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-label="Back to missions"><ArrowLeft size={19} /></button>}
                        <div className="min-w-0"><p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">Mission dossier</p><p className="truncate text-sm font-extrabold text-slate-700">{project.title}</p></div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isInstructor && onEdit && <button type="button" onClick={onEdit} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-extrabold text-slate-800 hover:border-blue-300 hover:text-blue-700"><Wrench size={17} /> Edit mission</button>}
                        {isStudent && onLaunch && <button type="button" onClick={onLaunch} className="hidden min-h-11 items-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-black text-amber-950 shadow-sm hover:bg-amber-300 sm:inline-flex">{learnerActionLabel} <ArrowRight size={17} /></button>}
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
                <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950 text-white shadow-sm">
                    <div className="grid lg:grid-cols-[1.25fr_0.75fr]">
                        <div className="p-6 sm:p-9 lg:p-12">
                            <div className="flex flex-wrap gap-2">
                                <span className="rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-xs font-extrabold text-blue-200">{project.station || 'MakerLab'}</span>
                                {'difficulty' in project && project.difficulty && <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-extrabold capitalize text-slate-200">{project.difficulty}</span>}
                                {project.duration && <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-extrabold text-slate-200"><Clock3 size={13} /> {project.duration}</span>}
                            </div>
                            <p className="mt-7 text-xs font-black uppercase tracking-[0.22em] text-amber-300">Your challenge</p>
                            <h1 className="mt-3 max-w-4xl text-3xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">{project.title}</h1>
                            <p className="mt-5 max-w-3xl text-base font-medium leading-7 text-slate-300 sm:text-lg">{content.goal}</p>
                            {content.whyItMatters && <p className="mt-4 max-w-3xl border-l-2 border-amber-400 pl-4 text-sm leading-6 text-slate-400"><strong className="text-white">Why it matters:</strong> {content.whyItMatters}</p>}
                        </div>
                        <div className="relative min-h-64 border-t border-white/10 bg-[#14233a] lg:border-l lg:border-t-0">
                            {coverImage ? <img src={coverImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-65" /> : <div className="absolute inset-0 bg-[linear-gradient(rgba(96,165,250,.09)_1px,transparent_1px),linear-gradient(90deg,rgba(96,165,250,.09)_1px,transparent_1px)] bg-[size:28px_28px]" />}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
                            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8"><p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">Final outcome</p><p className="mt-2 text-xl font-black leading-snug text-white">{content.finalOutcome}</p></div>
                        </div>
                    </div>
                </section>

                <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-6">
                        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="build-map-title">
                            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Build map</p><h2 id="build-map-title" className="mt-2 text-2xl font-black tracking-tight">How you will complete the mission</h2></div><span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">{content.steps.length} steps</span></div>
                            <ol className="mt-7 space-y-1">
                                {content.steps.map((step, index) => <li key={step.id} className="grid grid-cols-[44px_1fr] gap-4"><div className="flex flex-col items-center"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-700 text-sm font-black text-white">{index + 1}</span>{index < content.steps.length - 1 && <span className="my-1 min-h-10 w-px flex-1 bg-slate-200" />}</div><div className="pb-6 pt-1"><h3 className="font-black text-slate-950">{step.title}</h3>{step.description && <p className="mt-1 text-sm leading-6 text-slate-500">{step.description}</p>}{step.resourceCount > 0 && <span className="mt-3 inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-extrabold text-blue-700"><BookOpen size={13} /> {step.resourceCount} step resource{step.resourceCount === 1 ? '' : 's'}</span>}</div></li>)}
                            </ol>
                        </section>

                        <section className="grid gap-6 md:grid-cols-2">
                            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><ClipboardCheck size={21} /></div><h2 className="mt-4 text-xl font-black">What to submit</h2>
                                {content.deliverables.length ? <ul className="mt-5 space-y-4">{content.deliverables.map(item => <li key={item.id} className="flex gap-3"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check size={14} strokeWidth={3} /></span><div><p className="text-sm font-extrabold text-slate-900">{item.title}</p>{item.description && <p className="mt-1 text-sm leading-5 text-slate-500">{item.description}</p>}<p className="mt-1 text-xs font-bold text-emerald-700">{evidenceLabel[item.evidenceType || 'any']}</p></div></li>)}</ul> : <p className="mt-4 text-sm leading-6 text-slate-500">Complete every build step, add proof of your work, and submit the finished project for review.</p>}
                            </div>
                            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-700"><Wrench size={21} /></div><h2 className="mt-4 text-xl font-black">Prepare your workspace</h2>
                                {content.materials.length ? <ul className="mt-5 grid gap-2">{content.materials.map(item => <li key={item} className="flex gap-2 text-sm font-semibold text-slate-700"><span className="text-amber-600">•</span>{item}</li>)}</ul> : <p className="mt-4 text-sm leading-6 text-slate-500">Your instructor will confirm the tools and materials for this mission.</p>}
                                {content.safetyNotes.length > 0 && <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-amber-800"><ShieldCheck size={15} /> Safety first</p><ul className="mt-2 space-y-1 text-sm text-amber-950">{content.safetyNotes.map(note => <li key={note}>{note}</li>)}</ul></div>}
                            </div>
                        </section>

                        {resources.length > 0 && <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Mission resources</p><h2 className="mt-2 text-2xl font-black">Read, watch, and download</h2><div className="mt-6 grid gap-3 sm:grid-cols-2">{resources.map(resource => { const Icon = resourceIcon(resource); return <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer" className="flex min-h-16 items-center gap-3 rounded-2xl border border-slate-200 p-4 text-left hover:border-blue-300 hover:bg-blue-50/50"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700"><Icon size={19} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold text-slate-900">{resource.title}</span><span className="text-xs font-bold capitalize text-slate-500">{resource.type}</span></span><ExternalLink size={16} className="text-slate-400" /></a>; })}</div></section>}
                    </div>

                    <aside className="space-y-4 lg:sticky lg:top-24">
                        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Mission board</p>
                            <dl className="mt-5 space-y-4"><div className="flex items-center justify-between gap-4"><dt className="flex items-center gap-2 text-sm font-bold text-slate-500"><Flag size={16} /> Station</dt><dd className="text-right text-sm font-black">{project.station || 'General'}</dd></div><div className="flex items-center justify-between gap-4"><dt className="flex items-center gap-2 text-sm font-bold text-slate-500"><Target size={16} /> Skills</dt><dd className="text-right text-sm font-black">{project.skills?.length || 0}</dd></div><div className="flex items-center justify-between gap-4"><dt className="flex items-center gap-2 text-sm font-bold text-slate-500"><BookOpen size={16} /> Resources</dt><dd className="text-right text-sm font-black">{resources.length}</dd></div>{isInstructor && <div className="flex items-center justify-between gap-4"><dt className="flex items-center gap-2 text-sm font-bold text-slate-500"><Users size={16} /> Targets</dt><dd className="text-right text-sm font-black">{audienceCount}</dd></div>}</dl>
                            {isInstructor ? <div className="mt-6 border-t border-slate-200 pt-5"><div className="flex items-center justify-between"><p className="text-sm font-black">Publish readiness</p><p className="text-sm font-black text-blue-700">{readiness.completed}/{readiness.total}</p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-700" style={{ width: `${(readiness.completed / readiness.total) * 100}%` }} /></div><ul className="mt-4 space-y-2">{readiness.checks.map(check => <li key={check.id} className={`flex items-center gap-2 text-xs font-bold ${check.complete ? 'text-emerald-700' : 'text-slate-400'}`}><span className={`grid h-5 w-5 place-items-center rounded-full ${check.complete ? 'bg-emerald-100' : 'bg-slate-100'}`}>{check.complete && <Check size={12} strokeWidth={3} />}</span>{check.label}</li>)}</ul></div> : isStudent ? <button type="button" onClick={onLaunch} disabled={!onLaunch} className="mt-6 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 font-black text-amber-950 shadow-sm hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"><PlayCircle size={19} /> {onLaunch ? learnerActionLabel : 'Mission in progress'}</button> : null}
                        </div>
                        {content.prerequisites.length > 0 && <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="text-sm font-black">Before you start</h3><ul className="mt-3 space-y-2">{content.prerequisites.map(item => <li key={item} className="flex gap-2 text-sm leading-5 text-slate-600"><Check size={15} className="mt-0.5 shrink-0 text-blue-700" />{item}</li>)}</ul></div>}
                    </aside>
                </div>
            </div>
            {isStudent && onLaunch && <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white p-3 sm:hidden"><button type="button" onClick={onLaunch} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 font-black text-amber-950">{learnerActionLabel} <ArrowRight size={17} /></button></div>}
        </main>
    );
};
