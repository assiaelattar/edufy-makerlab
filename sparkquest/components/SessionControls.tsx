import React from 'react';
import { Clock3, Square } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFocusSession } from '../context/FocusSessionContext';

export const SessionControls: React.FC = () => {
    const { user, userProfile } = useAuth();
    const { activeSession, elapsedSeconds, endSession } = useFocusSession();
    if (!user || userProfile?.role === 'instructor' || userProfile?.role === 'admin' || !activeSession) return null;

    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    return <div className="sq-focus-chip" role="status"><span><Clock3 /><small>Build session</small><strong>{minutes}:{seconds.toString().padStart(2, '0')}</strong></span><button type="button" onClick={endSession}><Square size={15} fill="currentColor" /> End</button></div>;
};
