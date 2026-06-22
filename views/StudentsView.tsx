
import React, { useState, useMemo } from 'react';
import { Search, Plus, Zap, RefreshCw, Archive, Eye, Pencil, Filter, UserCheck, UserX, TrendingUp, MoreHorizontal, FileDown, AlertTriangle, Users } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useConfirm } from '../context/ConfirmContext';
import { Modal } from '../components/Modal';
import { normalizePhone, generateParentStatementPrint } from '../utils/helpers';

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
    const { students, enrollments, programs, navigateTo, settings } = useAppContext();
    const { can } = useAuth();
    const { confirm } = useConfirm();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterProgramId, setFilterProgramId] = useState('');
    const [filterGradeName, setFilterGradeName] = useState('');
    const [filterDay, setFilterDay] = useState('');
    const [filterAudience, setFilterAudience] = useState<'all' | 'kids' | 'adults'>('all');
    const [showArchived, setShowArchived] = useState(false);

    // Selection state
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    // Link Parent Modal state
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [parentForm, setParentForm] = useState({ name: '', phone: '' });
    const [isLinking, setIsLinking] = useState(false);
    const [autofillSearch, setAutofillSearch] = useState('');
    const [showAutofillResults, setShowAutofillResults] = useState(false);

    // Parent View Mode state
    const [viewMode, setViewMode] = useState<'students' | 'parents'>('students');
    const [selectedParentStatement, setSelectedParentStatement] = useState<any>(null);

    // Autofill suggestions
    const autofillSuggestions = useMemo(() => {
        if (!autofillSearch) return [];
        const seen = new Set<string>();
        return students.filter(s => {
            if (!s.parentPhone || !s.parentName) return false;
            const normalized = normalizePhone(s.parentPhone);
            if (seen.has(normalized)) return false;
            const matches = s.name.toLowerCase().includes(autofillSearch.toLowerCase()) || 
                            s.parentName.toLowerCase().includes(autofillSearch.toLowerCase());
            if (matches) {
                seen.add(normalized);
                return true;
            }
            return false;
        }).slice(0, 5);
    }, [students, autofillSearch]);

    const handleAutofillSelect = (student: any) => {
        setParentForm({
            name: student.parentName || '',
            phone: student.parentPhone || ''
        });
        setAutofillSearch('');
        setShowAutofillResults(false);
    };

    const handleBulkLinkParents = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || selectedIds.length === 0) return;
        setIsLinking(true);
        try {
            const normalizedPhoneVal = normalizePhone(parentForm.phone);
            for (const id of selectedIds) {
                await updateDoc(doc(db, 'students', id), {
                    parentName: parentForm.name,
                    parentPhone: normalizedPhoneVal
                });
            }
            setIsLinkModalOpen(false);
            setParentForm({ name: '', phone: '' });
            setSelectedIds([]);
        } catch (err) {
            console.error("Failed to link parents:", err);
            alert("Error linking students: " + (err as Error).message);
        } finally {
            setIsLinking(false);
        }
    };

    const toggleStudentStatus = async (student: any) => {
        if (!db) return;
        const newStatus = student.status === 'inactive' ? 'active' : 'inactive';
        const confirmMsg = newStatus === 'inactive'
            ? "Deactivate this student? They will be hidden from active lists but data is preserved."
            : "Reactivate this student?";

        if (await confirm({
            title: newStatus === 'inactive' ? 'Deactivate Student' : 'Reactivate Student',
            message: confirmMsg,
            variant: newStatus === 'inactive' ? 'danger' : 'success',
            confirmText: newStatus === 'inactive' ? 'Deactivate' : 'Reactivate'
        })) {
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

    // Parent Accounts calculation for "Parents" view
    const parentAccounts = useMemo(() => {
        const map = new Map<string, {
            phone: string;
            parentName: string;
            children: { student: any; enrollments: any[] }[];
            totalBalance: number;
            totalPaid: number;
            totalExpected: number;
        }>();

        students.forEach(student => {
            if (student.status === 'inactive') return;
            const phoneStr = normalizePhone(student.parentPhone || '');
            if (!phoneStr) return; 

            if (!map.has(phoneStr)) {
                map.set(phoneStr, {
                    phone: phoneStr,
                    parentName: student.parentName || 'Unknown Parent',
                    children: [],
                    totalBalance: 0,
                    totalPaid: 0,
                    totalExpected: 0
                });
            }

            const entry = map.get(phoneStr)!;
            const studentEnrollments = enrollments.filter(e => e.studentId === student.id && e.status === 'active');
            
            entry.children.push({ student, enrollments: studentEnrollments });
            
            studentEnrollments.forEach(e => {
                const bal = (e.totalAmount || 0) - (e.paidAmount || 0);
                entry.totalBalance += (bal > 0 ? bal : 0);
                entry.totalPaid += (e.paidAmount || 0);
                entry.totalExpected += (e.totalAmount || 0);
            });
        });

        let result = Array.from(map.values()).filter(p => p.children.length > 0);
        
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p => p.parentName.toLowerCase().includes(q) || p.phone.includes(q));
        }

        return result.sort((a, b) => b.totalBalance - a.totalBalance);
    }, [students, enrollments, searchQuery]);

    const filteredStudents = useMemo(() => {
        let result = students.filter(student => {
            // Strict Visibility: Only show 'active' unless showArchived is true
            if (!showArchived && student.status === 'inactive') return false;
            if (showArchived && student.status !== 'inactive') return false; // When toggle ON, show ONLY archived

            if (searchQuery && !(student.name || '').toLowerCase().includes(searchQuery.toLowerCase())) return false;

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

    const allFilteredSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedIds.includes(s.id));
    const toggleSelectAll = () => {
        if (allFilteredSelected) {
            const filteredSet = new Set(filteredStudents.map(s => s.id));
            setSelectedIds(prev => prev.filter(id => !filteredSet.has(id)));
        } else {
            setSelectedIds(prev => {
                const newIds = [...prev];
                filteredStudents.forEach(s => {
                    if (!newIds.includes(s.id)) newIds.push(s.id);
                });
                return newIds;
            });
        }
    };

    return (
        <div className="space-y-6 pb-24 md:pb-8 flex flex-col animate-in fade-in slide-in-from-right-4">
            {/* Header with Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Directory</h2>
                    <p className="text-slate-400 text-sm">Manage student profiles and parent accounts</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-1 flex mr-2">
                        <button 
                            onClick={() => setViewMode('students')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === 'students' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Students
                        </button>
                        <button 
                            onClick={() => setViewMode('parents')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === 'parents' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Parents (Solde)
                        </button>
                    </div>
                    {can('students.enroll') && (
                        <button onClick={() => onQuickEnroll()} className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-all active:scale-95">
                            <Zap size={16} className="text-amber-400" /> <span>Quick Enroll</span>
                        </button>
                    )}
                    {can('students.edit') && (
                        <button onClick={onAddStudent} className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-900/20 transition-all active:scale-95">
                            <Plus size={18} /> <span>Add Student</span>
                        </button>
                    )}
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
                {can('settings.manage') && (
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col relative overflow-hidden group cursor-pointer hover:border-blue-500/50 transition-colors" onClick={() => navigateTo('tools')}>
                        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Actions</div>
                        <div className="text-sm font-medium text-blue-400 mt-1 flex items-center gap-1">Bulk Import <FileDown size={14} /></div>
                    </div>
                )}
            </div>

            {/* Filters & Search - Only show filters in Students mode */}
            <div className="flex flex-col md:flex-row gap-3 bg-slate-900/50 p-2 rounded-xl border border-slate-800/50">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input type="text" placeholder={viewMode === 'students' ? "Search by student name..." : "Search by parent name or phone..."} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-slate-600 transition-all" />
                </div>
                {viewMode === 'students' && (
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
                )}
            </div>

            {/* Main Content Area */}
            {viewMode === 'students' ? (
                /* Student List */
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg shadow-black/20">
                {/* Desktop Table */}
                <div className="hidden md:block">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-950 text-slate-400 font-semibold sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-4 w-10 text-center">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 accent-blue-600 rounded bg-slate-950 border-slate-850 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        checked={allFilteredSelected}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
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
                                <tr><td colSpan={7} className="p-12 text-center text-slate-500">No students found matching your criteria.</td></tr>
                            ) : filteredStudents.map((student, idx) => {
                                const activeEnrollments = enrollments.filter(e => e.studentId === student.id);
                                const isInactive = student.status === 'inactive';
                                const initials = (student.name || '').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                                const created = student.createdAt as any;
                                const joinDate = created && created.toDate ? created.toDate() : new Date(created);

                                return (() => {
                                    // Compute quality issues for this student
                                    const now = new Date();
                                    const ageDays = Math.floor((now.getTime() - (joinDate?.getTime?.() || 0)) / 86400000);
                                    const qIssues: string[] = [];
                                    if (!student.parentPhone) qIssues.push('No phone');
                                    if (ageDays >= 7 && activeEnrollments.length === 0) qIssues.push('No enrollment');
                                    const anyNoPayment = activeEnrollments.some(e => {
                                        const eAge = Math.floor((now.getTime() - (e.createdAt?.toDate?.()?.getTime?.() || new Date((e.createdAt as any) || 0).getTime())) / 86400000);
                                        return eAge >= 7 && (e.paidAmount || 0) === 0 && (e.totalAmount || 0) > 0;
                                    });
                                    if (anyNoPayment) qIssues.push('No payment');

                                    return (
                                    <tr key={student.id} onClick={() => onViewProfile(student.id)} className={`group hover:bg-slate-800/40 transition-colors cursor-pointer ${isInactive ? 'opacity-60' : ''} ${qIssues.length > 0 && !isInactive ? 'border-l-2 border-amber-600/50' : ''}`}>
                                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 accent-blue-600 rounded bg-slate-900 border-slate-800 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                checked={selectedIds.includes(student.id)}
                                                onChange={() => {
                                                    setSelectedIds(prev => 
                                                        prev.includes(student.id) ? prev.filter(x => x !== student.id) : [...prev, student.id]
                                                    );
                                                }}
                                            />
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-colors">
                                                {initials}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-white flex items-center gap-2 group-hover:text-blue-400 transition-colors">
                                                {student.name}
                                                {isInactive && <span className="text-[10px] uppercase bg-red-950/50 text-red-400 border border-red-900/50 px-1.5 py-0.5 rounded">Inactive</span>}
                                                {qIssues.length > 0 && !isInactive && (
                                                    <span title={qIssues.join(' · ')} className="flex items-center gap-1 text-[10px] bg-amber-900/30 text-amber-400 border border-amber-800/40 px-1.5 py-0.5 rounded font-medium">
                                                        <AlertTriangle size={10} /> {qIssues.length} issue{qIssues.length > 1 ? 's' : ''}
                                                    </span>
                                                )}
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
                                                {!isInactive && can('students.enroll') && <button onClick={(e) => { e.stopPropagation(); onQuickEnroll(student.id); }} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-emerald-400 transition-colors" title="Quick Enroll"><Zap size={16} /></button>}
                                                {can('students.edit') && <button onClick={(e) => { e.stopPropagation(); onEditStudent(student); }} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-400 transition-colors" title="Edit Profile"><Pencil size={16} /></button>}
                                                {can('students.delete') && (
                                                    <button onClick={(e) => { e.stopPropagation(); toggleStudentStatus(student); }} className={`p-2 hover:bg-slate-700 rounded-lg transition-colors ${isInactive ? 'text-emerald-500 hover:text-emerald-400' : 'text-slate-500 hover:text-red-400'}`} title={isInactive ? "Reactivate" : "Deactivate"}>
                                                        {isInactive ? <RefreshCw size={16} /> : <Archive size={16} />}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })()
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile List View */}
                <div className="md:hidden p-4 space-y-3 pb-4">
                    {filteredStudents.map(student => {
                        const activeEnrollments = enrollments.filter(e => e.studentId === student.id);
                        const isInactive = student.status === 'inactive';
                        const initials = (student.name || '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                        return (
                            <div key={student.id} onClick={() => onViewProfile(student.id)} className={`bg-slate-950 border border-slate-800 rounded-xl p-4 active:scale-[0.98] transition-all relative overflow-hidden ${isInactive ? 'opacity-60' : ''}`}>
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="flex items-center mt-2.5" onClick={(e) => e.stopPropagation()}>
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 accent-blue-600 rounded bg-slate-900 border-slate-800 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            checked={selectedIds.includes(student.id)}
                                            onChange={() => {
                                                setSelectedIds(prev => 
                                                    prev.includes(student.id) ? prev.filter(x => x !== student.id) : [...prev, student.id]
                                                );
                                            }}
                                        />
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-sm font-bold text-slate-400 shrink-0">
                                        {initials}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-white text-base truncate">{student.name}</h3>
                                        <p className="text-xs text-slate-500 truncate">{student.parentPhone || <span className="text-amber-500">No phone ⚠</span>} • {student.parentName}</p>
                                    </div>
                                    {isInactive && <span className="text-[10px] uppercase bg-red-950 text-red-400 px-2 py-1 rounded border border-red-900">Inactive</span>}
                                </div>

                                <div className="flex flex-wrap gap-2 mb-4 pl-20">
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
            ) : (
                /* Parents View List */
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg shadow-black/20">
                    <div className="hidden md:block">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-950 text-slate-400 font-semibold sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-4 w-16 text-center">#</th>
                                    <th className="p-4">Parent Details</th>
                                    <th className="p-4">Children Enrolled</th>
                                    <th className="p-4 text-right">Expected</th>
                                    <th className="p-4 text-right">Paid</th>
                                    <th className="p-4 text-right font-bold text-amber-500">Solde (Balance)</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {parentAccounts.length === 0 ? (
                                    <tr><td colSpan={7} className="p-12 text-center text-slate-500">No parents found matching your criteria.</td></tr>
                                ) : parentAccounts.map((parent, idx) => {
                                    const initials = (parent.parentName || '').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                                    return (
                                        <tr key={parent.phone} onClick={() => setSelectedParentStatement(parent)} className="group hover:bg-slate-800/40 transition-colors cursor-pointer">
                                            <td className="p-4 text-center">
                                                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-colors">
                                                    {initials}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{parent.parentName}</div>
                                                <div className="text-xs font-mono text-slate-400">{parent.phone}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {parent.children.map(c => (
                                                        <span key={c.student.id} className="text-xs bg-slate-950 border border-slate-800 px-2 py-1 rounded-md text-slate-300">
                                                            {c.student.name.split(' ')[0]}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right font-mono text-slate-300">{parent.totalExpected}</td>
                                            <td className="p-4 text-right font-mono text-emerald-400">{parent.totalPaid}</td>
                                            <td className="p-4 text-right font-mono font-bold text-lg">
                                                <span className={parent.totalBalance > 0 ? 'text-red-400' : 'text-slate-300'}>{parent.totalBalance}</span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={(e) => { e.stopPropagation(); setSelectedParentStatement(parent); }} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-400 transition-colors" title="View Statement"><Eye size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-slate-800 px-6 py-4 rounded-xl shadow-2xl shadow-black/80 flex items-center gap-6 z-40 animate-in fade-in slide-in-from-bottom-6 backdrop-blur">
                    <div className="text-sm text-slate-300 font-medium animate-pulse">
                        <span className="font-bold text-white bg-blue-600/30 px-2.5 py-1 rounded-full border border-blue-500/20 text-xs mr-2">{selectedIds.length}</span> 
                        student{selectedIds.length > 1 ? 's' : ''} selected
                    </div>
                    <div className="h-5 w-px bg-slate-800"></div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsLinkModalOpen(true)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 shadow-lg shadow-blue-900/20"
                        >
                            <Users size={14} /> Link Parent Info
                        </button>
                        <button 
                            onClick={() => setSelectedIds([])}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-xs font-bold transition-all border border-slate-700"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Link Parent Modal */}
            <Modal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} title="Link Students to Parent Account" size="md">
                <form onSubmit={handleBulkLinkParents} className="space-y-5">
                    {/* Selected Students Info */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                        <label className="text-[10px] uppercase font-bold text-slate-500 block">Linking Students ({selectedIds.length})</label>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                            {selectedIds.map(id => {
                                const s = students.find(x => x.id === id);
                                return s ? (
                                    <span key={id} className="text-xs bg-slate-900 text-slate-300 border border-slate-800 px-2.5 py-1 rounded-md">
                                        {s.name}
                                    </span>
                                ) : null;
                            })}
                        </div>
                    </div>

                    {/* Copy Details Autocomplete */}
                    <div className="space-y-1 relative">
                        <label className="text-[10px] uppercase font-bold text-slate-400 block">Copy details from an existing student</label>
                        <input 
                            type="text" 
                            placeholder="Search student name..." 
                            className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:border-blue-500 outline-none" 
                            value={autofillSearch} 
                            onChange={e => {
                                setAutofillSearch(e.target.value);
                                setShowAutofillResults(true);
                            }}
                            onFocus={() => setShowAutofillResults(true)}
                        />
                        {showAutofillResults && autofillSuggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 bg-slate-950 border border-slate-800 rounded-lg mt-1 shadow-2xl z-50 max-h-40 overflow-y-auto divide-y divide-slate-800">
                                {autofillSuggestions.map(s => (
                                    <div 
                                        key={s.id} 
                                        onClick={() => handleAutofillSelect(s)}
                                        className="p-2.5 hover:bg-slate-900 cursor-pointer text-xs transition-colors"
                                    >
                                        <div className="font-bold text-white">{s.name}</div>
                                        <div className="text-[10px] text-slate-500">Parent: {s.parentName} ({s.parentPhone})</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {showAutofillResults && autofillSearch && autofillSuggestions.length === 0 && (
                            <div className="absolute top-full left-0 right-0 bg-slate-950 border border-slate-800 rounded-lg mt-1 p-2.5 text-[10px] text-slate-500 italic z-50">
                                No students with parent details found.
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-slate-800"></div>

                    {/* Parent details form */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Parent Name *</label>
                            <input 
                                required 
                                type="text" 
                                placeholder="e.g. Jean Dupont" 
                                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:border-blue-500 outline-none" 
                                value={parentForm.name} 
                                onChange={e => setParentForm(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Parent Phone *</label>
                            <input 
                                required 
                                type="text" 
                                placeholder="e.g. +212600112233" 
                                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:border-blue-500 outline-none" 
                                value={parentForm.phone} 
                                onChange={e => setParentForm(prev => ({ ...prev, phone: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <button 
                            type="submit" 
                            disabled={isLinking || !parentForm.name || !parentForm.phone}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {isLinking ? 'Linking...' : 'Confirm Link'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Parent Statement Modal */}
            <Modal isOpen={!!selectedParentStatement} onClose={() => setSelectedParentStatement(null)} title="Parent Financial Statement" size="lg">
                {selectedParentStatement && (
                    <div className="space-y-6">
                        {/* Summary Header */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">{selectedParentStatement.parentName}</h3>
                                <p className="text-sm font-mono text-slate-400">{selectedParentStatement.phone}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Balance Due</p>
                                <p className={`text-3xl font-bold font-mono ${selectedParentStatement.totalBalance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {selectedParentStatement.totalBalance} <span className="text-sm text-slate-500 font-normal">MAD</span>
                                </p>
                            </div>
                        </div>

                        {/* Breakdown */}
                        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                            {selectedParentStatement.children.map((c: any) => (
                                <div key={c.student.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800">
                                        <h4 className="font-bold text-white">{c.student.name}</h4>
                                        <button 
                                            onClick={() => {
                                                setSelectedParentStatement(null);
                                                navigateTo('student-details', { studentId: c.student.id });
                                            }}
                                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-900/20 px-2 py-1 rounded"
                                        >
                                            View Details
                                        </button>
                                    </div>
                                    {c.enrollments.length === 0 ? (
                                        <p className="text-xs text-slate-500 italic">No active enrollments.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {c.enrollments.map((e: any) => {
                                                const bal = (e.totalAmount || 0) - (e.paidAmount || 0);
                                                return (
                                                    <div key={e.id} className="flex justify-between items-center text-sm">
                                                        <span className="text-slate-300">{e.programName}</span>
                                                        <div className="flex gap-4 font-mono text-xs">
                                                            <span className="text-slate-500">Exp: {e.totalAmount || 0}</span>
                                                            <span className="text-emerald-500">Paid: {e.paidAmount || 0}</span>
                                                            <span className={`font-bold w-16 text-right ${bal > 0 ? 'text-red-400' : 'text-slate-300'}`}>Bal: {bal}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="pt-4 flex gap-3 border-t border-slate-800">
                            <button 
                                onClick={() => setSelectedParentStatement(null)}
                                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors border border-slate-700"
                            >
                                Close
                            </button>
                            <button 
                                onClick={() => {
                                    generateParentStatementPrint(selectedParentStatement, settings);
                                }}
                                className="flex-[2] py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                            >
                                <FileDown size={18} /> Print Official Statement
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
