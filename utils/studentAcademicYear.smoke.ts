import assert from 'node:assert/strict';
import type { Enrollment, Program, Student } from '../types';
import { enrollmentInAcademicYear, studentActiveOnDate } from './studentAcademicYear';

const enrollment = {
  id: 'a', studentId: 's', programId: 'p', programName: 'STEMQuest', status: 'active',
  startDate: '2025-10-01', serviceEndDate: '2026-09-30', session: '2025-2026'
} as Enrollment;
const program = { id: 'p', name: 'STEMQuest', enrollmentPolicy: { mode: 'rolling_membership', membershipDurationMonths: 12 } } as Program;
assert.equal(enrollmentInAcademicYear(enrollment, program, '2025-2026'), true);
assert.equal(enrollmentInAcademicYear(enrollment, program, '2026-2027'), true, 'rolling membership may overlap the next school year');
assert.equal(enrollmentInAcademicYear(enrollment, program, '2027-2028'), false, 'old subscriptions stay out of current totals');
const student = { status: 'inactive', inactiveAt: '2026-10-29' } as Student;
assert.equal(studentActiveOnDate(student, '2026-05-14'), true, 'historic attendance is reviewable');
assert.equal(studentActiveOnDate(student, '2026-10-29'), false, 'paused learner leaves current roster');
