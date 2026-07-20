import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle, ExternalLink, MessageSquare, Calendar, User } from 'lucide-react';
import { ProjectStep, StudentProject } from '../../types';
import { STUDIO_THEME, studioClass } from '../../utils/studioTheme';
import { Modal } from '../../components/Modal';
import { formatDate } from '../../utils/helpers';
import { useConfirm } from '../../context/ConfirmContext';
import { AtlasActionButton, AtlasSectionHeader } from '../../components/atlas/AtlasSurface';

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
    // State for Image Preview Modal
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [reviewNotes, setReviewNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { alert: showAlert } = useConfirm();

    if (!step || !project) return null;

    const isLastStep = project.steps && project.steps.length > 0 && project.steps[project.steps.length - 1].id === step.id;

    const handleApprove = async () => {
        setIsSubmitting(true);
        try {
            await onApprove(step.id, reviewNotes);
            setReviewNotes('');
            onClose();
        } catch (error) {
            console.error('Error approving step:', error);
            await showAlert('Step not approved', 'The review could not be saved. Check your connection and try again.', 'danger');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!reviewNotes.trim()) {
            await showAlert('Feedback required', 'Add a clear note explaining what the learner should change.', 'warning');
            return;
        }
        setIsSubmitting(true);
        try {
            await onReject(step.id, reviewNotes);
            setReviewNotes('');
            onClose();
        } catch (error) {
            console.error('Error rejecting step:', error);
            await showAlert('Changes not requested', 'The review could not be saved. Check your connection and try again.', 'danger');
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
        <>
            <Modal isOpen={isOpen} onClose={onClose} title="">
                <div className="max-w-3xl space-y-5 text-slate-200">
                    {/* Header */}
                    <div>
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <AtlasSectionHeader title="Review project step" description={`${studentName} · ${project.title}`} icon={CheckCircle} />
                                <div className="mt-3 flex items-center gap-2 text-sm">
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
                    </div>

                    {/* Step Details */}
                    <div className={
                        studioClass(
                            'rounded-lg border border-white/10 bg-slate-950/55 p-5'
                        )
                    }>
                        <h3 className={studioClass(STUDIO_THEME.text.primary, 'text-lg font-semibold mb-4')}>
                            {step.title}
                        </h3>

                        {/* Proof of Work */}
                        {step.proofUrl && (
                            <div className="mb-4">
                                <label className={studioClass(STUDIO_THEME.text.secondary, 'text-sm font-medium block mb-2')}>
                                    Proof of Work:
                                </label>
                                {/* CUSTOM PREVIEW LOGIC: Avoid window.open for Images */}
                                {(step.proofUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) ||
                                    step.proofUrl.includes('firebasestorage.googleapis.com') ||
                                    step.proofUrl.startsWith('data:image')) ? (
                                    <div
                                        onClick={() => setPreviewImage(step.proofUrl!)}
                                        className="cursor-zoom-in group relative inline-block"
                                    >
                                        <img
                                            src={step.proofUrl}
                                            alt="Proof of work"
                                            className={studioClass(STUDIO_THEME.rounded.md, 'max-w-md max-h-64 object-cover border border-slate-200 group-hover:opacity-90 transition-opacity')}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 bg-black/20 rounded-md transition-opacity">
                                            <span className="bg-black/70 text-white text-xs px-2 py-1 rounded">Click to Zoom</span>
                                        </div>
                                    </div>
                                ) : (
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
                                )}
                            </div>
                        )}

                        {/* Previous Review */}
                        {step.reviewNotes && (
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
                                        {formatDate(new Date(((step.reviewedAt as any).seconds ? (step.reviewedAt as any).seconds * 1000 : step.reviewedAt) as any))}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Review Form */}
                    <div className="mb-6">
                        <label className={studioClass(STUDIO_THEME.text.primary, 'text-sm font-medium block mb-2')}>
                            Feedback / Notes {step.approvalStatus === 'pending' && '(Required for rejection)'}
                        </label>
                        <textarea
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            placeholder="Provide feedback to the student..."
                            rows={4}
                            className="w-full resize-none rounded-lg border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                        <AtlasActionButton onClick={onClose} disabled={isSubmitting}>Cancel</AtlasActionButton>

                        {step.approvalStatus !== 'rejected' && (
                            <AtlasActionButton
                                onClick={handleReject}
                                disabled={isSubmitting}
                                variant="danger"
                                icon={X}
                            >
                                Request Changes
                            </AtlasActionButton>
                        )}

                        {step.approvalStatus !== 'approved' && (
                            <AtlasActionButton
                                onClick={handleApprove}
                                disabled={isSubmitting}
                                variant="primary"
                                icon={CheckCircle}
                            >
                                {isLastStep ? 'Approve & Publish' : 'Approve Step'}
                            </AtlasActionButton>
                        )}
                    </div>
                </div>
            </Modal>

            {/* LIGHTBOX MODAL FOR EVIDENCE */}
            {previewImage && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-8" onClick={() => setPreviewImage(null)}>
                    <button className="absolute top-4 right-4 text-white hover:text-rose-400 p-2">
                        <X size={32} />
                    </button>
                    <img
                        src={previewImage}
                        alt="Evidence Preview"
                        className="max-w-full max-h-full object-contain rounded-lg animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image itself
                    />
                </div>
            )}
        </>
    );
};
