import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

type SparkbookDialogTone = 'lime' | 'orange' | 'blue' | 'rose' | 'ink';
type SparkbookDialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface SparkbookDialogProps {
  isOpen?: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  tone?: SparkbookDialogTone;
  size?: SparkbookDialogSize;
  closeLabel?: string;
  bodyClassName?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export const SparkbookDialog: React.FC<SparkbookDialogProps> = ({
  isOpen = true,
  onClose,
  eyebrow = 'Sparkbook field kit',
  title,
  description,
  icon,
  tone = 'lime',
  size = 'md',
  closeLabel = 'Close dialog',
  bodyClassName = '',
  children,
  footer,
}) => {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => closeRef.current?.focus(), 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="sq-dialog-layer" role="presentation">
      <button className="sq-dialog-backdrop" type="button" onClick={onClose} aria-label={closeLabel} />
      <section
        ref={panelRef}
        className={`sq-dialog sq-dialog--${size} sq-dialog--${tone}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <header className="sq-dialog-header">
          {icon && <div className="sq-dialog-icon" aria-hidden="true">{icon}</div>}
          <div className="sq-dialog-heading">
            <p>{eyebrow}</p>
            <h2 id={titleId}>{title}</h2>
            {description && <span id={descriptionId}>{description}</span>}
          </div>
          <button ref={closeRef} className="sq-dialog-close" type="button" onClick={onClose} aria-label={closeLabel}>
            <X size={22} />
          </button>
        </header>
        <div className={`sq-dialog-body ${bodyClassName}`.trim()}>{children}</div>
        {footer && <footer className="sq-dialog-footer">{footer}</footer>}
      </section>
    </div>
  );
};
