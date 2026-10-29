import assert from 'node:assert/strict';
import { findPaymentReminder } from './paymentReminder';

const enrollment = [{ id: 'e', status: 'active', programName: 'STEMQuest', balance: 500, paymentPromises: [{ month: '2026-10', amount: 500 }, { month: '2026-11', amount: 500 }] }];
const payments = [{ enrollmentId: 'e', status: 'verified', amount: 500, method: 'virement', date: '2026-10-03' }];
const rules = { enabled: true, leadDays: [3, 7], dueDayOfMonth: 5 };
assert.equal(findPaymentReminder(enrollment, payments, rules, '2026-10-29')?.dueDate, '2026-11-05');
assert.equal(findPaymentReminder(enrollment, payments, rules, '2026-10-29')?.usualMethod, 'virement');
assert.equal(findPaymentReminder(enrollment, payments, rules, '2026-10-28'), null, 'outside configured window');
assert.equal(findPaymentReminder(enrollment, payments, { ...rules, enabled: false }, '2026-10-29'), null, 'tenant opt in required');
assert.equal(findPaymentReminder([{ ...enrollment[0], balance: 0 }], payments, rules, '2026-10-29'), null, 'settled balance has no reminder');
assert.equal(findPaymentReminder([{ id: 'monthly', status: 'active', programName: 'Maker', balance: 250, paymentPlan: 'monthly', startDate: '2026-10-05' }], [], rules, '2026-10-29')?.dueDate, '2026-11-05', 'monthly plan has a due date when no explicit promise exists');
