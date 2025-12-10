import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle, ExternalLink, MessageSquare, Calendar, User } from 'lucide-react';
import { ProjectStep, StudentProject } from '../../types';
import { STUDIO_THEME, studioClass } from '../../utils/studioTheme';
import { Modal } from '../../components/Modal';
import { formatDate } from '../../utils/helpers';

interface StepReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    step: ProjectStep | null;
    project: StudentProject | null;
    studentName: string;
    onApprove: (stepId: string, notes: string) => Promise<void>;
    onReject: (stepId: string, notes: string) => Promise<void>;
}

export const StepReviewModal: React.FC<StepReviewModalProps> = ({
    isOpen,
    onClose,
    step,
    project,
    studentName,
    onApprove,
    onReject
}) => {
    const [reviewNotes, setReviewNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!step || !project) return null;

    const handleApprove = async () => {
        setIsSubmitting(true);
        try {
            await onApprove(step.id, reviewNotes);
            setReviewNotes('');
            onClose();
        } catch (error) {
            console.error('Error approving step:', error);
            alert('Failed to approve step');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!reviewNotes.trim()) {
            alert('Please provide feedback for rejection');
            return;
        }
        setIsSubmitting(true);
        try {
            await onReject(step.id, reviewNotes);
            setReviewNotes('');
            onClose();
        } catch (error) {
            console.error('Error rejecting step:', error);
            alert('Failed to reject step');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusBadge = () => {
        if (step.approvalStatus === 'approved') {
            return (
                <span className={studioClass(STUDIO_THEME.status.approved, STUDIO_THEME.rounded.sm, 'px-3 py-1 text-sm border')}>
                    ✓ Approved
                </span>
            );
        } else if (step.approvalStatus === 'rejected') {
            return (
                <span className={studioClass(STUDIO_THEME.status.rejected, STUDIO_THEME.rounded.sm, 'px-3 py-1 text-sm border')}>
                    ✗ Rejected
                </span>
            );
        } else {
            return (
                <span className={studioClass(STUDIO_THEME.status.pending, STUDIO_THEME.rounded.sm, 'px-3 py-1 text-sm border')}>
                    ⏳ Pending Review
                </span>
            );
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="">
            < div className="max-w-3xl" >
                {/* Header */}
                < div className="mb-6" >
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h2 className={studioClass(STUDIO_THEME.text.primary, 'text-2xl font-bold mb-2')}>
                                Review Step
                            </h2>
                            <div className="flex items-center gap-2 text-sm">
                                <User size={16} className={STUDIO_THEME.text.secondary} />
                                <span className={STUDIO_THEME.text.secondary}>
                                    {studentName}
                                </span>
                                <span className={STUDIO_THEME.text.tertiary}>•</span>
                                <span className={STUDIO_THEME.text.secondary}>
                                    {project.title}
                                </span>
                            </div>
                        </div>
                        {getStatusBadge()}
                    </div>
                </div >

                {/* Step Details */}
                < div className={
                    studioClass(
                        STUDIO_THEME.background.card,
                        STUDIO_THEME.border.light,
                        STUDIO_THEME.rounded.lg,
                        'border p-6 mb-6'
                    )
                } >
                    <h3 className={studioClass(STUDIO_THEME.text.primary, 'text-lg font-semibold mb-4')}>
                        {step.title}
                    </h3>

                    {/* Proof of Work */}
                    {
                        step.proofUrl && (
                            <div className="mb-4">
                                <label className={studioClass(STUDIO_THEME.text.secondary, 'text-sm font-medium block mb-2')}>
                                    Proof of Work:
                                </label>
                                {step.proofUrl.startsWith('http') ? (
                                    <a
                                        href={step.proofUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={studioClass(
                                            STUDIO_THEME.text.accent,
                                            STUDIO_THEME.text.accentHover,
                                            STUDIO_THEME.transition.default,
                                            'flex items-center gap-2'
                                        )}
                                    >
                                        <ExternalLink size={16} />
                                        View Evidence Link
                                    </a>
                                ) : (
                                    <img
                                        src={step.proofUrl}
                                        alt="Proof of work"
                                        className={studioClass(STUDIO_THEME.rounded.md, 'max-w-full h-auto')}
                                    />
                                )}
                            </div>
                        )
                    }

                    {/* Previous Review */}
                    {
                        step.reviewNotes && (
                            <div className={studioClass(
                                STUDIO_THEME.glass.light,
                                STUDIO_THEME.border.light,
                                STUDIO_THEME.rounded.md,
                                'border p-4'
                            )}>
                                <div className="flex items-center gap-2 mb-2">
                                    <MessageSquare size={16} className={STUDIO_THEME.text.secondary} />
                                    <span className={studioClass(STUDIO_THEME.text.secondary, 'text-sm font-medium')}>
                                        Previous Feedback:
                                    </span>
                                </div>
                                <p className={studioClass(STUDIO_THEME.text.primary, 'text-sm')}>
                                    {step.reviewNotes}
                                </p>
                                {step.reviewedAt && (
                                    <p className={studioClass(STUDIO_THEME.text.tertiary, 'text-xs mt-2')}>
                                        {formatDate(new Date(step.reviewedAt.seconds * 1000))}
                                    </p>
                                )}
                            </div>
                        )
                    }
                </div >

                {/* Review Form */}
                < div className="mb-6" >
                    <label className={studioClass(STUDIO_THEME.text.primary, 'text-sm font-medium block mb-2')}>
                        Feedback / Notes {step.approvalStatus === 'pending' && '(Required for rejection)'}
                    </label>
                    <textarea
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder="Provide feedback to the student..."
                        rows={4}
                        className={studioClass(
                            STUDIO_THEME.border.light,
                            STUDIO_THEME.rounded.md,
                            'w-full px-4 py-3 border focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none'
                        )}
                    />
                </div >

                {/* Actions */}
                < div className="flex items-center justify-end gap-3" >
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className={studioClass(
                            STUDIO_THEME.border.light,
                            STUDIO_THEME.rounded.md,
                            STUDIO_THEME.transition.default,
                            'px-6 py-2 border hover:bg-slate-50 disabled:opacity-50'
                        )}
                    >
                        Cancel
                    </button>

                    {
                        step.approvalStatus !== 'rejected' && (
                            <button
                                onClick={handleReject}
                                disabled={isSubmitting}
                                className={studioClass(
                                    STUDIO_THEME.colors.danger,
                                    STUDIO_THEME.rounded.md,
                                    STUDIO_THEME.shadow.button,
                                    STUDIO_THEME.transition.default,
                                    'px-6 py-2 text-white hover:bg-rose-600 disabled:opacity-50 flex items-center gap-2'
                                )}
                            >
                                <X size={16} />
                                Request Changes
                            </button>
                        )
                    }

                    {
                        step.approvalStatus !== 'approved' && (
                            <button
                                onClick={handleApprove}
                                disabled={isSubmitting}
                                className={studioClass(
                                    STUDIO_THEME.colors.success,
                                    STUDIO_THEME.rounded.md,
                                    STUDIO_THEME.shadow.button,
                                    STUDIO_THEME.transition.default,
                                    'px-6 py-2 text-white hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2'
                                )}
                            >
                                <CheckCircle size={16} />
                                Approve Step
                            </button>
                        )
                    }
                </div >
            </div >
        </Modal >
    );
};
