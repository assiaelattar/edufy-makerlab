import type { StudentProject } from '../types';

const normalizeDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate();
  }
  return null;
};

export const academicYearForDate = (date: Date) => {
  const startYear = date.getMonth() >= 7 ? date.getFullYear() : date.getFullYear() - 1;
  return `${startYear}-${startYear + 1}`;
};

export const currentAcademicYear = () => academicYearForDate(new Date());

export const previousAcademicYear = () => {
  const [start] = currentAcademicYear().split('-').map(Number);
  return `${start - 1}-${start}`;
};

export const normalizeAcademicYear = (value?: string) => {
  if (!value) return null;
  const years = value.match(/\d{4}/g);
  if (years && years.length >= 2) return `${years[0]}-${years[1]}`;
  if (years?.length === 1) {
    const startYear = Number(years[0]);
    return `${startYear}-${startYear + 1}`;
  }
  return value.trim();
};

export const projectAcademicYear = (project: StudentProject) => {
  const explicitYear = project.academicYearId || project.academicYear || project.schoolYear || project.session;
  if (explicitYear) return normalizeAcademicYear(explicitYear) || explicitYear;
  const date = normalizeDate(project.publishedAt) || normalizeDate(project.updatedAt) || normalizeDate(project.createdAt);
  return date ? academicYearForDate(date) : 'Unknown year';
};

export const projectDate = (project: StudentProject) =>
  normalizeDate(project.publishedAt) || normalizeDate(project.updatedAt) || normalizeDate(project.createdAt);
