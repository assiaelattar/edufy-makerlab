import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, X, HelpCircle } from 'lucide-react';

interface ModernAlertProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void;
    title?: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error' | 'confirm';
    confirmLabel?: string;
    cancelLabel?: string;
}

export const ModernAlert: React.FC<ModernAlertProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = 'info',
    confirmLabel = 'OK',
    cancelLabel = 'Cancel'
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle className="w-12 h-12 text-emerald-500" />;
            case 'warning': return <AlertTriangle className="w-12 h-12 text-amber-500" />;
            case 'error': return <AlertCircle className="w-12 h-12 text-rose-500" />;
            case 'confirm': return <HelpCircle className="w-12 h-12 text-indigo-500" />;
            default: return <AlertCircle className="w-12 h-12 text-blue-500" />;
        }
    };

    const getGradient = () => {
        switch (type) {
            case 'success': return 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20';
            case 'warning': return 'from-amber-500/10 to-orange-500/10 border-amber-500/20';
            case 'error': return 'from-rose-500/10 to-red-500/10 border-rose-500/20';
            case 'confirm': return 'from-indigo-500/20 to-purple-500/20 border-indigo-500/40 shadow-[0_0_50px_-10px_rgba(99,102,241,0.3)]';
            default: return 'from-blue-500/10 to-cyan-500/10 border-blue-500/20';
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className={`
                w-full max-w-md bg-[#0f172a] rounded-[2rem] border-2 shadow-2xl overflow-hidden transform transition-all scale-100
                ${getGradient()}
            `}>
                <div className="p-8 flex flex-col items-center text-center relative">
                    {/* Close for non-confirm dialogs */}
                    {type !== 'confirm' && (
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    )}

                    <div className="mb-6 p-4 rounded-full bg-white/5 border border-white/10 shadow-inner">
                        {getIcon()}
                    </div>

                    <h3 className="text-2xl font-black text-white mb-2 tracking-tight">
                        {title || (type === 'confirm' ? 'Are you sure?' : 'Alert')}
                    </h3>

                    <p className="text-slate-400 font-medium leading-relaxed mb-8">
                        {message}
                    </p>

                    <div className="flex gap-3 w-full">
                        {(type === 'confirm' || type === 'warning' && onConfirm) && (
                            <button
                                onClick={onClose}
                                className="flex-1 py-3.5 rounded-xl font-bold text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 border-2 border-transparent hover:border-slate-700 transition-all"
                            >
                                {cancelLabel}
                            </button>
                        )}

                        <button
                            onClick={() => {
                                if (onConfirm) onConfirm();
                                if (type !== 'confirm') onClose();
                            }}
                            className={`flex-1 py-3.5 rounded-xl font-bold text-white shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]
                                ${type === 'error' ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/20' :
                                    type === 'warning' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/20' :
                                        'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20'}
                            `}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
