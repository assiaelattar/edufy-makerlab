import type { Enrollment, Program, Student } from '../types';
import { academicYearForDate, normalizeAcademicYear } from './academicYear';
import { resolveEnrollmentCoverage } from './membershipLifecycle';

export const academicYearBounds = (year: string) => {
  const start = Number(normalizeAcademicYear(year)?.slice(0, 4));
  if (!Number.isInteger(start)) return null;
  return { start: `${start}-09-01`, end: `${start + 1}-08-31` };
};

export const enrollmentInAcademicYear = (enrollment: Enrollment, program: Program | undefined, year: string) => {
  const bounds = academicYearBounds(year);
  if (!bounds) return false;
  const coverage = resolveEnrollmentCoverage(enrollment, program);
  if (coverage.startDate || coverage.endDate) {
    return (!coverage.startDate || coverage.startDate <= bounds.end)
      && (!coverage.endDate || coverage.endDate >= bounds.start);
  }
  const session = normalizeAcademicYear(enrollment.session);
  if (session) return session === year;
  const createdAt = enrollment.createdAt as any;
  const createdDate = createdAt?.toDate?.() || (createdAt ? new Date(createdAt) : null);
  return createdDate instanceof Date && !Number.isNaN(createdDate.getTime())
    ? academicYearForDate(createdDate) === year
    : false;
};

export const studentActiveOnDate = (student: Student, date: string) =>
  student.status !== 'inactive' || Boolean(student.inactiveAt && date.slice(0, 10) < student.inactiveAt.slice(0, 10));
