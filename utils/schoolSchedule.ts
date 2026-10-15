const weekdays = [
  ['sunday', 'dimanche'],
  ['monday', 'lundi'],
  ['tuesday', 'mardi'],
  ['wednesday', 'mercredi'],
  ['thursday', 'jeudi'],
  ['friday', 'vendredi'],
  ['saturday', 'samedi'],
];

export const getSchoolWeekdayIndex = (value?: string): number => {
  const day = value?.trim().toLowerCase();
  return day ? weekdays.findIndex(aliases => aliases.includes(day)) : -1;
};

export const getScheduledSlotForWeekday = (schedule: string | undefined, dayIndex: number): string | null => {
  if (!schedule || dayIndex < 0 || dayIndex > 6) return null;
  const dayMatch = [...schedule.matchAll(/\b(sunday|dimanche|monday|lundi|tuesday|mardi|wednesday|mercredi|thursday|jeudi|friday|vendredi|saturday|samedi)\b/gi)]
    .find(match => getSchoolWeekdayIndex(match[0]) === dayIndex);
  if (!dayMatch) return null;
  return schedule.replace(dayMatch[0], '').trim();
};
