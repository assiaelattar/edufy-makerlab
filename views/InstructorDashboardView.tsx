import React, { useMemo } from 'react';
import {
    LayoutDashboard, Users, Clock, AlertTriangle,
    CheckCircle2, ChevronRight, Rocket, BookOpen,
    Star, Target, Calendar, MessageSquare, Bell,
    ArrowUpRight, Microscope, Zap
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Logo } from '../components/Logo';
import { config } from '../utils/config';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

export const InstructorDashboardView = () => {
    const { students, enrollments, studentProjects, navigateTo, t } = useAppContext();
    const { userProfile } = useAuth();
    const { unreadCount } = useNotifications();

    const firstName = userProfile?.name?.split(' ')[0] || 'Instructor';

    // --- 1. MISSION CONTROL LOGIC ---

    // A. Pending Reviews Queue
    const pendingReviews = useMemo(() => {
        const queue: any[] = [];
        const projects = studentProjects || []; // Safety Array
        projects.forEach(proj => {
            if (!proj.steps) return; // Safety logic
            proj.steps.forEach(step => {
                if (step.status === 'PENDING_REVIEW') {
                    const student = students?.find(s => s.id === proj.studentId);
                    queue.push({
                        projectId: proj.id,
                        projectTitle: proj.title,
                        studentName: student ? student.name : 'Unknown Student',
                        submissionDate: step.reviewedAt || new Date().toISOString(),
                        step
                    });
                }
            });
        });
        return queue.sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());
    }, [studentProjects, students]);

    // B. Live Class Detector
    const liveClass = useMemo(() => {
        const now = new Date();
        const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
        const currentHour = now.getHours();
        const activeEnrollments = enrollments || []; // Safety Array

        // Find a group active right now
        const active = activeEnrollments.find(e =>
            (e.groupTime?.includes(currentDay) || e.secondGroupTime?.includes(currentDay)) &&
            e.status === 'active'
        );

        if (active && currentHour >= 9 && currentHour <= 18) {
            return {
                name: active.groupName || 'Robotics 101',
                program: active.programName,
                studentsCount: activeEnrollments.filter(e => e.groupName === active.groupName).length,
                timeLeft: '45 mins'
            };
        }
        return null;
    }, [enrollments]);

    // C. At-Risk Radar (Students with no recent activity or stalled projects)
    const atRiskStudents = useMemo(() => {
        return students
            .filter(s => s.status === 'active')
            .map(student => {
                const projects = (studentProjects || []).filter(p => p.studentId === student.id);
                // Simple heuristic: No projects or all projects stalled
                const isStalled = projects.length === 0 || projects.every(p => p.status === 'planning');
                if (isStalled) {
                    return {
                        id: student.id,
                        name: student.name,
                        issue: 'Stuck in Planning',
                        daysInactive: 5
                    };
                }
                return null;
            })
            .filter(Boolean)
            .slice(0, 5); // Top 5
    }, [students, studentProjects]);

    // D. Active Projects (Live Feed)
    const activeProjects = useMemo(() => {
        return (studentProjects || [])
            .filter(p => p.status === 'building' || p.status === 'testing')
            .map(p => {
                const totalSteps = p.steps?.length || 0;
                const doneSteps = p.steps?.filter(s => s.status === 'done').length || 0;
                const progress = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;
                const student = students?.find(s => s.id === p.studentId);
                const currentStep = p.steps?.find(s => s.status === 'doing' || s.status === 'PENDING_REVIEW');

                return {
                    id: p.id,
                    projectTitle: p.title,
                    studentName: student ? student.name : 'Unknown Student',
                    progress,
                    currentStepName: currentStep ? currentStep.title : 'Building...',
                    status: p.status,
                    lastUpdated: p.updatedAt // We can use this to sort by recent activity
                };
            })
            // Sort by most recently updated (simulating live activity)
            .sort((a, b) => { // Safe sort
                const dateA = a.lastUpdated ? (typeof (a.lastUpdated as any).toDate === 'function' ? (a.lastUpdated as any).toDate() : new Date(a.lastUpdated as any)) : new Date(0);
                const dateB = b.lastUpdated ? (typeof (b.lastUpdated as any).toDate === 'function' ? (b.lastUpdated as any).toDate() : new Date(b.lastUpdated as any)) : new Date(0);
                return dateB.getTime() - dateA.getTime();
            })
            .slice(0, 8); // Show top 8 active
    }, [studentProjects, students]);


    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4">

            {/* HEADER: Welcome Commander */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <div className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">
                        <Rocket size={16} /> Mission Control
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">
                        Welcome back, <span className="text-indigo-600">{firstName}</span>.
                    </h1>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => window.open(config.sparkQuestUrl, '_blank')}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all border border-slate-800"
                    >
                        <Rocket size={18} />
                        <span className="hidden md:inline">Launch Factory</span>
                    </button>
                    <button
                        onClick={() => navigateTo('team')}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold shadow-sm hover:bg-slate-50 transition-colors relative"
                    >
                        <Bell size={18} />
                        <span className="hidden md:inline">Notifications</span>
                        {unreadCount > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full absolute -top-1 -right-1 shadow-sm">{unreadCount}</span>}
                    </button>
                    <button onClick={() => navigateTo('classes')} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all">
                        <Zap size={18} fill="currentColor" /> Start Session
                    </button>
                </div>
            </div>

            {/* TOP ROW: STATUS WIDGETS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* 1. Review Queue Status */}
                <div
                    onClick={() => navigateTo('review')}
                    className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all group cursor-pointer relative overflow-hidden"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform">
                            <Microscope size={28} />
                        </div>
                        {pendingReviews.length > 0 && (
                            <span className="bg-red-500 text-white text-xs font-black px-2 py-1 rounded-full animate-pulse">
                                ACTION REQUIRED
                            </span>
                        )}
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Review Queue</h3>
                        <div className="text-4xl font-black text-slate-800 mb-2">{pendingReviews.length}</div>
                        <p className="text-sm text-slate-400 font-medium">Pending submissions awaiting grading.</p>
                    </div>
                </div>

                {/* 2. Live Class Status */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="p-3 bg-white/10 text-emerald-400 rounded-2xl backdrop-blur-sm">
                            <Clock size={28} />
                        </div>
                        {liveClass ? (
                            <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-black uppercase tracking-wider border border-emerald-500/30 px-2 py-1 rounded-full bg-emerald-500/10">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live Now
                            </span>
                        ) : (
                            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Offline</span>
                        )}
                    </div>
                    <div className="relative z-10">
                        {liveClass ? (
                            <>
                                <h3 className="text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">Current Session</h3>
                                <div className="text-2xl font-black mb-1">{liveClass.name}</div>
                                <div className="flex items-center gap-3 text-slate-400 text-sm">
                                    <span className="flex items-center gap-1"><Users size={14} /> {liveClass.studentsCount} Students</span>
                                    <span>•</span>
                                    <span>{liveClass.timeLeft} remaining</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-1">Next Class</h3>
                                <div className="text-2xl font-black mb-1">No Active Sessions</div>
                                <p className="text-slate-400 text-sm">Prepare for tomorrow's labs.</p>
                            </>
                        )}
                    </div>
                </div>

                {/* 3. At-Risk Radar */}
                <div
                    onClick={() => navigateTo('students')}
                    className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm hover:shadow-xl hover:border-orange-100 transition-all cursor-pointer group"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-orange-50 text-orange-500 rounded-2xl group-hover:rotate-12 transition-transform">
                            <AlertTriangle size={28} />
                        </div>
                        <span className="text-slate-300 group-hover:text-orange-400 transition-colors">
                            <ArrowUpRight size={24} />
                        </span>
                    </div>
                    <div>
                        <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-1">Radar</h3>
                        <div className="text-4xl font-black text-slate-800 mb-2">{atRiskStudents.length}</div>
                        <p className="text-sm text-slate-400 font-medium">Students needing intervention.</p>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT SPLIT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT: LIVE ACTIVITY CENTER */}
                <div className="lg:col-span-2 space-y-8">

                    {/* REVIEW QUEUE */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <Microscope className="text-indigo-600" /> Priority Review Queue
                            </h2>
                            {pendingReviews.length > 3 && (
                                <button onClick={() => navigateTo('review')} className="text-indigo-600 font-bold text-sm hover:underline">View All</button>
                            )}
                        </div>

                        {pendingReviews.length === 0 ? (
                            <div className="bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 p-8 text-center">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                                    <CheckCircle2 size={24} className="text-emerald-500" />
                                </div>
                                <h3 className="text-md font-bold text-slate-700">All Caught Up!</h3>
                                <p className="text-sm text-slate-400">No pending submissions.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {pendingReviews.slice(0, 5).map((item, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => navigateTo('review', { projectId: item.projectId })}
                                        className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-lg shrink-0">
                                            {item.studentName.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-bold text-slate-800 truncate">{item.step.title}</h4>
                                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase rounded-md">Review</span>
                                            </div>
                                            <p className="text-sm text-slate-500 truncate">
                                                <span className="font-bold text-slate-700">{item.studentName}</span> • {item.projectTitle}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="text-xs font-bold text-slate-400 block mb-1">Just now</span>
                                            <button className="text-indigo-600 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                Review <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* LIVE ACTIVE PROJECTS */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <Rocket className="text-blue-500" /> Live Studio Activity
                            </h2>
                        </div>

                        {activeProjects.length === 0 ? (
                            <div className="text-center py-10 opacity-50">
                                <p className="text-sm font-bold">No active builds right now.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {activeProjects.map(proj => (
                                    <div key={proj.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                                                {proj.studentName.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-bold text-slate-800 text-sm truncate">{proj.studentName}</div>
                                                <div className="text-xs text-slate-500 truncate max-w-[120px]">{proj.projectTitle}</div>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-xs font-bold mb-1">
                                                <span className="text-slate-500 uppercase">Step</span>
                                                <span className="text-blue-600">{proj.progress}%</span>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${proj.progress}%` }}></div>
                                            </div>
                                            <div className="mt-2 text-xs font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded-lg truncate">
                                                Current: {proj.currentStepName}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

                {/* RIGHT: AT-RISK STUDENTS LIST */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <Target className="text-orange-500" /> Attention Needed
                        </h2>
                    </div>

                    <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
                        {atRiskStudents.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-slate-400 text-sm font-medium">Everyone is on track! 🚀</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {atRiskStudents.map(student => (
                                    <div key={student?.id} className="flex items-start gap-3">
                                        <div className="w-2 h-2 mt-2 rounded-full bg-orange-500"></div>
                                        <div>
                                            <div className="font-bold text-slate-700">{student?.name}</div>
                                            <div className="text-xs text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded-lg inline-block mt-1">
                                                {student?.issue}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <button className="w-full py-3 mt-4 text-sm font-bold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                                    View Class Roster
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
