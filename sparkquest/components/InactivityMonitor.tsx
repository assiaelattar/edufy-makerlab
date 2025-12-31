import React, { useEffect, useState } from 'react';
import { Power } from 'lucide-react';

export const InactivityMonitor: React.FC = () => {
    const [warningStep, setWarningStep] = useState<'none' | 'warning' | 'shutdown'>('none');
    const [countdown, setCountdown] = useState(10); // 10s grace period after warning to click button
    const [quote, setQuote] = useState('');

    const quotes = [
        "Focus is the key 🔑",
        "You are a Maker, not a player 🛠️",
        "Don't just play, CREATE! ✨",
        "Your project is waiting for you 🚀",
        "Stay focused, make magic happen 🪄",
        "Tu es un Maker, pas un joueur 🔧",
        "Le futur se construit maintenant 🏗️",
        "Concentration = Création 🧠",
        "Reviens vite, ton projet t'attend ! ⚡",
        "Ne joue pas, INVENTE ! 💡",
        "Builders change the world 🌍",
        "Reste focus, c'est ton moment 🎯"
    ];

    const playBeep = () => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContext) {
                const audioCtx = new AudioContext();
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);

                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // 800Hz beep
                gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.1); // 100ms beep
            }
        } catch (err) {
            console.error('Audio beep failed:', err);
        }
    };

    useEffect(() => {
        let backgroundTimer: NodeJS.Timeout;
        let shutdownInterval: NodeJS.Timeout;
        let idleTimer: NodeJS.Timeout;

        // --- 1. USER INACTIVITY CHECK (Auto-Logout) ---
        const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 Minutes

        const resetIdleTimer = () => {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
                console.log('💤 Idle Timeout - Logging out to protect session');
                // Force logout by reloading (App.tsx checks auth, but simplest is clear + reload)
                // Actually, let's notify or reload.
                // Better: Clear local storage "session" if any, and reload.
                // Since this is a hard reset for shared devices:
                window.location.reload();
            }, IDLE_TIMEOUT);
        };

        // Listen for activity
        const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
        activityEvents.forEach(evt => document.addEventListener(evt, resetIdleTimer));

        // Start initial timer
        resetIdleTimer();

        // --- 2. ANTI-CHEAT / BACKGROUND CHECK ---
        const handleVisibilityChange = () => {
            if (document.hidden) {
                console.log('App hidden - starting 30s timer');
                // Kid quit the app (minimized/alt-tab)
                // Wait 30 seconds, then trigger Alert + Force Focus
                backgroundTimer = setTimeout(() => {
                    triggerAlertProtocol();
                }, 30000); // 30 seconds allowed in background
            } else {
                // App is visible again
                console.log('App visible - clearing timers');
                clearTimeout(backgroundTimer);
                resetIdleTimer(); // They are back, logic resets
                if (warningStep === 'none') {
                    // Safe
                } else {
                    // They came back during warning?
                    // We keep the warning up until they explicitly acknowledge it? 
                    // No, let's auto-dismiss if they come back *before* the 30s timer hits.
                    // If the timer HIT (warningStep is active), we assume they were forced back.
                    // We'll let them click to dismiss.
                }
            }
        };

        const triggerAlertProtocol = () => {
            console.log('⚠️ 30s Background Limit Reached!');
            // Select random quote
            const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
            setQuote(randomQuote);

            setWarningStep('warning');
            playBeep(); // Beep on warning start

            // Force App to Foreground
            if ((window as any).sparkquest?.forceFocus) {
                (window as any).sparkquest.forceFocus();
            }

            // Start countdown to shutdown
            let timeLeft = 10;
            setCountdown(timeLeft);

            shutdownInterval = setInterval(() => {
                timeLeft--;
                setCountdown(timeLeft);
                playBeep(); // Beep every second
                if (timeLeft <= 0) {
                    clearInterval(shutdownInterval);
                    performShutdown();
                }
            }, 1000);
        };

        const performShutdown = () => {
            console.log('🔴 SHUTTING DOWN LAPTOP');
            if ((window as any).sparkquest?.shutdown) {
                (window as any).sparkquest.shutdown();
            } else {
                alert("🔴 SYSTEM WOULD SHUTDOWN NOW (Dev Mode)");
                setWarningStep('none'); // Reset for dev
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearTimeout(backgroundTimer);
            clearTimeout(idleTimer);
            clearInterval(shutdownInterval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            activityEvents.forEach(evt => document.removeEventListener(evt, resetIdleTimer));
        };
    }, [warningStep]);

    const handleBackToWork = () => {
        setWarningStep('none');
        setCountdown(10);
        // Clear any pending shutdown (will be cleared by useEffect cleanup/re-render logic if we controlled it via state, 
        // but interval is local. We need to reset everything.)
        // Ideally we restart the component logic or force a reload. 
        // For now, simpler: user clicked "I'm back", safe.
    };

    if (warningStep === 'none') return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/95 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="flex flex-col items-center text-center space-y-8 p-8 max-w-4xl animate-bounce-slow">

                <div className="w-32 h-32 bg-indigo-600 rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(79,70,229,0.5)] animate-pulse">
                    <Power className="w-16 h-16 text-white" />
                </div>

                <div className="space-y-6">
                    <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 uppercase tracking-tighter drop-shadow-2xl px-4 leading-tight">
                        "{quote}"
                    </h1>
                    <p className="text-2xl text-slate-300 font-medium">
                        Focus on your creation.
                    </p>
                </div>

                <div className="bg-black/50 border border-slate-700 rounded-3xl p-8 w-full max-w-lg mt-8">
                    <p className="text-red-400 font-bold uppercase tracking-widest text-sm mb-4">Automatic Shutdown In</p>
                    <div className="text-9xl font-black text-white tabular-nums leading-none tracking-tighter">
                        {countdown}
                    </div>
                </div>

                <button
                    onClick={handleBackToWork}
                    className="px-12 py-6 bg-white text-slate-900 hover:bg-indigo-50 rounded-2xl font-black text-2xl hover:scale-105 active:scale-95 transition-all shadow-2xl hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]"
                >
                    I'M BACK TO WORK! 🚀
                </button>
            </div>
        </div>
    );
};
