import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
    ArrowLeft, ArrowRight, BookOpen, Camera, Check, CheckCircle2, Clock3,
    ExternalLink, FileText, FlaskConical, Hammer, Image, Lightbulb, Link2,
    PackageCheck, PencilRuler, PlayCircle, Search, Share2, ShieldCheck,
    Sparkles, Target, Video,
} from 'lucide-react';
import { ProcessTemplate, ProjectTemplate, Resource, StudentProject } from '../types';
import { resolveMissionContent } from '../domain/missionContent';

interface StudentMissionDetailsProps {
    project: ProjectTemplate | StudentProject;
    workflow?: ProcessTemplate;
    onLaunch?: () => void;
    onBack?: () => void;
}

const engineeringPhases = [
    { label: 'Ask', hint: 'What is the problem?', icon: Search, color: 'text-[#3563e9]', surface: 'bg-[#edf3ff]' },
    { label: 'Imagine', hint: 'What could work?', icon: Lightbulb, color: 'text-[#b66705]', surface: 'bg-[#fff4dc]' },
    { label: 'Build', hint: 'Make your idea.', icon: Hammer, color: 'text-[#d35445]', surface: 'bg-[#fff0ed]' },
    { label: 'Test', hint: 'Try and improve.', icon: FlaskConical, color: 'text-[#087f61]', surface: 'bg-[#eafaf5]' },
    { label: 'Share', hint: 'Show your proof.', icon: Share2, color: 'text-[#6845ce]', surface: 'bg-[#f2efff]' },
];

const stepLooks = [
    { surface: 'bg-[#edf3ff]', border: 'border-[#bfd1ff]', ink: 'text-[#3563e9]', number: 'bg-[#3563e9]' },
    { surface: 'bg-[#fff4dc]', border: 'border-[#f4d895]', ink: 'text-[#a7650a]', number: 'bg-[#d58a1e]' },
    { surface: 'bg-[#fff0ed]', border: 'border-[#f4c4bc]', ink: 'text-[#c24d3f]', number: 'bg-[#ed6a5a]' },
    { surface: 'bg-[#eafaf5]', border: 'border-[#b8eadb]', ink: 'text-[#087f61]', number: 'bg-[#1e9e78]' },
];

const proofLooks = [
    { surface: 'bg-[#edf3ff]', border: 'border-[#bfd1ff]', ink: 'text-[#3563e9]' },
    { surface: 'bg-[#eafaf5]', border: 'border-[#b8eadb]', ink: 'text-[#087f61]' },
    { surface: 'bg-[#f2efff]', border: 'border-[#d7ccff]', ink: 'text-[#6845ce]' },
];

const resourceIcon = (resource: Resource) => {
    if (resource.type === 'video') return Video;
    if (resource.type === 'image') return Image;
    if (resource.type === 'link') return Link2;
    return FileText;
};

const evidenceIcon = (type?: string) => {
    if (type === 'video') return Video;
    if (type === 'image') return Camera;
    if (type === 'document') return FileText;
    if (type === 'link') return Link2;
    if (type === 'text') return Lightbulb;
    return CheckCircle2;
};

const stepIcon = (title: string, index: number) => {
    const normalized = title.toLowerCase();
    if (normalized.includes('plan') || normalized.includes('sketch') || normalized.includes('design')) return PencilRuler;
    if (normalized.includes('test') || normalized.includes('measure') || normalized.includes('improve')) return FlaskConical;
    if (normalized.includes('build') || normalized.includes('make') || normalized.includes('wire')) return Hammer;
    if (normalized.includes('share') || normalized.includes('present')) return Share2;
    return [Search, PencilRuler, Hammer, FlaskConical][index % 4];
};

const evidenceLabel: Record<string, string> = {
    image: 'Take a photo',
    video: 'Record a video',
    document: 'Add a document',
    link: 'Share a link',
    text: 'Explain what you learned',
    any: 'Add clear proof',
};

export const StudentMissionDetails: React.FC<StudentMissionDetailsProps> = ({
    project, workflow, onLaunch, onBack,
}) => {
    const content = resolveMissionContent(project, workflow);
    const resources = project.resources || [];
    const outcomes = 'learningOutcomes' in project ? project.learningOutcomes || [] : [];
    const isExistingProject = 'templateId' in project;
    const actionLabel = isExistingProject ? 'Continue my build' : 'Start this mission';
    const coverImage = project.thumbnailUrl || ('coverImage' in project ? project.coverImage : '') || '/mission-plant-guardian.svg';
    const reduceMotion = useReducedMotion();
    const deliverables = content.deliverables.length
        ? content.deliverables
        : [{ id: 'proof', title: 'My finished project', evidenceType: 'any' as const }];

    const reveal = (delay = 0) => reduceMotion
        ? {}
        : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] as const } };

    return (
        <main className="h-screen overflow-y-auto scroll-smooth bg-[#f5f7fb] text-[#14213d] selection:bg-[#cedaff] selection:text-[#14213d]">
            <header className="sticky top-0 z-50 border-b border-[#dfe6f1] bg-white/95 backdrop-blur-xl">
                <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
                    <div className="flex min-w-0 items-center gap-3">
                        {onBack && <button type="button" onClick={onBack} className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-[#dfe6f1] bg-white transition hover:-translate-y-0.5 hover:border-[#b9c8dd] hover:shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#3563e9]/20" aria-label="Back to missions"><ArrowLeft size={19} /></button>}
                        <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3563e9]">STEM mission</p><p className="truncate text-sm font-extrabold sm:max-w-md">{project.title}</p></div>
                    </div>
                    {onLaunch && <button type="button" onClick={onLaunch} className="hidden min-h-11 items-center gap-2 rounded-xl bg-[#f4c64e] px-5 text-sm font-black text-[#3d2c00] shadow-[0_4px_0_#d9a72a] transition hover:-translate-y-0.5 hover:bg-[#ffd66e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#f4c64e]/30 sm:inline-flex"><PlayCircle size={18} /> {actionLabel}</button>}
                </div>
            </header>

            <section className="relative overflow-hidden border-b border-[#dfe6f1] bg-white">
                <div className="absolute inset-0 opacity-65 [background-image:radial-gradient(#d6e0ee_1px,transparent_1px)] [background-size:22px_22px]" />
                <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-11 lg:px-8">
                    <motion.div {...reveal()} className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf3ff] px-3 py-1.5 text-xs font-black text-[#3563e9]"><Sparkles size={14} /> {project.station || 'MakerLab'}</span>
                        {'difficulty' in project && project.difficulty && <span className="rounded-full bg-[#eef1f5] px-3 py-1.5 text-xs font-black capitalize text-[#53647b]">{project.difficulty}</span>}
                        {project.duration && <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff4dc] px-3 py-1.5 text-xs font-black text-[#76520c]"><Clock3 size={14} /> {project.duration}</span>}
                    </motion.div>

                    <div className="mt-5 grid gap-5 lg:grid-cols-[.92fr_1.08fr]">
                        <motion.figure {...reveal(0.04)} className="group relative min-h-[340px] overflow-hidden rounded-[30px] bg-[#182d4d] shadow-[0_22px_60px_rgba(20,33,61,.2)] sm:min-h-[440px]">
                            <img src={coverImage} alt={`${project.title} project example`} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0e1b30] via-[#0e1b30]/10 to-transparent" />
                            <figcaption className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f8d873]">Your build target</p>
                                <p className="mt-2 text-xl font-extrabold leading-snug sm:text-2xl">{content.finalOutcome}</p>
                            </figcaption>
                        </motion.figure>

                        <motion.div {...reveal(0.09)} className="flex flex-col rounded-[30px] border border-[#dfe6f1] bg-white p-6 shadow-[0_18px_50px_rgba(31,51,82,.08)] sm:p-9">
                            <p className="text-xs font-black uppercase tracking-[0.19em] text-[#ed6a5a]">The problem to solve</p>
                            <h1 className="mt-3 text-4xl font-black leading-[1.04] tracking-[-0.045em] sm:text-5xl lg:text-6xl">{project.title}</h1>
                            <p className="mt-5 text-base font-bold leading-7 text-[#52627a] sm:text-lg">{content.goal}</p>
                            {content.whyItMatters && <div className="mt-auto pt-7"><div className="rounded-2xl border border-[#f4c4bc] bg-[#fff0ed] p-4"><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.17em] text-[#c24d3f]"><Lightbulb size={16} /> Why this matters</p><p className="mt-2 text-sm font-bold leading-6 text-[#65443f]">{content.whyItMatters}</p></div></div>}
                        </motion.div>
                    </div>

                    <motion.section {...reveal(0.14)} className="mt-6 rounded-[26px] border border-[#dfe6f1] bg-[#14213d] p-5 text-white shadow-[0_16px_45px_rgba(20,33,61,.16)] sm:p-7" aria-labelledby="engineering-cycle-title">
                        <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#91abff]">The engineering cycle</p><h2 id="engineering-cycle-title" className="mt-1 text-2xl font-extrabold">Solve it like an engineer</h2></div><p className="text-xs font-bold text-[#aebbd0]">You can go back and improve at any time.</p></div>
                        <ol className="mt-5 grid gap-2 sm:grid-cols-5">
                            {engineeringPhases.map((phase, index) => { const Icon = phase.icon; return <li key={phase.label} className="relative flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.055] p-3 sm:block sm:min-h-32 sm:p-4"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${phase.surface} ${phase.color}`}><Icon size={20} /></span><div className="sm:mt-4"><p className="text-sm font-extrabold">{index + 1}. {phase.label}</p><p className="mt-0.5 text-xs font-semibold leading-4 text-[#aebbd0]">{phase.hint}</p></div>{index < engineeringPhases.length - 1 && <ArrowRight size={15} className="absolute -right-2.5 top-1/2 z-10 hidden -translate-y-1/2 text-[#7990b2] sm:block" />}</li>; })}
                        </ol>
                    </motion.section>

                    <motion.div {...reveal(0.18)} className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="flex items-center gap-3 rounded-2xl border border-[#bfd1ff] bg-[#edf3ff] p-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#3563e9] shadow-sm"><Target size={21} /></span><div><p className="text-[10px] font-black uppercase tracking-wider text-[#5873a5]">Build plan</p><p className="font-extrabold">{content.steps.length} guided steps</p></div></div>
                        <div className="flex items-center gap-3 rounded-2xl border border-[#b8eadb] bg-[#eafaf5] p-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#087f61] shadow-sm"><Hammer size={21} /></span><div><p className="text-[10px] font-black uppercase tracking-wider text-[#4a7f70]">Tool bench</p><p className="font-extrabold">{content.materials.length || 'Check'} material{content.materials.length === 1 ? '' : 's'}</p></div></div>
                        <div className="flex items-center gap-3 rounded-2xl border border-[#d7ccff] bg-[#f2efff] p-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#6845ce] shadow-sm"><PackageCheck size={21} /></span><div><p className="text-[10px] font-black uppercase tracking-wider text-[#75669f]">Finish line</p><p className="font-extrabold">{deliverables.length} proof item{deliverables.length === 1 ? '' : 's'}</p></div></div>
                    </motion.div>
                </div>
            </section>

            <div className="mx-auto max-w-7xl space-y-9 px-4 py-9 pb-28 sm:px-6 sm:pb-14 lg:px-8">
                <section aria-labelledby="toolkit-title">
                    <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#087f61]">Before you build</p><h2 id="toolkit-title" className="mt-1 text-3xl font-black tracking-[-0.035em]">Set up your tool bench</h2><p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#63738a]">Collect your parts, open the helpers, and check the safety notes.</p></div>
                    <div className="mt-5 grid gap-5 lg:grid-cols-[.95fr_1.05fr]">
                        <motion.article {...reveal()} className="rounded-[26px] border border-[#b8eadb] bg-[#f1fbf7] p-5 sm:p-7">
                            <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-[#087f61] shadow-sm"><Hammer size={21} /></span><div><p className="text-[10px] font-black uppercase tracking-wider text-[#4a7f70]">Tools and materials</p><h3 className="text-xl font-extrabold">Bring these to your bench</h3></div></div>
                            {content.materials.length ? <ul className="mt-5 grid gap-2 sm:grid-cols-2">{content.materials.map(item => <li key={item} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-bold text-[#245f4f] shadow-sm"><Check size={16} strokeWidth={3} className="shrink-0 text-[#1e9e78]" /> {item}</li>)}</ul> : <p className="mt-5 text-sm font-bold text-[#526d65]">Ask your instructor what you need before you start.</p>}
                        </motion.article>

                        <motion.article {...reveal(0.05)} id="resources" className="scroll-mt-24 rounded-[26px] border border-[#d7ccff] bg-[#f7f4ff] p-5 sm:p-7">
                            <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-[#6845ce] shadow-sm"><BookOpen size={21} /></span><div><p className="text-[10px] font-black uppercase tracking-wider text-[#75669f]">Mission helpers</p><h3 className="text-xl font-extrabold">Learn before you build</h3></div></div>
                            {resources.length ? <div className="mt-5 grid gap-2">{resources.map(resource => { const Icon = resourceIcon(resource); return <motion.a whileHover={reduceMotion ? {} : { x: 3 }} key={resource.id} href={resource.url} target="_blank" rel="noreferrer" className="group flex min-h-16 items-center gap-3 rounded-xl border border-[#e2dcf6] bg-white p-3 transition hover:border-[#bcaef0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7756e8]/20"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eee8ff] text-[#6845ce]"><Icon size={19} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold">{resource.title}</span><span className="block text-xs font-bold capitalize text-[#758198]">{resource.type}</span></span><ExternalLink size={16} className="text-[#8c9bb0] group-hover:text-[#6845ce]" /></motion.a>; })}</div> : <p className="mt-5 text-sm font-bold text-[#63577f]">No extra helpers are needed. Follow the build steps below.</p>}
                        </motion.article>
                    </div>
                    {(content.prerequisites.length > 0 || content.safetyNotes.length > 0) && <div className="mt-4 grid gap-3 sm:grid-cols-2">{content.prerequisites.length > 0 && <div className="rounded-2xl border border-[#bfd1ff] bg-[#edf3ff] p-4"><p className="text-[10px] font-black uppercase tracking-wider text-[#3563e9]">Do this first</p><ul className="mt-2 space-y-1.5">{content.prerequisites.map(item => <li key={item} className="flex gap-2 text-sm font-bold text-[#354f7c]"><ArrowRight size={16} className="mt-0.5 shrink-0" />{item}</li>)}</ul></div>}{content.safetyNotes.length > 0 && <div className="rounded-2xl border border-[#f4d895] bg-[#fff4dc] p-4"><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#8a5c06]"><ShieldCheck size={16} /> Safety check</p><ul className="mt-2 space-y-1.5">{content.safetyNotes.map(item => <li key={item} className="text-sm font-bold text-[#644b1b]">{item}</li>)}</ul></div>}</div>}
                </section>

                <section id="route" className="scroll-mt-24">
                    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#3563e9]">Now build it</p><h2 className="mt-1 text-3xl font-black tracking-[-0.035em]">Follow your project plan</h2><p className="mt-2 text-sm font-semibold text-[#63738a]">Finish one stage, check your work, then move to the next.</p></div><span className="rounded-full bg-white px-3 py-2 text-xs font-black text-[#53647b] shadow-sm">{content.steps.length} stages</span></div>
                    <ol className="mt-5 grid gap-4 md:grid-cols-2">
                        {content.steps.map((step, index) => {
                            const look = stepLooks[index % stepLooks.length];
                            const Icon = stepIcon(step.title, index);
                            return <motion.li key={step.id} initial={reduceMotion ? false : { opacity: 0, y: 14 }} whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.22 }} transition={{ duration: 0.36, delay: reduceMotion ? 0 : (index % 2) * 0.06 }} whileHover={reduceMotion ? {} : { y: -3 }} className={`relative min-h-48 overflow-hidden rounded-[24px] border p-5 shadow-sm ${look.surface} ${look.border}`}>
                                <div className="flex items-start justify-between gap-4"><span className={`grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-sm ${look.ink}`}><Icon size={24} /></span><span className={`grid h-8 min-w-8 place-items-center rounded-full px-2 text-xs font-black text-white ${look.number}`}>{index + 1}</span></div>
                                <h3 className="mt-5 text-xl font-extrabold leading-tight">{step.title}</h3>
                                {step.description && <p className="mt-2 line-clamp-3 text-sm font-semibold leading-6 text-[#596b82]">{step.description}</p>}
                                {step.resourceCount > 0 && <p className={`mt-4 inline-flex items-center gap-1.5 text-xs font-black ${look.ink}`}><BookOpen size={14} /> {step.resourceCount} helper{step.resourceCount === 1 ? '' : 's'}</p>}
                            </motion.li>;
                        })}
                    </ol>
                </section>

                <section id="submit" className="scroll-mt-24 rounded-[28px] bg-[#14213d] p-5 text-white shadow-[0_18px_50px_rgba(20,33,61,.16)] sm:p-8">
                    <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#1e9e78] text-white"><PackageCheck size={24} /></span><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#8ee3c8]">Test, prove, improve</p><h2 className="mt-1 text-3xl font-black tracking-[-0.03em]">How you finish the mission</h2><p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#c5d0df]">Check that your solution works, then add the proof shown on each card.</p></div></div>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {deliverables.map((item, index) => { const look = proofLooks[index % proofLooks.length]; const Icon = evidenceIcon(item.evidenceType); return <motion.article key={item.id} initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }} whileInView={reduceMotion ? {} : { opacity: 1, scale: 1 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.32, delay: reduceMotion ? 0 : index * 0.05 }} className={`rounded-2xl border p-4 text-[#14213d] ${look.surface} ${look.border}`}><span className={`grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm ${look.ink}`}><Icon size={20} /></span><p className="mt-4 font-extrabold leading-snug">{item.title}</p>{item.description && <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-[#596b82]">{item.description}</p>}<p className={`mt-3 text-[10px] font-black uppercase tracking-wider ${look.ink}`}>{evidenceLabel[item.evidenceType || 'any']}</p></motion.article>; })}
                    </div>
                </section>

                {outcomes.length > 0 && <section className="rounded-[24px] border border-[#dfe6f1] bg-white p-5 shadow-sm sm:p-6"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#3563e9]">What you will learn</p><h2 className="mt-1 text-2xl font-extrabold">Skills unlocked by this mission</h2><div className="mt-4 flex flex-wrap gap-2">{outcomes.map((outcome, index) => <span key={outcome.id} className={`rounded-xl px-3 py-2 text-sm font-extrabold ${index % 3 === 0 ? 'bg-[#edf3ff] text-[#3563e9]' : index % 3 === 1 ? 'bg-[#eafaf5] text-[#087f61]' : 'bg-[#f2efff] text-[#6845ce]'}`}>{outcome.title}</span>)}</div></section>}
            </div>

            {onLaunch && <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#dfe6f1] bg-white/96 p-3 backdrop-blur-xl sm:hidden"><button type="button" onClick={onLaunch} className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#f4c64e] px-4 font-black text-[#3d2c00] shadow-[0_4px_0_#d9a72a]"><PlayCircle size={20} /> {actionLabel}</button></div>}
        </main>
    );
};
