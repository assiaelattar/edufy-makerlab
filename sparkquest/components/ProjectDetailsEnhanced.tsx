import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock, Code, Globe, MessageSquare, Rocket, Star, Users, Zap,
    Cpu, Brain, Target, Briefcase, CheckCircle, ChevronRight, Wrench, Box
} from 'lucide-react';
import { ProjectTemplate, StudentProject } from '../types';

// Helper for dynamic icon mapping
const getIcon = (name: string) => {
    const icons: any = { Code, Cpu, Box, Zap, Rocket, Globe, MessageSquare, Star, Clock, Users, Brain, Target, Briefcase, Wrench };
    return icons[name] || Zap; // Default to Zap
};

// --- COMPONENTS ---
const Badge = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-sm ${className}`}>
        {children}
    </span>
);

const SectionCard = ({ title, icon: Icon, children, className, headerColor = "text-slate-800" }: any) => (
    <div className={`p-8 rounded-3xl border border-white/50 shadow-xl backdrop-blur-sm ${className}`}>
        {title && (
            <h3 className={`flex items-center gap-3 text-xl font-black mb-6 ${headerColor}`}>
                {Icon && <div className="p-2 bg-white rounded-xl shadow-sm"><Icon size={24} /></div>}
                {title}
            </h3>
        )}
        {children}
    </div>
);

const TechPill = ({ name, iconName, color, bg }: any) => {
    const Icon = getIcon(iconName);
    return (
        <div className={`flex flex-col items-center justify-center p-4 rounded-2xl ${bg || 'bg-slate-100'} ${color || 'text-slate-600'} border-2 border-white shadow-sm hover:scale-105 transition-transform`}>
            <Icon size={28} className="mb-2" />
            <span className="font-bold text-sm text-center">{name}</span>
        </div>
    );
};

const CompanyLogo = ({ name, color }: any) => (
    <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-xl shadow-sm border border-slate-100 font-bold text-slate-700">
        <div className={`w-3 h-3 rounded-full ${color || 'bg-slate-400'}`}></div>
        {name}
    </div>
);

interface ProjectDetailsEnhancedProps {
    project: ProjectTemplate | StudentProject;
    role?: 'parent' | 'instructor' | 'student'; // Default role view
    onLaunch?: () => void;
    onBack?: () => void;
    onEdit?: () => void;
}

export const ProjectDetailsEnhanced: React.FC<ProjectDetailsEnhancedProps> = ({ project, role: initialRole = 'parent', onLaunch, onBack, onEdit }) => {
    const [role, setRole] = useState<'parent' | 'instructor' | 'student'>(initialRole);

    // Data Normalization (Handle missing fields gracefully)
    // Cast to any to access the enhanced fields we added to types.ts
    const p = project as any;

    // Scroll fix effect
    React.useEffect(() => {
        const bodyClasses = document.body.className;
        document.body.classList.remove('overflow-hidden');
        document.body.classList.add('overflow-y-auto');
        return () => {
            document.body.className = bodyClasses;
        };
    }, []);

    if (!p) return <div>Loading Project...</div>;

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-600 pb-20 overflow-x-hidden">

            {/* 1. HEADER CONTROLS */}
            <div className="fixed top-0 inset-x-0 z-50 bg-slate-900/90 backdrop-blur-md text-white px-4 py-3 shadow-lg flex justify-between items-center border-b border-slate-700">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button onClick={onBack} className="p-1 hover:bg-slate-700 rounded-lg transition-colors">
                            <ChevronRight className="rotate-180" />
                        </button>
                    )}
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold shrink-0">SP</div>
                    <div className="hidden sm:block">
                        <span className="font-bold text-white block leading-none">{p.title}</span>
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{role} VIEW</span>
                    </div>
                </div>
                {(initialRole !== 'student') && (
                    <div className="flex bg-slate-800 rounded-xl p-1 border border-slate-700 overflow-x-auto max-w-[200px] sm:max-w-none mr-2">
                        {['parent', 'instructor', 'student'].map((r) => (
                            <button
                                key={r}
                                onClick={() => setRole(r as any)}
                                className={`px-3 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all capitalize whitespace-nowrap ${role === r ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                    }`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                )}
                {onEdit && (
                    <button
                        onClick={onEdit}
                        className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all ml-2"
                        title="Edit Project"
                    >
                        <Wrench size={20} />
                    </button>
                )}
            </div>

            {/* 2. HERO SECTION */}
            <div className="pt-24 sm:pt-28 pb-12 sm:pb-16 px-4 sm:px-6 relative overflow-hidden">
                {/* Background Gradients */}
                <div className="absolute inset-x-0 top-0 h-[400px] sm:h-[500px] bg-gradient-to-b from-indigo-50 via-purple-50 to-slate-50"></div>
                <div className="absolute top-20 right-0 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-amber-200/20 rounded-full blur-[60px] sm:blur-[100px] pointer-events-none"></div>
                <div className="absolute top-40 left-0 w-[200px] sm:w-[300px] h-[200px] sm:h-[300px] bg-blue-200/20 rounded-full blur-[50px] sm:blur-[80px] pointer-events-none"></div>

                <div className="max-w-6xl mx-auto flex flex-col-reverse lg:grid lg:grid-cols-[1.2fr_0.8fr] gap-8 lg:gap-12 items-center relative z-10">

                    <div className="space-y-6 sm:space-y-8 w-full text-center lg:text-left">
                        <div className="flex flex-wrap justify-center lg:justify-start gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <Badge className="bg-indigo-600 text-white shadow-indigo-200">
                                <Zap size={14} className="inline mr-1" /> {p.station}
                            </Badge>
                            <Badge className="bg-amber-500 text-white shadow-amber-200">
                                <Star size={14} className="inline mr-1" /> {p.difficulty || 'Intermediate'}
                            </Badge>
                        </div>

                        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
                            <h1 className="text-3xl sm:text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.1] mb-3 sm:mb-6">
                                {p.title}
                            </h1>
                            <p className="text-lg sm:text-2xl md:text-3xl text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0 text-balance">
                                {p.hook || p.description}
                            </p>
                        </div>

                        <div className="flex flex-wrap justify-center lg:justify-start gap-4 sm:gap-8 pt-2 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                            <div className="flex items-center gap-3 text-slate-600 font-bold bg-white px-4 py-2 sm:px-5 sm:py-3 rounded-2xl shadow-sm border border-slate-100 text-sm sm:text-base">
                                <Clock size={20} className="text-indigo-500" />
                                <div className="text-left">
                                    <span className="block text-[10px] text-slate-400 uppercase">Duration</span>
                                    {p.duration || '4 Sessions'}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-slate-600 font-bold bg-white px-4 py-2 sm:px-5 sm:py-3 rounded-2xl shadow-sm border border-slate-100 text-sm sm:text-base">
                                <Users size={20} className="text-purple-500" />
                                <div className="text-left">
                                    <span className="block text-[10px] text-slate-400 uppercase">Grade Level</span>
                                    Ages 10-14
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Visual Element */}
                    <div className="relative animate-in fade-in zoom-in duration-1000 w-full max-w-md lg:max-w-none">
                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-[2rem] sm:rounded-[3rem] rotate-6 opacity-20 blur-2xl"></div>
                        <div className="relative aspect-[4/3] rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl border-4 sm:border-8 border-white group">
                            <img
                                src={p.thumbnailUrl || p.coverImage || "https://images.unsplash.com/photo-1534078872842-88544d9f6524?auto=format&fit=crop&q=80&w=1000"}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6 sm:p-8">
                                <div className="text-white text-left">
                                    <p className="font-black text-lg sm:text-xl mb-1 flex items-center gap-2"><Brain className="text-amber-400" /> Key Outcome</p>
                                    <p className="opacity-90 text-sm sm:text-base">{p.learningOutcomes?.[0]?.title || 'Mastery of Skills'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Floating Tech Stack */}
                        {p.technologies && (
                            <div className="absolute -bottom-6 sm:-bottom-8 -left-2 sm:-left-8 -right-2 sm:right-8 bg-white/95 backdrop-blur-xl p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl border border-white/50 flex justify-between items-center gap-2 sm:gap-4 overflow-x-auto">
                                {p.technologies.slice(0, 3).map((tech: any) => {
                                    const Icon = getIcon(tech.icon);
                                    return (
                                        <div key={tech.name} className="flex flex-col items-center min-w-[60px]">
                                            <Icon size={20} className={tech.color || 'text-slate-600'} />
                                            <span className="text-[9px] sm:text-[10px] font-bold uppercase mt-1 text-slate-600 text-center">{tech.name}</span>
                                        </div>
                                    );
                                })}
                                <div className="h-8 w-px bg-slate-200 shrink-0"></div>
                                <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-tight text-center shrink-0">
                                    Industry<br />Standard
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 3. CONTENT AREA */}
            <div className="max-w-6xl mx-auto px-6 py-12">
                <AnimatePresence mode='wait'>

                    {/* === PARENT VIEW === */}
                    {role === 'parent' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            key="parent" className="grid lg:grid-cols-2 gap-10"
                        >
                            <div className="space-y-10">
                                {/* Why it Matters */}
                                {p.realWorldApp && (
                                    <SectionCard
                                        title="Real World Application"
                                        icon={Globe}
                                        className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100/50"
                                        headerColor="text-indigo-900"
                                    >
                                        <div className="text-lg text-slate-700 mb-8 leading-relaxed font-medium">
                                            {p.realWorldApp.title && <h4 className="font-bold text-indigo-800 mb-2">{p.realWorldApp.title}</h4>}
                                            {p.realWorldApp.description}
                                        </div>

                                        {p.realWorldApp.companies?.length > 0 && (
                                            <div>
                                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Technology Used By</h4>
                                                <div className="flex flex-wrap gap-3">
                                                    {p.realWorldApp.companies.map((c: any) => (
                                                        <CompanyLogo key={c.name} name={c.name} color={c.color} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </SectionCard>
                                )}

                                {/* Skills Matrix */}
                                {p.learningOutcomes && (
                                    <SectionCard
                                        title="Skills Unlocked"
                                        icon={Zap}
                                        className="bg-white"
                                    >
                                        <div className="grid grid-cols-1 gap-4">
                                            {p.learningOutcomes.map((outcome: any) => (
                                                <div key={outcome.id || outcome.title} className={`flex items-start gap-4 p-4 rounded-2xl transition-all border border-transparent hover:border-slate-100 hover:shadow-md bg-${outcome.theme || 'blue'}-50`}>
                                                    <div className={`p-3 bg-white text-${outcome.theme || 'blue'}-500 rounded-xl shadow-sm`}>
                                                        <CheckCircle size={20} strokeWidth={3} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-900 text-lg">{outcome.title}</h4>
                                                        <p className="text-slate-500 font-medium">{outcome.desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </SectionCard>
                                )}
                            </div>

                            <div className="space-y-10">
                                {/* Tools & Tech */}
                                {p.technologies && (
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                                            <Wrench className="text-slate-400" /> Tools & Technologies
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {p.technologies.map((tech: any) => (
                                                <TechPill key={tech.name} name={tech.name} iconName={tech.icon} color={tech.color} bg={tech.bg} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* === INSTRUCTOR VIEW === */}
                    {role === 'instructor' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            key="instructor" className="space-y-10"
                        >
                            {/* Objectives & Prep */}
                            <div className="grid md:grid-cols-3 gap-8">
                                <SectionCard title="Learning Objectives" icon={Target} className="md:col-span-2 bg-white">
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {p.learningOutcomes?.map((o: any) => (
                                            <div key={o.title} className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                                                <div className={`w-2 h-full rounded-full bg-${o.theme || 'blue'}-500 shrink-0`}></div>
                                                <div>
                                                    <h5 className="font-bold text-slate-900">{o.title}</h5>
                                                    <p className="text-sm text-slate-500">{o.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </SectionCard>

                                <div className="space-y-6">
                                    <div className="bg-slate-900 text-white p-6 rounded-3xl text-center">
                                        <h4 className="font-bold text-lg mb-2">Teaching Guide</h4>
                                        <p className="text-slate-400 text-sm mb-4">Detailed lesson plans & slides not yet available.</p>
                                        <button disabled className="w-full py-3 bg-slate-700 rounded-xl font-bold transition-colors opacity-50 cursor-not-allowed">Download PDF</button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* === STUDENT VIEW === */}
                    {role === 'student' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            key="student" className="space-y-16"
                        >
                            <div className="text-center max-w-3xl mx-auto">
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-500 font-bold text-sm mb-8 animate-bounce">
                                    <Rocket size={16} /> Mission Briefing
                                </div>
                                <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-8 leading-tight">
                                    Your Challenge:<br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">{p.title}</span>
                                </h2>
                                <p className="text-xl md:text-2xl text-slate-500 leading-relaxed font-medium">
                                    {p.description}
                                </p>
                            </div>

                            {/* Challenges GRID */}
                            <div className="grid md:grid-cols-3 gap-8">
                                {p.keyChallenges?.map((challenge: any, i: number) => (
                                    <div key={i} className="group cursor-pointer">
                                        <div className={`h-full bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 hover:border-transparent hover:ring-4 ring-indigo-100 transition-all shadow-sm hover:shadow-2xl relative overflow-hidden`}>
                                            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${challenge.color || 'from-indigo-400 to-purple-500'} opacity-10 rounded-bl-full -mr-8 -mt-8 pointer-events-none`}></div>

                                            <div className="text-6xl font-black text-slate-100 mb-6 group-hover:scale-110 origin-left transition-transform duration-500">
                                                0{i + 1}
                                            </div>
                                            <h3 className="text-2xl font-black text-slate-900 mb-3">{challenge.title}</h3>
                                            <p className="text-slate-500 font-medium text-lg">{challenge.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Launch Button */}
                            <div className="flex justify-center pt-8">
                                <button onClick={() => onLaunch && onLaunch()} className="px-12 py-5 bg-amber-400 text-amber-900 rounded-2xl font-black text-xl hover:bg-amber-300 hover:scale-105 transition-all shadow-xl shadow-amber-500/20">
                                    Launch Mission 🚀
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
