
import React, { useState, useMemo, useEffect } from 'react';
import {
    CreditCard, Search, Eye, Printer, Filter, TrendingUp, Clock, DollarSign,
    FileText, Building, Calendar, PieChart, AlertCircle, CheckCircle2, Users,
    ArrowRight, Phone, BarChart2, Download, MessageCircle, ChevronDown, ChevronUp, Wrench, ShieldCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, generateReceipt } from '../utils/helpers';
import { Enrollment, Payment } from '../types';
import { db } from '../services/firebase';
import { doc, writeBatch } from 'firebase/firestore';

// --- Upcoming Payment Helper ---
function computeNextPaymentDate(
    enrollment: Enrollment,
    paymentsForEnrollment: Payment[]
): { dueDate: Date | null; urgency: 'overdue' | 'this_week' | 'this_month' | 'future' | 'paid' } {
    if ((enrollment.balance || 0) <= 0) return { dueDate: null, urgency: 'paid' };
    if (!['monthly', 'trimester', 'semestre'].includes(enrollment.paymentPlan)) {
        return { dueDate: null, urgency: 'future' };
    }

    const intervalMonths = enrollment.paymentPlan === 'monthly' ? 1
        : enrollment.paymentPlan === 'trimester' ? 3
        : 6;

    const clearedPayments = paymentsForEnrollment
        .filter(p => ['paid', 'verified'].includes(p.status))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let baseDate: Date;
    if (clearedPayments.length > 0) {
        baseDate = new Date(clearedPayments[0].date);
    } else {
        baseDate = new Date(enrollment.startDate || enrollment.createdAt?.toDate?.() || new Date());
    }

    const nextDue = new Date(baseDate);
    nextDue.setMonth(nextDue.getMonth() + intervalMonths);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let urgency: 'overdue' | 'this_week' | 'this_month' | 'future' = 'future';
    if (diffDays < 0) urgency = 'overdue';
    else if (diffDays <= 7) urgency = 'this_week';
    else if (diffDays <= 30) urgency = 'this_month';

    return { dueDate: nextDue, urgency };
}

// --- Main Component ---
// Determines the correct academic session for a given date.
// Academic year: Sept 1 of year Y -> June 30 of year Y+1 = 'Y-(Y+1)'
export const computeAcademicYear = (d: Date = new Date()): string => {
    const m = d.getMonth() + 1; // 1-12
    const y = d.getFullYear();
    return m >= 9 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
};

export const FinanceView = ({ onRecordPayment }: { onRecordPayment: (studentId?: string) => void }) => {
    const { payments, enrollments, students, programs, navigateTo, settings, viewParams } = useAppContext();
    const { can } = useAuth();    // --- State ---
    const [viewMode, setViewMode] = useState<'transactions' | 'balances' | 'upcoming'>('balances');
    const [searchQuery, setSearchQuery] = useState('');
    // Default to the academically correct year (Sept 1 - June 30 rule)
    const [selectedSession, setSelectedSession] = useState(() => computeAcademicYear());
    const [selectedMonth, setSelectedMonth] = useState(''); // YYYY-MM, empty = all months
    const [selectedProgram, setSelectedProgram] = useState('All');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [balanceFilter, setBalanceFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
    const [transactionStatusFilter, setTransactionStatusFilter] = useState<string>('all');
    const [filterAudience, setFilterAudience] = useState<'all' | 'kids' | 'adults'>('all');
    const [showMonthlyChart, setShowMonthlyChart] = useState(true);
    const [isFixingSession, setIsFixingSession] = useState(false);
    const [fixDone, setFixDone] = useState(false);

    // --- Session Mismatch Detection ---
    // Finds records tagged 2026-2027 but created/dated before Sept 1, 2026
    // (i.e., they should be 2025-2026 — created while admin had wrong year in settings)
    const SESSION_CUTOFF = new Date('2026-09-01T00:00:00Z');
    const sessionMismatch = useMemo(() => {
        if (fixDone) return { enrollments: [], payments: [], total: 0 };

        const getDateSafe = (d: any): Date => {
            if (!d) return new Date();
            if (typeof d === 'object' && typeof d.toDate === 'function') return d.toDate();
            return new Date(d);
        };

        const badEnrollments = enrollments.filter(e => {
            if (e.session !== '2026-2027') return false;
            const created = getDateSafe(e.createdAt);
            return created < SESSION_CUTOFF;
        });

        const badPayments = payments.filter(p => {
            if (p.session !== '2026-2027') return false;
            // Use payment date as the authoritative source
            const pDate = new Date(p.date || 0);
            return pDate < SESSION_CUTOFF;
        });

        return {
            enrollments: badEnrollments,
            payments: badPayments,
            total: badEnrollments.length + badPayments.length
        };
    }, [enrollments, payments, fixDone]);

    const fixSessionData = async () => {
        if (!db || sessionMismatch.total === 0) return;
        setIsFixingSession(true);
        try {
            // Firestore writeBatch allows up to 500 ops per batch
            const BATCH_SIZE = 490;
            const allOps = [
                ...sessionMismatch.enrollments.map(e => ({ col: 'enrollments', id: e.id })),
                ...sessionMismatch.payments.map(p => ({ col: 'payments', id: p.id }))
            ];

            for (let i = 0; i < allOps.length; i += BATCH_SIZE) {
                const batch = writeBatch(db);
                const chunk = allOps.slice(i, i + BATCH_SIZE);
                chunk.forEach(({ col, id }) => {
                    batch.update(doc(db as any, col, id), { session: '2025-2026' });
                });
                await batch.commit();
            }

            setFixDone(true);
            setSelectedSession('2025-2026');
        } catch (err) {
            console.error('Session fix failed:', err);
        } finally {
            setIsFixingSession(false);
        }
    };

    // Initialize from dashboard deep-link params
    useEffect(() => {
        if (viewParams?.filter) {
            setViewMode('transactions');
            setTransactionStatusFilter(viewParams.filter as string);
        }
    }, [viewParams]);

 //  Derived: Available Sessions 
    const availableSessions = useMemo(() => {
        const sessions = new Set<string>();
        if (settings.academicYear) sessions.add(settings.academicYear);
        payments.forEach(p => { if (p.session) sessions.add(p.session); });
        enrollments.forEach(e => { if (e.session) sessions.add(e.session); });
        return Array.from(sessions).sort().reverse();
    }, [payments, enrollments, settings.academicYear]);

 //  Derived: Audience matcher 
    const audienceMatchesProg = (progId: string) => {
        if (filterAudience === 'all') return true;
        const prog = programs.find(p => p.id === progId);
        return filterAudience === 'kids' ? prog?.targetAudience !== 'adults' : prog?.targetAudience === 'adults';
    };

 //  Derived: Filtered Data 
    // --- Derived: Filtered Data ---
    const { filteredPayments, filteredEnrollments } = useMemo(() => {
        const matchesSearch = (text: string) => !searchQuery || text.toLowerCase().includes(searchQuery.toLowerCase());
        // Smart session matching: for payments, fall back to the enrollment's session if payment.session is missing.
        // This handles payments recorded before the session field was standardized.
        const matchesSession = (itemSession?: string, fallbackSession?: string) => {
            const resolved = itemSession || fallbackSession;
            if (!resolved) return selectedSession === settings.academicYear;
            return resolved === selectedSession;
        };
        const matchesProgram = (progId: string) => selectedProgram === 'All' || progId === selectedProgram;

        const pFiltered = payments.filter(p => {
            const enrollment = enrollments.find(e => e.id === p.enrollmentId);
            // selectedMonth overrides the dateRange when set (YYYY-MM)
            const monthStart = selectedMonth ? selectedMonth + '-01' : dateRange.start;
            const monthEnd = selectedMonth ? selectedMonth + '-31' : dateRange.end;
            return matchesSession(p.session, enrollment?.session)
                && matchesSearch(p.studentName + (p.checkNumber || ''))
                && matchesProgram(enrollment?.programId || '')
                && audienceMatchesProg(enrollment?.programId || '')
                && (!monthStart || p.date >= monthStart)
                && (!monthEnd || p.date <= monthEnd)
                && (transactionStatusFilter === 'all' || p.status === transactionStatusFilter);
        });

        const eFiltered = enrollments.filter(e =>
            e.status === 'active'
            && matchesSession(e.session)
            && matchesSearch(e.studentName)
            && matchesProgram(e.programId)
            && audienceMatchesProg(e.programId)
            && (balanceFilter === 'all' || (balanceFilter === 'paid' ? e.balance <= 0 : e.balance > 0))
        );

        return { filteredPayments: pFiltered, filteredEnrollments: eFiltered };
    }, [payments, enrollments, searchQuery, selectedSession, selectedMonth, selectedProgram, dateRange,
        balanceFilter, transactionStatusFilter, settings.academicYear, filterAudience]);

 //  Derived: KPI Stats  always based on filteredPayments for date accuracy 
    const stats = useMemo(() => {
        // Base enrollments for student counts (session-scoped, ignore search/balance filter)
        const baseEnrollments = enrollments.filter(e => {
            const ms = e.session ? e.session === selectedSession : selectedSession === settings.academicYear;
            const mp = selectedProgram === 'All' || e.programId === selectedProgram;
            const ma = audienceMatchesProg(e.programId);
            return e.status === 'active' && ms && mp && ma;
        });

        const totalExpected = baseEnrollments.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
        const totalPaid = baseEnrollments.reduce((sum, e) => sum + (e.paidAmount || 0), 0);
        const totalOutstanding = baseEnrollments.reduce((sum, e) => sum + (e.balance || 0), 0);
        const paidCount = baseEnrollments.filter(e => e.balance <= 0).length;
        const unpaidCount = baseEnrollments.filter(e => e.balance > 0).length;
        const totalStudents = baseEnrollments.length;
        const collectionRate = totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0;

 //  FIX: Realized Revenue now uses filteredPayments (respects date range)
        const realizedRevenue = filteredPayments
            .filter(p => ['paid', 'verified'].includes(p.status))
            .reduce((sum, p) => sum + p.amount, 0);

        return { totalExpected, totalPaid, totalOutstanding, paidCount, unpaidCount, totalStudents, collectionRate, realizedRevenue };
    }, [enrollments, filteredPayments, selectedSession, selectedProgram, settings.academicYear, filterAudience]);

 //  Derived: Monthly Revenue Chart Data 
    // Counts ALL non-bounced payments (cleared + pending/in-transit) to show real activity
    const monthlyChartData = useMemo(() => {
        const sessionPayments = payments.filter(p => {
            const ms = p.session ? p.session === selectedSession : selectedSession === settings.academicYear;
            const enrollment = enrollments.find(e => e.id === p.enrollmentId);
            const mp = selectedProgram === 'All' || enrollment?.programId === selectedProgram;
            const ma = audienceMatchesProg(enrollment?.programId || '');
            // Include everything except bounced cheques
            return ms && mp && ma && p.status !== 'check_bounced';
        });

        const byMonth: Record<string, {
            cleared: number; pending: number; count: number; pendingCount: number; label: string;
        }> = {};

        sessionPayments.forEach(p => {
            const key = p.date.slice(0, 7);
            if (!byMonth[key]) {
                const d = new Date(key + '-01');
                byMonth[key] = {
                    cleared: 0, pending: 0,
                    count: 0, pendingCount: 0,
                    label: d.toLocaleString('default', { month: 'short', year: '2-digit' })
                };
            }
            const isCleared = ['paid', 'verified'].includes(p.status);
            if (isCleared) {
                byMonth[key].cleared += p.amount;
                byMonth[key].count += 1;
            } else {
                byMonth[key].pending += p.amount;
                byMonth[key].pendingCount += 1;
            }
        });

        const entries = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b));
        const maxTotal = Math.max(...entries.map(([, v]) => v.cleared + v.pending), 1);
        const currentMonth = new Date().toISOString().slice(0, 7);

        return entries.map(([key, val]) => ({
            key,
            ...val,
            total: val.cleared + val.pending,
            clearedPct: ((val.cleared) / maxTotal) * 100,
            pendingPct: ((val.pending) / maxTotal) * 100,
            totalPct: ((val.cleared + val.pending) / maxTotal) * 100,
            isCurrent: key === currentMonth,
            isSelected: key === selectedMonth
        }));
    }, [payments, enrollments, selectedSession, selectedProgram, filterAudience, settings.academicYear, selectedMonth]);

 //  Derived: Upcoming Payments 
    const upcomingPayments = useMemo(() => {
        const sessionEnrollments = enrollments.filter(e => {
            const ms = e.session ? e.session === selectedSession : selectedSession === settings.academicYear;
            return e.status === 'active' && ms && (e.balance || 0) > 0
                && ['monthly', 'trimester', 'semestre'].includes(e.paymentPlan);
        });

        return sessionEnrollments
            .map(e => {
                const ePayments = payments.filter(p => p.enrollmentId === e.id);
                const { dueDate, urgency } = computeNextPaymentDate(e, ePayments);
                return { enrollment: e, dueDate, urgency };
            })
            .filter(item => item.urgency !== 'paid' && item.urgency !== 'future' && item.dueDate !== null)
            .sort((a, b) => (a.dueDate!.getTime()) - (b.dueDate!.getTime()));
    }, [enrollments, payments, selectedSession, settings.academicYear]);


    // --- Derived: Monthly Collection Report ---
    // SOURCE: starts from PAYMENTS (same as KPI) so paid totals always match.
    // NOT-PAID SPLIT: separates installment-plan students (who owe this period)
    // from full/annual-plan students (one-time fee &middot; no monthly obligation).
    const monthlyReport = useMemo(() => {
        const empty = { installmentUnpaidRows: [] as any[], annualUnpaidRows: [] as any[], fullyPaidRows: [] as any[], paidRows: [] as any[] };
        if (!selectedMonth) return empty;

        // Session resolver: use enrollment.session as fallback when payment.session is missing
        const resolveSession = (p: Payment) => {
            const enroll = enrollments.find(e => e.id === p.enrollmentId);
            return p.session || enroll?.session;
        };
        const sessionMatch = (s?: string) => {
            if (!s) return selectedSession === settings.academicYear;
            return s === selectedSession;
        };

        // Step 1: All relevant non-bounced payments in the selected month
        const monthPayments = payments.filter(p => {
            const enroll = enrollments.find(e => e.id === p.enrollmentId);
            const mp = selectedProgram === 'All' || enroll?.programId === selectedProgram;
            const ma = audienceMatchesProg(enroll?.programId || '');
            const matchSearch = !searchQuery || (p.studentName || '').toLowerCase().includes(searchQuery.toLowerCase());
            return sessionMatch(resolveSession(p))
                && mp && ma && matchSearch
                && p.date.startsWith(selectedMonth)
                && p.status !== 'check_bounced';
        });

        // Step 2: group payments by enrollmentId -> paid rows
        const paidMap = new Map<string, { enrollment: Enrollment; clearedPayments: Payment[]; pendingPayments: Payment[]; bouncedPayments: Payment[] }>();
        monthPayments.forEach(p => {
            const enroll = enrollments.find(e => e.id === p.enrollmentId);
            if (!enroll) return;
            if (!paidMap.has(p.enrollmentId)) {
                paidMap.set(p.enrollmentId, { enrollment: enroll, clearedPayments: [], pendingPayments: [], bouncedPayments: [] });
            }
            const entry = paidMap.get(p.enrollmentId)!;
            if (['paid', 'verified'].includes(p.status)) entry.clearedPayments.push(p);
            else if (p.status === 'check_bounced') entry.bouncedPayments.push(p);
            else entry.pendingPayments.push(p);
        });

        const paidRows = Array.from(paidMap.values()).map(entry => {
            const clearedAmount = entry.clearedPayments.reduce((s, p) => s + p.amount, 0);
            const pendingAmount = entry.pendingPayments.reduce((s, p) => s + p.amount, 0);
            return { ...entry, clearedAmount, pendingAmount, totalPaidThisMonth: clearedAmount + pendingAmount,
                hasPaid: true as const, hasBalance: (entry.enrollment.balance || 0) > 0 };
        }).sort((a, b) => (a.enrollment.studentName || '').localeCompare(b.enrollment.studentName || ''));

        // Step 3: Active enrollments that did NOT make a payment in this month
        const paidIds = new Set(paidMap.keys());
        const notPaidEnrollments = enrollments.filter(e => {
            const es = e.session || '';  // use enrollment session directly
            const ms = es ? es === selectedSession : selectedSession === settings.academicYear;
            const mp = selectedProgram === 'All' || e.programId === selectedProgram;
            const ma = audienceMatchesProg(e.programId);
            const matchSearch = !searchQuery || (e.studentName || '').toLowerCase().includes(searchQuery.toLowerCase());
            return e.status === 'active' && ms && mp && ma && matchSearch && !paidIds.has(e.id);
        });

        // Installment plans: monthly/trimester/semestre &middot; these students SHOULD pay periodically
        const installmentPlans = ['monthly', 'trimester', 'semestre'];
        const isInstallment = (e: Enrollment) => installmentPlans.includes(e.paymentPlan);

        const emptyP = {
            clearedPayments: [] as Payment[], pendingPayments: [] as Payment[], bouncedPayments: [] as Payment[],
            clearedAmount: 0, pendingAmount: 0, totalPaidThisMonth: 0, hasPaid: false as const
        };

        // 1. Installment students with outstanding balance (missed this period)
        const installmentUnpaidRows = notPaidEnrollments
            .filter(e => isInstallment(e) && (e.balance || 0) > 0)
            .map(e => ({ enrollment: e, ...emptyP, hasBalance: true, isInstallment: true }))
            .sort((a, b) => (a.enrollment.studentName || '').localeCompare(b.enrollment.studentName || ''));

        // 2. Full/annual students with outstanding balance (one-time fee not yet settled)
        const annualUnpaidRows = notPaidEnrollments
            .filter(e => !isInstallment(e) && (e.balance || 0) > 0)
            .map(e => ({ enrollment: e, ...emptyP, hasBalance: true, isInstallment: false }))
            .sort((a, b) => (a.enrollment.studentName || '').localeCompare(b.enrollment.studentName || ''));

        // 3. Fully settled students (balance = 0, no payment needed regardless of plan)
        const fullyPaidRows = notPaidEnrollments
            .filter(e => (e.balance || 0) <= 0)
            .map(e => ({ enrollment: e, ...emptyP, hasBalance: false, isInstallment: isInstallment(e) }))
            .sort((a, b) => (a.enrollment.studentName || '').localeCompare(b.enrollment.studentName || ''));

        return { installmentUnpaidRows, annualUnpaidRows, fullyPaidRows, paidRows };
    }, [selectedMonth, enrollments, payments, selectedSession, selectedProgram, searchQuery, settings.academicYear, filterAudience]);    // --- Handlers ---
    const handleCardClick = (filterType: 'paid' | 'unpaid') => {
        setViewMode('balances');
        setBalanceFilter(filterType);
    };

    const handleWhatsApp = (enrollment: any, customMsg?: string) => {
        const student = students.find(s => s.id === enrollment.studentId);
        if (!student || !student.parentPhone) return alert("No parent phone number found.");
        let phone = student.parentPhone.replace(/[^0-9]/g, '');
        if (phone.startsWith('0')) phone = '212' + phone.substring(1);
        const msg = customMsg || `Hello ${student.parentName || 'Parent'}, kindly reminder regarding the outstanding balance of ${formatCurrency(enrollment.balance)} for ${student.name}'s enrollment in ${enrollment.programName}. Thank you.`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleWhatsAppUpcoming = (item: { enrollment: Enrollment; dueDate: Date | null; urgency: string }) => {
        const student = students.find(s => s.id === item.enrollment.studentId);
        if (!student || !student.parentPhone) return alert("No parent phone number found.");
        const dueStr = item.dueDate ? item.dueDate.toLocaleDateString('fr-MA', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
        const msg = `Hello ${student.parentName || 'Parent'}, this is a reminder that the next instalment of ${formatCurrency(item.enrollment.balance)} for ${student.name}'s enrollment in ${item.enrollment.programName} is due on ${dueStr}. Thank you!`;
        handleWhatsApp(item.enrollment, msg);
    };

 //  Excel Export 
    const handleExportExcel = () => {
        const rows = filteredPayments.map(p => {
            const enrollment = enrollments.find(e => e.id === p.enrollmentId);
            return {
                Date: p.date,
                Student: p.studentName,
                Program: enrollment?.programName || '',
                Grade: enrollment?.gradeName || '',
                Amount: p.amount,
                Method: p.method === 'virement' ? 'Bank Transfer' : p.method,
                Status: p.status.replace(/_/g, ' '),
                'Check No.': p.checkNumber || '',
                Bank: p.bankName || '',
                Session: p.session || selectedSession,
            };
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Payments');
        const dateLabel = dateRange.start ? `_${dateRange.start}_to_${dateRange.end || 'now'}` : '';
        XLSX.writeFile(wb, `payments_${selectedSession}${dateLabel}.xlsx`);
    };

    // --- Print Monthly Report PDF ---
    const handlePrintMonthlyReport = () => {
        if (!selectedMonth) return;
        const { installmentUnpaidRows, annualUnpaidRows, paidRows, fullyPaidRows } = monthlyReport;
        const allUnpaid = [...installmentUnpaidRows, ...annualUnpaidRows];
        const totalStudents = installmentUnpaidRows.length + annualUnpaidRows.length + paidRows.length + fullyPaidRows.length;
        const monthLabel = new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' });
        const orgName = (settings as any)?.organizationName || 'MakerLab Academy';
        const cleared = paidRows.reduce((s: number, r: any) => s + r.clearedAmount, 0);
        const outstanding = allUnpaid.reduce((s: number, r: any) => s + (r.enrollment.balance || 0), 0);

        const badgeCss: Record<string, string> = { paid: 'badge-green', verified: 'badge-green' };
        const paymentBadge = (p: any) =>
            `<span class="badge ${badgeCss[p.status] || 'badge-amber'}">${p.method === 'virement' ? 'Transfer' : p.method}${p.checkNumber ? ' #' + p.checkNumber : ''}</span>`;

        const unpaidTableRow = (r: any, i: number) =>
            `<tr><td style="color:#94a3b8">${i + 1}</td><td><strong>${r.enrollment.studentName || '-'}</strong></td>` +
            `<td>${r.enrollment.programName || '-'}</td><td style="color:#64748b">${r.enrollment.gradeName || ''} &middot; ${r.enrollment.groupName || ''}</td>` +
            `<td><span class="badge badge-red">${r.enrollment.paymentPlan}</span></td>` +
            `<td style="text-align:right;font-family:monospace;font-weight:600;color:#dc2626">${formatCurrency(r.enrollment.balance || 0)}</td></tr>`;

        const paidTableRow = (r: any, i: number) =>
            `<tr><td style="color:#94a3b8">${i + 1}</td><td><strong>${r.enrollment.studentName || '-'}</strong></td>` +
            `<td>${r.enrollment.programName || '-'} &middot; ${r.enrollment.gradeName || ''}</td>` +
            `<td>${[...r.clearedPayments, ...r.pendingPayments].map(paymentBadge).join('')}</td>` +
            `<td style="text-align:right;font-family:monospace;font-weight:600;color:#16a34a">${formatCurrency(r.clearedAmount)}${r.pendingAmount > 0 ? ' <span style="color:#d97706;font-size:10px">+' + formatCurrency(r.pendingAmount) + ' pend.</span>' : ''}</td>` +
            `<td style="text-align:right;font-family:monospace;font-weight:600;color:${(r.enrollment.balance || 0) > 0 ? '#d97706' : '#16a34a'}">${(r.enrollment.balance || 0) > 0 ? formatCurrency(r.enrollment.balance) : '&#10003; Fully paid'}</td></tr>`;

        const css = `*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1e293b;padding:24px}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;border-bottom:2px solid #e2e8f0;padding-bottom:16px}.header h1{font-size:20px;font-weight:700}.meta{font-size:11px;color:#64748b;margin-top:4px}.kpi-row{display:flex;gap:12px;margin-bottom:20px}.kpi{flex:1;padding:10px 14px;border-radius:8px;border:1px solid #e2e8f0}.kpi .label{font-size:10px;font-weight:600;text-transform:uppercase;color:#64748b}.kpi .value{font-size:16px;font-weight:700;font-family:monospace}.green{border-color:#bbf7d0;background:#f0fdf4}.green .value{color:#16a34a}.red{border-color:#fecaca;background:#fef2f2}.red .value{color:#dc2626}.amber{border-color:#fde68a;background:#fffbeb}.amber .value{color:#d97706}.blue{border-color:#bfdbfe;background:#eff6ff}.blue .value{color:#2563eb}.sec{font-size:11px;font-weight:700;text-transform:uppercase;padding:7px 12px;border-radius:6px;margin-bottom:6px;display:flex;justify-content:space-between}.sec-red{background:#fef2f2;color:#dc2626}.sec-amber{background:#fffbeb;color:#d97706}.sec-green{background:#f0fdf4;color:#16a34a}table{width:100%;border-collapse:collapse;margin-bottom:18px;font-size:11px}th{background:#f8fafc;padding:7px 9px;text-align:left;font-weight:600;color:#475569;border-bottom:2px solid #e2e8f0}td{padding:7px 9px;border-bottom:1px solid #f1f5f9}.badge{display:inline-block;padding:2px 5px;border-radius:3px;font-size:9px;font-weight:700;text-transform:uppercase;margin-right:3px}.badge-green{background:#f0fdf4;color:#16a34a}.badge-amber{background:#fffbeb;color:#d97706}.badge-red{background:#fef2f2;color:#dc2626}.footer{margin-top:16px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center}@media print{body{padding:10px}}`;

        const unpaidTheadHtml = `<thead><tr><th>#</th><th>Student</th><th>Program</th><th>Level / Group</th><th>Plan</th><th style="text-align:right">Balance</th></tr></thead>`;
        const paidTheadHtml = `<thead><tr><th>#</th><th>Student</th><th>Program</th><th>Method</th><th style="text-align:right">Amount paid</th><th style="text-align:right">Remaining</th></tr></thead>`;

        const html = [
            `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>Rapport - ${monthLabel}</title><style>${css}</style></head><body>`,
            `<div class="header"><div><h1>Monthly Collection Report</h1><div class="meta">${orgName} &nbsp; &middot; &nbsp; ${monthLabel} &nbsp; &middot; &nbsp; Session ${selectedSession}</div></div>`,
            `<div style="text-align:right;font-size:11px;color:#64748b">Generated: ${new Date().toLocaleDateString()}</div></div>`,
            `<div class="kpi-row">`,
            `<div class="kpi green"><div class="label">Cleared this month</div><div class="value">${formatCurrency(cleared)}</div></div>`,
            `<div class="kpi red"><div class="label">Outstanding debt</div><div class="value">${formatCurrency(outstanding)}</div></div>`,
            `<div class="kpi blue"><div class="label">Paid students</div><div class="value">${paidRows.length} / ${totalStudents}</div></div>`,
            `<div class="kpi amber"><div class="label">Installments due</div><div class="value">${installmentUnpaidRows.length}</div></div>`,
            `</div>`,
            installmentUnpaidRows.length > 0
                ? `<div class="sec sec-red"><span>Installment payments due  &middot;  &middot;  ${installmentUnpaidRows.length} students</span><span>${formatCurrency(installmentUnpaidRows.reduce((s: number, r: any) => s + (r.enrollment.balance || 0), 0))} outstanding</span></div>` +
                  `<table>${unpaidTheadHtml}<tbody>${installmentUnpaidRows.map(unpaidTableRow).join('')}</tbody></table>` : '',
            annualUnpaidRows.length > 0
                ? `<div class="sec sec-amber"><span>Annual fee outstanding  &middot;  &middot;  ${annualUnpaidRows.length} students</span><span>${formatCurrency(annualUnpaidRows.reduce((s: number, r: any) => s + (r.enrollment.balance || 0), 0))} owed</span></div>` +
                  `<table>${unpaidTheadHtml}<tbody>${annualUnpaidRows.map(unpaidTableRow).join('')}</tbody></table>` : '',
            paidRows.length > 0
                ? `<div class="sec sec-green"><span>Paid this month  &middot;  &middot;  ${paidRows.length} students</span><span>${formatCurrency(cleared)} cleared</span></div>` +
                  `<table>${paidTheadHtml}<tbody>${paidRows.map(paidTableRow).join('')}</tbody></table>` : '',
            `<div class="footer">${orgName} &nbsp; &middot; &nbsp; ${monthLabel} &nbsp; &middot; &nbsp; Collected: ${formatCurrency(cleared)} &nbsp; &middot; &nbsp; Outstanding: ${formatCurrency(outstanding)}</div>`,
            `<script>window.onload=()=>window.print();</script></body></html>`,
        ].join('\n');

        const win = window.open('', '_blank');
        if (win) { win.document.write(html); win.document.close(); }
    };

 //  Urgency Styling 
    const urgencyStyle = (urgency: string) => {
        if (urgency === 'overdue') return { badge: 'bg-red-500/10 text-red-400 border-red-500/20', dot: 'bg-red-500', label: 'Overdue' };
        if (urgency === 'this_week') return { badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-500', label: 'Due this week' };
        return { badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20', dot: 'bg-blue-500', label: 'Due this month' };
    };

    return (
        <div className="space-y-6 pb-24 md:pb-8 flex flex-col animate-in fade-in slide-in-from-right-4">

 {/*  Header  */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 p-4 rounded-xl border border-slate-800 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <TrendingUp size={20} className="text-emerald-400" /> Financial Overview
                    </h2>
                    <p className="text-slate-500 text-sm">Manage revenue, track debts, and monitor cash flow.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {/* Session selector */}
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5 pointer-events-none" />
                        <select
                            value={selectedSession}
                            onChange={(e) => { setSelectedSession(e.target.value); setSelectedMonth(''); }}
                            className="pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg appearance-none focus:border-emerald-500 outline-none cursor-pointer hover:bg-slate-900"
                        >
                            {availableSessions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    {/* Month quick-filter */}
                    <div className="flex items-center gap-1">
                        <div className="relative">
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                style={{ colorScheme: 'dark' }}
                                className={`pl-3 pr-3 py-2 text-sm rounded-lg border outline-none cursor-pointer transition-colors ${
                                    selectedMonth
                                        ? 'bg-emerald-950/40 border-emerald-600 text-emerald-300'
                                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900'
                                }`}
                                title="Filter by month"
                            />
                        </div>
                        {selectedMonth && (
                            <button
                                onClick={() => setSelectedMonth('')}
                                className="text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-2 rounded-lg transition-colors border border-slate-700"
                                title="Clear month filter"
                            >
                                &times;
                            </button>
                        )}
                    </div>

                    {can('finance.record_payment') && (
                        <button
                            onClick={() => onRecordPayment()}
                            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition-colors font-bold text-sm shadow-lg shadow-emerald-900/20"
                        >
                            <CreditCard size={16} /> <span className="hidden sm:inline">Record</span> Payment
                        </button>
                    )}
                </div>
            </div>

 {/*  KPI Cards  */}
            {/* ── Session Data Fix Banner (admin only, auto-detected) ── */}
            {can('settings.manage') && sessionMismatch.total > 0 && !fixDone && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-amber-950/20 border border-amber-700/40 rounded-xl animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 shrink-0">
                            <Wrench size={18} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-amber-300">Session Data Correction Needed</p>
                            <p className="text-xs text-amber-400/70 mt-0.5">
                                Found <strong>{sessionMismatch.enrollments.length} enrollment{sessionMismatch.enrollments.length !== 1 ? 's' : ''}</strong> and{' '}
                                <strong>{sessionMismatch.payments.length} payment{sessionMismatch.payments.length !== 1 ? 's' : ''}</strong> tagged as{' '}
                                <code className="bg-amber-900/30 px-1 rounded">2026-2027</code> but recorded before Sept 2026 — they should be{' '}
                                <code className="bg-emerald-900/30 px-1 rounded text-emerald-400">2025-2026</code>.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={fixSessionData}
                        disabled={isFixingSession}
                        className="shrink-0 flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-amber-900/30"
                    >
                        {isFixingSession ? (
                            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Fixing...</>
                        ) : (
                            <><Wrench size={14} /> Fix {sessionMismatch.total} Records</>
                        )}
                    </button>
                </div>
            )}

            {/* Success message after fix */}
            {fixDone && (
                <div className="flex items-center gap-3 p-4 bg-emerald-950/20 border border-emerald-700/40 rounded-xl">
                    <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-emerald-300">Session data corrected!</p>
                        <p className="text-xs text-emerald-400/70">All records updated to <code className="bg-emerald-900/30 px-1 rounded">2025-2026</code>. The view has been switched to show the corrected data.</p>
                    </div>
                </div>
            )}

            {can('finance.view_totals') && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
 {/* Realized Revenue  respects date range + month filter */}
                    <div className={`bg-slate-900 border p-4 rounded-xl hover:border-emerald-500/50 transition-colors ${selectedMonth ? 'border-emerald-700/50' : 'border-emerald-900/30'}`}>
                        <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                            <TrendingUp size={12} /> Realized Revenue
                        </div>
                        <div className="text-2xl font-bold text-emerald-400 truncate">{formatCurrency(stats.realizedRevenue)}</div>
                        <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                            {selectedMonth ? (
                                <><span className="text-emerald-600 font-bold">{new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}</span> only</>
                            ) : 'Cleared payments &middot; full session'}
                        </div>
                    </div>

                    {/* Outstanding Debt */}
                    <div className="bg-slate-900 border border-red-900/30 p-4 rounded-xl hover:border-red-500/50 transition-colors">
                        <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                            <AlertCircle size={12} /> Outstanding Debt
                        </div>
                        <div className="text-2xl font-bold text-red-400 truncate">{formatCurrency(stats.totalOutstanding)}</div>
                        <div className="text-[10px] text-slate-500 mt-1">Total unpaid balances</div>
                    </div>

                    {/* Paid Students */}
                    <div
                        onClick={() => handleCardClick('paid')}
                        className={`bg-slate-900 border p-4 rounded-xl relative overflow-hidden group transition-all cursor-pointer ${balanceFilter === 'paid' && viewMode === 'balances' ? 'border-emerald-500 bg-emerald-900/10' : 'border-slate-800 hover:border-emerald-500/30'}`}
                    >
                        <div className="flex justify-between items-start">
                            <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                                <CheckCircle2 size={12} /> Fully Paid
                            </div>
                            <ArrowRight size={14} className="text-slate-600 group-hover:text-emerald-400 transition-colors" />
                        </div>
                        <div className="text-2xl font-bold text-white">{stats.paidCount} <span className="text-sm text-slate-500 font-medium">/ {stats.totalStudents}</span></div>
                        <div className="text-[10px] text-emerald-500 mt-1 font-medium">{Math.round((stats.paidCount / stats.totalStudents) * 100 || 0)}% of students</div>
                    </div>

                    {/* Unpaid Students */}
                    <div
                        onClick={() => handleCardClick('unpaid')}
                        className={`bg-slate-900 border p-4 rounded-xl relative overflow-hidden group transition-all cursor-pointer ${balanceFilter === 'unpaid' && viewMode === 'balances' ? 'border-red-500 bg-red-900/10' : 'border-slate-800 hover:border-red-500/30'}`}
                    >
                        <div className="flex justify-between items-start">
                            <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Users size={12} /> Unpaid / Partial
                            </div>
                            <ArrowRight size={14} className="text-slate-600 group-hover:text-red-400 transition-colors" />
                        </div>
                        <div className="text-2xl font-bold text-white">{stats.unpaidCount} <span className="text-sm text-slate-500 font-medium">Students</span></div>
                        <div className="text-[10px] text-red-400 mt-1 font-medium">Action Required</div>
                    </div>

                    {/* Collection Rate */}
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                        <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                            <PieChart size={12} /> Collection Rate
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-2xl font-bold text-blue-400">{Math.round(stats.collectionRate)}%</div>
                            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${stats.collectionRate}%` }} />
                            </div>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">Target: 100%</div>
                    </div>
                </div>
            )}

 {/*  Monthly Revenue Chart  */}
            {can('finance.view_totals') && monthlyChartData.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <button
                        onClick={() => setShowMonthlyChart(v => !v)}
                        className="w-full flex items-center justify-between p-4 hover:bg-slate-800/40 transition-colors"
                    >
                        <div className="flex items-center gap-2 text-sm font-bold text-white">
                            <BarChart2 size={16} className="text-emerald-400" />
                            Monthly Activity &mdash; {selectedSession}
                            <span className="text-slate-500 font-normal text-xs ml-1">
                                ({monthlyChartData.length} months &middot;{' '}
                                {formatCurrency(monthlyChartData.reduce((s, m) => s + m.total, 0))} total)
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Legend */}
                            <div className="hidden sm:flex items-center gap-3 text-[10px] text-slate-500">
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 inline-block" /> Cleared</span>
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-700/70 inline-block" /> Pending</span>
                            </div>
                            {showMonthlyChart ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                        </div>
                    </button>

                    {showMonthlyChart && (
                        <div className="px-4 pb-4 space-y-1.5 animate-in slide-in-from-top-2">
                            {selectedMonth && (
                                <div className="text-[10px] text-emerald-500 mb-2 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                    Filtered to: {new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
                                    <button onClick={() => setSelectedMonth('')} className="text-slate-500 hover:text-white underline ml-1">clear</button>
                                </div>
                            )}
                            {monthlyChartData.map(m => (
                                <div
                                    key={m.key}
                                    className={`flex items-center gap-3 group cursor-pointer rounded-lg px-1 transition-colors ${
                                        m.isSelected ? 'bg-emerald-950/30' : 'hover:bg-slate-800/30'
                                    }`}
                                    onClick={() => setSelectedMonth(m.isSelected ? '' : m.key)}
                                    title={`Click to filter to ${m.label}`}
                                >
                                    {/* Month label */}
                                    <div className={`text-[11px] font-bold w-12 shrink-0 text-right py-1 ${
                                        m.isSelected ? 'text-emerald-400' : m.isCurrent ? 'text-blue-400' : 'text-slate-500'
                                    }`}>
                                        {m.label}
                                        {m.isCurrent && !m.isSelected && <span className="block text-[9px] text-blue-600 font-medium">NOW</span>}
                                        {m.isSelected && <span className="block text-[9px] text-emerald-600 font-medium">&bull; ACTIVE</span>}
                                    </div>

                                    {/* Stacked bar: cleared (green) + pending (amber) */}
                                    <div className="flex-1 h-7 bg-slate-950 rounded-lg overflow-hidden relative">
                                        <div className="h-full flex">
                                            {/* Cleared portion */}
                                            <div
                                                className="h-full bg-emerald-700/60 group-hover:bg-emerald-600/70 transition-all duration-500"
                                                style={{ width: `${Math.max(m.clearedPct, m.cleared > 0 ? 1.5 : 0)}%` }}
                                            />
                                            {/* Pending portion */}
                                            {m.pending > 0 && (
                                                <div
                                                    className="h-full bg-amber-700/50 group-hover:bg-amber-600/60 transition-all duration-500"
                                                    style={{ width: `${Math.max(m.pendingPct, 1.5)}%` }}
                                                />
                                            )}
                                        </div>
                                        {/* Label inside bar */}
                                        <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                                            <span className="text-[10px] text-slate-300 font-medium">
                                                {m.count > 0 && `${m.count} cleared`}
                                                {m.pendingCount > 0 && ` + ${m.pendingCount} pending`}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Total amount */}
                                    <div className={`text-xs font-bold font-mono w-28 text-right shrink-0 ${
                                        m.isSelected ? 'text-emerald-400' : m.isCurrent ? 'text-blue-300' : 'text-slate-300'
                                    }`}>
                                        {formatCurrency(m.cleared)}
                                        {m.pending > 0 && (
                                            <span className="block text-[10px] text-amber-500 font-normal">
                                                +{formatCurrency(m.pending)} pend.
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

 {/*  Main Table Panel  */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg shadow-black/10">

                {/* Toolbar */}
                <div className="p-4 border-b border-slate-800 bg-slate-950/30 space-y-4">
                    {/* View Switcher + Search */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 w-full sm:w-auto">
                            <button
                                onClick={() => setViewMode('balances')}
                                className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                                    viewMode === 'balances'
                                        ? selectedMonth ? 'bg-emerald-800/60 text-emerald-200 shadow' : 'bg-slate-800 text-white shadow'
                                        : 'text-slate-500 hover:text-slate-300'
                                }`}
                            >
                                <Users size={14} />
                                {viewMode === 'balances' && selectedMonth ? 'Monthly Report' : 'Student Balances'}
                            </button>
                            <button
                                onClick={() => setViewMode('transactions')}
                                className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${viewMode === 'transactions' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <FileText size={14} /> Transactions
                            </button>
                            <button
                                onClick={() => setViewMode('upcoming')}
                                className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 relative ${viewMode === 'upcoming' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <Clock size={14} /> Upcoming
                                {upcomingPayments.filter(u => u.urgency === 'overdue' || u.urgency === 'this_week').length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                                        {upcomingPayments.filter(u => u.urgency === 'overdue' || u.urgency === 'this_week').length}
                                    </span>
                                )}
                            </button>
                        </div>

                        <div className="flex gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-56">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder={viewMode === 'balances' ? "Search student..." : "Search..."}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 outline-none"
                                />
                            </div>
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5" />
                                <select value={filterAudience} onChange={(e) => setFilterAudience(e.target.value as any)} className="pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg appearance-none focus:border-emerald-500 outline-none cursor-pointer">
                                    <option value="all">All Ages</option>
                                    <option value="kids">Kids</option>
                                    <option value="adults">Adults</option>
                                </select>
                            </div>
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5" />
                                <select value={selectedProgram} onChange={(e) => setSelectedProgram(e.target.value)} className="pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg appearance-none focus:border-emerald-500 outline-none cursor-pointer">
                                    <option value="All">All Programs</option>
                                    {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
 {/* Excel Export  transactions only */}
                            {viewMode === 'transactions' && can('finance.view_totals') && (
                                <button
                                    onClick={handleExportExcel}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-colors border border-slate-700"
                                    title="Export to Excel"
                                >
                                    <Download size={14} /> Export
                                </button>
                            )}
 {/* Print Monthly Report  balances + month selected */}
                            {viewMode === 'balances' && selectedMonth && can('finance.view_totals') && (
                                <button
                                    onClick={handlePrintMonthlyReport}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-800/60 hover:bg-emerald-700/70 text-emerald-200 hover:text-white rounded-lg text-xs font-bold transition-colors border border-emerald-700/50"
                                    title="Print Monthly Report (PDF)"
                                >
                                    <Printer size={14} /> Print Report
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Transaction secondary filters */}
                    {viewMode === 'transactions' && (
                        <div className="flex flex-wrap gap-3 items-center pt-2 border-t border-slate-800/50 animate-in slide-in-from-top-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-500 uppercase">Status:</span>
                                <select value={transactionStatusFilter} onChange={(e) => setTransactionStatusFilter(e.target.value)} className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none cursor-pointer">
                                    <option value="all">All</option>
                                    <option value="paid">Paid / Verified</option>
                                    <option value="check_received">Check Received</option>
                                    <option value="check_deposited">Check Deposited</option>
                                    <option value="check_bounced">Bounced</option>
                                    <option value="pending_verification">Pending Transfer</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-500 uppercase">Date:</span>
                                <input type="date" className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} />
                                <span className="text-slate-600 text-xs"> &middot;  &middot; </span>
                                <input type="date" className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} />
                                {(dateRange.start || dateRange.end || transactionStatusFilter !== 'all') && (
                                    <button onClick={() => { setDateRange({ start: '', end: '' }); setTransactionStatusFilter('all'); }} className="text-xs text-red-400 hover:underline">Clear</button>
                                )}
                            </div>
                            <div className="ml-auto text-xs text-slate-500">
                                {filteredPayments.length} transactions &middot; {formatCurrency(filteredPayments.filter(p => ['paid', 'verified'].includes(p.status)).reduce((s, p) => s + p.amount, 0))} cleared
                            </div>
                        </div>
                    )}

 {/* Balance secondary filters  hide in monthly report mode */}
                    {viewMode === 'balances' && !selectedMonth && (
                        <div className="flex gap-2 items-center pt-2 border-t border-slate-800/50 animate-in slide-in-from-top-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">Status:</span>
                            {(['all', 'paid', 'unpaid'] as const).map(f => (
                                <button key={f} onClick={() => setBalanceFilter(f)} className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${balanceFilter === f
                                    ? f === 'paid' ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900' : f === 'unpaid' ? 'bg-red-950/30 text-red-400 border-red-900' : 'bg-slate-800 text-white border-slate-600'
                                    : 'text-slate-500 border-transparent hover:bg-slate-900'}`}>
                                    {f === 'all' ? 'All' : f === 'paid' ? 'Fully Paid' : 'Unpaid / Partial'}
                                </button>
                            ))}
                            <div className="ml-auto text-xs text-slate-500">{filteredEnrollments.length} students</div>
                        </div>
                    )}
                    {viewMode === 'balances' && selectedMonth && (() => {
                        const { installmentUnpaidRows, annualUnpaidRows, fullyPaidRows, paidRows } = monthlyReport;
                        return (
                        <div className="flex gap-2 items-center pt-2 border-t border-slate-800/50 animate-in slide-in-from-top-2 text-xs text-emerald-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            Monthly report for <strong className="text-emerald-300">{new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}</strong>
                            <span className="text-slate-500 ml-1">
                                &middot; {paidRows.length} paid this month
                                {installmentUnpaidRows.length > 0 && <span className="text-red-400"> &middot; {installmentUnpaidRows.length} missed installment</span>}
                                {annualUnpaidRows.length > 0 && <span className="text-amber-400"> &middot; {annualUnpaidRows.length} annual fee pending</span>}
                            </span>
                            <button onClick={() => setSelectedMonth('')} className="ml-auto text-slate-500 hover:text-white border border-slate-700 px-2 py-0.5 rounded hover:bg-slate-800 transition-colors">Clear</button>
                        </div>
                        );
                    })()}
                </div>

                {/* DATA: MONTHLY COLLECTION REPORT */}
                {viewMode === 'balances' && selectedMonth && (() => {
                    const { installmentUnpaidRows, annualUnpaidRows, fullyPaidRows, paidRows } = monthlyReport;
                    const totalCount = installmentUnpaidRows.length + annualUnpaidRows.length + fullyPaidRows.length + paidRows.length;
                    return (
                    <div className="divide-y divide-slate-800">

 {/* SECTION 1: Installment due  these students have recurring plans and missed this month */}
                        {installmentUnpaidRows.length > 0 && (
                            <>
                                <div className="px-4 py-2 bg-red-950/20 border-b border-red-900/30 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">
                                        Installment payment due &mdash; {installmentUnpaidRows.length} students
                                    </span>
                                    <span className="ml-auto text-[11px] text-red-500 font-bold">
                                        {formatCurrency(installmentUnpaidRows.reduce((s, r) => s + (r.enrollment.balance || 0), 0))} outstanding
                                    </span>
                                </div>
                                {installmentUnpaidRows.map(({ enrollment }) => (
                                    <div key={enrollment.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 py-3 hover:bg-red-950/10 transition-colors group">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-white">{enrollment.studentName}</span>
                                                <span className="text-[10px] uppercase font-bold bg-red-950/30 text-red-400 px-2 py-0.5 rounded border border-red-900/50">Missed</span>
                                                <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">{enrollment.paymentPlan}</span>
                                            </div>
                                            <div className="text-xs text-slate-400 mt-0.5">{enrollment.programName} &middot; {enrollment.gradeName} &middot; {enrollment.groupName}</div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-[10px] text-slate-500">Outstanding balance</div>
                                            <div className="font-bold text-red-400 font-mono">{formatCurrency(enrollment.balance || 0)}</div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                            <button onClick={() => handleWhatsApp(enrollment)} className="p-2 hover:bg-slate-800 rounded-lg text-emerald-500 border border-slate-700 transition-colors" title="Send reminder"><Phone size={15} /></button>
                                            <button onClick={() => onRecordPayment(enrollment.studentId)} className="p-2 hover:bg-slate-800 rounded-lg text-blue-400 border border-slate-700 transition-colors" title="Record payment"><CreditCard size={15} /></button>
                                            <button onClick={() => navigateTo('student-details', { studentId: enrollment.studentId })} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white border border-slate-700 transition-colors" title="View profile"><Eye size={15} /></button>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}

 {/* SECTION 2: Annual fee outstanding  one-time payment, not a monthly obligation */}
                        {annualUnpaidRows.length > 0 && (
                            <>
                                <div className="px-4 py-2 bg-amber-950/20 border-b border-amber-900/30 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                                        Annual fee outstanding &mdash; {annualUnpaidRows.length} students
                                    </span>
                                    <span className="text-[10px] text-slate-500 ml-1">(one-time fee, not monthly)</span>
                                    <span className="ml-auto text-[11px] text-amber-500 font-bold">
                                        {formatCurrency(annualUnpaidRows.reduce((s, r) => s + (r.enrollment.balance || 0), 0))} owed
                                    </span>
                                </div>
                                {annualUnpaidRows.map(({ enrollment }) => (
                                    <div key={enrollment.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 py-3 hover:bg-amber-950/10 transition-colors group">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-white">{enrollment.studentName}</span>
                                                <span className="text-[10px] uppercase font-bold bg-amber-950/30 text-amber-400 px-2 py-0.5 rounded border border-amber-900/50">Fee unpaid</span>
                                                <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">{enrollment.paymentPlan}</span>
                                            </div>
                                            <div className="text-xs text-slate-400 mt-0.5">{enrollment.programName} &middot; {enrollment.gradeName} &middot; {enrollment.groupName}</div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-[10px] text-slate-500">Annual fee owed</div>
                                            <div className="font-bold text-amber-400 font-mono">{formatCurrency(enrollment.balance || 0)}</div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                            <button onClick={() => handleWhatsApp(enrollment)} className="p-2 hover:bg-slate-800 rounded-lg text-emerald-500 border border-slate-700 transition-colors" title="Send reminder"><Phone size={15} /></button>
                                            <button onClick={() => onRecordPayment(enrollment.studentId)} className="p-2 hover:bg-slate-800 rounded-lg text-blue-400 border border-slate-700 transition-colors" title="Record payment"><CreditCard size={15} /></button>
                                            <button onClick={() => navigateTo('student-details', { studentId: enrollment.studentId })} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white border border-slate-700 transition-colors" title="View profile"><Eye size={15} /></button>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}

                        {/* SECTION 3: Fully settled (balance = 0, any plan) */}
                        {fullyPaidRows.length > 0 && (
                            <>
                                <div className="px-4 py-2 bg-slate-800/20 border-b border-slate-700/30 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-slate-500" />
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                        Fully settled &mdash; {fullyPaidRows.length} students
                                    </span>
                                </div>
                                {fullyPaidRows.map(({ enrollment }) => (
                                    <div key={enrollment.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/20 transition-colors opacity-60 group">
                                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                                        <div className="flex-1">
                                            <span className="font-bold text-white text-sm">{enrollment.studentName}</span>
                                            <span className="text-xs text-slate-500 ml-2">{enrollment.programName} &middot; {enrollment.paymentPlan}</span>
                                        </div>
                                        <span className="text-xs text-emerald-500 font-bold">Settled &#10003;</span>
                                        <button onClick={() => navigateTo('student-details', { studentId: enrollment.studentId })} className="p-1.5 hover:bg-slate-800 rounded text-slate-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"><Eye size={14} /></button>
                                    </div>
                                ))}
                            </>
                        )}

                        {/* SECTION 4: Paid this month */}
                        {paidRows.length > 0 && (
                            <>
                                <div className="px-4 py-2 bg-emerald-950/20 border-b border-emerald-900/30 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                                        Paid this month &mdash; {paidRows.length} students
                                    </span>
                                    <span className="ml-auto text-[11px] text-emerald-500 font-bold">
                                        {formatCurrency(paidRows.reduce((s, r) => s + r.clearedAmount, 0))} cleared
                                        {paidRows.some(r => r.pendingAmount > 0) && <> + {formatCurrency(paidRows.reduce((s, r) => s + r.pendingAmount, 0))} pending</>}
                                    </span>
                                </div>
                                {paidRows.map(({ enrollment, clearedPayments, pendingPayments, bouncedPayments, clearedAmount, pendingAmount }) => (
                                    <div key={enrollment.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 py-3 hover:bg-emerald-950/10 transition-colors group">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-bold text-white">{enrollment.studentName}</span>
                                                {clearedAmount > 0 && <span className="text-[10px] uppercase font-bold bg-emerald-950/30 text-emerald-400 px-2 py-0.5 rounded border border-emerald-900/50">&#10003; {formatCurrency(clearedAmount)} cleared</span>}
                                                {pendingAmount > 0 && <span className="text-[10px] uppercase font-bold bg-amber-950/30 text-amber-400 px-2 py-0.5 rounded border border-amber-900/50">&#9203; {formatCurrency(pendingAmount)} pending</span>}
                                                {bouncedPayments.length > 0 && <span className="text-[10px] uppercase font-bold bg-red-950/30 text-red-400 px-2 py-0.5 rounded border border-red-900/50">&#9888; bounced</span>}
                                            </div>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                <span className="text-xs text-slate-400">{enrollment.programName} &middot; {enrollment.gradeName}</span>
                                                {[...clearedPayments, ...pendingPayments].map(p => (
                                                    <span key={p.id} className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded capitalize">
                                                        {p.method === 'virement' ? 'Transfer' : p.method}{p.checkNumber ? ` #${p.checkNumber}` : ''}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-[10px] text-slate-500">Remaining balance</div>
                                            <div className={`font-bold font-mono text-sm ${(enrollment.balance || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                {(enrollment.balance || 0) > 0 ? formatCurrency(enrollment.balance) : 'Fully paid &#10003;'}
                                            </div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                            {(enrollment.balance || 0) > 0 && (
                                                <button onClick={() => onRecordPayment(enrollment.studentId)} className="p-2 hover:bg-slate-800 rounded-lg text-blue-400 border border-slate-700 transition-colors" title="Record next payment"><CreditCard size={15} /></button>
                                            )}
                                            <button onClick={() => navigateTo('student-details', { studentId: enrollment.studentId })} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white border border-slate-700 transition-colors" title="View profile"><Eye size={15} /></button>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}

                        {totalCount === 0 && (
                            <div className="p-12 text-center text-slate-500">
                                <BarChart2 size={32} className="mx-auto mb-3 opacity-30" />
                                <p>No students found for this month.</p>
                            </div>
                        )}
                    </div>
                    );
                })()}


 {/*  DATA: BALANCES (normal mode, no month selected)  */}
                {viewMode === 'balances' && !selectedMonth && (
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-900 text-slate-400 sticky top-0 z-10 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="p-4">Student</th>
                                <th className="p-4">Program</th>
                                <th className="p-4">Plan</th>
                                <th className="p-4 text-right">Total Fee</th>
                                <th className="p-4 text-right">Paid</th>
                                <th className="p-4 text-right">Balance</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredEnrollments.length === 0
                                ? <tr><td colSpan={7} className="p-8 text-center text-slate-500 italic">No students found.</td></tr>
                                : filteredEnrollments.map(enrollment => (
                                    <tr key={enrollment.id} className="hover:bg-slate-800/50 transition-colors group">
                                        <td className="p-4">
                                            <div className="font-bold text-white">{enrollment.studentName}</div>
                                            <div className="text-[10px] text-slate-500 uppercase">{enrollment.gradeName} &middot; {enrollment.groupName}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-xs text-blue-300">{enrollment.programName}</div>
                                            <div className="text-[10px] text-slate-500">{enrollment.packName}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                                                {enrollment.paymentPlan}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right text-slate-300 font-mono text-sm">{formatCurrency(enrollment.totalAmount || 0)}</td>
                                        <td className="p-4 text-right text-emerald-400 font-mono text-sm">{formatCurrency(enrollment.paidAmount || 0)}</td>
                                        <td className="p-4 text-right">
                                            <span className={`font-bold font-mono px-2 py-1 rounded text-sm ${(enrollment.balance || 0) > 0 ? 'bg-red-950/30 text-red-400 border border-red-900/50' : 'text-slate-500'}`}>
                                                {formatCurrency(enrollment.balance || 0)}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {enrollment.balance > 0 && (
                                                    <button onClick={() => handleWhatsApp(enrollment)} className="p-2 hover:bg-slate-800 rounded text-emerald-500 transition-colors" title="Send Reminder (WhatsApp)">
                                                        <Phone size={16} />
                                                    </button>
                                                )}
                                                <button onClick={() => onRecordPayment(enrollment.studentId)} className="p-2 hover:bg-slate-800 rounded text-blue-400 transition-colors" title="Record Payment">
                                                    <CreditCard size={16} />
                                                </button>
                                                <button onClick={() => navigateTo('student-details', { studentId: enrollment.studentId })} className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors" title="View Profile">
                                                    <Eye size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            }
                        </tbody>
                    </table>
                )}

 {/*  DATA: TRANSACTIONS  */}
                {viewMode === 'transactions' && (
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-900 text-slate-400 sticky top-0 z-10 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="p-4 w-32">Date</th>
                                <th className="p-4">Student</th>
                                <th className="p-4">Program</th>
                                <th className="p-4">Amount</th>
                                <th className="p-4">Method</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredPayments.length === 0
                                ? <tr><td colSpan={7} className="p-8 text-center text-slate-500">No transactions found.</td></tr>
                                : filteredPayments.map(payment => {
                                    const enrollment = enrollments.find(e => e.id === payment.enrollmentId);
                                    const student = students.find(s => s.id === enrollment?.studentId);
                                    return (
                                        <tr key={payment.id} className="hover:bg-slate-800/50 transition-colors group">
                                            <td className="p-4 text-slate-400 font-mono text-xs">{formatDate(payment.date)}</td>
                                            <td className="p-4 font-medium text-white">{payment.studentName}</td>
                                            <td className="p-4 text-xs text-blue-300">{enrollment?.programName || ' &middot;  &middot; '}</td>
                                            <td className="p-4 font-bold text-white font-mono">
                                                {can('finance.view_totals') ? formatCurrency(payment.amount) : '***'}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 text-slate-300 capitalize text-xs">
                                                    {payment.method === 'cash' && <DollarSign size={14} className="text-blue-400" />}
                                                    {payment.method === 'check' && <FileText size={14} className="text-purple-400" />}
                                                    {payment.method === 'virement' && <Building size={14} className="text-pink-400" />}
                                                    {payment.method === 'virement' ? 'Transfer' : payment.method}
                                                    {payment.checkNumber && <span className="text-slate-600 font-mono text-[10px]">#{payment.checkNumber}</span>}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${['paid', 'verified'].includes(payment.status) ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/50' : payment.status === 'check_bounced' ? 'bg-red-950/30 text-red-400 border-red-900/50' : 'bg-amber-950/30 text-amber-400 border-amber-900/50'}`}>
                                                    {payment.status.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => navigateTo('activity-details', { activityId: { type: 'payment', id: payment.id } })} className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-blue-400 transition-colors" title="View Details">
                                                        <Eye size={16} />
                                                    </button>
                                                    <button onClick={() => generateReceipt(payment, enrollment, student, settings)} className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-400 transition-colors" title="Print Receipt">
                                                        <Printer size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            }
                        </tbody>
                    </table>
                )}

 {/*  DATA: UPCOMING PAYMENTS  */}
                {viewMode === 'upcoming' && (
                    <div className="divide-y divide-slate-800">
                        {upcomingPayments.length === 0 ? (
                            <div className="p-12 text-center text-slate-500">
                                <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-600 opacity-50" />
                                <p className="font-bold text-white mb-1">All clear!</p>
                                <p className="text-sm">No upcoming instalment payments due in the next 30 days.</p>
                                <p className="text-xs text-slate-600 mt-2">Only shows students on monthly, trimester, or semestre plans with an outstanding balance.</p>
                            </div>
                        ) : (
                            <>
                                {/* Summary bar */}
                                <div className="px-4 py-3 bg-slate-950/50 flex flex-wrap gap-4 text-xs">
                                    {[
                                        { key: 'overdue', label: 'Overdue', color: 'text-red-400' },
                                        { key: 'this_week', label: 'Due this week', color: 'text-amber-400' },
                                        { key: 'this_month', label: 'Due this month', color: 'text-blue-400' },
                                    ].map(({ key, label, color }) => {
                                        const count = upcomingPayments.filter(u => u.urgency === key).length;
                                        return count > 0 ? (
                                            <span key={key} className={`font-bold ${color}`}>{count} {label}</span>
                                        ) : null;
                                    })}
                                </div>

                                {upcomingPayments.map(({ enrollment, dueDate, urgency }) => {
                                    const style = urgencyStyle(urgency);
                                    const student = students.find(s => s.id === enrollment.studentId);
                                    const daysUntil = dueDate ? Math.floor((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                                    return (
                                        <div key={enrollment.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 hover:bg-slate-800/30 transition-colors">
                                            {/* Status dot */}
                                            <div className={`w-2 h-2 rounded-full mt-1.5 sm:mt-0 shrink-0 ${style.dot} ${urgency === 'overdue' ? 'animate-pulse' : ''}`} />

                                            {/* Student info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                                    <span className="font-bold text-white">{enrollment.studentName}</span>
                                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${style.badge}`}>
                                                        {style.label}
                                                    </span>
                                                    <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                                                        {enrollment.paymentPlan}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                    {enrollment.programName} &middot; {enrollment.gradeName}
                                                </div>
                                            </div>

                                            {/* Due date */}
                                            <div className="text-right shrink-0">
                                                <div className="text-xs text-slate-400">
                                                    {dueDate ? dueDate.toLocaleDateString('fr-MA', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                                </div>
                                                {daysUntil !== null && (
                                                    <div className={`text-[11px] font-bold ${urgency === 'overdue' ? 'text-red-400' : urgency === 'this_week' ? 'text-amber-400' : 'text-blue-400'}`}>
                                                        {urgency === 'overdue' ? `${Math.abs(daysUntil)}d overdue` : `in ${daysUntil}d`}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Balance */}
                                            {can('finance.view_totals') && (
                                                <div className="text-right shrink-0">
                                                    <div className="text-[10px] text-slate-500">Balance</div>
                                                    <div className="font-bold text-red-400 font-mono">{formatCurrency(enrollment.balance)}</div>
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div className="flex gap-2 shrink-0">
                                                <button
                                                    onClick={() => handleWhatsAppUpcoming({ enrollment, dueDate, urgency })}
                                                    className="p-2 hover:bg-slate-700 rounded-lg text-emerald-500 hover:text-emerald-400 transition-colors border border-slate-700"
                                                    title="Send payment reminder via WhatsApp"
                                                >
                                                    <MessageCircle size={16} />
                                                </button>
                                                <button
                                                    onClick={() => onRecordPayment(enrollment.studentId)}
                                                    className="p-2 hover:bg-slate-700 rounded-lg text-blue-400 transition-colors border border-slate-700"
                                                    title="Record Payment"
                                                >
                                                    <CreditCard size={16} />
                                                </button>
                                                <button
                                                    onClick={() => navigateTo('student-details', { studentId: enrollment.studentId })}
                                                    className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors border border-slate-700"
                                                    title="View Profile"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
