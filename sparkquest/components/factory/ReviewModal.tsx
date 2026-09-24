
import React, { useState } from 'react';
import { useFactoryData } from '../../hooks/useFactoryData';
import { StudentProject } from '../../types';
import { X, ExternalLink, CheckCircle, XCircle, Clock, Check, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { db } from '../../services/firebase';
import { doc, updateDoc, serverTimestamp, Firestore } from 'firebase/firestore';

interface ReviewModalProps {
    projectId: string;
    onClose: () => void;
}

const ensureProtocol = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
};

export const ReviewModal: React.FC<ReviewModalProps> = ({ projectId, onClose }) => {
    const { studentProjects, students } = useFactoryData();
    const project = studentProjects.find(p => p.id === projectId);
    const student = students.find(s => s.id === project?.studentId);

    const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
    const [feedback, setFeedback] = useState('');
    const [awardXp, setAwardXp] = useState(50); // Default completion XP
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reviewError, setReviewError] = useState<string | null>(null);
    const [rejectingStepId, setRejectingStepId] = useState<string | null>(null);
    const [stepRejectionNote, setStepRejectionNote] = useState('');

    // GUARD: If no project found (yet), return null
    if (!project) return null;

    const handleAction = async (status: 'published' | 'changes_requested') => {
        if (!db) return;
        const firestore = db as Firestore;

        setIsSubmitting(true);
        setReviewError(null);
        try {
            // Logic to find the first image evidence for cover
            let coverImage = null;
            if (status === 'published') {
                // Try to find first image evidence
                const imageStep = project.steps.find(s =>
                    s.evidence && (
                        s.evidence.startsWith('data:image') ||
                        /\.(jpeg|jpg|gif|png|webp)$/i.test(s.evidence)
                    )
                );
                if (imageStep) {
                    coverImage = imageStep.evidence;
                }
            }

            const updatePayload: any = {
                status,
                feedback: feedback || null,
                updatedAt: serverTimestamp(),
            };

            // FIX: Save Awarded XP
            if (status === 'published') {
                updatePayload.xpReward = awardXp;
            }

            // Only update cover if we found one and we are publishing
            if (status === 'published' && coverImage) {
                updatePayload.coverImage = coverImage;
                updatePayload.thumbnailUrl = coverImage; // Set both for compatibility
            }

            await updateDoc(doc(firestore, 'student_projects', projectId), updatePayload);
            onClose();
        } catch (e) {
            console.error("Error updating project:", e);
            setReviewError(e instanceof Error ? e.message : 'The review could not be submitted.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const approveStep = async (stepId: string) => {
        if (!db) return;
        setReviewError(null);
        try {
            const updatedSteps = project.steps.map(step => step.id === stepId ? { ...step, status: 'done' } : step);
            await updateDoc(doc(db as Firestore, 'student_projects', projectId), { steps: updatedSteps, updatedAt: serverTimestamp() });
        } catch (error) {
            setReviewError(error instanceof Error ? error.message : 'The step could not be approved.');
        }
    };

    const rejectStep = async () => {
        if (!db || !rejectingStepId) return;
        if (!stepRejectionNote.trim()) {
            setReviewError('Add a short reason so the student knows what to change.');
            return;
        }
        setReviewError(null);
        try {
            const updatedSteps = project.steps.map(step => step.id === rejectingStepId ? { ...step, status: 'REJECTED', reviewNotes: stepRejectionNote.trim() } : step);
            await updateDoc(doc(db as Firestore, 'student_projects', projectId), { steps: updatedSteps, updatedAt: serverTimestamp() });
            setRejectingStepId(null);
            setStepRejectionNote('');
        } catch (error) {
            setReviewError(error instanceof Error ? error.message : 'The step could not be returned.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true" aria-labelledby="review-dialog-title">
            <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

                <div className="flex shrink-0 flex-col gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 bg-white text-indigo-600 rounded-lg text-xs font-black uppercase tracking-wider shadow-sm border border-indigo-100">
                                Reviewing Submission
                            </span>
                            <span className="text-indigo-300 text-sm font-bold">#{project.id.slice(0, 8)}</span>
                        </div>
                        <h2 id="review-dialog-title" className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{project.title}</h2>
                        <p className="text-slate-500 font-medium flex items-center gap-2">
                            Maker: <span className="text-indigo-600 font-bold bg-indigo-50 px-2 rounded-md">{student?.name || project.studentName || 'Student'}</span>
                        </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 lg:justify-end">
                        <div className="bg-white p-1.5 rounded-xl border border-indigo-100 flex text-sm font-bold shadow-sm">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`px-5 py-2 rounded-lg transition-all ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
                            >
                                Overview
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`px-5 py-2 rounded-lg transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
                            >
                                History
                            </button>
                        </div>
                        <button onClick={onClose} className="grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close project review">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

                    {/* Left: Content Area (Switchable) */}
                    <div className="flex-1 overflow-y-auto border-r border-slate-100 bg-slate-50/50 p-5 sm:p-8">

                        {activeTab === 'overview' && (
                            <>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-6">Submission Evidence</h3>

                                <div className="space-y-6">
                                    {/* Description */}
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                        <h4 className="font-bold text-slate-800 mb-2">Project Description</h4>
                                        <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-wrap">
                                            {project.description || "No description provided by the student."}
                                        </p>
                                    </div>

                                    {/* Attachments */}
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                        <h4 className="font-bold text-slate-800 mb-4">Attachments & Resources</h4>
                                        <div className="space-y-3">
                                            {project.presentationUrl && (
                                                <a
                                                    href={project.presentationUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all group"
                                                >
                                                    <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                                        <ExternalLink size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-700 group-hover:text-indigo-700">Presentation / Link</p>
                                                        <p className="text-xs text-slate-400 truncate max-w-xs">{project.presentationUrl}</p>
                                                    </div>
                                                    <ExternalLink size={16} className="ml-auto text-slate-300 group-hover:text-indigo-400" />
                                                </a>
                                            )}

                                            {/* Step Evidence */}
                                            {project.steps.filter(s => s.status === 'PENDING_REVIEW' || s.evidence || s.note).map(step => (
                                                <div key={step.id} className={`p-4 rounded-xl border ${step.status === 'PENDING_REVIEW' ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">Step: {step.title}</span>
                                                        {step.status === 'PENDING_REVIEW' && (
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={async () => {
                                                                        if (!db) return;
                                                                        await approveStep(step.id);
                                                                    }}
                                                                    className="flex min-h-11 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
                                                                >
                                                                    <CheckCircle size={12} /> Approve
                                                                </button>
                                                                <button
                                                                    onClick={() => { setRejectingStepId(step.id); setStepRejectionNote(''); setReviewError(null); }}
                                                                    className="flex min-h-11 items-center gap-1 rounded-lg bg-rose-50 px-3 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100"
                                                                >
                                                                    <XCircle size={12} /> Reject
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {step.evidence ? (
                                                        step.evidence.match(/\.(jpeg|jpg|gif|png)$/i) || step.evidence.startsWith('data:image/') ? (
                                                            <a href={step.evidence} target="_blank" rel="noreferrer" className="relative mt-2 block overflow-hidden rounded-lg border border-slate-200">
                                                                <img
                                                                    src={step.evidence}
                                                                    alt={`Evidence for ${step.title}`}
                                                                    loading="lazy"
                                                                    className="h-32 w-full object-cover"
                                                                />
                                                                <div className="absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-lg bg-slate-950/75 text-white" aria-hidden="true">
                                                                    <ExternalLink className="h-4 w-4" />
                                                                </div>
                                                            </a>
                                                        ) : (
                                                            <a href={ensureProtocol(step.evidence)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:underline mt-2">
                                                                <ExternalLink size={14} />
                                                                View Evidence Link
                                                            </a>
                                                        )
                                                    ) : null}
                                                    {step.note && (
                                                        <p className="text-xs text-slate-500 mt-2 italic border-l-2 border-indigo-200 pl-3">"{step.note}"</p>
                                                    )}
                                                </div>
                                            ))}

                                            {!project.presentationUrl && !project.steps.some(s => s.evidence) && (
                                                <p className="text-slate-400 italic text-sm">No external links or evidence attached.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'history' && (
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-6">Commit Timeline</h3>
                                <div className="relative pl-4 border-l-2 border-slate-200 space-y-8">
                                    {project.commits && project.commits.length > 0 ? (
                                        project.commits.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(commit => (
                                            <div key={commit.id} className="relative">
                                                <div className="absolute -left-[21px] top-0 w-4 h-4 rounded-full bg-white border-2 border-indigo-500 shadow-sm" />
                                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                                    <p className="text-sm font-bold text-slate-800">{commit.message}</p>
                                                    {commit.stepId && (
                                                        <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider rounded">
                                                            Step {commit.stepId}
                                                        </span>
                                                    )}

                                                    {/* Proof / Link Display */}
                                                    {commit.link && (
                                                        <div className="mt-3">
                                                            {commit.link.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                                                                <a href={commit.link} target="_blank" rel="noreferrer" className="block relative group overflow-hidden rounded-lg border border-slate-200">
                                                                    <img src={commit.link} alt="Proof" loading="lazy" className="h-32 w-full object-cover" />
                                                                    <div className="absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-lg bg-slate-950/75 text-white">
                                                                        <ExternalLink size={16} />
                                                                    </div>
                                                                </a>
                                                            ) : (
                                                                <a href={commit.link} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100 transition-colors">
                                                                    <ExternalLink size={14} /> View Attached Proof
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}

                                                    <p className="text-xs text-slate-400 mt-2 font-medium flex items-center gap-1">
                                                        <Clock size={12} /> {new Date(commit.timestamp).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-10">
                                            <p className="text-slate-400 text-sm font-bold">No history recorded.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Grading Panel */}
                    <div className="w-full md:w-96 bg-white shrink-0 flex flex-col p-8">
                        <div className="flex-1 space-y-8">
                            <div>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Instructor Feedback</h3>
                                <textarea
                                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-medium text-slate-600 outline-none focus:border-indigo-500 focus:bg-white transition-all h-32 resize-none"
                                    placeholder="Write encouragement or required changes..."
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                />
                            </div>

                            <div>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Awards & XP</h3>
                                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-indigo-900">Completion XP</span>
                                        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-indigo-100">
                                            <Sparkles size={14} className="text-amber-500" />
                                            <span className="font-black text-indigo-900">{awardXp} XP</span>
                                        </div>
                                    </div>
                                    <input
                                        type="range"
                                        min="10"
                                        max="500"
                                        step="10"
                                        value={awardXp}
                                        onChange={(e) => setAwardXp(Number(e.target.value))}
                                        className="w-full h-2 bg-indigo-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-8 mt-8 border-t border-slate-100 space-y-3">
                            {reviewError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{reviewError}</div>}
                            <button
                                onClick={() => handleAction('published')}
                                disabled={isSubmitting}
                                className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-blue-600 py-3 font-bold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                            >
                                {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} className="stroke-[3]" />} Approve & Publish
                            </button>
                            <button
                                onClick={() => handleAction('changes_requested')}
                                disabled={isSubmitting}
                                className="w-full py-4 bg-white border-2 border-amber-200 text-amber-600 hover:bg-amber-50 rounded-xl font-bold flex items-center justify-center gap-3 transition-all"
                            >
                                <AlertCircle size={20} className="stroke-[3]" /> Request Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {rejectingStepId && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="reject-step-title">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                        <h3 id="reject-step-title" className="text-xl font-black text-slate-950">Return this step?</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">Tell the student exactly what needs to change before resubmitting.</p>
                        <label className="mt-4 block text-sm font-bold text-slate-700">Reason<textarea autoFocus value={stepRejectionNote} onChange={event => setStepRejectionNote(event.target.value)} className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" placeholder="Add one clear next action…" /></label>
                        {reviewError && <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{reviewError}</p>}
                        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button onClick={() => { setRejectingStepId(null); setStepRejectionNote(''); setReviewError(null); }} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-extrabold text-slate-700 hover:bg-slate-50">Cancel</button><button onClick={rejectStep} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-extrabold text-slate-950 hover:bg-amber-400"><XCircle size={17} /> Return step</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};
