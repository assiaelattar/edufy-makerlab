export interface TimedWorkshop { date: string; startTime: string; endTime: string | null; timezone: string }
export function workshopPickupSignal(workshop: TimedWorkshop, now = new Date()): 'proof' | 'pickup' | null {
  if (!workshop.endTime || !/^([01]\d|2[0-3]):[0-5]\d$/.test(workshop.endTime)) return null;
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: workshop.timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
    const part = (key: string) => parts.find(p => p.type === key)?.value || '';
    if (`${part('year')}-${part('month')}-${part('day')}` !== workshop.date) return null;
    const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
    const current = Number(part('hour')) * 60 + Number(part('minute'));
    const end = minutes(workshop.endTime);
    if (end <= minutes(workshop.startTime) || current < minutes(workshop.startTime)) return null;
    if (current >= end && current < end + 15) return 'pickup';
    return current >= end - 10 && current < end ? 'proof' : null;
  } catch { return null; }
}
