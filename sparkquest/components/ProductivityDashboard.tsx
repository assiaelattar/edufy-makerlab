import React, { useEffect } from 'react';
import { Award, CalendarDays, Clock3, Gamepad2, Target, TrendingUp } from 'lucide-react';
import { useFocusSession } from '../context/FocusSessionContext';
import { SparkbookDialog } from './SparkbookDialog';

interface ProductivityDashboardProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProductivityDashboard: React.FC<ProductivityDashboardProps> = ({ isOpen, onClose }) => {
    const { sessionHistory, todayFocusMinutes, weekFocusMinutes, activeSession, elapsedSeconds, refreshHistory } = useFocusSession();

    useEffect(() => {
        if (isOpen) void refreshHistory();
    }, [isOpen, refreshHistory]);

    const todayMinutes = todayFocusMinutes + (activeSession ? Math.floor(elapsedSeconds / 60) : 0);
    const totalMissions = sessionHistory.reduce((sum, session) => sum + session.stats.missionsWorked, 0);
    const totalArcade = sessionHistory.reduce((sum, session) => sum + session.stats.arcadeGames, 0);
    const last7Days = Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - index));
        return date.toISOString().split('T')[0];
    });
    const dailyMinutes = last7Days.map(date => sessionHistory.filter(session => session.date === date).reduce((sum, session) => sum + (session.duration || 0), 0));
    const maxMinutes = Math.max(...dailyMinutes, 60);

    return (
        <SparkbookDialog
            isOpen={isOpen}
            onClose={onClose}
            eyebrow="Field log · build rhythm"
            title="See how your workshop time adds up."
            description="Focus minutes show time spent building. Play tickets stay visible so breaks do not look like project work."
            icon={<TrendingUp />}
            tone="blue"
            size="xl"
            bodyClassName="sq-rhythm-body"
        >
            <div className="sq-rhythm-stats">
                <article className="is-lime"><Clock3 /><strong>{todayMinutes}</strong><span>focus minutes today</span></article>
                <article className="is-blue"><CalendarDays /><strong>{weekFocusMinutes}</strong><span>focus minutes this week</span></article>
                <article className="is-orange"><Target /><strong>{totalMissions}</strong><span>missions worked</span></article>
                <article className="is-sun"><Gamepad2 /><strong>{totalArcade}</strong><span>play sessions</span></article>
            </div>

            <section className="sq-rhythm-chart" aria-labelledby="rhythm-chart-title">
                <header><div><p>Seven-day strip</p><h3 id="rhythm-chart-title">Your recent build rhythm</h3></div><span>Minutes</span></header>
                <div className="sq-rhythm-bars">
                    {dailyMinutes.map((minutes, index) => {
                        const date = new Date(`${last7Days[index]}T12:00:00`);
                        return <div key={last7Days[index]}><div><span style={{ height: `${Math.max(4, (minutes / maxMinutes) * 100)}%` }} /></div><strong>{minutes}</strong><small>{date.toLocaleDateString('en-US', { weekday: 'short' })}</small></div>;
                    })}
                </div>
            </section>

            <section className="sq-rhythm-history" aria-labelledby="rhythm-history-title">
                <header><div><p>Workshop log</p><h3 id="rhythm-history-title">Recent sessions</h3></div><span>{sessionHistory.length} recorded</span></header>
                {sessionHistory.length === 0 ? (
                    <div className="sq-rhythm-empty"><Award /><strong>Your first session will appear here.</strong><span>Start a mission, focus on one build task, then close the session when you are done.</span></div>
                ) : (
                    <div className="sq-rhythm-list">{sessionHistory.slice(0, 10).map((session, index) => <article key={`${session.date}-${index}`}><span><Clock3 /></span><div><strong>{session.date}</strong><small>{session.stats.missionsWorked} missions · {session.stats.stepsCompleted} steps · {session.stats.arcadeGames} play sessions</small></div><b>{session.duration}m</b></article>)}</div>
                )}
            </section>
        </SparkbookDialog>
    );
};
