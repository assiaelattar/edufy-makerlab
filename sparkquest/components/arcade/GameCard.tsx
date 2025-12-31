import React, { useState } from 'react';
import { Clock, Play, X, AlertTriangle } from 'lucide-react';

interface GameCardProps {
    game: {
        title: string;
        thumbnail: string;
        costPerMinute: number;
        description: string;
    };
    userCredits: number;
    onClose: () => void;
    onPlay: (game: any, minutes: number) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, userCredits, onClose, onPlay }) => {
    const [duration, setDuration] = useState(5); // Default 5 mins

    const totalCost = duration * game.costPerMinute;
    const canAfford = userCredits >= totalCost;

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in zoom-in-95">
            <div className="w-full max-w-md bg-slate-900 border border-purple-500 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.3)]">
                <div className="relative h-48">
                    <img src={game.thumbnail} alt={game.title} className="w-full h-full object-cover" />
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white backdrop-blur transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-900 to-transparent">
                        <h2 className="text-3xl font-black text-white">{game.title}</h2>
                    </div>
                </div>

                <div className="p-8">
                    <div className="mb-8">
                        <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">Select Duration</label>
                        <div className="grid grid-cols-3 gap-3">
                            {[5, 10, 15].map(mins => {
                                const cost = mins * game.costPerMinute;
                                const affordable = userCredits >= cost;
                                return (
                                    <button
                                        key={mins}
                                        disabled={!affordable}
                                        onClick={() => setDuration(mins)}
                                        className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${duration === mins
                                                ? 'border-purple-500 bg-purple-500/20 text-white'
                                                : affordable
                                                    ? 'border-slate-700 bg-slate-800 text-slate-400 hover:border-purple-500/50'
                                                    : 'border-slate-800 bg-slate-900/50 text-slate-700 opacity-50 cursor-not-allowed'
                                            }`}
                                    >
                                        <span className="text-lg font-black">{mins}m</span>
                                        <span className="text-xs font-bold">{cost} Credits</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-8 flex justify-between items-center">
                        <span className="text-slate-400 font-medium">Total Cost</span>
                        <div className="text-right">
                            <div className={`text-2xl font-black ${canAfford ? 'text-yellow-400' : 'text-red-500'}`}>
                                {totalCost} <span className="text-sm text-slate-500">Credits</span>
                            </div>
                            {!canAfford && (
                                <div className="text-xs text-red-400 flex items-center gap-1 justify-end mt-1">
                                    <AlertTriangle size={10} /> Need {totalCost - userCredits} more
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={() => onPlay(game, duration)}
                        disabled={!canAfford}
                        className={`w-full py-4 rounded-xl font-black text-lg uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg ${canAfford
                                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/40 hover:scale-[1.02]'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                    >
                        {canAfford ? (
                            <>
                                <Play size={20} fill="currentColor" /> Start Session
                            </>
                        ) : (
                            'Insufficient Credits'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
