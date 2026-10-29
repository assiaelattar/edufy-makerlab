export interface ReminderRules {
  enabled: boolean;
  leadDays: number[];
  dueDayOfMonth: number;
}

export interface ReminderEnrollment {
  id: string;
  programName?: string;
  status?: string;
  balance?: number;
  paymentPromises?: Array<{ month: string; amount: number }>;
  paymentPlan?: string;
  startDate?: string;
}

export interface ReminderPayment {
  enrollmentId?: string;
  amount?: number;
  status?: string;
  method?: string;
  date?: string;
}

export interface PaymentReminder {
  enrollmentId: string;
  programName: string;
  dueDate: string;
  dueAmount: number;
  amountIsBalance?: boolean;
  daysUntil: number;
  usualMethod?: string;
}

const dayNumber = (date: string) => Math.floor(Date.parse(`${date}T00:00:00.000Z`) / 86_400_000);

export const findPaymentReminder = (
  enrollments: ReminderEnrollment[],
  payments: ReminderPayment[],
  rules: ReminderRules | undefined,
  today: string
): PaymentReminder | null => {
  if (!rules?.enabled || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return null;
  const leadDays = (rules.leadDays || []).filter(day => Number.isInteger(day) && day >= 1 && day <= 30);
  if (leadDays.length === 0) return null;
  const dueDay = Math.min(28, Math.max(1, Math.trunc(rules.dueDayOfMonth || 1)));
  const candidates: PaymentReminder[] = [];
  for (const enrollment of enrollments) {
    if (enrollment.status !== 'active' || Number(enrollment.balance || 0) <= 0) continue;
    const schedule = [...(enrollment.paymentPromises || [])]
      .filter(promise => /^\d{4}-(0[1-9]|1[0-2])$/.test(promise.month) && Number(promise.amount) > 0)
      .sort((a, b) => a.month.localeCompare(b.month));
    const related = payments.filter(payment => payment.enrollmentId === enrollment.id);
    const clearedPayments = related.filter(payment => ['paid', 'verified'].includes(payment.status || ''));
    const cleared = clearedPayments
      .reduce((sum, payment) => sum + Math.max(0, Number(payment.amount || 0)), 0);
    const latestMethod = [...related].filter(payment => payment.method).sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0]?.method;
    if (!schedule.length) {
      const interval = enrollment.paymentPlan === 'monthly' ? 1 : enrollment.paymentPlan === 'trimester' ? 3 : enrollment.paymentPlan === 'semestre' ? 6 : 0;
      const base = [...clearedPayments].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0]?.date || enrollment.startDate;
      if (!interval || !base || !/^\d{4}-\d{2}-\d{2}/.test(base)) continue;
      const baseDate = new Date(`${base.slice(0, 10)}T00:00:00.000Z`);
      if (Number.isNaN(baseDate.getTime())) continue;
      const originalDay = baseDate.getUTCDate();
      baseDate.setUTCDate(1);
      baseDate.setUTCMonth(baseDate.getUTCMonth() + interval);
      const lastDay = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth() + 1, 0)).getUTCDate();
      baseDate.setUTCDate(Math.min(originalDay, lastDay));
      const dueDate = baseDate.toISOString().slice(0, 10);
      const daysUntil = dayNumber(dueDate) - dayNumber(today);
      if (daysUntil <= Math.max(...leadDays) && daysUntil >= -60) candidates.push({
        enrollmentId: enrollment.id, programName: enrollment.programName || 'Programme MakerLab',
        dueDate, dueAmount: Number(enrollment.balance), amountIsBalance: true, daysUntil, usualMethod: latestMethod
      });
      continue;
    }
    let cumulative = 0;
    for (const promise of schedule) {
      cumulative += Number(promise.amount);
      if (cumulative <= cleared + 0.005) continue;
      const dueDate = `${promise.month}-${String(dueDay).padStart(2, '0')}`;
      const daysUntil = dayNumber(dueDate) - dayNumber(today);
      if (daysUntil > Math.max(...leadDays) || daysUntil < -60) break;
      candidates.push({
        enrollmentId: enrollment.id,
        programName: enrollment.programName || 'Programme MakerLab',
        dueDate,
        dueAmount: Math.min(Number(enrollment.balance), cumulative - cleared),
        daysUntil,
        usualMethod: latestMethod
      });
      break;
    }
  }
  return candidates.sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] || null;
};
