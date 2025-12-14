import React, { useState, useMemo } from 'react';
import { useFactoryData } from '../../hooks/useFactoryData';
import { User, Search, Award, Grid, ArrowLeft, Star, Clock } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface StudentManagerProps {
    onReviewProject: (projectId: string) => void;
}

export const StudentManager: React.FC<StudentManagerProps> = ({ onReviewProject }) => {
    const { studentProjects, students } = useFactoryData();
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Helper for safe date parsing
    const safeDate = (val: any): Date => {
        if (!val) return new Date();
        if (val.seconds) return new Date(val.seconds * 1000); // Firestore Timestamp
        if (typeof val === 'string' || val instanceof Date) return new Date(val); // Standard JS Date
        return new Date();
    };

    // Group projects by student to create a "Maker" profile
    const makers = useMemo(() => {
        const map = new Map<string, {
            id: string;
            name: string;
            projectCount: number;
            completedCount: number;
            lastActive: Date;
        }>();

        studentProjects.forEach(p => {
            if (!p.studentId) return;

            const existing = map.get(p.studentId);
            const pDate = safeDate(p.updatedAt);

            // Resolve Name: try project name, then lookup student list, then fallback
            let makerName = p.studentName;
            if (!makerName || makerName === 'Student' || makerName === 'Unknown Maker') {
                const foundStudent = students.find(s => s.id === p.studentId);
                if (foundStudent?.name) {
                    makerName = foundStudent.name;
                } else {
                    makerName = 'Unknown Maker';
                }
            }

            if (!existing) {
                map.set(p.studentId, {
                    id: p.studentId,
                    name: makerName,
                    projectCount: 1,
                    completedCount: p.status === 'published' ? 1 : 0,
                    lastActive: pDate
                });
            } else {
                existing.projectCount++;
                if (p.status === 'published') existing.completedCount++;
                if (pDate > existing.lastActive) existing.lastActive = pDate;
            }
        });

        return Array.from(map.values()).sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());
    }, [studentProjects]);

    const filteredMakers = makers.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const selectedMaker = useMemo(() => {
        if (!selectedStudentId) return null;
        return makers.find(m => m.id === selectedStudentId);
    }, [selectedStudentId, makers]);

    // If viewing a student details
    if (selectedStudentId && selectedMaker) {
        const makerProjects = studentProjects.filter(p => p.studentId === selectedStudentId);

        return (
            <div className="p-8 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-300">
                {/* Header */}
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => setSelectedStudentId(null)}
                        className="p-3 bg-white hover:bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all hover:scale-105 shadow-sm"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-4xl font-black text-slate-800 tracking-tight">{selectedMaker.name}</h2>
                            <span className="px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-500/30">
                                Level {Math.floor(selectedMaker.projectCount / 2) + 1} Maker
                            </span>
                        </div>
                        <p className="text-slate-500 font-medium text-lg mt-1">Viewing full mission portfolio.</p>
                    </div>
                </div>

                {/* Playful Stats Board */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="relative overflow-hidden bg-white p-8 rounded-3xl border-2 border-indigo-50 shadow-xl shadow-indigo-100/50 group hover:-translate-y-1 transition-all">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
                        <div className="relative">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4 text-2xl shadow-inner">
                                <Grid size={28} />
                            </div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Total Missions</p>
                            <p className="text-4xl font-black text-slate-800">{selectedMaker.projectCount}</p>
                        </div>
                    </div>

                    <div className="relative overflow-hidden bg-white p-8 rounded-3xl border-2 border-emerald-50 shadow-xl shadow-emerald-100/50 group hover:-translate-y-1 transition-all">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
                        <div className="relative">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 text-2xl shadow-inner">
                                <Award size={28} />
                            </div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Published</p>
                            <p className="text-4xl font-black text-slate-800">{selectedMaker.completedCount}</p>
                        </div>
                    </div>

                    <div className="relative overflow-hidden bg-white p-8 rounded-3xl border-2 border-amber-50 shadow-xl shadow-amber-100/50 group hover:-translate-y-1 transition-all">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
                        <div className="relative">
                            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4 text-2xl shadow-inner">
                                <Clock size={28} />
                            </div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Last Active</p>
                            <p className="text-2xl font-black text-slate-800 mt-2">{selectedMaker.lastActive.toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>

                {/* Projects Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {makerProjects.map(p => (
                        <div
                            key={p.id}
                            onClick={() => onReviewProject(p.id)}
                            className="group bg-white rounded-3xl p-6 border-2 border-slate-100 cursor-pointer hover:border-indigo-400 hover:shadow-2xl hover:shadow-indigo-100 hover:-translate-y-2 transition-all duration-300"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <span className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm ${p.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                                    p.status === 'submitted' ? 'bg-amber-100 text-amber-700' :
                                        'bg-slate-100 text-slate-600'
                                    }`}>
                                    {p.status}
                                </span>
                                <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">{p.station}</span>
                            </div>

                            <h4 className="font-extrabold text-slate-800 text-xl mb-3 line-clamp-1 group-hover:text-indigo-600 transition-colors">{p.title}</h4>
                            <p className="text-sm text-slate-500 line-clamp-2 mb-6 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-50">
                                {p.description || "No description provided."}
                            </p>

                            <div className="pt-4 border-t-2 border-slate-50 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                    <Clock size={12} /> {p.updatedAt ? safeDate(p.updatedAt).toLocaleDateString() : 'New'}
                                </span>
                                <span className="text-xs font-black text-indigo-500 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                    Review Project →
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Default: List Makers
    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h3 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 tracking-tight mb-2">
                        Makers Portfolio
                    </h3>
                    <p className="text-slate-500 font-medium text-lg">
                        Celebrating student creativity and progress.
                    </p>
                </div>

                {/* Search */}
                <div className="relative w-full md:w-96 group">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-200 to-purple-200 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity" />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                    <input
                        className="relative w-full pl-12 pr-4 py-4 bg-white/80 backdrop-blur-sm border-2 border-slate-100 rounded-2xl font-bold text-slate-600 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                        placeholder="Find a maker..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredMakers.map((maker, index) => (
                    <div
                        key={maker.id}
                        onClick={() => setSelectedStudentId(maker.id)}
                        className="group relative bg-white rounded-3xl p-6 cursor-pointer hover:-translate-y-2 transition-all duration-300"
                    >
                        {/* Playful Background Gradient on Hover */}
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        {/* Border Glow */}
                        <div className="absolute inset-0 border-2 border-slate-100 rounded-3xl group-hover:border-indigo-200 transition-colors duration-300" />

                        <div className="relative flex flex-col items-center text-center">
                            {/* Avatar */}
                            <div className="w-24 h-24 mb-4 relative">
                                <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${index % 3 === 0 ? 'from-indigo-400 to-cyan-400' :
                                    index % 3 === 1 ? 'from-fuchsia-400 to-pink-400' :
                                        'from-amber-400 to-orange-400'
                                    } opacity-20 group-hover:opacity-30 blur-md transition-opacity`} />

                                <div className={`w-full h-full rounded-full bg-gradient-to-br ${index % 3 === 0 ? 'from-indigo-100 to-cyan-50' :
                                    index % 3 === 1 ? 'from-fuchsia-100 to-pink-50' :
                                        'from-amber-100 to-orange-50'
                                    } flex items-center justify-center text-3xl font-black text-slate-700 group-hover:scale-110 transition-transform duration-300 border-4 border-white shadow-sm`}>
                                    {maker.name.charAt(0)}
                                </div>

                                {/* Status Dot */}
                                <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-400 border-4 border-white rounded-full shadow-sm" title="Active" />
                            </div>

                            <h4 className="font-extrabold text-xl text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">
                                {maker.name}
                            </h4>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-6">
                                Level {Math.floor(maker.projectCount / 2) + 1} Maker
                            </p>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-3 w-full">
                                <div className="bg-white/60 p-3 rounded-2xl border border-slate-100 group-hover:border-indigo-100 group-hover:bg-white/80 transition-all">
                                    <p className="text-2xl font-black text-slate-700">{maker.projectCount}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Missions</p>
                                </div>
                                <div className="bg-white/60 p-3 rounded-2xl border border-slate-100 group-hover:border-indigo-100 group-hover:bg-white/80 transition-all">
                                    <p className="text-2xl font-black text-emerald-600">{maker.completedCount}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Published</p>
                                </div>
                            </div>

                            <div className="mt-6 w-full pt-4 border-t border-slate-100/50 flex items-center justify-between text-xs font-medium text-slate-400 group-hover:text-indigo-400 transition-colors">
                                <span className="flex items-center gap-1">
                                    <Clock size={12} /> {new Date(maker.lastActive).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                                <span>View Portfolio →</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
