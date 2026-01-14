
import React, { useState, useMemo } from 'react';
import { ClipboardCheck, Search, Filter, Calendar, Clock, CheckCircle2, XCircle, AlertCircle, ChevronRight, MessageCircle, BarChart2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { AttendanceRecord } from '../types';

export const AbsenceView = () => {
    const { enrollments, students, attendanceRecords } = useAppContext();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGroup, setSelectedGroup] = useState('All');

    // 1. Determine the "Day of Week" string for the selected date (e.g., "Monday")
    const dayOfWeek = useMemo(() => {
        const d = new Date(selectedDate);
        return d.toLocaleDateString('en-US', { weekday: 'long' });
    }, [selectedDate]);

    // 2. Identify Current Time for Smart Highlighting
    const currentTimeMinutes = useMemo(() => {
        const now = new Date();
        return now.getHours() * 60 + now.getMinutes();
    }, []);

    const isToday = selectedDate === new Date().toISOString().split('T')[0];

    // 3. Filter Enrollments: Must be Active + Student Active + Have a Class Scheduled Today
    const scheduledStudents = useMemo(() => {
        const dayString = dayOfWeek; // e.g. "Wednesday"

        return enrollments.filter(e => {
            // Strict check: Enrollment active
            if (e.status !== 'active') return false;

            // Strict check: Student Active
            const student = students.find(s => s.id === e.studentId);
            if (!student || student.status === 'inactive') return false;

            // Check main group
            const mainHasClass = e.groupTime?.includes(dayString);
            // Check secondary group (DIY)
            const secHasClass = e.secondGroupTime?.includes(dayString);

            // Filter by search
            if (searchQuery && !e.studentName.toLowerCase().includes(searchQuery.toLowerCase())) return false;

            // Filter by Group Dropdown (if strict grouping is needed, though we group by time primarily)
            if (selectedGroup !== 'All' && e.groupName !== selectedGroup && e.secondGroupName !== selectedGroup) return false;

            return mainHasClass || secHasClass;
        }).flatMap(e => {
            // Use flatMap to allow One Student -> Multiple Slots (e.g. 15:30 AND 17:30)
            const slots = [];

            if (e.groupTime?.includes(dayString)) {
                slots.push({
                    ...e,
                    displayTime: e.groupTime.replace(dayString, '').trim(),
                    displayGroup: e.groupName || ''
                });
            }

            if (e.secondGroupTime?.includes(dayString)) {
                slots.push({
                    ...e,
                    displayTime: e.secondGroupTime.replace(dayString, '').trim(),
                    displayGroup: e.secondGroupName || ''
                });
            }

            return slots;
        });
    }, [enrollments, students, dayOfWeek, searchQuery, selectedGroup]);

    // 4. Group by Time Slot
    const studentsByTime = useMemo(() => {
        const groups: Record<string, typeof scheduledStudents> = {};
        scheduledStudents.forEach(s => {
            if (!groups[s.displayTime]) groups[s.displayTime] = [];
            groups[s.displayTime].push(s);
        });

        // Sort times chronologically
        const sortedTimes = Object.keys(groups).sort((a, b) => {
            const ta = parseInt(a.replace(':', ''));
            const tb = parseInt(b.replace(':', ''));
            return ta - tb;
        });

        return sortedTimes.map(time => ({
            time,
            students: groups[time]
        }));
    }, [scheduledStudents]);

    // 5. Attendance Handler
    const handleMarkAttendance = async (studentId: string, enrollmentId: string, status: AttendanceRecord['status'], timeSlot: string) => {
        if (!db) return;

        // Use a composite ID: DATE_STUDENTID_TIMESLOT to support multiple slots per day
        const sanitizedTime = timeSlot.replace(':', '');
        const recordId = `${selectedDate}_${studentId}_${sanitizedTime}`;

        try {
            await setDoc(doc(db, 'attendance', recordId), {
                date: selectedDate,
                studentId,
                enrollmentId,
                status,
                slotTime: timeSlot,
                createdAt: serverTimestamp() // Updates timestamp on change
            });
        } catch (err) {
            console.error("Error marking attendance", err);
        }
    };

    const handleConfirmAllPresent = async (studentsInSlot: typeof scheduledStudents) => {
        if (!db) return;
        if (!confirm(`Mark all ${studentsInSlot.length} students as PRESENT? (Only 'unmarked' ones will be updated)`)) return;

        const batch: Promise<void>[] = [];

        studentsInSlot.forEach(student => {
            const currentStatus = getStatus(student.studentId, student.displayTime);
            if (currentStatus === 'unmarked') {
                const sanitizedTime = student.displayTime.replace(':', '');
                const recordId = `${selectedDate}_${student.studentId}_${sanitizedTime}`;

                const promise = setDoc(doc(db!, 'attendance', recordId), {
                    date: selectedDate,
                    studentId: student.studentId,
                    enrollmentId: student.id,
                    status: 'present',
                    slotTime: student.displayTime,
                    createdAt: serverTimestamp()
                });
                batch.push(promise);
            }
        });

        await Promise.all(batch);
    };

    const getStatus = (studentId: string, timeSlot: string) => {
        // Find local record first (optimistic UI provided by AppContext listener)
        // Try strict match first (NewID)
        const sanitizedTime = timeSlot.replace(':', '');
        const newId = `${selectedDate}_${studentId}_${sanitizedTime}`;

        const strictRecord = attendanceRecords.find(r => r.id === newId);
        if (strictRecord) return strictRecord.status;

        // Validating uniqueness: If we don't find a strict match, do we fallback to `Date_Student`?
        // Only if we want backward compatibility for single-slot days.
        // But for this specific "double slot" bug, falling back is what causes the glitch (ambiguity).
        // So we should NOT fallback if we want to enforce separation. 
        // However, existing records for today are likely saved as `Date_Student`.
        // If we don't fallback, they will appear unmarked.

        // Compromise: check legacy only if there is ONLY ONE slot for this student today?
        // Easier: Just check legacy ID. If it exists, use it. But this risks showing the SAME status for both slots.
        // Since the user wants to separate them, showing "Present" for both when only one was clicked is confusing.
        // It's better to show "Unmarked" for the new slot logic and force re-marking for clarity.

        return 'unmarked';
    };

    // Helper to see if a time block is "Current"
    const isCurrentBlock = (timeStr: string) => {
        if (!isToday || !timeStr) return false;
        const [h, m] = timeStr.split(':').map(Number);
        const slotMinutes = h * 60 + m;
        // Assume class is 90 mins. If current time is within slot start and slot start + 90
        return currentTimeMinutes >= slotMinutes && currentTimeMinutes < slotMinutes + 90;
    };

    // Calculate Daily Stats
    const dailyStats = useMemo(() => {
        let present = 0;
        let absent = 0;
        let late = 0;
        const total = scheduledStudents.length;

        scheduledStudents.forEach(student => {
            const status = getStatus(student.studentId, student.displayTime);
            if (status === 'absent') absent++;
            else if (status === 'late') late++;
            // Treat 'unmarked' as 'present' for the daily report, assuming default presence
            else present++;
        });

        return { total, present, absent, late };
    }, [scheduledStudents, attendanceRecords, selectedDate]);

    // Extract all unique group names for filter
    const uniqueGroups = useMemo(() => {
        const g = new Set<string>();
        enrollments.forEach(e => {
            if (e.groupName) g.add(e.groupName);
            if (e.secondGroupName) g.add(e.secondGroupName);
        });
        return Array.from(g).sort();
    }, [enrollments]);

    const handleWhatsAppAlert = (studentName: string, parentPhone: string, status: string) => {
        const cleanPhone = parentPhone.replace(/[^0-9]/g, '');
        const message = `Hello, just to inform you that ${studentName} was marked ${status.toUpperCase()} for today's class.`;
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    return (
        <div className="space-y-6 pb-24 md:pb-8 h-full flex flex-col animate-in fade-in slide-in-from-right-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 p-4 rounded-xl border border-slate-800 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><ClipboardCheck className="w-6 h-6 text-red-500" /> Attendance Manager</h2>
                    <p className="text-slate-500 text-sm">Select a date to manage workshop attendance.</p>
                </div>
                <div className="flex items-center gap-4 bg-slate-950 p-2 rounded-xl border border-slate-800">
                    <span className="text-lg font-bold text-red-400 pl-2 uppercase tracking-widest">{dayOfWeek}</span>
                    <div className="h-6 w-px bg-slate-800"></div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => {
                            const d = new Date(selectedDate);
                            d.setDate(d.getDate() - 1);
                            setSelectedDate(d.toISOString().split('T')[0]);
                        }} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"><ChevronRight size={20} className="rotate-180" /></button>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent text-white font-bold text-sm outline-none px-2 cursor-pointer"
                        />
                        <button onClick={() => {
                            const d = new Date(selectedDate);
                            d.setDate(d.getDate() + 1);
                            setSelectedDate(d.toISOString().split('T')[0]);
                        }} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"><ChevronRight size={20} /></button>
                    </div>
                </div>
            </div>

            {/* Daily Report Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col relative overflow-hidden">
                    <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Scheduled</div>
                    <div className="text-2xl font-bold text-white">{dailyStats.total}</div>
                    <Calendar className="absolute right-3 top-3 text-slate-800 w-8 h-8" />
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col relative overflow-hidden">
                    <div className="text-emerald-500 text-xs font-bold uppercase tracking-wider mb-1">Present (Est.)</div>
                    <div className="text-2xl font-bold text-emerald-400">{dailyStats.present}</div>
                    <CheckCircle2 className="absolute right-3 top-3 text-slate-800 w-8 h-8" />
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col relative overflow-hidden">
                    <div className="text-red-500 text-xs font-bold uppercase tracking-wider mb-1">Absent</div>
                    <div className="text-2xl font-bold text-red-400">{dailyStats.absent}</div>
                    <XCircle className="absolute right-3 top-3 text-slate-800 w-8 h-8" />
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col relative overflow-hidden">
                    <div className="text-amber-500 text-xs font-bold uppercase tracking-wider mb-1">Late</div>
                    <div className="text-2xl font-bold text-amber-400">{dailyStats.late}</div>
                    <AlertCircle className="absolute right-3 top-3 text-slate-800 w-8 h-8" />
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input type="text" placeholder="Search student..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-red-500 outline-none placeholder:text-slate-600 transition-all" />
                </div>
                <div className="relative min-w-[150px]">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5" />
                    <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg appearance-none focus:border-red-500 outline-none cursor-pointer">
                        <option value="All">All Groups</option>
                        {uniqueGroups.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
            </div>

            {/* Time Slots List */}
            <div className="space-y-6">
                {studentsByTime.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 bg-slate-900 border border-slate-800 rounded-xl text-center">
                        <Calendar className="w-12 h-12 text-slate-700 mb-4" />
                        <h3 className="text-slate-400 font-bold mb-1">No Classes Scheduled</h3>
                        <p className="text-slate-500 text-sm">There are no workshops scheduled for {dayOfWeek} ({selectedDate}).</p>
                    </div>
                ) : (
                    studentsByTime.map(slot => {
                        const isLive = isCurrentBlock(slot.time);
                        return (
                            <div key={slot.time} className={`bg-slate-900 border rounded-xl overflow-hidden transition-all ${isLive ? 'border-red-500/50 shadow-lg shadow-red-900/10' : 'border-slate-800'}`}>
                                <div className={`p-4 flex items-center gap-3 border-b ${isLive ? 'bg-red-950/20 border-red-900/30' : 'bg-slate-950/50 border-slate-800'}`}>
                                    <div className={`px-3 py-1 rounded text-sm font-bold font-mono ${isLive ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-300'}`}>
                                        {slot.time}
                                    </div>
                                    <span className="text-sm font-medium text-slate-400">{slot.students.length} Students Scheduled</span>
                                    {isLive && <span className="ml-auto text-xs font-bold text-red-500 animate-pulse flex items-center gap-1">● LIVE NOW</span>}

                                    {/* Confirm All Button */}
                                    <button
                                        onClick={() => handleConfirmAllPresent(slot.students)}
                                        className="ml-auto text-xs font-bold bg-emerald-900/30 text-emerald-400 border border-emerald-900/50 px-3 py-1.5 rounded-lg hover:bg-emerald-900/50 transition-colors flex items-center gap-2"
                                    >
                                        <CheckCircle2 size={12} /> Confirm Attendance
                                    </button>
                                </div>

                                <div className="divide-y divide-slate-800">
                                    {slot.students.map(student => {
                                        const status = getStatus(student.studentId, student.displayTime);
                                        // Default "Present" logic: If unmarked, visualize as Present
                                        const isPresent = status === 'present' || status === 'unmarked';

                                        const initials = (student.studentName || '').split(' ').map(n => n[0]).join('').slice(0, 2);
                                        const studentDetails = students.find(s => s.id === student.studentId);

                                        return (
                                            <div key={`${student.id}_${student.displayTime}`} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">
                                                        {initials}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-white text-sm flex items-center gap-2">
                                                            {student.studentName}
                                                            {(status === 'absent' || status === 'late') && studentDetails?.parentPhone && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleWhatsAppAlert(student.studentName, studentDetails.parentPhone, status); }}
                                                                    className="text-emerald-500 hover:text-emerald-400 bg-emerald-950/30 p-1 rounded hover:bg-emerald-950/50 transition-colors"
                                                                    title="Alert Parent via WhatsApp"
                                                                >
                                                                    <MessageCircle size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-slate-500 flex items-center gap-2">
                                                            <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{student.programName}</span>
                                                            <span className="text-slate-600">•</span>
                                                            <span>{student.displayGroup}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2 self-end sm:self-auto">
                                                    <button
                                                        onClick={() => handleMarkAttendance(student.studentId, student.id, 'present', student.displayTime)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${isPresent ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:border-emerald-500/50 hover:text-emerald-400'}`}
                                                    >
                                                        <CheckCircle2 size={14} /> Present
                                                    </button>
                                                    <button
                                                        onClick={() => handleMarkAttendance(student.studentId, student.id, 'late', student.displayTime)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${status === 'late' ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/20' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:border-amber-500/50 hover:text-amber-400'}`}
                                                    >
                                                        <Clock size={14} /> Late
                                                    </button>
                                                    <button
                                                        onClick={() => handleMarkAttendance(student.studentId, student.id, 'absent', student.displayTime)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${status === 'absent' ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'bg-slate-950 border border-slate-800 text-slate-400 hover:border-red-500/50 hover:text-red-400'}`}
                                                    >
                                                        <XCircle size={14} /> Absent
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};