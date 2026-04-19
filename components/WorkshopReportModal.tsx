import React, { useState } from 'react';
import { Modal } from './Modal';
import { Send, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { evaluateWorkshopSession } from '../services/workshopEvaluator';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    workshopTitle: string;
    onSuccess?: () => void;
}

export const WorkshopReportModal = ({ isOpen, onClose, workshopTitle, onSuccess }: Props) => {
    const { user, userProfile, currentOrganization } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({
        hardestPart: '',
        instructorWords: '',
        projectFailures: '',
        safetyMaterialIssues: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !currentOrganization || isSubmitting) return;

        setIsSubmitting(true);
        setError(null);

        try {
            // 1. Get AI Evaluation
            const evaluation = await evaluateWorkshopSession(form);

            // 2. Save to Firestore
            await addDoc(collection(db, 'workshop_evaluations'), {
                organizationId: currentOrganization.id,
                workshopTitle,
                instructorId: user?.uid,
                instructorName: userProfile?.name || 'Instructor',
                date: new Date().toISOString().split('T')[0],
                responses: form,
                ...evaluation,
                createdAt: serverTimestamp()
            });

            // 3. Success
            setIsSubmitting(false);
            if (onSuccess) onSuccess();
            onClose();
            alert(`Workshop Evaluated! Total Score: ${evaluation.totalScore}/100\n\n${evaluation.actionableFeedback}`);

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to analyze report. Please try again.');
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Workshop Performance Report">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex gap-3">
                    <Sparkles className="text-indigo-600 shrink-0" size={20} />
                    <p className="text-xs text-indigo-800 leading-relaxed font-medium">
                        Your report will be analyzed by the <strong>Make & Go Quality Assessor</strong> based on the "Hands-Off" philosophy. Be honest—failure and struggle are good signs!
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex gap-3 text-red-700 text-xs items-center">
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            1. What was the hardest part for the kids today, and how did they figure it out?
                        </label>
                        <textarea
                            required
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                            placeholder="Describe the struggle and the moment of discovery..."
                            value={form.hardestPart}
                            onChange={e => setForm({ ...form, hardestPart: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            2. When a kid got completely stuck, what were your exact words to them?
                        </label>
                        <textarea
                            required
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none"
                            placeholder="e.g., 'What do you think is causing that friction?'"
                            value={form.instructorWords}
                            onChange={e => setForm({ ...form, instructorWords: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            3. Did any projects fail during the showcase? What happened next?
                        </label>
                        <textarea
                            required
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                            placeholder="How did the group handle it? How was the process praised?"
                            value={form.projectFailures}
                            onChange={e => setForm({ ...form, projectFailures: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            4. Were there any logistical or safety issues with tools today?
                        </label>
                        <textarea
                            required
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none"
                            placeholder="Materials handled autonomously? Safety gear used?"
                            value={form.safetyMaterialIssues}
                            onChange={e => setForm({ ...form, safetyMaterialIssues: e.target.value })}
                        />
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-2 flex items-center justify-center gap-2 py-3 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 disabled:scale-95"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                <span>Evaluating...</span>
                            </>
                        ) : (
                            <>
                                <Send size={18} />
                                <span>Submit for AI Analysis</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
