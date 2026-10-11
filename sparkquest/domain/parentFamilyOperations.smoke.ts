import assert from 'node:assert/strict';
import { summarizeAttendance, summarizeFinance } from './parentFamilyOperations.ts';

assert.deepEqual(summarizeFinance([
  { id: 'active', totalAmount: 3200, paidAmount: 2000, balance: 1200, status: 'active' },
  { id: 'dropped', totalAmount: 800, paidAmount: 0, balance: 800, status: 'dropped' }
], [
  { amount: 1000, date: '2026-09-01', status: 'verified' },
  { amount: 1000, date: '2026-10-01', status: 'pending_verification' }
]), {
  agreed: 3200, paid: 2000, balance: 1200, currency: 'MAD', enrollmentCount: 1,
  paymentCount: 2, pendingPaymentCount: 1, latestPaymentDate: '2026-10-01',
  enrollments: [{ id: 'active', programName: 'MakerLab program', packName: '', session: '', status: 'active', agreed: 3200, paid: 2000, balance: 1200 }],
  payments: [
    { id: '', enrollmentId: '', date: '2026-10-01', amount: 1000, status: 'pending_verification', method: '' },
    { id: '', enrollmentId: '', date: '2026-09-01', amount: 1000, status: 'verified', method: '' }
  ]
});

assert.deepEqual(summarizeAttendance([
  { date: '2026-10-08', status: 'present' },
  { date: '2026-10-10', status: 'late' },
  { date: '2026-10-09', status: 'excused' },
  { date: '2026-10-07', status: 'unknown' }
]), {
  total: 3, present: 1, late: 1, absent: 0, excused: 1,
  latestDate: '2026-10-10', latestStatus: 'late',
  records: [
    { date: '2026-10-10', status: 'late', enrollmentId: '' },
    { date: '2026-10-09', status: 'excused', enrollmentId: '' },
    { date: '2026-10-08', status: 'present', enrollmentId: '' }
  ]
});

console.log('parent family operations: 2 summaries passed');
