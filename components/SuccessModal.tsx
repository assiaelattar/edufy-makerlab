import React, { useEffect, useState } from 'react';
import { CheckCircle2, Sparkles, X } from 'lucide-react';

interface SuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    showConfetti?: boolean;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
    isOpen,
    onClose,
    title,
    message,
    showConfetti = true
}) => {
    const [confettiPieces, setConfettiPieces] = useState<Array<{ id: number; left: number; delay: number; duration: number }>>([]);

    useEffect(() => {
        if (isOpen && showConfetti) {
            // Generate confetti pieces
            const pieces = Array.from({ length: 50 }, (_, i) => ({
                id: i,
                left: Math.random() * 100,
                delay: Math.random() * 0.5,
                duration: 2 + Math.random() * 2
            }));
            setConfettiPieces(pieces);
        }
    }, [isOpen, showConfetti]);

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />

                {/* Confetti */}
                {showConfetti && (
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {confettiPieces.map((piece) => (
                            <div
                                key={piece.id}
                                className="absolute w-2 h-2"
                                style={{
                                    left: `${piece.left}%`,
                                    top: '-10px',
                                    background: `hsl(${Math.random() * 360}, 70%, 60%)`,
                                    animationName: 'confetti',
                                    animationDuration: `${piece.duration}s`,
                                    animationDelay: `${piece.delay}s`,
                                    animationTimingFunction: 'linear',
                                    animationFillMode: 'forwards',
                                    transform: `rotate(${Math.random() * 360}deg)`
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* Modal Content */}
                <div className="relative bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-300">
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
                    >
                        <X size={20} />
                    </button>

                    {/* Success Icon */}
                    <div className="flex flex-col items-center pt-8 pb-6 px-6">
                        <div className="relative mb-6">
                            {/* Pulsing background */}
                            <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
                            <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-pulse" />

                            {/* Icon */}
                            <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-900/50">
                                <CheckCircle2 size={40} className="text-white animate-in zoom-in duration-500" strokeWidth={2.5} />
                            </div>

                            {/* Sparkles */}
                            <Sparkles
                                size={20}
                                className="absolute -top-2 -right-2 text-yellow-400 animate-pulse"
                                fill="currentColor"
                            />
                            <Sparkles
                                size={16}
                                className="absolute -bottom-1 -left-1 text-cyan-400 animate-pulse"
                                fill="currentColor"
                                style={{ animationDelay: '0.3s' }}
                            />
                        </div>

                        {/* Title */}
                        <h3 className="text-2xl font-bold text-white mb-3 text-center">
                            {title}
                        </h3>

                        {/* Message */}
                        <p className="text-slate-400 text-center text-sm leading-relaxed max-w-sm">
                            {message}
                        </p>

                        {/* Action Button */}
                        <button
                            onClick={onClose}
                            className="mt-8 px-8 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl font-bold shadow-lg shadow-emerald-900/30 transition-all active:scale-95"
                        >
                            Awesome!
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
        </>
    );
};
