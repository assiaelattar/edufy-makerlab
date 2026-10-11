import type { PickupStatus } from '../../modules/pickup/domain/pickupLifecycle';

export type FamilySourceStatus = 'ready' | 'unavailable' | 'error';

export interface FamilyFinanceSummary {
  agreed: number;
  paid: number;
  balance: number;
  currency: 'MAD';
  enrollmentCount: number;
  paymentCount: number;
  pendingPaymentCount: number;
  latestPaymentDate: string | null;
}

export interface FamilyAttendanceSummary {
  total: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  latestDate: string | null;
  latestStatus: 'present' | 'absent' | 'late' | 'excused' | null;
}

export interface FamilyPickupSummary {
  status: PickupStatus | null;
  sessionDate: string;
  pickerName: string | null;
  isPreviousDay: boolean;
  initiatedByCurrentGuardian: boolean | null;
}

export type FamilySource<T> =
  | { status: 'ready'; data: T }
  | { status: 'unavailable'; reason: string }
  | { status: 'error'; reason: string };

export interface FamilyOperations {
  finance: FamilySource<FamilyFinanceSummary>;
  attendance: FamilySource<FamilyAttendanceSummary>;
  pickup: FamilySource<FamilyPickupSummary>;
}

export interface EnrollmentSummaryInput {
  id: string;
  totalAmount?: number;
  paidAmount?: number;
  balance?: number;
  status?: string;
}

export interface PaymentSummaryInput {
  amount?: number;
  date?: string;
  status?: string;
}

export interface AttendanceSummaryInput {
  date?: string;
  status?: string;
}

const money = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : 0;

export const summarizeFinance = (
  enrollments: EnrollmentSummaryInput[], payments: PaymentSummaryInput[]
): FamilyFinanceSummary => {
  const active = enrollments.filter(enrollment => enrollment.status !== 'dropped');
  const latestPaymentDate = payments.map(payment => payment.date || '').filter(Boolean).sort().at(-1) || null;
  return {
    agreed: active.reduce((sum, enrollment) => sum + money(enrollment.totalAmount), 0),
    paid: active.reduce((sum, enrollment) => sum + money(enrollment.paidAmount), 0),
    balance: active.reduce((sum, enrollment) => sum + money(enrollment.balance), 0),
    currency: 'MAD',
    enrollmentCount: active.length,
    paymentCount: payments.length,
    pendingPaymentCount: payments.filter(payment => payment.status === 'pending_verification' || payment.status === 'check_received').length,
    latestPaymentDate
  };
};

const attendanceStatuses = new Set(['present', 'absent', 'late', 'excused']);

export const summarizeAttendance = (records: AttendanceSummaryInput[]): FamilyAttendanceSummary => {
  const valid = records.filter(record => attendanceStatuses.has(record.status || ''))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const count = (status: string) => valid.filter(record => record.status === status).length;
  return {
    total: valid.length,
    present: count('present'),
    late: count('late'),
    absent: count('absent'),
    excused: count('excused'),
    latestDate: valid[0]?.date || null,
    latestStatus: (valid[0]?.status as FamilyAttendanceSummary['latestStatus']) || null
  };
};

export const unavailableOperations = (): FamilyOperations => ({
  finance: { status: 'unavailable', reason: 'Payment access is not enabled for this learner.' },
  attendance: { status: 'unavailable', reason: 'Attendance access is not enabled for this learner.' },
  pickup: { status: 'unavailable', reason: 'Pickup access is not enabled for this learner.' }
});
