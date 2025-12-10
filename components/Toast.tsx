import React, { useEffect } from 'react';
import { X, Bell, CheckCircle2, AlertCircle, Info } from 'lucide-react';

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

const ToastItem: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    error: <AlertCircle className="w-5 h-5 text-red-400" />,
    warning: <Bell className="w-5 h-5 text-amber-400" />,
    info: <Info className="w-5 h-5 text-blue-400" />
  };

  const borderColors = {
    success: 'border-emerald-500/50',
    error: 'border-red-500/50',
    warning: 'border-amber-500/50',
    info: 'border-blue-500/50'
  };

  const bgColors = {
    success: 'bg-emerald-950/90',
    error: 'bg-red-950/90',
    warning: 'bg-amber-950/90',
    info: 'bg-blue-950/90'
  };

  return (
    <div className={`
      flex items-start gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-in slide-in-from-top-2 mb-3 w-80 pointer-events-auto
      ${borderColors[toast.type]} ${bgColors[toast.type]}
    `}>
      <div className="shrink-0 mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-white leading-tight">{toast.title}</h4>
        <p className="text-xs text-slate-300 mt-1 leading-normal">{toast.message}</p>
        <span className="text-[10px] text-slate-500 mt-2 block opacity-70">
            {new Date(toast.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <button 
        onClick={() => onClose(toast.id)} 
        className="shrink-0 text-slate-400 hover:text-white transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export const ToastContainer = ({ toasts, removeToast }: { toasts: ToastMessage[], removeToast: (id: string) => void }) => {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col items-end pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
      ))}
    </div>
  );
};