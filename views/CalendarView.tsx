
import React, { useState, useMemo } from 'react';
import { startOfWeek, addDays, format, isSameDay, addWeeks, subWeeks, parse, getDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Users, AlertTriangle, Check } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Program, WorkshopSlot, Group } from '../types';

export const CalendarView = () => {
    const { programs, workshopTemplates, workshopSlots, navigateTo } = useAppContext();
    const [currentDate, setCurrentDate] = useState(new Date());

    // --- 1. Generate Week Days ---
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

    // --- 2. Event Projection Logic ---
    const events = useMemo(() => {
        const allEvents: any[] = [];

        // A. Recurring Program Classes
        programs.forEach(program => {
            if (program.status !== 'active') return;
            program.grades.forEach(grade => {
                grade.groups.forEach(group => {
                    // Normalize Day String (e.g. "Monday") to Index (0-6)
                    const dayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(group.day);
                    if (dayIndex === -1) return;

                    // Find the date in the current week that matches this day index
                    const targetDate = weekDays.find(d => getDay(d) === dayIndex);
                    if (targetDate) {
                        allEvents.push({
                            id: `cls-${group.id}`,
                            title: `${program.name} - ${grade.name}`,
                            subTitle: group.name, // e.g. "Group A"
                            type: 'class',
                            start: parse(group.time, 'HH:mm', targetDate),
                            end: addDays(parse(group.time, 'HH:mm', targetDate), 0),
                            timeStr: group.time,
                            date: targetDate,
                            color: program.themeColor || 'blue',
                            programId: program.id,
                            gradeId: grade.id, // NEW
                            groupId: group.id, // NEW
                            meta: { group, program }
                        });
                    }
                });
            });
        });

        // B. Workshop Slots
        workshopSlots.forEach(slot => {
            const template = workshopTemplates.find(t => t.id === slot.workshopTemplateId);
            if (!template) return;

            const slotDate = parse(slot.date, 'yyyy-MM-dd', new Date());

            // Only add if within current week range to save processing? 
            // Actually, better to check if it falls in the weekDays range.
            const isInWeek = weekDays.some(d => isSameDay(d, slotDate));
            if (!isInWeek) return;

            allEvents.push({
                id: `ws-${slot.id}`,
                title: template.title,
                subTitle: `${slot.bookedCount}/${slot.capacity} Booked`, // "Reserved or not"
                type: 'workshop',
                start: parse(slot.startTime, 'HH:mm', slotDate),
                end: parse(slot.endTime, 'HH:mm', slotDate),
                timeStr: slot.startTime,
                date: slotDate,
                color: 'pink', // Workshops distinct color
                meta: { slot, template }
            });
        });

        return allEvents.sort((a, b) => a.timeStr.localeCompare(b.timeStr));
    }, [programs, workshopTemplates, workshopSlots, weekDays]);

    // --- 3. Render Helpers ---
    const getEventsForDay = (date: Date) => {
        return events.filter(e => isSameDay(e.date, date));
    };

    const handleEventClick = (event: any) => {
        if (event.type === 'class') {
            // Navigate to Class/Group Detail View
            navigateTo('classes', {
                classId: {
                    pId: event.programId,
                    gId: event.gradeId,
                    grpId: event.groupId
                }
            });
        } else if (event.type === 'workshop') {
            // Navigate to Workshops View (ideally filtered)
            navigateTo('workshops');
        }
    };

    const getThemeColor = (event: any) => {
        if (event.type === 'workshop') {
            // Special styling for workshops
            return 'bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-200 hover:shadow-pink-500/20';
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
        return colors[event.color] || colors.blue;
    };

    return (
        <div className="min-h-[100dvh] flex flex-col bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 md:px-6 flex flex-col md:flex-row items-center justify-between gap-3 sticky top-0 z-20 shadow-sm">
                <div className="w-full md:w-auto flex items-center justify-between md:block">
                    <div>
                        <h1 className="text-lg md:text-2xl font-black text-slate-800 flex items-center gap-2">
                            <CalendarIcon className="text-blue-600 w-5 h-5 md:w-6 md:h-6" />
                            Global Schedule
                        </h1>
                        <p className="text-slate-500 text-[10px] md:text-sm hidden md:block">Weekly overview of all classes and workshops</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="flex items-center bg-slate-100 rounded-lg p-1 flex-1 md:flex-none">
                        <button onClick={() => setCurrentDate(subWeeks(currentDate, 1))} className="p-1.5 hover:bg-white rounded-md transition-all text-slate-600"><ChevronLeft size={18} /></button>
                        <span className="flex-1 text-center px-2 font-bold text-slate-700 text-sm md:text-base whitespace-nowrap">
                            {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d')}
                        </span>
                        <button onClick={() => setCurrentDate(addWeeks(currentDate, 1))} className="p-1.5 hover:bg-white rounded-md transition-all text-slate-600"><ChevronRight size={18} /></button>
                    </div>
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-bold text-xs md:text-sm hover:bg-slate-800 shrink-0">
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
                                <div className={`flex md:flex-col items-center justify-between md:justify-center p-4 md:p-3 rounded-2xl md:rounded-xl border transition-all ${isToday ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30 ring-4 ring-blue-500/10' : 'bg-white text-slate-700 border-slate-200/60 shadow-sm'}`}>
                                    <div className="flex items-center gap-2 md:block md:text-center">
                                        <div className={`text-sm md:text-xs uppercase font-bold tracking-wider ${isToday ? 'opacity-90' : 'opacity-70'}`}>{format(day, 'EEE')}</div>
                                        <div className="text-2xl font-black md:hidden">-</div>
                                        <div className="text-xl md:text-2xl font-black">{format(day, 'd')}</div>
                                    </div>
                                    <div className="md:hidden text-xs font-medium opacity-80 bg-white/20 px-2 py-1 rounded">
                                        {dayEvents.length} Events
                                    </div>
                                </div>

                                {/* Events Column */}
                                <div className="space-y-3 md:space-y-2 pl-4 md:pl-0 border-l-2 md:border-l-0 border-slate-200/50 ml-4 md:ml-0 md:h-full">
                                    {dayEvents.length === 0 && (
                                        <div className="hidden md:flex h-32 rounded-xl border-2 border-dashed border-slate-200/60 items-center justify-center text-slate-400 text-xs font-medium bg-slate-50/50">
                                            No Activity
                                        </div>
                                    )}
                                    {dayEvents.length === 0 && (
                                        <div className="md:hidden text-sm text-slate-400 italic py-2">
                                            No events scheduled.
                                        </div>
                                    )}
                                    {dayEvents.map(event => (
                                        <div
                                            key={event.id}
                                            onClick={() => handleEventClick(event)}
                                            className={`p-4 md:p-3 rounded-2xl md:rounded-lg border-l-4 transition-all cursor-pointer group relative hover:shadow-xl hover:-translate-y-1 active:scale-95 duration-200 bg-white shadow-sm border-slate-100 ${getThemeColor(event)}`}
                                        >
                                            <div className="flex justify-between items-start mb-2 md:mb-1">
                                                <span className="text-xs md:text-[10px] font-bold uppercase tracking-wider bg-white/80 backdrop-blur px-2 py-1 md:py-0.5 rounded shadow-sm ring-1 ring-black/5">{event.timeStr}</span>
                                            </div>
                                            <h4 className="font-bold text-base md:text-sm leading-tight mb-1">{event.title}</h4>
                                            <div className="flex items-center gap-1.5 text-sm md:text-xs opacity-80">
                                                <Users size={14} className="md:w-3 md:h-3" />
                                                <span>{event.subTitle}</span>
                                            </div>
                                            {event.type === 'workshop' && (
                                                <div className="mt-3 md:mt-2 pt-2 border-t border-black/5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide">
                                                    {event.meta.slot.bookedCount >= event.meta.slot.capacity ? (
                                                        <span className="text-red-600 flex items-center gap-1"><AlertTriangle size={10} /> Full</span>
                                                    ) : (
                                                        <span className="text-emerald-700 flex items-center gap-1"><Check size={10} /> Open</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
