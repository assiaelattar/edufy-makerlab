import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Cpu, Wifi, Zap, Shield, CheckCircle } from 'lucide-react';

interface BootSequenceProps {
    onComplete: () => void;
}

export const BootSequence: React.FC<BootSequenceProps> = ({ onComplete }) => {
    const [logs, setLogs] = useState<string[]>([]);
    const [progress, setProgress] = useState(0);

    const steps = [
        { text: "Initializing Core Systems...", icon: Cpu },
        { text: "Verifying Security Protocols...", icon: Shield },
        { text: "Connecting to Maker Network...", icon: Wifi },
        { text: "Calibrating Fabrication Modules...", icon: Zap },
        { text: "Access Granted.", icon: CheckCircle },
    ];

    useEffect(() => {
        let currentStep = 0;

        // Log interval
        const logInterval = setInterval(() => {
            if (currentStep >= steps.length) {
                clearInterval(logInterval);
                setTimeout(onComplete, 1000); // Wait 1s after done
                return;
            }

            const step = steps[currentStep];
            setLogs(prev => [...prev, step.text]);
            setProgress(((currentStep + 1) / steps.length) * 100);
            currentStep++;
        }, 800);

        return () => clearInterval(logInterval);
    }, []);

    return (
        <div className="h-screen w-full bg-black text-green-500 font-mono flex flex-col items-center justify-center p-8 relative overflow-hidden">
            {/* Background Matrix Effect (Simplified) */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(0,255,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.1)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
            </div>

            <div className="max-w-2xl w-full z-10 space-y-8">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-4 text-3xl font-bold border-b border-green-900 pb-4"
                >
                    <Terminal size={32} />
                    <span>SPARKQUEST_OS v2.0</span>
                </motion.div>

                <div className="space-y-2 h-64 overflow-hidden border border-green-900/50 p-4 rounded-lg bg-black/50 backdrop-blur">
                    <AnimatePresence>
                        {logs.map((log, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-3 text-lg"
                            >
                                <span className="text-green-800">{`>`}</span>
                                {log}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-sm uppercase tracking-widest opacity-60">
                        <span>System Load</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 bg-green-900/30 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]"
                            initial={{ width: "0%" }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
