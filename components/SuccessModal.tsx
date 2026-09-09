import React from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface SuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    showConfetti?: boolean;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
    isOpen,
    onClose,
    title,
    message,
    showConfetti = true,
}) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 animate-in fade-in duration-200 sm:p-5"
            role="dialog"
            aria-modal="true"
            aria-labelledby="atlas-success-title"
            aria-describedby="atlas-success-message"
        >
            <button
                type="button"
                className="atlas-dialog-backdrop absolute inset-0 cursor-default"
                onClick={onClose}
                aria-label="Close success message"
            />

            <div className="atlas-dialog relative w-full max-w-md overflow-hidden border animate-in zoom-in-95 duration-200">
                <div className="h-1.5 w-full bg-[var(--atlas-volt)]" />
                <button
                    type="button"
                    onClick={onClose}
                    className="atlas-dialog-close absolute right-3 top-3 flex h-9 w-9 items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                    aria-label="Close success message"
                    title="Close"
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="px-5 pb-5 pt-6 sm:px-6 sm:pb-6">
                    <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-[#14B8A6]/35 bg-[#14B8A6]/10 ${showConfetti ? 'animate-in zoom-in duration-300' : ''}`}>
                        <CheckCircle2 className="h-6 w-6 text-[#2DD4BF]" strokeWidth={2.25} />
                    </div>

                    <h3 id="atlas-success-title" className="atlas-text-strong pr-10 text-xl font-black leading-7 tracking-[-0.02em]">
                        {title}
                    </h3>
                    <p id="atlas-success-message" className="atlas-text-muted mt-2 text-sm leading-6">
                        {message}
                    </p>

                    <div className="mt-6 flex justify-end border-t border-[var(--atlas-border)] pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="atlas-action h-10 w-full border border-[var(--atlas-volt-strong)] bg-[var(--atlas-volt)] px-5 text-sm font-bold text-[#111827] focus:outline-none focus:ring-2 focus:ring-white/60 sm:w-auto"
                        >
                            Awesome!
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
