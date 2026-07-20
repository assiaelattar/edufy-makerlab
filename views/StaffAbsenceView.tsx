import React, { useEffect, useMemo, useState } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { BarChart2, Calendar, CheckCircle2, ChevronRight, ClipboardCheck, Clock, Download, FileText, Filter, RotateCcw, Save, Search, ShieldCheck, User, XCircle } from 'lucide-react';
import { deleteDoc, doc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { AtlasActionButton, AtlasCommandHeader, AtlasEmptyState, AtlasSectionHeader, AtlasSignalCard, AtlasToolbar } from '../components/atlas/AtlasSurface';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { db } from '../services/firebase';
import { StaffAttendanceRecord } from '../types';
import { calculateDuration, formatDuration, timeToMinutes } from '../utils/timeUtils';

type StaffStatus = StaffAttendanceRecord['status'];

const statusStyles: Record<string, string> = {
    present: 'border-teal-300/35 bg-teal-500 text-slate-950',
    late: 'border-amber-300/35 bg-amber-400 text-slate-950',
    absent: 'border-red-300/35 bg-red-500 text-white',
    leave: 'border-sky-300/30 bg-sky-400/15 text-sky-200',
    excused: 'border-sky-300/30 bg-sky-400/15 text-sky-200'
};

export const StaffAbsenceView = () => {
    const { teamMembers, staffAttendanceRecords, settings } = useAppContext();
    const { currentOrganization, userProfile } = useAuth();
    const { confirm, alert: showAlert } = useConfirm();
    const today = format(new Date(), 'yyyy-MM-dd');
    const [selectedDate, setSelectedDate] = useState(today);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'unmarked' | StaffStatus>('all');
    const [activeTab, setActiveTab] = useState<'daily' | 'management'>('daily');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [localData, setLocalData] = useState<Record<string, { arrival?: string, departure?: string }>>({});
    const [saving, setSaving] = useState<string | null>(null);
    const [isBulkSaving, setIsBulkSaving] = useState(false);

    const eligibleStaff = useMemo(() => teamMembers.filter(member => !['student', 'parent', 'guest'].includes(member.role)), [teamMembers]);
    const staffList = useMemo(() => eligibleStaff.filter(member => {
        const query = searchQuery.trim().toLowerCase();
        if (query && !member.name.toLowerCase().includes(query) && !member.role.toLowerCase().includes(query)) return false;
        const status = staffAttendanceRecords.find(record => record.staffId === member.uid && record.date === selectedDate)?.status || 'unmarked';
        return statusFilter === 'all' || status === statusFilter;
    }), [eligibleStaff, searchQuery, selectedDate, staffAttendanceRecords, statusFilter]);

    const dayOfWeek = useMemo(() => {
        return format(parseISO(selectedDate), 'EEEE');
    }, [selectedDate]);
    const isToday = selectedDate === today;
    const isFutureDate = selectedDate > today;

    const getRecord = (staffId: string) => staffAttendanceRecords.find(record => record.staffId === staffId && record.date === selectedDate);
    const getRecordId = (staffId: string) => getRecord(staffId)?.id || `staff_${currentOrganization?.id}_${selectedDate}_${staffId}`;

    useEffect(() => {
        const nextLocal: Record<string, { arrival?: string, departure?: string }> = {};
        eligibleStaff.forEach(staff => {
            const record = getRecord(staff.uid!);
            nextLocal[staff.uid!] = {
                arrival: record?.arrivalTime || '',
                departure: record?.departureTime || ''
            };
        });
        setLocalData(nextLocal);
    }, [selectedDate, staffAttendanceRecords, eligibleStaff]);

    const handleMarkAttendance = async (staffId: string, staffName: string, status: StaffStatus, overrides?: Partial<StaffAttendanceRecord>) => {
        if (!db || !currentOrganization?.id) {
            console.error('Missing DB or Org ID', { db: !!db, org: currentOrganization?.id });
            await showAlert('Organization required', 'Select an organization before marking staff attendance.', 'warning');
            return;
        }
        if (isFutureDate) {
            await showAlert('Future attendance is locked', 'Move to today or an earlier date before recording staff attendance.', 'warning');
            return;
        }

        setSaving(staffId);
        const recordId = getRecordId(staffId);
        const existingRecord = getRecord(staffId);
        const arrival = overrides?.arrivalTime ?? localData[staffId]?.arrival ?? existingRecord?.arrivalTime;
        const departure = overrides?.departureTime ?? localData[staffId]?.departure ?? existingRecord?.departureTime;
        let totalMinutes = 0;
        let overtimeMinutes = 0;

        if (arrival && departure) {
            totalMinutes = calculateDuration(arrival, departure);
            const staff = teamMembers.find(member => member.uid === staffId);
            const workStart = staff?.workHours?.start || settings.defaultWorkHours?.start || '09:00';
            const workEnd = staff?.workHours?.end || settings.defaultWorkHours?.end || '18:00';
            overtimeMinutes = Math.max(0, totalMinutes - calculateDuration(workStart, workEnd));
        }

        try {
            let finalStatus = status;
            const staff = teamMembers.find(member => member.uid === staffId);
            const workStart = staff?.workHours?.start || settings.defaultWorkHours?.start || '09:00';
            if (status === 'present' && arrival && timeToMinutes(arrival) > timeToMinutes(workStart) + 5) {
                finalStatus = 'late';
            }
            const recordsTime = finalStatus === 'present' || finalStatus === 'late';
            await setDoc(doc(db, 'staff_attendance', recordId), {
                date: selectedDate,
                staffId,
                staffName,
                status: finalStatus,
                type: 'staff',
                organizationId: currentOrganization.id,
                markedBy: userProfile?.uid,
                ...(existingRecord ? {} : { createdAt: serverTimestamp() }),
                updatedAt: serverTimestamp(),
                ...overrides,
                totalMinutes: recordsTime ? totalMinutes : 0,
                overtimeMinutes: recordsTime ? overtimeMinutes : 0,
                arrivalTime: recordsTime ? arrival || null : null,
                departureTime: recordsTime ? departure || null : null
            }, { merge: true });
        } catch (error) {
            console.error('Error marking staff attendance', error);
            await showAlert(
                'Staff attendance was not saved',
                `The attendance record for ${staffName} could not be saved. ${error instanceof Error ? error.message : String(error)}`,
                'danger'
            );
        } finally {
            setSaving(null);
        }
    };

    const handleSaveTimes = async (staffId: string, staffName: string, status: StaffStatus | 'unmarked') => {
        if (status !== 'present' && status !== 'late') {
            await showAlert('Choose a working status first', 'Mark the team member present or late before saving arrival and departure times.', 'warning');
            return;
        }
        await handleMarkAttendance(staffId, staffName, status);
    };

    const handleClearAttendance = async (staffId: string, staffName: string) => {
        if (!db || !currentOrganization?.id || isFutureDate) return;
        const approved = await confirm({
            title: 'Clear this staff mark?',
            message: `${staffName} will return to unmarked for ${selectedDate}. Saved working times for this day will also be removed.`,
            confirmText: 'Clear mark',
            cancelText: 'Keep mark',
            variant: 'warning'
        });
        if (!approved) return;
        setSaving(staffId);
        try {
            await deleteDoc(doc(db, 'staff_attendance', getRecordId(staffId)));
        } catch (error) {
            console.error('Error clearing staff attendance', error);
            await showAlert('Staff mark was not cleared', 'The existing attendance record is still in place. Please try again.', 'danger');
        } finally {
            setSaving(null);
        }
    };

    const handleConfirmAllPresent = async () => {
        if (!db || !currentOrganization?.id) {
            await showAlert('Organization required', 'Select an organization before confirming staff attendance.', 'warning');
            return;
        }
        if (isFutureDate) {
            await showAlert('Future attendance is locked', 'Move to today or an earlier date before recording staff attendance.', 'warning');
            return;
        }
        const unmarked = eligibleStaff.filter(staff => !getRecord(staff.uid!));
        if (unmarked.length === 0) {
            await showAlert('Attendance already complete', 'Every team member already has an attendance mark for this date.', 'info');
            return;
        }
        const approved = await confirm({
            title: 'Confirm unmarked staff as present?',
            message: `Mark ${unmarked.length} unmarked ${unmarked.length === 1 ? 'team member' : 'team members'} present. Existing late, absent, leave, and excused records will remain unchanged.`,
            confirmText: 'Mark present',
            cancelText: 'Cancel',
            variant: 'info'
        });
        if (!approved) return;

        setIsBulkSaving(true);
        try {
            const batch = writeBatch(db);
            unmarked.forEach(staff => {
                batch.set(doc(db, 'staff_attendance', `staff_${currentOrganization.id}_${selectedDate}_${staff.uid}`), {
                    date: selectedDate,
                    staffId: staff.uid,
                    staffName: staff.name,
                    status: 'present',
                    type: 'staff',
                    organizationId: currentOrganization.id,
                    markedBy: userProfile?.uid || '',
                    totalMinutes: 0,
                    overtimeMinutes: 0,
                    createdAt: serverTimestamp()
                });
            });
            await batch.commit();
            await showAlert('Staff attendance confirmed', `${unmarked.length} unmarked ${unmarked.length === 1 ? 'team member is' : 'team members are'} now marked present.`, 'success');
        } catch (error) {
            console.error('Error confirming staff attendance', error);
            await showAlert('Staff attendance was not confirmed', 'No bulk attendance changes were completed. Please try again.', 'danger');
        } finally {
            setIsBulkSaving(false);
        }
    };

    const dailyStats = useMemo(() => {
        let present = 0;
        let absent = 0;
        let late = 0;
        let leave = 0;
        let excused = 0;
        let unmarked = 0;

        eligibleStaff.forEach(staff => {
            const status = getRecord(staff.uid!)?.status || 'unmarked';
            if (status === 'present') present++;
            else if (status === 'absent') absent++;
            else if (status === 'late') late++;
            else if (status === 'leave') leave++;
            else if (status === 'excused') excused++;
            else unmarked++;
        });

        return { total: eligibleStaff.length, present, absent, late, leave, excused, unmarked };
    }, [eligibleStaff, staffAttendanceRecords, selectedDate]);

    const monthlyReport = useMemo(() => {
        const report: Record<string, { present: number, absent: number, late: number, leave: number, totalMinutes: number, overtime: number }> = {};
        staffList.forEach(staff => {
            report[staff.uid!] = { present: 0, absent: 0, late: 0, leave: 0, totalMinutes: 0, overtime: 0 };
        });

        staffAttendanceRecords.forEach(record => {
            if (!record.date.startsWith(selectedMonth) || !report[record.staffId]) return;
            if (record.status === 'present') report[record.staffId].present++;
            else if (record.status === 'absent') report[record.staffId].absent++;
            else if (record.status === 'late') report[record.staffId].late++;
            else if (record.status === 'leave') report[record.staffId].leave++;

            if (record.status === 'present' || record.status === 'late') {
                report[record.staffId].totalMinutes += record.totalMinutes || 0;
                report[record.staffId].overtime += record.overtimeMinutes || 0;
            }
        });
        return report;
    }, [staffList, staffAttendanceRecords, selectedMonth]);

    const moveDate = (offset: number) => {
        setSelectedDate(format(addDays(parseISO(selectedDate), offset), 'yyyy-MM-dd'));
    };

    const updateLocalTime = (staffId: string, field: 'arrival' | 'departure', value: string) => {
        setLocalData(previous => ({
            ...previous,
            [staffId]: { ...previous[staffId], [field]: value }
        }));
    };

    const tabs = (
        <div className="flex w-full rounded-lg border border-white/10 bg-slate-950/70 p-1 lg:w-auto" role="tablist" aria-label="Staff attendance view">
            <button type="button" role="tab" aria-selected={activeTab === 'daily'} onClick={() => setActiveTab('daily')} className={`inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold transition-colors lg:flex-none ${activeTab === 'daily' ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'}`}>
                <Calendar size={16} /> Daily
            </button>
            <button type="button" role="tab" aria-selected={activeTab === 'management'} onClick={() => setActiveTab('management')} className={`inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold transition-colors lg:flex-none ${activeTab === 'management' ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'}`}>
                <BarChart2 size={16} /> Reports
            </button>
        </div>
    );

    return (
        <div className="flex h-full flex-col gap-5 pb-24 md:pb-8">
            <AtlasCommandHeader
                eyebrow="Team operations"
                title="Staff attendance"
                description="Keep daily presence, working hours, and attendance exceptions in one compact desk."
                icon={ClipboardCheck}
                badges={<span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-black uppercase text-slate-300">{eligibleStaff.length} staff</span>}
                actions={tabs}
            />

            {activeTab === 'daily' ? (
                <>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <AtlasSignalCard label="Team" value={dailyStats.total} detail={`${dailyStats.unmarked} awaiting a mark`} icon={User} tone="slate" />
                        <AtlasSignalCard label="Present" value={dailyStats.present} detail={`${dailyStats.leave} leave | ${dailyStats.excused} excused`} icon={CheckCircle2} tone="teal" />
                        <AtlasSignalCard label="Late" value={dailyStats.late} detail="Needs attention" icon={Clock} tone="amber" />
                        <AtlasSignalCard label="Absent" value={dailyStats.absent} detail="Attendance risk" icon={XCircle} tone="red" />
                    </div>

                    <AtlasToolbar
                        trailing={(
                            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-950 p-1">
                                <button type="button" onClick={() => moveDate(-1)} aria-label="Previous day" title="Previous day" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60">
                                    <ChevronRight size={17} className="rotate-180" />
                                </button>
                                <div className="border-x border-white/10 px-2 text-center">
                                    <div className="text-[9px] font-black uppercase text-teal-300">{dayOfWeek}</div>
                                    <input type="date" value={selectedDate} onChange={(event) => event.target.value && setSelectedDate(event.target.value)} aria-label="Staff attendance date" className="w-[132px] bg-transparent text-center font-mono text-xs font-bold text-white outline-none" />
                                </div>
                                {!isToday && <button type="button" onClick={() => setSelectedDate(today)} className="h-8 rounded-lg px-2 text-[10px] font-black uppercase text-teal-200 hover:bg-teal-400/10">Today</button>}
                                <button type="button" onClick={() => moveDate(1)} aria-label="Next day" title="Next day" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60">
                                    <ChevronRight size={17} />
                                </button>
                            </div>
                        )}
                    >
                        <div className="relative min-w-[220px] flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                            <input type="search" placeholder="Search team members or roles" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="h-10 w-full rounded-lg border border-white/10 bg-slate-950 pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10" />
                        </div>
                        <div className="relative min-w-[170px]">
                            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | 'unmarked' | StaffStatus)} className="h-10 w-full appearance-none rounded-lg border border-white/10 bg-slate-950 pl-10 pr-8 text-sm text-slate-300 outline-none transition-colors focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10">
                                <option value="all">All statuses</option>
                                <option value="unmarked">Unmarked</option>
                                <option value="present">Present</option>
                                <option value="late">Late</option>
                                <option value="absent">Absent</option>
                                <option value="leave">Leave</option>
                                <option value="excused">Excused</option>
                            </select>
                        </div>
                        <AtlasActionButton icon={CheckCircle2} variant="primary" disabled={dailyStats.unmarked === 0 || isFutureDate || isBulkSaving} onClick={handleConfirmAllPresent}>
                            {isBulkSaving ? 'Confirming...' : 'Confirm unmarked'}
                        </AtlasActionButton>
                    </AtlasToolbar>

                    <section className="space-y-4">
                        <AtlasSectionHeader title="Daily team roster" description={`${dailyStats.unmarked} of ${dailyStats.total} team members still need an attendance mark`} icon={User} />
                        {isFutureDate && <div className="rounded-lg border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">This is a schedule preview. Staff attendance controls unlock on the selected date.</div>}
                        {staffList.length === 0 ? (
                            <AtlasEmptyState title="No team members found" description="No staff match the current search and status filters." icon={User} action={<AtlasActionButton onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}>Clear filters</AtlasActionButton>} />
                        ) : (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {staffList.map(staff => {
                                    const record = getRecord(staff.uid!);
                                    const status = record?.status || 'unmarked';
                                    const overtime = record?.overtimeMinutes || 0;
                                    const localArrival = localData[staff.uid!]?.arrival || '';
                                    const localDeparture = localData[staff.uid!]?.departure || '';
                                    const timesDirty = localArrival !== (record?.arrivalTime || '') || localDeparture !== (record?.departureTime || '');
                                    const statusOptions: Array<{ id: StaffStatus, label: string, icon: typeof CheckCircle2 }> = [
                                        { id: 'present', label: 'Present', icon: CheckCircle2 },
                                        { id: 'late', label: 'Late', icon: Clock },
                                        { id: 'absent', label: 'Absent', icon: XCircle },
                                        { id: 'leave', label: 'Leave', icon: FileText },
                                        { id: 'excused', label: 'Excused', icon: ShieldCheck }
                                    ];

                                    return (
                                        <article key={staff.uid} className={`relative overflow-hidden rounded-xl border bg-slate-900/75 p-4 ${status === 'absent' ? 'border-red-400/30' : status === 'late' ? 'border-amber-300/25' : status === 'present' ? 'border-teal-300/20' : 'border-white/10'}`}>
                                            {saving === staff.uid && (
                                                <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/65">
                                                    <Clock className="animate-spin text-teal-300" size={20} aria-label="Saving attendance" />
                                                </div>
                                            )}

                                            <div className="mb-3 flex items-start justify-between gap-3">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-slate-950 text-sm font-black text-white">{staff.name[0]}</div>
                                                    <div className="min-w-0">
                                                        <h4 className="truncate text-sm font-black text-white">{staff.name}</h4>
                                                        <span className="block truncate text-[10px] font-bold uppercase text-slate-500">{staff.role}</span>
                                                    </div>
                                                </div>
                                                <span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase ${status === 'unmarked' ? 'border-amber-300/20 bg-amber-400/10 text-amber-200' : statusStyles[status]}`}>
                                                    {status}
                                                </span>
                                            </div>

                                            <div className="mb-3 grid grid-cols-5 gap-1.5" aria-label={`Attendance status for ${staff.name}`}>
                                                {statusOptions.map(option => (
                                                    <button key={option.id} type="button" disabled={saving === staff.uid || isFutureDate} onClick={() => handleMarkAttendance(staff.uid!, staff.name, option.id)} aria-pressed={status === option.id} title={option.label} className={`flex h-10 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 ${status === option.id ? statusStyles[option.id] : 'border-white/10 bg-slate-950 text-slate-500 hover:border-white/20 hover:text-white'}`}>
                                                        <option.icon size={16} />
                                                        <span className="sr-only">{option.label}</span>
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="rounded-lg border border-white/10 bg-slate-950/70 p-3">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <label className="min-w-0">
                                                        <span className="mb-1 block text-[9px] font-black uppercase text-slate-500">Arrival</span>
                                                        <input type="time" value={localArrival} disabled={isFutureDate} onChange={(event) => updateLocalTime(staff.uid!, 'arrival', event.target.value)} className="h-9 w-full rounded-lg border border-white/10 bg-slate-900 px-2 font-mono text-xs text-white outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-45 focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10" />
                                                    </label>
                                                    <label className="min-w-0">
                                                        <span className="mb-1 block text-[9px] font-black uppercase text-slate-500">Departure</span>
                                                        <input type="time" value={localDeparture} disabled={isFutureDate} onChange={(event) => updateLocalTime(staff.uid!, 'departure', event.target.value)} className="h-9 w-full rounded-lg border border-white/10 bg-slate-900 px-2 font-mono text-xs text-white outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-45 focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10" />
                                                    </label>
                                                </div>

                                                <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-2">
                                                    <span className="text-[10px] text-slate-500">Times save only for present or late staff.</span>
                                                    <div className="flex shrink-0 items-center gap-1">
                                                        {status !== 'unmarked' && <button type="button" disabled={saving === staff.uid || isFutureDate} onClick={() => handleClearAttendance(staff.uid!, staff.name)} title="Return to unmarked" aria-label={`Clear attendance mark for ${staff.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"><RotateCcw size={14} /></button>}
                                                        <button type="button" disabled={!timesDirty || saving === staff.uid || isFutureDate || (status !== 'present' && status !== 'late')} onClick={() => handleSaveTimes(staff.uid!, staff.name, status)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-[10px] font-bold text-slate-300 hover:border-teal-300/30 hover:text-teal-200 disabled:cursor-not-allowed disabled:opacity-40">
                                                            <Save size={13} /> Save times
                                                        </button>
                                                    </div>
                                                </div>

                                                {(record?.totalMinutes || 0) > 0 && (
                                                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-2 text-[10px]">
                                                        <span className="text-slate-500">Worked <strong className="font-mono text-white">{formatDuration(record!.totalMinutes!)}</strong></span>
                                                        <span className={`font-mono font-black ${overtime < 0 ? 'text-red-300' : overtime > 0 ? 'text-amber-200' : 'text-teal-200'}`}>
                                                            {overtime > 0 ? `+${formatDuration(overtime)} OT` : overtime < 0 ? `${formatDuration(overtime)} short` : 'On time'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </>
            ) : (
                <section className="space-y-4">
                    <AtlasSectionHeader title="Monthly hours report" description="Review attendance rate, worked time, and overtime across the team." icon={BarChart2} />
                    <AtlasToolbar
                        trailing={<AtlasActionButton icon={Download} disabled title="Report export is not connected yet">Export unavailable</AtlasActionButton>}
                    >
                        <label className="flex min-w-[220px] flex-1 items-center gap-3">
                            <span className="text-xs font-bold text-slate-400">Reporting month</span>
                            <input type="month" value={selectedMonth} onChange={(event) => event.target.value && setSelectedMonth(event.target.value)} className="h-10 rounded-lg border border-white/10 bg-slate-950 px-3 font-mono text-sm text-white outline-none transition-colors focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10" />
                        </label>
                    </AtlasToolbar>
                    <p className="text-xs text-slate-500">Export is intentionally disabled until a verified payroll-ready format is connected. The on-screen report remains the source of truth.</p>

                    {staffList.length === 0 ? (
                        <AtlasEmptyState title="No staff to report" description="The monthly report will appear when staff members are available." icon={BarChart2} />
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/70">
                            <table className="w-full min-w-[680px] text-left">
                                <thead className="border-b border-white/10 bg-slate-950/80">
                                    <tr className="text-[10px] font-black uppercase text-slate-500">
                                        <th className="px-4 py-3">Team member</th>
                                        <th className="px-4 py-3 text-center">Days</th>
                                        <th className="px-4 py-3 text-center">Total time</th>
                                        <th className="px-4 py-3 text-center">Net overtime</th>
                                        <th className="px-4 py-3 text-center">Attendance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.07]">
                                    {staffList.map(staff => {
                                        const stats = monthlyReport[staff.uid!] || { present: 0, absent: 0, late: 0, leave: 0, totalMinutes: 0, overtime: 0 };
                                        const totalEntries = stats.present + stats.absent + stats.late;
                                        const attendanceRate = totalEntries > 0 ? Math.round(((stats.present + stats.late) / totalEntries) * 100) : 0;
                                        return (
                                            <tr key={staff.uid} className="transition-colors hover:bg-white/[0.025]">
                                                <td className="px-4 py-3">
                                                    <div className="text-sm font-bold text-white">{staff.name}</div>
                                                    <div className="text-[10px] uppercase text-slate-500">{staff.role}</div>
                                                </td>
                                                <td className="px-4 py-3 text-center font-mono text-xs font-bold text-slate-300">{stats.present + stats.late}d</td>
                                                <td className="px-4 py-3 text-center font-mono text-xs font-black text-white">{formatDuration(stats.totalMinutes)}</td>
                                                <td className={`px-4 py-3 text-center font-mono text-xs font-black ${stats.overtime < 0 ? 'text-red-300' : stats.overtime > 0 ? 'text-amber-200' : 'text-teal-200'}`}>{stats.overtime > 0 ? '+' : ''}{formatDuration(stats.overtime)}</td>
                                                <td className="px-4 py-3 text-center font-mono text-sm font-black text-white">{attendanceRate}%</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}
        </div>
    );
};
