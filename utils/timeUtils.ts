
/**
 * Time utility functions for staff attendance and overtime calculations.
 */

/**
 * Converts HH:mm string to minutes from start of day.
 */
export const timeToMinutes = (time?: string): number => {
    if (!time) return 0;
    const [hrs, mins] = time.split(':').map(Number);
    return (hrs * 60) + (mins || 0);
};

/**
 * Converts minutes to HH:mm string.
 */
export const minutesToTime = (totalMinutes: number): string => {
    const hrs = Math.floor(Math.abs(totalMinutes) / 60);
    const mins = Math.abs(totalMinutes) % 60;
    const sign = totalMinutes < 0 ? '-' : '';
    return `${sign}${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Calculates duration in minutes between two time strings.
 */
export const calculateDuration = (start?: string, end?: string): number => {
    if (!start || !end) return 0;
    const startMins = timeToMinutes(start);
    const endMins = timeToMinutes(end);
    return Math.max(0, endMins - startMins);
};

/**
 * Formats duration for display (e.g., "8h 30m").
 */
export const formatDuration = (totalMinutes: number): string => {
    const isNegative = totalMinutes < 0;
    const absMins = Math.abs(totalMinutes);
    const hrs = Math.floor(absMins / 60);
    const mins = absMins % 60;
    
    if (hrs === 0) return `${isNegative ? '-' : ''}${mins}m`;
    return `${isNegative ? '-' : ''}${hrs}h ${mins > 0 ? `${mins}m` : ''}`;
};
