
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    CreditCard, Search, Eye, Printer, Filter, Clock, DollarSign,
    FileText, Building, Calendar, AlertCircle, CheckCircle2, Users,
    ArrowRight, Phone, BarChart2, Download, MessageCircle, Wrench, ShieldCheck,
    Upload, Image as ImageIcon, RefreshCw, ArrowLeft, WalletCards, UserRoundSearch,
    History, Sparkles, SlidersHorizontal, ChevronRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { formatCurrency, formatDate, generateReceipt, normalizePhone, compressImage } from '../utils/helpers';
import { Enrollment, Payment } from '../types';
import { db } from '../services/firebase';
import { doc, writeBatch, collection, runTransaction, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Modal } from '../components/Modal';
import { AtlasCommandHeader } from '../components/atlas/AtlasSurface';

// --- Upcoming Payment Helper ---
function computeNextPaymentDate(
    enrollment: Enrollment,
    paymentsForEnrollment: Payment[]
): { dueDate: Date | null; dueAmount: number; source: 'promise' | 'interval' | 'settled'; urgency: 'overdue' | 'this_week' | 'this_month' | 'future' | 'paid' } {
    if ((enrollment.balance || 0) <= 0) return { dueDate: null, dueAmount: 0, source: 'settled', urgency: 'paid' };
    if (!['monthly', 'trimester', 'semestre'].includes(enrollment.paymentPlan)) {
        return { dueDate: null, dueAmount: enrollment.balance || 0, source: 'interval', urgency: 'future' };
    }

    const intervalMonths = enrollment.paymentPlan === 'monthly' ? 1
        : enrollment.paymentPlan === 'trimester' ? 3
        : 6;

    const clearedPayments = paymentsForEnrollment
        .filter(p => ['paid', 'verified'].includes(p.status))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const clearedAmount = clearedPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const promisedSchedule = [...(enrollment.paymentPromises || [])]
        .filter(promise => /^\d{4}-\d{2}$/.test(promise.month) && Number(promise.amount) > 0)
        .sort((a, b) => a.month.localeCompare(b.month));

    let promisedCumulative = 0;
    const nextPromise = promisedSchedule.find(promise => {
        promisedCumulative += Number(promise.amount);
        return promisedCumulative > clearedAmount + 0.005;
    });

    if (nextPromise) {
        const promisedDate = new Date(`${nextPromise.month}-01T00:00:00`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((promisedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const urgency = diffDays < 0 ? 'overdue' : diffDays <= 7 ? 'this_week' : diffDays <= 30 ? 'this_month' : 'future';
        return {
            dueDate: promisedDate,
            dueAmount: Math.min(Number(nextPromise.amount), enrollment.balance || Number(nextPromise.amount)),
            source: 'promise',
            urgency
        };
    }

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

    return { dueDate: nextDue, dueAmount: enrollment.balance || 0, source: 'interval', urgency };
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
    const { payments, enrollments, students, programs, navigateTo, settings, viewParams, fetchDashboardData } = useAppContext();
    const { can, currentOrganization } = useAuth();
    const { confirm, alert: showAlert } = useConfirm();
    const financeTopRef = useRef<HTMLDivElement>(null);

    // --- Parent Payments ---
    const [balanceGrouping, setBalanceGrouping] = useState<'student' | 'parent'>('parent');
    const [isParentPaymentModalOpen, setIsParentPaymentModalOpen] = useState(false);
    const [parentPaymentAccount, setParentPaymentAccount] = useState<any>(null);
    const [parentPaymentForm, setParentPaymentForm] = useState({
        amount: '',
        method: 'cash' as 'cash' | 'check' | 'virement',
        date: new Date().toISOString().split('T')[0],
        checkNumber: '',
        bankName: '',
        depositDate: '',
        proofUrl: ''
    });
    const [isSubmittingParentPayment, setIsSubmittingParentPayment] = useState(false);
    const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
    const [statementAccount, setStatementAccount] = useState<any>(null);

    // --- Transaction Edit Modal State ---
    const [editingTransaction, setEditingTransaction] = useState<Payment | null>(null);
    const [editTransactionForm, setEditTransactionForm] = useState<Partial<Payment>>({});
    const [isSubmittingTransactionEdit, setIsSubmittingTransactionEdit] = useState(false);

    // --- State ---
    const [viewMode, setViewMode] = useState<'home' | 'transactions' | 'balances' | 'upcoming' | 'reports'>('home');
    const [showFinanceTools, setShowFinanceTools] = useState(false);
    const [showHistoryFilters, setShowHistoryFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    // Default to the academically correct year (Sept 1 - June 30 rule)
    const [selectedSession, setSelectedSession] = useState(() => computeAcademicYear());
    const [selectedMonth, setSelectedMonth] = useState(''); // YYYY-MM, empty = all months
    const [selectedProgram, setSelectedProgram] = useState('All');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [balanceFilter, setBalanceFilter] = useState<'all' | 'paid' | 'unpaid'>('unpaid');
    const [transactionStatusFilter, setTransactionStatusFilter] = useState<string>('all');
    const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'cash' | 'check' | 'virement'>('all');
    const [datePresetFilter, setDatePresetFilter] = useState<'all' | 'today' | 'this_week' | 'this_month' | 'custom'>('all');
    const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<string>>(new Set());
    const [filterAudience, setFilterAudience] = useState<'all' | 'kids' | 'adults'>('all');
    const [isFixingSession, setIsFixingSession] = useState(false);
    const [fixDone, setFixDone] = useState(false);

    const dateRangeError = datePresetFilter === 'custom' && dateRange.start && dateRange.end && dateRange.start > dateRange.end
        ? 'Start date must be before the end date.'
        : '';

    // --- Session Mismatch Detection ---
    // Finds records tagged 2026-2027 but created/dated before Sept 1, 2026
    // (i.e., they should be 2025-2026 — created while admin had wrong year in settings)
    const SESSION_CUTOFF = new Date('2026-09-01T00:00:00Z');
    const sessionMismatch = useMemo(() => {
        if (fixDone || !currentOrganization?.id) return { enrollments: [], payments: [], total: 0 };

        const getDateSafe = (d: any): Date => {
            if (!d) return new Date();
            if (typeof d === 'object' && typeof d.toDate === 'function') return d.toDate();
            return new Date(d);
        };

        const badEnrollments = enrollments.filter(e => {
            if (e.organizationId !== currentOrganization.id) return false;
            if (e.session !== '2026-2027') return false;
            const created = getDateSafe(e.createdAt);
            return created < SESSION_CUTOFF;
        });

        const badPayments = payments.filter(p => {
            if (p.organizationId !== currentOrganization.id) return false;
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
    }, [enrollments, payments, fixDone, currentOrganization?.id]);

    const fixSessionData = async () => {
        if (!db || !currentOrganization?.id || !can('settings.manage') || sessionMismatch.total === 0) return;
        const approved = await confirm({
            title: 'Correct academic sessions?',
            message: `Update ${sessionMismatch.total} tenant record${sessionMismatch.total === 1 ? '' : 's'} from 2026-2027 to 2025-2026? This changes reporting periods but not amounts.`,
            confirmText: 'Correct sessions',
            cancelText: 'Cancel',
            variant: 'warning'
        });
        if (!approved) return;
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
            await fetchDashboardData();
            await showAlert('Sessions corrected', `${sessionMismatch.total} finance record${sessionMismatch.total === 1 ? '' : 's'} moved to 2025-2026. Amounts were not changed.`, 'success');
        } catch (err) {
            console.error('Session fix failed:', err);
            await showAlert('Session correction failed', 'No further batches will be written. Review the ledger before retrying.', 'danger');
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

    useEffect(() => {
        if (availableSessions.length === 0 || availableSessions.includes(selectedSession)) return;
        setSelectedSession(settings.academicYear && availableSessions.includes(settings.academicYear) ? settings.academicYear : availableSessions[0]);
    }, [availableSessions, selectedSession, settings.academicYear]);

 //  Derived: Audience matcher 
    const audienceMatchesProg = (progId: string) => {
        if (filterAudience === 'all') return true;
        const prog = programs.find(p => p.id === progId);
        return filterAudience === 'kids' ? prog?.targetAudience !== 'adults' : prog?.targetAudience === 'adults';
    };

 //  Derived: Filtered Data 
    // --- Derived: Filtered Data ---
    const { filteredPayments, filteredEnrollments } = useMemo(() => {
        const matchesSearch = (text?: string) => !searchQuery || (text || '').toLowerCase().includes(searchQuery.toLowerCase());
        // Smart session matching: for payments, fall back to the enrollment's session if payment.session is missing.
        // This handles payments recorded before the session field was standardized.
        const matchesSession = (itemSession?: string, fallbackSession?: string) => {
            const resolved = itemSession || fallbackSession;
            if (!resolved) return selectedSession === settings.academicYear;
            return resolved === selectedSession;
        };
        const matchesProgram = (progId: string) => selectedProgram === 'All' || progId === selectedProgram;

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0];
        
        const startOfThisWeek = new Date(now);
        startOfThisWeek.setDate(now.getDate() - now.getDay());
        const startOfThisWeekStr = new Date(startOfThisWeek.getFullYear(), startOfThisWeek.getMonth(), startOfThisWeek.getDate()).toISOString().split('T')[0];
        
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

        const pFiltered = payments.filter(p => {
            const enrollment = enrollments.find(e => e.id === p.enrollmentId);
            const student = students.find(item => item.id === enrollment?.studentId);
            // selectedMonth overrides the dateRange when set (YYYY-MM)
            const monthStart = selectedMonth ? selectedMonth + '-01' : dateRange.start;
            const monthEnd = selectedMonth ? selectedMonth + '-31' : dateRange.end;
            
            let matchesDatePreset = true;
            if (datePresetFilter === 'today') matchesDatePreset = p.date === startOfToday;
            else if (datePresetFilter === 'this_week') matchesDatePreset = p.date >= startOfThisWeekStr;
            else if (datePresetFilter === 'this_month') matchesDatePreset = p.date >= startOfThisMonth;

            const matchesMethod = paymentMethodFilter === 'all' || p.method === paymentMethodFilter;
            const matchesStatus = transactionStatusFilter === 'all' || transactionStatusFilter === 'attention'
                || (transactionStatusFilter === 'cleared' ? ['paid', 'verified'].includes(p.status) : p.status === transactionStatusFilter);
            const matchesAttentionStatus = transactionStatusFilter !== 'attention'
                || ['pending', 'pending_verification', 'check_received', 'check_deposited', 'check_bounced'].includes(p.status);

            return matchesSession(p.session, enrollment?.session)
                && matchesSearch([p.studentName, p.checkNumber, p.bankName, student?.parentName, student?.parentPhone].filter(Boolean).join(' '))
                && matchesProgram(enrollment?.programId || '')
                && audienceMatchesProg(enrollment?.programId || '')
                && (!monthStart || p.date >= monthStart)
                && (!monthEnd || p.date <= monthEnd)
                && matchesStatus
                && matchesAttentionStatus
                && matchesDatePreset
                && matchesMethod;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const eFiltered = enrollments.filter(e => {
            const student = students.find(item => item.id === e.studentId);
            return e.status === 'active'
                && matchesSession(e.session)
                && matchesSearch([e.studentName, student?.parentName, student?.parentPhone, e.programName, e.groupName].filter(Boolean).join(' '))
                && matchesProgram(e.programId)
                && audienceMatchesProg(e.programId)
                && (balanceFilter === 'all' || (balanceFilter === 'paid' ? e.balance <= 0 : e.balance > 0));
        }).sort((a, b) => {
            if (balanceFilter === 'unpaid') return Number(b.balance || 0) - Number(a.balance || 0);
            return String(a.studentName || '').localeCompare(String(b.studentName || ''));
        });

        return { filteredPayments: pFiltered, filteredEnrollments: eFiltered };
    }, [payments, enrollments, searchQuery, selectedSession, selectedMonth, selectedProgram, dateRange,
        balanceFilter, transactionStatusFilter, paymentMethodFilter, datePresetFilter, settings.academicYear, filterAudience, students]);

    useEffect(() => {
        const visibleIds = new Set(filteredPayments.map(payment => payment.id));
        setSelectedTransactionIds(previous => {
            const next = new Set(Array.from(previous).filter(id => visibleIds.has(id)));
            if (next.size === previous.size && Array.from(next).every(id => previous.has(id))) return previous;
            return next;
        });
    }, [filteredPayments]);

    const selectedSummary = useMemo(() => {
        let total = 0;
        let cash = 0;
        let transfer = 0;
        let check = 0;

        filteredPayments.forEach(p => {
            if (selectedTransactionIds.has(p.id)) {
                total += p.amount;
                if (p.method === 'cash') cash += p.amount;
                else if (p.method === 'virement') transfer += p.amount;
                else if (p.method === 'check') check += p.amount;
            }
        });

        return { total, cash, transfer, check };
    }, [filteredPayments, selectedTransactionIds]);

    const handleSelectAllTransactions = () => {
        if (selectedTransactionIds.size === filteredPayments.length && filteredPayments.length > 0) {
            setSelectedTransactionIds(new Set());
        } else {
            setSelectedTransactionIds(new Set(filteredPayments.map(p => p.id)));
        }
    };

    const toggleTransactionSelection = (id: string) => {
        const next = new Set(selectedTransactionIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedTransactionIds(next);
    };

    const parentAccounts = useMemo(() => {
        const map = new Map<string, {
            phone: string;
            parentName: string;
            children: { student: any; enrollment: Enrollment }[];
            totalBalance: number;
            totalPaid: number;
            totalExpected: number;
        }>();

        filteredEnrollments.forEach(e => {
            const student = students.find(s => s.id === e.studentId);
            if (!student) return;
            const phoneStr = normalizePhone(student.parentPhone || '');
            // If no phone, treat as standalone with enrollment ID as key
            const key = phoneStr || `solo-${e.id}`;

            if (!map.has(key)) {
                map.set(key, {
                    phone: phoneStr,
                    parentName: student.parentName || 'Unknown Parent',
                    children: [],
                    totalBalance: 0,
                    totalPaid: 0,
                    totalExpected: 0
                });
            }

            const entry = map.get(key)!;
            entry.children.push({ student, enrollment: e });
            entry.totalBalance += (e.balance || 0);
            entry.totalPaid += (e.paidAmount || 0);
            entry.totalExpected += (e.totalAmount || 0);
        });

        return Array.from(map.values()).sort((a, b) => b.totalBalance - a.totalBalance);
    }, [filteredEnrollments, students]);

    const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const compressed = await compressImage(file);
            setParentPaymentForm(prev => ({ ...prev, proofUrl: compressed }));
        } catch (err) {
            console.error(err);
            await showAlert('Proof upload failed', 'Use a supported image and try again.', 'danger');
        }
    };

    const handleTransactionProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const compressed = await compressImage(file);
            setEditTransactionForm(previous => ({ ...previous, proofUrl: compressed }));
        } catch (err) {
            console.error(err);
            await showAlert('Proof upload failed', 'Use a supported image and try again.', 'danger');
        }
    };

    const handleSaveTransactionEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !editingTransaction) return;
        if (!can('finance.record_payment')) {
            await showAlert('Permission required', 'Your role cannot change payment records.', 'warning');
            return;
        }
        if (!currentOrganization?.id) {
            await showAlert('Organization unavailable', 'Select an organization before changing a payment record.', 'warning');
            return;
        }
        const amount = Number(editTransactionForm.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            await showAlert('Check transaction', 'Amount must be greater than zero.', 'warning');
            return;
        }
        if (!editTransactionForm.date || !/^\d{4}-\d{2}-\d{2}$/.test(editTransactionForm.date)) {
            await showAlert('Check transaction', 'Choose a valid payment date.', 'warning');
            return;
        }
        const method = editTransactionForm.method || editingTransaction.method;
        const allowedStatuses: Record<Payment['method'], Payment['status'][]> = {
            cash: ['paid', 'verified'],
            virement: ['pending_verification', 'verified', 'paid'],
            check: ['check_received', 'check_deposited', 'paid', 'verified', 'check_bounced']
        };
        const requestedStatus = editTransactionForm.status || editingTransaction.status;
        if (!allowedStatuses[method].includes(requestedStatus)) {
            await showAlert('Check transaction status', `The selected status is not valid for ${method === 'virement' ? 'a bank transfer' : method}.`, 'warning');
            return;
        }
        if (method === 'check' && (!editTransactionForm.checkNumber?.trim() || !editTransactionForm.bankName?.trim())) {
            await showAlert('Check details required', 'Enter both the check number and bank before saving.', 'warning');
            return;
        }
        if (method === 'virement' && requestedStatus === 'verified' && !editTransactionForm.proofUrl) {
            await showAlert('Transfer proof required', 'Attach transfer proof before marking the payment verified.', 'warning');
            return;
        }

        setIsSubmittingTransactionEdit(true);
        try {
            const paymentUpdate = {
                amount,
                date: editTransactionForm.date,
                method,
                status: requestedStatus,
                session: computeAcademicYear(new Date(`${editTransactionForm.date}T00:00:00`)),
                checkNumber: method === 'check' ? editTransactionForm.checkNumber!.trim() : null,
                bankName: method === 'check' ? editTransactionForm.bankName!.trim() : null,
                depositDate: method === 'check' ? editTransactionForm.depositDate || null : null,
                proofUrl: method === 'virement' ? editTransactionForm.proofUrl || null : null
            };
            const tenantId = currentOrganization.id;
            const paymentRef = doc(db, 'payments', editingTransaction.id);
            const clearedDifference = await runTransaction(db, async transaction => {
                const paymentSnapshot = await transaction.get(paymentRef);
                if (!paymentSnapshot.exists()) throw new Error('This payment no longer exists. Refresh the ledger and try again.');

                const currentPayment = paymentSnapshot.data() as Payment;
                if (currentPayment.organizationId !== tenantId) {
                    throw new Error('The current payment does not belong to the active organization.');
                }
                if (!currentPayment.enrollmentId) throw new Error('The current payment is not linked to an enrollment.');

                const enrollmentRef = doc(db, 'enrollments', currentPayment.enrollmentId);
                const enrollmentSnapshot = await transaction.get(enrollmentRef);
                if (!enrollmentSnapshot.exists()) throw new Error('The linked enrollment no longer exists.');

                const currentEnrollment = enrollmentSnapshot.data() as Enrollment;
                if (currentEnrollment.organizationId !== tenantId) {
                    throw new Error('The linked enrollment does not belong to the active organization.');
                }

                const currentPaidAmount = Number(currentEnrollment.paidAmount);
                const totalAmount = Number(currentEnrollment.totalAmount);
                const currentPaymentAmount = Number(currentPayment.amount);
                if (![currentPaidAmount, totalAmount, currentPaymentAmount].every(Number.isFinite)) {
                    throw new Error('Current financial totals are invalid. Reconcile the enrollment before editing this payment.');
                }

                const currentClearedAmount = ['paid', 'verified'].includes(currentPayment.status) ? currentPaymentAmount : 0;
                const nextClearedAmount = ['paid', 'verified'].includes(requestedStatus) ? amount : 0;
                const clearedDelta = nextClearedAmount - currentClearedAmount;
                const nextPaidAmount = currentPaidAmount + clearedDelta;
                const tolerance = 0.005;
                if (nextPaidAmount < -tolerance) {
                    throw new Error('This edit would make the enrollment paid amount negative.');
                }
                if (nextPaidAmount > totalAmount + tolerance) {
                    throw new Error('This edit would exceed the enrollment fee. Edufy does not create payment credits.');
                }

                const boundedPaidAmount = Math.min(totalAmount, Math.max(0, nextPaidAmount));
                transaction.update(paymentRef, paymentUpdate);
                if (Math.abs(clearedDelta) > tolerance) {
                    transaction.update(enrollmentRef, {
                        paidAmount: boundedPaidAmount,
                        balance: totalAmount - boundedPaidAmount
                    });
                }
                return clearedDelta;
            });
            setEditingTransaction(null);
            await fetchDashboardData();
            await showAlert('Transaction updated', Math.abs(clearedDifference) <= 0.005 ? 'Payment details were saved from current ledger records. Enrollment totals did not change.' : 'Payment details and the current linked enrollment balance were reconciled in one transaction.', 'success');
        } catch (err: any) {
            await showAlert('Transaction update failed', err?.message || 'The payment and enrollment totals were not changed.', 'danger');
        } finally {
            setIsSubmittingTransactionEdit(false);
        }
    };

    const handleSubmitParentPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!parentPaymentAccount || !db) return;
        if (!can('finance.record_payment')) {
            await showAlert('Permission required', 'Your role cannot record payments.', 'warning');
            return;
        }
        if (!currentOrganization?.id) {
            await showAlert('Organization unavailable', 'Select an organization before recording a family payment.', 'warning');
            return;
        }
        const amountPaid = Number(parentPaymentForm.amount);
        if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
            await showAlert('Check payment amount', 'Amount must be greater than zero.', 'warning');
            return;
        }
        if (amountPaid > parentPaymentAccount.totalBalance + 0.005) {
            await showAlert('Payment exceeds family balance', 'This ledger has no family credit model. Record no more than the current outstanding balance.', 'warning');
            return;
        }
        if (!parentPaymentForm.date || !/^\d{4}-\d{2}-\d{2}$/.test(parentPaymentForm.date)) {
            await showAlert('Check payment date', 'Choose a valid payment date.', 'warning');
            return;
        }
        if (parentPaymentForm.method === 'check' && (!parentPaymentForm.checkNumber.trim() || !parentPaymentForm.bankName.trim())) {
            await showAlert('Check details required', 'Enter both the check number and bank.', 'warning');
            return;
        }
        if (parentPaymentForm.method === 'virement' && !parentPaymentForm.proofUrl) {
            await showAlert('Transfer proof required', 'Attach the bank transfer proof before adding it to the verification queue.', 'warning');
            return;
        }
        setIsSubmittingParentPayment(true);
        try {
            let remainingToDistribute = amountPaid;

            let status: Payment['status'] = 'paid';
            if (parentPaymentForm.method === 'check') status = 'check_received';
            if (parentPaymentForm.method === 'virement') status = 'pending_verification';

            const childrenWithBalance = [...parentPaymentAccount.children]
                .filter((c: any) => (c.enrollment.balance || 0) > 0)
                .filter((c: any) => c.enrollment.organizationId === currentOrganization.id)
                .sort((a, b) => new Date(a.enrollment.createdAt || 0).getTime() - new Date(b.enrollment.createdAt || 0).getTime());

            if (childrenWithBalance.length === 0) throw new Error('No eligible balances belong to the active organization.');
            if (childrenWithBalance.length > 200) throw new Error('This family account is too large for one atomic payment. Contact support to split it safely.');

            const batch = writeBatch(db);
            let allocationCount = 0;
            for (const child of childrenWithBalance) {
                if (remainingToDistribute <= 0) break;
                const owed = child.enrollment.balance || 0;
                const applied = Math.min(owed, remainingToDistribute);
                const paymentRef = doc(collection(db, 'payments'));

                batch.set(paymentRef, {
                    enrollmentId: child.enrollment.id,
                    studentName: child.enrollment.studentName,
                    amount: applied,
                    date: parentPaymentForm.date,
                    method: parentPaymentForm.method,
                    status: status,
                    organizationId: currentOrganization.id,
                    checkNumber: parentPaymentForm.method === 'check' ? parentPaymentForm.checkNumber.trim() : null,
                    bankName: parentPaymentForm.method === 'check' ? parentPaymentForm.bankName.trim() : null,
                    depositDate: parentPaymentForm.method === 'check' ? parentPaymentForm.depositDate : null,
                    proofUrl: parentPaymentForm.method === 'virement' ? parentPaymentForm.proofUrl : null,
                    session: computeAcademicYear(new Date(parentPaymentForm.date)),
                    createdAt: serverTimestamp()
                });

                if (status === 'paid') {
                    const newPaid = (child.enrollment.paidAmount || 0) + applied;
                    const newBalance = (child.enrollment.totalAmount || 0) - newPaid;
                    batch.update(doc(db, 'enrollments', child.enrollment.id), {
                        paidAmount: newPaid,
                        balance: newBalance
                    });
                }
                remainingToDistribute -= applied;
                allocationCount++;
            }

            if (remainingToDistribute > 0.005) throw new Error('The payment could not be fully allocated to active tenant balances.');
            await batch.commit();

            setIsParentPaymentModalOpen(false);
            setParentPaymentAccount(null);
            setParentPaymentForm({ amount: '', method: 'cash', date: new Date().toISOString().split('T')[0], checkNumber: '', bankName: '', depositDate: '', proofUrl: '' });
            await fetchDashboardData();
            await showAlert('Family payment recorded', `${formatCurrency(amountPaid)} was allocated across ${allocationCount} enrollment${allocationCount === 1 ? '' : 's'} as one atomic ledger operation.`, 'success');
        } catch (err: any) {
            console.error(err);
            await showAlert('Family payment failed', err?.message || 'No family payment was recorded.', 'danger');
        } finally {
            setIsSubmittingParentPayment(false);
        }
    };

 //  Derived: KPI Stats
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

        // Keep the command-center total independent from hidden ledger filters.
        // It follows the visible organization, session, program, audience, and optional month.
        const realizedRevenue = payments
            .filter(payment => {
                const enrollment = enrollments.find(item => item.id === payment.enrollmentId);
                const session = payment.session || enrollment?.session;
                const matchesSession = session ? session === selectedSession : selectedSession === settings.academicYear;
                const matchesProgram = selectedProgram === 'All' || enrollment?.programId === selectedProgram;
                const matchesMonth = !selectedMonth || payment.date.startsWith(selectedMonth);
                const matchesOrganization = !currentOrganization?.id || payment.organizationId === currentOrganization.id;

                return matchesOrganization
                    && matchesSession
                    && matchesProgram
                    && matchesMonth
                    && audienceMatchesProg(enrollment?.programId || '')
                    && ['paid', 'verified'].includes(payment.status);
            })
            .reduce((sum, p) => sum + p.amount, 0);

        return { totalExpected, totalPaid, totalOutstanding, paidCount, unpaidCount, totalStudents, collectionRate, realizedRevenue };
    }, [enrollments, payments, selectedSession, selectedMonth, selectedProgram, settings.academicYear, filterAudience, currentOrganization?.id]);

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
            const matchesProgram = selectedProgram === 'All' || e.programId === selectedProgram;
            const matchesAudience = audienceMatchesProg(e.programId);
            const matchesSearch = !searchQuery || (e.studentName || '').toLowerCase().includes(searchQuery.toLowerCase());
            return e.status === 'active' && ms && (e.balance || 0) > 0
                && matchesProgram && matchesAudience && matchesSearch
                && ['monthly', 'trimester', 'semestre'].includes(e.paymentPlan);
        });

        return sessionEnrollments
            .map(e => {
                const ePayments = payments.filter(p => p.enrollmentId === e.id);
                const { dueDate, dueAmount, source, urgency } = computeNextPaymentDate(e, ePayments);
                return { enrollment: e, dueDate, dueAmount, source, urgency };
            })
            .filter(item => item.urgency !== 'paid' && item.urgency !== 'future' && item.dueDate !== null)
            .sort((a, b) => (a.dueDate!.getTime()) - (b.dueDate!.getTime()));
    }, [enrollments, payments, selectedSession, settings.academicYear, selectedProgram, filterAudience, searchQuery]);

    const financeCommandStats = useMemo(() => {
        const visiblePayments = payments.filter(p => {
            const enrollment = enrollments.find(e => e.id === p.enrollmentId);
            const session = p.session || enrollment?.session;
            const matchesSession = session ? session === selectedSession : selectedSession === settings.academicYear;
            const matchesProgram = selectedProgram === 'All' || enrollment?.programId === selectedProgram;
            return matchesSession && matchesProgram && audienceMatchesProg(enrollment?.programId || '');
        });

        const pendingVerification = visiblePayments.filter(p => ['pending', 'pending_verification'].includes(p.status));
        const checkExposure = visiblePayments.filter(p => ['check_received', 'check_deposited'].includes(p.status));
        const bouncedChecks = visiblePayments.filter(p => p.status === 'check_bounced');
        const overdueCount = upcomingPayments.filter(item => item.urgency === 'overdue').length;
        const highRiskFamilies = parentAccounts.filter(account => account.totalBalance > 0).slice(0, 3);

        return {
            pendingVerificationCount: pendingVerification.length,
            pendingVerificationAmount: pendingVerification.reduce((sum, p) => sum + p.amount, 0),
            checkExposureCount: checkExposure.length,
            checkExposureAmount: checkExposure.reduce((sum, p) => sum + p.amount, 0),
            bouncedCheckCount: bouncedChecks.length,
            overdueCount,
            highRiskFamilies
        };
    }, [payments, enrollments, selectedSession, selectedProgram, settings.academicYear, filterAudience, upcomingPayments, parentAccounts]);


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
    }, [selectedMonth, enrollments, payments, selectedSession, selectedProgram, searchQuery, settings.academicYear, filterAudience]);

    // --- Handlers ---
    const handleRecalculateBalances = async () => {
        if (!db || !currentOrganization?.id || !can('settings.manage')) {
            await showAlert('Maintenance access required', 'Only an administrator can reconcile the tenant finance ledger.', 'warning');
            return;
        }
        const tenantEnrollments = enrollments.filter(enrollment => enrollment.organizationId === currentOrganization.id);
        const tenantPayments = payments.filter(payment => payment.organizationId === currentOrganization.id);
        const repairs = tenantEnrollments.flatMap(enrollment => {
            const actualPaid = tenantPayments
                .filter(payment => payment.enrollmentId === enrollment.id && ['paid', 'verified'].includes(payment.status))
                .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
            if (Math.abs(Number(enrollment.paidAmount || 0) - actualPaid) <= 0.005) return [];
            return [{ id: enrollment.id, paidAmount: actualPaid, balance: Math.max(0, Number(enrollment.totalAmount || 0) - actualPaid) }];
        });
        if (repairs.length === 0) {
            await showAlert('Ledger is consistent', 'Enrollment balances already match cleared tenant payments.', 'success');
            return;
        }
        const approved = await confirm({
            title: 'Reconcile enrollment balances?',
            message: `${repairs.length} enrollment${repairs.length === 1 ? '' : 's'} differ from cleared payment history. Update only those tenant records?`,
            confirmText: 'Reconcile balances',
            cancelText: 'Cancel',
            variant: 'warning'
        });
        if (!approved) return;
        setIsFixingSession(true);
        try {
            for (let index = 0; index < repairs.length; index += 490) {
                const batch = writeBatch(db);
                repairs.slice(index, index + 490).forEach(repair => {
                    batch.update(doc(db, 'enrollments', repair.id), { paidAmount: repair.paidAmount, balance: repair.balance });
                });
                await batch.commit();
            }
            await fetchDashboardData();
            await showAlert('Balances reconciled', `${repairs.length} enrollment${repairs.length === 1 ? '' : 's'} updated from cleared payment history. Pending transfers and uncleared checks were excluded.`, 'success');
        } catch (err) {
            console.error('Recalculation failed:', err);
            await showAlert('Reconciliation failed', 'The ledger was not fully reconciled. Review the records before retrying.', 'danger');
        } finally {
            setIsFixingSession(false);
        }
    };

    const handleCardClick = (filterType: 'paid' | 'unpaid') => {
        setViewMode('balances');
        setBalanceFilter(filterType);
    };

    const resetLedgerFilters = () => {
        setSearchQuery('');
        setSelectedMonth('');
        setSelectedProgram('All');
        setFilterAudience('all');
        setDateRange({ start: '', end: '' });
        setDatePresetFilter('all');
        setPaymentMethodFilter('all');
        setTransactionStatusFilter('all');
        setBalanceFilter('all');
        setSelectedTransactionIds(new Set());
    };

    const openTransactionEditor = (payment: Payment, suggestedStatus?: Payment['status']) => {
        setEditingTransaction(payment);
        setEditTransactionForm({ ...payment, status: suggestedStatus || payment.status });
    };

    const getLifecycleAction = (payment: Payment): { label: string; status: Payment['status'] } | null => {
        if (payment.method === 'virement' && ['pending', 'pending_verification'].includes(payment.status)) {
            return { label: 'Verify transfer', status: 'verified' };
        }
        if (payment.method === 'check' && payment.status === 'check_received') {
            return { label: 'Deposit check', status: 'check_deposited' };
        }
        if (payment.method === 'check' && payment.status === 'check_deposited') {
            return { label: 'Clear check', status: 'paid' };
        }
        if (payment.method === 'check' && payment.status === 'check_bounced') {
            return { label: 'Review bounced', status: 'check_bounced' };
        }
        return null;
    };

    const handleWhatsApp = async (enrollment: Enrollment, customMsg?: string) => {
        const student = students.find(s => s.id === enrollment.studentId);
        if (!student || !student.parentPhone) {
            await showAlert('Parent phone missing', 'Add a parent phone number before sending a finance reminder.', 'warning');
            return;
        }
        const phone = normalizePhone(student.parentPhone);
        if (!phone) {
            await showAlert('Parent phone invalid', 'Update the parent phone number before sending a finance reminder.', 'warning');
            return;
        }
        const msg = customMsg || `Hello ${student.parentName || 'Parent'}, kindly reminder regarding the outstanding balance of ${formatCurrency(enrollment.balance)} for ${student.name}'s enrollment in ${enrollment.programName}. Thank you.`;
        const shareWindow = window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
        if (!shareWindow) await showAlert('WhatsApp could not open', 'Allow popups for this site, then try the reminder again.', 'warning');
    };

    const handleWhatsAppUpcoming = async (item: { enrollment: Enrollment; dueDate: Date | null; dueAmount: number; source: 'promise' | 'interval' | 'settled'; urgency: string }) => {
        const student = students.find(s => s.id === item.enrollment.studentId);
        if (!student) {
            await showAlert('Student record missing', 'Open the enrollment and reconnect it to a student before sending a reminder.', 'warning');
            return;
        }
        const dueStr = item.dueDate ? item.dueDate.toLocaleDateString('fr-MA', { day: 'numeric', month: 'long', year: 'numeric' }) : 'the next due date';
        const amountText = item.source === 'promise' ? `scheduled instalment of ${formatCurrency(item.dueAmount)}` : `outstanding balance of ${formatCurrency(item.enrollment.balance)}`;
        const msg = `Hello ${student.parentName || 'Parent'}, this is a reminder that the ${amountText} for ${student.name}'s enrollment in ${item.enrollment.programName} is due on ${dueStr}. Thank you.`;
        await handleWhatsApp(item.enrollment, msg);
    };

    const handlePrintParentStatement = (account: any, parentPayments: Payment[]) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showAlert("Warning", "Please allow popups to print statements", "warning");
            return;
        }

        const defaultLogo = `${window.location.origin}/images/logo.png`;
        const logoHtml = `<div class="logo-container"><img src="${settings?.logoUrl || defaultLogo}" alt="Logo" /></div>`;

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Statement of Account - ${account.parentName || 'Parent'}</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
                <style>
                    @media print {
                        @page { margin: 20mm; size: A4; }
                        body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .no-print { display: none; }
                        .container { border: none !important; box-shadow: none !important; padding: 0 !important; }
                    }
                    body { font-family: 'Inter', sans-serif; color: #0f172a; background: #f8fafc; padding: 40px 0; margin: 0; }
                    .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #f1f5f9; padding-bottom: 24px; }
                    .logo-container img { height: 60px; width: auto; object-fit: contain; }
                    .logo-placeholder { width: 50px; height: 50px; background: #2563eb; color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 24px; }
                    .company-details { margin-top: 10px; }
                    .company-name { font-size: 18px; font-weight: 700; }
                    .company-meta { font-size: 12px; color: #64748b; }
                    .title-area { text-align: right; }
                    .title { font-size: 24px; font-weight: 800; text-transform: uppercase; margin: 0 0 5px 0; color: #1e3a8a; }
                    .subtitle { font-size: 12px; color: #64748b; font-family: 'JetBrains Mono', monospace; }
                    .info-group { background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 30px; }
                    .info-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 6px; }
                    .info-val { font-size: 15px; font-weight: 600; }
                    .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #475569; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-top: 30px; margin-bottom: 15px; letter-spacing: 0.5px; }
                    .data-table { width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 20px; }
                    .data-table th { font-size: 11px; font-weight: 600; color: #475569; text-transform: uppercase; padding: 10px 12px; border-bottom: 2px solid #e2e8f0; }
                    .data-table td { font-size: 13px; padding: 12px; border-bottom: 1px solid #e2e8f0; color: #334155; }
                    .data-table font-mono { font-family: 'JetBrains Mono', monospace; }
                    .text-right { text-align: right; }
                    .totals-section { display: flex; flex-direction: column; align-items: flex-end; margin-top: 30px; border-top: 2px solid #e2e8f0; padding-top: 15px; }
                    .totals-row { display: flex; justify-content: space-between; width: 260px; margin-bottom: 8px; font-size: 13px; }
                    .totals-label { color: #64748b; }
                    .totals-val { font-weight: 600; font-family: 'JetBrains Mono', monospace; }
                    .grand-total { margin-top: 8px; padding-top: 8px; border-top: 1px dashed #cbd5e1; }
                    .grand-total .totals-label { font-size: 15px; font-weight: 700; color: #0f172a; }
                    .grand-total .totals-val { font-size: 20px; font-weight: 800; color: ${account.totalBalance > 0 ? '#ef4444' : '#10b981'}; }
                    .footer { text-align: center; margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; line-height: 1.5; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div>
                            ${logoHtml}
                            <div class="company-details">
                                <div class="company-name">${settings?.academyName || currentOrganization?.name || 'Edufy ERP'}</div>
                                <div class="company-meta">${settings?.academicYear || 'Current Year'}</div>
                            </div>
                        </div>
                        <div class="title-area">
                            <h1 class="title">Family Statement</h1>
                            <div class="subtitle">DATE: ${new Date().toLocaleDateString()}</div>
                        </div>
                    </div>

                    <div class="info-group">
                        <div class="info-label">Account Owner / Parent</div>
                        <div class="info-val">${account.parentName || 'Parent Account'}</div>
                        <div class="company-meta" style="margin-top:4px;">Phone: ${account.phone || 'N/A'}</div>
                    </div>

                    <div class="section-title">Children & Enrollments</div>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Child</th>
                                <th>Program</th>
                                <th class="text-right">Total Fee</th>
                                <th class="text-right">Paid</th>
                                <th class="text-right">Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${account.children.map((c: any) => `
                                <tr>
                                    <td style="font-weight:600;">${c.student.name}</td>
                                    <td>
                                        <div>${c.enrollment.programName}</div>
                                        <div style="font-size:10px; color:#64748b;">${c.enrollment.paymentPlan} &middot; ${c.enrollment.packName}</div>
                                    </td>
                                    <td class="text-right font-mono">${formatCurrency(c.enrollment.totalAmount || 0)}</td>
                                    <td class="text-right font-mono" style="color:#10b981;">${formatCurrency(c.enrollment.paidAmount || 0)}</td>
                                    <td class="text-right font-mono" style="font-weight:600;">${formatCurrency(c.enrollment.balance || 0)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="section-title">Payment History</div>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Child</th>
                                <th>Method</th>
                                <th>Reference</th>
                                <th class="text-right">Amount</th>
                                <th style="text-align:center;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${parentPayments.length === 0 ? `
                                <tr><td colSpan="6" style="text-align:center; color:#94a3b8; font-style:italic;">No payments recorded.</td></tr>
                            ` : parentPayments.map((p: Payment) => {
                                const child = account.children.find((c: any) => c.enrollment.id === p.enrollmentId);
                                return `
                                    <tr>
                                        <td style="color:#64748b;">${formatDate(p.date)}</td>
                                        <td>
                                            <div style="font-weight:500;">${child?.student.name || p.studentName}</div>
                                            <div style="font-size:10px; color:#64748b;">${child?.enrollment.programName || ''}</div>
                                        </td>
                                        <td style="text-transform:capitalize;">${p.method}</td>
                                        <td style="color:#64748b;">${p.checkNumber ? `#${p.checkNumber}` : p.bankName || '-'}</td>
                                        <td class="text-right font-mono" style="font-weight:600; color:#10b981;">${formatCurrency(p.amount)}</td>
                                        <td style="text-align:center; text-transform:uppercase; font-size:10px; font-weight:600; color:${['paid', 'verified'].includes(p.status) ? '#10b981' : p.status === 'check_bounced' ? '#ef4444' : '#d97706'};">
                                            ${p.status}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>

                    <div class="totals-section">
                        <div class="totals-row">
                            <span class="totals-label">Total Expected Fee:</span>
                            <span class="totals-val">${formatCurrency(account.totalExpected)}</span>
                        </div>
                        <div class="totals-row">
                            <span class="totals-label">Total Paid Amount:</span>
                            <span class="totals-val" style="color:#10b981;">${formatCurrency(account.totalPaid)}</span>
                        </div>
                        <div class="totals-row grand-total">
                            <span class="totals-label">Outstanding Balance:</span>
                            <span class="totals-val">${formatCurrency(account.totalBalance)}</span>
                        </div>
                    </div>

                    <div class="footer">
                        <div>${settings?.receiptFooter || ''}</div>
                        <div>${settings?.receiptContact || ''}</div>
                        <div style="margin-top:10px; font-size:9px; color:#cbd5e1;">Generated electronically on ${new Date().toLocaleString()}</div>
                    </div>
                </div>
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

 //  Excel Export 
    const handleExportExcel = () => {
        if (dateRangeError) {
            showAlert('Check export period', dateRangeError, 'warning');
            return;
        }
        const selectedPayments = filteredPayments.filter(payment => selectedTransactionIds.has(payment.id));
        const exportPayments = selectedPayments.length > 0 ? selectedPayments : filteredPayments;
        if (exportPayments.length === 0) {
            showAlert('Nothing to export', 'Adjust the filters so at least one transaction is visible.', 'info');
            return;
        }
        const rows = exportPayments.map(p => {
            const enrollment = enrollments.find(e => e.id === p.enrollmentId);
            return {
                'Transaction ID': p.id,
                'Enrollment ID': p.enrollmentId,
                Date: p.date,
                Student: p.studentName,
                Program: enrollment?.programName || '',
                Grade: enrollment?.gradeName || '',
                Amount: p.amount,
                Method: p.method === 'virement' ? 'Bank Transfer' : p.method,
                Status: p.status.replace(/_/g, ' '),
                'Check No.': p.checkNumber || '',
                Bank: p.bankName || '',
                'Deposit Date': p.depositDate || '',
                'Proof Attached': p.proofUrl ? 'Yes' : 'No',
                Cleared: ['paid', 'verified'].includes(p.status) ? 'Yes' : 'No',
                Session: p.session || selectedSession,
            };
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Payments');
        const periodLabel = selectedMonth || (dateRange.start ? `${dateRange.start}_to_${dateRange.end || 'now'}` : datePresetFilter);
        XLSX.writeFile(wb, `payments_${selectedSession}_${periodLabel}_${selectedPayments.length > 0 ? 'selected' : 'filtered'}.xlsx`);
        showAlert('Payment export ready', `${exportPayments.length} ${selectedPayments.length > 0 ? 'selected' : 'filtered'} transaction${exportPayments.length === 1 ? '' : 's'} exported.`, 'success');
    };

    // --- Print Monthly Report PDF ---
    const handlePrintMonthlyReport = () => {
        if (!selectedMonth) return;
        const { installmentUnpaidRows, annualUnpaidRows, paidRows, fullyPaidRows } = monthlyReport;
        const allUnpaid = [...installmentUnpaidRows, ...annualUnpaidRows];
        const totalStudents = installmentUnpaidRows.length + annualUnpaidRows.length + paidRows.length + fullyPaidRows.length;
        const monthLabel = new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' });
        const orgName = (settings as any)?.organizationName || settings?.academyName || currentOrganization?.name || 'Edufy ERP';
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
        if (win) {
            win.document.write(html);
            win.document.close();
        } else {
            showAlert('Monthly report could not open', 'Allow popups for this site, then print the report again.', 'warning');
        }
    };

 //  Urgency Styling 
    const urgencyStyle = (urgency: string) => {
        if (urgency === 'overdue') return { badge: 'bg-red-500/10 text-red-400 border-red-500/20', dot: 'bg-red-500', label: 'Overdue' };
        if (urgency === 'this_week') return { badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-500', label: 'Due this week' };
        return { badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20', dot: 'bg-blue-500', label: 'Due this month' };
    };

    const openFinanceTask = (task: 'families' | 'verify' | 'history' | 'follow-up' | 'reports') => {
        setSearchQuery('');
        setSelectedMonth('');
        setShowFinanceTools(false);
        setShowHistoryFilters(false);
        requestAnimationFrame(() => financeTopRef.current?.scrollIntoView({ block: 'start' }));

        if (task === 'families') {
            setViewMode('balances');
            setBalanceFilter('unpaid');
            setBalanceGrouping('parent');
            return;
        }
        if (task === 'verify') {
            setViewMode('transactions');
            setTransactionStatusFilter('attention');
            setPaymentMethodFilter('all');
            setDatePresetFilter('all');
            return;
        }
        if (task === 'history') {
            setViewMode('transactions');
            setTransactionStatusFilter('all');
            setPaymentMethodFilter('all');
            setDatePresetFilter('all');
            return;
        }
        if (task === 'follow-up') {
            setViewMode('upcoming');
            return;
        }
        setViewMode('reports');
        setFilterAudience('all');
    };

    const goFinanceHome = () => {
        setViewMode('home');
        setSelectedMonth('');
        setSearchQuery('');
        setShowHistoryFilters(false);
        requestAnimationFrame(() => financeTopRef.current?.scrollIntoView({ block: 'start' }));
    };

    const attentionCount = financeCommandStats.pendingVerificationCount
        + financeCommandStats.checkExposureCount
        + financeCommandStats.bouncedCheckCount
        + financeCommandStats.overdueCount;

    const focusedWorkspace = {
        balances: { icon: UserRoundSearch, title: 'Families to collect from', description: 'Find a family, see what remains, and take one clear action.' },
        transactions: transactionStatusFilter === 'attention'
            ? { icon: ShieldCheck, title: 'Verify payments', description: 'Only payments that need a decision are shown.' }
            : { icon: History, title: 'Payment history', description: 'Find a payment, print its receipt, or correct a mistake.' },
        upcoming: { icon: MessageCircle, title: 'Needs follow-up', description: 'Families with a late or upcoming instalment.' },
        reports: { icon: BarChart2, title: 'Payment reports', description: 'Review one month at a time and print when needed.' }
    } as const;

    return (
        <div ref={financeTopRef} className="atlas-module atlas-finance-module flex flex-col gap-4 pb-24 md:pb-8">

 {/*  Header  */}
            <AtlasCommandHeader
                eyebrow="Your daily finance helper"
                title="Finance assistant"
                description="Choose what you need to do. Edufy will guide the rest."
                icon={WalletCards}
                badges={
                    <>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-slate-400">{selectedSession}</span>
                        {selectedMonth && (
                            <span className="rounded-full border border-teal-400/30 bg-teal-400/10 px-2 py-0.5 text-[10px] font-semibold text-teal-200">
                                {new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </span>
                        )}
                    </>
                }
                actions={
                    <>
                        <div className="relative">
                            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                            <select
                                value={selectedSession}
                                onChange={(e) => { setSelectedSession(e.target.value); setSelectedMonth(''); }}
                                className="rounded-lg border border-white/10 bg-slate-950 py-2 pl-9 pr-8 text-sm text-slate-300 outline-none transition hover:bg-slate-900 focus:border-teal-400/60"
                            >
                                {availableSessions.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </>
                }
            />

 {/*  KPI Cards  */}
            {/* ── Session Data Fix Banner (admin only, auto-detected) ── */}
            {can('settings.manage') && sessionMismatch.total > 0 && !fixDone && (
                <div className="flex flex-col gap-3 rounded-lg border border-amber-300/20 bg-amber-300/[0.04] p-3 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="shrink-0 text-amber-200">
                            <Wrench size={18} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-amber-100">Academic session review</p>
                            <p className="mt-0.5 text-xs text-slate-500">{sessionMismatch.total} finance record{sessionMismatch.total === 1 ? '' : 's'} appear assigned to the next academic year.</p>
                        </div>
                    </div>
                    <button
                        onClick={fixSessionData}
                        disabled={isFixingSession}
                        className="flex min-h-9 shrink-0 items-center gap-2 rounded-lg border border-amber-300/25 px-3 text-xs font-bold text-amber-100 transition-colors hover:bg-amber-300/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isFixingSession ? (
                            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Fixing...</>
                        ) : (
                            <><Wrench size={14} /> Review and correct</>
                        )}
                    </button>
                </div>
            )}

            {/* Success message after fix */}
            {fixDone && (
                <div className="flex items-center gap-3 rounded-lg border border-emerald-300/20 bg-emerald-300/[0.04] p-3">
                    <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-emerald-300">Session data corrected!</p>
                        <p className="text-xs text-emerald-400/70">All records updated to <code className="bg-emerald-900/30 px-1 rounded">2025-2026</code>. The view has been switched to show the corrected data.</p>
                    </div>
                </div>
            )}

            {viewMode === 'home' ? (
                <div className="space-y-4">
                    <section className="relative overflow-hidden rounded-lg border border-teal-300/20 bg-teal-300/[0.05] p-5 sm:p-6">
                        <div className="relative">
                            <div className="max-w-2xl">
                                <div className="flex items-center gap-2 text-xs font-bold text-teal-200">
                                    <Sparkles size={15} className="motion-safe:animate-pulse" /> Today
                                </div>
                                <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">
                                    {attentionCount > 0 ? `${attentionCount} finance task${attentionCount === 1 ? '' : 's'} need attention` : 'Everything is up to date'}
                                </h2>
                                <p className="mt-1 text-sm leading-6 text-slate-400">
                                    {attentionCount > 0 ? 'Start with the first task below, or record a payment when a family arrives.' : 'There are no payment exceptions waiting. You can still record a payment or review history.'}
                                </p>
                            </div>
                        </div>
                    </section>

                    <section aria-label="Finance tasks" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                        {can('finance.record_payment') && (
                            <button type="button" onClick={() => onRecordPayment()} className="group min-h-40 rounded-lg border border-teal-300/25 bg-teal-300/[0.06] p-4 text-left transition duration-200 hover:border-teal-200/50 hover:bg-teal-300/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/60 motion-safe:hover:-translate-y-1">
                                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-300 text-slate-950"><CreditCard size={21} className="transition-transform duration-200 motion-safe:group-hover:-rotate-6 motion-safe:group-hover:scale-110" /></span>
                                <span className="mt-5 flex items-center justify-between gap-2"><span className="text-sm font-black text-white sm:text-base">Record a payment</span><ChevronRight size={18} className="shrink-0 text-teal-200 transition-transform motion-safe:group-hover:translate-x-1" /></span>
                                <span className="mt-1 block text-xs leading-5 text-slate-400">Find the child, enter the amount, and create the receipt.</span>
                            </button>
                        )}

                        <button type="button" onClick={() => openFinanceTask('families')} className="group min-h-40 rounded-lg border border-amber-300/20 bg-amber-300/[0.04] p-4 text-left transition duration-200 hover:border-amber-200/40 hover:bg-amber-300/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/50 motion-safe:hover:-translate-y-1">
                            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-300/15 text-amber-200"><UserRoundSearch size={21} className="transition-transform duration-200 motion-safe:group-hover:scale-110" /></span>
                            <span className="mt-5 flex items-center justify-between gap-2"><span className="text-sm font-black text-white sm:text-base">Families to collect from</span><ChevronRight size={18} className="shrink-0 text-amber-200 transition-transform motion-safe:group-hover:translate-x-1" /></span>
                            <span className="mt-1 block text-xs leading-5 text-slate-400">{stats.unpaidCount} learner{stats.unpaidCount === 1 ? '' : 's'} still have an open balance.</span>
                        </button>

                        <button type="button" onClick={() => openFinanceTask('verify')} className="group min-h-40 rounded-lg border border-sky-300/20 bg-sky-300/[0.04] p-4 text-left transition duration-200 hover:border-sky-200/40 hover:bg-sky-300/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/50 motion-safe:hover:-translate-y-1">
                            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-300/15 text-sky-200"><ShieldCheck size={21} className="transition-transform duration-200 motion-safe:group-hover:rotate-6 motion-safe:group-hover:scale-110" /></span>
                            <span className="mt-5 flex items-center justify-between gap-2"><span className="text-sm font-black text-white sm:text-base">Verify payments</span><ChevronRight size={18} className="shrink-0 text-sky-200 transition-transform motion-safe:group-hover:translate-x-1" /></span>
                            <span className="mt-1 block text-xs leading-5 text-slate-400">{financeCommandStats.pendingVerificationCount + financeCommandStats.checkExposureCount + financeCommandStats.bouncedCheckCount} payment{financeCommandStats.pendingVerificationCount + financeCommandStats.checkExposureCount + financeCommandStats.bouncedCheckCount === 1 ? '' : 's'} need a decision.</span>
                        </button>

                        <button type="button" onClick={() => openFinanceTask('history')} className="group min-h-40 rounded-lg border border-white/10 bg-white/[0.025] p-4 text-left transition duration-200 hover:border-white/20 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 motion-safe:hover:-translate-y-1">
                            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/[0.06] text-slate-200"><History size={21} className="transition-transform duration-200 motion-safe:group-hover:-rotate-6 motion-safe:group-hover:scale-110" /></span>
                            <span className="mt-5 flex items-center justify-between gap-2"><span className="text-sm font-black text-white sm:text-base">Payment history</span><ChevronRight size={18} className="shrink-0 text-slate-300 transition-transform motion-safe:group-hover:translate-x-1" /></span>
                            <span className="mt-1 block text-xs leading-5 text-slate-400">Search receipts, print documents, or correct a mistake.</span>
                        </button>
                    </section>

                    <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
                        <div className="rounded-lg border border-white/10 bg-slate-950/45">
                            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                                <div><h3 className="text-sm font-black text-white">Next steps</h3><p className="mt-0.5 text-xs text-slate-500">Only items that need a human decision.</p></div>
                                <span className="rounded-md bg-white/[0.05] px-2 py-1 text-[10px] font-bold text-slate-400">{attentionCount} open</span>
                            </div>
                            <div className="divide-y divide-white/10">
                                {financeCommandStats.overdueCount > 0 && <button type="button" onClick={() => openFinanceTask('follow-up')} className="group flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.035]"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-300/10 text-red-200"><MessageCircle size={17} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-white">Follow up with late families</span><span className="block text-xs text-slate-500">{financeCommandStats.overdueCount} famil{financeCommandStats.overdueCount === 1 ? 'y' : 'ies'} need a reminder.</span></span><ArrowRight size={16} className="text-slate-600 transition-transform motion-safe:group-hover:translate-x-1" /></button>}
                                {financeCommandStats.pendingVerificationCount > 0 && <button type="button" onClick={() => openFinanceTask('verify')} className="group flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.035]"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-300/10 text-amber-200"><Clock size={17} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-white">Verify bank transfers</span><span className="block text-xs text-slate-500">{financeCommandStats.pendingVerificationCount} transfer{financeCommandStats.pendingVerificationCount === 1 ? '' : 's'} waiting.</span></span><ArrowRight size={16} className="text-slate-600 transition-transform motion-safe:group-hover:translate-x-1" /></button>}
                                {financeCommandStats.checkExposureCount > 0 && <button type="button" onClick={() => { openFinanceTask('verify'); setPaymentMethodFilter('check'); setTransactionStatusFilter('all'); }} className="group flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.035]"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-300/10 text-sky-200"><FileText size={17} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-white">Process received checks</span><span className="block text-xs text-slate-500">{financeCommandStats.checkExposureCount} check{financeCommandStats.checkExposureCount === 1 ? '' : 's'} not cleared yet.</span></span><ArrowRight size={16} className="text-slate-600 transition-transform motion-safe:group-hover:translate-x-1" /></button>}
                                {attentionCount === 0 && <div className="flex min-h-36 flex-col items-center justify-center px-6 py-8 text-center"><CheckCircle2 size={28} className="text-teal-300" /><p className="mt-3 text-sm font-bold text-white">All caught up</p><p className="mt-1 text-xs text-slate-500">No payment needs a decision right now.</p></div>}
                            </div>
                        </div>

                        <div className="rounded-lg border border-white/10 bg-slate-950/45 p-4">
                            <p className="text-[10px] font-bold uppercase text-slate-500">This session</p>
                            <p className="mt-2 font-mono text-2xl font-black text-white">{formatCurrency(stats.realizedRevenue)}</p>
                            <p className="mt-1 text-xs text-slate-500">Received and cleared</p>
                            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-teal-300 transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, stats.collectionRate))}%` }} /></div>
                            <div className="mt-2 flex justify-between text-xs"><span className="text-slate-500">Families settled</span><span className="font-bold text-teal-200">{Math.round(stats.collectionRate)}%</span></div>
                            <button type="button" onClick={() => setShowFinanceTools(previous => !previous)} className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/10 text-xs font-bold text-slate-300 transition hover:bg-white/[0.04] hover:text-white"><SlidersHorizontal size={15} /> Reports and tools</button>
                        </div>
                    </section>

                    {showFinanceTools && (
                        <section className="grid gap-2 rounded-lg border border-white/10 bg-slate-950/70 p-3 sm:grid-cols-3">
                            <button type="button" onClick={() => openFinanceTask('reports')} className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-left text-sm font-bold text-slate-200 transition hover:bg-white/[0.05]"><BarChart2 size={17} className="text-teal-200" /> Payment reports</button>
                            <button type="button" onClick={() => { setViewMode('balances'); setBalanceFilter('all'); setBalanceGrouping('student'); setShowFinanceTools(false); }} className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-left text-sm font-bold text-slate-200 transition hover:bg-white/[0.05]"><Users size={17} className="text-sky-200" /> All student accounts</button>
                            {can('settings.manage') && <button type="button" onClick={handleRecalculateBalances} disabled={isFixingSession} className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-left text-sm font-bold text-slate-200 transition hover:bg-white/[0.05] disabled:opacity-50"><RefreshCw size={17} className={`text-amber-200 ${isFixingSession ? 'animate-spin' : ''}`} /> Check balance records</button>}
                        </section>
                    )}
                </div>
            ) : (
                <>
                    <section className="flex flex-col gap-3 rounded-lg border border-white/10 bg-slate-950/45 p-3 sm:flex-row sm:items-center">
                        <button type="button" onClick={goFinanceHome} className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-bold text-slate-300 transition hover:bg-white/[0.05] hover:text-white"><ArrowLeft size={16} /> Finance home</button>
                        {(() => { const WorkspaceIcon = focusedWorkspace[viewMode].icon; return <div className="flex min-w-0 flex-1 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-300/10 text-teal-200"><WorkspaceIcon size={19} /></span><div className="min-w-0"><h2 className="truncate text-base font-black text-white">{focusedWorkspace[viewMode].title}</h2><p className="truncate text-xs text-slate-500">{focusedWorkspace[viewMode].description}</p></div></div>; })()}
                        {can('finance.record_payment') && viewMode !== 'reports' && <button type="button" onClick={() => onRecordPayment()} className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-teal-300 px-4 text-xs font-black text-slate-950 transition hover:bg-teal-200"><CreditCard size={16} /> Record payment</button>}
                    </section>

 {/*  Monthly Revenue Chart  */}
            {viewMode === 'reports' && can('finance.view_totals') && monthlyChartData.length > 0 && (
                <div className="overflow-hidden rounded-lg border border-white/10 bg-slate-950/55">
                    <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-white">
                            <BarChart2 size={16} className="text-emerald-400" />
                            Monthly collection history &mdash; {selectedSession}
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
                        </div>
                    </div>

                    <div className="space-y-1.5 px-4 pb-4">
                            {monthlyChartData.map(m => (
                                <button
                                    type="button"
                                    key={m.key}
                                    className={`group flex w-full items-center gap-3 rounded-lg px-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 ${
                                        m.isSelected ? 'bg-emerald-950/30' : 'hover:bg-slate-800/30'
                                    }`}
                                    onClick={() => {
                                        const nextMonth = m.isSelected ? '' : m.key;
                                        setSelectedMonth(nextMonth);
                                    }}
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
                                </button>
                            ))}
                    </div>
                </div>
            )}

 {/*  Main Table Panel  */}
            <div className="rounded-lg border border-white/10 bg-slate-950/45">

                {/* Toolbar */}
                <div className="sticky top-0 z-20 space-y-3 border-b border-white/10 bg-slate-950 p-3">
                    <div className="flex flex-col gap-3">
                        <div className="flex w-full flex-wrap gap-2">
                            {viewMode === 'reports' && (
                                <div className="flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-slate-950 px-3">
                                    <Calendar size={14} className="text-teal-300" />
                                    <input
                                        type="month"
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        className="min-w-32 bg-transparent text-sm text-slate-200 outline-none"
                                        aria-label="Report month"
                                    />
                                    {selectedMonth && <button type="button" onClick={() => setSelectedMonth('')} className="text-lg leading-none text-slate-500 transition hover:text-white" title="Clear report month">&times;</button>}
                                </div>
                            )}
                            {viewMode !== 'reports' && (
                            <div className="relative min-w-52 flex-1 xl:w-64 xl:flex-none">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder={viewMode === 'balances' ? 'Student or parent' : viewMode === 'upcoming' ? 'Student or program' : 'Student, check or reference'}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 outline-none"
                                />
                            </div>
                            )}
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5" />
                                <select value={selectedProgram} onChange={(e) => setSelectedProgram(e.target.value)} className="pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg appearance-none focus:border-emerald-500 outline-none cursor-pointer">
                                    <option value="All">All Programs</option>
                                    {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            {viewMode === 'transactions' && (
                                <button type="button" onClick={() => setShowHistoryFilters(previous => !previous)} className={`flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs font-bold transition ${showHistoryFilters ? 'border-teal-300/30 bg-teal-300/10 text-teal-200' : 'border-white/10 text-slate-400 hover:bg-white/[0.04] hover:text-white'}`}>
                                    <SlidersHorizontal size={14} /> More filters
                                </button>
                            )}
                            {viewMode === 'transactions' && transactionStatusFilter === 'attention' && (
                                <button type="button" onClick={() => setTransactionStatusFilter('all')} className="flex min-h-10 items-center gap-2 rounded-lg border border-amber-300/20 bg-amber-300/[0.06] px-3 text-xs font-bold text-amber-100 transition hover:bg-amber-300/10" title="Show all payments">
                                    <ShieldCheck size={14} /> Needs review only <span aria-hidden="true">&times;</span>
                                </button>
                            )}
 {/* Excel Export  transactions only */}
                            {viewMode === 'transactions' && can('finance.view_totals') && (
                                <button
                                    onClick={handleExportExcel}
                                    disabled={filteredPayments.length === 0 || !!dateRangeError}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-colors border border-slate-700"
                                    title={dateRangeError || (filteredPayments.length === 0 ? 'No visible transactions to export' : selectedTransactionIds.size > 0 ? 'Export selected transactions to Excel' : 'Export filtered transactions to Excel')}
                                >
                                    <Download size={14} /> {selectedTransactionIds.size > 0 ? `Export selected (${selectedTransactionIds.size})` : `Export (${filteredPayments.length})`}
                                </button>
                            )}
 {/* Print Monthly Report  balances + month selected */}
                            {viewMode === 'reports' && selectedMonth && can('finance.view_totals') && (
                                <button
                                    onClick={handlePrintMonthlyReport}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-800/60 hover:bg-emerald-700/70 text-emerald-200 hover:text-white rounded-lg text-xs font-bold transition-colors border border-emerald-700/50"
                                    title="Open the monthly report print dialog"
                                >
                                    <Printer size={14} /> Print Report
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Transaction secondary filters */}
                    {viewMode === 'transactions' && showHistoryFilters && (
                        <div className="flex flex-col gap-3 border-t border-slate-800/50 pt-2">
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Date Filter:</span>
                                    <select value={datePresetFilter} onChange={(e) => { setDatePresetFilter(e.target.value as any); setSelectedMonth(''); if (e.target.value !== 'custom') setDateRange({start:'', end:''}); }} className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none cursor-pointer">
                                        <option value="all">All Time</option>
                                        <option value="today">Today</option>
                                        <option value="this_week">This Week</option>
                                        <option value="this_month">This Month</option>
                                        <option value="custom">Custom Date Range...</option>
                                    </select>
                                </div>
                                {datePresetFilter === 'custom' && (
                                    <div className="flex items-center gap-2">
                                        <input type="date" max={dateRange.end || undefined} className={`bg-slate-950 border rounded px-2 py-1 text-xs text-white ${dateRangeError ? 'border-red-400/60' : 'border-slate-800'}`} value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} aria-invalid={!!dateRangeError} />
                                        <span className="text-slate-600 text-xs"> &middot;  &middot; </span>
                                        <input type="date" min={dateRange.start || undefined} className={`bg-slate-950 border rounded px-2 py-1 text-xs text-white ${dateRangeError ? 'border-red-400/60' : 'border-slate-800'}`} value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} aria-invalid={!!dateRangeError} />
                                    </div>
                                )}
                                <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Method:</span>
                                    <select value={paymentMethodFilter} onChange={(e) => setPaymentMethodFilter(e.target.value as any)} className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none cursor-pointer">
                                        <option value="all">All Methods</option>
                                        <option value="cash">Cash</option>
                                        <option value="virement">Transfer</option>
                                        <option value="check">Cheque</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Status:</span>
                                    <select value={transactionStatusFilter} onChange={(e) => setTransactionStatusFilter(e.target.value)} className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none cursor-pointer">
                                        <option value="all">All Statuses</option>
                                        <option value="attention">Needs Review</option>
                                        <option value="cleared">Cleared (Paid / Verified)</option>
                                        <option value="check_received">Check Received</option>
                                        <option value="check_deposited">Check Deposited</option>
                                        <option value="check_bounced">Bounced</option>
                                        <option value="pending_verification">Pending Transfer</option>
                                    </select>
                                </div>
                                {(dateRange.start || dateRange.end || transactionStatusFilter !== 'all' || paymentMethodFilter !== 'all' || datePresetFilter !== 'all') && (
                                    <button onClick={() => { setDateRange({ start: '', end: '' }); setTransactionStatusFilter('all'); setPaymentMethodFilter('all'); setDatePresetFilter('all'); }} className="text-xs text-red-400 hover:underline ml-2">Clear Filters</button>
                                )}
                                {dateRangeError && <span className="text-xs font-bold text-red-300" role="alert">{dateRangeError}</span>}
                                <div className="ml-auto text-xs text-slate-500">
                                    {filteredPayments.length} transactions &middot; {formatCurrency(filteredPayments.filter(p => ['paid', 'verified'].includes(p.status)).reduce((s, p) => s + p.amount, 0))} cleared
                                </div>
                            </div>

                            {selectedTransactionIds.size > 0 && (
                                <div className="flex flex-wrap items-center gap-4 rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-3 text-sm">
                                    <div className="font-bold text-emerald-400 flex items-center gap-2">
                                        <CheckCircle2 size={16} /> {selectedTransactionIds.size} Selected
                                    </div>
                                    <div className="flex gap-4 items-center">
                                        <div className="text-slate-300">Total: <span className="font-bold text-white font-mono ml-1">{formatCurrency(selectedSummary.total)}</span></div>
                                        {selectedSummary.cash > 0 && <div className="text-slate-400 text-xs">Cash: <span className="font-mono text-emerald-400">{formatCurrency(selectedSummary.cash)}</span></div>}
                                        {selectedSummary.transfer > 0 && <div className="text-slate-400 text-xs">Transfer: <span className="font-mono text-blue-400">{formatCurrency(selectedSummary.transfer)}</span></div>}
                                        {selectedSummary.check > 0 && <div className="text-slate-400 text-xs">Cheque: <span className="font-mono text-purple-400">{formatCurrency(selectedSummary.check)}</span></div>}
                                    </div>
                                    <button onClick={() => setSelectedTransactionIds(new Set())} className="ml-auto text-xs text-slate-400 hover:text-white underline">Deselect All</button>
                                </div>
                            )}
                        </div>
                    )}

 {/* Balance secondary filters  hide in monthly report mode */}
                    {viewMode === 'balances' && !selectedMonth && (
                        <div className="flex flex-wrap items-center gap-3 border-t border-slate-800/50 pt-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-500">Show</span>
                                {(['all', 'paid', 'unpaid'] as const).map(f => (
                                    <button key={f} onClick={() => setBalanceFilter(f)} className={`min-h-8 rounded-md border px-3 text-xs font-medium transition-colors ${balanceFilter === f
                                        ? f === 'paid' ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900' : f === 'unpaid' ? 'bg-red-950/30 text-red-400 border-red-900' : 'bg-slate-800 text-white border-slate-600'
                                        : 'text-slate-500 border-transparent hover:bg-slate-900'}`}>
                                        {f === 'all' ? 'Everyone' : f === 'paid' ? 'Settled' : 'Needs payment'}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
                                <span className="text-xs font-bold text-slate-500">View as</span>
                                {(['student', 'parent'] as const).map(m => (
                                    <button key={m} onClick={() => setBalanceGrouping(m)} className={`min-h-8 rounded-md border px-3 text-xs font-medium transition-colors ${balanceGrouping === m ? 'bg-sky-900/30 text-sky-300 border-sky-800' : 'text-slate-500 border-transparent hover:bg-slate-900'}`}>
                                        {m === 'student' ? 'Students' : 'Families'}
                                    </button>
                                ))}
                            </div>
                            <div className="ml-auto text-xs text-slate-500">{balanceGrouping === 'student' ? `${filteredEnrollments.length} students` : `${parentAccounts.length} parent accounts`}</div>
                        </div>
                    )}
                    {viewMode === 'reports' && selectedMonth && (() => {
                        const { installmentUnpaidRows, annualUnpaidRows, fullyPaidRows, paidRows } = monthlyReport;
                        return (
                        <div className="flex items-center gap-2 border-t border-slate-800/50 pt-2 text-xs text-emerald-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            Monthly report for <strong className="text-emerald-300">{new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}</strong>
                            <span className="text-slate-500 ml-1">
                                &middot; {paidRows.length} paid this month
                                {installmentUnpaidRows.length > 0 && <span className="text-red-400"> &middot; {installmentUnpaidRows.length} missed installment</span>}
                                {annualUnpaidRows.length > 0 && <span className="text-amber-400"> &middot; {annualUnpaidRows.length} annual fee pending</span>}
                            </span>
                        </div>
                        );
                    })()}
                </div>

                {viewMode === 'balances' && !selectedMonth && can('finance.view_totals') && (
                    <div className="grid grid-cols-3 gap-px border-b border-white/10 bg-white/10">
                        <button type="button" onClick={() => handleCardClick('unpaid')} className="bg-slate-950 px-3 py-3 text-left transition-colors hover:bg-red-300/[0.05] sm:px-4">
                            <span className="block text-[10px] font-bold uppercase text-slate-500">Open balance</span>
                            <span className="mt-1 block font-mono text-sm font-black text-red-200 sm:text-lg">{formatCurrency(stats.totalOutstanding)}</span>
                            <span className="mt-0.5 block text-[10px] text-slate-600">{stats.unpaidCount} learners</span>
                        </button>
                        <div className="bg-slate-950 px-3 py-3 sm:px-4">
                            <span className="block text-[10px] font-bold uppercase text-slate-500">Collected</span>
                            <span className="mt-1 block font-mono text-sm font-black text-white sm:text-lg">{formatCurrency(stats.realizedRevenue)}</span>
                            <span className="mt-0.5 block text-[10px] text-slate-600">{selectedSession}</span>
                        </div>
                        <div className="bg-slate-950 px-3 py-3 sm:px-4">
                            <span className="block text-[10px] font-bold uppercase text-slate-500">Settled</span>
                            <span className="mt-1 block font-mono text-sm font-black text-white sm:text-lg">{Math.round(stats.collectionRate)}%</span>
                            <span className="mt-0.5 block text-[10px] text-slate-600">{stats.paidCount} complete</span>
                        </div>
                    </div>
                )}

                {/* DATA: MONTHLY COLLECTION REPORT */}
                {viewMode === 'reports' && !selectedMonth && (
                    <div className="flex min-h-56 flex-col items-center justify-center border-b border-white/10 px-6 py-12 text-center">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-teal-300/20 bg-teal-300/[0.06] text-teal-200">
                            <BarChart2 size={20} />
                        </div>
                        <h3 className="mt-4 text-sm font-bold text-white">Choose a month to review</h3>
                        <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">Select a month above or choose one from collection history to see paid, missed, and outstanding accounts.</p>
                    </div>
                )}

                {viewMode === 'reports' && selectedMonth && (() => {
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
                                        <div className="flex shrink-0 gap-1">
                                            <button onClick={() => handleWhatsApp(enrollment)} className="p-2 hover:bg-slate-800 rounded-lg text-emerald-500 border border-slate-700 transition-colors" title="Send reminder"><Phone size={15} /></button>
                                            {can('finance.record_payment') && <button onClick={() => onRecordPayment(enrollment.studentId)} className="p-2 hover:bg-slate-800 rounded-lg text-blue-400 border border-slate-700 transition-colors" title="Record payment"><CreditCard size={15} /></button>}
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
                                        <div className="flex shrink-0 gap-1">
                                            <button onClick={() => handleWhatsApp(enrollment)} className="p-2 hover:bg-slate-800 rounded-lg text-emerald-500 border border-slate-700 transition-colors" title="Send reminder"><Phone size={15} /></button>
                                            {can('finance.record_payment') && <button onClick={() => onRecordPayment(enrollment.studentId)} className="p-2 hover:bg-slate-800 rounded-lg text-blue-400 border border-slate-700 transition-colors" title="Record payment"><CreditCard size={15} /></button>}
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
                                        <button onClick={() => navigateTo('student-details', { studentId: enrollment.studentId })} className="rounded p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-white" title="Open student profile"><Eye size={14} /></button>
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
                                        <div className="flex shrink-0 gap-1">
                                            {(enrollment.balance || 0) > 0 && can('finance.record_payment') && (
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
                                <p className="font-bold text-white">No students match this monthly report</p>
                                <p className="mt-1 text-xs">The selected month, program, audience, or search query removed every record.</p>
                                <button type="button" onClick={resetLedgerFilters} className="mt-4 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/[0.08]">Reset ledger filters</button>
                            </div>
                        )}
                    </div>
                    );
                })()}


 {/*  DATA: BALANCES (normal mode, no month selected)  */}
                {viewMode === 'balances' && !selectedMonth && (
                    <div className="overflow-x-auto">
                    <table className="w-full table-fixed border-collapse text-left text-sm">
                        <thead className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="p-4">{balanceGrouping === 'student' ? 'Student' : 'Family'}</th>
                                <th className="hidden p-4 md:table-cell">{balanceGrouping === 'student' ? 'Program' : 'Children'}</th>
                                <th className="hidden p-4 lg:table-cell">{balanceGrouping === 'student' ? 'Plan' : ''}</th>
                                <th className="hidden p-4 text-right lg:table-cell">Agreed fee</th>
                                <th className="hidden p-4 text-right md:table-cell">Received</th>
                                <th className="w-28 p-3 text-right sm:w-36 sm:p-4">Remaining</th>
                                <th className="w-28 p-3 text-right sm:w-36 sm:p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {balanceGrouping === 'student' ? (
                                filteredEnrollments.length === 0
                                    ? <tr><td colSpan={7} className="p-8 text-center"><div className="font-bold text-white">No student balances match</div><div className="mt-1 text-xs text-slate-500">Reset the search, program, audience, and balance filters to restore the ledger.</div><button type="button" onClick={resetLedgerFilters} className="mt-3 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/[0.05]">Reset filters</button></td></tr>
                                    : filteredEnrollments.map(enrollment => (
                                        <tr key={enrollment.id} className="hover:bg-slate-800/50 transition-colors group">
                                            <td className="p-4">
                                                <div className="font-bold text-white">{enrollment.studentName}</div>
                                                <div className="text-[10px] text-slate-500 uppercase">{enrollment.gradeName} &middot; {enrollment.groupName}</div>
                                                <div className="mt-1 truncate text-[10px] text-blue-300 md:hidden">{enrollment.programName}</div>
                                            </td>
                                            <td className="hidden p-4 md:table-cell">
                                                <div className="text-xs text-blue-300">{enrollment.programName}</div>
                                                <div className="text-[10px] text-slate-500">{enrollment.packName}</div>
                                            </td>
                                            <td className="hidden p-4 lg:table-cell">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                                                    {enrollment.paymentPlan}
                                                </span>
                                            </td>
                                            <td className="hidden p-4 text-right font-mono text-sm text-slate-300 lg:table-cell">{formatCurrency(enrollment.totalAmount || 0)}</td>
                                            <td className="hidden p-4 text-right font-mono text-sm text-emerald-400 md:table-cell">{formatCurrency(enrollment.paidAmount || 0)}</td>
                                            <td className="p-3 text-right sm:p-4">
                                                <span className={`font-bold font-mono px-2 py-1 rounded text-sm ${(enrollment.balance || 0) > 0 ? 'bg-red-950/30 text-red-400 border border-red-900/50' : 'text-slate-500'}`}>
                                                    {formatCurrency(enrollment.balance || 0)}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-1">
                                                    {enrollment.balance > 0 && (
                                                        <button onClick={() => handleWhatsApp(enrollment)} className="p-2 hover:bg-slate-800 rounded text-emerald-500 transition-colors" title="Send Reminder (WhatsApp)">
                                                            <Phone size={16} />
                                                        </button>
                                                    )}
                                                    {can('finance.record_payment') && <button onClick={() => onRecordPayment(enrollment.studentId)} className="p-2 hover:bg-slate-800 rounded text-blue-400 transition-colors" title="Record Payment"><CreditCard size={16} /></button>}
                                                    <button onClick={() => navigateTo('student-details', { studentId: enrollment.studentId })} className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors" title="View Profile">
                                                        <Eye size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                            ) : (
                                parentAccounts.length === 0
                                    ? <tr><td colSpan={7} className="p-8 text-center"><div className="font-bold text-white">No parent accounts match</div><div className="mt-1 text-xs text-slate-500">Parent accounts are built from active tenant enrollments and normalized parent phone numbers.</div><button type="button" onClick={resetLedgerFilters} className="mt-3 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/[0.05]">Reset filters</button></td></tr>
                                    : parentAccounts.map((account, index) => (
                                        <tr key={index} className="hover:bg-slate-800/50 transition-colors group">
                                            <td className="p-4">
                                                <div className="font-bold text-white flex items-center gap-2">
                                                    <Users size={16} className="text-blue-400" />
                                                    <span className="truncate">{account.parentName || account.children.map((child: any) => child.student.name).join(', ') || 'Family'}</span>
                                                </div>
                                                <div className="mt-1 truncate text-xs text-slate-500">{account.parentName ? account.children.map((child: any) => child.student.name).join(', ') : account.phone || 'No family phone'}</div>
                                            </td>
                                            <td className="hidden p-4 md:table-cell">
                                                <div className="flex flex-col gap-1">
                                                    {account.children.map((c: any, i: number) => (
                                                        <div key={i} className="text-xs text-slate-300 bg-slate-900 px-2 py-1 rounded inline-flex w-max items-center gap-1">
                                                            <span className="font-bold">{c.student.name}</span>
                                                            <span className="text-[10px] text-slate-500">({c.enrollment.programName})</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="hidden p-4 lg:table-cell"></td>
                                            <td className="hidden p-4 text-right font-mono text-sm text-slate-300 lg:table-cell">{formatCurrency(account.totalExpected)}</td>
                                            <td className="hidden p-4 text-right font-mono text-sm text-emerald-400 md:table-cell">{formatCurrency(account.totalPaid)}</td>
                                            <td className="p-3 text-right sm:p-4">
                                                <span className={`font-bold font-mono px-2 py-1 rounded text-sm ${account.totalBalance > 0 ? 'bg-red-950/30 text-red-400 border border-red-900/50' : 'text-slate-500'}`}>
                                                    {formatCurrency(account.totalBalance)}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right sm:p-4">
                                                <div className="flex justify-end gap-1">
                                                    <button 
                                                        onClick={() => {
                                                            setStatementAccount(account);
                                                            setIsStatementModalOpen(true);
                                                        }}
                                                        className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                                                        title="View Statement of Account"
                                                    >
                                                        <FileText size={16} />
                                                    </button>
                                                    {account.totalBalance > 0 && account.children.length > 1 && can('finance.record_payment') && (
                                                        <button 
                                                            onClick={() => {
                                                                setParentPaymentAccount(account);
                                                                setParentPaymentForm(prev => ({ ...prev, amount: account.totalBalance.toString() as any }));
                                                                setIsParentPaymentModalOpen(true);
                                                            }} 
                                                            className="flex min-h-9 items-center gap-1 rounded border border-blue-900/50 bg-blue-950/20 p-2 text-xs font-bold text-blue-400 transition-colors hover:bg-blue-900/50"
                                                            title="Record one payment for this family"
                                                        >
                                                            <CreditCard size={14} /> <span className="hidden sm:inline">Family payment</span>
                                                        </button>
                                                    )}
                                                    {account.totalBalance > 0 && account.children.length === 1 && can('finance.record_payment') && (
                                                        <button onClick={() => onRecordPayment(account.children[0].student.id)} className="p-2 hover:bg-slate-800 rounded text-blue-400 transition-colors" title="Record Payment">
                                                            <CreditCard size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                            )}
                        </tbody>
                    </table>
                    </div>
                )}

 {/*  DATA: TRANSACTIONS  */}
                {viewMode === 'transactions' && (
                    <div className="overflow-x-auto">
                    <table className="w-full table-fixed border-collapse text-left text-sm">
                        <thead className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="hidden w-12 p-4 text-center sm:table-cell">
                                    <input 
                                        type="checkbox" 
                                        className="accent-emerald-500 w-3.5 h-3.5 cursor-pointer"
                                        checked={filteredPayments.length > 0 && selectedTransactionIds.size === filteredPayments.length}
                                        onChange={handleSelectAllTransactions}
                                    />
                                </th>
                                <th className="hidden w-32 p-4 md:table-cell">Date</th>
                                <th className="p-4">Student</th>
                                <th className="hidden p-4 lg:table-cell">Program</th>
                                <th className="w-28 p-3 sm:w-36 sm:p-4">Amount</th>
                                <th className="hidden p-4 lg:table-cell">Method</th>
                                <th className="hidden p-4 md:table-cell">Status</th>
                                <th className="w-36 p-3 text-right sm:w-44 sm:p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredPayments.length === 0
                                ? <tr><td colSpan={8} className="p-8 text-center"><div className="font-bold text-white">No transactions match</div><div className="mt-1 text-xs text-slate-500">No export will be generated until the period or transaction filters return records.</div><button type="button" onClick={resetLedgerFilters} className="mt-3 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/[0.05]">Reset filters</button></td></tr>
                                : filteredPayments.map(payment => {
                                    const enrollment = enrollments.find(e => e.id === payment.enrollmentId);
                                    const student = students.find(s => s.id === enrollment?.studentId);
                                    const lifecycleAction = getLifecycleAction(payment);
                                    return (
                                        <tr key={payment.id} className={`transition-colors group ${selectedTransactionIds.has(payment.id) ? 'bg-emerald-900/10 hover:bg-emerald-900/20' : 'hover:bg-slate-800/50'}`}>
                                            <td className="hidden p-4 text-center sm:table-cell">
                                                <input 
                                                    type="checkbox" 
                                                    className="accent-emerald-500 w-3.5 h-3.5 cursor-pointer"
                                                    checked={selectedTransactionIds.has(payment.id)}
                                                    onChange={() => toggleTransactionSelection(payment.id)}
                                                />
                                            </td>
                                            <td className="hidden p-4 font-mono text-xs text-slate-400 md:table-cell">{formatDate(payment.date)}</td>
                                            <td className="p-3 font-medium text-white sm:p-4"><span className="block truncate">{payment.studentName}</span><span className="mt-1 block text-[10px] font-normal capitalize text-slate-500 md:hidden">{formatDate(payment.date)} &middot; {payment.method === 'virement' ? 'Transfer' : payment.method}</span></td>
                                            <td className="hidden p-4 text-xs text-blue-300 lg:table-cell">{enrollment?.programName || ' &middot;  &middot; '}</td>
                                            <td className="p-3 font-mono font-bold text-white sm:p-4">
                                                {can('finance.view_totals') ? formatCurrency(payment.amount) : '***'}
                                            </td>
                                            <td className="hidden p-4 lg:table-cell">
                                                <div className="flex items-center gap-2 text-slate-300 capitalize text-xs">
                                                    {payment.method === 'cash' && <DollarSign size={14} className="text-blue-400" />}
                                                    {payment.method === 'check' && <FileText size={14} className="text-purple-400" />}
                                                    {payment.method === 'virement' && <Building size={14} className="text-pink-400" />}
                                                    {payment.method === 'virement' ? 'Transfer' : payment.method}
                                                    {payment.checkNumber && <span className="text-slate-600 font-mono text-[10px]">#{payment.checkNumber}</span>}
                                                </div>
                                            </td>
                                            <td className="hidden p-4 md:table-cell">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${['paid', 'verified'].includes(payment.status) ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/50' : payment.status === 'check_bounced' ? 'bg-red-950/30 text-red-400 border-red-900/50' : 'bg-amber-950/30 text-amber-400 border-amber-900/50'}`}>
                                                    {payment.status.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right sm:p-4">
                                                <div className="flex justify-end gap-1">
                                                    {lifecycleAction && can('finance.record_payment') && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openTransactionEditor(payment, lifecycleAction.status)}
                                                            className="min-h-8 rounded-md border border-amber-300/20 bg-amber-300/[0.05] px-2.5 text-[11px] font-bold text-amber-100 transition-colors hover:bg-amber-300/10"
                                                        >
                                                            {lifecycleAction.label}
                                                        </button>
                                                    )}
                                                    <button onClick={() => navigateTo('activity-details', { activityId: { type: 'payment', id: payment.id } })} className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-blue-400 transition-colors" title="View Details">
                                                        <Eye size={16} />
                                                    </button>
                                                    {can('finance.record_payment') && (
                                                        <button onClick={() => openTransactionEditor(payment)} className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-blue-400 transition-colors" title="Edit transaction and reconcile linked balance">
                                                            <Wrench size={16} />
                                                        </button>
                                                    )}
                                                    <button disabled={!['paid', 'verified'].includes(payment.status)} onClick={() => generateReceipt(payment, enrollment, student, settings)} className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-400 transition-colors disabled:cursor-not-allowed disabled:opacity-30" title={['paid', 'verified'].includes(payment.status) ? 'Print cleared payment receipt' : 'Receipt available when payment clears'}>
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
                    </div>
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

                                {upcomingPayments.map(({ enrollment, dueDate, dueAmount, source, urgency }) => {
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
                                                    <div className="text-[10px] text-slate-500">{source === 'promise' ? 'Scheduled instalment' : 'Balance'}</div>
                                                    <div className="font-bold text-amber-300 font-mono">{formatCurrency(dueAmount)}</div>
                                                    {source === 'promise' && <div className="text-[10px] text-slate-600">{formatCurrency(enrollment.balance)} total open</div>}
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div className="flex gap-2 shrink-0">
                                                <button
                                                    onClick={() => handleWhatsAppUpcoming({ enrollment, dueDate, dueAmount, source, urgency })}
                                                    className="p-2 hover:bg-slate-700 rounded-lg text-emerald-500 hover:text-emerald-400 transition-colors border border-slate-700"
                                                    title="Send payment reminder via WhatsApp"
                                                >
                                                    <MessageCircle size={16} />
                                                </button>
                                                {can('finance.record_payment') && <button onClick={() => onRecordPayment(enrollment.studentId)} className="p-2 hover:bg-slate-700 rounded-lg text-blue-400 transition-colors border border-slate-700" title="Record Payment"><CreditCard size={16} /></button>}
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
                </>
            )}

            {/* --- PARENT PAYMENT MODAL --- */}
            <Modal isOpen={isParentPaymentModalOpen} onClose={() => setIsParentPaymentModalOpen(false)} title="Record Bulk Parent Payment" size="md">
                {parentPaymentAccount && (
                    <form onSubmit={handleSubmitParentPayment} className="space-y-5">
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <h3 className="font-bold text-white mb-1">{parentPaymentAccount.parentName || 'Parent Account'}</h3>
                            <p className="text-xs text-slate-400 mb-3">{parentPaymentAccount.phone || 'No phone'}</p>
                            
                            <div className="space-y-2">
                                {parentPaymentAccount.children.map((c: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center text-sm border-t border-slate-700 pt-2">
                                        <span className="text-slate-300">{c.student.name}</span>
                                        <span className={`font-mono ${(c.enrollment.balance || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                            Due: {formatCurrency(c.enrollment.balance || 0)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between items-center mt-3 pt-3 border-t-2 border-slate-700/80 font-bold">
                                <span className="text-white text-sm">Total Outstanding</span>
                                <span className="text-red-400 font-mono">{formatCurrency(parentPaymentAccount.totalBalance)}</span>
                            </div>
                        </div>

                        <div className="bg-blue-950/30 p-3 rounded-lg border border-blue-900/50 flex gap-3 items-start">
                            <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-200">
                                The payment amount will be automatically split and applied across the children's outstanding balances, starting with the oldest enrollments first.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Amount to pay ({settings.currencySymbol || 'MAD'})</label>
                                <input required type="number" min="0.01" max={parentPaymentAccount.totalBalance} step="0.01" className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-bold text-lg focus:border-emerald-500 outline-none" value={parentPaymentForm.amount} onChange={e => setParentPaymentForm({ ...parentPaymentForm, amount: e.target.value as any })} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
                                <input required type="date" className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:border-blue-500 outline-none" value={parentPaymentForm.date} onChange={e => setParentPaymentForm({ ...parentPaymentForm, date: e.target.value })} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Payment Method</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['cash', 'check', 'virement'].map(m => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => setParentPaymentForm({ ...parentPaymentForm, method: m as any, checkNumber: m === 'check' ? parentPaymentForm.checkNumber : '', bankName: m === 'check' ? parentPaymentForm.bankName : '', depositDate: m === 'check' ? parentPaymentForm.depositDate : '', proofUrl: m === 'virement' ? parentPaymentForm.proofUrl : '' })}
                                        className={`py-2 rounded-lg text-xs font-bold capitalize border transition-all ${parentPaymentForm.method === m ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600'}`}
                                    >
                                        {m === 'virement' ? 'Transfer' : m}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {parentPaymentForm.method === 'check' && (
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 animate-in slide-in-from-top-2">
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Check No.</label><input required className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white text-sm" value={parentPaymentForm.checkNumber} onChange={e => setParentPaymentForm({ ...parentPaymentForm, checkNumber: e.target.value })} placeholder="e.g. 739201" /></div>
                                    <div><label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Bank</label><input required className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white text-sm" value={parentPaymentForm.bankName} onChange={e => setParentPaymentForm({ ...parentPaymentForm, bankName: e.target.value })} placeholder="e.g. BMCE" /></div>
                                </div>
                                <div><label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Planned deposit date (optional)</label><input type="date" min={parentPaymentForm.date} className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white text-sm" value={parentPaymentForm.depositDate} onChange={e => setParentPaymentForm({ ...parentPaymentForm, depositDate: e.target.value })} /></div>
                            </div>
                        )}

                        {parentPaymentForm.method === 'virement' && (
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 animate-in slide-in-from-top-2">
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-2">Proof of transfer (required)</label>
                                    <div className="flex items-center gap-3">
                                        <label className="cursor-pointer bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition-colors">
                                            <Upload size={14} /> Upload Image
                                            <input type="file" accept="image/*" className="hidden" onChange={handleProofUpload} />
                                        </label>
                                        {parentPaymentForm.proofUrl && <div className="text-emerald-400 text-xs flex items-center gap-1"><ImageIcon size={14} /> Attached</div>}
                                    </div>
                                </div>
                            </div>
                        )}

                        <button type="submit" disabled={isSubmittingParentPayment} className="w-full py-3 bg-teal-500 hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50 text-slate-950 rounded-lg font-bold transition-colors flex items-center justify-center gap-2">
                            {isSubmittingParentPayment ? 'Processing...' : 'Confirm Bulk Payment'}
                        </button>
                    </form>
                )}
            </Modal>

            {/* --- PARENT STATEMENT MODAL --- */}
            <Modal isOpen={isStatementModalOpen} onClose={() => setIsStatementModalOpen(false)} title="Parent Statement of Account" size="lg">
                {statementAccount && (() => {
                    const childEnrollmentIds = statementAccount.children.map((c: any) => c.enrollment.id);
                    const parentPayments = payments.filter(p => childEnrollmentIds.includes(p.enrollmentId))
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                    return (
                        <div className="space-y-6">
                            {/* Family Summary Header */}
                            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-1">{statementAccount.parentName || 'Parent Account'}</h3>
                                    <div className="text-xs text-slate-400 flex items-center gap-1"><Phone size={12} /> {statementAccount.phone || 'No phone'}</div>
                                    <div className="text-xs text-slate-500 mt-2">{statementAccount.children.length} Child(ren) Enrolled</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Family Balance</div>
                                    <div className={`text-2xl font-mono font-bold ${statementAccount.totalBalance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {formatCurrency(statementAccount.totalBalance)}
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-1">Expected: {formatCurrency(statementAccount.totalExpected)} &middot; Paid: {formatCurrency(statementAccount.totalPaid)}</div>
                                </div>
                            </div>

                            {/* Children & Enrollments Section */}
                            <div className="space-y-2.5">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Children & Programs</h4>
                                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/50">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                                            <tr>
                                                <th className="p-3">Child</th>
                                                <th className="p-3">Program</th>
                                                <th className="p-3 text-right">Total Fee</th>
                                                <th className="p-3 text-right">Paid</th>
                                                <th className="p-3 text-right">Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800 text-slate-300">
                                            {statementAccount.children.map((c: any, i: number) => (
                                                <tr key={i} className="hover:bg-slate-850/50 transition-colors">
                                                    <td className="p-3 font-medium text-white">{c.student.name}</td>
                                                    <td className="p-3">
                                                        <div>{c.enrollment.programName}</div>
                                                        <div className="text-[10px] text-slate-500">{c.enrollment.paymentPlan} &middot; {c.enrollment.packName}</div>
                                                    </td>
                                                    <td className="p-3 text-right font-mono">{formatCurrency(c.enrollment.totalAmount || 0)}</td>
                                                    <td className="p-3 text-right font-mono text-emerald-400">{formatCurrency(c.enrollment.paidAmount || 0)}</td>
                                                    <td className="p-3 text-right font-mono font-bold text-slate-200">
                                                        <span className={c.enrollment.balance > 0 ? 'text-red-400' : 'text-slate-500'}>
                                                            {formatCurrency(c.enrollment.balance || 0)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Transactions History Section */}
                            <div className="space-y-2.5">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payment History</h4>
                                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/50 max-h-60 overflow-y-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800 sticky top-0">
                                            <tr>
                                                <th className="p-3">Date</th>
                                                <th className="p-3">Child</th>
                                                <th className="p-3">Method</th>
                                                <th className="p-3">Ref/Bank</th>
                                                <th className="p-3 text-right">Amount</th>
                                                <th className="p-3 text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800 text-slate-300">
                                            {parentPayments.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="p-6 text-center text-slate-500 italic">No payments recorded yet.</td>
                                                </tr>
                                            ) : parentPayments.map((p: Payment, i: number) => {
                                                const child = statementAccount.children.find((c: any) => c.enrollment.id === p.enrollmentId);
                                                return (
                                                    <tr key={i} className="hover:bg-slate-850/50 transition-colors">
                                                        <td className="p-3 text-slate-400">{formatDate(p.date)}</td>
                                                        <td className="p-3">
                                                            <div className="font-medium text-white">{child?.student.name || p.studentName}</div>
                                                            <div className="text-[10px] text-slate-500">{child?.enrollment.programName || ''}</div>
                                                        </td>
                                                        <td className="p-3 capitalize">{p.method}</td>
                                                        <td className="p-3 text-slate-400">{p.checkNumber ? `#${p.checkNumber}` : p.bankName || '-'}</td>
                                                        <td className="p-3 text-right font-mono font-bold text-emerald-400">{formatCurrency(p.amount)}</td>
                                                        <td className="p-3 text-center">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                                                                ['paid', 'verified'].includes(p.status) ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/50' : 
                                                                p.status === 'check_bounced' ? 'bg-red-950/30 text-red-400 border-red-900/50' :
                                                                'bg-amber-950/30 text-amber-400 border-amber-900/50'
                                                            }`}>
                                                                {p.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Print Button */}
                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                                <button 
                                    type="button"
                                    onClick={() => handlePrintParentStatement(statementAccount, parentPayments)}
                                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-blue-900/20"
                                >
                                    <Printer size={14} /> Print Statement
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setIsStatementModalOpen(false)}
                                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all border border-slate-700"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    );
                })()}
            </Modal>

            <Modal isOpen={!!editingTransaction} onClose={() => setEditingTransaction(null)} title="Edit transaction">
                <form onSubmit={handleSaveTransactionEdit} className="space-y-4">
                    <div className="rounded-lg border border-amber-300/20 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">
                        Changing the amount or clearing status also reconciles the linked enrollment balance in the same atomic write.
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Amount ({settings.currencySymbol || 'MAD'})</label>
                            <input type="number" min="0.01" step="0.01" required className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white" value={editTransactionForm.amount || ''} onChange={e => setEditTransactionForm({ ...editTransactionForm, amount: Number(e.target.value) })} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Accounting date</label>
                            <input type="date" required className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white" value={editTransactionForm.date || ''} onChange={e => setEditTransactionForm({ ...editTransactionForm, date: e.target.value })} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Method</label>
                            <select className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white" value={editTransactionForm.method || 'cash'} onChange={e => {
                                const method = e.target.value as Payment['method'];
                                const status: Payment['status'] = method === 'cash' ? 'paid' : method === 'check' ? 'check_received' : 'pending_verification';
                                setEditTransactionForm(previous => ({
                                    ...previous,
                                    method,
                                    status,
                                    checkNumber: method === 'check' ? previous.checkNumber : undefined,
                                    bankName: method === 'check' ? previous.bankName : undefined,
                                    depositDate: method === 'check' ? previous.depositDate : undefined,
                                    proofUrl: method === 'virement' ? previous.proofUrl : undefined
                                }));
                            }}>
                                <option value="cash">Cash</option>
                                <option value="check">Check</option>
                                <option value="virement">Bank transfer</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Lifecycle status</label>
                            <select className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white" value={editTransactionForm.status || 'paid'} onChange={e => setEditTransactionForm({ ...editTransactionForm, status: e.target.value as Payment['status'] })}>
                                {(editTransactionForm.method || 'cash') === 'cash' && <><option value="paid">Paid / cleared</option><option value="verified">Verified / cleared</option></>}
                                {editTransactionForm.method === 'virement' && <><option value="pending_verification">Pending verification</option><option value="verified">Verified / cleared</option><option value="paid">Paid / cleared (legacy)</option></>}
                                {editTransactionForm.method === 'check' && <><option value="check_received">Check received</option><option value="check_deposited">Check deposited</option><option value="paid">Check cleared</option><option value="verified">Verified / cleared</option><option value="check_bounced">Check bounced</option></>}
                            </select>
                        </div>
                    </div>
                    {editTransactionForm.method === 'check' && (
                        <div className="grid grid-cols-1 gap-4 rounded-lg border border-white/10 bg-slate-950 p-3 sm:grid-cols-2">
                            <div><label className="block text-xs font-medium text-slate-400 mb-1">Check number</label><input required type="text" className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white" value={editTransactionForm.checkNumber || ''} onChange={e => setEditTransactionForm({ ...editTransactionForm, checkNumber: e.target.value })} /></div>
                            <div><label className="block text-xs font-medium text-slate-400 mb-1">Bank</label><input required type="text" className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white" value={editTransactionForm.bankName || ''} onChange={e => setEditTransactionForm({ ...editTransactionForm, bankName: e.target.value })} /></div>
                            <div className="sm:col-span-2"><label className="block text-xs font-medium text-slate-400 mb-1">Deposit date</label><input type="date" min={editTransactionForm.date || undefined} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white" value={editTransactionForm.depositDate || ''} onChange={e => setEditTransactionForm({ ...editTransactionForm, depositDate: e.target.value })} /></div>
                        </div>
                    )}
                    {editTransactionForm.method === 'virement' && (
                        <div className="rounded-lg border border-white/10 bg-slate-950 p-3">
                            <label className="mb-2 block text-xs font-medium text-slate-400">Transfer proof {editTransactionForm.status === 'verified' ? '(required to verify)' : '(recommended)'}</label>
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/[0.08]">
                                <Upload size={14} /> {editTransactionForm.proofUrl ? 'Replace proof' : 'Attach proof'}
                                <input type="file" accept="image/*" className="hidden" onChange={handleTransactionProofUpload} />
                            </label>
                            {editTransactionForm.proofUrl && <span className="ml-3 text-xs font-bold text-emerald-300">Proof attached</span>}
                        </div>
                    )}
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setEditingTransaction(null)} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
                        <button type="submit" disabled={isSubmittingTransactionEdit} className="flex items-center gap-2 rounded-lg bg-teal-500 px-6 py-2 font-bold text-slate-950 transition-colors hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50">
                            {isSubmittingTransactionEdit ? 'Saving...' : 'Save and reconcile'} <CheckCircle2 size={16} />
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
