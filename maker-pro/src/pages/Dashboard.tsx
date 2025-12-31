import React from 'react';
import { LayoutDashboard, Clock, Target, ArrowRight, Zap, Trophy, Flame, Calendar, BookOpen, Video, Users, Megaphone, AlertCircle, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { useStudentData } from '../hooks/useStudentData';

import { useNavigate } from 'react-router-dom';

export function Dashboard() {
    const { studentProfile } = useAuth();
    const navigate = useNavigate();
    const { stats, activeCourse, upcomingSessions, progress, loading } = useStudentData();
    const [programConfig, setProgramConfig] = React.useState<any>(null);
    const [attendanceRate, setAttendanceRate] = React.useState(100);
    const [announcements, setAnnouncements] = React.useState<any[]>([]);

    React.useEffect(() => {
        const fetchProgramDetails = async () => {
            if (!activeCourse?.programId || !db) return;
            try {
                const docRef = doc(db, 'programs', activeCourse.programId);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    setProgramConfig(snap.data().dashboardConfig);
                }
            } catch (err) {
                console.error("Failed to load program config", err);
            }
        };

        const fetchAnnouncements = async () => {
            if (!db) return;
            try {
                const q = query(
                    collection(db, 'announcements'),
                    where('audience', 'in', ['all', 'students']),
                    orderBy('date', 'desc'),
                    limit(3)
                );
                const snapshot = await getDocs(q);
                setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (err) {
                console.error("Error loading announcements", err);
            }
        };

        fetchProgramDetails();
        fetchAnnouncements();
    }, [activeCourse]);

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading dashboard...</div>;

    const firstName = studentProfile?.name.split(' ')[0] || 'Maker';

    const themeMap: any = {
        brand: { from: 'from-brand-600', via: 'via-brand-500', to: 'to-accent-600', text: 'text-brand-100' },
        blue: { from: 'from-blue-600', via: 'via-blue-500', to: 'to-cyan-600', text: 'text-blue-100' },
        purple: { from: 'from-purple-600', via: 'via-purple-500', to: 'to-pink-600', text: 'text-purple-100' },
        green: { from: 'from-green-600', via: 'via-emerald-500', to: 'to-teal-600', text: 'text-green-100' },
        orange: { from: 'from-orange-600', via: 'via-amber-500', to: 'to-yellow-600', text: 'text-orange-100' },
    };

    const theme = themeMap[programConfig?.themeColor || 'brand'];

    const getAnnouncementStyle = (type: string) => {
        switch (type) {
            case 'alert': return 'bg-red-50 border-red-100 text-red-900 icon-red-500';
            case 'promo': return 'bg-purple-50 border-purple-100 text-purple-900 icon-purple-500';
            case 'event': return 'bg-brand-50 border-brand-100 text-brand-900 icon-brand-500';
            default: return 'bg-blue-50 border-blue-100 text-blue-900 icon-blue-500';
        }
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-8"
        >
            {/* Welcome Section */}
            <motion.div variants={item} className="relative rounded-3xl overflow-hidden p-8 lg:p-12 text-white shadow-2xl shadow-brand-500/20">
                <div className={`absolute inset-0 bg-gradient-to-br ${theme.from} ${theme.via} ${theme.to} z-0`} />
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <div className="relative z-10 max-w-2xl">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-xs font-semibold mb-6"
                    >
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        Active Member
                    </motion.div>

                    <h1 className="text-3xl lg:text-5xl font-bold mb-4 tracking-tight">
                        {programConfig?.welcomeMessage ? (
                            <>
                                {programConfig.welcomeMessage.split(',')[0]}<br />
                                <span className={theme.text}>{firstName}!</span>
                            </>
                        ) : (
                            <>
                                Welcome back, <br />
                                <span className={theme.text}>{firstName}!</span>
                            </>
                        )}
                    </h1>
                    <p className={`${theme.text} text-lg mb-8 max-w-md leading-relaxed opacity-90`}>
                        You have {stats.projectsCompleted} completed projects and {upcomingSessions.length} upcoming sessions.
                    </p>

                    <div className="flex flex-wrap gap-4">
                        <button
                            onClick={() => navigate('/learning-path')}
                            className={`px-6 py-3 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-50 transition-colors shadow-lg shadow-black/5 active:scale-95 duration-200`}
                        >
                            Continue Learning
                        </button>
                        {programConfig?.meetingUrl && (
                            <a href={programConfig.meetingUrl} target="_blank" rel="noreferrer" className="px-6 py-3 bg-white/20 backdrop-blur-md text-white border border-white/30 rounded-xl font-bold hover:bg-white/30 transition-all flex items-center gap-2 animate-pulse ring-2 ring-white/50">
                                <Video size={20} /> Join Live Class
                            </a>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Hours coded', value: stats.hoursCoded || '0', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50', change: '+2h' },
                    { label: 'Projects Done', value: stats.projectsCompleted, icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-50', change: '+1' },
                    { label: 'Streak', value: `${stats.streakDays} Days`, icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50', change: 'Keep it up!' },
                    programConfig?.enableAttendanceTracking
                        ? { label: 'Presence Rate', value: `${attendanceRate}%`, icon: Users, color: 'text-green-500', bg: 'bg-green-50', change: 'Good' }
                        : { label: 'XP Points', value: stats.xp || 0, icon: Zap, color: 'text-purple-500', bg: 'bg-purple-50', change: `Lvl ${Math.floor((stats.xp || 0) / 1000) + 1}` },
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        variants={item}
                        whileHover={{ y: -5 }}
                        className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-premium transition-all duration-300"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">{stat.change}</span>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
                        <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Announcements Section */}
            {announcements.length > 0 && (
                <motion.div variants={item} className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Megaphone className="text-brand-500" size={20} />
                        <h2 className="text-xl font-bold text-slate-900">Latest Updates</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {announcements.map((ann) => {
                            const style = getAnnouncementStyle(ann.type);
                            return (
                                <div key={ann.id} className={`p-6 rounded-2xl border flex items-start gap-4 ${style.split(' ').slice(0, 3).join(' ')} shadow-sm hover:shadow-md transition-shadow`}>
                                    <div className={`p-2 bg-white/60 backdrop-blur-sm rounded-xl shrink-0 shadow-sm border border-white/50`}>
                                        {ann.type === 'alert' ? <AlertCircle size={20} className="text-red-600" /> :
                                            ann.type === 'promo' ? <Zap size={20} className="text-purple-600" /> :
                                                ann.type === 'event' ? <Calendar size={20} className="text-brand-600" /> :
                                                    <Info size={20} className="text-blue-600" />}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-lg mb-1 truncate">{ann.title}</h3>
                                        <p className="text-sm opacity-90 leading-relaxed mb-3 line-clamp-2">{ann.content}</p>
                                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 bg-white/50 px-2 py-1 rounded-full">
                                            {ann.date && new Date(ann.date.seconds * 1000).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Current Project / Course */}
                <motion.div variants={item} className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Current Program</h2>
                            <p className="text-slate-500 text-sm">{activeCourse?.programName || 'No Active Program'}</p>
                        </div>
                        <button className="p-2 text-slate-400 hover:text-brand-600 transition-colors">
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>

                    {activeCourse ? (
                        <div className="relative pt-4">
                            <div className="flex items-center justify-between text-sm font-semibold mb-2">
                                <span className="text-brand-600">Progress</span>
                                <span className="text-slate-900">{progress}%</span>
                            </div>
                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 1, delay: 0.5 }}
                                    className={`h-full bg-gradient-to-r ${theme.from} ${theme.to} rounded-full relative`}
                                >
                                    <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite]" />
                                </motion.div>
                            </div>

                            <div className="mt-8 flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 items-start">
                                <div className="p-2 bg-white rounded-lg shadow-sm text-brand-600">
                                    <BookOpen size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900">Next Module</h4>
                                    <p className="text-sm text-slate-500">Check the 'Projects' tab to continue your work.</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500">
                            You are not enrolled in any active programs.
                        </div>
                    )}
                </motion.div>

                {/* Upcoming Events */}
                <motion.div variants={item} className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">Schedule</h2>
                    <div className="space-y-4">
                        {upcomingSessions.length > 0 ? upcomingSessions.map((session, i) => (
                            <div key={i} className="flex gap-4 items-start group cursor-pointer">
                                <div className="flex-shrink-0 w-14 text-center bg-slate-50 rounded-xl p-2 group-hover:bg-brand-50 transition-colors">
                                    <div className="text-xs text-slate-500 group-hover:text-brand-500 font-medium">{session.day.substring(0, 3).toUpperCase()}</div>
                                    <div className="text-lg font-bold text-slate-900 group-hover:text-brand-700"><Calendar size={16} className="mx-auto mt-1" /></div>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">{session.programName}</h4>
                                    <p className="text-xs text-slate-500 mt-1">{session.timeOnly}</p>
                                    {programConfig?.meetingUrl && i === 0 && (
                                        <span className="inline-block mt-1 text-[10px] font-bold text-green-600 bg-green-100 px-1.5 rounded border border-green-200">LIVE LINK AVAILABLE</span>
                                    )}
                                </div>
                            </div>
                        )) : (
                            <p className="text-sm text-slate-500 italic">No upcoming sessions detected based on active enrollments.</p>
                        )}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
