import type { Group, ProgramPack } from '../types';

export const weeklySessionCount = (pack?: ProgramPack) => {
    const count = Number(pack?.workshopsPerWeek);
    if (Number.isInteger(count) && count > 0) return count;
    // Older Innovator records predate workshopsPerWeek.
    return /\binnovator\b/i.test(pack?.name || '') ? 2 : 1;
};

const weekdays: Record<string, string> = { monday: 'Lundi', tuesday: 'Mardi', wednesday: 'Mercredi', thursday: 'Jeudi', friday: 'Vendredi', saturday: 'Samedi', sunday: 'Dimanche' };
export const frenchWeekday = (day: string) => weekdays[day.trim().toLowerCase()] || day;
const blocks = (group: Group) => group.scheduleBlocks?.length
    ? group.scheduleBlocks.map(block => ({ day: block.day.trim().toLowerCase(), start: block.startTime, end: block.endTime }))
    : [{ day: group.day.trim().toLowerCase(), start: group.time, end: '' }];
export const groupScheduleLabel = (group: Group) => blocks(group).map(block => `${frenchWeekday(block.day)} · ${block.start}${block.end ? `–${block.end}` : ''}`).join(' / ');
const minutes = (time: string) => { const [hours, mins] = time.split(':').map(Number); return hours * 60 + mins; };
export const groupsOverlap = (first: Group, second: Group) => first.id === second.id || blocks(first).some(a => blocks(second).some(b => {
    if (frenchWeekday(a.day).toLowerCase() !== frenchWeekday(b.day).toLowerCase()) return false;
    if (!a.end || !b.end) return a.start === b.start;
    return minutes(a.start) < minutes(b.end) && minutes(b.start) < minutes(a.end);
}));
