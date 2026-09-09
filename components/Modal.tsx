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
    <div className="atlas-dialog-backdrop fixed inset-0 z-50 flex items-end justify-center p-0 md:items-center md:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`atlas-dialog flex h-full max-h-full w-full flex-col overflow-hidden border-t outline-none md:h-auto md:max-h-[90vh] md:border ${sizeClasses[size]}`}
      >
        <div className="atlas-dialog-header flex min-h-16 shrink-0 items-center justify-between gap-4 border-b px-4 py-2 pt-safe-top sm:px-5">
          <h3 id={titleId} className="min-w-0 truncate text-base font-black tracking-[-0.02em]" title={title}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            title="Close dialog"
            className="atlas-dialog-close flex h-10 w-10 shrink-0 items-center justify-center border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="atlas-dialog-body custom-scrollbar overflow-y-auto p-4 pb-24 sm:p-5 md:pb-5">{children}</div>
      </div>
    </div>
  );
};
