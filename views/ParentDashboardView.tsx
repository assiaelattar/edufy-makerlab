import React, { useState, useMemo } from 'react';
import { User, Calendar, CreditCard, Car, Bell, Phone, Clock, MapPin, CheckCircle2, ChevronRight, LogOut, Wallet, AlertCircle, Trophy, Star, Target, TrendingUp, Zap, BookOpen, Brain, Rocket, ChevronDown, Award, Code, Sparkles, ListChecks, Lock, Unlock, ClipboardList, Play, Send } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { formatCurrency, formatDate } from '../utils/helpers';
import { StudentProject } from '../types';
import { getTheme } from '../utils/theme';

export const ParentDashboardView = () => {
    const { students, enrollments, pickupQueue, settings, studentProjects, projectTemplates, badges } = useAppContext();
    const { userProfile, signOut } = useAuth();

    const [notifyingPickup, setNotifyingPickup] = useState(false);
    const [selectedChildIndex, setSelectedChildIndex] = useState(0);
    const [expandedProject, setExpandedProject] = useState<string | null>(null);

    // Identify Children
    const myChildren = useMemo(() => {
        if (!userProfile?.email) return [];
        return students.filter(s =>
            s.email === userProfile.email ||
            s.loginInfo?.email === userProfile.email ||
            s.parentLoginInfo?.email === userProfile.email
        );
    }, [students, userProfile]);

    const activeChild = myChildren[selectedChildIndex];

    // Aggregate Financials
    const financialStatus = useMemo(() => {
        const childrenIds = myChildren.map(c => c.id);
        const myEnrollments = enrollments.filter(e => childrenIds.includes(e.studentId) && e.status === 'active');
        const totalDue = myEnrollments.reduce((sum, e) => sum + e.balance, 0);
        return { totalDue, myEnrollments };
    }, [myChildren, enrollments]);

    // Child Specific Data
    const childData = useMemo(() => {
        if (!activeChild) return null;

        const projects = studentProjects.filter(p => p.studentId === activeChild.id);
        const completedProjects = projects.filter(p => p.status === 'published');
        const submittedProjects = projects.filter(p => p.status === 'submitted');
        const activeProjects = projects.filter(p => p.status === 'building' || p.status === 'testing' || p.status === 'planning' || p.status === 'changes_requested');

        // Get assigned templates that haven't been started yet (future projects)
        const startedProjectTitles = projects.map(p => p.title);
        const futureProjects = projectTemplates
            .filter(template => !startedProjectTitles.includes(template.title))
            .map(template => ({
                id: `template-${template.id}`,
                title: template.title,
                description: template.description,
                station: template.station,
                status: 'planning' as const, // Using 'planning' for locked/future projects
                steps: (template.defaultSteps || []).map((step: any, idx: number) => ({
                    id: `step-${idx}`,
                    title: typeof step === 'string' ? step : (step.title || step),
                    status: 'todo' as const,
                    description: typeof step === 'string' ? '' : (step.description || '')
                })),
                skillsAcquired: template.skills || [],
                studentId: activeChild.id,
                studentName: activeChild.name,
                createdAt: new Date() as unknown as Timestamp,
                updatedAt: new Date() as unknown as Timestamp,
                mediaUrls: [],
                externalLink: '',
                embedUrl: '',
                instructorFeedback: '',
                isTemplate: true
            } as StudentProject));

        // Combine actual projects with future templates
        const allProjects = [...projects, ...futureProjects];

        // Calculate XP and Level
        const totalXP = completedProjects.length * 500 + submittedProjects.length * 250;
        const level = Math.floor(totalXP / 1000) + 1;
        const nextLevelXP = level * 1000;

        // Skills
        const skillsSet = new Set<string>();
        completedProjects.forEach(p => p.skillsAcquired?.forEach(s => skillsSet.add(s)));
        const earnedSkills = Array.from(skillsSet);

        return {
            projects: allProjects,
            completedProjects,
            submittedProjects,
            activeProjects,
            futureProjects,
            earnedSkills: Array.from(skillsSet),
            totalXP,
            level,
            nextLevelXP,
            badges: activeChild.badges || []
        };
    }, [activeChild, studentProjects, projectTemplates]);

    // Handlers
    const handlePickupNotify = async () => {
        if (!db || myChildren.length === 0) return;
        setNotifyingPickup(true);
        try {
            for (const child of myChildren) {
                const alreadyQueued = pickupQueue.some(q => q.studentId === child.id && q.status !== 'dismissed');
                if (!alreadyQueued) {
                    await addDoc(collection(db, 'pickup_queue'), {
                        studentId: child.id,
                        studentName: child.name,
                        parentName: userProfile?.name || 'Parent',
                        status: 'arrived',
                        createdAt: serverTimestamp()
                    });
                }
            }
            alert("We've notified the team! Please wait at the gate.");
        } catch (e) {
            console.error(e);
        } finally {
            setNotifyingPickup(false);
        }
    };

    const activePickup = pickupQueue.some(q => myChildren.map(c => c.id).includes(q.studentId) && q.status !== 'dismissed');

    const getProjectProgress = (project: StudentProject) => {
        if (!project.steps || project.steps.length === 0) return 0;
        const completedCount = project.steps.filter(t => t.status === 'done').length;
        return Math.floor((completedCount / project.steps.length) * 100);
    };

    const getProgressWidth = () => {
        if (!childData) return 0;
        return Math.min(100, (childData.totalXP / childData.nextLevelXP) * 100);
    };

    if (!activeChild) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl max-w-md">
                    <User size={64} className="text-slate-600 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Welcome Parent</h2>
                    <p className="text-slate-400 text-sm mb-6">We couldn't find any student profiles linked to <span className="text-blue-400 font-mono">{userProfile?.email}</span>.</p>
                    <button onClick={signOut} className="text-red-400 hover:text-red-300 text-sm font-bold flex items-center justify-center gap-2 w-full"><LogOut size={16} /> Sign Out</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30">

            {/* Hero Header */}
            <header className="sticky top-0 z-40 bg-gradient-to-r from-indigo-900 via-purple-900 to-pink-900 border-b border-slate-800/50 backdrop-blur-md">
                <div className="max-w-5xl mx-auto p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            {/* Level Badge */}
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-2xl font-black shadow-lg shadow-orange-900/50 border-4 border-slate-900">
                                    {childData?.level || 1}
                                </div>
                                <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-1.5 border-2 border-yellow-400">
                                    <Star size={14} className="text-yellow-400 fill-yellow-400" />
                                </div>
                            </div>
                            <div>
                                <h1 className="font-black text-2xl text-white drop-shadow-lg">{activeChild.name}</h1>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-cyan-300 font-mono font-bold">{childData?.totalXP || 0} XP</span>
                                    <span className="text-white/50">/</span>
                                    <span className="text-white/70">{childData?.nextLevelXP || 1000} XP</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={signOut} className="bg-slate-900/80 hover:bg-slate-800 p-3 rounded-full text-slate-300 hover:text-white transition-all border border-slate-700">
                            <LogOut size={20} />
                        </button>
                    </div>

                    {/* XP Progress Bar */}
                    <div className="mb-4">
                        <div className="h-4 w-full bg-slate-900/50 rounded-full overflow-hidden border border-slate-800/50 shadow-inner">
                            <div
                                className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 transition-all duration-1000 ease-out relative"
                                style={{ width: `${getProgressWidth()}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                            </div>
                        </div>
                        <div className="text-right text-xs text-white/50 mt-1 uppercase tracking-wider font-bold">Level {childData?.level || 1} Progress</div>
                    </div>

                    {/* Child Selector */}
                    {myChildren.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                            {myChildren.map((child, idx) => (
                                <button
                                    key={child.id}
                                    onClick={() => setSelectedChildIndex(idx)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all whitespace-nowrap ${selectedChildIndex === idx
                                        ? 'bg-white text-indigo-900 border-white shadow-lg'
                                        : 'bg-slate-900/50 border-slate-700 text-slate-300 hover:border-slate-600'
                                        }`}
                                >
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${selectedChildIndex === idx ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                                        }`}>
                                        {child.name.charAt(0)}
                                    </div>
                                    <span className="text-sm font-bold">{child.name.split(' ')[0]}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </header>

            <main className="max-w-5xl mx-auto p-6 md:p-8 space-y-10">

                {/* Stats Row with Creative Titles */}
                <div>
                    <h2 className="text-lg font-bold text-white/90 mb-4 flex items-center gap-2">
                        <Sparkles size={20} className="text-yellow-400" />
                        {activeChild.name.split(' ')[0]}'s Achievements ✨
                    </h2>
                    <div className="grid grid-cols-3 gap-4 md:gap-6">
                        <div className="bg-gradient-to-br from-emerald-900/50 to-emerald-950/50 border-2 border-emerald-500/40 rounded-3xl p-5 md:p-6 relative overflow-hidden hover:scale-105 transition-transform shadow-xl">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/20 rounded-full blur-3xl"></div>
                            <Trophy size={28} className="text-emerald-400 mb-3 relative z-10 drop-shadow-lg" />
                            <div className="text-4xl font-black text-white relative z-10 mb-1">{childData?.completedProjects.length || 0}</div>
                            <div className="text-xs text-emerald-200 font-bold relative z-10 leading-tight">Projects<br />Mastered</div>
                        </div>

                        <div className="bg-gradient-to-br from-cyan-900/50 to-cyan-950/50 border-2 border-cyan-500/40 rounded-3xl p-5 md:p-6 relative overflow-hidden hover:scale-105 transition-transform shadow-xl">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/20 rounded-full blur-3xl"></div>
                            <Zap size={28} className="text-cyan-400 mb-3 relative z-10 drop-shadow-lg" fill="currentColor" />
                            <div className="text-4xl font-black text-white relative z-10 mb-1">{childData?.earnedSkills.length || 0}</div>
                            <div className="text-xs text-cyan-200 font-bold relative z-10 leading-tight">New Skills<br />Unlocked</div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-900/50 to-purple-950/50 border-2 border-purple-500/40 rounded-3xl p-5 md:p-6 relative overflow-hidden hover:scale-105 transition-transform shadow-xl">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/20 rounded-full blur-3xl"></div>
                            <Rocket size={28} className="text-purple-400 mb-3 relative z-10 drop-shadow-lg" />
                            <div className="text-4xl font-black text-white relative z-10 mb-1">{childData?.activeProjects.length || 0}</div>
                            <div className="text-xs text-purple-200 font-bold relative z-10 leading-tight">Currently<br />Building</div>
                        </div>
                    </div>
                </div>

                {/* Badges Showcase */}
                {childData?.badges && childData.badges.length > 0 && (
                    <div>
                        <h2 className="text-lg font-bold text-white/90 mb-4 flex items-center gap-2">
                            <Award size={20} className="text-purple-400" />
                            Badges Collection 🏆
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {childData.badges.map(badgeId => {
                                const badge = badges.find(b => b.id === badgeId);
                                if (!badge) return null;
                                const Icon = (LucideIcons[badge.icon as keyof typeof LucideIcons] || LucideIcons.Award) as React.ElementType;
                                return (
                                    <div key={badgeId} className={`bg-gradient-to-br from-${badge.color}-900/40 to-${badge.color}-950/40 border border-${badge.color}-500/30 p-4 rounded-2xl flex flex-col items-center text-center gap-2 hover:scale-105 transition-transform`}>
                                        <div className={`w-12 h-12 rounded-full bg-${badge.color}-500/20 flex items-center justify-center text-${badge.color}-400 mb-1`}>
                                            <Icon size={24} />
                                        </div>
                                        <h4 className="font-bold text-white text-sm">{badge.name}</h4>
                                        <p className="text-xs text-slate-400 line-clamp-2">{badge.description}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Project Roadmap with Creative Title */}
                <div>
                    <div className="mb-6">
                        <h2 className="text-2xl font-black text-white mb-2 flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl">
                                <TrendingUp size={24} className="text-white" />
                            </div>
                            The Learning Adventure 🚀
                        </h2>
                        <p className="text-slate-400 text-sm">Follow {activeChild.name.split(' ')[0]}'s journey through exciting projects and new skills</p>
                    </div>

                    <div className="relative pl-8 md:pl-12 space-y-8">
                        {/* Connecting Line */}
                        <div className="absolute left-[47px] md:left-[63px] top-6 bottom-6 w-1 bg-slate-800 rounded-full">
                            <div
                                className="w-full bg-gradient-to-b from-cyan-500 to-purple-600 transition-all duration-1000"
                                style={{ height: `${childData?.projects && childData.projects.length > 0 ? (childData.completedProjects.length / childData.projects.length) * 100 : 0}%` }}
                            />
                        </div>

                        {childData?.projects && childData.projects.length > 0 ? (
                            childData.projects.map((project, index) => {
                                const theme = getTheme(project.station);
                                const progress = getProjectProgress(project);
                                const isActive = project.status === 'building' || project.status === 'testing' || project.status === 'planning' || project.status === 'changes_requested';
                                const isCompleted = project.status === 'published';
                                const isSubmitted = project.status === 'submitted';
                                const isExpanded = expandedProject === project.id;

                                return (
                                    <div key={project.id} className="relative group">
                                        {/* Node Icon */}
                                        <div
                                            className={`absolute left-0 w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center border-2 z-10 transition-all duration-300 bg-slate-900 ${isActive ? `border-${theme.colorHex} shadow-[0_0_20px_rgba(6,182,212,0.5)]` : ''
                                                } ${isCompleted ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]' : ''
                                                } ${isSubmitted ? 'border-purple-500 shadow-[0_0_20px_rgba(147,51,234,0.5)]' : ''
                                                }`}
                                        >
                                            {isCompleted ? (
                                                <CheckCircle2 size={28} className="text-emerald-500" />
                                            ) : isSubmitted ? (
                                                <Send size={24} className="text-purple-500" />
                                            ) : isActive ? (
                                                <theme.icon size={28} className="text-cyan-400 animate-pulse" />
                                            ) : (
                                                <Lock size={24} className="text-slate-600" />
                                            )}
                                        </div>

                                        {/* Project Card */}
                                        <div className="ml-24 md:ml-28">
                                            <button
                                                onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                                                className="w-full text-left"
                                            >
                                                <div className={`bg-slate-900/80 backdrop-blur-sm border-2 rounded-3xl overflow-hidden transition-all shadow-xl ${isActive ? 'border-cyan-500/40 shadow-cyan-900/20' :
                                                    isCompleted ? 'border-emerald-500/40 shadow-emerald-900/20' :
                                                        isSubmitted ? 'border-purple-500/40 shadow-purple-900/20' :
                                                            'border-slate-700/50 hover:border-slate-600'
                                                    }`}>
                                                    {/* Header */}
                                                    <div className="p-5 md:p-6 flex items-center justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className={`text-xs px-3 py-1.5 rounded-full border-2 font-bold shadow-lg ${isCompleted ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400/50' :
                                                                    isSubmitted ? 'bg-purple-500/30 text-purple-200 border-purple-400/50' :
                                                                        isActive ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400/50 animate-pulse' :
                                                                            'bg-slate-800/50 text-slate-400 border-slate-600'
                                                                    }`}>
                                                                    {isCompleted ? '🎉 Mastered!' : isSubmitted ? '⏳ Under Review' : isActive ? '🔥 Working On It' : '🔐 Coming Soon'}
                                                                </span>
                                                                <span className={`text-xs px-2.5 py-1 rounded-lg border font-bold ${theme.bgSoft} ${theme.text} ${theme.border}`}>
                                                                    {theme.label}
                                                                </span>
                                                            </div>
                                                            <h3 className="text-xl font-black text-white mb-1">{project.title}</h3>
                                                            {!isExpanded && project.description && (
                                                                <p className="text-sm text-slate-300 line-clamp-2 mt-2 leading-relaxed">{project.description}</p>
                                                            )}
                                                        </div>
                                                        <ChevronDown
                                                            size={22}
                                                            className={`text-slate-400 transition-transform ml-4 ${isExpanded ? 'rotate-180' : ''}`}
                                                        />
                                                    </div>

                                                    {/* Progress Bar */}
                                                    <div className="px-5 md:px-6 pb-5">
                                                        <div className="flex justify-between text-xs mb-2">
                                                            <span className="text-slate-400 font-bold">Journey Progress</span>
                                                            <span className={`font-black text-sm ${progress === 100 ? 'text-emerald-300' : 'text-cyan-300'}`}>{progress}%</span>
                                                        </div>
                                                        <div className="h-3 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50 shadow-inner">
                                                            <div
                                                                className={`h-full bg-gradient-to-r ${theme.gradient} transition-all duration-500 relative`}
                                                                style={{ width: `${progress}%` }}
                                                            >
                                                                <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>

                                            {/* Expanded Content */}
                                            {isExpanded && (
                                                <div className="mt-4 bg-slate-950/70 backdrop-blur-sm border-2 border-slate-800/50 rounded-2xl p-5 md:p-6 animate-in slide-in-from-top-2 fade-in duration-200 shadow-xl">
                                                    {/* Description */}
                                                    {project.description && (
                                                        <p className="text-sm text-slate-300 mb-6 leading-relaxed">{project.description}</p>
                                                    )}

                                                    {/* Engineering Process Steps */}
                                                    {project.steps && project.steps.length > 0 && (
                                                        <div>
                                                            <h4 className="text-sm text-slate-400 font-bold mb-4 flex items-center gap-2">
                                                                <ListChecks size={16} className="text-cyan-400" /> Building Steps
                                                            </h4>
                                                            <div className="space-y-2">
                                                                {project.steps.map((step, idx) => (
                                                                    <div key={step.id} className="flex items-center gap-3 text-sm">
                                                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 ${step.status === 'done'
                                                                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                                                                            : step.status === 'doing'
                                                                                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500 animate-pulse'
                                                                                : 'bg-slate-800 text-slate-600 border-slate-700'
                                                                            }`}>
                                                                            {step.status === 'done' ? (
                                                                                <CheckCircle2 size={16} />
                                                                            ) : step.status === 'doing' ? (
                                                                                <Play size={14} fill="currentColor" />
                                                                            ) : (
                                                                                <span className="text-xs font-bold">{idx + 1}</span>
                                                                            )}
                                                                        </div>
                                                                        <span className={`flex-1 ${step.status === 'done' ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                                                                            {step.title}
                                                                        </span>
                                                                        {step.status === 'done' && (
                                                                            <span className="text-xs text-emerald-500 font-bold">✓ DONE</span>
                                                                        )}
                                                                        {step.status === 'doing' && (
                                                                            <span className="text-xs text-cyan-400 font-bold animate-pulse">IN PROGRESS</span>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Instructor Feedback */}
                                                    {project.instructorFeedback && (
                                                        <div className="mt-5 bg-gradient-to-br from-amber-950/30 to-orange-950/30 border-2 border-amber-900/40 rounded-xl p-4 shadow-lg">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Star size={14} className="text-amber-400" fill="currentColor" />
                                                                <p className="text-sm text-amber-300 font-bold">Teacher's Note</p>
                                                            </div>
                                                            <p className="text-sm text-amber-50 italic leading-relaxed">"{project.instructorFeedback}"</p>
                                                        </div>
                                                    )}

                                                    {/* Skills */}
                                                    {project.skillsAcquired && project.skillsAcquired.length > 0 && (
                                                        <div className="mt-5">
                                                            <p className="text-sm text-slate-400 font-bold mb-3 flex items-center gap-2"><Sparkles size={14} className="text-yellow-400" /> Skills Unlocked</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {project.skillsAcquired.map(skill => (
                                                                    <span key={skill} className="text-xs bg-gradient-to-r from-slate-800 to-slate-700 text-slate-200 px-4 py-2 rounded-full border-2 border-slate-600 font-bold shadow-lg hover:scale-105 transition-transform">
                                                                        {skill}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-12 text-slate-500">
                                <Brain size={48} className="mx-auto mb-4 text-slate-700" />
                                <p>No projects started yet</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-5">
                    <h2 className="text-lg font-bold text-white/90 flex items-center gap-2">
                        <Zap size={20} className="text-yellow-400" fill="currentColor" />
                        Quick Actions
                    </h2>

                    <button
                        onClick={handlePickupNotify}
                        disabled={notifyingPickup || activePickup}
                        className={`w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all shadow-2xl ${activePickup
                            ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-emerald-900/30'
                            : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 shadow-indigo-900/30 active:scale-[0.98]'
                            }`}
                    >
                        {activePickup ? (
                            <>
                                <CheckCircle2 size={26} className="animate-bounce" />
                                <span>On Our Way! 🎉</span>
                            </>
                        ) : (
                            <>
                                <Car size={26} />
                                <span>I'm Here for Pickup 🚗</span>
                            </>
                        )}
                    </button>

                    {financialStatus.totalDue > 0 && (
                        <div className="bg-gradient-to-r from-red-900/50 to-orange-900/50 border-2 border-red-500/40 rounded-2xl p-5 md:p-6 flex justify-between items-center shadow-xl">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-red-900/30 rounded-xl text-red-400 shadow-lg">
                                    <AlertCircle size={28} />
                                </div>
                                <div>
                                    <div className="text-xs text-red-300 font-bold mb-1">Payment Reminder</div>
                                    <div className="text-3xl font-black text-white">{formatCurrency(financialStatus.totalDue)}</div>
                                </div>
                            </div>
                            <div className="text-sm text-red-200 font-medium">Please visit the desk</div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center text-slate-500 text-xs pb-8 pt-4 space-y-2 border-t border-slate-800/50">
                    <p className="font-bold text-slate-400">{settings.academyName}</p>
                    <p>Questions? Contact us: {settings.receiptContact}</p>
                </div>
            </main>
        </div>
    );
};