import React from 'react';

interface CustomModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'error' | 'confirm';
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
}

export const CustomModal: React.FC<CustomModalProps> = ({
    isOpen,
    onClose,
    title,
    message,
    type = 'info',
    onConfirm,
    confirmText = 'OK',
    cancelText = 'Cancel'
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'confirm': return '❓';
            default: return 'ℹ️';
        }
    };

    const getColor = () => {
        switch (type) {
            case 'success': return 'bg-green-500';
            case 'error': return 'bg-red-500';
            case 'confirm': return 'bg-blue-500';
            default: return 'bg-indigo-500';
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200 border-4 border-white">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute -top-3 -right-3 w-10 h-10 bg-slate-800 hover:bg-slate-900 text-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 font-bold text-xl z-10"
                >
                    ×
                </button>

                {/* Header */}
                <div className={`${getColor()} rounded-t-2xl px-6 py-4 flex items-center gap-3`}>
                    <span className="text-4xl">{getIcon()}</span>
                    <h3 className="text-xl font-black text-white">{title}</h3>
                </div>

                {/* Body */}
                <div className="px-6 py-6">
                    <p className="text-slate-700 text-base font-medium leading-relaxed whitespace-pre-wrap">
                        {message}
                    </p>
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 flex gap-3">
                    {type === 'confirm' && onConfirm ? (
                        <>
                            <button
                                onClick={() => {
                                    onConfirm();
                                    onClose();
                                }}
                                className={`flex-1 py-3 px-6 ${getColor()} text-white font-black rounded-2xl hover:opacity-90 transition-all border-b-4 border-black/20 active:border-b-0 active:translate-y-1 shadow-lg uppercase tracking-wide`}
                            >
                                {confirmText}
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 px-6 bg-slate-200 text-slate-700 font-black rounded-2xl hover:bg-slate-300 transition-all border-b-4 border-slate-400 active:border-b-0 active:translate-y-1 shadow-lg uppercase tracking-wide"
                            >
                                {cancelText}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onClose}
                            className={`w-full py-3 px-6 ${getColor()} text-white font-black rounded-2xl hover:opacity-90 transition-all border-b-4 border-black/20 active:border-b-0 active:translate-y-1 shadow-lg uppercase tracking-wide`}
                        >
                            {confirmText}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
