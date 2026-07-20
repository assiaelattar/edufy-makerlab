import React, { useEffect } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: number;
}

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

const toastStyles: Record<ToastMessage['type'], { icon: React.ReactNode; border: string; surface: string }> = {
  success: {
    icon: <CheckCircle2 className="h-5 w-5 text-[#2DD4BF]" />,
    border: 'border-l-[#14B8A6]',
    surface: 'bg-[#14B8A6]/10',
  },
  error: {
    icon: <AlertCircle className="h-5 w-5 text-[#FB7185]" />,
    border: 'border-l-[#FB7185]',
    surface: 'bg-[#FB7185]/10',
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5 text-[#F2C766]" />,
    border: 'border-l-[#F2C766]',
    surface: 'bg-[#F2C766]/10',
  },
  info: {
    icon: <Info className="h-5 w-5 text-[#2DD4BF]" />,
    border: 'border-l-[#14B8A6]',
    surface: 'bg-[#14B8A6]/10',
  },
};

const ToastItem: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      onClose(toast.id);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [toast.id, onClose]);

  const styles = toastStyles[toast.type];

  return (
    <div
      className={`pointer-events-auto flex w-full items-start gap-3 rounded-lg border border-l-4 border-white/10 bg-[#0F1B2D] p-3 shadow-xl transition duration-200 animate-in slide-in-from-right-2 ${styles.border}`}
      role={toast.type === 'error' ? 'alert' : 'status'}
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles.surface}`}>
        {styles.icon}
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <h4 className="text-sm font-bold leading-5 text-white">{toast.title}</h4>
        <p className="mt-0.5 break-words text-xs leading-5 text-slate-300">{toast.message}</p>
        <time className="mt-1.5 block font-mono text-[10px] leading-4 text-slate-500" dateTime={new Date(toast.timestamp).toISOString()}>
          {new Date(toast.timestamp).toLocaleTimeString()}
        </time>
      </div>
      <button
        type="button"
        onClick={() => onClose(toast.id)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
        aria-label={`Dismiss ${toast.title}`}
        title="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export const ToastContainer = ({ toasts, removeToast }: { toasts: ToastMessage[], removeToast: (id: string) => void }) => {
  return (
    <div
      className="pointer-events-none fixed inset-x-3 top-3 z-[100] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4 sm:top-4 sm:w-[22rem]"
      aria-live="polite"
      aria-relevant="additions removals"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
      ))}
    </div>
  );
};
