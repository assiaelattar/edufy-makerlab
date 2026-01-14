import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, Brain, Briefcase, Calendar, CheckCircle, ChevronRight,
    Clock, Code, Globe, GraduationCap, Layout as LayoutIcon, Lightbulb,
    Map, MessageSquare, Rocket, Share2, Star, Target, Users, Zap
} from 'lucide-react';

// --- MOCK DATA ---
const PROJECT_DATA = {
    title: "Mars Rover: Curiosity 2.0",
    hook: "Build an autonomous rover to navigate the Red Planet.",
    description: "In this mission, you will step into the shoes of a NASA JPL engineer. You'll design a chassis capable of traversing rough terrain, wire up a motor control system, and write Python code to autonomously detect and avoid obstacles using ultrasonic sensors. It's not just a toy; it's a prototype for exploration.",
    station: "Robotics",
    difficulty: "Intermediate",
    duration: "4 Sessions (8 Hours)",
    learningOutcomes: [
        { id: 1, title: "Circuit Design", desc: "Understanding H-Bridges and Motor Controllers" },
        { id: 2, title: "Python Logic", desc: "Writing Loops and Conditional Statements for Navigation" },
        { id: 3, title: "3D Mechanics", desc: "Gear Ratios and Torque Calculation" },
        { id: 4, title: "System Integration", desc: "Connecting Software with Hardware Sensors" }
    ],
    realWorldApp: {
        title: "Autonomous Vehicles",
        description: "The logic you write here is the foundation of self-driving cars (like Tesla/Waymo) and warehouse robots (like Amazon Kiva).",
        companies: ["NASA", "Tesla", "Boston Dynamics"]
    },
    keyChallenges: [
        { title: "The Chassis Challenge", desc: "Build a frame that can climb a 30-degree incline." },
        { title: "The Sensor Logic", desc: "Code the rover to stop exactly 10cm from a wall." },
        { title: "The Autonomy Run", desc: "Navigate a maze without human input." }
    ]
};

// --- COMPONENTS ---

const Badge = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${className}`}>
        {children}
    </span>
);

const SectionCard = ({ title, icon: Icon, children, className }: any) => (
    <div className={`bg-white p-6 rounded-2xl border border-slate-100 shadow-sm ${className}`}>
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4">
            {Icon && <Icon className="text-indigo-600" size={20} />}
            {title}
        </h3>
        {children}
    </div>
);

export default function ProjectDetailsDemo() {
    const [role, setRole] = useState<'parent' | 'instructor' | 'student'>('parent');

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-600 pb-20">

            {/* 1. DEMO CONTROLS (Top Bar) */}
            <div className="fixed top-0 inset-x-0 z-50 bg-slate-900 text-white px-6 py-3 shadow-md flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-400">DEMO MODE</span>
                    <span className="text-slate-400 text-sm">Enhanced Project Details</span>
                </div>
                <div className="flex bg-slate-800 rounded-lg p-1">
                    {['parent', 'instructor', 'student'].map((r) => (
                        <button
                            key={r}
                            onClick={() => setRole(r as any)}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${role === r ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            {r} View
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. HERO SECTION (Common) */}
            <div className="pt-24 pb-12 px-6 bg-white border-b border-slate-200 relative overflow-hidden">
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                <div className="max-w-6xl mx-auto grid md:grid-cols-[1fr_300px] gap-8 items-center">

                    <div className="space-y-6">
                        <div className="flex gap-2">
                            <Badge className="bg-indigo-100 text-indigo-700">{PROJECT_DATA.station}</Badge>
                            <Badge className="bg-amber-100 text-amber-700">{PROJECT_DATA.difficulty}</Badge>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight">
                            {PROJECT_DATA.title}
                        </h1>
                        <p className="text-2xl md:text-3xl text-slate-500 font-medium leading-normal max-w-2xl">
                            {PROJECT_DATA.hook}
                        </p>
                        <div className="flex items-center gap-6 pt-4">
                            <div className="flex items-center gap-2 text-slate-500 font-medium">
                                <Clock size={20} className="text-indigo-500" /> {PROJECT_DATA.duration}
                            </div>
                            <div className="flex items-center gap-2 text-slate-500 font-medium">
                                <Users size={20} className="text-indigo-500" /> Ages 10-14
                            </div>
                        </div>
                    </div>

                    {/* Visual Element */}
                    <div className="relative aspect-square md:aspect-auto md:h-64 rounded-3xl overflow-hidden shadow-2xl rotate-3 hover:rotate-0 transition-all duration-500">
                        <img
                            src="https://images.unsplash.com/photo-1541873676-a181313cf202?auto=format&fit=crop&q=80&w=1000"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                            <span className="text-white font-bold text-sm flex items-center gap-2">
                                <Brain className="text-amber-400" size={16} /> Critical Thinking
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. CONTENT AREA (Role Specific) */}
            <div className="max-w-6xl mx-auto px-6 py-12">

                <AnimatePresence mode='wait'>
                    {/* === PARENT VIEW === */}
                    {role === 'parent' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            key="parent" className="grid md:grid-cols-2 gap-8"
                        >
                            <div className="space-y-8">
                                <SectionCard title="Why this matters?" icon={Globe} className="bg-indigo-50 border-indigo-100">
                                    <p className="text-lg text-slate-700 mb-4 leading-relaxed">
                                        {PROJECT_DATA.realWorldApp.description}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {PROJECT_DATA.realWorldApp.companies.map(c => (
                                            <span key={c} className="bg-white px-3 py-1 rounded-md text-xs font-bold text-indigo-900 border border-indigo-100 shadow-sm">{c}</span>
                                        ))}
                                    </div>
                                </SectionCard>

                                <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
                                    <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                        <MessageSquare className="text-purple-500" /> Dinner Table Talk
                                    </h3>
                                    <p className="text-slate-500 italic mb-6">Ask your child these questions to spark a conversation:</p>
                                    <ul className="space-y-4">
                                        <li className="flex gap-4 items-start">
                                            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold shrink-0">1</div>
                                            <p className="text-slate-700">"What was the hardest part about making the rover drive straight?"</p>
                                        </li>
                                        <li className="flex gap-4 items-start">
                                            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold shrink-0">2</div>
                                            <p className="text-slate-700">"How does the sensor know when to stop?"</p>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <SectionCard title="Skills They Will Gain" icon={Zap}>
                                    <div className="grid grid-cols-1 gap-4">
                                        {PROJECT_DATA.learningOutcomes.map(outcome => (
                                            <div key={outcome.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                                <div className="p-2 bg-green-100 text-green-700 rounded-lg">
                                                    <CheckCircle size={16} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900">{outcome.title}</h4>
                                                    <p className="text-sm text-slate-500">{outcome.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </SectionCard>

                                <div className="p-6 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-lg mb-1">Download Brief</h4>
                                        <p className="text-slate-400 text-sm">PDF overview for parents</p>
                                    </div>
                                    <button className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-200 transition-colors">
                                        Download
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* === INSTRUCTOR VIEW === */}
                    {role === 'instructor' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            key="instructor" className="space-y-8"
                        >
                            <div className="grid md:grid-cols-3 gap-6">
                                <SectionCard title="Learning Objectives" icon={Target} className="md:col-span-2">
                                    <ul className="space-y-3">
                                        {PROJECT_DATA.learningOutcomes.map(o => (
                                            <li key={o.id} className="flex items-center gap-3 text-slate-700 font-medium">
                                                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                                {o.desc}
                                            </li>
                                        ))}
                                    </ul>
                                </SectionCard>
                                <SectionCard title="Preparation" icon={Briefcase}>
                                    <div className="space-y-4">
                                        <div>
                                            <h5 className="text-xs font-black text-slate-400 uppercase mb-1">Kit Requirements</h5>
                                            <p className="text-sm font-medium">Lego Spike Prime OR Arduino Starter Kit</p>
                                        </div>
                                        <div>
                                            <h5 className="text-xs font-black text-slate-400 uppercase mb-1">Prerequisites</h5>
                                            <div className="flex gap-2">
                                                <span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600">Intro to Circuits</span>
                                            </div>
                                        </div>
                                    </div>
                                </SectionCard>
                            </div>

                            <SectionCard title="Curriculum Flow" icon={Map}>
                                <div className="relative">
                                    <div className="absolute top-0 bottom-0 left-6 w-0.5 bg-slate-200"></div>
                                    <div className="space-y-8 relative">
                                        {PROJECT_DATA.keyChallenges.map((challenge, i) => (
                                            <div key={i} className="flex gap-6 items-start">
                                                <div className="w-12 h-12 rounded-xl bg-white border-2 border-slate-200 text-slate-500 flex items-center justify-center font-black text-lg relative z-10 shadow-sm shrink-0">
                                                    {i + 1}
                                                </div>
                                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex-1">
                                                    <h4 className="font-bold text-slate-900 text-lg mb-1">{challenge.title}</h4>
                                                    <p className="text-slate-600">{challenge.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </SectionCard>
                        </motion.div>
                    )}

                    {/* === STUDENT VIEW === */}
                    {role === 'student' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            key="student" className="space-y-12"
                        >
                            <div className="text-center max-w-2xl mx-auto">
                                <h2 className="text-3xl font-black text-slate-900 mb-6">Your Mission Briefing 🚀</h2>
                                <p className="text-xl text-slate-600 leading-relaxed">
                                    {PROJECT_DATA.description}
                                </p>
                            </div>

                            <div className="grid md:grid-cols-3 gap-6">
                                {PROJECT_DATA.keyChallenges.map((challenge, i) => (
                                    <div key={i} className="bg-white p-6 rounded-3xl border-2 border-slate-100 hover:border-indigo-500 hover:shadow-xl transition-all group cursor-default">
                                        <div className="text-6xl mb-4 opacity-20 font-black text-indigo-900 group-hover:opacity-100 group-hover:scale-110 transition-all origin-left">
                                            0{i + 1}
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 mb-2">{challenge.title}</h3>
                                        <p className="text-slate-500">{challenge.desc}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-slate-900 rounded-[3rem] p-12 text-center relative overflow-hidden text-white">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-800 to-slate-900"></div>
                                <div className="relative z-10">
                                    <h3 className="text-4xl font-black mb-6">Ready to Start?</h3>
                                    <button className="px-12 py-4 bg-amber-400 text-amber-900 rounded-2xl font-black text-xl hover:bg-amber-300 hover:scale-105 transition-all shadow-xl shadow-amber-500/20">
                                        Launch Mission
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
}
