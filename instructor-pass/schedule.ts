import { addDays, format, getDay, startOfWeek } from 'date-fns';
import type { ClassSession, Program, WorkshopSlot, WorkshopTemplate } from '../types';
import { getProgramOperationalState } from '../utils/programLifecycle';

export interface PassSession {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  detail: string;
  location: string;
  source: 'group' | 'template' | 'slot' | 'session';
  kind: 'program' | 'workshop';
}

const DAY_NAMES = [
  ['Sunday', 'Dimanche'], ['Monday', 'Lundi'], ['Tuesday', 'Mardi'],
  ['Wednesday', 'Mercredi'], ['Thursday', 'Jeudi'], ['Friday', 'Vendredi'], ['Saturday', 'Samedi'],
];

const dayIndex = (day: string): number => DAY_NAMES.findIndex(names => names.some(name => name.toLowerCase() === day.trim().toLowerCase()));

const addMinutes = (time: string, minutes: number): string => {
  const [hours, remaining] = time.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(remaining)) return time;
  const total = hours * 60 + remaining + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

export function projectInstructorWeek(programs: Program[], sessions: ClassSession[], organizationId: string, instructorId: string, anchor: Date, templates: WorkshopTemplate[] = [], slots: WorkshopSlot[] = []): PassSession[] {
  if (!organizationId || !instructorId) return [];
  const firstDay = startOfWeek(anchor, { weekStartsOn: 1 });
  const dates = Array.from({ length: 7 }, (_, index) => addDays(firstDay, index));
  const dateKeys = new Set(dates.map(date => format(date, 'yyyy-MM-dd')));
  const tenantSessions = sessions.filter(session => session.organizationId === organizationId && dateKeys.has(session.date));
  const result: PassSession[] = tenantSessions
    .filter(session => session.instructorId === instructorId && session.status !== 'cancelled')
    .map(session => ({
      id: session.id,
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      title: session.title,
      detail: session.subTitle || (session.type === 'workshop_trial' ? 'Atelier' : 'Groupe'),
      location: '',
      source: 'session',
      kind: session.type === 'workshop_trial' ? 'workshop' : 'program',
    }));

  for (const program of programs) {
    if (program.organizationId !== organizationId) continue;
    for (const grade of program.grades || []) {
      for (const group of grade.groups || []) {
        if (group.instructorId !== instructorId) continue;
        const blocks = group.scheduleBlocks?.length
          ? group.scheduleBlocks
          : [{ id: 'legacy', day: group.day, startTime: group.time, endTime: addMinutes(group.time, 60) }];
        for (const block of blocks) {
          const index = dayIndex(block.day);
          if (index < 0) continue;
          const date = dates.find(candidate => getDay(candidate) === index);
          if (!date) continue;
          const dateKey = format(date, 'yyyy-MM-dd');
          if (!['running', 'evergreen'].includes(getProgramOperationalState(program, dateKey))) continue;
          // A materialized occurrence wins, including an explicit reassignment or removal.
          if (tenantSessions.some(session => session.groupId === group.id && session.date === dateKey && session.startTime === block.startTime && (session.instructorId || session.status === 'cancelled'))) continue;
          result.push({
            id: `group:${program.id}:${grade.id}:${group.id}:${block.id}:${dateKey}`,
            date: dateKey,
            startTime: block.startTime,
            endTime: block.endTime,
            title: program.name,
            detail: `${grade.name} · ${group.name}`,
            location: program.runSetup?.locationName || '',
            source: 'group',
            kind: 'program',
          });
        }
      }
    }
  }
  for (const template of templates) {
    if (template.organizationId !== organizationId || !template.instructorId || template.isActive === false) continue;
    const startTime = template.recurrencePattern?.time;
    if (!startTime) continue;
    for (const date of dates) {
      const dateKey = format(date, 'yyyy-MM-dd');
      const matchesDate = template.recurrenceType === 'one-time'
        ? template.recurrencePattern.date === dateKey
        : template.recurrenceType === 'weekly' && (template.recurrencePattern.days || []).includes(getDay(date));
      if (!matchesDate) continue;
      // A real dated slot owns this occurrence even if its time differs from the current template.
      if (slots.some(item => item.organizationId === organizationId && item.workshopTemplateId === template.id && item.date === dateKey)) continue;
      if (template.instructorId !== instructorId) continue;
      if (tenantSessions.some(session => session.date === dateKey && session.startTime === startTime && (session.instructorId || session.status === 'cancelled') && (
        session.workshopTemplateId === template.id
      ))) continue;
      result.push({
        id: `workshop:${template.id}:${dateKey}:${startTime}`,
        date: dateKey,
        startTime,
        endTime: addMinutes(startTime, template.duration),
        title: template.title,
        detail: 'Atelier · affectation par défaut',
        location: '',
        source: 'template',
        kind: 'workshop',
      });
    }
  }
  for (const slot of slots) {
    if (slot.organizationId !== organizationId || slot.instructorId !== instructorId || slot.status === 'cancelled' || !dateKeys.has(slot.date)) continue;
    const template = templates.find(item => item.organizationId === organizationId && item.id === slot.workshopTemplateId);
    if (tenantSessions.some(session => (session.workshopSlotId === slot.id || (session.workshopTemplateId === slot.workshopTemplateId && session.date === slot.date && session.startTime === slot.startTime)) && (session.instructorId || session.status === 'cancelled'))) continue;
    result.push({
      id: `slot:${slot.id}`,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      title: slot.title || template?.title || 'Atelier d’essai',
      detail: 'Atelier · séance affectée',
      location: slot.location || '',
      source: 'slot',
      kind: 'workshop',
    });
  }
  return result.sort((left, right) => left.date.localeCompare(right.date) || left.startTime.localeCompare(right.startTime));
}
