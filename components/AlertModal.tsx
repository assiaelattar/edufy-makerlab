import React, { useEffect, useState } from 'react';
import { X, AlertTriangle, CheckCircle, Info, AlertOctagon } from 'lucide-react';

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
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setAnimate(true);
        } else {
            setTimeout(() => setAnimate(false), 200);
        }
    }, [isOpen]);

    if (!isOpen && !animate) return null;

    const getIcon = () => {
        switch (variant) {
            case 'danger': return <AlertOctagon className="w-6 h-6 text-red-600" />;
            case 'warning': return <AlertTriangle className="w-6 h-6 text-amber-500" />;
            case 'success': return <CheckCircle className="w-6 h-6 text-emerald-500" />;
            default: return <Info className="w-6 h-6 text-blue-500" />;
        }
    };

    const getHeaderColor = () => {
        switch (variant) {
            case 'danger': return 'bg-red-950/30 border-red-900/50';
            case 'warning': return 'bg-amber-950/30 border-amber-900/50';
            case 'success': return 'bg-emerald-950/30 border-emerald-900/50';
            default: return 'bg-blue-950/30 border-blue-900/50';
        }
    };

    const getConfirmBtnColor = () => {
        switch (variant) {
            case 'danger': return 'bg-red-600 hover:bg-red-700 text-white shadow-red-200';
            case 'warning': return 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200';
            case 'success': return 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200';
            default: return 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200';
        }
    };

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-200 
      ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div
                className={`relative bg-slate-950 border border-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all duration-300
        ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
            >
                {/* Header */}
                <div className={`px-6 py-4 border-b flex items-center gap-3 ${getHeaderColor()}`}>
                    <div className="shrink-0 p-2 bg-slate-900 rounded-full shadow-sm border border-slate-800">
                        {getIcon()}
                    </div>
                    <h3 className="font-bold text-white text-lg flex-1">{title}</h3>
                    {!isAlert && (
                        <button
                            onClick={onClose}
                            className="p-2 -mr-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className="text-slate-300 leading-relaxed text-[15px]">{message}</p>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex justify-end gap-3">
                    {!isAlert && (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-400 font-medium hover:bg-slate-800 hover:text-white rounded-lg transition-colors text-sm"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        className={`px-6 py-2 rounded-lg font-semibold shadow-lg shadow-opacity-20 transition-all transform active:scale-95 text-sm ${getConfirmBtnColor()}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
