import React, { useState } from 'react';
import { Modal } from './Modal';
import { Send, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { evaluateWorkshopSession } from '../services/workshopEvaluator';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    workshopTitle: string;
    sessionId?: string;
    workshopDate?: string;
    onSuccess?: () => void;
}

const initialForm = {
    predictiveWarned: false,
    techReady: '' as '' | 'yes' | 'no',
    materialStock: 3,
    safetyZoned: '' as '' | 'yes' | 'no',
    instructionTime: '10-20 mins' as '< 10 mins' | '10-20 mins' | '> 20 mins',
    autonomyLevel: 'asked_questions' as 'fixed_it' | 'pointed_error' | 'asked_questions',
    struggleMetric: 3,
    deliveryFocus: 'Iteration & Effort' as 'Final Polish' | 'Iteration & Effort',
    labRespect: '' as '' | 'yes' | 'no',
    hardestPart: '',
    instructorWords: '',
    projectFailures: '',
    safetyMaterialIssues: ''
};

export const WorkshopReportModal = ({ isOpen, onClose, workshopTitle, sessionId, workshopDate, onSuccess }: Props) => {
    const { user, userProfile, currentOrganization } = useAuth();
    const { alert: showAlert } = useConfirm();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState(initialForm);
    const evaluatorAvailable = Boolean(import.meta.env.VITE_GOOGLE_API_KEY);

    const closeModal = () => {
        if (isSubmitting) return;
        setError(null);
        setForm(initialForm);
        onClose();
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (isSubmitting) return;
        if (!db || !currentOrganization) {
            await showAlert('Organization required', 'Select an organization before saving a workshop report.', 'warning');
            return;
        }
        if (!evaluatorAvailable) {
            await showAlert('Quality evaluator unavailable', 'The AI evaluator is not configured for this environment.', 'warning');
            return;
        }
        if (!workshopTitle.trim() || !form.techReady || !form.safetyZoned || !form.labRespect) {
            setError('Complete the workshop, tech, safety, and cleanup fields before submitting.');
            return;
        }

        const narrativeFields = [form.hardestPart, form.instructorWords, form.projectFailures, form.safetyMaterialIssues];
        if (narrativeFields.some(value => value.trim().length < 10)) {
            setError('Each observation needs at least 10 characters so the quality result has enough evidence.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const voiceTranscript = [
                `Hardest learner challenge: ${form.hardestPart.trim()}`,
                `Instructor response: ${form.instructorWords.trim()}`,
                `Project failures and recovery: ${form.projectFailures.trim()}`,
                `Safety or material issues: ${form.safetyMaterialIssues.trim()}`
            ].join('\n');
            const inputs = {
                predictiveFlags: { inventoryWarned: form.predictiveWarned },
                preFlight: {
                    techReady: form.techReady === 'yes',
                    materialStock: form.materialStock,
                    safetyZoned: form.safetyZoned === 'yes'
                },
                execution: {
                    instructionTime: form.instructionTime,
                    autonomyLevel: form.autonomyLevel,
                    struggleMetric: form.struggleMetric,
                    deliveryFocus: form.deliveryFocus,
                    labRespect: form.labRespect === 'yes'
                },
                voiceTranscript
            };
            const evaluation = await evaluateWorkshopSession(inputs);
            const score = Number(evaluation?.Health_Score);
            if (!Number.isFinite(score) || score < 0 || score > 100) {
                throw new Error('The evaluator returned an invalid quality score.');
            }

            const now = new Date();
            const reportDate = workshopDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const fallbackSessionId = `workshop-${reportDate}-${workshopTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

            await addDoc(collection(db, 'workshop_evaluations'), {
                organizationId: currentOrganization.id,
                sessionId: sessionId || fallbackSessionId,
                workshopTitle: workshopTitle.trim(),
                instructorId: user?.uid || '',
                instructorName: userProfile?.name || 'Instructor',
                date: reportDate,
                predictiveFlags: inputs.predictiveFlags,
                preFlight: inputs.preFlight,
                execution: inputs.execution,
                voiceTranscript,
                totalScore: Math.round(score),
                breakdown: {
                    setup: evaluation.Phase_Breakdown?.setup || '',
                    instruction: evaluation.Phase_Breakdown?.instruction || '',
                    execution: evaluation.Phase_Breakdown?.execution || ''
                },
                rootCause: evaluation.Root_Cause || '',
                actionableMandate: evaluation.Actionable_Mandate || '',
                responses: {
                    hardestPart: form.hardestPart.trim(),
                    instructorWords: form.instructorWords.trim(),
                    projectFailures: form.projectFailures.trim(),
                    safetyMaterialIssues: form.safetyMaterialIssues.trim()
                },
                createdAt: serverTimestamp()
            });

            onSuccess?.();
            setForm(initialForm);
            onClose();
            await showAlert('Workshop evaluated', `Quality score: ${Math.round(score)}/100\n\n${evaluation.Actionable_Mandate || 'Review the quality workspace for the full result.'}`, 'success');
        } catch (submissionError) {
            console.error('Workshop report evaluation failed', submissionError);
            setError(submissionError instanceof Error ? submissionError.message : 'The report could not be analyzed. Try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectClass = 'min-h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20';
    const textAreaClass = 'h-20 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20';

    return (
        <Modal isOpen={isOpen} onClose={closeModal} title="Workshop performance report">
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="flex gap-3 rounded-lg border border-teal-200 bg-teal-50 p-4">
                    <Sparkles className="shrink-0 text-teal-700" size={20} />
                    <p className="text-xs font-medium leading-relaxed text-teal-950">
                        Record the operating facts first, then add specific evidence from <strong>{workshopTitle || 'this workshop'}</strong>.
                    </p>
                </div>

                {!evaluatorAvailable && (
                    <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-800">
                        <AlertCircle size={16} /> Quality analysis is unavailable until the AI evaluator is configured.
                    </div>
                )}
                {error && (
                    <div role="alert" className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
                    <label className="text-xs font-bold text-slate-600">Tech readiness
                        <select required className={`${selectClass} mt-1.5`} value={form.techReady} onChange={event => setForm({ ...form, techReady: event.target.value as typeof form.techReady })}>
                            <option value="">Choose status</option><option value="yes">Ready</option><option value="no">Missing or uncharged</option>
                        </select>
                    </label>
                    <label className="text-xs font-bold text-slate-600">Safety zoning
                        <select required className={`${selectClass} mt-1.5`} value={form.safetyZoned} onChange={event => setForm({ ...form, safetyZoned: event.target.value as typeof form.safetyZoned })}>
                            <option value="">Choose status</option><option value="yes">Ready</option><option value="no">Not ready</option>
                        </select>
                    </label>
                    <label className="text-xs font-bold text-slate-600">Instruction time
                        <select className={`${selectClass} mt-1.5`} value={form.instructionTime} onChange={event => setForm({ ...form, instructionTime: event.target.value as typeof form.instructionTime })}>
                            <option value="< 10 mins">Under 10 minutes</option><option value="10-20 mins">10-20 minutes</option><option value="> 20 mins">Over 20 minutes</option>
                        </select>
                    </label>
                    <label className="text-xs font-bold text-slate-600">Learner autonomy
                        <select className={`${selectClass} mt-1.5`} value={form.autonomyLevel} onChange={event => setForm({ ...form, autonomyLevel: event.target.value as typeof form.autonomyLevel })}>
                            <option value="asked_questions">Asked guiding questions</option><option value="pointed_error">Pointed out the error</option><option value="fixed_it">Fixed it for them</option>
                        </select>
                    </label>
                    <label className="text-xs font-bold text-slate-600">Learner cleanup
                        <select required className={`${selectClass} mt-1.5`} value={form.labRespect} onChange={event => setForm({ ...form, labRespect: event.target.value as typeof form.labRespect })}>
                            <option value="">Choose status</option><option value="yes">Completed by learners</option><option value="no">Not completed</option>
                        </select>
                    </label>
                    <label className="text-xs font-bold text-slate-600">Praise focus
                        <select className={`${selectClass} mt-1.5`} value={form.deliveryFocus} onChange={event => setForm({ ...form, deliveryFocus: event.target.value as typeof form.deliveryFocus })}>
                            <option value="Iteration & Effort">Iteration and effort</option><option value="Final Polish">Final polish</option>
                        </select>
                    </label>
                    <label className="text-xs font-bold text-slate-600 sm:col-span-2">Material stock: {form.materialStock}/5
                        <input type="range" min="1" max="5" value={form.materialStock} onChange={event => setForm({ ...form, materialStock: Number(event.target.value) })} className="mt-2 w-full accent-teal-600" />
                    </label>
                    <label className="text-xs font-bold text-slate-600 sm:col-span-2">Challenge level: {form.struggleMetric}/5
                        <input type="range" min="1" max="5" value={form.struggleMetric} onChange={event => setForm({ ...form, struggleMetric: Number(event.target.value) })} className="mt-2 w-full accent-teal-600" />
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 sm:col-span-2">
                        <input type="checkbox" checked={form.predictiveWarned} onChange={event => setForm({ ...form, predictiveWarned: event.target.checked })} className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500" /> Earlier low-stock warning was received
                    </label>
                </div>

                <div className="space-y-4">
                    <label className="block text-xs font-bold text-slate-600">Hardest learner challenge
                        <textarea required minLength={10} className={`${textAreaClass} mt-1.5`} placeholder="Describe the struggle and moment of discovery." value={form.hardestPart} onChange={event => setForm({ ...form, hardestPart: event.target.value })} />
                    </label>
                    <label className="block text-xs font-bold text-slate-600">Instructor response
                        <textarea required minLength={10} className={`${textAreaClass} mt-1.5`} placeholder="Record the exact guidance used when a learner was stuck." value={form.instructorWords} onChange={event => setForm({ ...form, instructorWords: event.target.value })} />
                    </label>
                    <label className="block text-xs font-bold text-slate-600">Failure and recovery
                        <textarea required minLength={10} className={`${textAreaClass} mt-1.5`} placeholder="Explain what failed and what happened next." value={form.projectFailures} onChange={event => setForm({ ...form, projectFailures: event.target.value })} />
                    </label>
                    <label className="block text-xs font-bold text-slate-600">Safety and material evidence
                        <textarea required minLength={10} className={`${textAreaClass} mt-1.5`} placeholder="Record tool, material, or safety issues and how they were handled." value={form.safetyMaterialIssues} onChange={event => setForm({ ...form, safetyMaterialIssues: event.target.value })} />
                    </label>
                </div>

                <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row">
                    <button type="button" onClick={closeModal} disabled={isSubmitting} className="min-h-10 flex-1 rounded-lg px-4 py-2 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-50">Cancel</button>
                    <button type="submit" disabled={isSubmitting || !evaluatorAvailable} className="flex min-h-10 flex-[2] items-center justify-center gap-2 rounded-lg bg-teal-600 px-6 py-2 text-sm font-bold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50">
                        {isSubmitting ? <><Loader2 size={18} className="animate-spin" /><span>Evaluating...</span></> : <><Send size={18} /><span>{evaluatorAvailable ? 'Submit quality report' : 'Evaluator unavailable'}</span></>}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
