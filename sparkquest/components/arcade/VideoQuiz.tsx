import React, { useState, useEffect, useRef } from 'react';
import { Check, X, ArrowRight, Play, Pause, Star, Trophy, Loader2, Volume2, VolumeX, RotateCcw, Maximize } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import YouTube, { YouTubeEvent, YouTubePlayer } from 'react-youtube';
import { generateQuizFromVideo } from '../../services/geminiQuizGen';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface Question {
    q: string;
    options: string[];
    correct: number;
}

interface VideoQuizProps {
    video: {
        id: string; // Ensure ID is available
        title: string;
        description?: string;
        videoUrl: string;
        questions?: Question[];
        xpReward: number;
    };
    onClose: () => void;
    onComplete: (reward: number) => void;
    isCompleted?: boolean;
}

export const VideoQuiz: React.FC<VideoQuizProps> = ({ video, onClose, onComplete, isCompleted = false }) => {
    const [step, setStep] = useState<'VIDEO' | 'QUIZ'>('VIDEO');

    // Quiz State
    const [questions, setQuestions] = useState<Question[]>(video.questions || []);
    const [loadingQuiz, setLoadingQuiz] = useState(false);

    // Playback State
    const [player, setPlayer] = useState<YouTubePlayer | null>(null);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isVideoCompleted, setIsVideoCompleted] = useState(isCompleted);
    const [isPlaying, setIsPlaying] = useState(true);
    const [volume, setVolume] = useState(100);
    const [isMuted, setIsMuted] = useState(false);

    // Quiz Interaction State
    const [currentQ, setCurrentQ] = useState(0);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);

    // Fetch or Generate Quiz
    const loadQuiz = async () => {
        if (questions.length > 0) return;

        setLoadingQuiz(true);
        try {
            // 1. Check Firestore Cache
            if (!db) return;
            const quizRef = doc(db, 'arcade_quizzes', video.id);
            const snap = await getDoc(quizRef);

            if (snap.exists() && snap.data().questions) {
                setQuestions(snap.data().questions);
            } else {
                // 2. Generate via Gemini
                console.log("Generating quiz for:", video.title);
                const generated = await generateQuizFromVideo(video.title, video.description || "Educational video");
                if (generated && generated.length > 0) {
                    setQuestions(generated);
                    // Cache it
                    await setDoc(quizRef, {
                        videoId: video.id,
                        questions: generated,
                        generatedAt: new Date()
                    });
                } else {
                    console.warn("Quiz generation returned empty questions");
                }
            }
        } catch (error) {
            console.error("Quiz load error", error);
        } finally {
            setLoadingQuiz(false);
        }
    };

    useEffect(() => {
        loadQuiz();
    }, [video.id]);

    // Timer for progress
    useEffect(() => {
        if (!player) return;

        const interval = setInterval(async () => {
            const time = await player.getCurrentTime();
            setCurrentTime(time);

            // Check completion (90%)
            if (!isVideoCompleted && duration > 0 && (time / duration) > 0.9) {
                setIsVideoCompleted(true);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [player, duration, isVideoCompleted]);

    const handleAnswer = (index: number) => {
        if (isAnswered) return;
        setSelectedOption(index);
        setIsAnswered(true);

        const isCorrect = index === questions[currentQ].correct;
        if (isCorrect) setScore(prev => prev + 1);

        setTimeout(() => {
            if (currentQ < questions.length - 1) {
                setCurrentQ(prev => prev + 1);
                setSelectedOption(null);
                setIsAnswered(false);
            } else {
                setShowResult(true);
            }
        }, 1500);
    };

    // Extract Video ID from URL or Raw ID
    const getVideoId = (url: string) => {
        if (!url) return false;
        if (url.length === 11) return url; // Raw ID
        const reg = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(reg);
        return (match && match[7].length === 11) ? match[7] : false;
    };

    const ytId = getVideoId(video.videoUrl);
    const passed = questions.length > 0 && score === questions.length;
    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="animate-in fade-in zoom-in-95 duration-200 h-full flex flex-col">
            <button onClick={onClose} className="mb-4 text-slate-400 hover:text-white flex items-center gap-2 transition-colors w-fit">
                <X size={20} /> Cancel Learning
            </button>

            <div className="bg-slate-800 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl relative flex-1 flex flex-col">
                <AnimatePresence mode="wait">
                    {step === 'VIDEO' ? (
                        <motion.div
                            key="video-step"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="flex flex-col h-full"
                        >
                            {/* Video Player Container */}
                            <div className="flex-1 bg-black relative group flex items-center justify-center overflow-hidden">
                                {ytId ? (
                                    <div className="w-full h-full relative pointer-events-none">
                                        <YouTube
                                            videoId={ytId as string}
                                            className="w-full h-full absolute inset-0"
                                            iframeClassName="w-full h-full absolute inset-0"
                                            opts={{
                                                height: '100%',
                                                width: '100%',
                                                playerVars: {
                                                    autoplay: 1,
                                                    controls: 0,
                                                    disablekb: 1,
                                                    fs: 0,
                                                    modestbranding: 1,
                                                    rel: 0,
                                                    iv_load_policy: 3,
                                                    enablejsapi: 1,
                                                    origin: window.location.origin
                                                }
                                            }}
                                            onReady={(event: YouTubeEvent) => {
                                                setPlayer(event.target);
                                                setDuration(event.target.getDuration());
                                                event.target.playVideo();
                                            }}
                                            onStateChange={(e: any) => {
                                                setIsPlaying(e.data === 1);
                                            }}
                                            onError={(e: any) => console.error("YouTube Player Error:", e)}
                                        />
                                    </div>
                                ) : (
                                    <div className="text-white">Invalid Video URL</div>
                                )}

                                {/* Custom Controls Overlay */}
                                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                                    {/* Progress Bar */}
                                    <div className="group/progress relative h-1.5 bg-white/20 rounded-full mb-4 cursor-pointer">
                                        <div
                                            className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full"
                                            style={{ width: `${(currentTime / duration) * 100}%` }}
                                        />
                                        <input
                                            type="range"
                                            min={0}
                                            max={duration}
                                            value={currentTime}
                                            onChange={(e) => {
                                                const time = parseFloat(e.target.value);
                                                setCurrentTime(time);
                                                player?.seekTo(time, true);
                                            }}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => {
                                                    if (isPlaying) player?.pauseVideo();
                                                    else player?.playVideo();
                                                }}
                                                className="text-white hover:text-indigo-400 transition-colors"
                                            >
                                                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                                            </button>

                                            <button
                                                onClick={() => {
                                                    const newMuted = !isMuted;
                                                    setIsMuted(newMuted);
                                                    if (newMuted) player?.mute();
                                                    else player?.unMute();
                                                }}
                                                className="text-white hover:text-indigo-400 transition-colors"
                                            >
                                                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                                            </button>

                                            <span className="text-xs font-medium text-slate-300">
                                                {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} /
                                                {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => player?.seekTo(0, true)}
                                                className="text-white hover:text-indigo-400 transition-colors"
                                                title="Replay"
                                            >
                                                <RotateCcw size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Controls / Info */}
                            <div className="p-8 bg-slate-800 border-t border-slate-700">
                                <div className="flex items-center justify-between gap-8">
                                    <div className="flex-1">
                                        <h3 className="text-2xl font-black text-white line-clamp-1">{video.title}</h3>
                                        <div className="flex items-center gap-4 mt-2">
                                            {/* Progress Bar */}
                                            <div className="h-2 w-48 bg-slate-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-1000 ${isVideoCompleted ? 'bg-green-500' : 'bg-indigo-500'}`}
                                                    style={{ width: `${Math.min(progressPercent, 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-medium text-slate-400">
                                                {isVideoCompleted ? 'Video Completed' : 'Keep Watching...'}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        disabled={!isVideoCompleted || loadingQuiz}
                                        onClick={() => {
                                            if (questions.length === 0 && !loadingQuiz) {
                                                loadQuiz(); // Retry
                                            } else {
                                                setStep('QUIZ');
                                            }
                                        }}
                                        className={`px-8 py-4 rounded-2xl font-black flex items-center gap-3 transition-all shadow-lg ${isVideoCompleted
                                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-105 text-white cursor-pointer shadow-blue-500/20'
                                            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                            }`}
                                    >
                                        {loadingQuiz ? (
                                            <>Generating Quiz <Loader2 className="animate-spin" size={20} /></>
                                        ) : questions.length === 0 ? (
                                            <>Retry Generating Quiz <RotateCcw size={20} /></>
                                        ) : isCompleted ? (
                                            <>Practice Quiz <ArrowRight size={20} /></>
                                        ) : (
                                            <>Take Quiz <ArrowRight size={20} /></>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="quiz-step"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex-1 flex flex-col h-full bg-slate-800"
                        >
                            {!showResult && questions.length > 0 ? (
                                <div className="flex-1 flex flex-col p-12 max-w-4xl mx-auto w-full">
                                    {/* Quiz Header */}
                                    <div className="mb-8">
                                        <div className="flex justify-between text-slate-400 text-xs font-bold uppercase mb-3 tracking-widest">
                                            <span>Question {currentQ + 1} / {questions.length}</span>
                                            <span>Progress</span>
                                        </div>
                                        <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${((currentQ) / questions.length) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    <h3 className="text-3xl font-bold text-white mb-8 leading-snug">{questions[currentQ].q}</h3>

                                    <div className="grid gap-4">
                                        {questions[currentQ].options.map((opt, idx) => {
                                            const isSelected = selectedOption === idx;
                                            const isCorrect = idx === questions[currentQ].correct;

                                            let btnClass = "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-white/5";
                                            if (isAnswered) {
                                                if (isSelected) {
                                                    btnClass = isCorrect
                                                        ? "bg-green-500/20 border-green-500 text-green-400"
                                                        : "bg-red-500/20 border-red-500 text-red-400";
                                                } else if (isCorrect) {
                                                    btnClass = "bg-green-500/10 border-green-500/50 text-green-400/50";
                                                }
                                            }

                                            return (
                                                <motion.button
                                                    key={idx}
                                                    onClick={() => handleAnswer(idx)}
                                                    disabled={isAnswered}
                                                    className={`w-full p-6 text-left border rounded-2xl transition-all font-bold text-lg flex justify-between items-center group ${btnClass}`}
                                                    whileHover={!isAnswered ? { scale: 1.01, x: 5 } : {}}
                                                    whileTap={!isAnswered ? { scale: 0.99 } : {}}
                                                >
                                                    <span>{opt}</span>
                                                    {isAnswered && isSelected && (
                                                        isCorrect ? <Check className="text-green-500" /> : <X className="text-red-500" />
                                                    )}
                                                </motion.button>
                                            )
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-slate-800 to-slate-900">
                                    <motion.div
                                        initial={{ scale: 0, rotate: -180 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ type: "spring", bounce: 0.5 }}
                                        className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 shadow-2xl ${passed ? 'bg-gradient-to-br from-green-400 to-emerald-600' : 'bg-gradient-to-br from-red-400 to-rose-600'}`}
                                    >
                                        {passed ? <Trophy size={64} className="text-white drop-shadow-lg" /> : <X size={64} className="text-white drop-shadow-lg" />}
                                    </motion.div>

                                    <h3 className="text-4xl font-black text-white mb-2">{passed ? 'Training Complete!' : 'Mission Failed'}</h3>
                                    <p className="text-slate-400 mb-8 text-lg">You got {score} out of {questions.length} correct.</p>

                                    {passed ? (
                                        isCompleted ? (
                                            <div className="px-8 py-4 bg-slate-700/50 rounded-xl text-slate-400 font-bold border border-slate-600">
                                                Good practice! You already earned XP for this.
                                            </div>
                                        ) : (
                                            <motion.button
                                                onClick={() => onComplete(video.xpReward)}
                                                className="px-12 py-5 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black rounded-2xl font-black text-xl shadow-[0_0_40px_rgba(251,191,36,0.4)] flex items-center gap-3 mx-auto"
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                animate={{ y: [0, -5, 0] }}
                                            >
                                                <Star className="fill-black" />
                                                CLAIM {video.xpReward} CREDITS
                                            </motion.button>
                                        )
                                    ) : (
                                        <div className="flex gap-4">
                                            <button
                                                onClick={() => {
                                                    // Reset
                                                    setScore(0);
                                                    setCurrentQ(0);
                                                    setShowResult(false);
                                                    setStep('VIDEO');
                                                    // Don't reset video completion status, just quiz
                                                }}
                                                className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-colors"
                                            >
                                                Review Video & Try Again
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

