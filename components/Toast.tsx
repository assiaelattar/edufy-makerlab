import React, { useEffect } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import './toast.css';

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

const toastStyles: Record<ToastMessage['type'], { icon: React.ReactNode }> = {
  success: {
    icon: <CheckCircle2 size={21} />,
  },
  error: {
    icon: <AlertCircle size={21} />,
  },
  warning: {
    icon: <AlertTriangle size={21} />,
  },
  info: {
    icon: <Info size={21} />,
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
      className="edu-toast pointer-events-auto"
      data-tone={toast.type}
      role={toast.type === 'error' ? 'alert' : 'status'}
    >
      <div className="edu-toast__icon">
        {styles.icon}
      </div>
      <div className="edu-toast__copy">
        <h4>{toast.title}</h4>
        <p>{toast.message}</p>
        <time dateTime={new Date(toast.timestamp).toISOString()}>
          {new Date(toast.timestamp).toLocaleTimeString()}
        </time>
      </div>
      <button
        type="button"
        onClick={() => onClose(toast.id)}
        className="edu-toast__close"
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
      className="edu-toast-stack"
      aria-live="polite"
      aria-relevant="additions removals"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
      ))}
    </div>
  );
};
