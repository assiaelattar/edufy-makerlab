import React, { useState, useMemo } from 'react';
import { startOfWeek, addDays, format, isSameDay, addWeeks, subWeeks, parse, getDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Users, AlertTriangle, Check, RefreshCw, UserPlus, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { ClassSession } from '../types';
import { collection, addDoc, updateDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';

export const CalendarView = () => {
    const { programs, workshopTemplates, workshopSlots, classSessions, teamMembers, navigateTo } = useAppContext();
    const { currentOrganization } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());

    const [isGenerating, setIsGenerating] = useState(false);
    const [assignModalSession, setAssignModalSession] = useState<ClassSession | null>(null);

    // --- 1. Generate Week Days ---
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

    // --- 2. Filter DB Sessions ---
    const events = useMemo(() => {
        return classSessions
            .filter(session => {
                const sessionDate = parse(session.date, 'yyyy-MM-dd', new Date());
                return weekDays.some(d => isSameDay(d, sessionDate));
            })
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }, [classSessions, weekDays]);

    // --- 3. Render Helpers ---
    const getEventsForDay = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return events.filter(e => e.date === dateStr);
    };

    const getThemeColor = (event: ClassSession) => {
        if (event.type === 'workshop_trial') {
            return 'bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-200';
        }
        const colors: any = {
            blue: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
            purple: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200',
            emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200',
            amber: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200',
            rose: 'bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200',
            cyan: 'bg-cyan-100 text-cyan-700 border-cyan-200 hover:bg-cyan-200',
            slate: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200',
        };
        return colors[event.color || 'blue'] || colors.blue;
    };

    // --- 4. Timetable Generator (Progressive Materialization) ---
    const handleSyncWeek = async () => {
        if (!currentOrganization) return;
        setIsGenerating(true);
        const batch = writeBatch(db);
        let additions = 0;

        try {
            let debugGroupsFound = 0;
            let debugWorkshopsFound = 0;
            let debugAlreadyExists = 0;

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
                        
                        if (dayIndex === -1) return;

                        const targetDate = weekDays.find(d => getDay(d) === dayIndex);
                        if (targetDate) {
                            debugGroupsFound++;
                            const dateStr = format(targetDate, 'yyyy-MM-dd');
                            
                            // Does this session already exist?
                            const exists = classSessions.some(c => c.groupId === group.id && c.date === dateStr);
                            if (!exists) {
                                const newRef = doc(collection(db, 'class_sessions'));
                                batch.set(newRef, {
                                    organizationId: currentOrganization?.id || 'makerlab-academy',
                                    date: dateStr || '',
                                    startTime: group?.time || '10:00',
                                    endTime: group?.time || '11:00',
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
                            organizationId: currentOrganization?.id || 'makerlab-academy',
                            date: slot?.date || '',
                            startTime: slot?.startTime || '10:00',
                            endTime: slot?.endTime || '12:00',
                            title: template?.title || 'Workshop',
                            subTitle: 'Make & Go Workshop',
                            type: 'workshop_trial',
                            workshopSlotId: slot?.id || '',
                            status: 'scheduled',
                            color: 'pink',
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
                alert(`Successfully generated ${additions} physical sessions for this week.`);
            } else {
                alert(`Sync Complete:\n- Found ${debugGroupsFound} program groups matching this week.\n- Found ${debugWorkshopsFound} workshop slots matching this week.\n- Skipped ${debugAlreadyExists} because they are already on the calendar.\n\nIf groups=0, check if your StemQuest program is set to "Active" and has valid English days (e.g. "Monday").`);
            }
        } catch (error: any) {
            console.error('SYNC EXCEPTION:', error);
            alert('Failed to sync schedule. Details: ' + (error.message || String(error)));
        } finally {
            setIsGenerating(false);
        }
    };

    // --- 5. Assignment Logic ---
    const handleAssignInstructor = async (instructorId: string) => {
        if (!assignModalSession) return;
        const instructor = teamMembers.find(t => t.uid === instructorId);
        try {
            await updateDoc(doc(db, 'class_sessions', assignModalSession.id), {
                instructorId: instructorId,
                instructorName: instructor ? instructor.name : ''
            });
            setAssignModalSession(null);
        } catch (error) {
            console.error(error);
            alert('Failed to assign instructor.');
        }
    };

    return (
        <div className="min-h-[100dvh] flex flex-col bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 md:px-6 flex flex-col md:flex-row items-center justify-between gap-3 sticky top-0 z-20 shadow-sm">
                <div className="w-full md:w-auto flex items-center justify-between md:block">
                    <div>
                        <h1 className="text-lg md:text-2xl font-black text-slate-800 flex items-center gap-2">
                            <CalendarIcon className="text-blue-600 w-5 h-5 md:w-6 md:h-6" />
                            Universal Operations
                        </h1>
                        <p className="text-slate-500 text-[10px] md:text-sm hidden md:block">Physical class sessions assigned to animators.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button 
                        onClick={handleSyncWeek}
                        disabled={isGenerating}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-bold text-sm transition-colors border border-indigo-200"
                    >
                        <RefreshCw size={16} className={isGenerating ? 'animate-spin' : ''} />
                        Sync Week
                    </button>
                    
                    <div className="flex items-center bg-slate-100 rounded-lg p-1 flex-1 md:flex-none">
                        <button onClick={() => setCurrentDate(subWeeks(currentDate, 1))} className="p-1.5 hover:bg-white rounded-md transition-all text-slate-600"><ChevronLeft size={18} /></button>
                        <span className="flex-1 text-center px-4 font-bold text-slate-700 text-sm md:text-base whitespace-nowrap">
                            {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d')}
                        </span>
                        <button onClick={() => setCurrentDate(addWeeks(currentDate, 1))} className="p-1.5 hover:bg-white rounded-md transition-all text-slate-600"><ChevronRight size={18} /></button>
                    </div>
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 py-2 bg-slate-900 text-white rounded-lg font-bold text-xs md:text-sm hover:bg-slate-800 shrink-0">
                        Today
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 bg-slate-50/50">
                <div className="grid grid-cols-1 md:grid-cols-7 gap-6 md:gap-4 md:min-w-[1000px] pb-8 md:pb-0">
                    {weekDays.map((day, i) => {
                        const dayEvents = getEventsForDay(day);
                        const isToday = isSameDay(day, new Date());

                        return (
                            <div key={i} className="flex flex-col gap-3 group">
                                {/* Day Header */}
                                <div className={`flex md:flex-col items-center justify-between md:justify-center p-4 md:p-3 rounded-2xl md:rounded-xl border transition-all \${isToday ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30 ring-4 ring-blue-500/10' : 'bg-white text-slate-700 border-slate-200/60 shadow-sm'}`}>
                                    <div className="flex items-center gap-2 md:block md:text-center">
                                        <div className={`text-sm md:text-xs uppercase font-bold tracking-wider \${isToday ? 'opacity-90' : 'opacity-70'}`}>{format(day, 'EEE')}</div>
                                        <div className="text-2xl font-black md:hidden">-</div>
                                        <div className="text-xl md:text-2xl font-black">{format(day, 'd')}</div>
                                    </div>
                                </div>

                                {/* Events Column */}
                                <div className="space-y-3 md:space-y-2 pl-4 md:pl-0 border-l-2 md:border-l-0 border-slate-200/50 ml-4 md:ml-0 md:h-full">
                                    {dayEvents.length === 0 && (
                                        <div className="hidden md:flex h-32 rounded-xl border-2 border-dashed border-slate-200/60 items-center justify-center text-slate-400 text-xs font-medium bg-slate-50/50">
                                            No Activity
                                        </div>
                                    )}
                                    
                                    {dayEvents.map(event => (
                                        <div
                                            key={event.id}
                                            onClick={() => setAssignModalSession(event)}
                                            className={`p-4 md:p-3 rounded-2xl md:rounded-lg border-l-4 transition-all cursor-pointer group relative hover:shadow-xl hover:-translate-y-1 active:scale-95 duration-200 bg-white shadow-sm border-slate-100 \${getThemeColor(event)}`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-xs md:text-[10px] font-black tracking-wider bg-white/80 backdrop-blur px-2 py-1 md:py-0.5 rounded shadow-sm ring-1 ring-black/5">{event.startTime}</span>
                                            </div>
                                            <h4 className="font-bold text-base md:text-sm leading-tight mb-1">{event.title}</h4>
                                            <p className="text-[11px] font-bold opacity-80 uppercase tracking-widest mb-2">{event.subTitle}</p>
                                            
                                            {/* Instructor Assignment Status */}
                                            <div className={`mt-3 pt-2 border-t border-black/10 flex items-center gap-1.5 text-xs font-bold \${event.instructorId ? 'text-black/80' : 'text-red-600'}`}>
                                                <UserPlus size={14} />
                                                {event.instructorId ? event.instructorName : 'Unassigned'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ASSIGNMENT MODAL */}
            {assignModalSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100">
                            <h3 className="text-xl font-black text-slate-800">Assign Animator</h3>
                            <button onClick={() => setAssignModalSession(null)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 pb-2">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 font-medium text-slate-700">
                                <span className="font-black">Session:</span> {assignModalSession.title} ({assignModalSession.startTime})
                            </div>
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Available Instructors</p>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {teamMembers.filter(t => t.role === 'instructor' || t.role === 'admin' || t.role === 'admission_officer').map(teamMember => (
                                    <button
                                        key={teamMember.uid}
                                        onClick={() => handleAssignInstructor(teamMember.uid)}
                                        className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors font-bold \${assignModalSession.instructorId === teamMember.uid ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 hover:border-slate-300 text-slate-700'}`}
                                    >
                                        {teamMember.name} <span className="text-xs font-normal opacity-70 ml-2">({teamMember.role})</span>
                                    </button>
                                ))}
                                <button
                                    onClick={() => handleAssignInstructor('')}
                                    className={`w-full text-left px-4 py-3 rounded-xl border-2 border-dashed transition-colors font-bold mt-4 \${!assignModalSession.instructorId ? 'border-red-500 bg-red-50 text-red-700' : 'border-red-200 hover:border-red-300 text-red-600'}`}
                                >
                                    Unassign (Clear)
                                </button>
                            </div>
                        </div>
                        <div className="p-6"></div>
                    </div>
                </div>
            )}
        </div>
    );
};
