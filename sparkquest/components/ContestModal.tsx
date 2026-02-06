import React from 'react';
import { useFactoryData } from '../hooks/useFactoryData';
import { Trophy, Target, Gift, ArrowRight, CheckCircle, Lock } from 'lucide-react';
import { Contest } from '../types';

interface ContestModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ContestModal: React.FC<ContestModalProps> = ({ isOpen, onClose }) => {
    const { contests, projectTemplates, studentProjects } = useFactoryData();

    // Mock Contests if empty
    const MOCK_CONTESTS: Contest[] = [
        {
            id: 'drone-challenge',
            title: 'Sky High Drone Challenge',
            description: 'Master the skies! Complete 3 advanced drone missions to win your own Tello Drone.',
            image: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=800&q=80',
            rewardText: 'DJI Tello Drone',
            targetMissions: [], // Ideally specific IDs
            targetExploreCount: 3,
            isActive: true,
            startDate: {} as any, endDate: {} as any
        },
        {
            id: 'maker-marathon',
            title: 'Maker Marathon',
            description: 'Show your persistence. Complete any 5 missions this month to win a Motor Kit.',
            image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&q=80',
            rewardText: 'DC Motor Kit',
            targetExploreCount: 5,
            isActive: true,
            startDate: {} as any, endDate: {} as any
        }
    ];

    const displayContests = contests.length > 0 ? contests : MOCK_CONTESTS;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose}></div>
            <div className="relative w-full max-w-6xl h-[85vh] bg-slate-900 rounded-[2.5rem] border border-slate-700 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">

                {/* Header */}
                <div className="px-10 py-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-lg transform -rotate-3">
                            <Trophy className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Active Contests</h2>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Win Real Gadgets & Glory</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
                        <ArrowRight size={32} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-12">

                    {displayContests.map((contest, index) => {
                        // Calculate Progress (Mock logic)
                        const progress = Math.min((index + 1) * 33, 100);
                        const isComplete = progress >= 100;

                        return (
                            <div key={contest.id} className="relative group rounded-3xl overflow-hidden border-2 border-slate-700 bg-slate-800 hover:border-indigo-500 transition-all">
                                {/* Banner */}
                                <div className="h-64 sm:h-80 w-full relative">
                                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-transparent to-transparent z-10" />
                                    <img src={contest.image} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-700" />

                                    <div className="absolute top-10 left-10 z-20 max-w-2xl">
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className="px-4 py-1.5 bg-yellow-500 text-black font-black uppercase tracking-wider text-xs rounded-full shadow-lg flex items-center gap-2">
                                                <Trophy size={14} /> Official Contest
                                            </span>
                                            {isComplete && (
                                                <span className="px-4 py-1.5 bg-green-500 text-white font-black uppercase tracking-wider text-xs rounded-full shadow-lg flex items-center gap-2">
                                                    <CheckCircle size={14} /> Completed
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-4xl md:text-6xl font-black text-white mb-4 uppercase leading-none drop-shadow-xl">{contest.title}</h3>
                                        <p className="text-slate-200 text-lg md:text-xl font-medium drop-shadow-md mb-8">{contest.description}</p>

                                        <div className="flex items-center gap-6">
                                            <div className="flex flex-col">
                                                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Grand Prize</span>
                                                <span className="text-2xl font-black text-white flex items-center gap-2">
                                                    <Gift className="text-pink-500" /> {contest.rewardText || 'Mystery Gadget'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Progress Section */}
                                <div className="p-8 bg-slate-800/50 border-t border-slate-700">
                                    <div className="flex justify-between items-end mb-3">
                                        <div className="flex items-center gap-2 text-white font-bold">
                                            <Target className="text-indigo-500" />
                                            Mission Progress
                                        </div>
                                        <div className="text-2xl font-black text-indigo-400">{progress}%</div>
                                    </div>
                                    <div className="w-full h-4 bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-out relative"
                                            style={{ width: `${progress}%` }}
                                        >
                                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
                                        {/* Mock Mission Steps */}
                                        {[1, 2, 3].map(step => (
                                            <div key={step} className={`flex-shrink-0 w-64 p-4 rounded-xl border ${step <= (progress / 33) ? 'bg-green-500/10 border-green-500/50' : 'bg-slate-900 border-slate-700'}`}>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step <= (progress / 33) ? 'bg-green-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                                        {step <= (progress / 33) ? <CheckCircle size={16} /> : step}
                                                    </div>
                                                    <div className={`font-bold ${step <= (progress / 33) ? 'text-white' : 'text-slate-500'}`}>Mission {step}</div>
                                                </div>
                                                <div className="text-xs text-slate-400">Complete the basics of flight dynamics.</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
