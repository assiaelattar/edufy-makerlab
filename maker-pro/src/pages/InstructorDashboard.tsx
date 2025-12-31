import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Program } from '../types';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, doc, updateDoc, Firestore } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import {
    BookOpen, Users, Calendar, Video, CheckCircle, Clock,
    Zap, MoreHorizontal, Layout, ArrowRight, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock types
interface ClassGroup {
    id: string;
    programId: string;
    programName: string;
    day: string;
    time: string;
    instructorId: string;
    meetingUrl?: string;
    studentIds: string[];
}

export default function InstructorDashboard({ viewMode = 'dashboard' }: { viewMode?: 'dashboard' | 'curriculum' | 'roster' }) {
    const { studentProfile } = useAuth();
    const navigate = useNavigate();
    const [classes, setClasses] = useState<ClassGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeClass, setActiveClass] = useState<ClassGroup | null>(null);

    useEffect(() => {
        if (!studentProfile || !db) return;

        const fetchClasses = async () => {
            const firestore = db as Firestore;
            try {
                // Fetch programs targeting adults
                const q = query(collection(firestore, 'programs'), where('targetAudience', '==', 'adults'));
                const querySnapshot = await getDocs(q);

                const loadedClasses: ClassGroup[] = querySnapshot.docs.map(doc => {
                    const data = doc.data() as Program;
                    // Mocking schedule/student data for now as it doesn't strictly exist on the program doc yet
                    // In future, this would fetch from 'groups' subcollection or 'enrollments'
                    return {
                        id: doc.id,
                        programId: doc.id,
                        programName: data.name,
                        day: 'TBD', // Placeholder
                        time: 'Flexible',
                        instructorId: studentProfile.id,
                        meetingUrl: data.dashboardConfig?.meetingUrl || '',
                        studentIds: [] // We will fetch real enrollments later
                    };
                });

                setClasses(loadedClasses);
            } catch (err) {
                console.error("Error loading classes", err);
            } finally {
                setLoading(false);
            }
        };
        fetchClasses();
    }, [studentProfile]);

    if (loading) return <div className="p-12 text-center text-slate-500">Loading Command Center...</div>;

    const stats = [
        { label: 'Total Students', value: '42', icon: Users, color: 'bg-blue-50 text-blue-600' },
        { label: 'Avg Attendance', value: '94%', icon: CheckCircle, color: 'bg-green-50 text-green-600' },
        { label: 'Hours Taught', value: '128', icon: Clock, color: 'bg-purple-50 text-purple-600' },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-8 p-6">
            {/* Dashboard Title */}
            <div>
                <h2 className="text-2xl font-bold text-slate-900">
                    {viewMode === 'dashboard' && 'Dashboard Overview'}
                    {viewMode === 'curriculum' && 'Curriculum Management'}
                    {viewMode === 'roster' && 'Class Rosters'}
                </h2>
                <p className="text-slate-500">
                    {viewMode === 'dashboard' && 'Manage your active classes and programs.'}
                    {viewMode === 'curriculum' && 'Create and edit learning paths.'}
                    {viewMode === 'roster' && 'View student lists and profiles.'}
                </p>
            </div>

            {/* Quick Stats Grid */}
            {viewMode === 'dashboard' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {stats.map((stat, idx) => (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            key={stat.label}
                            className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow"
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                                <stat.icon size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Main Content: Active Classes */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Zap className="text-brand-500 fill-brand-500" size={20} /> Active Programs
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {classes.map((cls) => (
                            <div key={cls.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 mb-1">{cls.programName}</h3>
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <span className="bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide">Active</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                            <span className="text-sm font-medium">{cls.day}, {cls.time}</span>
                                        </div>
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                                        <Users size={24} />
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 mb-6">
                                    <div className="flex -space-x-3">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                {i === 4 ? '+' : ''}
                                            </div>
                                        ))}
                                    </div>
                                    <span className="text-sm text-slate-500 font-medium">{cls.studentIds?.length || 0} Students Enrolled</span>
                                    {/* Actions */}
                                    <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
                                        {(viewMode === 'dashboard' || viewMode === 'curriculum') && (
                                            <button
                                                onClick={() => navigate(`/instructor/curriculum/${cls.programId}`)}
                                                className="flex items-center justify-center gap-2 py-2 text-sm font-semibold text-slate-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                            >
                                                <BookOpen size={16} /> Edit Curriculum
                                            </button>
                                        )}
                                        {(viewMode === 'dashboard' || viewMode === 'roster') && (
                                            <button
                                                onClick={() => navigate(`/instructor/program/${cls.programId}/students`)}
                                                className="flex items-center justify-center gap-2 py-2 text-sm font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            >
                                                <Users size={16} /> View Roster
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                    </div>
                </div>

                {/* Sidebar: Live Session Control */}
                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                        {/* Abstract blobs */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                        <h2 className="text-xl font-bold mb-1 relative z-10">Live Session</h2>
                        <p className="text-slate-400 text-sm mb-6 relative z-10">Manage your active class now.</p>

                        {activeClass ? (
                            <div className="space-y-4 relative z-10">
                                <div className="p-4 bg-white/10 rounded-xl border border-white/10 backdrop-blur-sm">
                                    <div className="text-xs text-slate-400 uppercase font-bold mb-1">Current Class</div>
                                    <div className="font-bold">{activeClass.programName}</div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button className="py-3 bg-brand-500 hover:bg-brand-400 text-white rounded-xl font-bold text-sm transition shadow-lg shadow-brand-500/20">
                                        Take Attendance
                                    </button>
                                    <button className="py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm transition">
                                        Open Room
                                    </button>
                                </div>

                                <button className="w-full py-2 flex items-center justify-center gap-2 text-sm text-slate-300 hover:text-white transition">
                                    <MessageSquare size={16} /> Send link to chat
                                </button>
                            </div>
                        ) : (
                            <div className="py-8 text-center relative z-10">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                                    <Zap size={24} className="text-slate-500" />
                                </div>
                                <p className="text-slate-400 text-sm">No class selected.<br />Select a program to manage.</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-4">Quick Links</h3>
                        <div className="space-y-2">
                            <a href="#" className="block p-3 rounded-xl hover:bg-slate-50 transition text-sm font-medium text-slate-600 flex items-center justify-between group">
                                Academic Calendar <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                            <a href="#" className="block p-3 rounded-xl hover:bg-slate-50 transition text-sm font-medium text-slate-600 flex items-center justify-between group">
                                Student Reports <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                            <a href="#" className="block p-3 rounded-xl hover:bg-slate-50 transition text-sm font-medium text-slate-600 flex items-center justify-between group">
                                Support <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
