import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../services/firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp, Timestamp, orderBy, limit } from 'firebase/firestore';

interface FocusSession {
    id?: string;
    studentId: string;
    startTime: Date;
    endTime?: Date;
    duration?: number; // minutes
    date: string; // YYYY-MM-DD
    stats: {
        missionsWorked: number;
        arcadeGames: number;
        xpEarned: number;
        stepsCompleted: number;
    };
}

interface FocusSessionContextType {
    activeSession: FocusSession | null;
    sessionHistory: FocusSession[];
    elapsedSeconds: number;
    startSession: () => void;
    endSession: () => void;
    incrementMissions: () => void;
    incrementArcade: (xp: number) => void;
    incrementSteps: () => void;
    todayFocusMinutes: number;
    weekFocusMinutes: number;
}

const FocusSessionContext = createContext<FocusSessionContextType | undefined>(undefined);

export const useFocusSession = () => {
    const context = useContext(FocusSessionContext);
    if (!context) throw new Error('useFocusSession must be used within FocusSessionProvider');
    return context;
};

export const FocusSessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
    const [sessionHistory, setSessionHistory] = useState<FocusSession[]>([]);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [todayFocusMinutes, setTodayFocusMinutes] = useState(0);
    const [weekFocusMinutes, setWeekFocusMinutes] = useState(0);

    // Load session history on mount
    useEffect(() => {
        if (user?.uid) {
            loadSessionHistory();
        }
    }, [user?.uid]);

    // Timer for active session
    useEffect(() => {
        if (!activeSession) {
            setElapsedSeconds(0);
            return;
        }

        // DESACTIVATED AS REQUESTED
        return;

        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - activeSession.startTime.getTime()) / 1000);
            setElapsedSeconds(elapsed);
        }, 1000);

        return () => clearInterval(interval);
    }, [activeSession]);

    const loadSessionHistory = async () => {
        if (!db || !user?.uid) return;

        try {
            // Get last 30 days of sessions
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const q = query(
                collection(db, 'focus_sessions'),
                where('studentId', '==', user.uid),
                orderBy('startTime', 'desc'),
                limit(100)
            );

            const snapshot = await getDocs(q);
            const sessions = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    startTime: data.startTime?.toDate() || new Date(),
                    endTime: data.endTime?.toDate(),
                } as FocusSession;
            });

            setSessionHistory(sessions);

            // Calculate today's focus
            const today = new Date().toISOString().split('T')[0];
            const todaySessions = sessions.filter(s => s.date === today);
            const todayMinutes = todaySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
            setTodayFocusMinutes(todayMinutes);

            // Calculate week's focus
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const weekSessions = sessions.filter(s => new Date(s.date) >= weekAgo);
            const weekMinutes = weekSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
            setWeekFocusMinutes(weekMinutes);
        } catch (error) {
            console.error('Error loading session history:', error);
        }
    };

    const startSession = () => {
        if (!user?.uid || activeSession) return;

        const now = new Date();
        const newSession: FocusSession = {
            studentId: user.uid,
            startTime: now,
            date: now.toISOString().split('T')[0],
            stats: {
                missionsWorked: 0,
                arcadeGames: 0,
                xpEarned: 0,
                stepsCompleted: 0
            }
        };

        setActiveSession(newSession);
        console.log('🎯 Focus session started!');
    };

    const endSession = async () => {
        if (!activeSession || !db || !user?.uid) return;

        const endTime = new Date();
        const duration = Math.floor((endTime.getTime() - activeSession.startTime.getTime()) / 60000); // minutes

        const completedSession: FocusSession = {
            ...activeSession,
            endTime,
            duration
        };

        try {
            // Save to Firestore
            await addDoc(collection(db, 'focus_sessions'), {
                studentId: user.uid,
                startTime: activeSession.startTime,
                endTime: endTime,
                duration,
                date: activeSession.date,
                stats: activeSession.stats
            });

            console.log(`✅ Session saved: ${duration} minutes`);

            // Update local state
            setActiveSession(null);
            setElapsedSeconds(0);
            loadSessionHistory(); // Refresh history
        } catch (error) {
            console.error('Error saving session:', error);
        }
    };

    const incrementMissions = () => {
        if (activeSession) {
            setActiveSession({
                ...activeSession,
                stats: { ...activeSession.stats, missionsWorked: activeSession.stats.missionsWorked + 1 }
            });
        }
    };

    const incrementArcade = (xp: number) => {
        if (activeSession) {
            setActiveSession({
                ...activeSession,
                stats: {
                    ...activeSession.stats,
                    arcadeGames: activeSession.stats.arcadeGames + 1,
                    xpEarned: activeSession.stats.xpEarned + xp
                }
            });
        }
    };

    const incrementSteps = () => {
        if (activeSession) {
            setActiveSession({
                ...activeSession,
                stats: { ...activeSession.stats, stepsCompleted: activeSession.stats.stepsCompleted + 1 }
            });
        }
    };

    return (
        <FocusSessionContext.Provider value={{
            activeSession,
            sessionHistory,
            elapsedSeconds,
            startSession,
            endSession,
            incrementMissions,
            incrementArcade,
            incrementSteps,
            todayFocusMinutes,
            weekFocusMinutes
        }}>
            {children}
        </FocusSessionContext.Provider>
    );
};
