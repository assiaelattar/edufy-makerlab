import type { Booking, Enrollment, Lead, Student } from '../../../types';
import type { LinkedBookingEvidence, LinkedEnrollmentEvidence, LinkedStudentEvidence } from './admissionTypes';

export const timestamp = (iso: string) => ({ toDate: () => new Date(iso) }) as Lead['createdAt'];

export const makeLead = (overrides: Partial<Lead> = {}): Lead => ({
  id: 'lead-1',
  organizationId: 'org-1',
  name: 'Learner One',
  parentName: 'Parent One',
  phone: '+212 600 000 001',
  email: 'parent@example.com',
  source: 'Website',
  status: 'new',
  createdAt: timestamp('2026-09-01T09:00:00.000Z'),
  ...overrides,
});

export const makeBooking = (overrides: Partial<LinkedBookingEvidence> = {}): LinkedBookingEvidence => ({
  id: 'booking-1',
  organizationId: 'org-1',
  workshopSlotId: 'slot-1',
  workshopTemplateId: 'template-1',
  parentName: 'Parent One',
  phoneNumber: '+212 600 000 001',
  kidName: 'Learner One',
  kidAge: 9,
  status: 'confirmed',
  bookedAt: timestamp('2026-09-02T10:00:00.000Z') as Booking['bookedAt'],
  ...overrides,
});

export const makeStudent = (overrides: Partial<LinkedStudentEvidence> = {}): LinkedStudentEvidence => ({
  id: 'student-1',
  organizationId: 'org-1',
  name: 'Learner One',
  parentName: 'Parent One',
  parentPhone: '+212 600 000 001',
  status: 'active',
  createdAt: timestamp('2026-09-03T10:00:00.000Z') as Student['createdAt'],
  ...overrides,
});

export const makeEnrollment = (overrides: Partial<LinkedEnrollmentEvidence> = {}): LinkedEnrollmentEvidence => ({
  id: 'enrollment-1',
  organizationId: 'org-1',
  studentId: 'student-1',
  studentName: 'Learner One',
  programId: 'program-1',
  programName: 'Make & Go',
  packName: 'Annual',
  paymentPlan: 'annual',
  totalAmount: 4800,
  paidAmount: 0,
  balance: 4800,
  status: 'active',
  startDate: '2026-09-03',
  createdAt: timestamp('2026-09-03T10:00:00.000Z') as Enrollment['createdAt'],
  ...overrides,
});
