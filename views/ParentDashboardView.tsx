import React, { useState, useMemo } from 'react';
import { User, Calendar, CreditCard, Car, Bell, Phone, Clock, MapPin, CheckCircle2, ChevronRight, LogOut, Wallet, AlertCircle, Trophy, Star, Target, TrendingUp, Zap, BookOpen, Brain, Rocket, ChevronDown, Award, Code, Sparkles, ListChecks, Lock, Unlock, ClipboardList, Play, Send, Maximize2, ImageIcon, Link as LinkIcon, Quote, Filter, X } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { addDoc, collection, serverTimestamp, Timestamp, updateDoc, doc, Firestore } from 'firebase/firestore';
import { db } from '../services/firebase';
import { formatCurrency, formatDate } from '../utils/helpers';
import { StudentProject, Payment, Enrollment } from '../types';
import { getTheme } from '../utils/theme';
import { ParentProjectModal } from './parent/ParentProjectModal';
import { ProjectDetailsEnhanced } from '../sparkquest/components/ProjectDetailsEnhanced';

export const ParentDashboardView = () => {
    const { students, enrollments, payments, pickupQueue, settings, studentProjects, projectTemplates, badges, galleryItems } = useAppContext();
    const { user, userProfile, signOut } = useAuth();

    const [notifyingPickup, setNotifyingPickup] = useState(false);
    const [selectedChildIndex, setSelectedChildIndex] = useState(0);
    const [expandedProject, setExpandedProject] = useState<string | null>(null);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<StudentProject | null>(null);

    const handleOpenProject = (project: StudentProject) => {
        setSelectedProject(project);
        setIsProjectModalOpen(true);
    };

    const handleCloseProject = () => {
        setIsProjectModalOpen(false);
        setSelectedProject(null);
    };

    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'submitted'>('all');
    const [filterStation, setFilterStation] = useState<string>('all');
    const [activeTab, setActiveTab] = useState<'overview' | 'journey' | 'portfolio' | 'finance' | 'profile' | 'pickup' | 'gallery' | 'contact'>('overview');
    const [selectedImage, setSelectedImage] = useState<any>(null);
    const [localDismissedIds, setLocalDismissedIds] = useState<string[]>([]);

    // --- HISTORY MANAGEMENT (Back Button Fix) ---
    React.useEffect(() => {
        // Initial State Replacement (to avoid immediate exit)
        window.history.replaceState({ tab: 'overview' }, '');

        const handlePopState = (event: PopStateEvent) => {
            if (event.state && event.state.tab) {
                // If we have state, go to that tab
                setActiveTab(event.state.tab);
            } else {
                // If no state (e.g. initial load popped), default to overview or let it exit if at root
                // For safety in this app structure, default to overview
                setActiveTab('overview');
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // Intercept setActiveTab to push history
    const navigateToTab = (tab: typeof activeTab) => {
        if (tab === activeTab) return;

        // Push logic
        window.history.pushState({ tab: tab }, '');
        setActiveTab(tab);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Identify Children
    const myChildren = useMemo(() => {
        if (!user?.email) return [];

        return students.filter(s => {
            const parentEmail = s.parentLoginInfo?.email?.toLowerCase();
            const studentLoginEmail = s.loginInfo?.email?.toLowerCase();
            const studentEmail = s.email?.toLowerCase();
            const currentUserEmail = user.email?.toLowerCase();

            return (
                parentEmail === currentUserEmail ||
                studentLoginEmail === currentUserEmail ||
                studentEmail === currentUserEmail
            );
        });
    }, [students, user]);

    const activeChild = myChildren[selectedChildIndex];

    const handleSignOut = async () => {
        await signOut();
        window.location.href = '/';
    };

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

        // Match by Firestore ID OR Auth UID (critical for linked accounts)
        const projects = studentProjects.filter(p =>
            p.studentId === activeChild.id ||
            (activeChild.loginInfo?.uid && p.studentId === activeChild.loginInfo.uid)
        );

        // Helper for flexible status checking
        const checkStatus = (p: any, status: string) => p.status?.toLowerCase() === status.toLowerCase();

        const completedProjects = projects.filter(p => checkStatus(p, 'published'));

        // Also fix other status checks just in case
        const submittedProjects = projects.filter(p => checkStatus(p, 'submitted'));
        const activeProjects = projects.filter(p =>
            checkStatus(p, 'building') ||
            checkStatus(p, 'testing') ||
            checkStatus(p, 'planning') ||
            checkStatus(p, 'changes_requested') ||
            checkStatus(p, 'working on it') // Handle potential variations
        );

        // Get assigned templates that haven't been started yet (future projects)
        const startedProjectTitles = projects.map(p => p.title);
        const futureProjects = projectTemplates
            .filter(template => {
                // 1. Exclude already started
                if (startedProjectTitles.includes(template.title)) return false;

                // 2. Student Specific Targeting (High Priority)
                if (template.targetAudience?.students && template.targetAudience.students.length > 0) {
                    return template.targetAudience.students.includes(activeChild.id);
                }

                // 3. Grade & Group Matching
                // Get active enrollments for this child
                const childEnrollments = enrollments.filter(e => e.studentId === activeChild.id && e.status === 'active');

                // If template has specific grades, child must be enrolled in at least one
                if (template.targetAudience?.grades && template.targetAudience.grades.length > 0) {
                    const hasGradeMatch = childEnrollments.some(e => template.targetAudience?.grades?.includes(e.gradeId));
                    if (!hasGradeMatch) return false;

                    // If grade matches, check groups (if template restricts groups)
                    if (template.targetAudience?.groups && template.targetAudience.groups.length > 0) {
                        const hasGroupMatch = childEnrollments.some(e =>
                            template.targetAudience?.grades?.includes(e.gradeId) && // Must match the grade constraint too
                            (template.targetAudience.groups?.includes(e.groupName) || false)
                        );
                        if (!hasGroupMatch) return false;
                    }
                }

                return true;
            })
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
                filtered = filtered.filter(p => p.status?.toLowerCase() === 'published');
            } else if (filterStatus === 'submitted') {
                filtered = filtered.filter(p => p.status?.toLowerCase() === 'submitted');
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
                const picker = selectedPicker || user?.displayName || 'Parent';
                for (const child of myChildren) {
                    // Check if already active to prevent duplicates
                    const existing = pickupQueue.find(q => q.studentId === child.id && ['on_the_way', 'arrived', 'released'].includes(q.status));
                    if (existing) continue;

                    await addDoc(collection(db, 'pickup_queue'), {
                        studentId: child.id,
                        studentName: child.name,
                        parentName: user?.displayName || 'Parent',
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
        if (project.status?.toLowerCase() === 'published') return 100;
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
                    <p className="text-slate-400 text-sm mb-6">We couldn't find any student profiles linked to <span className="text-blue-400 font-mono">{user?.email}</span>.</p>
                    <button onClick={handleSignOut} className="text-red-400 hover:text-red-300 text-sm font-bold flex items-center justify-center gap-2 w-full"><LogOut size={16} /> Sign Out</button>
                </div>
            </div>
        );
    }

    // --- PICKUP BUTTON COMPONENT ---
    const PickupActionButton = () => {
        const activeEntry = activePickupEntry; // Uses the useMemo from above
        const isChildReleased = activeEntry?.status === 'released';

        if (isChildReleased) {
            return (
                <div className="mt-4 md:mt-0 w-full md:w-auto bg-indigo-600/20 border border-indigo-500/50 p-3 rounded-xl flex items-center gap-3 animate-in fade-in zoom-in duration-300">
                    <div className="bg-indigo-500 p-2 rounded-full animate-bounce">
                        <Star size={20} className="text-white fill-current" />
                    </div>
                    <div>
                        <div className="text-white font-bold text-sm">Released!</div>
                        <div className="text-indigo-300 text-xs">Please confirm receipt</div>
                    </div>
                    <button
                        onClick={() => setActiveTab('pickup')}
                        className="ml-auto bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
                    >
                        View
                    </button>
                </div>
            );
        }

        if (activeEntry?.status === 'arrived') {
            return (
                <div className="mt-4 md:mt-0 w-full md:w-auto bg-emerald-600 p-1 rounded-xl shadow-lg shadow-emerald-900/40 animate-pulse">
                    <div className="bg-slate-900 rounded-lg p-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-500/20 p-2 rounded-full">
                                <CheckCircle2 size={20} className="text-emerald-500" />
                            </div>
                            <div>
                                <div className="text-white font-bold text-sm leading-tight">You've Arrived</div>
                                <div className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider">Waiting for Release</div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeEntry?.status === 'on_the_way') {
            return (
                <button
                    disabled={notifyingPickup}
                    onClick={() => handlePickupAction('arrive')}
                    className="mt-4 md:mt-0 w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 text-white p-1 rounded-xl shadow-lg shadow-emerald-900/40 transition-all hover:scale-[1.02] active:scale-95 group"
                >
                    <div className="bg-emerald-600 border-2 border-emerald-400/30 border-dashed rounded-lg p-3 flex items-center justify-center gap-3 h-full group-hover:border-solid transition-all">
                        {notifyingPickup ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                            <>
                                <MapPin size={20} className="fill-current animate-bounce" />
                                <span className="font-black text-sm uppercase tracking-wide">I'm Here!</span>
                            </>
                        )}
                    </div>
                </button>
            );
        }

        // Default: Show "On My Way"
        return (
            <button
                disabled={notifyingPickup}
                onClick={() => handlePickupAction('notify')}
                className="mt-4 md:mt-0 w-full md:w-auto bg-slate-800 hover:bg-slate-700 text-white p-1 rounded-xl shadow-lg border border-slate-700 transition-all hover:scale-[1.02] active:scale-95 group"
            >
                <div className="bg-slate-900/50 rounded-lg p-3 flex items-center justify-center gap-3 h-full">
                    {notifyingPickup ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                        <>
                            <Car size={20} className="text-slate-400 group-hover:text-white transition-colors" />
                            <div className="text-left">
                                <div className="font-bold text-sm leading-none group-hover:text-emerald-400 transition-colors">On My Way</div>
                                <div className="text-[10px] text-slate-500 font-medium">Click when leaving</div>
                            </div>
                            <ChevronRight size={16} className="text-slate-600 group-hover:text-white opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all ml-2" />
                        </>
                    )}
                </div>
            </button>
        );
    };

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

                    {/* NEW: Pickup Action Button (Hero) */}
                    <div className="mb-6 md:mb-8">
                        <PickupActionButton />
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
                            { id: 'journey', label: 'Journey', icon: LucideIcons.MapPin },
                            { id: 'portfolio', label: 'Portfolio', icon: LucideIcons.BookOpen }, // Published Work
                            { id: 'finance', label: 'Billing', icon: LucideIcons.Wallet },
                            { id: 'gallery', label: 'Gallery', icon: LucideIcons.ImageIcon },
                            { id: 'contact', label: 'Contact', icon: LucideIcons.Phone },
                            { id: 'pickup', label: 'Pickup', icon: LucideIcons.Car },
                            { id: 'settings', label: 'Settings', icon: LucideIcons.Settings },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => navigateToTab(tab.id as any)}
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

            {/* Bottom Navigation (Mobile) - SIMPLIFIED */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 z-50 flex justify-around items-center px-4 safe-area-pb">
                {[
                    { id: 'overview', label: 'Home', icon: LucideIcons.Home }, // Renamed from Overview
                    { id: 'journey', label: 'Journey', icon: LucideIcons.MapPin },
                    { id: 'gallery', label: 'Gallery', icon: LucideIcons.ImageIcon },
                    { id: 'menu', label: 'Menu', icon: LucideIcons.Menu }, // New Menu Item
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => navigateToTab(tab.id as any)}
                        className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all ${activeTab === tab.id || (tab.id === 'menu' && !['overview', 'journey', 'gallery'].includes(activeTab))
                            ? 'text-indigo-400'
                            : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        {activeTab === tab.id && <div className="absolute top-0 w-8 h-1 bg-indigo-500 rounded-b-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />}
                        <tab.icon size={22} className={activeTab === tab.id ? 'fill-current opacity-20' : ''} />
                        <span className="text-[10px] font-bold tracking-tight">{tab.label}</span>
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

                {/* NEW: Menu Grid View */}
                {(activeTab === 'menu' || !['overview', 'journey', 'gallery'].includes(activeTab)) && activeTab !== 'overview' && activeTab !== 'journey' && activeTab !== 'gallery' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <h2 className="text-2xl font-black text-white px-4">Menu</h2>

                        <div className="grid grid-cols-2 gap-4 px-4">
                            {[
                                { id: 'portfolio', label: 'Portfolio', icon: LucideIcons.BookOpen, color: 'bg-purple-500', desc: 'Published Projects' },
                                { id: 'finance', label: 'Billing', icon: LucideIcons.Wallet, color: 'bg-emerald-500', desc: 'Invoices & Payments' },
                                { id: 'pickup', label: 'Pickup', icon: LucideIcons.Car, color: 'bg-blue-500', desc: 'Go Home Status' },
                                { id: 'contact', label: 'Contact', icon: LucideIcons.Phone, color: 'bg-orange-500', desc: 'Get Help' },
                                { id: 'settings', label: 'Settings', icon: LucideIcons.Settings, color: 'bg-slate-500', desc: 'Profile & App' },
                            ].map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => navigateToTab(item.id as any)}
                                    className={`relative overflow-hidden rounded-2xl p-4 text-left border border-slate-700 hover:border-slate-500 transition-all group ${activeTab === item.id ? 'bg-slate-800' : 'bg-slate-900/50'}`}
                                >
                                    <div className={`w-10 h-10 rounded-full ${item.color} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                                        <item.icon size={20} className="text-white" />
                                    </div>
                                    <div className="font-bold text-white text-lg">{item.label}</div>
                                    <div className="text-xs text-slate-400">{item.desc}</div>
                                </button>
                            ))}

                            {/* Sign Out Button in Grid */}
                            <button
                                onClick={handleSignOut}
                                className="col-span-2 relative overflow-hidden rounded-2xl p-4 flex items-center justify-center gap-2 border border-red-900/30 bg-red-900/10 hover:bg-red-900/20 transition-all mt-4"
                            >
                                <LogOut size={18} className="text-red-400" />
                                <span className="font-bold text-red-400">Sign Out</span>
                            </button>
                        </div>

                        {/* Render Active Content Below if it's one of the menu items */}
                        {activeTab !== 'menu' && (
                            <div className="mt-8 border-t border-slate-800 pt-8">
                                {/* Content will be rendered by existing conditionals (portfolio, finance, etc) */}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'overview' && (
                    <div className="space-y-10">
                        {/* Next Session Card (Dynamic Workshop Focus) */}
                        {(() => {
                            // Find the most relevant active project (most recently updated 'doing' or 'building')
                            // Sort by updated time desc to get the one being worked on right now
                            const currentProject = childData?.activeProjects[0];

                            // Find the current active step (doing) or next step (todo)
                            const currentStep = currentProject?.steps?.find(s => s.status === 'doing')
                                || currentProject?.steps?.find(s => s.status === 'todo');

                            const workshopTheme = currentStep
                                ? `Next Mission: ${currentStep.title}`
                                : "Next Mission: New Project Launch 🚀";

                            const workshopDescription = currentStep && currentProject
                                ? `${activeChild.name.split(' ')[0]} will be working on "${currentStep.title}" for their ${currentProject.title} project.`
                                : "Getting ready to start their next big engineering adventure!";

                            // Get Schedule from Enrollments
                            const activeEnrollment = financialStatus.myEnrollments.find(e => e.studentId === activeChild.id && e.status === 'active');
                            const scheduleText = activeEnrollment?.schedule || "Check Schedule";

                            return (
                                <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 relative">
                                            <Calendar size={24} />
                                            {currentStep && (
                                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center border-2 border-slate-900">
                                                    <Sparkles size={10} className="text-white fill-current" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Next Session</span>
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 font-medium">
                                                    {scheduleText}
                                                </span>
                                            </div>
                                            <h3 className="text-white font-bold">{workshopTheme}</h3>
                                            <p className="text-slate-400 text-xs mt-1 max-w-md">
                                                {workshopDescription}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setActiveTab('journey')}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-900/20 transition-all shrink-0">
                                        View Schedule
                                    </button>
                                </div>
                            );
                        })()}

                        {/* Stats Row with Creative Titles */}
                        <div>
                            <h2 className="text-lg font-bold text-white/90 mb-4 flex items-center gap-2">
                                <Sparkles size={20} className="text-yellow-400" />
                                {activeChild.name.split(' ')[0]}'s Achievements ✨
                            </h2>
                            <div className="grid grid-cols-3 gap-4 md:gap-6 mb-10">
                                <div
                                    onClick={() => setActiveTab('portfolio')}
                                    className="bg-gradient-to-br from-emerald-900/50 to-emerald-950/50 border-2 border-emerald-500/40 rounded-3xl p-5 md:p-6 relative overflow-hidden hover:scale-105 transition-transform shadow-xl cursor-pointer">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/20 rounded-full blur-3xl"></div>
                                    <Trophy size={28} className="text-emerald-400 mb-3 relative z-10 drop-shadow-lg" />
                                    <div className="text-4xl font-black text-white relative z-10 mb-1">{childData?.completedProjects.length || 0}</div>
                                    <div className="text-xs text-emerald-200 font-bold relative z-10 leading-tight">Projects<br />Mastered</div>
                                </div>

                                <div
                                    onClick={() => setActiveTab('portfolio')}
                                    className="bg-gradient-to-br from-cyan-900/50 to-cyan-950/50 border-2 border-cyan-500/40 rounded-3xl p-5 md:p-6 relative overflow-hidden hover:scale-105 transition-transform shadow-xl cursor-pointer">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/20 rounded-full blur-3xl"></div>
                                    <Zap size={28} className="text-cyan-400 mb-3 relative z-10 drop-shadow-lg" fill="currentColor" />
                                    <div className="text-4xl font-black text-white relative z-10 mb-1">{childData?.earnedSkills.length || 0}</div>
                                    <div className="text-xs text-cyan-200 font-bold relative z-10 leading-tight">New Skills<br />Unlocked</div>
                                </div>

                                <div
                                    onClick={() => setActiveTab('journey')}
                                    className="bg-gradient-to-br from-purple-900/50 to-purple-950/50 border-2 border-purple-500/40 rounded-3xl p-5 md:p-6 relative overflow-hidden hover:scale-105 transition-transform shadow-xl cursor-pointer">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/20 rounded-full blur-3xl"></div>
                                    <Rocket size={28} className="text-purple-400 mb-3 relative z-10 drop-shadow-lg" />
                                    <div className="text-4xl font-black text-white relative z-10 mb-1">{childData?.activeProjects.length || 0}</div>
                                    <div className="text-xs text-purple-200 font-bold relative z-10 leading-tight">Currently<br />Building</div>
                                </div>
                            </div>
                        </div>

                        {/* Unified 'What's New' Feed */}
                        <div className="mb-10">
                            <h2 className="text-lg font-bold text-white/90 mb-4 flex items-center gap-2">
                                <LucideIcons.Activity size={20} className="text-blue-400" />
                                What's New 🔔
                            </h2>

                            {(() => {
                                // --- AGGREGATION LOGIC ---
                                type FeedItem = {
                                    id: string;
                                    type: 'photo' | 'achievement' | 'payment';
                                    date: any; // Timestamp or Date object
                                    title: string;
                                    subtitle?: string;
                                    image?: string;
                                    action?: { label: string; onClick: () => void };
                                    theme: { bg: string; border: string; icon: any; iconColor: string };
                                };

                                const feed: FeedItem[] = [];

                                // Helper to dismiss item
                                const handleFeedInteraction = async (itemId: string, actionCallback?: () => void) => {
                                    if (actionCallback) actionCallback();

                                    // 1. Optimistic Update (Instant Removal)
                                    setLocalDismissedIds(prev => [...prev, itemId]);

                                    // 2. Persist to Firestore
                                    if (!db) return;
                                    try {
                                        await updateDoc(doc(db as Firestore, 'students', activeChild.id), {
                                            dismissedFeedIds: arrayUnion(itemId)
                                        });
                                    } catch (err) {
                                        console.error("Error dismissing feed item:", err);
                                    }
                                };

                                // 1. Gallery Photos
                                const relevantPhotos = galleryItems
                                    .filter(item => !item.studentId || item.studentId === activeChild.id)
                                    .slice(0, 5); // Check more initially, then filter.

                                relevantPhotos.forEach(p => {
                                    const feedId = `photo-${p.id}`;
                                    // Filter ALREADY DISMISSED (Check Global + Local)
                                    if (activeChild.dismissedFeedIds?.includes(feedId) || localDismissedIds.includes(feedId)) return;

                                    feed.push({
                                        id: feedId,
                                        type: 'photo',
                                        date: p.createdAt,
                                        title: 'New Photo Added',
                                        subtitle: p.caption || 'A new memory from the Makerspace!',
                                        image: p.url,
                                        action: {
                                            label: 'View Gallery',
                                            onClick: () => handleFeedInteraction(feedId, () => setActiveTab('gallery'))
                                        },
                                        theme: { bg: 'from-pink-900/40 to-rose-900/40', border: 'border-pink-500/30', icon: LucideIcons.Camera, iconColor: 'text-pink-400' }
                                    });
                                });

                                // 2. Achievements (Completed Steps)
                                childData?.projects.forEach(p => {
                                    p.steps.filter(s => s.status === 'done').forEach(s => {
                                        const feedId = `step-${s.id}`;
                                        if (activeChild.dismissedFeedIds?.includes(feedId) || localDismissedIds.includes(feedId)) return;

                                        feed.push({
                                            id: feedId,
                                            type: 'achievement',
                                            // Fallback date if step doesn't have one
                                            date: p.updatedAt,
                                            title: `Mission Accomplished: ${s.title}`,
                                            subtitle: `Completed step in "${p.title}"`,
                                            image: s.proofUrl, // Optional proof
                                            action: s.proofUrl ? { label: 'View Proof', onClick: () => handleFeedInteraction(feedId, () => window.open(s.proofUrl, '_blank')) } : undefined,
                                            theme: { bg: 'from-emerald-900/40 to-teal-900/40', border: 'border-emerald-500/30', icon: LucideIcons.Trophy, iconColor: 'text-emerald-400' }
                                        });
                                    });
                                });

                                // 3. Pending Payments (DO NOT DISMISS UNTIL PAID ideally, but user asked for logic. 
                                // Actually, for payments, we probably shouldn't allow dismissal until paid, OR just dismiss notification but keep bill.
                                // Let's allow dismissal of the *news item* as requested.)
                                const pendingPayments = payments.filter(pay => pay.studentId === activeChild.id && pay.status === 'pending');
                                pendingPayments.forEach(pay => {
                                    const feedId = `pay-${pay.id}`;
                                    if (activeChild.dismissedFeedIds?.includes(feedId) || localDismissedIds.includes(feedId)) return;

                                    feed.push({
                                        id: feedId,
                                        type: 'payment',
                                        date: pay.dueDate || new Date().toISOString(), // Use string or timestamp
                                        title: 'Invoice Due',
                                        subtitle: `${pay.amount} ${settings.currency} - ${pay.description || 'Tuition Fee'}`,
                                        action: { label: 'Pay Now', onClick: () => handleFeedInteraction(feedId, () => setActiveTab('finance')) },
                                        theme: { bg: 'from-orange-900/40 to-amber-900/40', border: 'border-orange-500/30', icon: LucideIcons.CreditCard, iconColor: 'text-orange-400' }
                                    });
                                });

                                // 4. Published Projects (Showcase)
                                childData?.projects.filter(p => p.status === 'published').forEach(p => {
                                    const feedId = `proj-pub-${p.id}`;
                                    if (activeChild.dismissedFeedIds?.includes(feedId) || localDismissedIds.includes(feedId)) return;

                                    feed.push({
                                        id: feedId,
                                        type: 'achievement',
                                        date: p.updatedAt,
                                        title: 'New Project Published! 🚀',
                                        subtitle: `"${p.title}" is now live in the showcase.`,
                                        image: p.thumbnailUrl || p.coverImage,
                                        action: { label: 'View Portfolio', onClick: () => handleFeedInteraction(feedId, () => setActiveTab('portfolio')) },
                                        theme: { bg: 'from-fuchsia-900/40 to-purple-900/40', border: 'border-fuchsia-500/30', icon: LucideIcons.Award, iconColor: 'text-fuchsia-400' }
                                    });
                                });

                                // --- HELPER: GET SECONDS ---
                                const getSeconds = (date: any) => {
                                    if (date?.seconds) return date.seconds;
                                    if (typeof date === 'string') return new Date(date).getTime() / 1000;
                                    return 0;
                                };

                                // --- SORTING & LIMITING ---
                                // Sort by Date Descending
                                feed.sort((a, b) => {
                                    return getSeconds(b.date) - getSeconds(a.date);
                                });

                                // Take top 5 items
                                const displayFeed = feed.slice(0, 5);

                                if (displayFeed.length === 0) {
                                    // Smart Empty State (Still "Ready for Launch" but formatted for feed)
                                    return (
                                        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 text-center relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                                            <LucideIcons.Radar size={48} className="mx-auto text-blue-500 mb-4 animate-spin-slow" />
                                            <h3 className="text-xl font-bold text-white mb-2">Up to Date! 🌟</h3>
                                            <p className="text-slate-400 max-w-sm mx-auto mb-6">
                                                You're all caught up on {activeChild.name.split(' ')[0]}'s latest news.
                                                Check the <strong>Portfolio</strong> tab for full progress history.
                                            </p>
                                        </div>
                                    );
                                }

                                // --- RENDERING ---
                                return (
                                    <div className="space-y-4">
                                        {displayFeed.map(item => (
                                            <div key={item.id} className={`bg-gradient-to-r ${item.theme.bg} border ${item.theme.border} rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center gap-4 transition-all hover:scale-[1.01] hover:shadow-lg relative group`}>

                                                {/* Close Button (Hover only) */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleFeedInteraction(item.id); }}
                                                    className="absolute top-2 right-2 p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Dismiss"
                                                >
                                                    <LucideIcons.X size={14} />
                                                </button>

                                                {/* Image/Icon */}
                                                <div className="shrink-0 relative">
                                                    {item.image ? (
                                                        <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 shadow-sm relative group">
                                                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                                                            <img src={item.image} className="w-full h-full object-cover" alt="Feed thumbnail" />
                                                            <div className="absolute bottom-1 right-1 bg-slate-900/80 rounded-full p-1">
                                                                <item.theme.icon size={10} className={item.theme.iconColor} />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className={`w-14 h-14 rounded-xl bg-slate-900/50 flex items-center justify-center border border-white/5`}>
                                                            <item.theme.icon size={24} className={item.theme.iconColor} />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="text-white font-bold truncate">{item.title}</h4>
                                                        {/* Optional Tag based on type */}
                                                        {item.type === 'payment' && <span className="bg-orange-500/20 text-orange-300 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Action Required</span>}
                                                        {item.type === 'achievement' && <span className="text-emerald-500 text-xs font-bold">+XP</span>}
                                                    </div>
                                                    <p className="text-slate-300 text-sm line-clamp-2">{item.subtitle}</p>
                                                    <p className="text-slate-500 text-xs mt-1">
                                                        {new Date(getSeconds(item.date) * 1000).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                                    </p>
                                                </div>

                                                {/* Action Button */}
                                                {item.action && (
                                                    <button
                                                        onClick={item.action.onClick}
                                                        className="self-end md:self-center shrink-0 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg border border-slate-700 transition-colors flex items-center gap-2"
                                                    >
                                                        {item.action.label}
                                                        <LucideIcons.ChevronRight size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}

                                        {feed.length > 5 && (
                                            <button className="w-full py-2 text-center text-slate-500 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors">
                                                See {feed.length - 5} older updates
                                            </button>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                    </div>
                )}

                {activeTab === 'journey' && (
                    <div className="space-y-10">
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
                                                                {(project.thumbnailUrl || project.mediaUrls?.[0]) && (
                                                                    <div className="h-48 md:h-auto md:w-1/3 bg-slate-950 relative overflow-hidden group-hover:brightness-110 transition-all">
                                                                        <img src={project.thumbnailUrl || project.mediaUrls![0]} className="w-full h-full object-cover" alt="Project Thumbnail" />
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
                                                                        <div className="flex items-center gap-3">
                                                                            <span className="hidden md:inline-block text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-cyan-400 transition-colors">
                                                                                {isExpanded ? 'Close Details' : 'View Progress'}
                                                                            </span>
                                                                            <div className={`p-2 rounded-full transition-all duration-300 ${isExpanded ? 'bg-slate-800 text-white' : 'bg-slate-900 text-slate-500 group-hover:bg-slate-800 group-hover:text-cyan-400'}`}>
                                                                                <ChevronDown
                                                                                    size={20}
                                                                                    className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                                                                                />
                                                                            </div>
                                                                        </div>
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

                                                            {/* Evidence Gallery (New) */}
                                                            {(() => {
                                                                const evidenceResources = project.steps
                                                                    ?.filter(s => s.status === 'done' && s.proofUrl && (s.proofUrl.startsWith('http') || s.proofUrl.startsWith('data:')))
                                                                    .map(s => ({ url: s.proofUrl, title: s.title }));

                                                                if (evidenceResources && evidenceResources.length > 0) {
                                                                    return (
                                                                        <div className="mb-8 p-4 bg-slate-900/50 rounded-2xl border border-slate-800/50">
                                                                            <h4 className="text-sm text-cyan-400 font-bold mb-3 flex items-center gap-2">
                                                                                <LucideIcons.Camera size={16} /> PROJECT EVIDENCE 📸
                                                                            </h4>
                                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                                                {evidenceResources.map((proof, idx) => (
                                                                                    <div
                                                                                        key={idx}
                                                                                        onClick={() => window.open(proof.url, '_blank')}
                                                                                        className="group relative aspect-video bg-slate-800 rounded-lg overflow-hidden border border-slate-700 cursor-pointer shadow-md hover:shadow-cyan-900/20 transition-all hover:scale-[1.02]"
                                                                                    >
                                                                                        <img src={proof.url} className="w-full h-full object-cover" alt="Proof" />
                                                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                                                                            <span className="text-[10px] text-white font-bold truncate">{proof.title}</span>
                                                                                        </div>
                                                                                        <div className="absolute top-1 right-1 bg-black/60 rounded px-1.5 py-0.5">
                                                                                            <Maximize2 size={10} className="text-white" />
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }
                                                                return null;
                                                            })()}

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
                                                                {(project.thumbnailUrl || project.mediaUrls?.[0]) && !hasPresentation && (
                                                                    <button
                                                                        onClick={() => window.open(project.thumbnailUrl || project.mediaUrls![0], '_blank')}
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
                                                                    <p className="text-sm text-slate-200 leading-relaxed max-w-2xl whitespace-pre-wrap">{project.description}</p>
                                                                </div>
                                                            )}

                                                            {/* Engineering Process Steps */}
                                                            {project.steps && project.steps.length > 0 && (
                                                                <div>
                                                                    <h4 className="text-sm text-slate-400 font-bold mb-4 flex items-center gap-2">
                                                                        <ListChecks size={16} className="text-cyan-400" /> MISSION LOG
                                                                    </h4>
                                                                    <div className="space-y-3">
                                                                        {project.steps.map((step, idx) => (
                                                                            <div key={step.id} className={`flex items-start gap-3 p-3 rounded-xl transition-all ${step.status === 'done' ? 'bg-slate-900/40' : 'opacity-70'}`}>
                                                                                <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${step.status === 'done' ? 'bg-emerald-500 border-emerald-500 text-white' :
                                                                                    step.status === 'doing' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' :
                                                                                        'border-slate-600 text-slate-500'
                                                                                    }`}>
                                                                                    {step.status === 'done' ? <CheckCircle2 size={12} /> : <span className="text-[10px] font-bold">{idx + 1}</span>}
                                                                                </div>
                                                                                <div className="flex-1">
                                                                                    <p className={`text-sm font-medium ${step.status === 'done' ? 'text-slate-200 line-through decoration-slate-600' : 'text-slate-400'}`}>{step.title}</p>
                                                                                </div>
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
                                                                            <span key={skill} className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700 font-bold">
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

                {activeTab === 'portfolio' && (
                    <div className="space-y-10">
                        {/* Portfolio Header */}
                        <div>
                            <h2 className="text-2xl font-black text-white mb-2 flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-fuchsia-600 to-purple-600 rounded-xl shadow-lg shadow-purple-500/20">
                                    <BookOpen size={24} className="text-white" />
                                </div>
                                {activeChild.name.split(' ')[0]}'s Portfolio 🌟
                            </h2>
                            <p className="text-slate-400 text-sm">A collection of published projects and mastered skills.</p>
                        </div>

                        {/* Projects Grid */}
                        {childData?.completedProjects && childData.completedProjects.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {childData.completedProjects.map(project => {
                                    const theme = getTheme(project.station);
                                    return (
                                        <div
                                            key={project.id}
                                            onClick={() => handleOpenProject(project)}
                                            className="group bg-slate-900 border border-slate-700 hover:border-fuchsia-500/50 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 flex flex-col h-full cursor-pointer hover:-translate-y-1"
                                        >
                                            {/* Cover Image */}
                                            <div className="h-48 bg-slate-950 relative overflow-hidden">
                                                {project.thumbnailUrl || project.mediaUrls?.[0] ? (
                                                    <img
                                                        src={project.thumbnailUrl || project.mediaUrls![0]}
                                                        alt={project.title}
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                    />
                                                ) : (
                                                    <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${theme.bg}`}>
                                                        <theme.icon size={48} className="text-white/20" />
                                                    </div>
                                                )}

                                                {/* Overlay Grade/Badge */}
                                                <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1">
                                                    <theme.icon size={10} className={theme.text} />
                                                    {theme.label}
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="p-5 flex-1 flex flex-col">
                                                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-fuchsia-400 transition-colors leading-tight">
                                                    {project.title}
                                                </h3>
                                                <p className="text-slate-400 text-xs line-clamp-3 mb-4 flex-1">
                                                    {project.description || "No description provided."}
                                                </p>

                                                {/* Skills Footer */}
                                                {project.skillsAcquired && project.skillsAcquired.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mb-4">
                                                        {project.skillsAcquired.slice(0, 3).map(skill => (
                                                            <span key={skill} className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded border border-slate-700">
                                                                {skill}
                                                            </span>
                                                        ))}
                                                        {project.skillsAcquired.length > 3 && (
                                                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-500 rounded border border-slate-700">
                                                                +{project.skillsAcquired.length - 3}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenProject(project);
                                                    }}
                                                    className="w-full py-2 bg-slate-800 hover:bg-fuchsia-600 text-white text-xs font-bold rounded-xl transition-all border border-slate-700 hover:border-fuchsia-500 flex items-center justify-center gap-2"
                                                >
                                                    View Project <ChevronRight size={14} />
                                                </button>
                                            </div>

                                            {/* Details Expansion (Inline for now to save complexity of new modal) */}
                                            {expandedProject === project.id && (
                                                <div className="absolute inset-0 bg-slate-900 z-20 p-6 flex flex-col animate-in slide-in-from-bottom-5 fade-in duration-300">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h3 className="font-bold text-white">Project Details</h3>
                                                        <button onClick={(e) => { e.stopPropagation(); setExpandedProject(null); }} className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white">
                                                            <X size={20} />
                                                        </button>
                                                    </div>

                                                    <div className="overflow-y-auto pr-2 space-y-4">
                                                        {project.presentationUrl && (
                                                            <a href={project.presentationUrl} target="_blank" rel="noopener noreferrer" className="block w-full py-3 bg-red-600 hover:bg-red-500 text-white text-center font-bold rounded-xl flex items-center justify-center gap-2">
                                                                <Play size={16} fill="currentColor" /> Watch Presentation
                                                            </a>
                                                        )}

                                                        {/* Images/Evidence Grid */}
                                                        {project.mediaUrls && project.mediaUrls.length > 0 && (
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {project.mediaUrls.map((url, i) => (
                                                                    <img key={i} src={url} className="w-full h-24 object-cover rounded-lg border border-slate-700" onClick={() => window.open(url, '_blank')} />
                                                                ))}
                                                            </div>
                                                        )}

                                                        <p className="text-sm text-slate-300">{project.description}</p>

                                                        {project.instructorFeedback && (
                                                            <div className="p-3 bg-amber-900/20 border border-amber-500/30 rounded-lg">
                                                                <p className="text-xs text-amber-500 font-bold mb-1">Feedback</p>
                                                                <p className="text-xs text-amber-200 italic">"{project.instructorFeedback}"</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-slate-800 border-dashed">
                                <BookOpen size={48} className="mx-auto text-slate-700 mb-4" />
                                <h3 className="text-white font-bold mb-2">Portfolio is Empty</h3>
                                <p className="text-slate-500 text-sm max-w-xs mx-auto">
                                    {activeChild.name.split(' ')[0]} hasn't published any projects yet.
                                    Check the <strong>Journey</strong> tab to see what they are working on!
                                </p>
                                <button
                                    onClick={() => setActiveTab('journey')}
                                    className="mt-6 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-full transition-colors"
                                >
                                    Go to Journey
                                </button>

                                {/* DEBUG INFO */}
                                <div className="mt-8 p-4 bg-black/50 overflow-auto max-h-64 text-[10px] text-left font-mono rounded">
                                    <p className="font-bold text-indigo-400 mb-2">DEBUGGING ID MISMATCH</p>
                                    <p>Active Child Name: {activeChild.name}</p>
                                    <p>Active Child ID (Firestore): "{activeChild.id}"</p>
                                    <p>Active Child LoginInfo: {JSON.stringify(activeChild.loginInfo)}</p>
                                    <p>Active Child Full Object Keys: {Object.keys(activeChild).join(', ')}</p>

                                    <div className="my-2 border-t border-slate-700 pt-2">
                                        <p>Project Matches using ID: {studentProjects.filter(p => p.studentId === activeChild.id).length}</p>
                                        <p>Project Matches using Auth UID: {activeChild.loginInfo?.uid ? studentProjects.filter(p => p.studentId === activeChild.loginInfo?.uid).length : 'N/A'}</p>
                                    </div>

                                    <div className="my-2 border-t border-slate-700 pt-2">
                                        <p>First 3 Projects IDs:</p>
                                        {studentProjects.slice(0, 3).map(p => (
                                            <div key={p.id} className="pl-2 border-l-2 border-slate-700 mb-1">
                                                <p>Title: {p.title}</p>
                                                <p>StudentId: "{p.studentId}"</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'contact' && (
                    <div className="space-y-8 max-w-2xl mx-auto">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-black text-white mb-2">We're Here to Help! 👋</h2>
                            <p className="text-slate-400">Need assistance? Reach out to the right person directly.</p>
                        </div>

                        {/* Curriculum Contact */}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <LucideIcons.BookOpen size={100} />
                            </div>
                            <div className="flex items-start gap-4 relative z-10">
                                <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30 shrink-0">
                                    <LucideIcons.GraduationCap size={28} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-white">Mr. Younes</h3>
                                    <p className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">Curriculum & Education</p>
                                    <p className="text-slate-400 text-sm mb-4">For questions about the projects, learning path, or student progress.</p>

                                    <div className="flex flex-wrap gap-3">
                                        <a href="tel:0621877106" className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 rounded-xl text-sm font-bold transition-all">
                                            <LucideIcons.Phone size={16} /> Call
                                        </a>
                                        <a href="https://wa.me/212621877106" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-emerald-900/30 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 hover:border-transparent rounded-xl text-sm font-bold transition-all">
                                            <LucideIcons.MessageCircle size={16} /> WhatsApp
                                        </a>
                                        <a href="mailto:d.younes@makerlab.academy" className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-bold transition-all">
                                            <LucideIcons.Mail size={16} /> Email
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Finance & Schedule Contact */}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-purple-500/50 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <LucideIcons.CalendarClock size={100} />
                            </div>
                            <div className="flex items-start gap-4 relative z-10">
                                <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 border border-purple-500/30 shrink-0">
                                    <LucideIcons.CreditCard size={28} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-white">Mme. Noufissa</h3>
                                    <p className="text-purple-400 text-xs font-bold uppercase tracking-wider mb-2">Finance & Scheduling</p>
                                    <p className="text-slate-400 text-sm mb-4">For billing inquiries, invoices, payment plans, or schedule changes.</p>

                                    <div className="flex flex-wrap gap-3">
                                        <a href="tel:0661198278" className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-purple-600 hover:text-white text-slate-300 rounded-xl text-sm font-bold transition-all">
                                            <LucideIcons.Phone size={16} /> Call
                                        </a>
                                        <a href="https://wa.me/212661198278" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-emerald-900/30 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 hover:border-transparent rounded-xl text-sm font-bold transition-all">
                                            <LucideIcons.MessageCircle size={16} /> WhatsApp
                                        </a>
                                        <a href="mailto:e.noufissa@makerlab.academy" className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-bold transition-all">
                                            <LucideIcons.Mail size={16} /> Email
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* General Makerspace Info */}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-orange-500/50 transition-colors">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <LucideIcons.Wrench size={100} />
                            </div>
                            <div className="flex items-start gap-4 relative z-10">
                                <div className="w-14 h-14 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 border border-orange-500/30 shrink-0">
                                    <LucideIcons.PhoneCall size={28} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-white">Makerspace Fix</h3>
                                    <p className="text-orange-400 text-xs font-bold uppercase tracking-wider mb-2">General Inquiries</p>
                                    <p className="text-slate-400 text-sm mb-4">For general questions or urgent matters.</p>

                                    <div className="flex flex-wrap gap-3">
                                        <a href="tel:0520990202" className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-orange-600 hover:text-white text-slate-300 rounded-xl text-sm font-bold transition-all">
                                            <LucideIcons.Phone size={16} /> Call Fix: 05 20 99 02 02
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 p-6 bg-slate-900/50 rounded-2xl border border-slate-800 text-center">
                            <p className="text-slate-500 text-sm">
                                📍 <span className="font-bold text-white">MakerLab Academy</span> • Casablanca, Morocco
                            </p>
                        </div>
                    </div>
                )
                }

                {
                    activeTab === 'finance' && (
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
                    )
                }

                {
                    activeTab === 'profile' && (
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
                    )
                }

                {
                    activeTab === 'gallery' && (
                        <div className="space-y-6">
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                                <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                    <LucideIcons.Camera className="text-pink-400" />
                                    Photo Gallery
                                </h2>
                                <p className="text-slate-400 text-sm mb-6">
                                    Memories from {activeChild.name.split(' ')[0]}'s workshops and general academy highlights.
                                </p>

                                {(() => {
                                    // Filter Logic: Show items relevant to this student OR public items (no studentId)
                                    const myPhotos = galleryItems.filter(item =>
                                        !item.studentId || item.studentId === activeChild.id
                                    );

                                    if (myPhotos.length === 0) {
                                        return (
                                            <div className="text-center py-20 bg-slate-950 rounded-xl border border-slate-800 border-dashed">
                                                <LucideIcons.Image size={48} className="mx-auto mb-4 text-slate-700" />
                                                <h3 className="text-slate-200 font-bold mb-1">No Photos Yet</h3>
                                                <p className="text-slate-500 text-sm">Check back after the next workshop!</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                {myPhotos.map(item => (
                                                    <div
                                                        key={item.id}
                                                        onClick={() => setSelectedImage(item)}
                                                        className="group relative aspect-square bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-lg hover:shadow-pink-900/20 transition-all cursor-pointer"
                                                    >
                                                        <img
                                                            src={item.url}
                                                            alt={item.caption || 'Gallery photo'}
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                                            <div className="flex items-center gap-2 text-white font-bold text-xs mb-1">
                                                                <LucideIcons.Maximize2 size={14} /> View Full
                                                            </div>
                                                            {item.caption && <p className="text-slate-300 text-xs line-clamp-1">{item.caption}</p>}

                                                            {item.studentId === activeChild.id && (
                                                                <div className="absolute top-2 right-2 bg-pink-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
                                                                    Tagged
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Lightbox Modal */}
                                            {selectedImage && (
                                                <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200">
                                                    <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800">

                                                        {/* Header */}
                                                        <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-900/50">
                                                            <h3 className="font-bold text-white max-w-[80%] truncate">
                                                                {selectedImage.caption || 'Photo Viewer'}
                                                            </h3>
                                                            <button
                                                                onClick={() => setSelectedImage(null)}
                                                                className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                                                            >
                                                                <LucideIcons.X size={24} />
                                                            </button>
                                                        </div>

                                                        {/* Image Container */}
                                                        <div className="flex-1 overflow-hidden bg-black flex items-center justify-center p-4">
                                                            <img
                                                                src={selectedImage.url}
                                                                alt={selectedImage.caption || 'Full view'}
                                                                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                                                            />
                                                        </div>

                                                        {/* Footer / Actions */}
                                                        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-between items-center">
                                                            <div className="text-xs text-slate-500">
                                                                {new Date((selectedImage.createdAt as any)?.seconds * 1000 || Date.now()).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                                            </div>

                                                            <div className="flex gap-3">
                                                                {/* Share Button (Web Share API with File) */}
                                                                <button
                                                                    onClick={async () => {
                                                                        const shareData = {
                                                                            title: 'MakerLab Photo',
                                                                            text: selectedImage.caption || 'Check out this photo from MakerLab!',
                                                                        };

                                                                        if (navigator.share) {
                                                                            try {
                                                                                // Attempt to fetch and share FILE
                                                                                const response = await fetch(selectedImage.url);
                                                                                const blob = await response.blob();
                                                                                const file = new File([blob], "makerlab-photo.jpg", { type: blob.type });

                                                                                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                                                                                    await navigator.share({
                                                                                        ...shareData,
                                                                                        files: [file]
                                                                                    });
                                                                                } else {
                                                                                    // Fallback to URL if files not supported
                                                                                    await navigator.share({
                                                                                        ...shareData,
                                                                                        url: selectedImage.url
                                                                                    });
                                                                                }
                                                                            } catch (err) {
                                                                                console.error('Share failed, trying link fallback:', err);
                                                                                // Final Fallback: URL share
                                                                                try {
                                                                                    await navigator.share({
                                                                                        ...shareData,
                                                                                        url: selectedImage.url
                                                                                    });
                                                                                } catch (fallbackErr) {
                                                                                    // Clipboard Fallback
                                                                                    navigator.clipboard.writeText(selectedImage.url);
                                                                                    alert("Link copied to clipboard!");
                                                                                }
                                                                            }
                                                                        } else {
                                                                            // Fallback: Copy Link
                                                                            navigator.clipboard.writeText(selectedImage.url);
                                                                            alert("Link copied to clipboard!");
                                                                        }
                                                                    }}
                                                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all"
                                                                >
                                                                    <LucideIcons.Share2 size={16} /> Share
                                                                </button>

                                                                {/* Download Button */}
                                                                <a
                                                                    href={selectedImage.url}
                                                                    download={`makerlab-photo-${selectedImage.id}.jpg`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-sm font-bold transition-all border border-slate-700"
                                                                >
                                                                    <LucideIcons.Download size={16} /> Download
                                                                </a>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    )
                }

                {
                    activeTab === 'pickup' && (
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
                    )
                }

                {/* Footer */}
                <div className="text-center text-slate-500 text-xs pb-8 pt-4 space-y-2 border-t border-slate-800/50">
                    <p className="font-bold text-slate-400">{settings.academyName}</p>
                    <p>Questions? Contact us: {settings.receiptContact}</p>
                </div>

                {isProjectModalOpen && selectedProject && (
                    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950 animate-in fade-in duration-300">
                        <ProjectDetailsEnhanced
                            project={selectedProject}
                            role="parent"
                            onBack={handleCloseProject}
                        />
                    </div>
                )}
            </main >
        </div >
    );
};