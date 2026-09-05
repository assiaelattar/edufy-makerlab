import type { WorkshopTemplate } from '../types';

export const WORKSHOP_WEEKDAYS = [
  { value: 1, shortLabel: 'Mon', label: 'Monday' },
  { value: 2, shortLabel: 'Tue', label: 'Tuesday' },
  { value: 3, shortLabel: 'Wed', label: 'Wednesday' },
  { value: 4, shortLabel: 'Thu', label: 'Thursday' },
  { value: 5, shortLabel: 'Fri', label: 'Friday' },
  { value: 6, shortLabel: 'Sat', label: 'Saturday' },
  { value: 0, shortLabel: 'Sun', label: 'Sunday' },
] as const;

const weekdayOrder = new Map<number, number>(WORKSHOP_WEEKDAYS.map((day, index) => [day.value, index]));

export const normalizeWorkshopDays = (days: unknown): number[] => {
  if (!Array.isArray(days)) return [];

  return Array.from(new Set(
    days
      .map(day => Number(day))
      .filter(day => Number.isInteger(day) && day >= 0 && day <= 6)
  )).sort((left, right) => (weekdayOrder.get(left) ?? 7) - (weekdayOrder.get(right) ?? 7));
};

export const toLocalDateKey = (date: Date): string => (
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
);

export const parseLocalDateKey = (dateKey: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, monthIndex, day, 12, 0, 0, 0);

  if (date.getFullYear() !== year || date.getMonth() !== monthIndex || date.getDate() !== day) return null;
  return date;
};

export const formatWorkshopDate = (
  dateKey: string,
  options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  locale = 'en-GB'
): string => {
  const date = parseLocalDateKey(dateKey);
  return date ? new Intl.DateTimeFormat(locale, options).format(date) : '-';
};

export const getWorkshopDayName = (dateKey: string, locale = 'en-GB'): string => (
  formatWorkshopDate(dateKey, { weekday: 'long' }, locale)
);

export const getWorkshopScheduleLabel = (template: Pick<WorkshopTemplate, 'recurrenceType' | 'recurrencePattern'>): string => {
  const time = template.recurrencePattern?.time || 'time to be confirmed';

  if (template.recurrenceType === 'weekly') {
    const selectedDays = normalizeWorkshopDays(template.recurrencePattern?.days);
    const labels = selectedDays
      .map(dayValue => WORKSHOP_WEEKDAYS.find(day => day.value === dayValue)?.label)
      .filter((label): label is string => Boolean(label));

    return labels.length > 0 ? `Every ${labels.join(', ')} at ${time}` : `Weekly at ${time}`;
  }

  const date = template.recurrencePattern?.date
    ? formatWorkshopDate(template.recurrencePattern.date)
    : 'Date to be confirmed';
  return `${date} at ${time}`;
};

export const getWorkshopBookingUrl = (slug: string, origin?: string): string => {
  const baseOrigin = (origin || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '');
  return `${baseOrigin}/w/${encodeURIComponent(slug)}`;
};

export const getWorkshopOgImageUrl = (imageUrl?: string, origin?: string): string => {
  const suppliedImage = imageUrl?.trim();
  if (suppliedImage) return suppliedImage;

  const baseOrigin = (origin || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '');
  return `${baseOrigin}/images/makerlab-tello-python-hero-v1.png`;
};

export const buildWorkshopWhatsAppMessage = (
  template: Pick<WorkshopTemplate, 'title' | 'description' | 'duration' | 'capacityPerSlot' | 'recurrenceType' | 'recurrencePattern'>,
  bookingUrl: string
): string => {
  const description = template.description.trim().replace(/\s+/g, ' ');
  const conciseDescription = description.length > 240 ? `${description.slice(0, 237).trimEnd()}...` : description;

  return [
    `*You're invited: ${template.title}*`,
    conciseDescription,
    `📅 ${getWorkshopScheduleLabel(template)}`,
    `⏱️ ${template.duration} minutes · ${template.capacityPerSlot} places`,
    'Choose a date and reserve your place:',
    bookingUrl,
  ].filter(Boolean).join('\n\n');
};
