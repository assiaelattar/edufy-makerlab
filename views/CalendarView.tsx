import React, { useState, useMemo } from 'react';
import { startOfWeek, addDays, format, isSameDay, addWeeks, subWeeks, parse, getDay, isValid } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users, AlertTriangle, RefreshCw, UserPlus, Search, List, LayoutGrid, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { ClassSession } from '../types';
import { collection, updateDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { EducationButton, EducationState, EducationStatusPill, EducationTabs } from '../components/education-ui/EducationPrimitives';
import './school-day/education-school-day-v1.css';
import './school-day/education-calendar-playful.css';
import { Modal } from '../components/Modal';
import { getProgramOperationalState } from '../utils/programLifecycle';
import { getSchoolWeekdayIndex } from '../utils/schoolSchedule';

const addMinutesToTime = (time: string, minutesToAdd: number) => {
    const [hours, minutes] = time.split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return time;
    const total = (hours * 60 + minutes + minutesToAdd) % (24 * 60);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

export const CalendarView = () => {
    const showEducationSchoolDayV1 = new URLSearchParams(window.location.search).get('ui') !== 'atlas-legacy';
    const { programs, workshopTemplates, workshopSlots, classSessions, teamMembers } = useAppContext();
    const { can, currentOrganization, userProfile } = useAuth();
    const { confirm, alert: showAlert } = useConfirm();
    const [currentDate, setCurrentDate] = useState(new Date());

    const [scheduleView, setScheduleView] = useState<'week' | 'agenda'>(() => window.matchMedia('(max-width: 767px)').matches ? 'agenda' : 'week');
    const [sessionQuery, setSessionQuery] = useState('');
    const [coverageFilter, setCoverageFilter] = useState<'all' | 'unassigned'>('all');
    const [typeFilter, setTypeFilter] = useState<'all' | 'program_class' | 'workshop_trial'>('all');
    const [instructorQuery, setInstructorQuery] = useState('');
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
    const sortedEvents = useMemo(() => [...events].sort((first, second) => `${first.date} ${first.startTime}`.localeCompare(`${second.date} ${second.startTime}`)), [events]);
    const firstCoverageGap = sortedEvents.find(event => !event.instructorId && `${event.date} ${event.startTime}` >= format(new Date(), 'yyyy-MM-dd HH:mm'))
        || sortedEvents.find(event => !event.instructorId);
    const nextSession = sortedEvents.find(event => `${event.date} ${event.startTime}` >= format(new Date(), 'yyyy-MM-dd HH:mm')) || sortedEvents[0];
    const assignableTeam = useMemo(() => teamMembers.filter((member): member is typeof member & { uid: string } => Boolean(member.uid) && ['instructor', 'admin', 'admission_officer'].includes(member.role)), [teamMembers]);

    const filteredEvents = useMemo(() => {
        const query = sessionQuery.trim().toLocaleLowerCase();
        return sortedEvents.filter(event =>
            (coverageFilter === 'all' || !event.instructorId) &&
            (typeFilter === 'all' || event.type === typeFilter) &&
            [event.title, event.subTitle, event.instructorName].some(value => (value || '').toLocaleLowerCase().includes(query))
        );
    }, [sortedEvents, sessionQuery, coverageFilter, typeFilter]);
    const jumpToDate = (value: string) => {
        const selectedDate = parse(value, 'yyyy-MM-dd', new Date());
        if (isValid(selectedDate)) setCurrentDate(selectedDate);
    };
    const hasFilters = Boolean(sessionQuery || coverageFilter !== 'all' || typeFilter !== 'all');
    const clearFilters = () => { setSessionQuery(''); setCoverageFilter('all'); setTypeFilter('all'); };
    const openSession = (session: ClassSession) => { setInstructorQuery(''); setAssignModalSession(session); };
    const visibleInstructors = assignableTeam.filter(member => `${member.name} ${member.role}`.toLocaleLowerCase().includes(instructorQuery.trim().toLocaleLowerCase()));

    // --- 3. Render Helpers ---
    const getEventsForDay = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return (showEducationSchoolDayV1 ? filteredEvents : events).filter(e => e.date === dateStr);
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

    const renderSessionCard = (event: ClassSession) => (
        <button
            type="button"
            key={event.id}
            onClick={() => openSession(event)}
            data-session-type={event.type}
            data-coverage={event.instructorId ? 'assigned' : 'unassigned'}
            className={`edu-calendar-session group relative w-full rounded-lg border border-l-4 bg-slate-900/90 p-4 text-left transition-colors hover:bg-slate-800/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 md:p-3 ${getThemeColor(event)}`}
        >
            <div className="edu-calendar-session__time flex justify-between items-start mb-2">
                <span className="rounded-lg border border-white/10 bg-slate-950 px-2 py-1 font-mono text-xs font-black text-white md:py-0.5 md:text-[10px]">{event.startTime} - {event.endTime}</span>
            </div>
            <h4 className="font-bold text-base md:text-sm leading-tight mb-1">{event.title}</h4>
            <p className="edu-calendar-session__group text-[11px] font-bold opacity-80 uppercase tracking-widest mb-2">{event.subTitle}</p>

            {/* Instructor Assignment Status */}
            <div className={`edu-calendar-session__coverage mt-3 flex items-center gap-1.5 border-t border-white/10 pt-2 text-xs font-bold ${event.instructorId ? 'text-slate-300' : 'text-amber-300'}`}>
                <UserPlus size={14} />
                {event.instructorId ? (event.instructorName || 'Instructor assigned') : 'Needs instructor'}
            </div>
        </button>
    );

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
        const firestore = db;
        if (!firestore) {
            await showAlert('Schedule unavailable', 'The school data connection is unavailable. Retry when it reconnects.', 'warning');
            return;
        }
        setIsGenerating(true);
        const batch = writeBatch(firestore);
        let additions = 0;

        try {
            let debugGroupsFound = 0;
            let debugWorkshopsFound = 0;
            let debugAlreadyExists = 0;
            let invalidGroups = 0;

            // A. Check Programs
            programs.forEach(program => {
                program.grades.forEach(grade => {
                    grade.groups.forEach(group => {
                        const dayIndex = getSchoolWeekdayIndex(group.day);
                        
                        if (dayIndex === -1) {
                            invalidGroups++;
                            return;
                        }

                        const targetDate = weekDays.find(d => getDay(d) === dayIndex);
                        if (targetDate) {
                            const dateStr = format(targetDate, 'yyyy-MM-dd');
                            const operationalState = getProgramOperationalState(program, dateStr);
                            if (!['running', 'evergreen'].includes(operationalState)) return;
                            debugGroupsFound++;
                            
                            // Does this session already exist?
                            const exists = classSessions.some(c => c.groupId === group.id && c.date === dateStr);
                            if (!exists) {
                                const newRef = doc(collection(firestore, 'class_sessions'));
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
                        const newRef = doc(collection(firestore, 'class_sessions'));
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
        if (!db) {
            await showAlert('Schedule unavailable', 'The school data connection is unavailable. Retry when it reconnects.', 'warning');
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
        <div className="edu-v1 edu-calendar-v1 space-y-6 pb-24 md:pb-8" data-edu-system="1" data-testid="education-calendar-v1">
            <header className="edu-calendar-header">
                <div className="edu-calendar-header__identity"><CalendarIcon size={22} aria-hidden="true" /><span>Daily operations</span></div>
                <h1>School schedule</h1>
                <p>Coordinate classes, workshops, and instructor coverage from one weekly schedule.</p>
                <div className="edu-calendar-header__actions">
                    <EducationStatusPill status="success">{format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d')}</EducationStatusPill>
                    <div className="edu-calendar-week-nav" role="group" aria-label="Week navigation">
                        <EducationButton variant="secondary" onClick={() => setCurrentDate(subWeeks(currentDate, 1))} title="Previous week" aria-label="Previous week"><ChevronLeft size={18} /></EducationButton>
                        <EducationButton variant="secondary" onClick={() => setCurrentDate(new Date())}>Today</EducationButton>
                        <EducationButton variant="secondary" onClick={() => setCurrentDate(addWeeks(currentDate, 1))} title="Next week" aria-label="Next week"><ChevronRight size={18} /></EducationButton>
                    </div>
                    {can('attendance.manage') && <EducationButton variant="primary" icon={RefreshCw} onClick={handleSyncWeek} disabled={isGenerating} title="Create missing sessions from active class groups and workshop slots">{isGenerating ? 'Syncing week…' : 'Sync week'}</EducationButton>}
                </div>
            </header>

            {showEducationSchoolDayV1 && <div className="edu-school-day-v1__focus" data-attention={Boolean(firstCoverageGap)} role="region" aria-label="Schedule priority">
                <div className="edu-school-day-v1__focus-copy">
                    <span className="edu-school-day-v1__eyebrow">Selected week</span>
                    <h2>{firstCoverageGap ? `${calendarSignals.unassigned} ${calendarSignals.unassigned === 1 ? 'session needs' : 'sessions need'} coverage` : nextSession ? 'Instructor coverage is set' : 'No sessions in this week'}</h2>
                    <p>{firstCoverageGap ? `${firstCoverageGap.date} · ${firstCoverageGap.startTime} · ${firstCoverageGap.title}` : nextSession ? `Next: ${nextSession.date} · ${nextSession.startTime} · ${nextSession.title}` : can('attendance.manage') ? 'Synchronize the week to create sessions from active groups and workshops.' : 'No class or workshop sessions are available for this week.'}</p>
                </div>
                <div className="edu-school-day-v1__focus-actions">
                    {(firstCoverageGap || nextSession) && <EducationButton variant="primary" onClick={() => openSession((firstCoverageGap || nextSession)!)}>{firstCoverageGap && can('attendance.manage') ? 'Assign instructor' : 'Review session'} <ChevronRight size={16} /></EducationButton>}
                    {!nextSession && can('attendance.manage') && <EducationButton variant="primary" onClick={handleSyncWeek} disabled={isGenerating}>Sync week</EducationButton>}
                </div>
            </div>}

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <div className="edu-calendar-metric"><CalendarIcon aria-hidden="true"/><span>Week sessions</span><strong>{calendarSignals.sessions}</strong><small>Classes and workshops</small></div>
                <div className="edu-calendar-metric"><UserPlus aria-hidden="true"/><span>Assigned</span><strong>{calendarSignals.assigned}</strong><small>Instructor assigned</small></div>
                <button type="button" className="edu-calendar-metric" data-attention={calendarSignals.unassigned > 0} onClick={() => { setCoverageFilter('unassigned'); setScheduleView('agenda'); }}><AlertTriangle aria-hidden="true"/><span>Coverage gaps</span><strong>{calendarSignals.unassigned}</strong><small>View sessions needing an instructor</small></button>
                <div className="edu-calendar-metric"><Users aria-hidden="true"/><span>Workshops</span><strong>{calendarSignals.workshops}</strong><small>Trial and Make & Go</small></div>
            </div>

            {showEducationSchoolDayV1 && <section className="edu-calendar-tools" aria-label="Schedule controls">
                <div className="edu-calendar-tools__top">
                    <div><span className="edu-calendar-eyebrow">Your week at a glance</span><h3>{format(weekStart, 'd MMM')} – {format(addDays(weekStart, 6), 'd MMM yyyy')}</h3></div>
                    <EducationTabs label="Schedule view" value={scheduleView} onChange={value => setScheduleView(value as typeof scheduleView)} items={[{id:'week',label:'Week',icon:LayoutGrid},{id:'agenda',label:'Agenda',icon:List}]} />
                </div>
                <div className="edu-calendar-filters">
                    <label className="edu-calendar-search"><span>Find a session</span><div><Search size={17} /><input type="search" value={sessionQuery} onChange={event => setSessionQuery(event.target.value)} placeholder="Session, group or instructor" /></div></label>
                    <label><span>Coverage</span><select aria-label="Coverage" value={coverageFilter} onChange={event => setCoverageFilter(event.target.value as typeof coverageFilter)}><option value="all">All sessions</option><option value="unassigned">Needs instructor</option></select></label>
                    <label><span>Session type</span><select aria-label="Session type" value={typeFilter} onChange={event => setTypeFilter(event.target.value as typeof typeFilter)}><option value="all">Classes & workshops</option><option value="program_class">Classes</option><option value="workshop_trial">Workshops</option></select></label>
                    <label><span>Week containing</span><input aria-label="Week containing" type="date" value={format(currentDate, 'yyyy-MM-dd')} onInput={event => jumpToDate(event.currentTarget.value)} onChange={event => jumpToDate(event.target.value)} /></label>
                </div>
                <div className="edu-calendar-results"><span role="status">Showing {filteredEvents.length} of {events.length} sessions this week</span>{hasFilters && <button type="button" onClick={clearFilters}><X size={14} />Clear filters</button>}<span>Weekly totals above include all sessions.</span></div>
            </section>}

            <section role={showEducationSchoolDayV1 ? 'tabpanel' : undefined} id={showEducationSchoolDayV1 ? `schedule-view-panel-${scheduleView}` : undefined} aria-labelledby={showEducationSchoolDayV1 ? `schedule-view-${scheduleView}` : undefined}>
            {showEducationSchoolDayV1 && filteredEvents.length === 0 ? (
                <EducationState title={hasFilters && events.length ? 'No matching sessions' : 'No sessions this week'} description={hasFilters && events.length ? 'Try another session, instructor or filter.' : can('attendance.manage') ? 'Choose another week, or sync the timetable to create missing sessions from active groups and workshops.' : 'Choose another week, or ask an attendance manager to prepare the timetable.'}>{hasFilters ? <EducationButton onClick={clearFilters}>Clear filters</EducationButton> : <EducationButton onClick={() => setCurrentDate(new Date())}>Go to this week</EducationButton>}</EducationState>
            ) : showEducationSchoolDayV1 && scheduleView === 'agenda' ? (
                <div className="edu-calendar-agenda" aria-label="Weekly agenda">
                    {weekDays.filter(day => getEventsForDay(day).length > 0).map(day => (
                        <section className="edu-calendar-agenda__day" key={format(day, 'yyyy-MM-dd')} aria-label={format(day, 'EEEE d MMMM')}>
                            <header><div data-today={isSameDay(day, new Date())}><span>{format(day, 'EEE')}</span><strong>{format(day, 'd')}</strong></div><h3>{format(day, 'EEEE')}<small>{getEventsForDay(day).length} {getEventsForDay(day).length === 1 ? 'session' : 'sessions'}{isSameDay(day, new Date()) ? ' · Today' : ''}</small></h3></header>
                            <div className="edu-calendar-agenda__sessions">{getEventsForDay(day).map(renderSessionCard)}</div>
                        </section>
                    ))}
                </div>
            ) : (
            /* Calendar grid preserves the existing weekly timetable. */
            <div className="edu-calendar-grid overflow-x-auto rounded-xl border border-white/10 bg-slate-950/50 p-4 md:p-5">
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
                                    
                                    {dayEvents.map(renderSessionCard)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            )}
            </section>

            <Modal designSystem isOpen={Boolean(assignModalSession)} onClose={() => !isAssigning && setAssignModalSession(null)} title={can('attendance.manage') ? 'Assign instructor' : 'Session details'}>
                {assignModalSession && (
                    <div className="space-y-4">
                        <div className="edu-calendar-session-details">
                            <strong>{assignModalSession.title}</strong>
                            <time className="block mt-1" dateTime={assignModalSession.date}>{assignModalSession.date} · {assignModalSession.startTime} – {assignModalSession.endTime}</time>
                            <p className="mt-2">{assignModalSession.subTitle}</p>
                            <p className="mt-2">Current instructor: <strong>{assignModalSession.instructorName || (assignModalSession.instructorId ? 'Assigned' : 'Unassigned')}</strong></p>
                        </div>
                        {can('attendance.manage') && <div>
                            <label className="edu-calendar-instructor-search"><span>Find an instructor</span><input type="search" value={instructorQuery} onChange={event => setInstructorQuery(event.target.value)} placeholder="Name or role" /></label>
                            <p className="mb-3 text-sm font-bold">Available instructors</p>
                            {assignableTeam.length === 0 ? (
                                <EducationState title="No instructors available" description="Add an instructor or administrator to the team before assigning coverage." />
                            ) : visibleInstructors.length === 0 ? (
                                <EducationState title="No matching instructors" description="Try another name or clear the search."><EducationButton onClick={() => setInstructorQuery('')}>Clear search</EducationButton></EducationState>
                            ) : (
                            <div className="edu-calendar-instructors">
                                {visibleInstructors.map(teamMember => (
                                    <button
                                        type="button"
                                        key={teamMember.uid}
                                        disabled={isAssigning}
                                        aria-pressed={assignModalSession.instructorId === teamMember.uid}
                                        onClick={() => handleAssignInstructor(teamMember.uid)}
                                        className="w-full font-bold"
                                    >
                                        {teamMember.name} <span className="ml-2 text-xs font-normal opacity-70">({teamMember.role})</span>
                                    </button>
                                ))}
                            </div>
                            )}
                        </div>}
                        {can('attendance.manage') && <div className="flex justify-end border-t border-white/10 pt-4">
                            <EducationButton variant="secondary" status={assignModalSession.instructorId ? 'danger' : 'neutral'} disabled={isAssigning || !assignModalSession.instructorId} onClick={() => handleAssignInstructor('')}>
                                {isAssigning ? 'Saving...' : 'Remove assignment'}
                            </EducationButton>
                        </div>}
                    </div>
                )}
            </Modal>
        </div>
    );
};
