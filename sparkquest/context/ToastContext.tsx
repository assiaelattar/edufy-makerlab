import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 4000) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newToast = { id, message, type, duration };

        setToasts(prev => [...prev, newToast]);

        // Auto-dismiss
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, []);

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const getIcon = (type: ToastType) => {
        switch (type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            default: return 'ℹ️';
        }
    };

    const getColors = (type: ToastType) => {
        switch (type) {
            case 'success': return 'bg-green-500 border-green-600';
            case 'error': return 'bg-red-500 border-red-600';
            case 'warning': return 'bg-yellow-500 border-yellow-600';
            default: return 'bg-blue-500 border-blue-600';
        }
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}

            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-[99999] flex flex-col gap-2 pointer-events-none">
                {toasts.map((toast, index) => (
                    <div
                        key={toast.id}
                        className={`${getColors(toast.type)} text-white px-6 py-4 rounded-2xl shadow-2xl border-b-4 min-w-[300px] max-w-[400px] pointer-events-auto animate-in slide-in-from-top-2 fade-in duration-300`}
                        style={{ animationDelay: `${index * 50}ms` }}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{getIcon(toast.type)}</span>
                            <p className="font-bold text-sm flex-1">{toast.message}</p>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="text-white/80 hover:text-white font-bold text-xl leading-none"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
