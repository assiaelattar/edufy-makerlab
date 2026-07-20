import React, { useState, useMemo } from 'react';
import { startOfWeek, addDays, format, isSameDay, addWeeks, subWeeks, parse, getDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users, AlertTriangle, RefreshCw, UserPlus } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { ClassSession } from '../types';
import { collection, updateDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { AtlasActionButton, AtlasCommandHeader, AtlasEmptyState, AtlasSignalCard } from '../components/atlas/AtlasSurface';
import { Modal } from '../components/Modal';

const addMinutesToTime = (time: string, minutesToAdd: number) => {
    const [hours, minutes] = time.split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return time;
    const total = (hours * 60 + minutes + minutesToAdd) % (24 * 60);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

export const CalendarView = () => {
    const { programs, workshopTemplates, workshopSlots, classSessions, teamMembers } = useAppContext();
    const { can, currentOrganization, userProfile } = useAuth();
    const { confirm, alert: showAlert } = useConfirm();
    const [currentDate, setCurrentDate] = useState(new Date());

    const [isGenerating, setIsGenerating] = useState(false);
    const [assignModalSession, setAssignModalSession] = useState<ClassSession | null>(null);
    const [isAssigning, setIsAssigning] = useState(false);

    const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
    const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);

    // --- 2. Filter DB Sessions ---
    const events = useMemo(() => {
        return classSessions
            .filter(session => {
                const sessionDate = parse(session.date, 'yyyy-MM-dd', new Date());
                return weekDays.some(d => isSameDay(d, sessionDate));
            })
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }, [classSessions, weekDays]);

    const calendarSignals = useMemo(() => ({
        sessions: events.length,
        assigned: events.filter(event => event.instructorId).length,
        unassigned: events.filter(event => !event.instructorId).length,
        workshops: events.filter(event => event.type === 'workshop_trial').length
    }), [events]);
    const assignableTeam = useMemo(() => teamMembers.filter(member => ['instructor', 'admin', 'admission_officer'].includes(member.role)), [teamMembers]);

    // --- 3. Render Helpers ---
    const getEventsForDay = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return events.filter(e => e.date === dateStr);
    };

    const getThemeColor = (event: ClassSession) => {
        if (event.type === 'workshop_trial') {
            return 'border-rose-400/40 text-rose-100';
        }
        const colors: any = {
            blue: 'border-sky-400/40 text-sky-100',
            purple: 'border-teal-400/40 text-teal-100',
            emerald: 'border-emerald-400/40 text-emerald-100',
            amber: 'border-amber-300/40 text-amber-100',
            rose: 'border-rose-400/40 text-rose-100',
            cyan: 'border-cyan-400/40 text-cyan-100',
            slate: 'border-slate-500/40 text-slate-200',
        };
        return colors[event.color || 'blue'] || colors.blue;
    };

    // --- 4. Timetable Generator (Progressive Materialization) ---
    const handleSyncWeek = async () => {
        if (!currentOrganization?.id) {
            await showAlert('Organization required', 'Select an organization before synchronizing the weekly schedule.', 'warning');
            return;
        }
        if (!can('attendance.manage')) {
            await showAlert('Permission required', 'You can review this schedule, but only attendance managers can synchronize sessions.', 'warning');
            return;
        }
        setIsGenerating(true);
        const batch = writeBatch(db);
        let additions = 0;

        try {
            let debugGroupsFound = 0;
            let debugWorkshopsFound = 0;
            let debugAlreadyExists = 0;
            let invalidGroups = 0;

            // A. Check Programs
            programs.forEach(program => {
                if (program.status !== 'active') return;
                program.grades.forEach(grade => {
                    grade.groups.forEach(group => {
                        const englishDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        const frenchDays = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
                        
                        let dayIndex = englishDays.indexOf(group.day);
                        if (dayIndex === -1) {
                            dayIndex = frenchDays.findIndex(d => d.toLowerCase() === group.day?.toLowerCase());
                        }
                        
                        if (dayIndex === -1) {
                            invalidGroups++;
                            return;
                        }

                        const targetDate = weekDays.find(d => getDay(d) === dayIndex);
                        if (targetDate) {
                            debugGroupsFound++;
                            const dateStr = format(targetDate, 'yyyy-MM-dd');
                            
                            // Does this session already exist?
                            const exists = classSessions.some(c => c.groupId === group.id && c.date === dateStr);
                            if (!exists) {
                                const newRef = doc(collection(db, 'class_sessions'));
                                batch.set(newRef, {
                                    organizationId: currentOrganization.id,
                                    date: dateStr || '',
                                    startTime: group?.time || '10:00',
                                    endTime: addMinutesToTime(group?.time || '10:00', 60),
                                    title: program?.name || 'Untitled Program',
                                    subTitle: `${grade?.name || 'Level'} - ${group?.name || 'Group'}`,
                                    type: 'program_class',
                                    programId: program?.id || '',
                                    gradeId: grade?.id || '',
                                    groupId: group?.id || '',
                                    status: 'scheduled',
                                    color: program?.themeColor || 'blue',
                                    createdAt: serverTimestamp()
                                });
                                additions++;
                            } else {
                                debugAlreadyExists++;
                            }
                        }
                    });
                });
            });

            // B. Check Workshops
            workshopSlots.forEach(slot => {
                const template = workshopTemplates.find(t => t.id === slot.workshopTemplateId);
                if (!template) return;

                const slotDate = parse(slot.date, 'yyyy-MM-dd', new Date());
                const isInWeek = weekDays.some(d => isSameDay(d, slotDate));
                
                if (isInWeek) {
                    debugWorkshopsFound++;
                    const exists = classSessions.some(c => c.workshopSlotId === slot.id);
                    if (!exists) {
                        const newRef = doc(collection(db, 'class_sessions'));
                        batch.set(newRef, {
                            organizationId: currentOrganization.id,
                            date: slot?.date || '',
                            startTime: slot?.startTime || '10:00',
                            endTime: slot?.endTime || '12:00',
                            title: template?.title || 'Workshop',
                            subTitle: 'Make & Go Workshop',
                            type: 'workshop_trial',
                            workshopSlotId: slot?.id || '',
                            status: 'scheduled',
                            color: 'rose',
                            createdAt: serverTimestamp()
                        });
                        additions++;
                    } else {
                        debugAlreadyExists++;
                    }
                }
            });

            if (additions > 0) {
                await batch.commit();
                await showAlert('Week synchronized', `Added ${additions} ${additions === 1 ? 'session' : 'sessions'} to this week.${invalidGroups > 0 ? ` ${invalidGroups} group schedules need a recognized weekday before they can sync.` : ''}`, 'success');
            } else {
                await showAlert(
                    'Week is up to date',
                    `Found ${debugGroupsFound} program groups and ${debugWorkshopsFound} workshop slots. ${debugAlreadyExists} existing sessions were left unchanged.${invalidGroups > 0 ? ` ${invalidGroups} group schedules use an unrecognized weekday.` : ''}`,
                    'info'
                );
            }
        } catch (error: any) {
            console.error('SYNC EXCEPTION:', error);
            await showAlert('Schedule sync failed', error.message || String(error), 'danger');
        } finally {
            setIsGenerating(false);
        }
    };

    // --- 5. Assignment Logic ---
    const handleAssignInstructor = async (instructorId: string) => {
        if (!assignModalSession) return;
        if (!currentOrganization?.id || assignModalSession.organizationId !== currentOrganization.id) {
            await showAlert('Organization mismatch', 'This session cannot be changed from the current organization.', 'danger');
            return;
        }
        if (!can('attendance.manage')) {
            await showAlert('Permission required', 'Only attendance managers can change instructor coverage.', 'warning');
            return;
        }
        if (assignModalSession.instructorId === instructorId) {
            setAssignModalSession(null);
            return;
        }
        if (!instructorId && assignModalSession.instructorId) {
            const approved = await confirm({
                title: 'Remove instructor assignment?',
                message: `${assignModalSession.instructorName || 'The assigned instructor'} will be removed from ${assignModalSession.title} on ${assignModalSession.date}.`,
                confirmText: 'Remove assignment',
                cancelText: 'Keep assignment',
                variant: 'warning'
            });
            if (!approved) return;
        }
        const instructor = teamMembers.find(t => t.uid === instructorId);
        if (instructorId && !instructor) {
            await showAlert('Instructor unavailable', 'That team member is no longer available. Refresh the schedule and choose another instructor.', 'warning');
            return;
        }
        setIsAssigning(true);
        try {
            await updateDoc(doc(db, 'class_sessions', assignModalSession.id), {
                instructorId: instructorId,
                instructorName: instructor ? instructor.name : '',
                assignedBy: userProfile?.uid || '',
                updatedAt: serverTimestamp()
            });
            setAssignModalSession(null);
            await showAlert(instructor ? 'Instructor assigned' : 'Assignment removed', instructor ? `${instructor.name} is now assigned to ${assignModalSession.title}.` : `${assignModalSession.title} is now unassigned.`, 'success');
        } catch (error) {
            console.error(error);
            await showAlert('Assignment failed', 'The instructor coverage change was not saved.', 'danger');
        } finally {
            setIsAssigning(false);
        }
    };

    return (
        <div className="space-y-6 pb-24 md:pb-8">
            <AtlasCommandHeader
                eyebrow="Daily operations"
                title="Session Calendar"
                description="Coordinate classes, workshops, and instructor coverage from one weekly schedule."
                icon={CalendarIcon}
                badges={
                    <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                        {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d')}
                    </span>
                }
                actions={
                    <>
                    <button
                        type="button"
                        onClick={handleSyncWeek}
                        disabled={isGenerating}
                        title="Create missing sessions from active class groups and workshop slots"
                        className="flex min-h-10 items-center gap-2 rounded-lg border border-teal-300/25 bg-teal-400/10 px-4 py-2 text-sm font-bold text-teal-200 transition-colors hover:bg-teal-400/15 disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={isGenerating ? 'animate-spin' : ''} />
                        Sync Week
                    </button>
                    
                    <div className="flex min-h-10 items-center rounded-lg border border-white/10 bg-slate-900 p-1">
                        <button type="button" onClick={() => setCurrentDate(subWeeks(currentDate, 1))} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white" title="Previous week" aria-label="Previous week"><ChevronLeft size={18} /></button>
                        <button type="button" onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-xs font-bold text-slate-200 hover:text-white">
                            Today
                        </button>
                        <button type="button" onClick={() => setCurrentDate(addWeeks(currentDate, 1))} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white" title="Next week" aria-label="Next week"><ChevronRight size={18} /></button>
                    </div>
                    </>
                }
            />

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <AtlasSignalCard label="Week sessions" value={calendarSignals.sessions} detail="Classes and workshops" icon={CalendarIcon} tone="teal" />
                <AtlasSignalCard label="Assigned" value={calendarSignals.assigned} detail="Instructor confirmed" icon={UserPlus} tone="emerald" />
                <AtlasSignalCard label="Coverage gaps" value={calendarSignals.unassigned} detail="Needs an instructor" icon={AlertTriangle} tone={calendarSignals.unassigned > 0 ? 'amber' : 'slate'} />
                <AtlasSignalCard label="Workshops" value={calendarSignals.workshops} detail="Trial and Make & Go" icon={Users} tone="blue" />
            </div>

            {/* Calendar Grid */}
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/50 p-4 md:p-5">
                <div className="grid min-w-0 grid-cols-1 gap-5 pb-2 md:min-w-[1000px] md:grid-cols-7 md:gap-3">
                    {weekDays.map((day, i) => {
                        const dayEvents = getEventsForDay(day);
                        const isToday = isSameDay(day, new Date());

                        return (
                            <div key={i} className="flex flex-col gap-3 group">
                                {/* Day Header */}
                                <div className={`flex items-center justify-between rounded-lg border p-3 transition-colors md:flex-col md:justify-center ${isToday ? 'border-teal-300/40 bg-teal-400/15 text-teal-100' : 'border-white/10 bg-slate-900/80 text-slate-300'}`}>
                                    <div className="flex items-center gap-2 md:block md:text-center">
                                        <div className={`text-sm font-bold uppercase tracking-wider md:text-xs ${isToday ? 'text-teal-200' : 'text-slate-500'}`}>{format(day, 'EEE')}</div>
                                        <div className="text-2xl font-black md:hidden">-</div>
                                        <div className="text-xl md:text-2xl font-black">{format(day, 'd')}</div>
                                    </div>
                                </div>

                                {/* Events Column */}
                                <div className="space-y-3 md:space-y-2 pl-4 md:pl-0 border-l-2 md:border-l-0 border-slate-200/50 ml-4 md:ml-0 md:h-full">
                                    {dayEvents.length === 0 && (
                                        <div className="flex min-h-14 items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] text-xs font-medium text-slate-600 md:h-32">
                                            No sessions
                                        </div>
                                    )}
                                    
                                    {dayEvents.map(event => (
                                        <button
                                            type="button"
                                            key={event.id}
                                            onClick={() => setAssignModalSession(event)}
                                            className={`group relative w-full rounded-lg border border-l-4 bg-slate-900/90 p-4 text-left transition-colors hover:bg-slate-800/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 md:p-3 ${getThemeColor(event)}`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1 font-mono text-xs font-black text-white md:py-0.5 md:text-[10px]">{event.startTime} - {event.endTime}</span>
                                            </div>
                                            <h4 className="font-bold text-base md:text-sm leading-tight mb-1">{event.title}</h4>
                                            <p className="text-[11px] font-bold opacity-80 uppercase tracking-widest mb-2">{event.subTitle}</p>
                                            
                                            {/* Instructor Assignment Status */}
                                            <div className={`mt-3 flex items-center gap-1.5 border-t border-white/10 pt-2 text-xs font-bold ${event.instructorId ? 'text-slate-300' : 'text-amber-300'}`}>
                                                <UserPlus size={14} />
                                                {event.instructorId ? event.instructorName : 'Unassigned'}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <Modal isOpen={Boolean(assignModalSession)} onClose={() => !isAssigning && setAssignModalSession(null)} title="Assign instructor">
                {assignModalSession && (
                    <div className="space-y-4">
                        <div className="rounded-lg border border-white/10 bg-slate-950 p-4 text-sm text-slate-300">
                            <div className="font-black text-white">{assignModalSession.title}</div>
                            <div className="mt-1 font-mono text-xs text-slate-400">{assignModalSession.date} · {assignModalSession.startTime} - {assignModalSession.endTime}</div>
                        </div>
                        <div>
                            <p className="mb-3 text-xs font-bold uppercase text-slate-500">Available instructors</p>
                            {assignableTeam.length === 0 ? (
                                <AtlasEmptyState title="No instructors available" description="Add an instructor or administrator to the team before assigning coverage." icon={Users} />
                            ) : (
                            <div className="max-h-[300px] space-y-2 overflow-y-auto">
                                {assignableTeam.map(teamMember => (
                                    <button
                                        type="button"
                                        key={teamMember.uid}
                                        disabled={isAssigning}
                                        onClick={() => handleAssignInstructor(teamMember.uid)}
                                        className={`w-full rounded-lg border px-4 py-3 text-left font-bold transition-colors disabled:cursor-wait disabled:opacity-50 ${assignModalSession.instructorId === teamMember.uid ? 'border-teal-300/50 bg-teal-400/10 text-teal-100' : 'border-white/10 bg-slate-900 text-slate-300 hover:border-white/20'}`}
                                    >
                                        {teamMember.name} <span className="ml-2 text-xs font-normal opacity-70">({teamMember.role})</span>
                                    </button>
                                ))}
                            </div>
                            )}
                        </div>
                        <div className="flex justify-end border-t border-white/10 pt-4">
                            <AtlasActionButton variant={assignModalSession.instructorId ? 'danger' : 'secondary'} disabled={isAssigning || !assignModalSession.instructorId} onClick={() => handleAssignInstructor('')}>
                                {isAssigning ? 'Saving...' : 'Remove assignment'}
                            </AtlasActionButton>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
