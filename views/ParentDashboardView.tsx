import React, { useState, useMemo } from 'react';
import { User, Calendar, CreditCard, Car, Bell, Phone, Clock, MapPin, CheckCircle2, ChevronRight, LogOut, Wallet, AlertCircle, Trophy, Star, Target, TrendingUp, Zap, BookOpen, Brain, Rocket, ChevronDown, Award, Code, Sparkles, ListChecks, Lock, Unlock, ClipboardList, Play, Send, Maximize2, ImageIcon, Link as LinkIcon, Quote, Filter } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { addDoc, collection, serverTimestamp, Timestamp, updateDoc, doc, Firestore } from 'firebase/firestore';
import { db } from '../services/firebase';
import { formatCurrency, formatDate } from '../utils/helpers';
import { StudentProject, Payment, Enrollment } from '../types';
import { getTheme } from '../utils/theme';

export const ParentDashboardView = () => {
    const { students, enrollments, payments, pickupQueue, settings, studentProjects, projectTemplates, badges } = useAppContext();
    const { userProfile, signOut } = useAuth();

    const [notifyingPickup, setNotifyingPickup] = useState(false);
    const [selectedChildIndex, setSelectedChildIndex] = useState(0);
    const [expandedProject, setExpandedProject] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'submitted'>('all');
    const [filterStation, setFilterStation] = useState<string>('all');
    const [activeTab, setActiveTab] = useState<'overview' | 'finance' | 'profile' | 'pickup'>('overview');

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
                updatedAt: new Date(0) as unknown as Timestamp, // Older date for future templates
                mediaUrls: template.thumbnailUrl ? [template.thumbnailUrl] : [],
                externalLink: '',
                embedUrl: '',
                instructorFeedback: '',
                isTemplate: true
            } as StudentProject));

        // Combine actual projects with future templates and SORT by Date (Newest First)
        const allProjects = [...projects, ...futureProjects].sort((a, b) => {
            const dateA = a.updatedAt ? (a.updatedAt instanceof Timestamp ? a.updatedAt.toDate() : new Date(a.updatedAt)) : new Date(0);
            const dateB = b.updatedAt ? (b.updatedAt instanceof Timestamp ? b.updatedAt.toDate() : new Date(b.updatedAt)) : new Date(0);
            return dateB.getTime() - dateA.getTime();
        });

        // Calculate XP and Level
        const totalXP = completedProjects.length * 500 + submittedProjects.length * 250;
        const level = Math.floor(totalXP / 1000) + 1;
        const nextLevelXP = level * 1000;

        // Skills
        const skillsSet = new Set<string>();
        completedProjects.forEach(p => p.skillsAcquired?.forEach(s => skillsSet.add(s)));
        const earnedSkills = Array.from(skillsSet);

        // Filter Logic
        let filtered = allProjects;

        if (filterStatus !== 'all') {
            if (filterStatus === 'active') {
                filtered = filtered.filter(p => ['building', 'testing', 'planning', 'changes_requested'].includes(p.status));
            } else if (filterStatus === 'completed') {
                filtered = filtered.filter(p => p.status === 'published');
            } else if (filterStatus === 'submitted') {
                filtered = filtered.filter(p => p.status === 'submitted');
            }
        }

        if (filterStation !== 'all') {
            filtered = filtered.filter(p => p.station === filterStation);
        }

        // derived stations list for filter dropdown
        const availableStations = Array.from(new Set(allProjects.map(p => p.station)));

        return {
            projects: allProjects,
            filteredProjects: filtered, // Expose filtered projects
            completedProjects,
            submittedProjects,
            activeProjects,
            futureProjects,
            earnedSkills: Array.from(skillsSet),
            totalXP,
            level,
            nextLevelXP,
            badges: activeChild.badges || [],
            availableStations
        };
    }, [activeChild, studentProjects, projectTemplates, filterStatus, filterStation]);

    // Handlers
    const [selectedPicker, setSelectedPicker] = useState<string>('');

    // Active Pickup Logic
    const activePickupEntry = useMemo(() => {
        // Find any active entry - prioritize non-released if multiple exist just in case, but usually we handle all
        return pickupQueue.find(q => myChildren.map(c => c.id).includes(q.studentId) && ['on_the_way', 'arrived', 'released'].includes(q.status));
    }, [pickupQueue, myChildren]);

    const completedPickupToday = useMemo(() => {
        return pickupQueue.find(q =>
            activeChild &&
            q.studentId === activeChild.id &&
            q.status === 'confirmed' &&
            q.confirmedAt &&
            new Date((q.confirmedAt as any).seconds * 1000).toDateString() === new Date().toDateString()
        );
    }, [pickupQueue, activeChild]);

    // Handlers
    const handlePickupAction = async (action: 'notify' | 'arrive' | 'confirm') => {
        if (!db || myChildren.length === 0) return;
        setNotifyingPickup(true);

        try {
            if (action === 'notify') {
                // "On my way"
                const picker = selectedPicker || userProfile?.name || 'Parent';
                for (const child of myChildren) {
                    // Check if already active to prevent duplicates
                    const existing = pickupQueue.find(q => q.studentId === child.id && ['on_the_way', 'arrived', 'released'].includes(q.status));
                    if (existing) continue;

                    await addDoc(collection(db, 'pickup_queue'), {
                        studentId: child.id,
                        studentName: child.name,
                        parentName: userProfile?.name || 'Parent',
                        pickerName: picker,
                        status: 'on_the_way',
                        notifiedAt: serverTimestamp(),
                        createdAt: serverTimestamp()
                    });
                }
            } else if (action === 'arrive') {
                // "I'm Here"
                if (activePickupEntry) {
                    const allActive = pickupQueue.filter(q => q.studentId === activePickupEntry.studentId && ['on_the_way', 'arrived', 'released'].includes(q.status));
                    for (const entry of allActive) {
                        await updateDoc(doc(db, 'pickup_queue', entry.id), {
                            status: 'arrived',
                            arrivedAt: serverTimestamp()
                        });
                    }
                }
            } else if (action === 'confirm') {
                // "Confirm Receipt"
                if (activePickupEntry) {
                    const allActive = pickupQueue.filter(q => q.studentId === activePickupEntry.studentId && ['on_the_way', 'arrived', 'released'].includes(q.status));
                    for (const entry of allActive) {
                        await updateDoc(doc(db, 'pickup_queue', entry.id), {
                            status: 'confirmed',
                            confirmedAt: serverTimestamp()
                        });
                    }
                }
            }
        } catch (e) {
            console.error(e);
            alert("Connection error. Please try again.");
        } finally {
            setNotifyingPickup(false);
        }
    };

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
            <header className="sticky top-0 z-40 bg-gradient-to-r from-indigo-900/95 via-purple-900/95 to-pink-900/95 border-b border-slate-800/50 backdrop-blur-xl transition-all shadow-lg">
                <div className="max-w-5xl mx-auto p-4 md:p-6">
                    <div className="flex flex-row items-center justify-between mb-0 md:mb-6 gap-4">
                        <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                            {/* Level Badge - Compact on Mobile */}
                            <div className="relative shrink-0 transition-transform scale-75 md:scale-100 origin-left">
                                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-lg md:text-2xl font-black shadow-lg shadow-orange-900/50 border-2 md:border-4 border-slate-900">
                                    {childData?.level || 1}
                                </div>
                                <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-1 md:p-1.5 border-2 border-yellow-400">
                                    <Star size={10} className="md:w-[14px] md:h-[14px] text-yellow-400 fill-yellow-400" />
                                </div>
                            </div>

                            <div className="min-w-0">
                                <h1 className="font-black text-lg md:text-2xl text-white drop-shadow-lg truncate">{activeChild.name}</h1>

                                {/* Mobile XP Bar Inline */}
                                <div className="md:hidden flex items-center gap-2 mt-1">
                                    <div className="h-1.5 w-24 bg-slate-900/50 rounded-full overflow-hidden border border-slate-800/50">
                                        <div className="h-full bg-gradient-to-r from-cyan-400 to-purple-400" style={{ width: `${getProgressWidth()}%` }}></div>
                                    </div>
                                    <span className="text-[10px] text-cyan-300 font-bold">{childData?.totalXP} XP</span>
                                </div>

                                {/* Desktop XP Text */}
                                <div className="hidden md:flex items-center gap-2 text-sm">
                                    <span className="text-cyan-300 font-mono font-bold">{childData?.totalXP || 0} XP</span>
                                    <span className="text-white/50">/</span>
                                    <span className="text-white/70">{childData?.nextLevelXP || 1000} XP</span>
                                </div>
                            </div>
                        </div>

                        <button onClick={signOut} className="bg-slate-900/50 hover:bg-slate-800 p-2 md:p-3 rounded-full text-slate-300 hover:text-white transition-all border border-slate-700/50 shrink-0">
                            <LogOut size={18} className="md:w-5 md:h-5" />
                        </button>
                    </div>

                    {/* Desktop XP Progress Bar */}
                    <div className="hidden md:block mb-4">
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
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-4">
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

                    {/* Navigation Tabs (Desktop) */}
                    <div className="hidden md:flex gap-2 overflow-x-auto no-scrollbar">
                        {[
                            { id: 'overview', label: 'Overview', icon: LucideIcons.LayoutDashboard },
                            { id: 'finance', label: 'Billing', icon: LucideIcons.CreditCard },
                            { id: 'profile', label: 'Settings', icon: LucideIcons.Settings },
                            { id: 'pickup', label: 'Pickup', icon: LucideIcons.Car },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id
                                    ? 'bg-white/10 text-white shadow-inner'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Bottom Navigation (Mobile) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 z-50 flex justify-around items-center px-2 safe-area-pb">
                {[
                    { id: 'overview', label: 'Home', icon: LucideIcons.LayoutDashboard },
                    { id: 'finance', label: 'Billing', icon: LucideIcons.CreditCard },
                    { id: 'pickup', label: 'Pickup', icon: LucideIcons.Car },
                    { id: 'profile', label: 'Profile', icon: LucideIcons.User },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all ${activeTab === tab.id
                            ? 'text-indigo-400'
                            : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <tab.icon size={20} className={activeTab === tab.id ? 'fill-current opacity-20' : ''} />
                        <span className="text-[10px] font-bold">{tab.label}</span>
                        {activeTab === tab.id && <div className="absolute top-0 w-8 h-1 bg-indigo-500 rounded-b-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />}
                    </button>
                ))}
            </div>

            <main className="max-w-5xl mx-auto p-4 pb-24 md:p-8">
                {/* Global Pickup Status Banner (if not on pickup tab) */}
                {activeTab !== 'pickup' && activePickupEntry && (
                    <button
                        onClick={() => setActiveTab('pickup')}
                        className="w-full mb-6 relative overflow-hidden group"
                    >
                        <div className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all shadow-lg text-left ${activePickupEntry.status === 'released'
                            ? 'bg-indigo-600 border-indigo-400 text-white shadow-indigo-900/50 animate-pulse'
                            : activePickupEntry.status === 'arrived'
                                ? 'bg-emerald-600 border-emerald-400 text-white shadow-emerald-900/50'
                                : 'bg-slate-900 border-slate-700 text-slate-300'
                            }`}>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${activePickupEntry.status === 'released' ? 'bg-white text-indigo-600' :
                                activePickupEntry.status === 'arrived' ? 'bg-white text-emerald-600' : 'bg-slate-800'
                                }`}>
                                {activePickupEntry.status === 'released' ? <Star size={24} fill="currentColor" /> : <Car size={24} />}
                            </div>
                            <div>
                                <h4 className="font-bold text-lg leading-tight">
                                    {activePickupEntry.status === 'released' ? `${activeChild.name.split(' ')[0]} is Released! 🎉` :
                                        activePickupEntry.status === 'arrived' ? "Check-in Confirmed ✅" :
                                            "Pickup in Progress 🚗"}
                                </h4>
                                <p className="text-xs opacity-80">
                                    {activePickupEntry.status === 'released' ? "Go to Pickup tab to confirm receipt" :
                                        activePickupEntry.status === 'arrived' ? "Waiting for student release..." :
                                            `Driver: ${activePickupEntry.pickerName}`}
                                </p>
                            </div>
                            <ChevronRight className="ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </button>
                )}

                {activeTab === 'overview' && (
                    <div className="space-y-10">

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

                        {/* Project Roadmap with Creative Title & Filters */}
                        <div>
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                                <div>
                                    <h2 className="text-2xl font-black text-white mb-2 flex items-center gap-3">
                                        <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl">
                                            <TrendingUp size={24} className="text-white" />
                                        </div>
                                        The Learning Adventure 🚀
                                    </h2>
                                    <p className="text-slate-400 text-sm">Follow {activeChild.name.split(' ')[0]}'s journey through exciting projects and new skills</p>
                                </div>

                                {/* Filter Controls */}
                                <div className="flex flex-wrap gap-2">
                                    {/* Station Filter */}
                                    <div className="relative group/filter">
                                        <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:border-slate-500 transition-all">
                                            <Filter size={14} />
                                            {filterStation === 'all' ? 'All Stations' : getTheme(filterStation as any).label}
                                            <ChevronDown size={14} />
                                        </button>
                                        <div className="absolute top-full right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-20 hidden group-hover/filter:block animate-in fade-in zoom-in-95 duration-200">
                                            <button
                                                onClick={() => setFilterStation('all')}
                                                className={`w-full text-left px-4 py-3 text-xs font-bold hover:bg-slate-800 transition-colors ${filterStation === 'all' ? 'text-indigo-400 bg-slate-800/50' : 'text-slate-400'}`}
                                            >
                                                All Stations
                                            </button>
                                            {childData?.availableStations.map(station => {
                                                const theme = getTheme(station);
                                                return (
                                                    <button
                                                        key={station}
                                                        onClick={() => setFilterStation(station)}
                                                        className={`w-full text-left px-4 py-3 text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-2 ${filterStation === station ? 'text-white bg-slate-800/50' : 'text-slate-400'}`}
                                                    >
                                                        <div className={`w-2 h-2 rounded-full ${theme.bgSoft.replace('bg-', 'bg-').replace('/10', '/50')}`} />
                                                        {theme.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Status Tabs */}
                                    <div className="p-1 bg-slate-900 rounded-xl border border-slate-800 flex items-center">
                                        {[
                                            { id: 'all', label: 'All' },
                                            { id: 'active', label: 'In Progress' },
                                            { id: 'submitted', label: 'Under Review' },
                                            { id: 'completed', label: 'Done' }
                                        ].map(tab => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setFilterStatus(tab.id as any)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === tab.id
                                                    ? 'bg-slate-800 text-white shadow-sm'
                                                    : 'text-slate-400 hover:text-slate-300'
                                                    }`}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="relative pl-8 md:pl-12 space-y-8">
                                {/* Connecting Line */}
                                <div className="absolute left-[47px] md:left-[63px] top-6 bottom-6 w-1 bg-slate-800 rounded-full">
                                    <div
                                        className="w-full bg-gradient-to-b from-cyan-500 to-purple-600 transition-all duration-1000"
                                        style={{ height: `${childData?.projects && childData.projects.length > 0 ? (childData.completedProjects.length / childData.projects.length) * 100 : 0}%` }}
                                    />
                                </div>

                                {childData?.filteredProjects && childData.filteredProjects.length > 0 ? (
                                    childData.filteredProjects.map((project, index) => {
                                        const theme = getTheme(project.station);
                                        const progress = getProjectProgress(project);
                                        const isActive = project.status === 'building' || project.status === 'testing' || project.status === 'planning' || project.status === 'changes_requested';
                                        const isCompleted = project.status === 'published';
                                        const isSubmitted = project.status === 'submitted';
                                        const isExpanded = expandedProject === project.id;
                                        const hasPresentation = !!project.presentationUrl;

                                        return (
                                            <div key={project.id} className="relative group">
                                                {/* Node Icon - Desktop Absolute, Mobile Floating/Inline */}
                                                <div
                                                    className={`hidden md:flex absolute left-0 w-16 h-16 shrink-0 rounded-2xl items-center justify-center border-2 z-10 transition-all duration-300 bg-slate-900 ${isActive ? `border-${theme.colorHex} shadow-[0_0_20px_rgba(6,182,212,0.5)]` : ''
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
                                                <div className="ml-0 md:ml-28">
                                                    <button
                                                        onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                                                        className="w-full text-left"
                                                    >
                                                        <div className={`bg-slate-900/80 backdrop-blur-sm border-2 rounded-3xl overflow-hidden transition-all shadow-xl hover:scale-[1.02] ${isActive ? 'border-cyan-500/40 shadow-cyan-900/20' :
                                                            isCompleted ? 'border-emerald-500/40 shadow-emerald-900/20' :
                                                                isSubmitted ? 'border-purple-500/40 shadow-purple-900/20' :
                                                                    'border-slate-700/50 hover:border-slate-600'
                                                            }`}>

                                                            {/* Card Content Wrapper */}
                                                            <div className="flex flex-col md:flex-row">
                                                                {/* Thumbnail (if available) - New Addition */}
                                                                {project.mediaUrls?.[0] && (
                                                                    <div className="h-48 md:h-auto md:w-1/3 bg-slate-950 relative overflow-hidden group-hover:brightness-110 transition-all">
                                                                        <img src={project.mediaUrls[0]} className="w-full h-full object-cover" alt="Project Thumbnail" />
                                                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60"></div>
                                                                        <div className="absolute bottom-2 left-2 flex gap-1">
                                                                            {hasPresentation && <div className="p-1 bg-red-600 rounded-md"><Play size={12} className="text-white" fill="currentColor" /></div>}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                <div className="flex-1 p-5 md:p-6 flex flex-col">
                                                                    <div className="flex items-center justify-between mb-4">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className={`text-xs px-2.5 py-1 rounded-lg border font-bold ${theme.bgSoft} ${theme.text} ${theme.border}`}>
                                                                                {theme.label}
                                                                            </span>
                                                                            <span className={`text-xs px-3 py-1.5 rounded-full border-2 font-bold shadow-lg ${isCompleted ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400/50' :
                                                                                isSubmitted ? 'bg-purple-500/30 text-purple-200 border-purple-400/50' :
                                                                                    isActive ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400/50 animate-pulse' :
                                                                                        'bg-slate-800/50 text-slate-400 border-slate-600'
                                                                                }`}>
                                                                                {isCompleted ? '🎉 Mastered!' : isSubmitted ? '⏳ Under Review' : isActive ? '🔥 Working On It' : '🔐 Coming Soon'}
                                                                            </span>
                                                                        </div>
                                                                        <ChevronDown
                                                                            size={22}
                                                                            className={`text-slate-400 transition-transform ml-4 ${isExpanded ? 'rotate-180' : ''}`}
                                                                        />
                                                                    </div>

                                                                    <h3 className="text-xl font-black text-white mb-2 leading-tight">{project.title}</h3>

                                                                    {!isExpanded && project.description && (
                                                                        <p className="text-sm text-slate-300 line-clamp-2 mb-4 leading-relaxed">{project.description}</p>
                                                                    )}

                                                                    <div className="mt-auto">
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
                                                            </div>
                                                        </div>
                                                    </button>

                                                    {/* Expanded Content */}
                                                    {isExpanded && (
                                                        <div className="mt-4 bg-slate-950/70 backdrop-blur-sm border-2 border-slate-800/50 rounded-2xl p-5 md:p-6 animate-in slide-in-from-top-2 fade-in duration-200 shadow-xl">
                                                            {/* Actions Toolbar */}
                                                            <div className="flex flex-wrap gap-2 mb-6 pb-6 border-b border-slate-800">
                                                                {hasPresentation && (
                                                                    <button
                                                                        onClick={() => window.open(project.presentationUrl, '_blank')}
                                                                        className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-rose-900/50"
                                                                    >
                                                                        <Play size={18} fill="currentColor" /> Watch Presentation
                                                                    </button>
                                                                )}
                                                                {project.mediaUrls?.[0] && !hasPresentation && (
                                                                    <button
                                                                        onClick={() => project.mediaUrls && window.open(project.mediaUrls[0], '_blank')}
                                                                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-indigo-900/50"
                                                                    >
                                                                        <ImageIcon size={18} /> View Project Image
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {/* Description */}
                                                            {project.description && (
                                                                <div className="mb-8">
                                                                    <h4 className="text-sm text-slate-400 font-bold mb-2">PROJECT BRIEF</h4>
                                                                    <p className="text-sm text-slate-200 leading-relaxed max-w-2xl">{project.description}</p>
                                                                </div>
                                                            )}

                                                            {/* Engineering Process Steps with PROOF */}
                                                            {project.steps && project.steps.length > 0 && (
                                                                <div>
                                                                    <h4 className="text-sm text-slate-400 font-bold mb-4 flex items-center gap-2">
                                                                        <ListChecks size={16} className="text-cyan-400" /> MISSION LOG
                                                                    </h4>
                                                                    <div className="space-y-4">
                                                                        {project.steps.map((step, idx) => (
                                                                            <div key={step.id} className={`p-4 rounded-xl border-2 transition-all ${step.status === 'done' ? 'bg-slate-900/80 border-slate-800' : 'bg-transparent border-transparent'}`}>
                                                                                <div className="flex items-center gap-3 text-sm">
                                                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 ${step.status === 'done'
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
                                                                                    <div className="flex-1">
                                                                                        <span className={`block font-bold ${step.status === 'done' ? 'text-slate-200' : 'text-slate-400'}`}>
                                                                                            {step.title}
                                                                                        </span>
                                                                                        {step.status === 'done' && <span className="text-xs text-emerald-500 font-bold">✓ COMPLETED</span>}
                                                                                        {step.status === 'doing' && <span className="text-xs text-cyan-400 font-bold animate-pulse">IN PROGRESS</span>}
                                                                                    </div>
                                                                                </div>

                                                                                {/* PROOF OF WORK DISPLAY */}
                                                                                {step.status === 'done' && step.proofUrl && (
                                                                                    <div className="mt-3 ml-11">
                                                                                        <div className="bg-slate-950 rounded-lg p-2 border border-slate-800 inline-block overflow-hidden relative group/proof">
                                                                                            {step.proofUrl.startsWith('data:image') || step.proofUrl.startsWith('http') ? (
                                                                                                <>
                                                                                                    <img src={step.proofUrl} className="h-24 md:h-32 rounded-md object-cover cursor-pointer transition-transform hover:scale-105" onClick={() => window.open(step.proofUrl, '_blank')} alt="Proof of work" />
                                                                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/proof:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                                                                        <Maximize2 size={16} className="text-white" />
                                                                                                    </div>
                                                                                                </>
                                                                                            ) : (
                                                                                                <a href={step.proofUrl} target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline flex items-center gap-1">
                                                                                                    <LinkIcon size={12} /> View Attached Proof
                                                                                                </a>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Instructor Feedback */}
                                                            {project.instructorFeedback && (
                                                                <div className="mt-6 bg-gradient-to-br from-amber-950/30 to-orange-950/30 border-2 border-amber-900/40 rounded-xl p-5 shadow-lg relative overflow-hidden">
                                                                    <div className="absolute top-0 right-0 p-4 opacity-10"><Quote size={64} className="text-amber-500" /></div>
                                                                    <div className="flex items-center gap-2 mb-3">
                                                                        <div className="p-1.5 bg-amber-500/20 rounded-lg text-amber-400">
                                                                            <Star size={16} fill="currentColor" />
                                                                        </div>
                                                                        <p className="text-sm text-amber-300 font-bold uppercase tracking-wider">Teacher's Note</p>
                                                                    </div>
                                                                    <p className="text-md text-amber-50 italic leading-relaxed font-medium pl-2 border-l-4 border-amber-500/50">"{project.instructorFeedback}"</p>
                                                                </div>
                                                            )}

                                                            {/* Skills */}
                                                            {project.skillsAcquired && project.skillsAcquired.length > 0 && (
                                                                <div className="mt-6 pt-6 border-t border-slate-800">
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
                                        <p>No projects match your current filters.</p>
                                        {(filterStatus !== 'all' || filterStation !== 'all') && (
                                            <button
                                                onClick={() => { setFilterStatus('all'); setFilterStation('all'); }}
                                                className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-lg transition-colors"
                                            >
                                                Clear Filters
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                )}

                {activeTab === 'finance' && (
                    <div className="space-y-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <LucideIcons.CreditCard className="text-emerald-400" />
                                Financial Overview
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-6 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700">
                                    <div className="text-sm text-slate-400 font-bold uppercase mb-2">Total Due</div>
                                    <div className="text-3xl font-black text-white">{formatCurrency(financialStatus.totalDue)}</div>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-white mt-8 mb-4">Enrollments & Payments</h3>
                            <div className="space-y-4">
                                {financialStatus.myEnrollments.map(enrollment => {
                                    const EnrPayments = payments.filter(p => p.enrollmentId === enrollment.id);
                                    return (
                                        <div key={enrollment.id} className="border border-slate-800 rounded-xl p-4 bg-slate-950/50">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <div className="font-bold text-white">{enrollment.programName}</div>
                                                    <div className="text-xs text-slate-400">{enrollment.packName}</div>
                                                </div>
                                                <div className={`px-2 py-1 rounded text-xs font-bold ${enrollment.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                                                    {enrollment.status.toUpperCase()}
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-400">Total Program Cost</span>
                                                    <span className="text-white font-mono">{formatCurrency(enrollment.totalAmount)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-400">Paid So Far</span>
                                                    <span className="text-emerald-400 font-mono">{formatCurrency(enrollment.paidAmount)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm pt-2 border-t border-slate-800">
                                                    <span className="text-slate-300 font-bold">Remaining Balance</span>
                                                    <span className="text-red-400 font-mono font-bold">{formatCurrency(enrollment.balance)}</span>
                                                </div>
                                            </div>

                                            {/* Payment History */}
                                            {EnrPayments.length > 0 && (
                                                <div className="mt-4 pt-4 border-t border-slate-800/50">
                                                    <div className="text-xs font-bold text-slate-500 mb-2 uppercase">Payment History</div>
                                                    {EnrPayments.map(p => (
                                                        <div key={p.id} className="flex justify-between items-center text-xs py-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-slate-300">{formatDate(p.date)}</span>
                                                                <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-500">{p.method}</span>
                                                            </div>
                                                            <span className="text-emerald-400 font-mono">+{formatCurrency(p.amount)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div className="space-y-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <LucideIcons.User className="text-blue-400" />
                                Student Profile & Settings
                            </h2>

                            <div className="grid gap-6">
                                {/* Parent Info */}
                                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
                                    <h3 className="font-bold text-white mb-4 flex items-center gap-2"><LucideIcons.Phone size={16} /> Contact Info</h3>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Parent Name</label>
                                            <input
                                                type="text"
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none"
                                                defaultValue={activeChild.parentName}
                                                onBlur={async (e) => {
                                                    if (!db) return;
                                                    await updateDoc(doc(db as Firestore, 'students', activeChild.id), { parentName: e.target.value });
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Parent Phone</label>
                                            <input
                                                type="text"
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none"
                                                defaultValue={activeChild.parentPhone}
                                                onBlur={async (e) => {
                                                    if (!db) return;
                                                    await updateDoc(doc(db as Firestore, 'students', activeChild.id), { parentPhone: e.target.value });
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Medical Info */}
                                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
                                    <h3 className="font-bold text-white mb-4 flex items-center gap-2"><LucideIcons.HeartPulse size={16} className="text-rose-400" /> Medical & Important Notes</h3>
                                    <textarea
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none min-h-[100px]"
                                        placeholder="Allergies, medical conditions, or other important notes..."
                                        defaultValue={activeChild.medicalInfo}
                                        onBlur={async (e) => {
                                            if (!db) return;
                                            await updateDoc(doc(db as Firestore, 'students', activeChild.id), { medicalInfo: e.target.value });
                                        }}
                                    />
                                </div>

                                {/* Pickup List */}
                                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
                                    <h3 className="font-bold text-white mb-4 flex items-center gap-2"><LucideIcons.Car size={16} className="text-amber-400" /> Authorized Pickups</h3>
                                    <p className="text-xs text-slate-400 mb-4">List the names of people authorized to pick up {activeChild.name.split(' ')[0]}.</p>

                                    <div className="space-y-2 mb-4">
                                        {(activeChild.authorizedPickups || []).map((name, idx) => (
                                            <div key={idx} className="flex justify-between items-center bg-slate-900 px-3 py-2 rounded-lg border border-slate-700">
                                                <span className="text-sm text-slate-300">{name}</span>
                                                <button
                                                    onClick={async () => {
                                                        const newPickups = activeChild.authorizedPickups?.filter((_, i) => i !== idx) || [];
                                                        if (!db) return;
                                                        await updateDoc(doc(db as Firestore, 'students', activeChild.id), { authorizedPickups: newPickups });
                                                    }}
                                                    className="text-red-400 hover:text-red-300"
                                                >
                                                    <LucideIcons.X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                        {(!activeChild.authorizedPickups || activeChild.authorizedPickups.length === 0) && (
                                            <div className="text-xs text-slate-500 italic">No additional authorized pickups listed.</div>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        <input
                                            id="newPickupParams"
                                            type="text"
                                            placeholder="Add Name (e.g. Uncle John)"
                                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none"
                                            onKeyDown={async (e) => {
                                                if (e.key === 'Enter') {
                                                    const input = e.currentTarget;
                                                    if (!input.value.trim()) return;
                                                    const newPickups = [...(activeChild.authorizedPickups || []), input.value.trim()];
                                                    if (!db) return;
                                                    await updateDoc(doc(db as Firestore, 'students', activeChild.id), { authorizedPickups: newPickups });
                                                    input.value = '';
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={async () => {
                                                const input = document.getElementById('newPickupParams') as HTMLInputElement;
                                                if (!input?.value.trim()) return;
                                                const newPickups = [...(activeChild.authorizedPickups || []), input.value.trim()];
                                                if (!db) return;
                                                await updateDoc(doc(db as Firestore, 'students', activeChild.id), { authorizedPickups: newPickups });
                                                input.value = '';
                                            }}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'pickup' && (
                    <div className="space-y-6">
                        {/* Status Checker */}
                        {!activePickupEntry ? (
                            completedPickupToday ? (
                                // STEP 3: COMPLETED STATE
                                <div className="space-y-6 animate-in zoom-in-95 duration-300">
                                    <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-indigo-500/30 p-8 rounded-2xl text-center">
                                        <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-900/50">
                                            <CheckCircle2 size={48} className="text-white" />
                                        </div>
                                        <h3 className="text-2xl font-black text-white mb-2">Pickup Completed! 🌟</h3>
                                        <p className="text-slate-300 text-sm mb-6">
                                            {completedPickupToday.pickerName || 'You'} successfully picked up {activeChild.name.split(' ')[0]} at {new Date((completedPickupToday.confirmedAt as any).seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
                                        </p>
                                        <div className="p-4 bg-slate-900/50 rounded-xl text-xs text-slate-400 italic">
                                            Have a wonderful evening! See you next time. 👋
                                        </div>
                                    </div>

                                    {/* Override Button (e.g. if they need to pick up again or error) */}
                                    {/* Hidden behind a safe guard or just smaller transparency? */}
                                </div>
                            ) : (
                                // STEP 1: PRE-PICKUP (Selection)
                                <div className="space-y-6 animate-in slide-in-from-bottom-4">
                                    <div>
                                        <label className="block text-slate-400 text-sm font-bold mb-3 uppercase">Who is picking up today?</label>
                                        <div className="grid gap-3">
                                            <button
                                                onClick={() => setSelectedPicker(userProfile?.name || 'Me')}
                                                className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${selectedPicker === (userProfile?.name || 'Me') || !selectedPicker
                                                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                                            >
                                                <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                                                    {(userProfile?.name || 'Me').charAt(0)}
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-bold">Me ({userProfile?.name || 'Parent'})</div>
                                                    <div className="text-xs opacity-70">Primary Parent</div>
                                                </div>
                                                {(!selectedPicker || selectedPicker === (userProfile?.name || 'Me')) && <CheckCircle2 className="ml-auto text-indigo-400" />}
                                            </button>

                                            {activeChild.authorizedPickups?.map(name => (
                                                <button
                                                    key={name}
                                                    onClick={() => setSelectedPicker(name)}
                                                    className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${selectedPicker === name
                                                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                                                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                                                >
                                                    <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                                                        {name.charAt(0)}
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="font-bold">{name}</div>
                                                        <div className="text-xs opacity-70">Authorized Pickup</div>
                                                    </div>
                                                    {selectedPicker === name && <CheckCircle2 className="ml-auto text-indigo-400" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handlePickupAction('notify')}
                                        disabled={notifyingPickup}
                                        className="w-full py-6 rounded-2xl font-black text-xl flex flex-col items-center justify-center gap-2 transition-all shadow-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 shadow-indigo-900/30 active:scale-[0.98]"
                                    >
                                        {notifyingPickup ? (
                                            <div className="w-8 h-8 border-4 border-white-400 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-3">
                                                    <Car size={28} />
                                                    <span>I'm On My Way 🚀</span>
                                                </div>
                                                <span className="text-sm font-normal opacity-80">Tap when you leave home/work</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )
                        ) : (
                            // STEP 2: ACTIVE PICKUP PHASES
                            <div className="space-y-6 animate-in zoom-in-95 duration-300">
                                {activePickupEntry.status === 'on_the_way' && (
                                    <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-indigo-500/30 p-6 rounded-2xl text-center">
                                        <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                            <Car size={40} className="text-indigo-400" />
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-2">Have a safe drive! 🚗</h3>
                                        <p className="text-slate-400 text-sm mb-6">We've notified the team that <b>{activePickupEntry.pickerName}</b> is coming.</p>

                                        <button
                                            onClick={() => handlePickupAction('arrive')}
                                            className="w-full py-4 rounded-xl font-bold bg-white text-indigo-900 hover:bg-indigo-50 transition-colors shadow-lg"
                                        >
                                            I've Arrived at the Gate 👋
                                        </button>
                                    </div>
                                )}

                                {activePickupEntry.status === 'arrived' && (
                                    <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 border border-emerald-500/30 p-6 rounded-2xl text-center">
                                        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle2 size={40} className="text-emerald-400 animate-bounce" />
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-2">You're Checked In! ✅</h3>
                                        <p className="text-slate-400 text-sm mb-6">Please wait at the designated area. We are bringing <b>{activeChild.name.split(' ')[0]}</b> out to you.</p>
                                        <div className="p-3 bg-slate-900/50 rounded-lg text-xs text-slate-500 animate-pulse">
                                            Waiting for instructor to release student...
                                        </div>
                                    </div>
                                )}

                                {activePickupEntry.status === 'released' && (
                                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-1 rounded-2xl shadow-xl shadow-blue-900/50">
                                        <div className="bg-slate-900/90 rounded-xl p-6 text-center h-full">
                                            <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg border-4 border-slate-900 relative">
                                                <div className="absolute inset-0 bg-white/30 rounded-full animate-ping opacity-75"></div>
                                                <Star size={48} className="text-white relative z-10" fill="currentColor" />
                                            </div>
                                            <h3 className="text-2xl font-black text-white mb-2">{activeChild.name.split(' ')[0]} is Released! 🎉</h3>
                                            <p className="text-blue-200 text-sm mb-8">They have left the Makerlab and are coming to you.</p>

                                            <button
                                                onClick={() => handlePickupAction('confirm')}
                                                className="w-full py-4 rounded-xl font-black text-lg bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:to-orange-600 transition-all shadow-lg active:scale-95"
                                            >
                                                Confirm Pickup & Close
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                            <h3 className="font-bold text-white mb-2">Pickup Guidelines</h3>
                            <ul className="list-disc pl-5 text-slate-400 text-sm space-y-2">
                                <li>Please ensure you are parked safely.</li>
                                <li>Only tap "I've Arrived" when you are physically at the location.</li>
                                <li>If someone else is picking up, ensure they are on the <b>Authorized Pickups</b> list in Settings.</li>
                            </ul>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="text-center text-slate-500 text-xs pb-8 pt-4 space-y-2 border-t border-slate-800/50">
                    <p className="font-bold text-slate-400">{settings.academyName}</p>
                    <p>Questions? Contact us: {settings.receiptContact}</p>
                </div>
            </main>
        </div>
    );
};