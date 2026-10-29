import React, { useMemo, useRef, useState } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { AlertCircle, Calendar, CheckCircle2, ChevronRight, ClipboardCheck, Clock, Filter, MessageCircle, RotateCcw, Search, ShieldCheck, UserRound, Users, XCircle } from 'lucide-react';
import { deleteDoc, doc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { AtlasActionButton, AtlasCommandHeader, AtlasEmptyState, AtlasSectionHeader, AtlasSignalCard, AtlasToolbar } from '../components/atlas/AtlasSurface';
import '../components/education-ui/education-system-v1.css';
import './school-day/education-school-day-v1.css';
import './school-day/education-attendance-pulse.css';
import './school-day/education-attendance-playful.css';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { db } from '../services/firebase';
import { AttendanceRecord } from '../types';
import { findMembershipRenewalsDue, isEnrollmentEligibleForAttendance } from '../utils/membershipLifecycle';
import { studentActiveOnDate } from '../utils/studentAcademicYear';
import { getScheduledSlotForWeekday } from '../utils/schoolSchedule';
import { useWorkspaceScroll, useWorkspaceViewState } from '../components/education-ui/useWorkspaceViewState';
import { EducationBadge, EducationButton, EducationState } from '../components/education-ui/EducationPrimitives';

export const AbsenceView = () => {
    const showEducationSchoolDayV1 = new URLSearchParams(window.location.search).get('ui') !== 'atlas-legacy';
    const { enrollments, students, programs, attendanceRecords, attendanceLoading, attendanceError, navigateTo } = useAppContext();
    const { currentOrganization, userProfile } = useAuth();
    const { confirm, alert: showAlert } = useConfirm();
    const today = format(new Date(), 'yyyy-MM-dd');
    const workspaceScope = `attendance:${currentOrganization?.id || 'none'}:${userProfile?.uid || 'guest'}`;
    useWorkspaceScroll(workspaceScope);
    const [selectedDate, setSelectedDate] = useWorkspaceViewState(workspaceScope, 'selectedDate', today);
    const [searchQuery, setSearchQuery] = useWorkspaceViewState(workspaceScope, 'searchQuery', '');
    const [selectedGroup, setSelectedGroup] = useWorkspaceViewState(workspaceScope, 'selectedGroup', 'All');
    const [savingRecordId, setSavingRecordId] = useState<string | null>(null);
    const [isConfirmingSession, setIsConfirmingSession] = useState(false);
    const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
    const operationPending = useRef(false);
    const [pendingStatuses, setPendingStatuses] = useState<Record<string, AttendanceRecord['status'] | 'unmarked'>>({});
    const [saveFeedback, setSaveFeedback] = useState<{ date: string; text: string; error?: boolean } | null>(null);
    const isWorking = savingRecordId !== null || isConfirmingSession;

    const dayOfWeek = useMemo(() => {
        return format(parseISO(selectedDate), 'EEEE');
    }, [selectedDate]);
    const selectedWeekday = parseISO(selectedDate).getDay();

    const currentTimeMinutes = useMemo(() => {
        const now = new Date();
        return now.getHours() * 60 + now.getMinutes();
    }, []);

    const isToday = selectedDate === today;
    const isFutureDate = selectedDate > today;

    const programById = useMemo(
        () => new Map(programs.map(program => [program.id, program])),
        [programs]
    );

    const renewalsDue = useMemo(
        () => findMembershipRenewalsDue(enrollments, programs, students, today),
        [enrollments, programs, students, today]
    );

    const allScheduledStudents = useMemo(() => {
        return enrollments.filter(enrollment => {
            const program = programById.get(enrollment.programId);
            const recordedOnDate = attendanceRecords.some(record => record.enrollmentId === enrollment.id && record.date === selectedDate);
            if (!recordedOnDate && !isEnrollmentEligibleForAttendance(enrollment, program, selectedDate)) return false;

            const student = students.find(item => item.id === enrollment.studentId);
            if (!student || (!recordedOnDate && !studentActiveOnDate(student, selectedDate))) return false;

            const mainHasClass = getScheduledSlotForWeekday(enrollment.groupTime, selectedWeekday) !== null;
            const secondaryHasClass = getScheduledSlotForWeekday(enrollment.secondGroupTime, selectedWeekday) !== null;

            return mainHasClass || secondaryHasClass;
        }).flatMap(enrollment => {
            const slots = [];

            const mainSlot = getScheduledSlotForWeekday(enrollment.groupTime, selectedWeekday);
            if (mainSlot !== null) {
                slots.push({
                    ...enrollment,
                    displayTime: mainSlot,
                    displayGroup: enrollment.groupName || ''
                });
            }

            const secondarySlot = getScheduledSlotForWeekday(enrollment.secondGroupTime, selectedWeekday);
            if (secondarySlot !== null) {
                slots.push({
                    ...enrollment,
                    displayTime: secondarySlot,
                    displayGroup: enrollment.secondGroupName || ''
                });
            }

            return slots;
        });
    }, [enrollments, students, attendanceRecords, programById, selectedDate, selectedWeekday]);

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
        // Local Firestore snapshots may arrive before acknowledgement. Keep this
        // operation's previous status visible until its existing write completes.
        if (pendingStatuses[recordId]) return pendingStatuses[recordId];
        return attendanceRecords.find(record => record.id === recordId)?.status || 'unmarked';
    };

    const handleMarkAttendance = async (studentId: string, enrollmentId: string, status: AttendanceRecord['status'], timeSlot: string) => {
        if (operationPending.current || attendanceLoading || attendanceError) return;
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
        operationPending.current = true;
        setPendingStatuses({ [recordId]: getStatus(studentId, timeSlot) });
        setSaveFeedback(null);
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
            setSelectedRecordIds(previous => previous.filter(id => id !== recordId));
            const name = students.find(student => student.id === studentId)?.name || 'Student';
            setSaveFeedback({ date: selectedDate, text: `${name} · ${status} saved for ${timeSlot}.` });
        } catch (error) {
            setSaveFeedback({ date: selectedDate, text: 'Mark not saved. Check the connection and try again.', error: true });
            console.error('Error marking attendance', error);
            await showAlert(
                'Attendance was not saved',
                `The attendance mark could not be saved. ${error instanceof Error ? error.message : String(error)}`,
                'danger'
            );
        } finally {
            operationPending.current = false;
            setPendingStatuses({});
            setSavingRecordId(null);
        }
    };

    const handleClearAttendance = async (studentId: string, studentName: string, timeSlot: string) => {
        if (operationPending.current || attendanceLoading || attendanceError) return;
        if (!db || !currentOrganization?.id || isFutureDate) return;
        const recordId = getRecordId(studentId, timeSlot);
        const approved = await confirm({
            title: 'Clear this attendance mark?',
            message: `${studentName} will return to unmarked for the ${timeSlot} session. This does not mark the student present.`,
            confirmText: 'Clear mark',
            cancelText: 'Keep mark',
            variant: 'warning'
        });
        if (!approved || operationPending.current) return;

        operationPending.current = true;
        setPendingStatuses({ [recordId]: getStatus(studentId, timeSlot) });
        setSaveFeedback(null);
        setSavingRecordId(recordId);
        try {
            await deleteDoc(doc(db, 'attendance', recordId));
            setSelectedRecordIds(previous => previous.filter(id => id !== recordId));
            setSaveFeedback({ date: selectedDate, text: `${studentName} · mark cleared for ${timeSlot}.` });
        } catch (error) {
            setSaveFeedback({ date: selectedDate, text: 'Mark not cleared. Check the connection and try again.', error: true });
            console.error('Error clearing attendance', error);
            await showAlert('Attendance mark was not cleared', 'The existing mark is still in place. Please try again.', 'danger');
        } finally {
            operationPending.current = false;
            setPendingStatuses({});
            setSavingRecordId(null);
        }
    };

    const handleConfirmAllPresent = async (studentsInSlot: typeof scheduledStudents, selectedOnly = false) => {
        if (operationPending.current || attendanceLoading || attendanceError) return;
        if (!db || !currentOrganization?.id) {
            await showAlert('Organization required', 'Select an organization before confirming this session.', 'warning');
            return;
        }
        const firestore = db;
        if (isFutureDate) {
            await showAlert('Future attendance is locked', 'Sessions can only be confirmed on or after their scheduled date.', 'warning');
            return;
        }

        const unmarked = studentsInSlot.filter(student =>
            getStatus(student.studentId, student.displayTime) === 'unmarked'
            && (!selectedOnly || selectedRecordIds.includes(getRecordId(student.studentId, student.displayTime)))
        );
        if (unmarked.length === 0) {
            await showAlert('Attendance already confirmed', 'Every student in this session already has an attendance mark.', 'info');
            return;
        }

        const approved = await confirm({
            title: 'Confirm this session?',
            message: `Mark ${unmarked.length} ${selectedOnly ? 'selected ' : 'unmarked '}${unmarked.length === 1 ? 'student' : 'students'} as present. Existing late, absent, and excused marks will stay unchanged.${searchQuery || selectedGroup !== 'All' ? ' Only students currently shown by your filters will be changed.' : ''}`,
            confirmText: 'Mark present',
            cancelText: 'Cancel',
            variant: 'info'
        });
        if (!approved || operationPending.current) return;

        operationPending.current = true;
        setPendingStatuses(Object.fromEntries(unmarked.map(student => [getRecordId(student.studentId, student.displayTime), 'unmarked' as const])));
        setSaveFeedback(null);
        setIsConfirmingSession(true);
        try {
            // Firestore batches have a 500-write limit. Leave room for future
            // audit writes and keep large rosters confirmable.
            for (let offset = 0; offset < unmarked.length; offset += 400) {
                const batch = writeBatch(firestore);
                unmarked.slice(offset, offset + 400).forEach(student => {
                    const recordId = getRecordId(student.studentId, student.displayTime);
                    batch.set(doc(firestore, 'attendance', recordId), {
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
                // Acknowledged chunks can be displayed even if a later chunk fails.
                const acknowledgedIds = new Set(unmarked.slice(offset, offset + 400).map(student => getRecordId(student.studentId, student.displayTime)));
                setPendingStatuses(previous => Object.fromEntries(Object.entries(previous).filter(([id]) => !acknowledgedIds.has(id))));
            }
            const confirmedIds = new Set(unmarked.map(student => getRecordId(student.studentId, student.displayTime)));
            setSelectedRecordIds(previous => previous.filter(id => !confirmedIds.has(id)));
            setSaveFeedback({ date: selectedDate, text: `${unmarked.length} attendance ${unmarked.length === 1 ? 'mark' : 'marks'} saved. Existing exceptions preserved.` });
            await showAlert('Session confirmed', `${unmarked.length} unmarked ${unmarked.length === 1 ? 'student is' : 'students are'} now marked present. Existing exceptions were preserved.`, 'success');
        } catch (error) {
            setSaveFeedback({ date: selectedDate, text: 'Session not fully saved. Review the roster before retrying.', error: true });
            console.error('Error confirming attendance', error);
            await showAlert(
                'Session was not confirmed',
                `Some attendance marks may have been saved. Refresh the roster before retrying. ${error instanceof Error ? error.message : String(error)}`,
                'danger'
            );
        } finally {
            operationPending.current = false;
            setPendingStatuses({});
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
    }, [allScheduledStudents, attendanceRecords, selectedDate, pendingStatuses]);
    const sessionCount = new Set(allScheduledStudents.map(student => student.displayTime)).size;

    const uniqueGroups = useMemo(() => {
        const groups = new Set<string>();
        allScheduledStudents.forEach(enrollment => {
            if (enrollment.displayGroup) groups.add(enrollment.displayGroup);
        });
        return Array.from(groups).sort();
    }, [allScheduledStudents]);

    const handleWhatsAppAlert = (studentName: string, parentPhone: string, status: string) => {
        const cleanPhone = parentPhone.replace(/[^0-9]/g, '');
        const message = `Hello, just to inform you that ${studentName} was marked ${status.toUpperCase()} for the class on ${selectedDate}.`;
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const moveDate = (offset: number) => {
        setSelectedDate(format(addDays(parseISO(selectedDate), offset), 'yyyy-MM-dd'));
        setSelectedRecordIds([]);
    };

    if (attendanceLoading || attendanceError) {
        const accessRestricted = Boolean(attendanceError && /permission|access denied|insufficient privileges/i.test(attendanceError));
        return <div className={`flex flex-col gap-4 ${showEducationSchoolDayV1 ? 'edu-v1 edu-attendance-pulse' : ''}`} data-edu-system={showEducationSchoolDayV1 ? '1' : undefined}>
            <AtlasCommandHeader density={showEducationSchoolDayV1 ? 'compact' : 'default'} eyebrow={showEducationSchoolDayV1 ? 'Class register' : 'Learning operations'} title={showEducationSchoolDayV1 ? 'Attendance' : 'Student attendance'} icon={ClipboardCheck} />
            {showEducationSchoolDayV1 ? <EducationState
                kind={attendanceLoading ? 'loading' : accessRestricted ? 'restricted' : 'error'}
                title={attendanceLoading ? 'Loading attendance' : accessRestricted ? 'Attendance access restricted' : 'Attendance unavailable'}
                description={attendanceError || 'Connecting to your school’s attendance records. Marking opens once they are ready.'}
            >{attendanceError && <EducationButton onClick={() => window.location.reload()}>Reload attendance</EducationButton>}</EducationState>
                : <div role={attendanceError ? 'alert' : 'status'}><AtlasEmptyState title={attendanceError ? 'Attendance unavailable' : 'Loading attendance'} description={attendanceError || 'Connecting to your school’s attendance records. Marking opens once they are ready.'} icon={attendanceError ? AlertCircle : ClipboardCheck} action={attendanceError ? <AtlasActionButton onClick={() => window.location.reload()}>Reload attendance</AtlasActionButton> : undefined} /></div>}
        </div>;
    }

    const renewalPanel = (<section className="pulse-attendance-renewal-panel" aria-labelledby="membership-renewals-title">
                    <div className="pulse-attendance-renewal-panel__head">
                        <div className="flex items-start gap-3">
                            <span className="pulse-attendance-renewal-panel__icon"><RotateCcw size={17} aria-hidden="true" /></span>
                            <div>
                                <h2 id="membership-renewals-title">Membership renewals</h2>
                                <p>{renewalsDue.length} {renewalsDue.length === 1 ? 'learner is' : 'learners are'} hidden from today’s attendance until a new rolling membership is created.</p>
                            </div>
                        </div>
                        <EducationBadge status="warning">{renewalsDue.length} due</EducationBadge>
                    </div>
                    <div className="pulse-attendance-renewal-panel__list">
                        {renewalsDue.map(renewal => (
                            <div key={renewal.key} className="pulse-attendance-renewal-panel__row">
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className="pulse-attendance-renewal-panel__student-icon"><UserRound size={15} aria-hidden="true" /></span>
                                    <div className="min-w-0">
                                        <p className="pulse-attendance-renewal-panel__student-name">{renewal.studentName}</p>
                                        <p className="pulse-attendance-renewal-panel__detail">
                                            <span>{renewal.programName}{renewal.groupName ? ` · ${renewal.groupName}` : ''}</span>
                                            <span aria-hidden="true"> · </span>
                                            <span className="pulse-attendance-renewal-panel__overdue">Ended {format(parseISO(renewal.endDate), 'dd MMM yyyy')} ({renewal.daysOverdue}d ago)</span>
                                        </p>
                                    </div>
                                </div>
                                <AtlasActionButton icon={UserRound} onClick={() => navigateTo('student-details', { studentId: renewal.studentId })}>Open student</AtlasActionButton>
                            </div>
                        ))}
                    </div>
                </section>);

    return (
        <div className={`flex h-full flex-col gap-5 pb-24 md:pb-8 ${showEducationSchoolDayV1 ? 'edu-v1 edu-attendance-pulse' : ''}`} data-edu-system={showEducationSchoolDayV1 ? '1' : undefined} data-testid={showEducationSchoolDayV1 ? 'education-attendance-v1' : undefined}>
            <AtlasCommandHeader
                density={showEducationSchoolDayV1 ? 'compact' : 'default'}
                eyebrow={showEducationSchoolDayV1 ? 'Class register' : 'Learning operations'}
                title={showEducationSchoolDayV1 ? 'Attendance' : 'Student attendance'}
                description={showEducationSchoolDayV1 ? undefined : 'Mark each scheduled session, surface exceptions, and contact families without leaving the roster.'}
                icon={ClipboardCheck}
                badges={isToday
                    ? <span className="pulse-attendance-today rounded-full border border-teal-300/20 bg-teal-400/10 px-2 py-1 text-[10px] font-black uppercase text-teal-200">Today</span>
                    : isFutureDate
                        ? <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-1 text-[10px] font-black uppercase text-amber-200">Preview only</span>
                        : undefined}
                actions={(
                    <div className="pulse-attendance-date flex w-full items-center gap-1 rounded-lg border border-white/10 bg-slate-950/70 p-1 lg:w-auto">
                        <button type="button" disabled={isWorking} onClick={() => moveDate(-1)} aria-label="Previous day" title="Previous day" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60">
                            <ChevronRight size={18} className="rotate-180" />
                        </button>
                        <div className="pulse-attendance-date__value min-w-0 border-x border-white/10 px-2 text-center">
                            <div className="text-[9px] font-black uppercase text-teal-300">{dayOfWeek}</div>
                            <input type="date" disabled={isWorking} value={selectedDate} onChange={(event) => { if (event.target.value) { setSelectedDate(event.target.value); setSelectedRecordIds([]); } }} aria-label="Attendance date" className="w-[132px] bg-transparent text-center font-mono text-xs font-bold text-white outline-none" />
                        </div>
                        {!isToday && <button type="button" disabled={isWorking} onClick={() => { setSelectedDate(today); setSelectedRecordIds([]); }} className="h-9 rounded-lg px-2 text-[10px] font-black uppercase text-teal-200 hover:bg-teal-400/10">Today</button>}
                        <button type="button" disabled={isWorking} onClick={() => moveDate(1)} aria-label="Next day" title="Next day" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60">
                            <ChevronRight size={18} />
                        </button>
                    </div>
                )}
            />

            {showEducationSchoolDayV1 && <div className="pulse-attendance-progress" aria-label="Daily attendance progress">
                <div className="pulse-attendance-progress__line">
                    <strong>{isFutureDate ? 'Schedule preview' : dailyStats.total === 0 ? 'No sessions scheduled' : dailyStats.unmarked === 0 && !isWorking ? 'Attendance complete' : `${dailyStats.total - dailyStats.unmarked} of ${dailyStats.total} recorded`}</strong>
                    <span>{isFutureDate ? 'Marking opens on the session date' : `${dailyStats.unmarked} remaining · ${sessionCount} ${sessionCount === 1 ? 'session' : 'sessions'}`}</span>
                </div>
                <progress aria-label="Recorded attendance" value={dailyStats.total - dailyStats.unmarked} max={dailyStats.total || 1} />
                <div className="pulse-attendance-progress__summary">
                    <span data-summary="present"><b>{dailyStats.present}</b> present</span><span data-summary="late"><b>{dailyStats.late}</b> late</span><span data-summary="absent"><b>{dailyStats.absent}</b> absent</span><span data-summary="excused"><b>{dailyStats.excused}</b> excused</span>
                </div>
                <p className="pulse-attendance-feedback" role="status" aria-live="polite" data-error={saveFeedback?.date === selectedDate && saveFeedback.error ? 'true' : undefined}>
                    {isWorking ? 'Saving attendance… Please wait for confirmation.' : isFutureDate ? 'This date is read-only. Choose today or an earlier date to mark attendance.' : saveFeedback?.date === selectedDate ? saveFeedback.text : 'Choose a status for each student. Changes save individually.'}
                </p>
                {renewalsDue.length > 0 && <a className="pulse-attendance-renewal-link" href="#pulse-attendance-renewals">{renewalsDue.length} {renewalsDue.length === 1 ? 'learner needs' : 'learners need'} a membership renewal · Review</a>}
            </div>}

            {!showEducationSchoolDayV1 && <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <AtlasSignalCard label="Scheduled" value={dailyStats.total} detail={`${sessionCount} session${sessionCount === 1 ? '' : 's'}`} icon={Users} tone="slate" />
                <AtlasSignalCard label="Marked present" value={dailyStats.present} detail={`${dailyStats.unmarked} awaiting a mark`} icon={CheckCircle2} tone="teal" />
                <AtlasSignalCard label="Late" value={dailyStats.late} detail="Needs follow-up" icon={AlertCircle} tone="amber" />
                <AtlasSignalCard label="Absent" value={dailyStats.absent} detail={`${dailyStats.excused} excused`} icon={XCircle} tone="red" />
            </div>}

            {!showEducationSchoolDayV1 && renewalsDue.length > 0 && renewalPanel}

            <div className={showEducationSchoolDayV1 ? 'pulse-attendance-workspace' : 'contents'}>
            {showEducationSchoolDayV1 && <div className="pulse-attendance-workspace__heading"><h3>Daily register</h3><span>{scheduledStudents.length} scheduled {scheduledStudents.length === 1 ? 'place' : 'places'}{searchQuery || selectedGroup !== 'All' ? ' in this view' : ''}</span></div>}
            <AtlasToolbar className="pulse-attendance-toolbar">
                <div className="relative min-w-[220px] flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input type="search" aria-label="Search students" placeholder="Search students" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="h-10 w-full rounded-lg border border-white/10 bg-slate-950 pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10" />
                </div>
                <div className="relative min-w-[170px]">
                    <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <select aria-label="Filter by group" value={selectedGroup} onChange={(event) => setSelectedGroup(event.target.value)} className="h-10 w-full appearance-none rounded-lg border border-white/10 bg-slate-950 pl-10 pr-8 text-sm text-slate-300 outline-none transition-colors focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10">
                        <option value="All">All groups</option>
                        {uniqueGroups.map(group => <option key={group} value={group}>{group}</option>)}
                    </select>
                </div>
            </AtlasToolbar>

            <section aria-label="Session roster" id="edu-attendance-roster" className="space-y-4 scroll-mt-5">
                {!showEducationSchoolDayV1 && <AtlasSectionHeader title="Session roster" description={`${dayOfWeek}, ${selectedDate} · ${dailyStats.unmarked} attendance ${dailyStats.unmarked === 1 ? 'mark' : 'marks'} remaining`} icon={Calendar} />}
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
                        action={allScheduledStudents.length > 0 ? <AtlasActionButton onClick={() => { setSearchQuery(''); setSelectedGroup('All'); }}>Clear filters</AtlasActionButton> : !isToday ? <AtlasActionButton onClick={() => setSelectedDate(today)}>Go to today</AtlasActionButton> : <AtlasActionButton onClick={() => navigateTo('classes')}>Open classes</AtlasActionButton>}
                    />
                ) : (
                    <div className="pulse-attendance-sessions space-y-3">
                        {studentsByTime.map(slot => {
                            const isLive = isCurrentBlock(slot.time);
                            const unmarkedCount = slot.students.filter(student => getStatus(student.studentId, student.displayTime) === 'unmarked').length;
                            const selectedCount = slot.students.filter(student =>
                                getStatus(student.studentId, student.displayTime) === 'unmarked'
                                && selectedRecordIds.includes(getRecordId(student.studentId, student.displayTime))
                            ).length;
                            const unmarkedRecordIds = slot.students
                                .filter(student => getStatus(student.studentId, student.displayTime) === 'unmarked')
                                .map(student => getRecordId(student.studentId, student.displayTime));
                            return (
                                <div key={slot.time} className={`pulse-attendance-session overflow-hidden rounded-xl border bg-slate-900/75 ${isLive ? 'border-teal-300/40' : 'border-white/10'}`}>
                                    {showEducationSchoolDayV1 && <div className="pulse-attendance-session__time"><span>Session</span><strong>{slot.time}</strong>{isLive && <span className="pulse-attendance-live">Live now</span>}</div>}
                                    <div className={showEducationSchoolDayV1 ? 'pulse-attendance-session__body' : 'contents'}>
                                    <div className={`pulse-attendance-session__head flex flex-col gap-3 border-b px-3 py-3 sm:flex-row sm:items-center ${isLive ? 'border-teal-300/20 bg-teal-400/[0.06]' : 'border-white/10 bg-slate-950/55'}`}>
                                        <div className="flex min-w-0 items-center gap-3">
                                            {!showEducationSchoolDayV1 && <span className={`rounded-lg border px-2.5 py-1.5 font-mono text-xs font-black ${isLive ? 'border-teal-300/30 bg-teal-400/10 text-teal-200' : 'border-white/10 bg-white/[0.04] text-slate-200'}`}>{slot.time}</span>}
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-sm font-black text-white">{slot.students.length} scheduled</span>
                                                    {!showEducationSchoolDayV1 && isLive && <span className="rounded-full border border-teal-300/20 bg-teal-400/10 px-2 py-0.5 text-[9px] font-black uppercase text-teal-200">Live now</span>}
                                                </div>
                                                <p className="text-[11px] text-slate-500">{unmarkedCount === 0 ? 'Session complete' : selectedCount > 0 ? `${selectedCount} selected · ${unmarkedCount} unmarked` : `${unmarkedCount} ${unmarkedCount === 1 ? 'mark' : 'marks'} remaining`}</p>
                                            </div>
                                        </div>
                                        {unmarkedCount > 0 && !isFutureDate && (
                                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 sm:ml-auto">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCount === unmarkedCount}
                                                    disabled={isWorking}
                                                    onChange={() => setSelectedRecordIds(previous => {
                                                        const slotIds = new Set(unmarkedRecordIds);
                                                        return selectedCount === unmarkedCount
                                                            ? previous.filter(id => !slotIds.has(id))
                                                            : [...new Set([...previous, ...unmarkedRecordIds])];
                                                    })}
                                                    className="h-4 w-4 accent-teal-400"
                                                />
                                                Select unmarked
                                            </label>
                                        )}
                                        <AtlasActionButton icon={CheckCircle2} variant={showEducationSchoolDayV1 && selectedCount === 0 ? 'secondary' : 'primary'} disabled={unmarkedCount === 0 || isFutureDate || isWorking} onClick={() => handleConfirmAllPresent(slot.students, selectedCount > 0)}>
                                            {isConfirmingSession ? 'Confirming...' : selectedCount > 0 ? `Mark ${selectedCount} selected present` : 'Confirm unmarked'}
                                        </AtlasActionButton>
                                    </div>

                                    <div className="divide-y divide-white/[0.07]">
                                        {slot.students.map((student, studentIndex) => {
                                            const status = getStatus(student.studentId, student.displayTime);
                                            const recordId = getRecordId(student.studentId, student.displayTime);
                                            const isSaving = savingRecordId === recordId;
                                            const initials = (student.studentName || '').split(' ').map(name => name[0]).join('').slice(0, 2);
                                            const studentDetails = students.find(item => item.id === student.studentId);
                                            return (
                                                <div key={`${student.id}_${student.displayTime}_${student.displayGroup}_${studentIndex}`} data-status={status} aria-busy={isSaving || undefined} className="pulse-attendance-row flex flex-col gap-3 px-3 py-3 transition-colors hover:bg-white/[0.025] sm:flex-row sm:items-center sm:justify-between">
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            aria-label={`Select ${student.studentName} for attendance`}
                                                            checked={selectedRecordIds.includes(recordId) && status === 'unmarked'}
                                                            disabled={status !== 'unmarked' || isFutureDate || isWorking}
                                                            onChange={() => setSelectedRecordIds(previous => previous.includes(recordId) ? previous.filter(id => id !== recordId) : [...previous, recordId])}
                                                            className="h-4 w-4 shrink-0 accent-teal-400"
                                                        />
                                                        <div className="pulse-attendance-avatar flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-slate-950 text-[11px] font-black text-slate-300">{initials}</div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="pulse-attendance-name truncate text-sm font-bold text-white">{student.studentName}</span>
                                                                {(status === 'absent' || status === 'late') && studentDetails?.parentPhone && (
                                                                    <button type="button" onClick={(event) => { event.stopPropagation(); handleWhatsAppAlert(student.studentName, studentDetails.parentPhone, status); }} aria-label={`Message ${student.studentName}'s parent`} title="Message parent on WhatsApp" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-teal-300 transition-colors hover:bg-teal-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60">
                                                                        <MessageCircle size={14} />
                                                                    </button>
                                                                )}
                                                                {status !== 'unmarked' && (
                                                                    <button type="button" disabled={isWorking || isFutureDate} onClick={() => handleClearAttendance(student.studentId, student.studentName, student.displayTime)} aria-label={`Clear attendance mark for ${student.studentName}`} title="Return to unmarked" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60">
                                                                        <RotateCcw size={13} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                                                                <span className="truncate">{student.programName}</span>
                                                                <span aria-hidden="true">·</span>
                                                                <span className="truncate">{student.displayGroup}</span>
                                                                <span className="pulse-attendance-row__state">{isSaving ? 'Saving…' : status === 'unmarked' ? 'Not marked' : status}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="pulse-attendance-marks grid grid-cols-2 gap-1.5 sm:flex sm:shrink-0" role="group" aria-label={`Attendance for ${student.studentName}`}>
                                                        <button type="button" disabled={isWorking || isFutureDate} onClick={() => handleMarkAttendance(student.studentId, student.id, 'present', student.displayTime)} data-mark="present" aria-pressed={status === 'present'} className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 ${status === 'present' ? 'border-teal-300/40 bg-teal-500 text-slate-950' : 'border-white/10 bg-slate-950 text-slate-400 hover:border-teal-300/30 hover:text-teal-200'}`}>
                                                            <CheckCircle2 size={14} /> Present
                                                        </button>
                                                        <button type="button" disabled={isWorking || isFutureDate} onClick={() => handleMarkAttendance(student.studentId, student.id, 'late', student.displayTime)} data-mark="late" aria-pressed={status === 'late'} className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 ${status === 'late' ? 'border-amber-300/40 bg-amber-400 text-slate-950' : 'border-white/10 bg-slate-950 text-slate-400 hover:border-amber-300/30 hover:text-amber-200'}`}>
                                                            <Clock size={14} /> Late
                                                        </button>
                                                        <button type="button" disabled={isWorking || isFutureDate} onClick={() => handleMarkAttendance(student.studentId, student.id, 'absent', student.displayTime)} data-mark="absent" aria-pressed={status === 'absent'} className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 ${status === 'absent' ? 'border-red-300/40 bg-red-500 text-white' : 'border-white/10 bg-slate-950 text-slate-400 hover:border-red-300/30 hover:text-red-200'}`}>
                                                            <XCircle size={14} /> Absent
                                                        </button>
                                                        <button type="button" disabled={isWorking || isFutureDate} onClick={() => handleMarkAttendance(student.studentId, student.id, 'excused', student.displayTime)} data-mark="excused" aria-pressed={status === 'excused'} className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${status === 'excused' ? 'border-sky-300/40 bg-sky-400 text-slate-950' : 'border-white/10 bg-slate-950 text-slate-400 hover:border-sky-300/30 hover:text-sky-200'}`}>
                                                            <ShieldCheck size={14} /> Excused
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
            </div>
            {showEducationSchoolDayV1 && renewalsDue.length > 0 && <details id="pulse-attendance-renewals" className="pulse-attendance-renewals">
                <summary>{renewalsDue.length} membership {renewalsDue.length === 1 ? 'renewal' : 'renewals'} to review</summary>
                {renewalPanel}
            </details>}
        </div>
    );
};
