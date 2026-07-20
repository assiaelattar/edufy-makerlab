
import React, { useState, useMemo } from 'react';
import { Search, Plus, Zap, RefreshCw, Archive, Eye, Pencil, Filter, UserCheck, UserX, TrendingUp, FileDown, AlertTriangle, Users, ShieldCheck, Wallet, Link as LinkIcon } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useConfirm } from '../context/ConfirmContext';
import { Modal } from '../components/Modal';
import { AtlasCommandHeader } from '../components/atlas/AtlasSurface';
import StudentDirectoryHealth, { type StudentDirectoryFilter } from '../components/students/StudentDirectoryHealth';
import { normalizePhone, generateParentStatementPrint, formatCurrency } from '../utils/helpers';
import { buildStudentDirectoryHealth, STUDENT_DIRECTORY_ISSUE_LABELS } from '../utils/studentIdentity';

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
    const { can, currentOrganization } = useAuth();
    const { confirm, alert: showAlert } = useConfirm();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterProgramId, setFilterProgramId] = useState('');
    const [filterGradeName, setFilterGradeName] = useState('');
    const [filterDay, setFilterDay] = useState('');
    const [filterAudience, setFilterAudience] = useState<'all' | 'kids' | 'adults'>('all');
    const [showArchived, setShowArchived] = useState(false);
    const [directoryFilter, setDirectoryFilter] = useState<StudentDirectoryFilter>('all');

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
        const firestore = db;
        if (!firestore || selectedIds.length === 0) return;
        const selectedStudents = students.filter(student => selectedIds.includes(student.id));
        if (!currentOrganization) {
            await showAlert('Organization required', 'Select an active organization before updating student records.', 'warning');
            return;
        }
        if (selectedStudents.length === 0) {
            await showAlert('No student records selected', 'The selected records are no longer available. Refresh the directory and try again.', 'warning');
            return;
        }
        const hasTenantMismatch = selectedStudents.some(student => student.organizationId !== currentOrganization.id);
        if (hasTenantMismatch) {
            await showAlert('Selection could not be updated', 'One or more selected records belong to another organization. Refresh the directory and try again.', 'danger');
            return;
        }

        const normalizedPhoneVal = normalizePhone(parentForm.phone);
        if (!normalizedPhoneVal) {
            await showAlert('Parent phone required', 'Enter a valid parent phone number before linking these records.', 'warning');
            return;
        }

        const shouldContinue = await confirm({
            title: 'Link parent information',
            message: `Apply ${parentForm.name.trim()} and ${normalizedPhoneVal} to ${selectedStudents.length} student record${selectedStudents.length === 1 ? '' : 's'}? Existing parent information will be replaced.`,
            variant: 'warning',
            confirmText: 'Link records'
        });
        if (!shouldContinue) return;

        setIsLinking(true);
        try {
            for (let index = 0; index < selectedStudents.length; index += 450) {
                const batch = writeBatch(firestore);
                selectedStudents.slice(index, index + 450).forEach(student => {
                    batch.update(doc(firestore, 'students', student.id), {
                        parentName: parentForm.name.trim(),
                        parentPhone: normalizedPhoneVal
                    });
                });
                await batch.commit();
            }
            setIsLinkModalOpen(false);
            setParentForm({ name: '', phone: '' });
            setSelectedIds([]);
            await showAlert('Parent information linked', `${selectedStudents.length} student record${selectedStudents.length === 1 ? '' : 's'} updated.`, 'success');
        } catch (err) {
            console.error("Failed to link parents:", err);
            await showAlert('Could not link parent info', (err as Error).message, 'danger');
        } finally {
            setIsLinking(false);
        }
    };

    const toggleStudentStatus = async (student: any) => {
        const firestore = db;
        if (!firestore) return;
        if (!currentOrganization) {
            await showAlert('Organization required', 'Select an active organization before updating student records.', 'warning');
            return;
        }
        if (student.organizationId !== currentOrganization.id) {
            await showAlert('Student status could not be updated', 'This record does not belong to the active organization. Refresh the directory and try again.', 'danger');
            return;
        }
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
            try {
                await updateDoc(doc(firestore, 'students', student.id), { status: newStatus });
                setSelectedIds(previous => previous.filter(id => id !== student.id));
                await showAlert(
                    newStatus === 'inactive' ? 'Student deactivated' : 'Student reactivated',
                    `${student.name} is now ${newStatus}.`,
                    'success'
                );
            } catch (error) {
                console.error('Could not update student status:', error);
                await showAlert('Status was not updated', 'The student record could not be changed. Refresh and try again.', 'danger');
            }
        }
    };

    const directoryHealth = useMemo(
        () => buildStudentDirectoryHealth(students, enrollments),
        [students, enrollments]
    );

    const directorySummary = useMemo(() => {
        const activeRecords = students.filter(student => student.status === 'active');
        const countIssue = (issue: keyof typeof STUDENT_DIRECTORY_ISSUE_LABELS) => activeRecords.filter(student =>
            directoryHealth.records.get(student.id)?.issues.includes(issue)
        ).length;
        const healthyRecords = activeRecords.filter(student => {
            const issues = directoryHealth.records.get(student.id)?.issues || [];
            return !issues.some(issue => issue !== 'missing_profile');
        }).length;

        return {
            totalRecords: activeRecords.length,
            healthyRecords,
            missingContacts: countIssue('missing_contact'),
            missingProfile: countIssue('missing_profile'),
            noEnrollment: countIssue('no_enrollment'),
            unassignedGroup: countIssue('unassigned_group'),
            duplicateGroups: directoryHealth.duplicateGroups.length
        };
    }, [students, directoryHealth]);

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
        const enrolled = students.filter(s => s.status === 'active' && enrollments.some(e => e.studentId === s.id && e.status === 'active')).length;
        const dataHealth = active === 0 ? 100 : Math.round((directorySummary.healthyRecords / active) * 100);
        return { total, active, inactive, newThisMonth, enrolled, dataHealth };
    }, [students, enrollments, directorySummary.healthyRecords]);

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

    const parentLedger = useMemo(() => {
        const totalBalance = parentAccounts.reduce((sum, parent) => sum + parent.totalBalance, 0);
        const familiesWithBalance = parentAccounts.filter(parent => parent.totalBalance > 0).length;
        return { totalBalance, familiesWithBalance };
    }, [parentAccounts]);

    const filteredStudents = useMemo(() => {
        let result = students.filter(student => {
            // Strict Visibility: Only show 'active' unless showArchived is true
            if (!showArchived && student.status === 'inactive') return false;
            if (showArchived && student.status !== 'inactive') return false; // When toggle ON, show ONLY archived

            if (searchQuery) {
                const query = searchQuery.trim().toLowerCase();
                const searchable = [student.name, student.email, student.parentName, student.parentPhone, student.school]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                if (!searchable.includes(query)) return false;
            }

            const directoryIssues = directoryHealth.records.get(student.id)?.issues || [];
            if (directoryFilter === 'contact' && !directoryIssues.includes('missing_contact')) return false;
            if (directoryFilter === 'profile' && !directoryIssues.includes('missing_profile')) return false;
            if (directoryFilter === 'enrollment' && !directoryIssues.includes('no_enrollment')) return false;
            if (directoryFilter === 'placement' && !directoryIssues.includes('unassigned_group')) return false;
            if (directoryFilter === 'duplicates' && !directoryIssues.includes('possible_duplicate')) return false;

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
    }, [students, enrollments, programs, searchQuery, filterProgramId, filterGradeName, filterDay, filterAudience, showArchived, directoryFilter, directoryHealth]);

    const selectedProgram = useMemo(
        () => programs.find(program => program.id === filterProgramId),
        [programs, filterProgramId]
    );

    const availableDays = useMemo(() => {
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const configuredDays = selectedProgram?.grades.flatMap(grade => grade.groups.map(group => group.day).filter(Boolean)) || [];
        return dayNames.filter(day => configuredDays.some(configuredDay => day.toLowerCase().includes(configuredDay.toLowerCase())));
    }, [selectedProgram]);

    const clearFilters = () => {
        setSearchQuery('');
        setFilterProgramId('');
        setFilterGradeName('');
        setFilterDay('');
        setFilterAudience('all');
        setDirectoryFilter('all');
    };

    const hasActiveFilters = Boolean(searchQuery || filterProgramId || filterGradeName || filterDay || filterAudience !== 'all' || directoryFilter !== 'all');

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
        <div className="atlas-module atlas-students-module flex flex-col space-y-6 pb-24 md:pb-8">
            {/* Header with Actions */}
            <AtlasCommandHeader
                eyebrow="Core directory"
                title="Students and parent accounts"
                description="Manage learner profiles, household balances, enrollment readiness, and contact quality from one tenant-scoped command surface."
                icon={Users}
                badges={<span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-slate-400">{stats.total} total records</span>}
                actions={
                    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                        <div className="grid h-11 grid-cols-2 rounded-xl border border-white/10 bg-white/[0.04] p-1">
                            <button
                                type="button"
                                onClick={() => setViewMode('students')}
                                className={`rounded-lg px-4 text-xs font-black transition ${viewMode === 'students' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                Students
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('parents')}
                                className={`rounded-lg px-4 text-xs font-black transition ${viewMode === 'parents' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                Parents
                            </button>
                        </div>
                        {can('students.enroll') && (
                            <button onClick={() => onQuickEnroll()} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 text-sm font-black text-amber-200 transition hover:bg-amber-300/15 active:scale-[0.98]">
                                <Zap size={16} /> Quick enroll
                            </button>
                        )}
                        {can('students.edit') && (
                            <button onClick={onAddStudent} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-300 px-4 text-sm font-black text-slate-950 shadow-lg shadow-teal-950/20 transition hover:bg-teal-200 active:scale-[0.98]">
                                <Plus size={18} /> Add student
                            </button>
                        )}
                    </div>
                }
            />

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-[11px] font-black uppercase text-slate-500">Active students</div>
                    <div className="mt-2 text-3xl font-black text-white">{stats.active}</div>
                    <UserCheck className="absolute right-3 top-3 h-8 w-8 text-teal-300/18" />
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-[11px] font-black uppercase text-slate-500">New this month</div>
                    <div className="mt-2 text-3xl font-black text-emerald-300">+{stats.newThisMonth}</div>
                    <TrendingUp className="absolute right-3 top-3 h-8 w-8 text-emerald-300/18" />
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-[11px] font-black uppercase text-slate-500">With enrollment</div>
                    <div className="mt-2 text-3xl font-black text-sky-300">{stats.enrolled}</div>
                    <ShieldCheck className="absolute right-3 top-3 h-8 w-8 text-sky-300/18" />
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-[11px] font-black uppercase text-slate-500">Directory health</div>
                    <div className={`mt-2 text-3xl font-black ${stats.dataHealth > 85 ? 'text-emerald-300' : stats.dataHealth > 65 ? 'text-amber-300' : 'text-red-300'}`}>{stats.dataHealth}%</div>
                    <LinkIcon className="absolute right-3 top-3 h-8 w-8 text-amber-300/18" />
                </div>
                <button
                    type="button"
                    onClick={() => { setShowArchived(previous => !previous); setDirectoryFilter('all'); }}
                    className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-teal-300/30 hover:bg-white/[0.07]"
                >
                    <div className="text-[11px] font-black uppercase text-slate-500">Inactive records</div>
                    <div className="mt-2 flex items-center gap-2 text-sm font-black text-teal-200">
                        {stats.inactive} student{stats.inactive === 1 ? '' : 's'} <UserX size={14} />
                    </div>
                    <Archive className="absolute right-3 top-3 h-8 w-8 text-teal-300/18" />
                </button>
            </div>

            {viewMode === 'students' && (
                <StudentDirectoryHealth
                    {...directorySummary}
                    activeFilter={directoryFilter}
                    onFilter={(filter) => {
                        setDirectoryFilter(filter);
                        setShowArchived(false);
                    }}
                />
            )}

            {/* Filters & Search - Only show filters in Students mode */}
            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/55 p-3 shadow-lg shadow-black/10 md:flex-row">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input type="search" placeholder={viewMode === 'students' ? "Search students, parents, phone, email, or school..." : "Search by parent name or phone..."} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-11 w-full rounded-lg border border-white/10 bg-slate-950/80 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/15" />
                </div>
                {viewMode === 'students' && (
                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
                    <div className="relative min-w-[140px]">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5" />
                        <select value={filterProgramId} onChange={(e) => { setFilterProgramId(e.target.value); setFilterGradeName(''); setFilterDay(''); }} className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-slate-950/80 pl-9 pr-8 text-xs font-bold text-slate-300 outline-none transition focus:border-teal-400/60">
                            <option value="">All Programs</option>
                            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="relative min-w-[140px]">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5" />
                        <select value={filterAudience} onChange={(e) => setFilterAudience(e.target.value as any)} className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-white/10 bg-slate-950/80 pl-9 pr-8 text-xs font-bold text-slate-300 outline-none transition focus:border-teal-400/60">
                            <option value="all">All Ages</option>
                            <option value="kids">Kids & Teens</option>
                            <option value="adults">Adult learners</option>
                        </select>
                    </div>
                    <div className="relative min-w-[140px]">
                        <select value={filterGradeName} disabled={!selectedProgram} onChange={(e) => setFilterGradeName(e.target.value)} className="h-11 w-full cursor-pointer rounded-lg border border-white/10 bg-slate-950/80 px-3 text-xs font-bold text-slate-300 outline-none transition focus:border-teal-400/60 disabled:cursor-not-allowed disabled:opacity-45">
                            <option value="">All levels</option>
                            {selectedProgram?.grades.map(grade => <option key={grade.id} value={grade.name}>{grade.name}</option>)}
                        </select>
                    </div>
                    <div className="relative min-w-[140px]">
                        <select value={filterDay} disabled={availableDays.length === 0} onChange={(e) => setFilterDay(e.target.value)} className="h-11 w-full cursor-pointer rounded-lg border border-white/10 bg-slate-950/80 px-3 text-xs font-bold text-slate-300 outline-none transition focus:border-teal-400/60 disabled:cursor-not-allowed disabled:opacity-45">
                            <option value="">All days</option>
                            {availableDays.map(day => <option key={day} value={day}>{day}</option>)}
                        </select>
                    </div>
                    <button
                        onClick={() => { setShowArchived(previous => !previous); setDirectoryFilter('all'); }}
                        className={`flex h-11 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-black transition-all ${showArchived ? 'bg-red-950/30 text-red-300 border-red-400/30' : 'bg-slate-950/80 text-slate-400 border-white/10 hover:border-white/20'}`}
                    >
                        <Archive size={14} /> {showArchived ? 'Hide Archived' : 'Archived'}
                    </button>
                </div>
                )}
                {viewMode === 'students' && hasActiveFilters && (
                    <button type="button" onClick={clearFilters} className="h-11 shrink-0 rounded-lg border border-white/10 px-3 text-xs font-bold text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-white">
                        Clear filters
                    </button>
                )}
                {viewMode === 'parents' && (
                    <div className="grid grid-cols-2 gap-2 sm:min-w-[360px]">
                        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2">
                            <div className="text-[10px] font-black uppercase text-slate-500">Family balance</div>
                            <div className={`mt-0.5 text-sm font-black ${parentLedger.totalBalance > 0 ? 'text-red-300' : 'text-emerald-300'}`}>{formatCurrency(parentLedger.totalBalance)}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2">
                            <div className="text-[10px] font-black uppercase text-slate-500">Families due</div>
                            <div className="mt-0.5 text-sm font-black text-white">{parentLedger.familiesWithBalance}</div>
                        </div>
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
                                <tr><td colSpan={7} className="p-12 text-center text-slate-500">{hasActiveFilters ? 'No students match these filters.' : 'No student records yet.'}{hasActiveFilters && <button type="button" onClick={clearFilters} className="mx-auto mt-3 block text-xs font-bold text-teal-300 hover:text-teal-200">Clear filters</button>}</td></tr>
                            ) : filteredStudents.map((student, idx) => {
                                const activeEnrollments = enrollments.filter(e => e.studentId === student.id && e.status === 'active');
                                const isInactive = student.status === 'inactive';
                                const initials = (student.name || '').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                                const created = student.createdAt as any;
                                const joinDate = created && created.toDate ? created.toDate() : new Date(created);

                                return (() => {
                                    const qIssues = (directoryHealth.records.get(student.id)?.issues || [])
                                        .map(issue => STUDENT_DIRECTORY_ISSUE_LABELS[issue]);

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
                    {filteredStudents.length === 0 && (
                        <div className="rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
                            {hasActiveFilters ? 'No students match these filters.' : 'No student records yet.'}
                            {hasActiveFilters && <button type="button" onClick={clearFilters} className="mx-auto mt-3 block text-xs font-bold text-teal-300">Clear filters</button>}
                        </div>
                    )}
                    {filteredStudents.map(student => {
                        const activeEnrollments = enrollments.filter(e => e.studentId === student.id && e.status === 'active');
                        const isInactive = student.status === 'inactive';
                        const initials = (student.name || '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                        const qIssues = (directoryHealth.records.get(student.id)?.issues || [])
                            .map(issue => STUDENT_DIRECTORY_ISSUE_LABELS[issue]);
                        return (
                            <div key={student.id} onClick={() => onViewProfile(student.id)} className={`bg-slate-950 border border-slate-800 rounded-xl p-4 active:scale-[0.98] transition-all relative overflow-hidden ${isInactive ? 'opacity-60' : ''} ${qIssues.length > 0 && !isInactive ? 'border-l-2 border-l-amber-500/60' : ''}`}>
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
                                        <p className="text-xs text-slate-500 truncate">{student.parentPhone || 'No phone'} / {student.parentName || 'No parent name'}</p>
                                    </div>
                                    {isInactive && <span className="text-[10px] uppercase bg-red-950 text-red-400 px-2 py-1 rounded border border-red-900">Inactive</span>}
                                </div>

                                {qIssues.length > 0 && !isInactive && (
                                    <div className="mb-3 flex flex-wrap gap-1.5 pl-20">
                                        {qIssues.map(issue => (
                                            <span key={issue} className="flex items-center gap-1 rounded border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[10px] font-bold text-amber-300">
                                                <AlertTriangle size={10} /> {issue}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2 mb-4 pl-20">
                                    {activeEnrollments.map(e => (
                                        <div key={e.id} className="text-[10px] font-medium bg-slate-900 border border-slate-800 px-2 py-1 rounded text-blue-300">
                                            {e.programName}
                                        </div>
                                    ))}
                                    {activeEnrollments.length === 0 && <span className="text-slate-600 text-xs italic">No enrollments</span>}
                                </div>

                                <div className="flex border-t border-slate-900 pt-3 gap-2">
                                    {!isInactive && can('students.enroll') && <button onClick={(e) => { e.stopPropagation(); onQuickEnroll(student.id); }} className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-emerald-500 text-xs font-bold border border-slate-800 flex items-center justify-center gap-1"><Zap size={12} /> Enroll</button>}
                                    {can('students.edit') && <button onClick={(e) => { e.stopPropagation(); onEditStudent(student); }} className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-slate-400 text-xs font-bold border border-slate-800 flex items-center justify-center gap-1"><Pencil size={12} /> Edit</button>}
                                    {can('students.delete') && <button onClick={(e) => { e.stopPropagation(); toggleStudentStatus(student); }} className="w-10 flex items-center justify-center bg-slate-900 hover:bg-slate-800 rounded-lg text-slate-400 border border-slate-800" title={isInactive ? 'Reactivate student' : 'Deactivate student'} aria-label={isInactive ? 'Reactivate student' : 'Deactivate student'}>
                                        {isInactive ? <RefreshCw size={14} /> : <Archive size={14} />}
                                    </button>}
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
                                            <td className="p-4 text-right font-mono text-slate-300">{formatCurrency(parent.totalExpected)}</td>
                                            <td className="p-4 text-right font-mono text-emerald-400">{formatCurrency(parent.totalPaid)}</td>
                                            <td className="p-4 text-right font-mono font-bold text-lg">
                                                <span className={parent.totalBalance > 0 ? 'text-red-400' : 'text-slate-300'}>{formatCurrency(parent.totalBalance)}</span>
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
                    <div className="space-y-3 p-4 md:hidden">
                        {parentAccounts.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">No parents found matching your criteria.</div>
                        ) : parentAccounts.map(parent => {
                            const initials = (parent.parentName || '').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                            return (
                                <button
                                    key={parent.phone}
                                    type="button"
                                    onClick={() => setSelectedParentStatement(parent)}
                                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 text-left transition active:scale-[0.98]"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-xs font-black text-slate-300">{initials}</div>
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate font-black text-white">{parent.parentName}</div>
                                            <div className="mt-0.5 text-xs font-mono text-slate-500">{parent.phone}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-black uppercase text-slate-500">Balance</div>
                                            <div className={`text-sm font-black ${parent.totalBalance > 0 ? 'text-red-300' : 'text-emerald-300'}`}>{formatCurrency(parent.totalBalance)}</div>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        {parent.children.map(c => (
                                            <span key={c.student.id} className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] font-bold text-slate-300">
                                                {c.student.name.split(' ')[0]}
                                            </span>
                                        ))}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 z-40 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-4 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 shadow-2xl shadow-black/80">
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
                                    {formatCurrency(selectedParentStatement.totalBalance)}
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
                                                            <span className="text-slate-500">Exp: {formatCurrency(e.totalAmount || 0)}</span>
                                                            <span className="text-emerald-500">Paid: {formatCurrency(e.paidAmount || 0)}</span>
                                                            <span className={`font-bold min-w-24 text-right ${bal > 0 ? 'text-red-400' : 'text-slate-300'}`}>Bal: {formatCurrency(bal)}</span>
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
