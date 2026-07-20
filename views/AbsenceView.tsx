import React, { useMemo, useState } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { AlertCircle, Calendar, CheckCircle2, ChevronRight, ClipboardCheck, Clock, Filter, MessageCircle, RotateCcw, Search, ShieldCheck, Users, XCircle } from 'lucide-react';
import { deleteDoc, doc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { AtlasActionButton, AtlasCommandHeader, AtlasEmptyState, AtlasSectionHeader, AtlasSignalCard, AtlasToolbar } from '../components/atlas/AtlasSurface';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { db } from '../services/firebase';
import { AttendanceRecord } from '../types';

export const AbsenceView = () => {
    const { enrollments, students, attendanceRecords } = useAppContext();
    const { currentOrganization, userProfile } = useAuth();
    const { confirm, alert: showAlert } = useConfirm();
    const today = format(new Date(), 'yyyy-MM-dd');
    const [selectedDate, setSelectedDate] = useState(today);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGroup, setSelectedGroup] = useState('All');
    const [savingRecordId, setSavingRecordId] = useState<string | null>(null);
    const [isConfirmingSession, setIsConfirmingSession] = useState(false);

    const dayOfWeek = useMemo(() => {
        return format(parseISO(selectedDate), 'EEEE');
    }, [selectedDate]);

    const currentTimeMinutes = useMemo(() => {
        const now = new Date();
        return now.getHours() * 60 + now.getMinutes();
    }, []);

    const isToday = selectedDate === today;
    const isFutureDate = selectedDate > today;

    const allScheduledStudents = useMemo(() => {
        return enrollments.filter(enrollment => {
            if (enrollment.status !== 'active') return false;

            const student = students.find(item => item.id === enrollment.studentId);
            if (!student || student.status === 'inactive') return false;

            const mainHasClass = enrollment.groupTime?.includes(dayOfWeek);
            const secondaryHasClass = enrollment.secondGroupTime?.includes(dayOfWeek);

            return mainHasClass || secondaryHasClass;
        }).flatMap(enrollment => {
            const slots = [];

            if (enrollment.groupTime?.includes(dayOfWeek)) {
                slots.push({
                    ...enrollment,
                    displayTime: enrollment.groupTime.replace(dayOfWeek, '').trim(),
                    displayGroup: enrollment.groupName || ''
                });
            }

            if (enrollment.secondGroupTime?.includes(dayOfWeek)) {
                slots.push({
                    ...enrollment,
                    displayTime: enrollment.secondGroupTime.replace(dayOfWeek, '').trim(),
                    displayGroup: enrollment.secondGroupName || ''
                });
            }

            return slots;
        });
    }, [enrollments, students, dayOfWeek]);

    const scheduledStudents = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return allScheduledStudents.filter(enrollment => {
            if (query && !enrollment.studentName.toLowerCase().includes(query)) return false;
            return selectedGroup === 'All' || enrollment.displayGroup === selectedGroup;
        });
    }, [allScheduledStudents, searchQuery, selectedGroup]);

    const studentsByTime = useMemo(() => {
        const groups: Record<string, typeof scheduledStudents> = {};
        scheduledStudents.forEach(student => {
            if (!groups[student.displayTime]) groups[student.displayTime] = [];
            groups[student.displayTime].push(student);
        });

        return Object.keys(groups)
            .sort((first, second) => parseInt(first.replace(':', '')) - parseInt(second.replace(':', '')))
            .map(time => ({ time, students: groups[time] }));
    }, [scheduledStudents]);

    const getRecordId = (studentId: string, timeSlot: string) => {
        const sanitizedTime = timeSlot.replace(':', '');
        return `${selectedDate}_${studentId}_${sanitizedTime}`;
    };

    const getStatus = (studentId: string, timeSlot: string) => {
        const recordId = getRecordId(studentId, timeSlot);
        return attendanceRecords.find(record => record.id === recordId)?.status || 'unmarked';
    };

    const handleMarkAttendance = async (studentId: string, enrollmentId: string, status: AttendanceRecord['status'], timeSlot: string) => {
        if (!db || !currentOrganization?.id) {
            await showAlert('Organization required', 'Select an organization before marking student attendance.', 'warning');
            return;
        }
        if (isFutureDate) {
            await showAlert('Future attendance is locked', 'Move to today or an earlier date before recording attendance.', 'warning');
            return;
        }

        const recordId = getRecordId(studentId, timeSlot);
        const existingRecord = attendanceRecords.find(record => record.id === recordId);
        setSavingRecordId(recordId);

        try {
            await setDoc(doc(db, 'attendance', recordId), {
                date: selectedDate,
                studentId,
                enrollmentId,
                status,
                slotTime: timeSlot,
                organizationId: currentOrganization.id,
                markedBy: userProfile?.uid || '',
                ...(existingRecord ? {} : { createdAt: serverTimestamp() }),
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error('Error marking attendance', error);
            await showAlert(
                'Attendance was not saved',
                `The attendance mark could not be saved. ${error instanceof Error ? error.message : String(error)}`,
                'danger'
            );
        } finally {
            setSavingRecordId(null);
        }
    };

    const handleClearAttendance = async (studentId: string, studentName: string, timeSlot: string) => {
        if (!db || !currentOrganization?.id || isFutureDate) return;
        const recordId = getRecordId(studentId, timeSlot);
        const approved = await confirm({
            title: 'Clear this attendance mark?',
            message: `${studentName} will return to unmarked for the ${timeSlot} session. This does not mark the student present.`,
            confirmText: 'Clear mark',
            cancelText: 'Keep mark',
            variant: 'warning'
        });
        if (!approved) return;

        setSavingRecordId(recordId);
        try {
            await deleteDoc(doc(db, 'attendance', recordId));
        } catch (error) {
            console.error('Error clearing attendance', error);
            await showAlert('Attendance mark was not cleared', 'The existing mark is still in place. Please try again.', 'danger');
        } finally {
            setSavingRecordId(null);
        }
    };

    const handleConfirmAllPresent = async (studentsInSlot: typeof scheduledStudents) => {
        if (!db || !currentOrganization?.id) {
            await showAlert('Organization required', 'Select an organization before confirming this session.', 'warning');
            return;
        }
        if (isFutureDate) {
            await showAlert('Future attendance is locked', 'Sessions can only be confirmed on or after their scheduled date.', 'warning');
            return;
        }

        const unmarked = studentsInSlot.filter(student => getStatus(student.studentId, student.displayTime) === 'unmarked');
        if (unmarked.length === 0) {
            await showAlert('Attendance already confirmed', 'Every student in this session already has an attendance mark.', 'info');
            return;
        }

        const approved = await confirm({
            title: 'Confirm this session?',
            message: `Mark ${unmarked.length} unmarked ${unmarked.length === 1 ? 'student' : 'students'} as present. Existing late, absent, and excused marks will stay unchanged.${searchQuery || selectedGroup !== 'All' ? ' Only students currently shown by your filters will be changed.' : ''}`,
            confirmText: 'Mark present',
            cancelText: 'Cancel',
            variant: 'info'
        });
        if (!approved) return;

        setIsConfirmingSession(true);
        try {
            const batch = writeBatch(db);
            unmarked.forEach(student => {
                const recordId = getRecordId(student.studentId, student.displayTime);
                batch.set(doc(db, 'attendance', recordId), {
                    date: selectedDate,
                    studentId: student.studentId,
                    enrollmentId: student.id,
                    status: 'present',
                    slotTime: student.displayTime,
                    organizationId: currentOrganization.id,
                    markedBy: userProfile?.uid || '',
                    createdAt: serverTimestamp()
                });
            });
            await batch.commit();
            await showAlert('Session confirmed', `${unmarked.length} unmarked ${unmarked.length === 1 ? 'student is' : 'students are'} now marked present. Existing exceptions were preserved.`, 'success');
        } catch (error) {
            console.error('Error confirming attendance', error);
            await showAlert(
                'Session was not confirmed',
                `The unmarked students could not be updated. ${error instanceof Error ? error.message : String(error)}`,
                'danger'
            );
        } finally {
            setIsConfirmingSession(false);
        }
    };

    const isCurrentBlock = (time: string) => {
        if (!isToday || !time) return false;
        const [hours, minutes] = time.split(':').map(Number);
        const slotMinutes = hours * 60 + minutes;
        return currentTimeMinutes >= slotMinutes && currentTimeMinutes < slotMinutes + 90;
    };

    const dailyStats = useMemo(() => {
        let present = 0;
        let absent = 0;
        let late = 0;
        let excused = 0;
        let unmarked = 0;

        allScheduledStudents.forEach(student => {
            const status = getStatus(student.studentId, student.displayTime);
            if (status === 'present') present++;
            else if (status === 'absent') absent++;
            else if (status === 'late') late++;
            else if (status === 'excused') excused++;
            else unmarked++;
        });

        return { total: allScheduledStudents.length, present, absent, late, excused, unmarked };
    }, [allScheduledStudents, attendanceRecords, selectedDate]);

    const uniqueGroups = useMemo(() => {
        const groups = new Set<string>();
        enrollments.forEach(enrollment => {
            if (enrollment.groupName) groups.add(enrollment.groupName);
            if (enrollment.secondGroupName) groups.add(enrollment.secondGroupName);
        });
        return Array.from(groups).sort();
    }, [enrollments]);

    const handleWhatsAppAlert = (studentName: string, parentPhone: string, status: string) => {
        const cleanPhone = parentPhone.replace(/[^0-9]/g, '');
        const message = `Hello, just to inform you that ${studentName} was marked ${status.toUpperCase()} for the class on ${selectedDate}.`;
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const moveDate = (offset: number) => {
        setSelectedDate(format(addDays(parseISO(selectedDate), offset), 'yyyy-MM-dd'));
    };

    return (
        <div className="flex h-full flex-col gap-5 pb-24 md:pb-8">
            <AtlasCommandHeader
                eyebrow="Learning operations"
                title="Student attendance"
                description="Mark each scheduled session, surface exceptions, and contact families without leaving the roster."
                icon={ClipboardCheck}
                badges={isToday
                    ? <span className="rounded-full border border-teal-300/20 bg-teal-400/10 px-2 py-1 text-[10px] font-black uppercase text-teal-200">Today</span>
                    : isFutureDate
                        ? <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-1 text-[10px] font-black uppercase text-amber-200">Preview only</span>
                        : undefined}
                actions={(
                    <div className="flex w-full items-center gap-1 rounded-lg border border-white/10 bg-slate-950/70 p-1 lg:w-auto">
                        <button type="button" onClick={() => moveDate(-1)} aria-label="Previous day" title="Previous day" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60">
                            <ChevronRight size={18} className="rotate-180" />
                        </button>
                        <div className="min-w-0 border-x border-white/10 px-2 text-center">
                            <div className="text-[9px] font-black uppercase text-teal-300">{dayOfWeek}</div>
                            <input type="date" value={selectedDate} onChange={(event) => event.target.value && setSelectedDate(event.target.value)} aria-label="Attendance date" className="w-[132px] bg-transparent text-center font-mono text-xs font-bold text-white outline-none" />
                        </div>
                        {!isToday && <button type="button" onClick={() => setSelectedDate(today)} className="h-9 rounded-lg px-2 text-[10px] font-black uppercase text-teal-200 hover:bg-teal-400/10">Today</button>}
                        <button type="button" onClick={() => moveDate(1)} aria-label="Next day" title="Next day" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60">
                            <ChevronRight size={18} />
                        </button>
                    </div>
                )}
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <AtlasSignalCard label="Scheduled" value={dailyStats.total} detail={`${studentsByTime.length} session${studentsByTime.length === 1 ? '' : 's'}`} icon={Users} tone="slate" />
                <AtlasSignalCard label="Marked present" value={dailyStats.present} detail={`${dailyStats.unmarked} awaiting a mark`} icon={CheckCircle2} tone="teal" />
                <AtlasSignalCard label="Late" value={dailyStats.late} detail="Needs follow-up" icon={AlertCircle} tone="amber" />
                <AtlasSignalCard label="Absent" value={dailyStats.absent} detail={`${dailyStats.excused} excused`} icon={XCircle} tone="red" />
            </div>

            <AtlasToolbar>
                <div className="relative min-w-[220px] flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input type="search" placeholder="Search students" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="h-10 w-full rounded-lg border border-white/10 bg-slate-950 pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10" />
                </div>
                <div className="relative min-w-[170px]">
                    <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <select value={selectedGroup} onChange={(event) => setSelectedGroup(event.target.value)} className="h-10 w-full appearance-none rounded-lg border border-white/10 bg-slate-950 pl-10 pr-8 text-sm text-slate-300 outline-none transition-colors focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10">
                        <option value="All">All groups</option>
                        {uniqueGroups.map(group => <option key={group} value={group}>{group}</option>)}
                    </select>
                </div>
            </AtlasToolbar>

            <section className="space-y-4">
                <AtlasSectionHeader title="Session roster" description={`${dayOfWeek}, ${selectedDate} · ${dailyStats.unmarked} attendance ${dailyStats.unmarked === 1 ? 'mark' : 'marks'} remaining`} icon={Calendar} />
                {isFutureDate && (
                    <div className="rounded-lg border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                        This is a schedule preview. Attendance controls unlock on the session date.
                    </div>
                )}
                {studentsByTime.length === 0 ? (
                    <AtlasEmptyState
                        title={allScheduledStudents.length > 0 ? 'No students match these filters' : 'No scheduled sessions'}
                        description={allScheduledStudents.length > 0 ? 'Clear the search or group filter to restore the daily roster.' : `No active class enrollments are scheduled for ${dayOfWeek}. Try another date or review the class schedule.`}
                        icon={Calendar}
                        action={allScheduledStudents.length > 0 ? <AtlasActionButton onClick={() => { setSearchQuery(''); setSelectedGroup('All'); }}>Clear filters</AtlasActionButton> : !isToday ? <AtlasActionButton onClick={() => setSelectedDate(today)}>Go to today</AtlasActionButton> : undefined}
                    />
                ) : (
                    <div className="space-y-3">
                        {studentsByTime.map(slot => {
                            const isLive = isCurrentBlock(slot.time);
                            const unmarkedCount = slot.students.filter(student => getStatus(student.studentId, student.displayTime) === 'unmarked').length;
                            return (
                                <div key={slot.time} className={`overflow-hidden rounded-xl border bg-slate-900/75 ${isLive ? 'border-teal-300/40' : 'border-white/10'}`}>
                                    <div className={`flex flex-col gap-3 border-b px-3 py-3 sm:flex-row sm:items-center ${isLive ? 'border-teal-300/20 bg-teal-400/[0.06]' : 'border-white/10 bg-slate-950/55'}`}>
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span className={`rounded-lg border px-2.5 py-1.5 font-mono text-xs font-black ${isLive ? 'border-teal-300/30 bg-teal-400/10 text-teal-200' : 'border-white/10 bg-white/[0.04] text-slate-200'}`}>{slot.time}</span>
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-sm font-black text-white">{slot.students.length} scheduled</span>
                                                    {isLive && <span className="rounded-full border border-teal-300/20 bg-teal-400/10 px-2 py-0.5 text-[9px] font-black uppercase text-teal-200">Live now</span>}
                                                </div>
                                                <p className="text-[11px] text-slate-500">{unmarkedCount === 0 ? 'Session complete' : `${unmarkedCount} ${unmarkedCount === 1 ? 'mark' : 'marks'} remaining`}</p>
                                            </div>
                                        </div>
                                        <AtlasActionButton icon={CheckCircle2} variant="primary" className="sm:ml-auto" disabled={unmarkedCount === 0 || isFutureDate || isConfirmingSession} onClick={() => handleConfirmAllPresent(slot.students)}>
                                            {isConfirmingSession ? 'Confirming...' : 'Confirm unmarked'}
                                        </AtlasActionButton>
                                    </div>

                                    <div className="divide-y divide-white/[0.07]">
                                        {slot.students.map(student => {
                                            const status = getStatus(student.studentId, student.displayTime);
                                            const recordId = getRecordId(student.studentId, student.displayTime);
                                            const isSaving = savingRecordId === recordId;
                                            const initials = (student.studentName || '').split(' ').map(name => name[0]).join('').slice(0, 2);
                                            const studentDetails = students.find(item => item.id === student.studentId);
                                            return (
                                                <div key={`${student.id}_${student.displayTime}`} className="flex flex-col gap-3 px-3 py-3 transition-colors hover:bg-white/[0.025] sm:flex-row sm:items-center sm:justify-between">
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-slate-950 text-[11px] font-black text-slate-300">{initials}</div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="truncate text-sm font-bold text-white">{student.studentName}</span>
                                                                {(status === 'absent' || status === 'late') && studentDetails?.parentPhone && (
                                                                    <button type="button" onClick={(event) => { event.stopPropagation(); handleWhatsAppAlert(student.studentName, studentDetails.parentPhone, status); }} aria-label={`Message ${student.studentName}'s parent`} title="Message parent on WhatsApp" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-teal-300 transition-colors hover:bg-teal-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60">
                                                                        <MessageCircle size={14} />
                                                                    </button>
                                                                )}
                                                                {status !== 'unmarked' && (
                                                                    <button type="button" disabled={isSaving || isFutureDate} onClick={() => handleClearAttendance(student.studentId, student.studentName, student.displayTime)} aria-label={`Clear attendance mark for ${student.studentName}`} title="Return to unmarked" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60">
                                                                        <RotateCcw size={13} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                                                                <span className="truncate">{student.programName}</span>
                                                                <span aria-hidden="true">·</span>
                                                                <span className="truncate">{student.displayGroup}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-1.5 sm:flex sm:shrink-0">
                                                        <button type="button" disabled={isSaving || isFutureDate} onClick={() => handleMarkAttendance(student.studentId, student.id, 'present', student.displayTime)} aria-pressed={status === 'present'} className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 ${status === 'present' ? 'border-teal-300/40 bg-teal-500 text-slate-950' : 'border-white/10 bg-slate-950 text-slate-400 hover:border-teal-300/30 hover:text-teal-200'}`}>
                                                            <CheckCircle2 size={14} /> Present
                                                        </button>
                                                        <button type="button" disabled={isSaving || isFutureDate} onClick={() => handleMarkAttendance(student.studentId, student.id, 'late', student.displayTime)} aria-pressed={status === 'late'} className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 ${status === 'late' ? 'border-amber-300/40 bg-amber-400 text-slate-950' : 'border-white/10 bg-slate-950 text-slate-400 hover:border-amber-300/30 hover:text-amber-200'}`}>
                                                            <Clock size={14} /> Late
                                                        </button>
                                                        <button type="button" disabled={isSaving || isFutureDate} onClick={() => handleMarkAttendance(student.studentId, student.id, 'absent', student.displayTime)} aria-pressed={status === 'absent'} className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 ${status === 'absent' ? 'border-red-300/40 bg-red-500 text-white' : 'border-white/10 bg-slate-950 text-slate-400 hover:border-red-300/30 hover:text-red-200'}`}>
                                                            <XCircle size={14} /> Absent
                                                        </button>
                                                        <button type="button" disabled={isSaving || isFutureDate} onClick={() => handleMarkAttendance(student.studentId, student.id, 'excused', student.displayTime)} aria-pressed={status === 'excused'} className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${status === 'excused' ? 'border-sky-300/40 bg-sky-400 text-slate-950' : 'border-white/10 bg-slate-950 text-slate-400 hover:border-sky-300/30 hover:text-sky-200'}`}>
                                                            <ShieldCheck size={14} /> Excused
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
};
