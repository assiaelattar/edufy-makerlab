import React, { useEffect, useId, useRef } from 'react';
import { AlertOctagon, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import './education-ui/education-system-v1.css';
import './alert-modal.css';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

interface AlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: AlertVariant;
    isAlert?: boolean;
}

const variantIcons = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: AlertOctagon };
const variantAccents = { info: 'blue', success: 'green', warning: 'orange', danger: 'red' } as const;
const focusableSelector = 'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]';

export const AlertModal: React.FC<AlertModalProps> = ({
    isOpen, onClose, onConfirm, title, message,
    confirmText = 'Confirm', cancelText = 'Cancel', variant = 'info', isAlert = false,
}) => {
    const titleId = useId();
    const messageId = useId();
    const dialogRef = useRef<HTMLDivElement>(null);
    const initialFocusRef = useRef<HTMLButtonElement>(null);
    const openerRef = useRef<HTMLElement | null>(null);
    const wasOpenRef = useRef(false);
    const onCloseRef = useRef(onClose);

    // Capture the opener before the dialog moves focus.
    if (isOpen && !wasOpenRef.current) openerRef.current = document.activeElement as HTMLElement | null;
    wasOpenRef.current = isOpen;
    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

    useEffect(() => {
        if (!isOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const focusFrame = requestAnimationFrame(() => initialFocusRef.current?.focus());
        const handleKeyDown = (event: KeyboardEvent) => {
            const dialog = dialogRef.current;
            if (!dialog) return;
            const dialogs = document.querySelectorAll('[aria-modal="true"],[role="alertdialog"]');
            if (dialogs[dialogs.length - 1] !== dialog) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                onCloseRef.current();
            }
            if (event.key !== 'Tab') return;
            const controls = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
                .filter(element => element.getClientRects().length > 0);
            const first = controls[0], last = controls[controls.length - 1];
            if (!first) { event.preventDefault(); dialog.focus(); }
            else if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
                event.preventDefault(); last.focus();
            } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
                event.preventDefault(); first.focus();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            cancelAnimationFrame(focusFrame);
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = previousOverflow;
            if (openerRef.current?.isConnected) openerRef.current.focus();
        };
    }, [isOpen]);

    if (!isOpen) return null;
    const Icon = variantIcons[variant];
    return (
        <div className="edu-confirm-layer" data-edu-system="1">
            <div className="edu-confirm-backdrop" aria-hidden="true" onClick={event => {
                if (event.target === event.currentTarget) onClose();
            }} />
            <div ref={dialogRef} className="edu-confirm-dialog" data-edu-accent={variantAccents[variant]} role={isAlert ? 'alertdialog' : 'dialog'}
                aria-modal="true" aria-labelledby={titleId} aria-describedby={messageId} tabIndex={-1}>
                <header className="edu-confirm-header">
                    <span className="edu-confirm-icon"><Icon size={22} aria-hidden="true" /></span>
                    <h3 id={titleId}>{title}</h3>
                    {!isAlert && <button type="button" className="edu-confirm-close" onClick={onClose} aria-label="Close dialog" title="Close dialog"><X size={19} aria-hidden="true" /></button>}
                </header>
                <div className="edu-confirm-body"><p id={messageId}>{message}</p></div>
                <footer className="edu-confirm-footer">
                    {!isAlert && <button ref={initialFocusRef} type="button" className="edu-confirm-button edu-confirm-cancel" onClick={onClose}>{cancelText}</button>}
                    <button ref={isAlert ? initialFocusRef : undefined} type="button" className="edu-confirm-button edu-confirm-approve" onClick={onConfirm}>{confirmText}</button>
                </footer>
            </div>
        </div>
    );
};
