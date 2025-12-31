import React, { useState, useEffect, useRef } from 'react';

interface TypingChallengeProps {
    template: string;
    onComplete: (text: string) => void;
    onCancel: () => void;
}

export const TypingChallenge: React.FC<TypingChallengeProps> = ({ template, onComplete, onCancel }) => {
    const [input, setInput] = useState('');
    const [startTime, setStartTime] = useState<number | null>(null);
    const [wpm, setWpm] = useState(0);
    const [accuracy, setAccuracy] = useState(100);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Focus on mount
    useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        if (!startTime) setStartTime(Date.now());

        setInput(val);

        // Calculate Stats
        const words = val.length / 5;
        const minutes = (Date.now() - (startTime || Date.now())) / 60000;
        if (minutes > 0) setWpm(Math.round(words / minutes));

        // Accuracy
        let errors = 0;
        for (let i = 0; i < val.length; i++) {
            if (val[i] !== template[i]) errors++;
        }
        setAccuracy(Math.max(0, 100 - Math.round((errors / Math.max(1, val.length)) * 100)));

        // Check Completion
        if (val === template) {
            // Play success sound logic here if needed or handled by parent
        }
    };

    const isComplete = input === template;

    return (
        <div className="bg-slate-900 p-6 rounded-3xl border-4 border-slate-700 shadow-2xl max-w-2xl w-full mx-auto animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="animate-pulse">⌨️</span> Pro Comms Protocol
                </h3>
                <div className="flex gap-4 text-xs font-bold text-slate-500 uppercase">
                    <span>WPM: <span className="text-white">{wpm}</span></span>
                    <span>Accuracy: <span className={`${accuracy < 90 ? 'text-red-400' : 'text-green-400'}`}>{accuracy}%</span></span>
                </div>
            </div>

            <p className="text-slate-400 text-sm font-bold mb-4">
                Type the message below exactly to transmit. Professionalism is key, Cadet.
            </p>

            <div className="relative font-mono text-lg leading-relaxed mb-6 bg-slate-800 rounded-xl overflow-hidden border-2 border-slate-600">
                {/* Ghost Overlay */}
                <div className="absolute inset-0 p-4 text-slate-600 pointer-events-none whitespace-pre-wrap">
                    {template}
                </div>

                {/* User Input Highlighting Layer (Complex to overlay perfectly, simpler to just use textarea for now) 
                    For v1, we just show the user input. To make it "game-like", we could render spans.
                */}
                <textarea
                    ref={inputRef}
                    value={input}
                    onChange={handleChange}
                    className="w-full h-48 bg-transparent text-white p-4 outline-none resize-none relative z-10 whitespace-pre-wrap"
                    spellCheck={false}
                    placeholder="Start typing..."
                />
            </div>

            {/* Visual Progress Feedback */}
            {input.length > 0 && input !== template && (
                <div className="bg-red-500/10 text-red-400 px-4 py-2 rounded-lg text-xs font-bold mb-4 border border-red-500/20 text-center animate-pulse">
                    match the template exactly
                </div>
            )}

            <div className="flex gap-4">
                <button
                    onClick={onCancel}
                    className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-800 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={() => onComplete(input)}
                    disabled={!isComplete}
                    className={`flex-1 py-3 rounded-xl font-black uppercase tracking-wider transition-all
                        ${isComplete
                            ? 'bg-green-500 text-white shadow-lg shadow-green-500/20 hover:scale-105 active:scale-95'
                            : 'bg-slate-800 text-slate-600 cursor-not-allowed'}
                    `}
                >
                    {isComplete ? 'Transmit Message 🚀' : `Complete Typing (${Math.round((input.length / template.length) * 100)}%)`}
                </button>
            </div>
        </div>
    );
};
