
import React, { useState, useMemo } from 'react';
import { LayoutDashboard, Calendar, DollarSign, Briefcase, Users, UserPlus, Zap, BookOpen, CreditCard, Activity, CheckCircle2, ChevronRight, Hourglass, Building, ClipboardCheck, CalendarCheck, BarChart3, Filter, Phone, MessageCircle, ArrowUpRight, CheckSquare, PieChart, Megaphone, Clock, AlertTriangle, TrendingUp, ArrowRight, Trophy, Rocket, Star, Target } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, getDaysDifference, formatDate } from '../utils/helpers';

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

    return (
        <div className="space-y-8 pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4">
            {/* Student Hero */}
            <div className="relative rounded-[2.5rem] overflow-hidden shadow-xl bg-white group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFC107]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#2D2B6B]/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

                <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                    <div className="relative">
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white p-1 shadow-2xl shadow-indigo-900/10">
                            <div className="w-full h-full rounded-full bg-[#2D2B6B] flex items-center justify-center text-4xl font-black text-[#FFC107]">
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
                                <Rocket size={18} className="text-cyan-500" />
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
                                <div className="h-full bg-gradient-to-r from-[#FFC107] to-amber-500 transition-all duration-1000 shadow-[0_0_10px_rgba(255,193,7,0.5)]" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Up Next Card - Cyan Accent */}
                <div className="bg-white p-6 rounded-[2rem] flex flex-col justify-between relative overflow-hidden group shadow-sm hover:shadow-xl transition-all border-2 border-cyan-100">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><CalendarCheck size={100} className="text-cyan-400" /></div>
                    <div>
                        <h3 className="text-cyan-500 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2"><Clock size={14} /> Up Next</h3>
                        {todaysClass ? (
                            <>
                                <div className="text-2xl font-bold text-[#2D2B6B] mb-1">{todaysClass.programName}</div>
                                <div className="text-cyan-600 font-medium text-sm">{todaysClass.gradeName}</div>
                                <div className="mt-4 inline-block bg-cyan-50 text-cyan-700 px-3 py-1 rounded-lg text-xs font-bold">
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
                    <button onClick={() => navigateTo('learning')} className="mt-6 w-full py-3 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 rounded-xl text-sm font-bold transition-colors border border-cyan-200">View Schedule</button>
                </div>

                {/* My Studio Status - Pink Gradient */}
                <div className="bg-gradient-to-br from-pink-500 to-pink-600 p-6 rounded-[2rem] flex flex-col justify-between relative overflow-hidden group shadow-xl shadow-pink-500/30 text-white">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Target size={100} className="text-white" /></div>
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
                <div className="bg-white p-6 rounded-[2rem] flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:shadow-xl transition-all border-2 border-orange-100" onClick={() => navigateTo('toolkit')}>
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Zap size={100} className="text-orange-400" /></div>
                    <div>
                        <h3 className="text-orange-500 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2"><Zap size={14} /> Resources</h3>
                        <div className="text-2xl font-bold text-[#2D2B6B] mb-1">Toolkit</div>
                        <div className="text-slate-500 text-sm">Software, guides & assets</div>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-all border border-orange-200">
                            <ArrowRight size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Up Next - Cyan Accent */}
            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-cyan-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/10 rounded-full blur-2xl"></div>
                <h2 className="text-xl font-bold text-[#2D2B6B] mb-6 flex items-center gap-3 relative z-10">
                    <div className="p-2 bg-cyan-50 rounded-xl border border-cyan-100">
                        <Clock size={24} className="text-cyan-500" />
                    </div>
                    Up Next
                </h2>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-[#2D2B6B] text-xl">Recent Projects</h3>
                    <button onClick={() => navigateTo('learning')} className="text-sm font-bold text-cyan-600 hover:text-cyan-500">View All</button>
                </div>
                {publishedProjects.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                        No published projects yet. Keep building! 🚀
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {publishedProjects.slice(0, 4).map(p => (
                            <div key={p.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex gap-4 hover:shadow-md transition-all cursor-pointer group">
                                <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                                    {p.mediaUrls?.[0] ? <img src={p.mediaUrls[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt={p.title} /> : <BookOpen size={24} className="text-slate-300" />}
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
                                                        <div key={bid} className={`w-5 h-5 rounded-full bg-${badge.color}-100 border border-white flex items-center justify-center text-${badge.color}-600 text-[10px]`} title={badge.name}>
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

// --- ADMIN DASHBOARD COMPONENT ---
const AdminDashboard = ({ onRecordPayment }: { onRecordPayment: (studentId?: string) => void }) => {
    const { students, payments, enrollments, workshopTemplates, workshopSlots, attendanceRecords, tasks, leads, programs, settings, navigateTo, t, studentProjects } = useAppContext();
    const { userProfile } = useAuth();

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
                        studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown Student',
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
        cardHover: isInstructor ? "hover:shadow-md hover:border-slate-300" : "hover:border-slate-700",
        text: isInstructor ? "text-slate-800" : "text-white",
        textMuted: "text-slate-500", // Works for both usually
        textLabel: "text-slate-500",
        bgMuted: isInstructor ? "bg-slate-50 border border-slate-100" : "bg-slate-950/30 border-slate-800",
        divider: isInstructor ? "border-slate-100" : "border-slate-800",
        iconBg: (color: string) => isInstructor ? `bg-${color}-50 text-${color}-600` : `bg-${color}-500/10 text-${color}-500`
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

    return (
        <div className="space-y-6 pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${theme.text}`}>
                        {greeting}, <span className="text-blue-500">{firstName}</span>
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Here is what's happening at {settings.academyName} today.</p>
                </div>

                <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
                    {/* Session Filter */}
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"><Filter size={14} /></div>
                        <select
                            value={selectedSession}
                            onChange={(e) => setSelectedSession(e.target.value)}
                            className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none appearance-none cursor-pointer shadow-sm transition-all focus:border-blue-500 ${isInstructor ? 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300' : 'bg-slate-900 border border-slate-800 text-white hover:border-slate-700'}`}
                        >
                            {availableSessions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* MOBILE LAYOUT: ACTIONS FIRST */}
            <div className="md:hidden grid grid-cols-2 gap-3">
                <button onClick={() => onRecordPayment()} className="p-4 bg-emerald-600 rounded-xl text-white font-bold text-sm shadow-lg shadow-emerald-900/20 active:scale-95 transition-transform flex flex-col items-center justify-center gap-2">
                    <CreditCard size={20} /> Record Pay
                </button>
                <button onClick={() => navigateTo('students')} className="p-4 bg-blue-600 rounded-xl text-white font-bold text-sm shadow-lg shadow-blue-900/20 active:scale-95 transition-transform flex flex-col items-center justify-center gap-2">
                    <UserPlus size={20} /> Enroll Student
                </button>
                {checksToDeposit > 0 && (
                    <button onClick={() => navigateTo('finance', { filter: 'check_received' })} className="col-span-2 p-3 bg-amber-500/10 border border-amber-500/50 rounded-xl flex items-center justify-center gap-2 text-amber-400 text-sm font-bold animate-pulse">
                        <AlertTriangle size={16} /> {checksToDeposit} Checks to Deposit
                    </button>
                )}
            </div>

            {/* KPI CARDS */}
            <div className="flex overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 snap-x snap-mandatory no-scrollbar">
                {/* Revenue */}
                <div className={`min-w-[260px] md:min-w-0 p-5 rounded-2xl flex flex-col justify-between snap-center ${theme.card}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Revenue</p>
                            <h3 className={`text-2xl font-bold mt-1 ${theme.text}`}>{formatCurrency(financialStats.totalRevenue)}</h3>
                        </div>
                        <div className={`p-2 rounded-lg ${theme.iconBg('emerald')}`}><DollarSign size={20} /></div>
                    </div>
                    <div className="mt-4 h-10 flex items-end gap-1">
                        {financialStats.chartData.map((d, i) => (
                            <div key={i} className={`flex-1 rounded-t transition-colors ${isInstructor ? 'bg-emerald-100 hover:bg-emerald-200' : 'bg-slate-800 hover:bg-emerald-500/50'}`} style={{ height: `${(d.value / financialStats.maxRevenue) * 100}%` }} title={`${d.month}: ${formatCurrency(d.value)}`}></div>
                        ))}
                    </div>
                </div>

                {/* Active Students */}
                <div className={`min-w-[260px] md:min-w-0 p-5 rounded-2xl flex flex-col justify-between snap-center ${theme.card}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Students</p>
                            <h3 className={`text-2xl font-bold mt-1 ${theme.text}`}>{activeStudentsCount}</h3>
                        </div>
                        <div className={`p-2 rounded-lg ${theme.iconBg('blue')}`}><Users size={20} /></div>
                    </div>
                    <div className={`mt-4 flex items-center text-xs px-2 py-1 rounded-lg w-fit ${isInstructor ? 'bg-emerald-100 text-emerald-700' : 'text-emerald-400 bg-emerald-950/30'}`}>
                        <ArrowUpRight size={12} className="mr-1" /> +{newStudentsThisMonth} this month
                    </div>
                </div>

                {/* Attendance Rate */}
                <div className={`min-w-[260px] md:min-w-0 p-5 rounded-2xl flex flex-col justify-between snap-center ${theme.card}`}>
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
                <div onClick={() => navigateTo('marketing')} className={`min-w-[260px] md:min-w-0 p-5 rounded-2xl flex flex-col justify-between snap-center cursor-pointer transition-colors group ${theme.card} ${theme.cardHover}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-purple-500 transition-colors">New Leads</p>
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LEFT COLUMN: SCHEDULE & FINANCE */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Today's Schedule */}
                    <div className={`rounded-2xl overflow-hidden ${theme.card}`}>
                        <div className={`p-5 border-b flex justify-between items-center ${theme.divider} ${isInstructor ? 'bg-slate-50/50' : 'bg-slate-950/30'}`}>
                            <h3 className={`font-bold flex items-center gap-2 ${theme.text}`}><Clock size={18} className="text-blue-500" /> Today's Schedule</h3>
                            <button onClick={() => navigateTo('attendance')} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors">Manage Attendance</button>
                        </div>
                        <div className="p-4">
                            {todaySchedule.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                                    <Calendar size={32} className="mb-2 opacity-50" />
                                    <p className="text-sm">No classes or workshops scheduled today.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {todaySchedule.map((item, idx) => (
                                        <div key={idx} className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${theme.bgMuted} ${isInstructor ? 'hover:border-slate-300' : 'hover:border-slate-700'}`}>
                                            <div className="w-16 text-center">
                                                <span className={`block text-sm font-bold ${theme.text}`}>{item.time}</span>
                                            </div>
                                            <div className={`w-1 h-8 rounded-full ${isInstructor ? 'bg-slate-200' : 'bg-slate-800'}`}></div>
                                            <div className="flex-1">
                                                <h4 className={`text-sm font-bold ${isInstructor ? 'text-slate-700' : 'text-slate-200'}`}>{item.title}</h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-bold ${item.type === 'class' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-pink-500/10 text-pink-500 border-pink-500/20'}`}>{item.type}</span>
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
                    <div className={`rounded-2xl p-5 ${theme.card}`}>
                        <h3 className={`font-bold mb-4 text-sm ${theme.text}`}>Student Distribution</h3>
                        <div className="space-y-3">
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
                                            <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }}></div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: ACTIONS & ALERTS */}
                <div className="space-y-6">

                    {/* Review Queue (Instructor Only) */}
                    {isInstructor && (
                        <div className={`rounded-2xl overflow-hidden ${theme.card} border-2 border-indigo-500/20`}>
                            <div className={`p-4 border-b flex justify-between items-center ${theme.divider} bg-indigo-500/5`}>
                                <h3 className={`font-bold text-sm flex items-center gap-2 ${theme.text}`}><Rocket size={16} className="text-indigo-500" /> Mission Control</h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] uppercase font-bold text-indigo-400 animate-pulse">Live</span>
                                    <button onClick={() => navigateTo('reviews')} className="text-xs bg-indigo-500 text-white px-2 py-1 rounded hover:bg-indigo-600 transition-colors">Open Queue</button>
                                </div>
                            </div>
                            <div className="p-4">
                                {pendingReviews.length === 0 ? (
                                    <div className="text-center py-6 text-slate-400">
                                        <CheckCircle2 size={32} className="mx-auto mb-2 opacity-50 text-indigo-300" />
                                        <p className="text-xs">No pending submissions.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {pendingReviews.slice(0, 3).map((item, i) => (
                                            <div key={i} className="flex gap-3 items-start p-3 bg-slate-50 border border-slate-100 rounded-xl hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('reviews', { projectId: item.projectId })}>
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0 text-xs">
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
                                                            <button className="flex-1 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded hover:bg-green-200">Approve</button>
                                                            <button className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded hover:bg-slate-200">View</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {pendingReviews.length > 3 && (
                                            <button onClick={() => navigateTo('reviews')} className="w-full py-2 text-xs text-indigo-500 font-bold hover:bg-indigo-50 rounded-lg transition-colors">
                                                View {pendingReviews.length - 3} more
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Quick Actions Grid (Desktop) */}
                    <div className="hidden md:grid grid-cols-2 gap-3">
                        <button onClick={() => onRecordPayment()} className="p-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white text-center transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.98]">
                            <CreditCard size={24} className="mx-auto mb-2" />
                            <span className="text-xs font-bold">Record Pay</span>
                        </button>
                        <button onClick={() => navigateTo('students')} className="p-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-white text-center transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98]">
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
                    </div>

                    {/* Action Center (Alerts) */}
                    <div className={`rounded-2xl overflow-hidden ${theme.card}`}>
                        <div className={`p-4 border-b flex justify-between items-center ${theme.divider} ${isInstructor ? 'bg-slate-50/50' : 'bg-slate-950/30'}`}>
                            <h3 className={`font-bold text-sm flex items-center gap-2 ${theme.text}`}><Activity size={16} className="text-orange-500" /> Action Center</h3>
                            {totalPendingActions > 0 && <span className="bg-red-500/10 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded border border-red-500/20">{totalPendingActions} Pending</span>}
                        </div>

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
                                    <div onClick={() => navigateTo('finance', { filter: 'pending_verification' })} className="group flex items-center justify-between p-3 bg-purple-950/10 border border-purple-900/30 rounded-xl cursor-pointer hover:bg-purple-900/20 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500"><Building size={16} /></div>
                                            <div>
                                                <p className="text-sm font-bold text-purple-400">{pendingTransfers} Transfers</p>
                                                <p className="text-[10px] text-purple-300/70">Verification needed</p>
                                            </div>
                                        </div>
                                        <div className="bg-purple-500 text-purple-950 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"><ArrowRight size={12} /></div>
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
                                {totalPendingActions === 0 && (
                                    <div className="text-center py-4">
                                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-900/20 text-emerald-500 mb-2">
                                            <CheckCircle2 size={20} />
                                        </div>
                                        <p className="text-xs text-slate-500">All caught up!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Lead Trends (Sparkline) */}
                    <div className={`rounded-2xl overflow-hidden ${theme.card}`}>
                        <div className={`p-4 border-b flex justify-between items-center ${theme.divider} ${isInstructor ? 'bg-slate-50/50' : 'bg-slate-950/30'}`}>
                            <h3 className={`font-bold text-sm ${theme.text}`}>New Leads</h3>
                            <button onClick={() => navigateTo('marketing')} className={`text-[10px] px-2 py-1 rounded border transition-colors ${isInstructor ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'}`}>View Pipeline</button>
                        </div>

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
                                    <defs>
                                        <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.5" />
                                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                    {/* Line Path */}
                                    <path
                                        d={`M0,${64 - (leadTrendData[0] || 0) * 10} ${leadTrendData.map((val, i) => `L${(i / (leadTrendData.length - 1)) * 100}%,${64 - val * 10}`).join(' ')}`}
                                        fill="none"
                                        stroke="#8b5cf6"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="drop-shadow-lg"
                                    />
                                    {/* Area Fill (Optional aesthetic) */}
                                    <path
                                        d={`M0,${64 - (leadTrendData[0] || 0) * 10} ${leadTrendData.map((val, i) => `L${(i / (leadTrendData.length - 1)) * 100}%,${64 - val * 10}`).join(' ')} V64 H0 Z`}
                                        fill="url(#sparklineGradient)"
                                        opacity="0.3"
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
        return <StudentDashboard />;
    }

    if (isInstructor) {
        return <InstructorDashboardView />;
    }

    return <AdminDashboard onRecordPayment={onRecordPayment} />;
};
