
import React, { useState, useMemo } from 'react';
import { LayoutDashboard, Calendar, DollarSign, Briefcase, Users, UserPlus, Zap, BookOpen, CreditCard, Activity, CheckCircle2, ChevronRight, Hourglass, Building, ClipboardCheck, CalendarCheck, BarChart3, Filter, Phone, MessageCircle, ArrowUpRight, CheckSquare, PieChart, Megaphone, Clock, AlertTriangle, TrendingUp, ArrowRight, Trophy, Rocket, Star, Target, Award, ShieldAlert, ShieldCheck, Info } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, getDaysDifference, formatDate, getUpcomingBirthdays } from '../utils/helpers';
import { db } from '../services/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { AtlasActionButton, AtlasCommandHeader, AtlasEmptyState, AtlasSectionHeader, AtlasSignalCard, AtlasToolbar } from '../components/atlas/AtlasSurface';

// --- HELPER: Safe Date Conversion ---
const getDate = (date: any): Date => {
    if (!date) return new Date();
    // Handle Firestore Timestamp via Duck Typing (safer than instanceof)
    if (typeof date === 'object' && typeof date.toDate === 'function') {
        return date.toDate();
    }
    // Handle String or Number
    const d = new Date(date);
    return isNaN(d.getTime()) ? new Date() : d;
};

const iconTone = {
    emerald: {
        light: 'bg-emerald-50 text-emerald-600',
        dark: 'bg-emerald-500/10 text-emerald-400'
    },
    blue: {
        light: 'bg-sky-50 text-sky-600',
        dark: 'bg-sky-500/10 text-sky-400'
    },
    pink: {
        light: 'bg-pink-50 text-pink-600',
        dark: 'bg-pink-500/10 text-pink-400'
    },
    purple: {
        light: 'bg-violet-50 text-violet-600',
        dark: 'bg-violet-500/10 text-violet-400'
    },
    slate: {
        light: 'bg-slate-100 text-slate-600',
        dark: 'bg-slate-800 text-slate-400'
    }
};

const alertTone: Record<string, { row: string; icon: string; title: string; subtitle: string; action: string }> = {
    finance: {
        row: 'bg-rose-950/10 border-rose-900/30 hover:bg-rose-900/20',
        icon: 'bg-rose-500/10 text-rose-400',
        title: 'text-rose-300',
        subtitle: 'text-rose-200/60',
        action: 'bg-rose-500 text-rose-950'
    },
    rose: {
        row: 'bg-rose-950/10 border-rose-900/30 hover:bg-rose-900/20',
        icon: 'bg-rose-500/10 text-rose-400',
        title: 'text-rose-300',
        subtitle: 'text-rose-200/60',
        action: 'bg-rose-500 text-rose-950'
    },
    red: {
        row: 'bg-red-950/10 border-red-900/30 hover:bg-red-900/20',
        icon: 'bg-red-500/10 text-red-400',
        title: 'text-red-300',
        subtitle: 'text-red-200/60',
        action: 'bg-red-500 text-red-950'
    },
    purple: {
        row: 'bg-amber-300/[0.04] border-amber-300/15 hover:bg-amber-300/[0.08]',
        icon: 'bg-amber-300/10 text-amber-200',
        title: 'text-amber-100',
        subtitle: 'text-amber-200/60',
        action: 'bg-amber-300 text-slate-950'
    },
    pink: {
        row: 'bg-teal-300/[0.04] border-teal-300/15 hover:bg-teal-300/[0.08]',
        icon: 'bg-teal-300/10 text-teal-200',
        title: 'text-teal-100',
        subtitle: 'text-teal-200/60',
        action: 'bg-teal-400 text-slate-950'
    },
    orange: {
        row: 'bg-amber-300/[0.04] border-amber-300/15 hover:bg-amber-300/[0.08]',
        icon: 'bg-amber-300/10 text-amber-200',
        title: 'text-amber-100',
        subtitle: 'text-amber-200/60',
        action: 'bg-amber-300 text-slate-950'
    },
    slate: {
        row: 'bg-slate-950 border-slate-800 hover:bg-slate-900',
        icon: 'bg-slate-800 text-slate-400',
        title: 'text-slate-300',
        subtitle: 'text-slate-500',
        action: 'bg-slate-800 text-slate-300'
    }
};

const badgeTone: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    amber: 'bg-amber-100 text-amber-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    sky: 'bg-sky-100 text-sky-600',
    violet: 'bg-violet-100 text-violet-600',
    pink: 'bg-pink-100 text-pink-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    slate: 'bg-slate-100 text-slate-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    cyan: 'bg-cyan-100 text-cyan-600',
    rose: 'bg-rose-100 text-rose-600',
    green: 'bg-green-100 text-green-600',
    teal: 'bg-teal-100 text-teal-600'
};

const getIconTone = (color: keyof typeof iconTone | string, mode: 'light' | 'dark') => {
    const tone = iconTone[color as keyof typeof iconTone] || iconTone.slate;
    return tone[mode];
};

// --- STUDENT DASHBOARD COMPONENT ---
const StudentDashboard = () => {
    const { students, enrollments, studentProjects, navigateTo, t, badges } = useAppContext();
    const { userProfile } = useAuth();

    // Safe name extraction
    const firstName = userProfile?.name ? userProfile.name.split(' ')[0] : 'User';
    const currentHour = new Date().getHours();
    const greeting = currentHour < 12 ? t('dash.welcome') : currentHour < 18 ? t('dash.welcome.afternoon') : t('dash.welcome.evening');

    const currentStudent = useMemo(() => {
        if (!userProfile) return null;
        // Match by email or UID linkage if available
        return students.find(s => s.email === userProfile.email || s.loginInfo?.email === userProfile.email);
    }, [students, userProfile]);

    // Calculate Student Stats
    const myEnrollments = useMemo(() => {
        if (!currentStudent) return [];
        return enrollments.filter(e => e.studentId === currentStudent.id && e.status === 'active');
    }, [enrollments, currentStudent]);

    const myProjects = useMemo(() => {
        if (!currentStudent) return [];
        return studentProjects.filter(p => p.studentId === currentStudent.id);
    }, [studentProjects, currentStudent]);

    const publishedProjects = useMemo(() => myProjects.filter(p => p.status === 'published'), [myProjects]);

    const xp = publishedProjects.length * 150 + myProjects.length * 50;
    const level = Math.floor(xp / 500) + 1;
    const progress = ((xp % 500) / 500) * 100;

    // Find Next Class
    const todaysClass = useMemo(() => {
        const today = new Date();
        const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
        // Simple next class logic (looking for today's class)
        return myEnrollments.find(e => e.groupTime?.includes(dayName) || e.secondGroupTime?.includes(dayName));
    }, [myEnrollments]);

    // --- ANNOUNCEMENTS LOGIC ---
    const [recentAnnouncements, setRecentAnnouncements] = React.useState<any[]>([]);
    React.useEffect(() => {
        if (!db) return;
        const fetchNews = async () => {
            try {
                const q = query(collection(db as any, 'announcements'), orderBy('createdAt', 'desc'), limit(3));
                const snap = await getDocs(q);
                // TODO: filtering logic based on targetAudience could optionally go here or be processed
                setRecentAnnouncements(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
            } catch (e) { console.error(e); }
        };
        fetchNews();
    }, []);

    return (
        <div className="space-y-8 pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4">

            {/* Announcements Ticker/Banner if any */}
            {recentAnnouncements.length > 0 && (
                <div className="relative overflow-hidden rounded-lg border border-amber-300/20 bg-amber-300/[0.06] p-4 text-white">
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="p-2 bg-white/20 rounded-full animate-pulse">
                            <Megaphone size={20} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-sm">Latest News: {recentAnnouncements[0].title}</h3>
                            <p className="line-clamp-1 text-xs text-amber-100/70">{recentAnnouncements[0].content}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Student Hero */}
            <div className="group relative overflow-hidden rounded-lg border border-white/10 bg-slate-900/80">
                <div className="hidden"></div>
                <div className="hidden"></div>

                <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                    <div className="relative">
                        <div className="h-24 w-24 rounded-lg border border-white/10 bg-slate-950 p-1 md:h-28 md:w-28">
                            <div className="flex h-full w-full items-center justify-center rounded-lg bg-slate-950 text-4xl font-black text-amber-200">
                                {firstName.charAt(0)}
                            </div>
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-[#FFC107] text-[#2D2B6B] text-xs font-bold px-3 py-1 rounded-full border-4 border-white shadow-sm flex items-center gap-1">
                            <Star size={12} fill="currentColor" /> Lvl {level}
                        </div>
                    </div>

                    <div className="flex-1">
                        <h1 className="text-3xl md:text-4xl font-bold text-[#2D2B6B] mb-2">{greeting}, {firstName}!</h1>
                        <p className="text-slate-500 max-w-xl italic mb-6">"Every great maker started with a single idea. What will you build today?"</p>

                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                                <Trophy size={18} className="text-[#FFC107] fill-current" />
                                <span className="text-[#2D2B6B] font-bold text-sm">{xp} XP</span>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                                <Rocket size={18} className="text-teal-500" />
                                <span className="text-[#2D2B6B] font-bold text-sm">{publishedProjects.length} Shipped</span>
                            </div>
                        </div>

                        {/* XP Bar */}
                        <div className="mt-6 max-w-md mx-auto md:mx-0">
                            <div className="flex justify-between text-[10px] text-slate-400 mb-2 uppercase font-bold tracking-wider">
                                <span>Progress to Level {level + 1}</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                <div className="h-full bg-amber-300 transition-[width] duration-500" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Up Next Card - Cyan Accent */}
                <div className="group relative flex flex-col justify-between overflow-hidden rounded-lg border border-teal-300/20 bg-slate-900/80 p-5 transition-colors hover:border-teal-300/40">
                    <div className="hidden"><CalendarCheck size={100} /></div>
                    <div>
                        <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-300"><Clock size={14} /> Up Next</h3>
                        {todaysClass ? (
                            <>
                                <div className="text-2xl font-bold text-[#2D2B6B] mb-1">{todaysClass.programName}</div>
                                <div className="text-sm font-medium text-teal-300">{todaysClass.gradeName}</div>
                                <div className="mt-4 inline-block rounded-lg border border-teal-300/20 bg-teal-300/10 px-3 py-1 text-xs font-bold text-teal-200">
                                    Today @ {todaysClass.groupTime?.split(' ').slice(1).join(' ')}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="text-xl font-bold text-[#2D2B6B] mb-1">No classes today</div>
                                <div className="text-slate-500 text-sm">Enjoy your free time to build!</div>
                            </>
                        )}
                    </div>
                    <button onClick={() => navigateTo('learning')} className="mt-6 w-full rounded-lg border border-teal-300/30 bg-teal-500 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-teal-400">View Schedule</button>
                </div>

                {/* My Studio Status */}
                <div className="group relative flex flex-col justify-between overflow-hidden rounded-lg border border-teal-300/20 bg-teal-300/[0.06] p-5 text-white transition-colors hover:bg-teal-300/[0.09]">
                    <div className="hidden"><Target size={100} /></div>
                    <div>
                        <h3 className="text-white/80 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2"><BookOpen size={14} /> My Studio</h3>
                        <div className="text-3xl font-black text-white mb-1">{myProjects.length} Projects</div>
                        <div className="text-white/70 text-sm">
                            {myProjects.some(p => p.status === 'planning' || p.status === 'building' || p.status === 'submitted') ? 'Work in progress...' : 'All caught up!'}
                        </div>
                    </div>
                    <button onClick={() => navigateTo('learning')} className="mt-6 w-full py-3 bg-[#FFC107] hover:bg-amber-400 text-[#2D2B6B] rounded-xl text-sm font-bold transition-colors shadow-lg">Go to Studio</button>
                </div>

                {/* Toolkit Quick Link - Orange Accent */}
                <div className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-lg border border-white/10 bg-slate-900/80 p-5 transition-colors hover:border-amber-300/30" onClick={() => navigateTo('toolkit')}>
                    <div className="hidden"><Zap size={100} /></div>
                    <div>
                        <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-200"><Zap size={14} /> Resources</h3>
                        <div className="text-2xl font-bold text-[#2D2B6B] mb-1">Toolkit</div>
                        <div className="text-slate-500 text-sm">Software, guides & assets</div>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-300/20 bg-amber-300/10 text-amber-200 transition-colors group-hover:bg-amber-300 group-hover:text-slate-950">
                            <ArrowRight size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Up Next - Cyan Accent */}
            <div className="group rounded-lg border border-white/10 bg-slate-900/80 p-5 transition-colors hover:border-teal-300/30">
                <div className="hidden"></div>
                <h2 className="text-xl font-bold text-[#2D2B6B] mb-6 flex items-center gap-3 relative z-10">
                    <div className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-2">
                        <Clock size={24} className="text-teal-300" />
                    </div>
                    Up Next
                </h2>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-[#2D2B6B] text-xl">Recent Projects</h3>
                    <button onClick={() => navigateTo('learning')} className="text-sm font-bold text-teal-300 hover:text-teal-200">View All</button>
                </div>
                {publishedProjects.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-white/10 bg-slate-950/50 py-12 text-center text-sm text-slate-400">
                        No published projects yet. Keep building! 🚀
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {publishedProjects.slice(0, 4).map(p => (
                            <div key={p.id} className="group flex cursor-pointer gap-4 rounded-lg border border-white/10 bg-slate-950/50 p-4 transition-colors hover:border-teal-300/30">
                                <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                                    {p.mediaUrls?.[0] ? <img src={p.mediaUrls[0]} className="h-full w-full object-cover" alt={p.title} /> : <BookOpen size={24} className="text-slate-300" />}
                                </div>
                                <div className="min-w-0 flex flex-col justify-center flex-1">
                                    <h4 className="font-bold text-[#2D2B6B] text-sm truncate">{p.title}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <p className="text-xs text-slate-500 truncate flex-1">{formatDate(p.createdAt)}</p>
                                        {/* Badges Display */}
                                        {p.earnedBadgeIds && p.earnedBadgeIds.length > 0 && (
                                            <div className="flex -space-x-2">
                                                {p.earnedBadgeIds.map(bid => {
                                                    const badge = badges.find(b => b.id === bid);
                                                    if (!badge) return null;
                                                    return (
                                                        <div key={bid} className={`w-5 h-5 rounded-full border border-white flex items-center justify-center text-[10px] ${badgeTone[badge.color] || badgeTone.slate}`} title={badge.name}>
                                                            <Award size={10} />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const AtlasStudentDashboard = () => {
    const { students, enrollments, studentProjects, navigateTo, t } = useAppContext();
    const { userProfile } = useAuth();
    const firstName = userProfile?.name?.split(' ')[0] || 'Maker';
    const currentHour = new Date().getHours();
    const greeting = currentHour < 12 ? t('dash.welcome') : currentHour < 18 ? t('dash.welcome.afternoon') : t('dash.welcome.evening');
    const currentStudent = useMemo(() => students.find(student => student.email === userProfile?.email || student.loginInfo?.email === userProfile?.email), [students, userProfile]);
    const myEnrollments = useMemo(() => currentStudent ? enrollments.filter(enrollment => enrollment.studentId === currentStudent.id && enrollment.status === 'active') : [], [enrollments, currentStudent]);
    const myProjects = useMemo(() => currentStudent ? studentProjects.filter(project => project.studentId === currentStudent.id) : [], [studentProjects, currentStudent]);
    const publishedProjects = useMemo(() => myProjects.filter(project => project.status === 'published'), [myProjects]);
    const activeProjectCount = myProjects.filter(project => ['planning', 'building', 'submitted'].includes(project.status)).length;
    const xp = publishedProjects.length * 150 + myProjects.length * 50;
    const level = Math.floor(xp / 500) + 1;
    const progress = ((xp % 500) / 500) * 100;
    const todaysClass = useMemo(() => {
        const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        return myEnrollments.find(enrollment => enrollment.groupTime?.includes(dayName) || enrollment.secondGroupTime?.includes(dayName));
    }, [myEnrollments]);
    const [announcements, setAnnouncements] = React.useState<any[]>([]);

    React.useEffect(() => {
        if (!db) return;
        const fetchNews = async () => {
            try {
                const announcementQuery = query(collection(db as any, 'announcements'), orderBy('createdAt', 'desc'), limit(3));
                const snapshot = await getDocs(announcementQuery);
                setAnnouncements(snapshot.docs.map((announcement: any) => ({ id: announcement.id, ...announcement.data() })));
            } catch (error) {
                console.error(error);
            }
        };
        void fetchNews();
    }, []);

    return (
        <div className="space-y-5 pb-24 md:pb-8">
            <AtlasCommandHeader
                eyebrow="My learning desk"
                title={`${greeting}, ${firstName}`}
                description="Your next class, active builds, achievements, and maker tools are ready in one place."
                icon={LayoutDashboard}
                badges={<span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold text-amber-200">Level {level}</span>}
                actions={<><AtlasActionButton icon={BookOpen} variant="primary" onClick={() => navigateTo('learning')}>Open studio</AtlasActionButton><AtlasActionButton icon={Zap} onClick={() => navigateTo('toolkit')}>Toolkit</AtlasActionButton></>}
            />

            {announcements.length > 0 && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-300/20 bg-amber-300/[0.06] p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-300/20 bg-amber-300/10 text-amber-200"><Megaphone size={17} /></span>
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-wider text-amber-200">Latest announcement</p>
                        <h3 className="mt-0.5 truncate text-sm font-black text-white">{announcements[0].title}</h3>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{announcements[0].content}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <AtlasSignalCard label="Maker level" value={level} detail={`${Math.round(progress)}% to level ${level + 1}`} icon={Star} tone="amber" />
                <AtlasSignalCard label="Experience" value={`${xp} XP`} detail="Earned through project work" icon={Trophy} tone="teal" />
                <AtlasSignalCard label="Active builds" value={activeProjectCount} detail={`${publishedProjects.length} projects shipped`} icon={Rocket} tone="blue" onClick={() => navigateTo('learning')} />
                <AtlasSignalCard label="Today's class" value={todaysClass ? todaysClass.programName : 'Open studio'} detail={todaysClass?.gradeName || 'No scheduled class today'} icon={CalendarCheck} tone={todaysClass ? 'teal' : 'slate'} onClick={() => navigateTo('learning')} />
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.7fr)]">
                <section className="rounded-lg border border-white/10 bg-slate-900/80 p-4 md:p-5">
                    <AtlasSectionHeader title="Recent projects" description="Pick up where you left off or revisit work you have shipped." icon={BookOpen} actions={<AtlasActionButton icon={ArrowRight} variant="quiet" onClick={() => navigateTo('learning')}>View all</AtlasActionButton>} />
                    <div className="mt-4">
                        {publishedProjects.length === 0 ? (
                            <AtlasEmptyState title="Your showcase starts here" description="Open the studio, choose a project, and publish your first build when it is ready." icon={Rocket} action={<AtlasActionButton variant="primary" icon={BookOpen} onClick={() => navigateTo('learning')}>Start building</AtlasActionButton>} />
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2">
                                {publishedProjects.slice(0, 4).map(project => (
                                    <button key={project.id} onClick={() => navigateTo('learning')} className="group flex min-w-0 items-center gap-3 rounded-lg border border-white/10 bg-slate-950/55 p-3 text-left transition-colors hover:border-teal-300/30 hover:bg-white/[0.05]">
                                        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] text-slate-500">{project.mediaUrls?.[0] ? <img src={project.mediaUrls[0]} className="h-full w-full object-cover" alt={project.title} /> : <BookOpen size={22} />}</span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-black text-white">{project.title}</span>
                                            <span className="mt-1 flex items-center gap-2 text-xs text-slate-500"><span className="truncate">{formatDate(project.createdAt)}</span>{project.earnedBadgeIds?.length > 0 && <span className="shrink-0 text-amber-200">{project.earnedBadgeIds.length} badges</span>}</span>
                                        </span>
                                        <ChevronRight size={16} className="shrink-0 text-slate-600 transition-colors group-hover:text-teal-300" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                <aside className="rounded-lg border border-white/10 bg-slate-900/80 p-4 md:p-5">
                    <AtlasSectionHeader title="Your next move" description="A focused path into today's work." icon={Target} />
                    <div className="mt-4 rounded-lg border border-teal-300/20 bg-teal-300/[0.06] p-4">
                        <p className="text-[10px] font-black uppercase tracking-wider text-teal-200">{todaysClass ? 'Scheduled today' : 'Available now'}</p>
                        <h4 className="mt-1 text-lg font-black text-white">{todaysClass?.programName || 'Independent maker time'}</h4>
                        <p className="mt-1 text-xs leading-5 text-slate-400">{todaysClass ? `${todaysClass.gradeName} | ${todaysClass.groupTime?.split(' ').slice(1).join(' ')}` : 'Use the open studio to continue an active build or start something new.'}</p>
                        <AtlasActionButton className="mt-4 w-full" variant="primary" icon={ArrowRight} onClick={() => navigateTo('learning')}>{todaysClass ? 'View schedule' : 'Open studio'}</AtlasActionButton>
                    </div>
                    <div className="mt-4">
                        <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase text-slate-500"><span>Progress to level {level + 1}</span><span>{Math.round(progress)}%</span></div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-950"><div className="h-full rounded-full bg-amber-300 transition-[width] duration-500" style={{ width: `${progress}%` }} /></div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

// --- ADMIN DASHBOARD COMPONENT ---
import { WorkshopActionCenter } from './dashboard/WorkshopActionCenter';

const AdminDashboard = ({ onRecordPayment }: { onRecordPayment: (studentId?: string) => void }) => {
    const { students, payments, enrollments, workshopTemplates, workshopSlots, attendanceRecords, tasks, leads, programs, settings, navigateTo, t, studentProjects, expenses, expenseTemplates, bookings } = useAppContext();

    const { userProfile } = useAuth();

    // Birthday Logic
    const upcomingBirthdays = useMemo(() => getUpcomingBirthdays(students, 21).slice(0, 3), [students]);

    // Safe name extraction
    const firstName = userProfile?.name ? userProfile.name.split(' ')[0] : 'User';
    const currentHour = new Date().getHours();
    const greeting = currentHour < 12 ? t('dash.welcome') : currentHour < 18 ? t('dash.welcome.afternoon') : t('dash.welcome.evening');

    // --- PENDING REVIEWS CALCULATION ---
    const pendingReviews = useMemo(() => {
        const queue: any[] = [];
        const projects = studentProjects || []; // Safety Array
        projects.forEach(proj => {
            if (!proj.steps) return; // Safety Check
            proj.steps.forEach(step => {
                if (step.status === 'PENDING_REVIEW') {
                    const student = students?.find(s => s.id === proj.studentId);
                    queue.push({
                        projectId: proj.id,
                        projectTitle: proj.title,
                        studentName: student ? `${student.name}` : 'Unknown Student',
                        step: step,
                        submittedAt: step.reviewedAt // Using this as proxy or add submittedAt if available
                    });
                }
            });
        });
        return queue;
    }, [studentProjects, students]);

    // --- THEME LOGIC ---
    const isInstructor = userProfile?.role === 'instructor';

    // Theme Classes
    const theme = {
        card: isInstructor ? "bg-white border border-slate-200 shadow-sm" : "bg-slate-900 border border-slate-800",
        cardHover: isInstructor ? "hover:border-slate-300" : "hover:border-slate-700",
        text: isInstructor ? "text-slate-800" : "text-white",
        textMuted: "text-slate-500", // Works for both usually
        textLabel: "text-slate-500",
        bgMuted: isInstructor ? "bg-slate-50 border border-slate-100" : "bg-slate-950/30 border-slate-800",
        divider: isInstructor ? "border-slate-100" : "border-slate-800",
        iconBg: (color: string) => getIconTone(color, isInstructor ? 'light' : 'dark')
    };

    // Session Management
    const [selectedSession, setSelectedSession] = useState(settings.academicYear || '2024-2025');

    // 1. Sessions
    const availableSessions = useMemo(() => {
        const sessions = new Set<string>();
        if (settings.academicYear) sessions.add(settings.academicYear);
        payments.forEach(p => { if (p.session) sessions.add(p.session); });
        return Array.from(sessions).sort().reverse();
    }, [payments, settings.academicYear]);

    // 2. Financial Stats (Session Scoped)
    const sessionPayments = useMemo(() => {
        return payments.filter(p => {
            if (p.session) return p.session === selectedSession;
            return selectedSession === settings.academicYear;
        });
    }, [payments, selectedSession, settings.academicYear]);

    // Chart Data
    const financialStats = useMemo(() => {
        const today = new Date();
        const last6Months = Array.from({ length: 6 }, (_, i) => {
            const d = new Date(today.getFullYear(), today.getMonth() - 5 + i, 1);
            return { month: d.toLocaleString('default', { month: 'short' }), year: d.getFullYear(), value: 0 };
        });

        let totalRevenue = 0;
        sessionPayments.forEach(p => {
            if (!['paid', 'verified'].includes(p.status)) return;
            totalRevenue += p.amount;

            const pDate = getDate(p.date);
            if (isNaN(pDate.getTime())) return;

            const monthIndex = last6Months.findIndex(m => m.month === pDate.toLocaleString('default', { month: 'short' }) && m.year === pDate.getFullYear());
            if (monthIndex !== -1) last6Months[monthIndex].value += p.amount;
        });

        const maxRevenue = Math.max(...last6Months.map(m => m.value), 1);
        return { chartData: last6Months, maxRevenue, totalRevenue };
    }, [sessionPayments]);

    // 3. Today's Schedule (Classes & Workshops)
    const todaySchedule = useMemo(() => {
        const today = new Date();
        const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
        const dateStr = today.toISOString().split('T')[0];

        // A. Regular Classes
        const classes = enrollments
            .filter(e => e.status === 'active' && (e.groupTime?.includes(dayName) || e.secondGroupTime?.includes(dayName)))
            .reduce((acc, curr) => {
                // Determine which slot is today
                let time = "", group = "", type = "";
                if (curr.groupTime?.includes(dayName)) { time = curr.groupTime.replace(dayName, '').trim(); group = `${curr.programName} - ${curr.groupName}`; type = 'class'; }
                else if (curr.secondGroupTime?.includes(dayName)) { time = curr.secondGroupTime.replace(dayName, '').trim(); group = `${curr.programName} (DIY) - ${curr.secondGroupName}`; type = 'diy'; }

                const key = `${time}-${group}`;
                if (!acc[key]) acc[key] = { time, title: group, type, count: 0, students: [] };
                acc[key].count++;
                return acc;
            }, {} as Record<string, any>);

        // B. Workshops
        const workshops = workshopSlots
            .filter(s => s.date === dateStr)
            .map(s => {
                const template = workshopTemplates.find(t => t.id === s.workshopTemplateId);
                return {
                    time: s.startTime,
                    title: template?.title || 'Workshop',
                    type: 'workshop',
                    count: s.bookedCount,
                    capacity: s.capacity
                };
            });

        return [...Object.values(classes), ...workshops].sort((a, b) => a.time.localeCompare(b.time));
    }, [enrollments, workshopSlots, workshopTemplates]);

    // 4. Alerts & Actionable Items
    const checksToDeposit = sessionPayments.filter(p => p.status === 'check_received').length;
    const pendingTransfers = sessionPayments.filter(p => p.status === 'pending_verification').length;
    const myTasks = tasks.filter(t => t.assignedTo === userProfile?.uid && t.status !== 'done');
    const newLeads = leads.filter(l => l.status === 'new').length;

    const totalPendingActions = checksToDeposit + pendingTransfers + myTasks.length;
    const actionHealth = Math.max(0, 100 - (totalPendingActions * 10));

    // 5. Active Students Trend
    const activeStudentsCount = students.filter(s => s.status === 'active').length;
    const newStudentsThisMonth = students.filter(s => {
        const d = getDate(s.createdAt);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    // 6. Lead Sparkline Data (Last 7 Days)
    const leadTrendData = useMemo(() => {
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - 6 + i);
            d.setHours(0, 0, 0, 0);
            return d;
        });

        return last7Days.map(day => {
            const count = leads.filter(l => {
                const ld = getDate(l.createdAt);
                ld.setHours(0, 0, 0, 0);
                return ld.getTime() === day.getTime();
            }).length;
            return count;
        });
    }, [leads]);

    // --- ENHANCED ACTION CENTER ALERTS ---
    const actionAlerts = useMemo(() => {
        const alerts = [];

        // 1. Finance Alerts (Unpaid Recurring Bills)
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const unpaidBills = expenseTemplates.filter(t => {
            if (!t.recurring) return false;
            const isPaid = expenses.some(e =>
                e.templateId === t.id &&
                e.date.startsWith(currentMonth) &&
                e.session === selectedSession
            );
            return !isPaid;
        });
        if (unpaidBills.length > 0) {
            alerts.push({
                type: 'finance',
                count: unpaidBills.length,
                label: 'Unpaid Bills',
                subLabel: 'Recurring expenses due',
                route: 'finance', // Redirect to finance
                color: 'rose',
                icon: DollarSign
            });
        }

        // 2. Lead Alerts
        const staleLeads = leads.filter(l => {
            const created = getDate(l.createdAt);
            const diffDays = getDaysDifference(created, new Date());
            return l.status === 'new' && diffDays > 2;
        });
        if (staleLeads.length > 0) {
            alerts.push({
                type: 'leads',
                count: staleLeads.length,
                label: 'Stale Leads',
                subLabel: '> 2 days without contact',
                route: 'marketing',
                color: 'purple',
                icon: Megaphone
            });
        }

        // 3. Absence Alerts (Risk)
        const atRiskStudents = students.filter(s => {
            if (s.status !== 'active') return false;
            // Get last 2 records
            const myRecords = attendanceRecords
                .filter(r => r.studentId === s.id)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 2);

            return myRecords.length >= 2 && myRecords.every(r => r.status === 'absent');
        });
        if (atRiskStudents.length > 0) {
            alerts.push({
                type: 'absence',
                count: atRiskStudents.length,
                label: 'At-Risk Students',
                subLabel: '2+ consecutive absences',
                route: 'attendance',
                color: 'red',
                icon: AlertTriangle
            });
        }

        // 4. Workshop Feedback (Parents with 2+ attended workshops)
        // Group bookings by parent phone -> count attended
        const parentAttendance: Record<string, number> = {};
        bookings.forEach(b => {
            if (b.status === 'attended') {
                parentAttendance[b.phoneNumber] = (parentAttendance[b.phoneNumber] || 0) + 1;
            }
        });
        const feedbackPendingCount = Object.values(parentAttendance).filter(count => count >= 2).length;
        if (feedbackPendingCount > 0) {
            alerts.push({
                type: 'workshop',
                count: feedbackPendingCount,
                label: 'Feedback Calls',
                subLabel: 'Parents with 2+ workshops',
                route: 'workshops',
                color: 'pink',
                icon: Phone
            });
        }

        // 5. Program Progress
        const stagnantPrograms = programs.filter(p => {
            const created = getDate(p.createdAt || new Date());
            const age = getDaysDifference(created, new Date());
            const hasStudents = enrollments.some(e => e.programId === p.id);
            return age > 7 && !hasStudents;
        });
        if (stagnantPrograms.length > 0) {
            alerts.push({
                type: 'program',
                count: stagnantPrograms.length,
                label: 'Stagnant Programs',
                subLabel: 'No enrollments > 7 days',
                route: 'classes',
                color: 'blue',
                icon: Rocket
            });
        }

        // 6. Pending Enrollments (from Forms)
        const pendingEnrollments = leads.filter(l => (l.status === 'new' || l.status === 'interested') && l.source === 'Kiosk Form');
        if (pendingEnrollments.length > 3) {
            alerts.push({
                type: 'enrollment',
                count: pendingEnrollments.length,
                label: 'Pending Enrollments',
                subLabel: 'New applications waiting',
                route: 'enrollment-forms',
                params: { filter: 'waiting' },
                color: 'emerald',
                icon: UserPlus
            });
        } else {
            pendingEnrollments.forEach(lead => {
                alerts.push({
                    type: 'enrollment',
                    count: 1,
                    label: `Enroll ${lead.name.split(' ')[0]}`,
                    subLabel: lead.interests?.[0] ? `For ${lead.interests[0]}` : 'New Application',
                    route: 'enrollment-forms',
                    params: { filter: 'waiting' },
                    color: 'emerald',
                    icon: UserPlus
                });
            });
        }

        return alerts;

    }, [expenses, expenseTemplates, leads, students, attendanceRecords, programs, enrollments, selectedSession, bookings]);

    // --- DATA QUALITY GUARD ---
    // Flags students who are registered but have incomplete setup after 7 days.
    // Rules:
    //  1. Student has NO active enrollment (registered but never enrolled)
    //  2. Student has enrollment but ZERO payments after 7 days (paidAmount = 0)
    //  3. Student missing critical contact info (no parentPhone)
    //  4. Enrollment missing group assignment (no groupId)
    const incompleteStudents = useMemo(() => {
        const now = new Date();
        const GRACE_DAYS = 7; // days before we start alerting

        return students
            .filter(s => s.status === 'active')
            .map(student => {
                const issues: string[] = [];
                const createdDate = getDate(student.createdAt);
                const ageDays = getDaysDifference(createdDate, now);
                const isOldEnough = ageDays >= GRACE_DAYS;

                const activeEnrollments = enrollments.filter(
                    e => e.studentId === student.id && e.status === 'active'
                );

                // Issue 1: No enrollment at all (after grace period)
                if (isOldEnough && activeEnrollments.length === 0) {
                    issues.push('No enrollment');
                }

                // Issue 2: Missing parent phone (always critical)
                if (!student.parentPhone) {
                    issues.push('No contact phone');
                }

                // Per-enrollment checks
                activeEnrollments.forEach(enroll => {
                    const enrollAge = getDaysDifference(getDate(enroll.createdAt), now);

                    // Issue 3: Zero payments after grace period
                    if (enrollAge >= GRACE_DAYS && (enroll.paidAmount || 0) === 0 && (enroll.totalAmount || 0) > 0) {
                        if (!issues.includes('No payment recorded')) {
                            issues.push('No payment recorded');
                        }
                    }

                    // Issue 4: Enrollment has no group assigned
                    if (!enroll.groupId || !enroll.groupName) {
                        if (!issues.includes('No group assigned')) {
                            issues.push('No group assigned');
                        }
                    }

                    // Issue 5: No payment plan set
                    if (!enroll.paymentPlan) {
                        if (!issues.includes('No payment plan')) {
                            issues.push('No payment plan');
                        }
                    }
                });

                return { student, issues, ageDays };
            })
            .filter(item => item.issues.length > 0)
            .sort((a, b) => b.issues.length - a.issues.length); // most broken first
    }, [students, enrollments]);

    const dataQualityScore = useMemo(() => {
        const total = students.filter(s => s.status === 'active').length;
        if (total === 0) return 100;
        return Math.max(0, Math.round(((total - incompleteStudents.length) / total) * 100));
    }, [students, incompleteStudents]);

    const totalActiveAlerts = actionAlerts.reduce((sum, a) => sum + a.count, 0) + totalPendingActions + incompleteStudents.length;
    const alertHealth = Math.max(0, 100 - (totalActiveAlerts * 5));


    return (
        <div className="space-y-6 pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4">
            <AtlasCommandHeader
                eyebrow="Home operations"
                title={`${greeting}, ${firstName}`}
                description={`Your live service desk for ${settings.academyName}: today's sessions, financial follow-up, families, and learning operations.`}
                icon={LayoutDashboard}
                badges={<><span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-slate-300">{selectedSession}</span><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${totalActiveAlerts > 0 ? 'border-amber-300/20 bg-amber-300/10 text-amber-200' : 'border-teal-300/20 bg-teal-300/10 text-teal-200'}`}>{totalActiveAlerts} open actions</span></>}
                actions={<><AtlasActionButton icon={CreditCard} variant="primary" onClick={() => onRecordPayment()}>Record payment</AtlasActionButton><AtlasActionButton icon={UserPlus} onClick={() => navigateTo('students')}>Add student</AtlasActionButton></>}
            />

            <AtlasToolbar
                leading={
                    <label className="relative block min-w-[170px]">
                        <Filter size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <select value={selectedSession} onChange={event => setSelectedSession(event.target.value)} className="h-10 w-full appearance-none rounded-lg border border-white/10 bg-slate-950 pl-9 pr-8 text-sm font-bold text-white outline-none focus:border-teal-400/60">
                            {availableSessions.map(session => <option key={session} value={session}>{session}</option>)}
                        </select>
                    </label>
                }
                trailing={<><AtlasActionButton icon={Megaphone} variant="quiet" onClick={() => navigateTo('marketing')}>Add lead</AtlasActionButton><AtlasActionButton icon={CheckSquare} variant="quiet" onClick={() => navigateTo('team')}>New task</AtlasActionButton><AtlasActionButton icon={MessageCircle} variant="quiet" onClick={() => navigateTo('communications')}>Message</AtlasActionButton></>}
            >
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-400"><ShieldCheck size={13} className="text-teal-300" /> Tenant scoped</span>
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-400"><Activity size={13} className="text-amber-200" /> {todaySchedule.length} sessions today</span>
            </AtlasToolbar>

            {checksToDeposit > 0 && <button onClick={() => navigateTo('finance', { filter: 'check_received' })} className="flex w-full items-center justify-between rounded-lg border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3 text-left text-sm font-bold text-amber-200 transition-colors hover:bg-amber-300/10"><span className="flex items-center gap-2"><AlertTriangle size={16} /> {checksToDeposit} checks are ready to deposit</span><ArrowRight size={15} /></button>}

            {/* WORKSHOP ACTION CENTER */}
            <WorkshopActionCenter />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <AtlasSignalCard label="Session revenue" value={formatCurrency(financialStats.totalRevenue)} detail="Paid and verified receipts" icon={DollarSign} tone="teal" onClick={() => navigateTo('finance')} />
                <AtlasSignalCard label="Active students" value={activeStudentsCount} detail={`+${newStudentsThisMonth} this month`} icon={Users} tone="blue" onClick={() => navigateTo('students')} />
                <AtlasSignalCard label="Attendance today" value={`${todaySchedule.length > 0 ? Math.round((attendanceRecords.filter(record => record.date === new Date().toISOString().split('T')[0]).length / (todaySchedule.reduce((total, item) => total + (item.type === 'class' ? 10 : item.count), 0) || 1)) * 100) : 0}%`} detail={`${todaySchedule.length} scheduled sessions`} icon={ClipboardCheck} tone="emerald" onClick={() => navigateTo('attendance')} />
                <AtlasSignalCard label="Operations health" value={`${alertHealth}%`} detail={`${totalActiveAlerts} open actions`} icon={Activity} tone={alertHealth > 75 ? 'emerald' : alertHealth > 45 ? 'amber' : 'red'} />
            </div>

            {/* KPI CARDS */}
            <div className="hidden">
                {/* Revenue */}
                <div className={`min-w-[260px] md:min-w-0 p-5 rounded-lg flex flex-col justify-between snap-center ${theme.card}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Revenue</p>
                            <h3 className={`text-2xl font-bold mt-1 ${theme.text}`}>{formatCurrency(financialStats.totalRevenue)}</h3>
                        </div>
                        <div className={`p-2 rounded-lg ${theme.iconBg('emerald')}`}><DollarSign size={20} /></div>
                    </div>
                    <div className="mt-4 h-10 flex items-end gap-1">
                        {financialStats.chartData.map((d, i) => (
                            <div key={i} className={`flex-1 rounded-t transition-colors ${isInstructor ? 'bg-teal-100 hover:bg-teal-200' : 'bg-slate-800 hover:bg-teal-500/50'}`} style={{ height: `${(d.value / financialStats.maxRevenue) * 100}%` }} title={`${d.month}: ${formatCurrency(d.value)}`}></div>
                        ))}
                    </div>
                </div>

                {/* Active Students */}
                <div className={`min-w-[260px] md:min-w-0 p-5 rounded-lg flex flex-col justify-between snap-center ${theme.card}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Students</p>
                            <h3 className={`text-2xl font-bold mt-1 ${theme.text}`}>{activeStudentsCount}</h3>
                        </div>
                        <div className={`p-2 rounded-lg ${theme.iconBg('blue')}`}><Users size={20} /></div>
                    </div>
                    <div className={`mt-4 flex w-fit items-center rounded-lg px-2 py-1 text-xs ${isInstructor ? 'bg-teal-100 text-teal-700' : 'bg-teal-950/30 text-teal-300'}`}>
                        <ArrowUpRight size={12} className="mr-1" /> +{newStudentsThisMonth} this month
                    </div>
                </div>

                {/* Attendance Rate */}
                <div className={`min-w-[260px] md:min-w-0 p-5 rounded-lg flex flex-col justify-between snap-center ${theme.card}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Attendance</p>
                            <h3 className={`text-2xl font-bold mt-1 ${theme.text}`}>
                                {todaySchedule.length > 0 ? Math.round((attendanceRecords.filter(r => r.date === new Date().toISOString().split('T')[0]).length / (todaySchedule.reduce((a, b) => a + (b.type === 'class' ? 10 : b.count), 0) || 1)) * 100) : 0}%
                            </h3>
                        </div>
                        <div className={`p-2 rounded-lg ${theme.iconBg('pink')}`}><ClipboardCheck size={20} /></div>
                    </div>
                    <p className="text-xs text-slate-500 mt-4">{todaySchedule.length} sessions today</p>
                </div>

                {/* Leads */}
                <div onClick={() => navigateTo('marketing')} className={`min-w-[260px] md:min-w-0 p-5 rounded-lg flex flex-col justify-between snap-center cursor-pointer transition-colors group ${theme.card} ${theme.cardHover}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 transition-colors group-hover:text-amber-200">New Leads</p>
                            <h3 className={`text-2xl font-bold mt-1 ${theme.text}`}>{newLeads}</h3>
                        </div>
                        <div className={`p-2 rounded-lg ${theme.iconBg('purple')}`}><Megaphone size={20} /></div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                        <span>Pipeline Active</span>
                        <ChevronRight size={14} />
                    </div>
                </div>
            </div>

            {/* DESKTOP GRID LAYOUT */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

                {/* LEFT COLUMN: SCHEDULE & FINANCE */}
                <div className="space-y-5 lg:col-span-2">

                    {/* Today's Schedule */}
                    <div className="overflow-hidden rounded-lg border border-white/10 bg-slate-900/80">
                        <div className="p-4 md:p-5"><AtlasSectionHeader title="Today's schedule" description="Classes and workshops that need the team today." icon={Clock} actions={<AtlasActionButton variant="quiet" icon={ArrowRight} onClick={() => navigateTo('attendance')}>Manage attendance</AtlasActionButton>} /></div>
                        <div className="p-4">
                            {todaySchedule.length === 0 ? (
                                <AtlasEmptyState title="The schedule is clear" description="No classes or workshops are scheduled today." icon={Calendar} />
                            ) : (
                                <div className="space-y-3">
                                    {todaySchedule.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-950/50 p-3 transition-colors hover:border-teal-300/20">
                                            <div className="w-16 text-center">
                                                <span className={`block text-sm font-bold ${theme.text}`}>{item.time}</span>
                                            </div>
                                            <div className="h-8 w-1 rounded-full bg-teal-400/40"></div>
                                            <div className="flex-1">
                                                <h4 className={`text-sm font-bold ${isInstructor ? 'text-slate-700' : 'text-slate-200'}`}>{item.title}</h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${item.type === 'class' ? 'border-teal-300/20 bg-teal-300/10 text-teal-200' : 'border-amber-300/20 bg-amber-300/10 text-amber-200'}`}>{item.type}</span>
                                                    <span className="text-xs text-slate-500">{item.count} Students</span>
                                                </div>
                                            </div>
                                            <button onClick={() => navigateTo('attendance')} className={`p-2 rounded-full transition-colors ${isInstructor ? 'text-slate-400 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><ChevronRight size={16} /></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Program Distribution (Mini) */}
                    <div className="rounded-lg border border-white/10 bg-slate-900/80 p-4 md:p-5">
                        <AtlasSectionHeader title="Student distribution" description="Active enrollment across the academy's programs." icon={BarChart3} />
                        <div className="mt-4 space-y-3">
                            {programs.slice(0, 4).map(prog => {
                                const count = students.filter(s => enrollments.some(e => e.studentId === s.id && e.programId === prog.id && e.status === 'active')).length;
                                const pct = (count / (activeStudentsCount || 1)) * 100;
                                return (
                                    <div key={prog.id}>
                                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                                            <span>{prog.name}</span>
                                            <span>{count}</span>
                                        </div>
                                        <div className={`h-2 rounded-full overflow-hidden ${isInstructor ? 'bg-slate-100' : 'bg-slate-950'}`}>
                                            <div className="h-full rounded-full bg-teal-400" style={{ width: `${pct}%` }}></div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>


                    {/* Upcoming Birthdays Widget */}
                    {upcomingBirthdays.length > 0 && (
                        <div className="rounded-lg border border-white/10 bg-slate-900/80 p-4 md:p-5">
                            <AtlasSectionHeader title="Upcoming birthdays" description="Small moments for thoughtful family care." icon={Users} />
                            <div className="mt-4 space-y-2">
                                {upcomingBirthdays.map(s => (
                                    <button key={s.id} onClick={() => navigateTo('student-details', { studentId: s.id })} className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-slate-950/50 p-3 text-left transition-colors hover:border-amber-300/20">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-300/20 bg-amber-300/10 text-xs font-bold text-amber-200">
                                            {s.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-bold truncate ${theme.text}`}>{s.name}</p>
                                            <p className="text-xs font-medium text-amber-200">{s.daysUntilBirthday === 0 ? 'Today' : `${s.daysUntilBirthday} days left`}</p>
                                            <p className="hidden">
                                                {s.daysUntilBirthday === 0 ? "🎉 Today!" : `${s.daysUntilBirthday} days left`}
                                            </p>
                                        </div>
                                        <div className="rounded border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-medium text-slate-400">
                                            {new Date(s.birthDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: ACTIONS & ALERTS */}
                <div className="space-y-5">

                    {/* Review Queue (Instructor Only) */}
                    {isInstructor && (
                        <div className={`overflow-hidden rounded-lg ${theme.card} border border-teal-300/20`}>
                            <div className={`flex items-center justify-between border-b bg-teal-300/[0.04] p-4 ${theme.divider}`}>
                                <h3 className={`flex items-center gap-2 text-sm font-bold ${theme.text}`}><Rocket size={16} className="text-teal-300" /> Mission Control</h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase text-teal-300">Live</span>
                                    <button onClick={() => navigateTo('review')} className="rounded border border-teal-300/30 bg-teal-500 px-2 py-1 text-xs text-slate-950 transition-colors hover:bg-teal-400">Open Queue</button>
                                </div>
                            </div>
                            <div className="p-4">
                                {pendingReviews.length === 0 ? (
                                    <div className="text-center py-6 text-slate-400">
                                        <CheckCircle2 size={32} className="mx-auto mb-2 text-teal-300/50" />
                                        <p className="text-xs">No pending submissions.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {pendingReviews.slice(0, 3).map((item, i) => (
                                            <div key={i} className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-slate-950/50 p-3 transition-colors hover:border-teal-300/30" onClick={() => navigateTo('review', { projectId: item.projectId })}>
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-teal-300/20 bg-teal-300/10 text-xs font-bold text-teal-300">
                                                    {item.studentName.charAt(0)}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <p className="text-sm font-bold text-slate-700 truncate">{item.step.title}</p>
                                                        <span className="text-[10px] text-slate-400 whitespace-nowrap">Now</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 truncate">{item.studentName} • {item.projectTitle}</p>

                                                    {isInstructor && (
                                                        <div className="mt-2 flex gap-2">
                                                            <button className="flex-1 rounded bg-teal-300/10 py-1 text-[10px] font-bold text-teal-300 hover:bg-teal-300/15">Approve</button>
                                                            <button className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded hover:bg-slate-200">View</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {pendingReviews.length > 3 && (
                                            <button onClick={() => navigateTo('review')} className="w-full rounded-lg py-2 text-xs font-bold text-teal-300 transition-colors hover:bg-teal-300/10">
                                                View {pendingReviews.length - 3} more
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Quick Actions Grid (Desktop) */}
                    <div className="hidden">
                        <button onClick={() => onRecordPayment()} className="rounded-lg border border-teal-300/30 bg-teal-500 p-4 text-center text-slate-950 transition-colors hover:bg-teal-400">
                            <CreditCard size={24} className="mx-auto mb-2" />
                            <span className="text-xs font-bold">Record Pay</span>
                        </button>
                        <button onClick={() => navigateTo('students')} className="rounded-lg border border-white/10 bg-white/[0.05] p-4 text-center text-slate-200 transition-colors hover:bg-white/[0.08]">
                            <UserPlus size={24} className="mx-auto mb-2" />
                            <span className="text-xs font-bold">New Student</span>
                        </button>
                        <button onClick={() => navigateTo('marketing')} className="p-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white text-center transition-all border border-slate-700">
                            <UserPlus size={24} className="mx-auto mb-2" />
                            <span className="text-xs font-bold">Add Lead</span>
                        </button>
                        <button onClick={() => navigateTo('team')} className="p-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white text-center transition-all border border-slate-700">
                            <CheckSquare size={24} className="mx-auto mb-2" />
                            <span className="text-xs font-bold">New Task</span>
                        </button>
                        <button onClick={() => navigateTo('communications')} className="col-span-2 rounded-lg border border-white/10 bg-white/[0.05] p-4 text-center text-slate-200 transition-colors hover:bg-white/[0.08] md:col-span-1">
                            <MessageCircle size={24} className="mx-auto mb-2" />
                            <span className="text-xs font-bold">Send Message</span>
                        </button>
                    </div>

                    {/* Action Center (Alerts) */}
                    <div className="overflow-hidden rounded-lg border border-white/10 bg-slate-900/80">
                        <div className="p-4"><AtlasSectionHeader title="Action center" description="Follow-ups that need a decision or a handoff." icon={Activity} meta={totalActiveAlerts > 0 ? <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-0.5 text-[10px] font-bold text-amber-200">{totalActiveAlerts} open</span> : undefined} /></div>

                        <div className="p-5">
                            <div className="flex items-center gap-6 mb-6">
                                {/* Operational Health Donut Chart */}
                                <div className="relative w-20 h-20 flex items-center justify-center">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className={isInstructor ? "text-slate-100" : "text-slate-800"} />
                                        <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={36 * 2 * Math.PI} strokeDashoffset={36 * 2 * Math.PI - (actionHealth / 100) * (36 * 2 * Math.PI)} className={`${actionHealth > 75 ? 'text-emerald-500' : actionHealth > 40 ? 'text-amber-500' : 'text-red-500'} transition-all duration-1000 ease-out`} strokeLinecap="round" />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className={`text-lg font-bold ${theme.text}`}>{actionHealth}%</span>
                                        <span className="text-[8px] text-slate-500 uppercase font-bold">Health</span>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className={`text-sm mb-1 ${theme.text}`}>System Status</p>
                                    <p className="text-xs text-slate-500">
                                        {checksToDeposit > 0 || pendingTransfers > 0 ? "Financial actions pending." : "Operations running smoothly."}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {checksToDeposit > 0 && (
                                    <div onClick={() => navigateTo('finance', { filter: 'check_received' })} className="group flex items-center justify-between p-3 bg-amber-950/10 border border-amber-900/30 rounded-xl cursor-pointer hover:bg-amber-900/20 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500"><Building size={16} /></div>
                                            <div>
                                                <p className="text-sm font-bold text-amber-400">{checksToDeposit} Checks</p>
                                                <p className="text-[10px] text-amber-300/70">Waiting for deposit</p>
                                            </div>
                                        </div>
                                        <div className="bg-amber-500 text-amber-950 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"><ArrowRight size={12} /></div>
                                    </div>
                                )}
                                {pendingTransfers > 0 && (
                                    <div onClick={() => navigateTo('finance', { filter: 'pending_verification' })} className="group flex cursor-pointer items-center justify-between rounded-lg border border-amber-300/15 bg-amber-300/[0.04] p-3 transition-colors hover:bg-amber-300/[0.08]">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-lg bg-amber-300/10 p-2 text-amber-200"><Building size={16} /></div>
                                            <div>
                                                <p className="text-sm font-bold text-amber-100">{pendingTransfers} Transfers</p>
                                                <p className="text-[10px] text-amber-200/60">Verification needed</p>
                                            </div>
                                        </div>
                                        <div className="rounded bg-amber-300 p-1 text-slate-950 opacity-0 transition-opacity group-hover:opacity-100"><ArrowRight size={12} /></div>
                                    </div>
                                )}
                                {myTasks.slice(0, 3).map(task => (
                                    <div key={task.id} onClick={() => navigateTo('team')} className="group flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-800 rounded-lg text-slate-400"><CheckSquare size={16} /></div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-300 truncate max-w-[120px]">{task.title}</p>
                                                <p className="text-[10px] text-slate-500">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</p>
                                            </div>
                                        </div>
                                        <div className="bg-slate-800 text-slate-400 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"><ArrowRight size={12} /></div>
                                    </div>
                                ))}

                                {/* DYNAMIC ALERTS */}
                                {actionAlerts.map((alert: any, idx) => {
                                    const tone = alertTone[alert.color] || alertTone[alert.type] || alertTone.slate;
                                    const AlertIcon = alert.icon;
                                    return (
                                        <div key={idx} onClick={() => navigateTo(alert.route, alert.params)} className={`group flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-colors ${tone.row}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${tone.icon}`}><AlertIcon size={16} /></div>
                                                <div>
                                                    <p className={`text-sm font-bold ${tone.title}`}>{alert.count} {alert.label}</p>
                                                    <p className={`text-[10px] ${tone.subtitle}`}>{alert.subLabel}</p>
                                                </div>
                                            </div>
                                            <div className={`${tone.action} p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity`}><ArrowRight size={12} /></div>
                                        </div>
                                    );
                                })}
                                {totalActiveAlerts === 0 && <AtlasEmptyState title="All caught up" description="There are no operational follow-ups waiting right now." icon={CheckCircle2} />}
                            </div>
                        </div>
                    </div>

                    {/* DATA QUALITY PANEL */}
                    {incompleteStudents.length > 0 && (
                        <div className={`overflow-hidden rounded-lg border ${
                            dataQualityScore < 70
                                ? 'border-red-500/30 bg-red-950/10'
                                : 'border-amber-500/30 bg-amber-950/10'
                        }`}>
                            {/* Header */}
                            <div className={`p-4 border-b flex justify-between items-center ${
                                dataQualityScore < 70 ? 'border-red-900/30 bg-red-950/20' : 'border-amber-900/30 bg-amber-950/20'
                            }`}>
                                <h3 className={`font-bold text-sm flex items-center gap-2 ${
                                    dataQualityScore < 70 ? 'text-red-400' : 'text-amber-400'
                                }`}>
                                    <ShieldAlert size={16} />
                                    Data Quality Guard
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                        dataQualityScore < 70
                                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    }`}>
                                        {incompleteStudents.length} students
                                    </span>
                                </h3>
                                {/* Score donut */}
                                <div className="relative w-10 h-10 flex items-center justify-center">
                                    <svg className="w-full h-full -rotate-90">
                                        <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-800" />
                                        <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="4" fill="transparent"
                                            strokeDasharray={16 * 2 * Math.PI}
                                            strokeDashoffset={16 * 2 * Math.PI - (dataQualityScore / 100) * (16 * 2 * Math.PI)}
                                            className={dataQualityScore >= 80 ? 'text-emerald-500' : dataQualityScore >= 60 ? 'text-amber-500' : 'text-red-500'}
                                            strokeLinecap="round" />
                                    </svg>
                                    <span className="absolute text-[9px] font-bold text-white">{dataQualityScore}%</span>
                                </div>
                            </div>

                            <div className="p-4 space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                                {incompleteStudents.slice(0, 8).map(({ student, issues, ageDays }) => (
                                    <div
                                        key={student.id}
                                        className="group flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-slate-950/60 p-3 transition-colors hover:border-amber-300/30"
                                        onClick={() => navigateTo('student-details', { studentId: student.id })}
                                    >
                                        {/* Avatar */}
                                        <div className="w-9 h-9 rounded-full bg-slate-800 border-2 border-amber-700/40 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
                                            {student.name.charAt(0)}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start gap-2">
                                                <p className="text-sm font-bold text-white truncate">{student.name}</p>
                                                <span className="text-[9px] text-slate-500 whitespace-nowrap shrink-0">{ageDays}d ago</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {issues.map((issue, i) => (
                                                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/30 text-red-400 border border-red-800/40 font-medium">
                                                        {issue}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Arrow */}
                                        <div className="text-slate-600 group-hover:text-amber-400 transition-colors mt-1">
                                            <ChevronRight size={14} />
                                        </div>
                                    </div>
                                ))}

                                {incompleteStudents.length > 8 && (
                                    <button
                                        onClick={() => navigateTo('students')}
                                        className="w-full py-2 text-xs text-amber-400 font-bold hover:bg-amber-900/20 rounded-lg transition-colors border border-amber-900/30"
                                    >
                                        + {incompleteStudents.length - 8} more incomplete records
                                    </button>
                                )}
                            </div>

                            {/* Footer with shortcut */}
                            <div className={`px-4 py-2.5 border-t flex items-center justify-between ${
                                dataQualityScore < 70 ? 'border-red-900/30' : 'border-amber-900/30'
                            }`}>
                                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <Info size={10} /> Registered &gt; 7 days with missing data
                                </p>
                                <button
                                    onClick={() => navigateTo('students')}
                                    className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                                >
                                    Fix all <ArrowRight size={10} />
                                </button>
                            </div>
                        </div>
                    )}

                    {incompleteStudents.length === 0 && (
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/30">
                            <ShieldCheck size={20} className="text-emerald-500 shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-emerald-400">Data Quality: 100%</p>
                                <p className="text-[10px] text-slate-500">All student records are complete.</p>
                            </div>
                        </div>
                    )}


                    <div className="overflow-hidden rounded-lg border border-white/10 bg-slate-900/80">
                        <div className="p-4"><AtlasSectionHeader title="Admissions pipeline" description="New interest and current conversion pace." icon={Megaphone} actions={<AtlasActionButton variant="quiet" icon={ArrowRight} onClick={() => navigateTo('marketing')}>View pipeline</AtlasActionButton>} /></div>

                        <div className="p-5">
                            <div className="flex items-end justify-between mb-4">
                                <div>
                                    <div className={`text-3xl font-bold ${theme.text}`}>{newLeads}</div>
                                    <div className="text-xs text-slate-500">Last 7 Days</div>
                                </div>
                                <div className="text-right">
                                    {/* Calculate simplified conversion rate */}
                                    <div className="text-sm font-bold text-emerald-500">
                                        {leads.length > 0 ? Math.round((leads.filter(l => l.status === 'converted' || l.status === 'closed').length / leads.length) * 100) : 0}%
                                    </div>
                                    <div className="text-[10px] text-slate-500 uppercase font-bold">Conv. Rate</div>
                                </div>
                            </div>

                            {/* Sparkline Graph */}
                            <div className="h-16 w-full relative">
                                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                                    {/* Line Path */}
                                    <path
                                        d={`M0,${64 - (leadTrendData[0] || 0) * 10} ${leadTrendData.map((val, i) => `L${(i / (leadTrendData.length - 1)) * 100}%,${64 - val * 10}`).join(' ')}`}
                                        fill="none"
                                        stroke="#2dd4bf"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="drop-shadow-lg"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

import { InstructorDashboardView } from './InstructorDashboardView';

// --- MAIN VIEW ---
export const DashboardView = ({ onRecordPayment }: { onRecordPayment: (studentId?: string) => void }) => {
    const { userProfile } = useAuth();
    const isStudent = userProfile?.role === 'student';
    const isInstructor = userProfile?.role === 'instructor';

    if (isStudent) {
        return <AtlasStudentDashboard />;
    }

    if (isInstructor) {
        return <InstructorDashboardView />;
    }

    return <AdminDashboard onRecordPayment={onRecordPayment} />;
};
