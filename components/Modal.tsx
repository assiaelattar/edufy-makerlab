import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children, size = 'md' }: { isOpen: boolean; onClose: () => void; title: string; children?: React.ReactNode, size?: 'md' | 'lg' | 'xl' | '5xl' | '6xl' }) => {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };

    document.addEventListener('keydown', handleKeyDown);
    const focusFrame = requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (dialog && !dialog.contains(document.activeElement)) dialog.focus();
    });

    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;
  const sizeClasses = { md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl', '5xl': 'max-w-5xl', '6xl': 'max-w-6xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#020711]/80 p-0 md:items-center md:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`flex h-full max-h-full w-full flex-col overflow-hidden border-t border-white/10 bg-[#0F1B2D] shadow-2xl outline-none md:h-auto md:max-h-[90vh] md:border md:rounded-lg ${sizeClasses[size]}`}
      >
        <div className="flex min-h-14 shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-[#08111F] px-4 py-2 pt-safe-top sm:px-5">
          <h3 id={titleId} className="min-w-0 truncate text-base font-bold text-white" title={title}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            title="Close dialog"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 text-slate-300 transition-colors duration-150 hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08111F]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="custom-scrollbar overflow-y-auto p-4 pb-24 sm:p-5 md:pb-5">{children}</div>
      </div>
    </div>
  );
};
