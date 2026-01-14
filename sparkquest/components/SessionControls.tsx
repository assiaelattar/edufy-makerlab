import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useFocusSession } from '../context/FocusSessionContext';
import { Square, Clock } from 'lucide-react';

export const SessionControls: React.FC = () => {
    const { user, userProfile } = useAuth();
    const { activeSession, elapsedSeconds, startSession, endSession } = useFocusSession();

    // Hide for non-students or logged out
    if (!user || userProfile?.role === 'instructor' || userProfile?.role === 'admin') {
        return null;
    }

    const formatTime = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!activeSession) {
        return null; // Button removed as requested
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-4">
            {/* Timer Display */}
            <div className="flex items-center gap-2 px-5 py-3 bg-slate-900/90 border border-green-500/30 rounded-xl backdrop-blur-sm">
                <Clock className="w-5 h-5 text-green-400 animate-pulse" />
                <span className="text-white font-mono text-xl font-bold tabular-nums">
                    {formatTime(elapsedSeconds)}
                </span>
            </div>

            {/* End Button */}
            <button
                onClick={endSession}
                className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-black rounded-2xl shadow-2xl shadow-red-500/30 hover:scale-105 transition-all group"
            >
                <Square className="w-6 h-6 group-hover:scale-110 transition-transform" fill="white" />
                <span className="text-lg">End Session</span>
            </button>
        </div>
    );
};
