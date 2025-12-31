
import React, { useState, useMemo } from 'react';
import { Search, Plus, Zap, RefreshCw, Archive, Eye, Pencil, Filter, UserCheck, UserX, TrendingUp, MoreHorizontal, FileDown } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

export const StudentsView = ({
    onAddStudent,
    onEditStudent,
    onQuickEnroll,
    onViewProfile
}: {
    onAddStudent: () => void,
    onEditStudent: (s: any) => void,
    onQuickEnroll: (id?: string) => void,
    onViewProfile: (id: string) => void
}) => {
    const { students, enrollments, programs, navigateTo } = useAppContext();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterProgramId, setFilterProgramId] = useState('');
    const [filterGradeName, setFilterGradeName] = useState('');
    const [filterDay, setFilterDay] = useState('');
    const [filterAudience, setFilterAudience] = useState<'all' | 'kids' | 'adults'>('all');
    const [showArchived, setShowArchived] = useState(false);

    const toggleStudentStatus = async (student: any) => {
        if (!db) return;
        const newStatus = student.status === 'inactive' ? 'active' : 'inactive';
        const confirmMsg = newStatus === 'inactive'
            ? "Deactivate this student? They will be hidden from active lists but data is preserved."
            : "Reactivate this student?";

        if (window.confirm(confirmMsg)) {
            await updateDoc(doc(db, 'students', student.id), { status: newStatus });
        }
    };

    // Stats calculation
    const stats = useMemo(() => {
        const total = students.length;
        const active = students.filter(s => s.status === 'active').length;
        const inactive = students.filter(s => s.status === 'inactive').length;
        const newThisMonth = students.filter(s => {
            if (!s.createdAt) return false;
            // Handle both Firestore Timestamp and JS Date if needed, assuming Timestamp from types
            const created = s.createdAt as any;
            const d = created.toDate ? created.toDate() : new Date(created);
            const now = new Date();
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length;
        return { total, active, inactive, newThisMonth };
    }, [students]);

    const filteredStudents = useMemo(() => {
        let result = students.filter(student => {
            // Strict Visibility: Only show 'active' unless showArchived is true
            if (!showArchived && student.status === 'inactive') return false;
            if (showArchived && student.status !== 'inactive') return false; // When toggle ON, show ONLY archived

            if (searchQuery && !student.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;

            const studentEnrollments = enrollments.filter(e => e.studentId === student.id && e.status === 'active');

            if (filterAudience !== 'all') {
                const hasMatchingEnrollment = studentEnrollments.some(e => {
                    const prog = programs.find(p => p.id === e.programId);
                    return filterAudience === 'kids' ? (prog?.targetAudience !== 'adults') : (prog?.targetAudience === 'adults');
                });
                // If strictly filtering, exclude those who don't match. 
                // Note: Students with NO enrollments might be hidden if we enforce this strictly. 
                // Let's assume un-enrolled students are 'neutral' or hidden if filter is active.
                if (!hasMatchingEnrollment && studentEnrollments.length > 0) return false;
                if (studentEnrollments.length === 0 && filterAudience === 'adults') return false; // Hide new/empty students from Adult view by default? Or maybe not.
            }

            if (filterProgramId) {
                const matchesProgram = studentEnrollments.some(e => e.programId === filterProgramId);
                if (!matchesProgram) return false;
                if (filterGradeName && !studentEnrollments.some(e => e.programId === filterProgramId && e.gradeName === filterGradeName)) return false;
                if (filterDay && !studentEnrollments.some(e => e.programId === filterProgramId && e.groupTime && e.groupTime.includes(filterDay))) return false;
            } else {
                if (filterDay && !studentEnrollments.some(e => e.groupTime && e.groupTime.includes(filterDay))) return false;
            }
            return true;
        });

        // SORTING: Last Joined (createdAt desc)
        return result.sort((a, b) => {
            const getMillis = (date: any) => {
                if (!date) return 0;
                if (date.toMillis) return date.toMillis();
                return new Date(date).getTime();
            };
            return getMillis(b.createdAt) - getMillis(a.createdAt);
        });
    }, [students, enrollments, searchQuery, filterProgramId, filterGradeName, filterDay, showArchived]);

    return (
        <div className="space-y-6 pb-24 md:pb-8 md:h-full flex flex-col animate-in fade-in slide-in-from-right-4">
            {/* Header with Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Student Directory</h2>
                    <p className="text-slate-400 text-sm">Manage student profiles and enrollment status</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button onClick={() => onQuickEnroll()} className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-all active:scale-95">
                        <Zap size={16} className="text-amber-400" /> <span>Quick Enroll</span>
                    </button>
                    <button onClick={onAddStudent} className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-900/20 transition-all active:scale-95">
                        <Plus size={18} /> <span>Add Student</span>
                    </button>
                </div>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col relative overflow-hidden">
                    <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Active</div>
                    <div className="text-2xl font-bold text-white">{stats.active}</div>
                    <UserCheck className="absolute right-3 top-3 text-slate-800 w-8 h-8" />
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col relative overflow-hidden">
                    <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">New This Month</div>
                    <div className="text-2xl font-bold text-emerald-400">+{stats.newThisMonth}</div>
                    <TrendingUp className="absolute right-3 top-3 text-slate-800 w-8 h-8" />
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col relative overflow-hidden">
                    <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Inactive</div>
                    <div className="text-2xl font-bold text-slate-400">{stats.inactive}</div>
                    <UserX className="absolute right-3 top-3 text-slate-800 w-8 h-8" />
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col relative overflow-hidden group cursor-pointer hover:border-blue-500/50 transition-colors" onClick={() => navigateTo('tools')}>
                    <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Actions</div>
                    <div className="text-sm font-medium text-blue-400 mt-1 flex items-center gap-1">Bulk Import <FileDown size={14} /></div>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-3 bg-slate-900/50 p-2 rounded-xl border border-slate-800/50">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input type="text" placeholder="Search by name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-slate-600 transition-all" />
                </div>
                <div className="flex gap-2">
                    <div className="relative min-w-[140px]">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5" />
                        <select value={filterProgramId} onChange={(e) => { setFilterProgramId(e.target.value); setFilterGradeName(''); setFilterDay(''); }} className="w-full pl-9 pr-8 py-2.5 bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium rounded-lg appearance-none focus:border-blue-500 outline-none cursor-pointer">
                            <option value="">All Programs</option>
                            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="relative min-w-[140px]">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5" />
                        <select value={filterAudience} onChange={(e) => setFilterAudience(e.target.value as any)} className="w-full pl-9 pr-8 py-2.5 bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium rounded-lg appearance-none focus:border-blue-500 outline-none cursor-pointer">
                            <option value="all">All Ages</option>
                            <option value="kids">Kids & Teens</option>
                            <option value="adults">Adults (MakerPro)</option>
                        </select>
                    </div>
                    <button
                        onClick={() => setShowArchived(!showArchived)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-bold transition-all ${showArchived ? 'bg-red-950/30 text-red-400 border-red-900/50' : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600'}`}
                    >
                        <Archive size={14} /> {showArchived ? 'Hide Archived' : 'Archived'}
                    </button>
                </div>
            </div>

            {/* Student List */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden md:flex-1 md:flex md:flex-col shadow-lg shadow-black/20">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-y-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-950 text-slate-400 font-semibold sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-4 w-16 text-center">#</th>
                                <th className="p-4">Student</th>
                                <th className="p-4">Parent Contact</th>
                                <th className="p-4">Active Enrollments</th>
                                <th className="p-4">Joined</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredStudents.length === 0 ? (
                                <tr><td colSpan={6} className="p-12 text-center text-slate-500">No students found matching your criteria.</td></tr>
                            ) : filteredStudents.map((student, idx) => {
                                const activeEnrollments = enrollments.filter(e => e.studentId === student.id);
                                const isInactive = student.status === 'inactive';
                                const initials = student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                                const created = student.createdAt as any;
                                const joinDate = created && created.toDate ? created.toDate() : new Date(created);

                                return (
                                    <tr key={student.id} onClick={() => onViewProfile(student.id)} className={`group hover:bg-slate-800/40 transition-colors cursor-pointer ${isInactive ? 'opacity-60' : ''}`}>
                                        <td className="p-4 text-center">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-colors">
                                                {initials}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-white flex items-center gap-2 group-hover:text-blue-400 transition-colors">
                                                {student.name}
                                                {isInactive && <span className="text-[10px] uppercase bg-red-950/50 text-red-400 border border-red-900/50 px-1.5 py-0.5 rounded">Inactive</span>}
                                            </div>
                                            <div className="text-xs text-slate-500">{student.email || 'No email provided'}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-slate-300 text-xs font-medium uppercase tracking-wide mb-0.5">{student.parentName || 'Parent'}</div>
                                            <div className="text-sm font-mono text-slate-400 flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${student.parentPhone ? 'bg-emerald-500' : 'bg-red-500'}`}></div> {student.parentPhone}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-wrap gap-2">
                                                {activeEnrollments.map(e => (
                                                    <div key={e.id} className="flex items-center gap-1.5 text-xs bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-md text-slate-300 group-hover:border-slate-600 transition-colors">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                                        {e.programName}
                                                    </div>
                                                ))}
                                                {activeEnrollments.length === 0 && <span className="text-slate-600 italic text-xs">No active programs</span>}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-xs text-slate-500">{joinDate && !isNaN(joinDate.getTime()) ? joinDate.toLocaleDateString() : '-'}</div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {!isInactive && <button onClick={(e) => { e.stopPropagation(); onQuickEnroll(student.id); }} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-emerald-400 transition-colors" title="Quick Enroll"><Zap size={16} /></button>}
                                                <button onClick={(e) => { e.stopPropagation(); onEditStudent(student); }} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-400 transition-colors" title="Edit Profile"><Pencil size={16} /></button>
                                                <button onClick={(e) => { e.stopPropagation(); toggleStudentStatus(student); }} className={`p-2 hover:bg-slate-700 rounded-lg transition-colors ${isInactive ? 'text-emerald-500 hover:text-emerald-400' : 'text-slate-500 hover:text-red-400'}`} title={isInactive ? "Reactivate" : "Deactivate"}>
                                                    {isInactive ? <RefreshCw size={16} /> : <Archive size={16} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile List View */}
                <div className="md:hidden p-4 space-y-3 pb-4">
                    {filteredStudents.map(student => {
                        const activeEnrollments = enrollments.filter(e => e.studentId === student.id);
                        const isInactive = student.status === 'inactive';
                        const initials = student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                        return (
                            <div key={student.id} onClick={() => onViewProfile(student.id)} className={`bg-slate-950 border border-slate-800 rounded-xl p-4 active:scale-[0.98] transition-all relative overflow-hidden ${isInactive ? 'opacity-60' : ''}`}>
                                <div className="flex items-start gap-4 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-sm font-bold text-slate-400 shrink-0">
                                        {initials}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-white text-base truncate">{student.name}</h3>
                                        <p className="text-xs text-slate-500 truncate">{student.parentPhone} • {student.parentName}</p>
                                    </div>
                                    {isInactive && <span className="text-[10px] uppercase bg-red-950 text-red-400 px-2 py-1 rounded border border-red-900">Inactive</span>}
                                </div>

                                <div className="flex flex-wrap gap-2 mb-4 pl-14">
                                    {activeEnrollments.map(e => (
                                        <div key={e.id} className="text-[10px] font-medium bg-slate-900 border border-slate-800 px-2 py-1 rounded text-blue-300">
                                            {e.programName}
                                        </div>
                                    ))}
                                    {activeEnrollments.length === 0 && <span className="text-slate-600 text-xs italic">No enrollments</span>}
                                </div>

                                <div className="flex border-t border-slate-900 pt-3 gap-2">
                                    {!isInactive && <button onClick={(e) => { e.stopPropagation(); onQuickEnroll(student.id); }} className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-emerald-500 text-xs font-bold border border-slate-800 flex items-center justify-center gap-1"><Zap size={12} /> Enroll</button>}
                                    <button onClick={(e) => { e.stopPropagation(); onEditStudent(student); }} className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-slate-400 text-xs font-bold border border-slate-800 flex items-center justify-center gap-1"><Pencil size={12} /> Edit</button>
                                    <button onClick={(e) => { e.stopPropagation(); toggleStudentStatus(student); }} className="w-10 flex items-center justify-center bg-slate-900 hover:bg-slate-800 rounded-lg text-slate-400 border border-slate-800">
                                        {isInactive ? <RefreshCw size={14} /> : <Archive size={14} />}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};
