import React, { useState } from 'react';
import { useFocusSession } from '../context/FocusSessionContext';
import { X, Clock, TrendingUp, Gamepad2, Target, Award, Calendar } from 'lucide-react';

interface ProductivityDashboardProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProductivityDashboard: React.FC<ProductivityDashboardProps> = ({ isOpen, onClose }) => {
    const { sessionHistory, todayFocusMinutes, weekFocusMinutes, activeSession, elapsedSeconds } = useFocusSession();

    if (!isOpen) return null;

    // Calculate stats
    const totalSessions = sessionHistory.length;
    const totalMinutes = sessionHistory.reduce((sum, s) => sum + (s.duration || 0), 0);
    const avgSessionMinutes = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;

    const totalMissions = sessionHistory.reduce((sum, s) => sum + s.stats.missionsWorked, 0);
    const totalArcade = sessionHistory.reduce((sum, s) => sum + s.stats.arcadeGames, 0);
    const totalXP = sessionHistory.reduce((sum, s) => sum + s.stats.xpEarned, 0);
    const totalSteps = sessionHistory.reduce((sum, s) => sum + s.stats.stepsCompleted, 0);

    // Get last 7 days for chart
    const last7Days: any[] = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        last7Days.push(date.toISOString().split('T')[0]);
    }

    const dailyMinutes = last7Days.map(date => {
        const daySessions = sessionHistory.filter(s => s.date === date);
        return daySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    });

    const maxMinutes = Math.max(...dailyMinutes, 60);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-6xl h-[90vh] bg-slate-950 border border-slate-800 rounded-[32px] overflow-hidden flex flex-col shadow-2xl">

                {/* Header */}
                <div className="h-20 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-between px-8 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <TrendingUp className="w-8 h-8 text-white" />
                        <h2 className="text-3xl font-black text-white">My Productivity</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
                    >
                        <X size={28} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8">

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 border border-blue-500/30 rounded-2xl p-6">
                            <Clock className="w-8 h-8 text-blue-400 mb-3" />
                            <div className="text-3xl font-black text-white">
                                {todayFocusMinutes + (activeSession ? Math.floor(elapsedSeconds / 60) : 0)}
                            </div>
                            <div className="text-blue-300 text-sm font-bold uppercase">Minutes Today</div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 border border-purple-500/30 rounded-2xl p-6">
                            <Calendar className="w-8 h-8 text-purple-400 mb-3" />
                            <div className="text-3xl font-black text-white">{weekFocusMinutes}</div>
                            <div className="text-purple-300 text-sm font-bold uppercase">This Week</div>
                        </div>

                        <div className="bg-gradient-to-br from-emerald-900/50 to-emerald-800/50 border border-emerald-500/30 rounded-2xl p-6">
                            <Target className="w-8 h-8 text-emerald-400 mb-3" />
                            <div className="text-3xl font-black text-white">{totalMissions}</div>
                            <div className="text-emerald-300 text-sm font-bold uppercase">Missions Worked</div>
                        </div>

                        <div className="bg-gradient-to-br from-amber-900/50 to-amber-800/50 border border-amber-500/30 rounded-2xl p-6">
                            <Gamepad2 className="w-8 h-8 text-amber-400 mb-3" />
                            <div className="text-3xl font-black text-white">{totalArcade}</div>
                            <div className="text-amber-300 text-sm font-bold uppercase">Arcade Games</div>
                        </div>
                    </div>

                    {/* Weekly Chart */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8">
                        <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                            <Calendar className="w-6 h-6 text-indigo-400" />
                            Last 7 Days
                        </h3>
                        <div className="flex items-end justify-between gap-3 h-48">
                            {dailyMinutes.map((minutes, idx) => {
                                const height = (minutes / maxMinutes) * 100;
                                const date = new Date(last7Days[idx]);
                                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

                                return (
                                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                                        <div className="w-full bg-slate-800 rounded-lg overflow-hidden flex-1 flex items-end">
                                            <div
                                                className="w-full bg-gradient-to-t from-indigo-500 to-purple-500 rounded-t-lg transition-all duration-500"
                                                style={{ height: `${height}%` }}
                                            />
                                        </div>
                                        <div className="text-slate-400 text-xs font-bold">{dayName}</div>
                                        <div className="text-white text-sm font-black">{minutes}m</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Session History */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8">
                        <h3 className="text-2xl font-black text-white mb-6">Recent Sessions</h3>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {sessionHistory.slice(0, 10).map((session, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-indigo-500/30 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
                                            <Clock className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <div className="text-white font-bold">{session.date}</div>
                                            <div className="text-slate-400 text-sm">
                                                {session.stats.missionsWorked} missions • {session.stats.arcadeGames} games
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-black text-indigo-400">{session.duration}m</div>
                                        <div className="text-slate-500 text-xs">Focus Time</div>
                                    </div>
                                </div>
                            ))}
                            {sessionHistory.length === 0 && (
                                <div className="text-center py-12 text-slate-500">
                                    <Award className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p className="font-bold">No sessions yet</p>
                                    <p className="text-sm">Start a focus session to track your productivity!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
