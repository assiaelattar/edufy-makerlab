import React, { useEffect, useState } from 'react';
import { AlertOctagon, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

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

const variantStyles: Record<AlertVariant, {
    icon: React.ReactNode;
    iconSurface: string;
    accent: string;
    confirm: string;
}> = {
    info: {
        icon: <Info className="h-5 w-5 text-[#2DD4BF]" />,
        iconSurface: 'border-[#14B8A6]/35 bg-[#14B8A6]/10',
        accent: 'bg-[#14B8A6]',
        confirm: 'bg-[#14B8A6] text-[#08111F] hover:bg-[#2DD4BF]',
    },
    success: {
        icon: <CheckCircle2 className="h-5 w-5 text-[#2DD4BF]" />,
        iconSurface: 'border-[#14B8A6]/35 bg-[#14B8A6]/10',
        accent: 'bg-[#14B8A6]',
        confirm: 'bg-[#14B8A6] text-[#08111F] hover:bg-[#2DD4BF]',
    },
    warning: {
        icon: <AlertTriangle className="h-5 w-5 text-[#F2C766]" />,
        iconSurface: 'border-[#F2C766]/35 bg-[#F2C766]/10',
        accent: 'bg-[#F2C766]',
        confirm: 'bg-[#F2C766] text-[#08111F] hover:bg-[#F7D98D]',
    },
    danger: {
        icon: <AlertOctagon className="h-5 w-5 text-[#FB7185]" />,
        iconSurface: 'border-[#FB7185]/35 bg-[#FB7185]/10',
        accent: 'bg-[#FB7185]',
        confirm: 'bg-[#FB7185] text-[#08111F] hover:bg-[#FDA4AF]',
    },
};

export const AlertModal: React.FC<AlertModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'info',
    isAlert = false,
}) => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsMounted(true);
            return;
        }

        const timeout = window.setTimeout(() => setIsMounted(false), 200);
        return () => window.clearTimeout(timeout);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isMounted) return null;

    const styles = variantStyles[variant];

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center p-3 transition-opacity duration-200 sm:p-5 ${
                isOpen ? 'visible opacity-100' : 'invisible opacity-0'
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="atlas-alert-title"
            aria-describedby="atlas-alert-message"
        >
            <button
                type="button"
                className="absolute inset-0 cursor-default bg-[#08111F]/80"
                onClick={onClose}
                aria-label="Close dialog"
            />

            <div
                className={`relative w-full max-w-md overflow-hidden rounded-lg border border-white/10 bg-[#0F1B2D] shadow-2xl transition duration-200 ${
                    isOpen ? 'translate-y-0 scale-100' : 'translate-y-2 scale-[0.98]'
                }`}
            >
                <div className={`h-1 w-full ${styles.accent}`} />
                <div className="flex items-start gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${styles.iconSurface}`}>
                        {styles.icon}
                    </div>
                    <div className="min-w-0 flex-1 pt-1">
                        <h3 id="atlas-alert-title" className="text-base font-bold leading-5 text-white">
                            {title}
                        </h3>
                    </div>
                    {!isAlert && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                            aria-label="Close dialog"
                            title="Close"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <div className="px-4 py-5 sm:px-5">
                    <p id="atlas-alert-message" className="whitespace-pre-line text-sm leading-6 text-slate-300">
                        {message}
                    </p>
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-white/10 bg-[#08111F]/35 px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
                    {!isAlert && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-10 rounded-lg border border-white/10 px-4 text-sm font-semibold text-slate-300 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={`h-10 rounded-lg px-5 text-sm font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-white/60 ${styles.confirm}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
