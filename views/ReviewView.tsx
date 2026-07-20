import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, Award, CheckCircle2, Clock, ExternalLink, Eye, Filter, MessageSquare, Microscope, Search, Trash2, Users, XCircle } from 'lucide-react';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { AtlasActionButton, AtlasCommandHeader, AtlasEmptyState, AtlasSectionHeader, AtlasSignalCard, AtlasToolbar } from '../components/atlas/AtlasSurface';
import { db } from '../services/firebase';

const QUICK_FEEDBACKS = [
    'Great work. The evidence is clear.',
    'Excellent attention to detail.',
    'Please verify the wiring diagram.',
    'Explain the key choices in your code.',
    'The image is unclear. Please upload another.',
    'The concept is strong; refine the implementation.'
];

export const ReviewView = () => {
    const { studentProjects, students, navigateTo, viewParams } = useAppContext();
    const { userProfile } = useAuth();
    const { confirm, alert } = useConfirm();
    const [filter, setFilter] = useState<'queue' | 'all'>('queue');
    const [search, setSearch] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState('');
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    useEffect(() => {
        const projectId = viewParams?.projectId;
        if (projectId && studentProjects.some(project => project.id === projectId)) setSelectedProjectId(projectId);
    }, [viewParams, studentProjects]);

    const pendingProjectCount = useMemo(() => studentProjects.filter(project => project.steps?.some(step => step.status === 'PENDING_REVIEW')).length, [studentProjects]);
    const pendingStepCount = useMemo(() => studentProjects.reduce((total, project) => total + (project.steps?.filter(step => step.status === 'PENDING_REVIEW').length || 0), 0), [studentProjects]);
    const reviewedProjectCount = useMemo(() => studentProjects.filter(project => project.steps?.some(step => step.status === 'DONE' || step.status === 'REJECTED')).length, [studentProjects]);

    const reviewQueue = useMemo(() => {
        const term = search.trim().toLowerCase();
        return studentProjects
            .filter(project => filter === 'all' || project.steps?.some(step => step.status === 'PENDING_REVIEW'))
            .filter(project => {
                const student = students.find(item => item.id === project.studentId);
                return !term || project.title.toLowerCase().includes(term) || student?.name.toLowerCase().includes(term);
            })
            .sort((a, b) => {
                const dateA = a.updatedAt ? (typeof (a.updatedAt as any).toDate === 'function' ? (a.updatedAt as any).toDate() : new Date(a.updatedAt as any)) : new Date(0);
                const dateB = b.updatedAt ? (typeof (b.updatedAt as any).toDate === 'function' ? (b.updatedAt as any).toDate() : new Date(b.updatedAt as any)) : new Date(0);
                return dateB.getTime() - dateA.getTime();
            });
    }, [studentProjects, students, filter, search]);

    const activeProject = useMemo(() => studentProjects.find(project => project.id === selectedProjectId), [studentProjects, selectedProjectId]);
    const activeStudent = useMemo(() => students.find(student => student.id === activeProject?.studentId), [students, activeProject]);
    const pendingSteps = useMemo(() => activeProject?.steps?.filter(step => step.status === 'PENDING_REVIEW') || [], [activeProject]);

    const handleApproveStep = async (stepId: string) => {
        if (!db || !activeProject) return;
        try {
            const updatedSteps = activeProject.steps.map(step => step.id === stepId ? { ...step, status: 'DONE', reviewedBy: userProfile?.uid, reviewedAt: new Date().toISOString() } : step);
            await updateDoc(doc(db, 'student_projects', activeProject.id), { steps: updatedSteps });
            setFeedback('');
        } catch (error) {
            console.error(error);
            alert('Review not saved', 'The approval could not be saved. Try again.', 'danger');
        }
    };

    const handleRejectStep = async (stepId: string) => {
        if (!db || !activeProject) return;
        if (!feedback.trim()) {
            alert('Feedback required', 'Add a clear next step before requesting revisions.', 'warning');
            return;
        }
        try {
            const updatedSteps = activeProject.steps.map(step => step.id === stepId ? { ...step, status: 'REJECTED', reviewNotes: feedback, reviewedBy: userProfile?.uid, reviewedAt: new Date().toISOString() } : step);
            await updateDoc(doc(db, 'student_projects', activeProject.id), { steps: updatedSteps });
            setFeedback('');
        } catch (error) {
            console.error(error);
            alert('Review not saved', 'The revision request could not be saved. Try again.', 'danger');
        }
    };

    const handleDeleteProject = async () => {
        if (!db || !activeProject) return;
        const approved = await confirm({ title: 'Delete project?', message: 'This removes the project and its review history permanently.', variant: 'danger', confirmText: 'Delete project' });
        if (!approved) return;
        try {
            await deleteDoc(doc(db, 'student_projects', activeProject.id));
            alert('Project deleted', 'The project has been removed.', 'success');
            setSelectedProjectId(null);
        } catch (error) {
            console.error(error);
            alert('Project not deleted', 'The project could not be removed. Try again.', 'danger');
        }
    };

    return (
        <div className="flex h-full flex-col gap-5 pb-24 md:pb-8">
            <AtlasCommandHeader
                eyebrow="Coaching workspace"
                title="Review center"
                description="Move each learner forward with evidence-based approval and specific revision guidance."
                icon={Microscope}
                badges={<span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold text-amber-200">{pendingStepCount} steps waiting</span>}
                actions={<AtlasActionButton icon={ArrowLeft} variant="quiet" onClick={() => navigateTo('dashboard')}>Dashboard</AtlasActionButton>}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <AtlasSignalCard label="Review queue" value={pendingProjectCount} detail="Projects needing attention" icon={Clock} tone={pendingProjectCount > 0 ? 'amber' : 'emerald'} onClick={() => setFilter('queue')} />
                <AtlasSignalCard label="Pending steps" value={pendingStepCount} detail="Evidence awaiting a decision" icon={Eye} tone="teal" onClick={() => setFilter('queue')} />
                <AtlasSignalCard label="Reviewed projects" value={reviewedProjectCount} detail="With coaching decisions" icon={CheckCircle2} tone="emerald" onClick={() => setFilter('all')} />
            </div>

            <AtlasToolbar
                leading={<div className="relative w-full sm:max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search learner or project" className="min-h-10 w-full rounded-lg border border-white/10 bg-slate-950/70 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-teal-400/50 focus:ring-2 focus:ring-teal-400/20" /></div>}
                trailing={<div className="flex rounded-lg border border-white/10 bg-white/[0.03] p-1"><button type="button" onClick={() => setFilter('queue')} className={`min-h-8 rounded-md px-3 text-xs font-bold transition-colors ${filter === 'queue' ? 'bg-teal-400/15 text-teal-200' : 'text-slate-500 hover:text-white'}`}><Clock size={14} className="mr-1.5 inline" />Queue</button><button type="button" onClick={() => setFilter('all')} className={`min-h-8 rounded-md px-3 text-xs font-bold transition-colors ${filter === 'all' ? 'bg-teal-400/15 text-teal-200' : 'text-slate-500 hover:text-white'}`}><Filter size={14} className="mr-1.5 inline" />All projects</button></div>}
            ><span className="text-xs text-slate-500">{reviewQueue.length} visible</span></AtlasToolbar>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-12">
                <section className="flex min-h-[320px] flex-col rounded-lg border border-white/10 bg-slate-950/45 p-3 lg:col-span-4 lg:min-h-0">
                    <AtlasSectionHeader title="Projects" description="Oldest context stays visible while you review." icon={Users} meta={<span className="text-xs text-slate-500">{reviewQueue.length}</span>} />
                    <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                        {reviewQueue.length === 0 ? (
                            <AtlasEmptyState title={filter === 'queue' ? 'Queue cleared' : 'No projects found'} description={filter === 'queue' ? 'New evidence will appear here when learners submit it.' : 'Try another learner or project name.'} icon={Award} action={filter === 'all' ? <AtlasActionButton onClick={() => setSearch('')}>Clear search</AtlasActionButton> : undefined} />
                        ) : reviewQueue.map(project => {
                            const student = students.find(item => item.id === project.studentId);
                            const pendingCount = project.steps?.filter(step => step.status === 'PENDING_REVIEW').length || 0;
                            const selected = selectedProjectId === project.id;
                            return (
                                <button type="button" key={project.id} onClick={() => { setSelectedProjectId(project.id); setFeedback(''); }} className={`w-full rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 ${selected ? 'border-teal-300/35 bg-teal-400/10' : 'border-white/[0.07] bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.04]'}`}>
                                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-black text-white">{project.title}</div><div className="mt-1 flex items-center gap-2 text-xs text-slate-500"><span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/[0.05] font-black text-slate-300">{student?.name.charAt(0) || '?'}</span><span className="truncate">{student?.name || 'Unknown learner'}</span></div></div>{pendingCount > 0 && <span className="shrink-0 rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-1 text-[10px] font-black text-amber-200">{pendingCount} waiting</span>}</div>
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section className="min-h-[460px] overflow-hidden rounded-lg border border-white/10 bg-slate-950/45 p-4 lg:col-span-8 lg:min-h-0">
                    {!activeProject ? (
                        <AtlasEmptyState title="Choose a project" description="Select a learner submission to inspect evidence and leave coaching feedback." icon={Microscope} />
                    ) : (
                        <div className="flex h-full flex-col overflow-y-auto custom-scrollbar">
                            <AtlasSectionHeader
                                title={activeProject.title}
                                description={`Learner: ${activeStudent?.name || 'Unknown learner'}`}
                                icon={Eye}
                                meta={<span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${activeProject.status === 'published' ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-200' : 'border-white/10 bg-white/[0.04] text-slate-400'}`}>{activeProject.status}</span>}
                                actions={<button type="button" onClick={handleDeleteProject} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50" title="Delete project" aria-label="Delete project"><Trash2 size={17} /></button>}
                            />

                            {pendingSteps.length === 0 ? (
                                <div className="mt-4"><AtlasEmptyState title="This project is clear" description="There are no pending steps. Return to the queue for the next learner." icon={CheckCircle2} action={<AtlasActionButton onClick={() => { setFilter('queue'); setSelectedProjectId(null); }}>Return to queue</AtlasActionButton>} /></div>
                            ) : (
                                <div className="mt-4 space-y-4 pb-2">
                                    {pendingSteps.map(step => {
                                        const evidenceUrl = step.evidence ? (step.evidence.startsWith('http') ? step.evidence : `data:image/png;base64,${step.evidence}`) : null;
                                        return (
                                            <article key={step.id} className="rounded-lg border border-amber-300/15 bg-amber-300/[0.04] p-4">
                                                <div className="flex flex-col gap-2 border-b border-white/[0.07] pb-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-[10px] font-black uppercase text-amber-200">Awaiting review</div><h4 className="mt-1 text-base font-black text-white">{step.title}</h4></div><span className="text-xs text-slate-500">Submitted {step.reviewedAt ? new Date(step.reviewedAt as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recently'}</span></div>
                                                <div className="grid grid-cols-1 gap-4 py-4 md:grid-cols-2">
                                                    <div><div className="mb-2 text-[10px] font-bold uppercase text-slate-500">Evidence</div>{evidenceUrl ? <button type="button" onClick={() => setPreviewImage(evidenceUrl)} className="group relative block w-full overflow-hidden rounded-lg border border-white/10 bg-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60"><img src={evidenceUrl} className="h-52 w-full object-contain" alt={`Evidence for ${step.title}`} /><span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-slate-950/90 px-2 py-1 text-xs font-bold text-white"><ExternalLink size={13} />Open</span></button> : <AtlasEmptyState title="No visual evidence" description="Use the learner reflection and request evidence if needed." icon={AlertCircle} />}</div>
                                                    <div><div className="mb-2 text-[10px] font-bold uppercase text-slate-500">Learner reflection</div><div className="min-h-[208px] rounded-lg border border-sky-300/10 bg-sky-400/[0.04] p-4 text-sm leading-6 text-slate-300"><MessageSquare size={16} className="mb-3 text-sky-300" />{step.note || 'No reflection was provided.'}</div></div>
                                                </div>
                                                <div className="rounded-lg border border-white/[0.07] bg-slate-950/60 p-3">
                                                    <div className="mb-3 flex gap-2 overflow-x-auto pb-1 custom-scrollbar">{QUICK_FEEDBACKS.map(message => <button type="button" key={message} onClick={() => setFeedback(current => current ? `${current} ${message}` : message)} className="min-h-8 shrink-0 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-slate-400 transition-colors hover:border-teal-300/30 hover:text-teal-200">{message}</button>)}</div>
                                                    <label className="block"><span className="mb-2 block text-[10px] font-bold uppercase text-slate-500">Coaching note</span><textarea value={feedback} onChange={event => setFeedback(event.target.value)} placeholder="Name what works and the learner's next concrete step" className="min-h-[96px] w-full resize-y rounded-lg border border-white/10 bg-slate-950/80 p-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-teal-400/50 focus:ring-2 focus:ring-teal-400/20" /></label>
                                                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end"><AtlasActionButton icon={XCircle} variant="danger" onClick={() => handleRejectStep(step.id)}>Request revisions</AtlasActionButton><AtlasActionButton icon={CheckCircle2} variant="primary" onClick={() => handleApproveStep(step.id)}>Approve step</AtlasActionButton></div>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </div>

            {previewImage && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 p-4" onClick={() => setPreviewImage(null)} role="dialog" aria-modal="true" aria-label="Evidence preview"><button type="button" onClick={() => setPreviewImage(null)} className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close preview"><XCircle size={28} /></button><img src={previewImage} className="max-h-full max-w-full rounded-lg object-contain" onClick={event => event.stopPropagation()} alt="Submitted evidence preview" /></div>}
        </div>
    );
};
