import React from 'react';
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';

interface StatusIndicatorProps {
  status: 'idle' | 'loading' | 'success' | 'error';
  label: string;
  errorMessage?: string;
  delay?: number;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  status, 
  label, 
  errorMessage,
  delay = 0
}) => {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!visible) return <div className="h-16"></div>;

  return (
    <div className={`
      flex items-center justify-between p-4 rounded-lg border transition-all duration-500 ease-out
      ${status === 'success' ? 'bg-emerald-950/30 border-emerald-900/50' : ''}
      ${status === 'error' ? 'bg-red-950/30 border-red-900/50' : ''}
      ${status === 'loading' || status === 'idle' ? 'bg-slate-900/50 border-slate-800' : ''}
    `}>
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          {status === 'loading' && <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />}
          {status === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          {status === 'error' && <XCircle className="w-5 h-5 text-red-400" />}
          {status === 'idle' && <div className="w-5 h-5 rounded-full border-2 border-slate-700" />}
        </div>
        <div className="flex flex-col">
          <span className={`text-sm font-medium ${status === 'success' ? 'text-emerald-200' : status === 'error' ? 'text-red-200' : 'text-slate-200'}`}>
            {label}
          </span>
          {errorMessage && (
            <span className="text-xs text-red-400 mt-1 font-mono">{errorMessage}</span>
          )}
        </div>
      </div>
      
      <div className="px-2">
         {status === 'success' && <span className="text-xs font-bold text-emerald-500 px-2 py-1 bg-emerald-950 rounded uppercase tracking-wider">OK</span>}
         {status === 'error' && <span className="text-xs font-bold text-red-500 px-2 py-1 bg-red-950 rounded uppercase tracking-wider">Fail</span>}
      </div>
    </div>
  );
};