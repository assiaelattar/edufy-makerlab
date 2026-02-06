import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Zap, Star } from 'lucide-react';

interface LoadingScreenProps {
    mode?: 'boot' | 'standard' | 'inline';
    message?: string;
    onComplete?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ mode = 'standard', message = 'Loading...', onComplete }) => {
    const [progress, setProgress] = useState(0);

    // Boot Sequence Timer
    useEffect(() => {
        if (mode === 'boot') {
            const duration = 2000; // 2 seconds boot
            const interval = 20;
            const steps = duration / interval;
            let current = 0;

            const timer = setInterval(() => {
                current++;
                const newProgress = Math.min((current / steps) * 100, 100);
                setProgress(newProgress);

                if (current >= steps) {
                    clearInterval(timer);
                    setTimeout(() => onComplete?.(), 500);
                }
            }, interval);

            return () => clearInterval(timer);
        }
    }, [mode, onComplete]);

    // Star Background Generator
    const stars = Array.from({ length: 20 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 1,
        delay: Math.random() * 2
    }));

    if (mode === 'boot') {
        return (
            <div className="fixed inset-0 bg-[#0f172a] overflow-hidden flex flex-col items-center justify-center z-50">
                {/* Space Background */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#0B1026] via-[#2B1B5A] to-[#4C1D95]"></div>

                {/* Stars */}
                {stars.map(star => (
                    <motion.div
                        key={star.id}
                        className="absolute bg-white rounded-full opacity-70"
                        style={{
                            left: `${star.x}%`,
                            top: `${star.y}%`,
                            width: star.size,
                            height: star.size,
                        }}
                        animate={{ opacity: [0.2, 1, 0.2] }}
                        transition={{ duration: 2, repeat: Infinity, delay: star.delay }}
                    />
                ))}

                {/* Rocket Animation */}
                <motion.div
                    initial={{ y: 200, opacity: 0 }}
                    animate={{ y: [200, -20, 0], opacity: 1 }}
                    exit={{ y: -1000, transition: { duration: 0.8, ease: "easeIn" } }}
                    transition={{ duration: 1.2, type: "spring" }}
                    className="relative z-10 mb-8"
                >
                    {/* Rocket Body */}
                    <div className="relative">
                        <Rocket size={120} className="text-white fill-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />

                        {/* Thrust Flame */}
                        <motion.div
                            className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-8 h-16 bg-gradient-to-t from-transparent via-orange-500 to-yellow-300 rounded-full blur-sm"
                            animate={{ height: [40, 60, 40], opacity: [0.8, 1, 0.8] }}
                            transition={{ duration: 0.2, repeat: Infinity }}
                        />
                    </div>
                </motion.div>

                {/* Text and Progress */}
                <div className="z-10 flex flex-col items-center gap-4 w-64">
                    <motion.h2
                        className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400 tracking-wider uppercase"
                        animate={{ opacity: [0.8, 1, 0.8] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    >
                        SparkQuest
                    </motion.h2>

                    <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden border border-white/20 backdrop-blur">
                        <motion.div
                            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    <p className="text-cyan-200 font-bold font-mono text-sm">
                        {progress < 30 ? "Igniting Thrusters..." :
                            progress < 70 ? "Calibrating Systems..." :
                                "Ready for Launch!"}
                    </p>
                </div>
            </div>
        );
    }

    // Standard / Inline Mode (Pulsing Spark)
    return (
        <div className={`${mode === 'inline' ? 'h-64' : 'h-screen fixed inset-0 z-50'} w-full flex flex-col items-center justify-center bg-[#0B1026] text-white`}>
            {/* Background Gradient for Fullscreen */}
            {mode !== 'inline' && (
                <div className="absolute inset-0 bg-gradient-to-b from-[#0B1026] to-[#1e1b4b] -z-10"></div>
            )}

            <div className="relative">
                {/* Outer Ring */}
                <motion.div
                    className="absolute inset-0 rounded-full border-4 border-t-cyan-400 border-r-purple-400 border-b-pink-400 border-l-yellow-400 opacity-80"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    style={{ width: '80px', height: '80px', left: '-12px', top: '-12px' }}
                />

                {/* Inner Spark */}
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="bg-white/10 p-3 rounded-full backdrop-blur-sm"
                >
                    <Zap size={32} className="text-yellow-400 fill-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
                </motion.div>
            </div>

            <motion.p
                className="mt-6 text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300 tracking-wide"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
            >
                {message}
            </motion.p>
        </div>
    );
};
