import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';
import { SparkbookDialog } from './SparkbookDialog';

interface ModernAlertProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void;
    title?: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error' | 'confirm';
    confirmLabel?: string;
    cancelLabel?: string;
}

export const ModernAlert: React.FC<ModernAlertProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = 'info',
    confirmLabel = 'OK',
    cancelLabel = 'Cancel'
}) => {
    const details = {
        success: { icon: <CheckCircle size={28} />, tone: 'lime' as const, eyebrow: 'Progress saved' },
        warning: { icon: <AlertTriangle size={28} />, tone: 'orange' as const, eyebrow: 'Check this first' },
        error: { icon: <AlertCircle size={28} />, tone: 'rose' as const, eyebrow: 'Something needs attention' },
        confirm: { icon: <HelpCircle size={28} />, tone: 'blue' as const, eyebrow: 'Quick confirmation' },
        info: { icon: <AlertCircle size={28} />, tone: 'ink' as const, eyebrow: 'Studio note' },
    }[type];
    const needsCancel = type === 'confirm' || (type === 'warning' && Boolean(onConfirm));

    return (
        <SparkbookDialog
            isOpen={isOpen}
            onClose={onClose}
            eyebrow={details.eyebrow}
            title={title || (type === 'confirm' ? 'Are you sure?' : 'Studio note')}
            icon={details.icon}
            tone={details.tone}
            size="sm"
            footer={
                <div className="sq-alert-actions">
                    {needsCancel && (
                        <button type="button" className="sq-action sq-action--quiet" onClick={onClose}>
                            {cancelLabel}
                        </button>
                    )}
                    <button
                        type="button"
                        className={`sq-action ${type === 'error' ? 'sq-action--danger' : 'sq-action--primary'}`}
                        onClick={() => {
                            onConfirm?.();
                            if (type !== 'confirm') onClose();
                        }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            }
        >
            <p className="sq-alert-message">{message}</p>
        </SparkbookDialog>
    );
};
