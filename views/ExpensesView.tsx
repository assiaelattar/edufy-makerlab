
import React, { useEffect, useState, useMemo } from 'react';
import { TrendingDown, Plus, Search, DollarSign, PieChart, Trash2, Receipt, CheckCircle2, Upload, Image as ImageIcon, Clock, ArrowRight, Settings, Repeat, Edit, Download, Loader2, Info } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { Modal } from '../components/Modal';
import { useWorkspaceScroll, useWorkspaceViewState } from '../components/education-ui/useWorkspaceViewState';
import { formatCurrency, formatDate, compressImage } from '../utils/helpers';
import { addDoc, collection, serverTimestamp, deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Expense, ExpenseTemplate } from '../types';
import { EducationBadge, EducationButton, EducationDetailPanel, EducationField, EducationFormSection, EducationIcon, EducationNotice, EducationRegister, EducationSectionHeader, EducationState, EducationStatusPill, EducationTabs, EducationToolbar } from '../components/education-ui/EducationPrimitives';
import { format } from 'date-fns';
import '../components/education-ui/education-system-v1.css';
import './finance/education-expenses-v1.css';

const getRecurringDueDate = (month: string, dayDue?: number) => {
    const [year, monthNumber] = month.split('-').map(Number);
    const lastDay = new Date(year, monthNumber, 0).getDate();
    const dueDay = Math.min(Math.max(Number(dayDue) || 1, 1), lastDay);
    return `${month}-${String(dueDay).padStart(2, '0')}`;
};

export const ExpensesView = () => {
    const { expenses, expenseTemplates, payments, settings, loading, workspaceError } = useAppContext();
    const { can, currentOrganization, user } = useAuth();
    const { confirm, alert: showAlert } = useConfirm();
    const orgId = currentOrganization?.id || '';
    const workspaceScope = `expenses:${orgId || 'none'}:${user?.uid || 'guest'}`;
    useWorkspaceScroll(workspaceScope);

    // Dynamic session list derived from real data
    const availableSessions = useMemo(() => {
        const set = new Set<string>();
        if (settings.academicYear) set.add(settings.academicYear);
        expenses.forEach(e => { if (e.session) set.add(e.session); });
        return Array.from(set).sort().reverse();
    }, [expenses, settings.academicYear]);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeView, setActiveView] = useWorkspaceViewState<'overview' | 'register' | 'recurring' | 'insights' | 'templates'>(workspaceScope, 'activeView', 'overview');
    const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
    const [showExpenseDetails, setShowExpenseDetails] = useState(false);
    const [isPayTemplateModalOpen, setIsPayTemplateModalOpen] = useState(false);
    
    const [searchQuery, setSearchQuery] = useWorkspaceViewState(workspaceScope, 'searchQuery', '');
    const [categoryFilter, setCategoryFilter] = useWorkspaceViewState<string>(workspaceScope, 'categoryFilter', 'All');
    const [ledgerTemplateId, setLedgerTemplateId] = useWorkspaceViewState<string | null>(workspaceScope, 'ledgerTemplateId', null);
    
    // Filters
    const [selectedSession, setSelectedSession] = useWorkspaceViewState(workspaceScope, 'selectedSession', settings.academicYear || '2024-2025');
    const [selectedMonth, setSelectedMonth] = useWorkspaceViewState<string>(workspaceScope, 'selectedMonth', format(new Date(), 'yyyy-MM'));

    const [showProof, setShowProof] = useState<string | null>(null);

    // Form State (Ad-Hoc / Edit)
    const [expenseForm, setExpenseForm] = useState<Partial<Expense>>({
        title: '', category: 'rent', amount: 0, date: format(new Date(), 'yyyy-MM-dd'),
        method: 'cash', status: 'paid', beneficiary: '', notes: '', receiptUrl: ''
    });
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Template Management State
    const [templateForm, setTemplateForm] = useState<Partial<ExpenseTemplate>>({ 
        title: '', category: 'rent', amount: 0, beneficiary: '', recurring: true, frequency: 'monthly', dayDue: 1 
    });
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

    // Payment Flow State
    const [payingTemplate, setPayingTemplate] = useState<ExpenseTemplate | null>(null);
    const [paymentProof, setPaymentProof] = useState<string>('');
    const [isSavingExpense, setIsSavingExpense] = useState(false);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [isSavingRecurringPayment, setIsSavingRecurringPayment] = useState(false);

    useEffect(() => {
        if (availableSessions.length === 0 || availableSessions.includes(selectedSession)) return;
        setSelectedSession(settings.academicYear && availableSessions.includes(settings.academicYear) ? settings.academicYear : availableSessions[0]);
    }, [availableSessions, selectedSession, settings.academicYear]);

    useEffect(() => { setLedgerTemplateId(null); }, [selectedSession, selectedMonth]);

    // --- DATA PROCESSING ---
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // 1. Recurring Status Logic (The "Virtual Bills" System)
    const recurringStatus = useMemo(() => {
        if (!selectedMonth) return [];
        
        return expenseTemplates.filter(t => t.recurring).map(template => {
            if (template.frequency === 'weekly') {
                return { template, status: 'manual' as const, expense: undefined, matchCount: 0, dueDate: undefined };
            }
            const dueDate = getRecurringDueDate(selectedMonth, template.dayDue);
            // Keep conflicting stored records visible for review instead of choosing an arbitrary status.
            const matchedExpenses = expenses.filter(e =>
                e.templateId === template.id && 
                e.date.startsWith(selectedMonth) && 
                e.session === selectedSession &&
                e.organizationId === orgId
            );
            const matchedExpense = matchedExpenses[0];
            
            return {
                template,
                status: matchedExpenses.length > 1 ? 'review' as const : matchedExpense ? matchedExpense.status === 'paid' ? 'paid' as const : 'pending' as const : dueDate > today ? 'scheduled' as const : 'due' as const,
                expense: matchedExpense,
                matchCount: matchedExpenses.length,
                dueDate
            };
        });
    }, [expenseTemplates, expenses, selectedMonth, selectedSession, orgId, today]);

    // 2. Filtered Expenses (The History List)
    const filteredExpenses = useMemo(() => {
        return expenses.filter(e => {
            const matchesSession = e.session === selectedSession;
            const matchesMonth = !selectedMonth || e.date.startsWith(selectedMonth);
            const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || e.beneficiary.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = categoryFilter === 'All' || e.category === categoryFilter;
            const matchesTemplate = !ledgerTemplateId || e.templateId === ledgerTemplateId;
            return matchesSession && matchesMonth && matchesSearch && matchesCategory && matchesTemplate;
        }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [expenses, selectedSession, selectedMonth, searchQuery, categoryFilter, ledgerTemplateId]);

    // 3. Financial Stats
    const stats = useMemo(() => {
        // 1. Period constraints (for Card 1)
        const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
        
        // 2. Session constraints (for the Global View)
        const sessionExpensesList = expenses.filter(e => e.session === selectedSession);
        const sessionTotalExpenses = sessionExpensesList.reduce((sum, e) => sum + e.amount, 0);

        const sessionPayments = payments.filter(p => p.session === selectedSession && ['paid', 'verified'].includes(p.status));
        const sessionTotalIncome = sessionPayments.reduce((sum, p) => sum + p.amount, 0);

        const sessionNetProfit = sessionTotalIncome - sessionTotalExpenses;
        
        // Breakdown (remains based on filtered view)
        const breakdown: Record<string, number> = {};
        filteredExpenses.forEach(e => {
            breakdown[e.category] = (breakdown[e.category] || 0) + e.amount;
        });
        
        let topCategory = '-';
        let maxVal = 0;
        Object.entries(breakdown).forEach(([cat, val]) => {
            if(val > maxVal) { maxVal = val; topCategory = cat; }
        });

        return { totalExpenses, sessionTotalExpenses, sessionTotalIncome, sessionNetProfit, breakdown, topCategory };
    }, [filteredExpenses, payments, expenses, selectedSession]);

    // Helper for month display
    const displayMonthName = useMemo(() => {
        if(!selectedMonth) return "All Time";
        const [year, month] = selectedMonth.split('-').map(Number);
        const d = new Date(year, month - 1, 1);
        return isNaN(d.getTime()) ? selectedMonth : d.toLocaleString('default', { month: 'long' });
    }, [selectedMonth]);

    const recurringDueCount = recurringStatus.filter(item => item.status === 'due').length;
    const recurringReviewCount = recurringStatus.filter(item => item.status === 'review').length;
    const recurringPendingCount = recurringStatus.filter(item => item.status === 'pending').length;
    const recurringScheduledCount = recurringStatus.filter(item => item.status === 'scheduled').length;
    const recurringManualCount = recurringStatus.filter(item => item.status === 'manual').length;
    const firstDue = recurringStatus.filter(item => item.status === 'due').sort((first, second) => (first.dueDate || '').localeCompare(second.dueDate || ''))[0];
    const firstReview = recurringStatus.find(item => item.status === 'review');
    const firstPending = recurringStatus.find(item => item.status === 'pending');
    const nextScheduled = recurringStatus.filter(item => item.status === 'scheduled').sort((first, second) => (first.dueDate || '').localeCompare(second.dueDate || ''))[0];

    const requireExpenseWriteAccess = async () => {
        if (!can('expenses.manage')) {
            await showAlert('Permission required', 'Your role cannot change expense records or recurring charges.', 'warning');
            return false;
        }
        if (!orgId || currentOrganization?.status !== 'active') {
            await showAlert('Active organization required', 'Select an active organization before changing the expense ledger.', 'warning');
            return false;
        }
        return true;
    };

    const requireExactTemplateTenant = async (template: ExpenseTemplate | null | undefined) => {
        const templateOrganizationId = (template as (ExpenseTemplate & { organizationId?: string }) | null | undefined)?.organizationId;
        if (templateOrganizationId === orgId) return true;
        await showAlert('Recurring charge unavailable', 'This template is missing the active tenant ID or belongs to another organization.', 'danger');
        return false;
    };

    const requireExactStoredTenant = async (collectionName: 'expenses' | 'expense_templates', id: string, label: string) => {
        if (!db) return false;
        try {
            const snapshot = await getDoc(doc(db, collectionName, id));
            if (snapshot.exists() && snapshot.data().organizationId === orgId) return true;
            await showAlert(`${label} unavailable`, `This ${label.toLowerCase()} is missing the active tenant ID, belongs to another organization, or no longer exists.`, 'danger');
            return false;
        } catch (error) {
            console.error(error);
            await showAlert(`Could not verify ${label.toLowerCase()}`, 'Edufy could not verify tenant ownership. No ledger change was made.', 'danger');
            return false;
        }
    };

    const validateExpense = (draft: Partial<Expense>) => {
        if (!draft.title?.trim()) return 'Enter an expense title.';
        if (!draft.beneficiary?.trim()) return 'Enter the beneficiary or supplier.';
        const amount = Number(draft.amount);
        if (!Number.isFinite(amount) || amount <= 0) return 'Amount must be greater than zero.';
        if (!draft.date || !/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) return 'Choose a valid accounting date.';
        return null;
    };

    const getTemplateDueDate = (template: ExpenseTemplate) => {
        if (!selectedMonth) return format(new Date(), 'yyyy-MM-dd');
        return getRecurringDueDate(selectedMonth, template.dayDue);
    };

    // --- ACTIONS ---

    const handlePayTemplateOpen = async (template: ExpenseTemplate) => {
        if (template.frequency === 'weekly') {
            await showAlert('Weekly schedule needs more detail', 'This template does not store a weekday or number of occurrences. Record each weekly charge from "Record expense" so the ledger is not understated.', 'info');
            return;
        }
        const existingExpense = expenses.find(expense =>
            expense.templateId === template.id &&
            expense.session === selectedSession &&
            expense.organizationId === orgId &&
            (!selectedMonth || expense.date.startsWith(selectedMonth))
        );
        if (existingExpense) {
            await showAlert('Charge already recorded', `${template.title} is already in the ${displayMonthName} ledger. Open that expense to review or edit it.`, 'warning');
            return;
        }
        setPayingTemplate(template);
        setExpenseForm({
            title: template.title || '',
            category: template.category || 'other',
            amount: template.amount || 0,
            beneficiary: template.beneficiary || '',
            date: getTemplateDueDate(template),
            method: 'cash',
            status: 'paid',
            notes: `Monthly payment for ${template.title || ''}`
        });
        setPaymentProof('');
        setIsPayTemplateModalOpen(true);
    };

    const handleConfirmPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !payingTemplate) return;

        if (!(await requireExpenseWriteAccess())) return;
        if (!(await requireExactTemplateTenant(payingTemplate))) return;
        if (!(await requireExactStoredTenant('expense_templates', payingTemplate.id, 'Recurring charge'))) return;
        const validationError = validateExpense(expenseForm);
        if (validationError) {
            await showAlert('Check recurring payment', validationError, 'warning');
            return;
        }
        if (expenses.some(expense => expense.templateId === payingTemplate.id && expense.session === selectedSession && expense.date.startsWith((expenseForm.date || '').slice(0, 7)))) {
            await showAlert('Duplicate recurring payment', 'A payment for this recurring charge already exists in the selected month. Edit the existing record instead.', 'warning');
            return;
        }

        setIsSavingRecurringPayment(true);
        try {
            const payload: any = {
                title: expenseForm.title || '',
                category: expenseForm.category || 'other',
                amount: expenseForm.amount || 0,
                beneficiary: expenseForm.beneficiary || '',
                date: expenseForm.date || format(new Date(), 'yyyy-MM-dd'),
                method: expenseForm.method || 'cash',
                status: 'paid',
                notes: expenseForm.notes || '',
                templateId: payingTemplate.id,
                session: selectedSession,
                organizationId: orgId,
                createdAt: serverTimestamp()
            };
            if (paymentProof) payload.receiptUrl = paymentProof;

            await addDoc(collection(db, 'expenses'), payload);
            setIsPayTemplateModalOpen(false);
            setPayingTemplate(null);
            setPaymentProof('');
            await showAlert('Recurring payment recorded', `${payload.title} was added to the ${displayMonthName} expense ledger.`, 'success');
        } catch (err) {
            console.error(err);
            showAlert("Error", "Could not record this recurring payment. Please try again.", "danger");
        } finally {
            setIsSavingRecurringPayment(false);
        }
    };

    const handleSaveTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db) return;
        if (!(await requireExpenseWriteAccess())) return;
        if (editingTemplateId) {
            const existingTemplate = expenseTemplates.find(template => template.id === editingTemplateId);
            if (!(await requireExactTemplateTenant(existingTemplate))) return;
            if (!(await requireExactStoredTenant('expense_templates', editingTemplateId, 'Recurring charge'))) return;
        }
        if (!templateForm.title?.trim() || !templateForm.beneficiary?.trim()) {
            await showAlert('Check recurring charge', 'Enter a title and beneficiary.', 'warning');
            return;
        }
        if (!Number.isFinite(Number(templateForm.amount)) || Number(templateForm.amount) <= 0) {
            await showAlert('Check recurring charge', 'Default amount must be greater than zero.', 'warning');
            return;
        }
        const dayDue = Number(templateForm.dayDue);
        if (!Number.isInteger(dayDue) || dayDue < 1 || dayDue > 31) {
            await showAlert('Check recurring charge', 'Due day must be between 1 and 31.', 'warning');
            return;
        }
        setIsSavingTemplate(true);
        try {
            const isUpdatingTemplate = Boolean(editingTemplateId);
            const templateData = {
                title: templateForm.title.trim(),
                category: templateForm.category || 'other',
                amount: Number(templateForm.amount),
                beneficiary: templateForm.beneficiary.trim(),
                recurring: templateForm.recurring ?? true,
                frequency: 'monthly' as const,
                dayDue
            };
            if (editingTemplateId) {
                await updateDoc(doc(db, 'expense_templates', editingTemplateId), templateData);
                setEditingTemplateId(null);
            } else {
                await addDoc(collection(db, 'expense_templates'), { ...templateData, organizationId: orgId, createdAt: serverTimestamp() });
            }
            setTemplateForm({ title: '', category: 'rent', amount: 0, beneficiary: '', recurring: true, frequency: 'monthly', dayDue: 1 });
            await showAlert(isUpdatingTemplate ? 'Recurring charge updated' : 'Recurring charge added', 'The monthly obligation is ready for period tracking.', 'success');
        } catch (err) {
            console.error(err);
            showAlert("Error", "Could not save this recurring charge.", "danger");
        } finally {
            setIsSavingTemplate(false);
        }
    };

    const handleSaveAdHocExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db) return;
        if (!(await requireExpenseWriteAccess())) return;
        const validationError = validateExpense(expenseForm);
        if (validationError) {
            await showAlert('Check expense record', validationError, 'warning');
            return;
        }
        if (isEditing && editingId) {
            const original = expenses.find(expense => expense.id === editingId);
            if (!original || original.organizationId !== orgId) {
                await showAlert('Expense unavailable', 'This record does not belong to the active organization.', 'danger');
                return;
            }
            if (!(await requireExactStoredTenant('expenses', editingId, 'Expense'))) return;
        }
        setIsSavingExpense(true);
        try {
            const payload: any = {
                title: expenseForm.title!.trim(),
                category: expenseForm.category || 'other',
                amount: Number(expenseForm.amount),
                beneficiary: expenseForm.beneficiary!.trim(),
                date: expenseForm.date || format(new Date(), 'yyyy-MM-dd'),
                method: expenseForm.method || 'cash',
                status: expenseForm.status || 'paid',
                notes: expenseForm.notes || '',
                session: selectedSession,
            };
            if (expenseForm.receiptUrl) payload.receiptUrl = expenseForm.receiptUrl;

            if (isEditing && editingId) {
                await updateDoc(doc(db, 'expenses', editingId), payload);
            } else {
                payload.organizationId = orgId;
                payload.createdAt = serverTimestamp();
                await addDoc(collection(db, 'expenses'), payload);
            }
            setIsModalOpen(false);
            setIsEditing(false);
            setEditingId(null);
            await showAlert(isEditing ? 'Expense updated' : 'Expense recorded', 'The expense ledger has been updated.', 'success');
        } catch (err) {
            console.error(err);
            showAlert("Error", "Could not save this expense record.", "danger");
        } finally {
            setIsSavingExpense(false);
        }
    };

    const handleDeleteExpense = async (id: string) => {
        if (!(await requireExpenseWriteAccess())) return;
        const expense = expenses.find(item => item.id === id);
        if (!expense || expense.organizationId !== orgId) {
            await showAlert('Expense unavailable', 'This record does not belong to the active organization.', 'danger');
            return;
        }
        if (!(await requireExactStoredTenant('expenses', id, 'Expense'))) return;
        const approved = await confirm({
            title: "Delete expense?",
            message: "This expense record will be permanently removed from the tenant finance ledger.",
            confirmText: "Delete",
            cancelText: "Cancel",
            variant: "danger"
        });
        if (!approved) return;
        if (!db) return;
        try {
            await deleteDoc(doc(db, 'expenses', id));
            await showAlert('Expense deleted', 'The expense was removed from the tenant ledger.', 'success');
        } catch (err) {
            console.error(err);
            showAlert("Error", "Could not delete this expense record.", "danger");
        }
    };

    const handleDeleteTemplate = async (id: string) => {
        if (!db) return;
        if (!(await requireExpenseWriteAccess())) return;
        const template = expenseTemplates.find(item => item.id === id);
        if (!(await requireExactTemplateTenant(template))) return;
        if (!(await requireExactStoredTenant('expense_templates', id, 'Recurring charge'))) return;
        const approved = await confirm({
            title: "Delete recurring charge?",
            message: "This removes the template only. Existing expense records will remain in the ledger.",
            confirmText: "Delete",
            cancelText: "Cancel",
            variant: "danger"
        });
        if (!approved) return;
        try {
            await deleteDoc(doc(db, 'expense_templates', id));
            await showAlert('Recurring charge deleted', 'The template was removed. Existing expense records were preserved.', 'success');
        } catch (err) {
            console.error(err);
            showAlert("Error", "Could not delete this recurring charge.", "danger");
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'form' | 'pay') => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const compressed = await compressImage(file);
            if (target === 'form') setExpenseForm(prev => ({ ...prev, receiptUrl: compressed }));
            else setPaymentProof(compressed);
        } catch(err) {
            console.error(err);
            showAlert("Upload failed", "Image processing failed. Try a smaller or different image.", "danger");
        }
    };

    const handleExportExpenses = async () => {
        if (filteredExpenses.length === 0) {
            await showAlert('Nothing to export', 'Adjust the period or filters so at least one expense is visible.', 'info');
            return;
        }
        const escapeCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const header = ['Record ID', 'Date', 'Session', 'Title', 'Category', 'Beneficiary', 'Method', 'Status', 'Amount', 'Receipt attached', 'Notes'];
        const rows = filteredExpenses.map(expense => [
            expense.id, expense.date, expense.session || selectedSession, expense.title, expense.category,
            expense.beneficiary, expense.method, expense.status, expense.amount,
            expense.receiptUrl ? 'Yes' : 'No', expense.notes || ''
        ]);
        const csv = [header, ...rows].map(row => row.map(escapeCell).join(',')).join('\r\n');
        const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `expenses_${selectedSession}_${selectedMonth || 'all-periods'}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
        await showAlert('Expense export ready', `${filteredExpenses.length} ledger record${filteredExpenses.length === 1 ? '' : 's'} exported with the current filters.`, 'success');
    };

    const selectedExpense = expenses.find(item => item.id === selectedExpenseId) || null;
    const canManage = can('expenses.manage');
    const categories = ['All', 'rent', 'salary', 'utilities', 'material', 'marketing', 'other'];
    const recurringStatusTone = (status: string) => status === 'paid' ? 'success' : status === 'due' || status === 'pending' || status === 'review' ? 'warning' : 'info';
    const openRegisterForTemplate = (id: string) => {
        setLedgerTemplateId(id);
        setSearchQuery('');
        setCategoryFilter('All');
        setActiveView('register');
    };
    const openExpenseEditor = (expense: Expense) => {
        setExpenseForm(expense);
        setEditingId(expense.id);
        setIsEditing(true);
        setIsModalOpen(true);
    };
    const openNewExpense = () => {
        setIsEditing(false);
        setEditingId(null);
        setShowExpenseDetails(false);
        setExpenseForm({ title: '', category: 'other', amount: 0, date: format(new Date(), 'yyyy-MM-dd'), method: 'cash', status: 'paid', beneficiary: '', notes: '' });
        setIsModalOpen(true);
    };
    const expenseRows = (items: Expense[]) => items.map(expense => (
        <article key={expense.id} className="edu-expense-row">
            <button type="button" className="edu-expense-row__main" onClick={() => { setSelectedExpenseId(expense.id); setActiveView('register'); }} aria-label={'View details for ' + expense.title}>
                <span className="edu-expense-row__name"><strong>{expense.title}</strong><small>{formatDate(expense.date)} · {expense.beneficiary}</small></span>
                <span className="edu-expense-row__category">{expense.category}</span>
                <span className="edu-expense-row__amount"><strong>{formatCurrency(expense.amount)}</strong><EducationStatusPill status={expense.status === 'pending' ? 'warning' : 'success'}>{expense.status}</EducationStatusPill></span>
            </button>
        </article>
    ));
    const recurringCards = (items: typeof recurringStatus) => items.map(({ template, status, expense, matchCount, dueDate }) => (
        <article key={template.id} className="edu-expense-charge" data-status={status}>
            <div className="edu-expense-charge__head">
                <EducationIcon icon={status === 'paid' ? CheckCircle2 : status === 'manual' ? Info : Clock} accent={status === 'paid' ? 'green' : status === 'due' || status === 'pending' || status === 'review' ? 'orange' : 'blue'} />
                <span><strong>{template.title}</strong><small>{template.beneficiary} · {template.frequency}</small></span>
                <EducationStatusPill status={recurringStatusTone(status)}>{status === 'review' ? 'Review records' : status}</EducationStatusPill>
            </div>
            <div className="edu-expense-charge__foot">
                <span><strong>{status === 'review' ? matchCount + ' ledger entries' : formatCurrency(expense?.amount ?? template.amount)}</strong><small>{expense ? formatDate(expense.date) : dueDate ? 'Due ' + formatDate(dueDate) : 'Manual schedule'}</small></span>
                {(status === 'due' || status === 'scheduled') && canManage && <EducationButton variant={status === 'due' ? 'primary' : 'secondary'} onClick={() => handlePayTemplateOpen(template)}>Record payment</EducationButton>}
                {(status === 'pending' || status === 'review') && <EducationButton variant="secondary" onClick={() => openRegisterForTemplate(template.id)}>Review ledger</EducationButton>}
                {status === 'manual' && <EducationButton variant="quiet" onClick={() => handlePayTemplateOpen(template)}>Schedule guidance</EducationButton>}
                {status === 'paid' && <span className="edu-expense-charge__paid">Paid via {expense?.method}</span>}
            </div>
        </article>
    ));

    if (loading) return <main data-edu-system="1" className="edu-v1 edu-expenses-v1"><EducationState kind="loading" title="Loading expenses" description="Preparing the expense ledger and recurring charges." /></main>;
    if (workspaceError) return <main data-edu-system="1" className="edu-v1 edu-expenses-v1"><EducationState kind="error" title="Expenses unavailable" description={workspaceError} /></main>;

    return (
        <main data-edu-system="1" className="edu-v1 edu-expenses-v1" data-testid="education-expenses-v1">
            <header className="edu-expenses-v1__header">
                <div><EducationBadge status="success" icon={TrendingDown}>Finance operations</EducationBadge><h1>Expenses</h1><p>Review obligations, record costs and inspect the ledger for {selectedSession}.</p></div>
                <div className="edu-expenses-v1__header-actions">
                    {canManage && <EducationButton icon={Repeat} onClick={() => setActiveView('templates')}>Recurring templates</EducationButton>}
                    {canManage && <EducationButton variant="primary" icon={Plus} onClick={openNewExpense}>Record expense</EducationButton>}
                </div>
            </header>

            <EducationToolbar label="Expense period and export">
                <EducationField label="Academic session"><select value={selectedSession} onChange={event => setSelectedSession(event.target.value)}>{availableSessions.map(session => <option key={session} value={session}>{session}</option>)}</select></EducationField>
                <EducationField label="Month"><input type="month" value={selectedMonth} onChange={event => setSelectedMonth(event.target.value)} /></EducationField>
                <EducationButton icon={Download} onClick={handleExportExpenses} disabled={filteredExpenses.length === 0} title={filteredExpenses.length === 0 ? 'No visible expense records to export' : 'Export filtered expense ledger as CSV'}>Export {filteredExpenses.length > 0 ? '(' + filteredExpenses.length + ')' : ''}</EducationButton>
            </EducationToolbar>

            <EducationTabs label="Expense workspace" value={activeView} onChange={value => setActiveView(value as typeof activeView)} items={[
                { id: 'overview', label: 'Overview', icon: TrendingDown },
                { id: 'register', label: 'Expense register', icon: Receipt, count: filteredExpenses.length },
                { id: 'recurring', label: 'Recurring charges', icon: Repeat, count: recurringStatus.length, status: recurringDueCount || recurringReviewCount ? 'attention' : undefined },
                { id: 'insights', label: 'Categories & insights', icon: PieChart },
                { id: 'templates', label: 'Templates', icon: Settings, count: expenseTemplates.filter(item => item.recurring).length }
            ]} />

            {activeView === 'overview' && <div className="edu-expenses-v1__content" role="tabpanel" id="expense-workspace-panel-overview" aria-labelledby="expense-workspace-overview">
                <section className="edu-expenses-v1__next">
                    <div><EducationBadge status={firstReview || firstDue || firstPending ? 'warning' : 'info'}>Next step · {displayMonthName}</EducationBadge><h2>{firstReview ? recurringReviewCount + (recurringReviewCount === 1 ? ' recurring charge needs review' : ' recurring charges need review') : firstDue ? recurringDueCount + (recurringDueCount === 1 ? ' recurring charge due' : ' recurring charges due') : firstPending ? recurringPendingCount + (recurringPendingCount === 1 ? ' record pending' : ' records pending') : nextScheduled ? 'Upcoming recurring charge' : 'Expenses in view'}</h2><p>{firstReview ? firstReview.template.title + ' has ' + firstReview.matchCount + ' linked records. Review before recording another payment.' : firstDue ? firstDue.template.title + ' · ' + formatCurrency(firstDue.template.amount) + ' · due ' + formatDate(firstDue.dueDate!) : firstPending ? firstPending.template.title + ' has a pending ledger entry.' : nextScheduled ? nextScheduled.template.title + ' · scheduled ' + formatDate(nextScheduled.dueDate!) : recurringManualCount ? recurringManualCount + ' weekly templates need manual review.' : 'Review the ledger or record an operating cost.'}</p></div>
                    {firstDue && !firstReview && canManage ? <EducationButton variant="primary" onClick={() => handlePayTemplateOpen(firstDue.template)}>Record payment</EducationButton> : <EducationButton variant="primary" onClick={() => firstReview || firstPending ? openRegisterForTemplate((firstReview || firstPending)!.template.id) : setActiveView(recurringStatus.length ? 'recurring' : 'register')}>Review {firstReview || firstPending ? 'ledger' : recurringStatus.length ? 'charges' : 'register'}</EducationButton>}
                </section>
                <div className="edu-expenses-v1__metrics">
                    <section><EducationIcon icon={TrendingDown} accent="blue"/><span>Period expenses</span><strong>{formatCurrency(stats.totalExpenses)}</strong><small>{displayMonthName}</small></section>
                    <section><EducationIcon icon={DollarSign} accent={stats.sessionNetProfit >= 0 ? 'green' : 'orange'}/><span>Session margin</span><strong>{formatCurrency(stats.sessionNetProfit)}</strong><small>{formatCurrency(stats.sessionTotalIncome)} income</small></section>
                    <section><EducationIcon icon={Clock} accent={recurringDueCount ? 'orange' : 'blue'}/><span>Recurring due</span><strong>{recurringDueCount}</strong><small>{recurringReviewCount ? recurringReviewCount + ' need review' : recurringPendingCount ? recurringPendingCount + ' pending records' : recurringScheduledCount + ' scheduled later'}</small></section>
                    <section><EducationIcon icon={PieChart} accent="purple"/><span>Highest category</span><strong className="capitalize">{stats.topCategory}</strong><small>Largest period cost</small></section>
                </div>
                <EducationSectionHeader eyebrow="Working context" title="Recurring charges" description="Fixed obligations for the selected month." action={<EducationButton onClick={() => setActiveView('recurring')}>View all charges</EducationButton>} />
                {recurringStatus.length ? <div className="edu-expenses-v1__charges">{recurringCards(recurringStatus.slice(0, 4))}</div> : <EducationState title="No recurring charges" description="Create a monthly template to track an obligation across periods.">{canManage && <EducationButton onClick={() => setActiveView('templates')}>Set up a template</EducationButton>}</EducationState>}
                <EducationRegister title="Recent expenses" description="Most recent records in the selected period." icon={Receipt} actions={<EducationButton onClick={() => setActiveView('register')}>Open register</EducationButton>}>{filteredExpenses.length ? expenseRows(filteredExpenses.slice(0, 5)) : <EducationState title="No expenses in this period" description="Try another month or record a cost.">{canManage && <EducationButton onClick={openNewExpense}>Record expense</EducationButton>}</EducationState>}</EducationRegister>
            </div>}

            {activeView === 'register' && <div className="edu-expenses-v1__content" role="tabpanel" id="expense-workspace-panel-register" aria-labelledby="expense-workspace-register">
                <EducationSectionHeader eyebrow="Expense ledger" title="Expense register" description="Search the selected period, then open a record for its context and actions." />
                <EducationToolbar label="Expense register filters">
                    <EducationField label="Search expenses"><input type="search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Title or beneficiary" /></EducationField>
                    <EducationField label="Category"><select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}>{categories.map(category => <option key={category} value={category}>{category}</option>)}</select></EducationField>
                    {(searchQuery || categoryFilter !== 'All' || ledgerTemplateId) && <EducationButton onClick={() => { setSearchQuery(''); setCategoryFilter('All'); setLedgerTemplateId(null); }}>Clear filters</EducationButton>}
                </EducationToolbar>
                {ledgerTemplateId && <EducationNotice status="info">Showing records for {expenseTemplates.find(template => template.id === ledgerTemplateId)?.title || 'this recurring charge'}. <button type="button" onClick={() => setLedgerTemplateId(null)}>Show all expenses</button></EducationNotice>}
                <div className="edu-expenses-v1__register-layout">
                    <EducationRegister title="Ledger records" description={filteredExpenses.length + ' visible expenses'} icon={Receipt}>{filteredExpenses.length ? expenseRows(filteredExpenses) : <EducationState title="No expenses found" description="Adjust the month, academic session, category or search terms. The empty result cannot be exported." />}</EducationRegister>
                    {selectedExpense && filteredExpenses.some(item => item.id === selectedExpense.id) && <EducationDetailPanel label={'Expense details for ' + selectedExpense.title} className="edu-expenses-v1__detail"><div className="edu-expenses-v1__detail-title"><EducationIcon icon={Receipt} accent="purple"/><div><span>Expense detail</span><h3>{selectedExpense.title}</h3></div><button type="button" onClick={() => setSelectedExpenseId(null)} aria-label="Close expense details">×</button></div><dl><div><dt>Amount</dt><dd>{formatCurrency(selectedExpense.amount)}</dd></div><div><dt>Accounting date</dt><dd>{formatDate(selectedExpense.date)}</dd></div><div><dt>Beneficiary</dt><dd>{selectedExpense.beneficiary}</dd></div><div><dt>Category</dt><dd className="capitalize">{selectedExpense.category}</dd></div><div><dt>Method</dt><dd>{selectedExpense.method}</dd></div><div><dt>Status</dt><dd><EducationStatusPill status={selectedExpense.status === 'pending' ? 'warning' : 'success'}>{selectedExpense.status}</EducationStatusPill></dd></div><div><dt>Notes</dt><dd>{selectedExpense.notes || 'No notes'}</dd></div></dl><div className="edu-expenses-v1__detail-actions">{selectedExpense.receiptUrl && <EducationButton icon={ImageIcon} onClick={() => setShowProof(selectedExpense.receiptUrl!)}>View receipt</EducationButton>}{canManage && <EducationButton icon={Edit} onClick={() => openExpenseEditor(selectedExpense)}>Edit</EducationButton>}{canManage && <EducationButton icon={Trash2} status="danger" onClick={() => handleDeleteExpense(selectedExpense.id)}>Delete</EducationButton>}</div></EducationDetailPanel>}
                </div>
            </div>}

            {activeView === 'recurring' && <div className="edu-expenses-v1__content" role="tabpanel" id="expense-workspace-panel-recurring" aria-labelledby="expense-workspace-recurring">
                <EducationSectionHeader eyebrow="Scheduled obligations" title={'Recurring charges · ' + displayMonthName} description="Monthly templates are tracked by due day. Weekly templates stay manual until their schedule has enough detail." action={canManage && <EducationButton icon={Settings} onClick={() => setActiveView('templates')}>Manage templates</EducationButton>} />
                <div className="edu-expenses-v1__status-line"><EducationStatusPill status="warning">{recurringDueCount} due</EducationStatusPill><EducationStatusPill status="warning">{recurringReviewCount} review</EducationStatusPill><EducationStatusPill status="warning">{recurringPendingCount} pending</EducationStatusPill><EducationStatusPill status="info">{recurringManualCount} manual</EducationStatusPill></div>
                {recurringStatus.length ? <div className="edu-expenses-v1__charges">{recurringCards(recurringStatus)}</div> : <EducationState title="No recurring charges" description="There are no recurring templates to project for this month.">{canManage && <EducationButton onClick={() => setActiveView('templates')}>Manage templates</EducationButton>}</EducationState>}
            </div>}

            {activeView === 'insights' && <div className="edu-expenses-v1__content" role="tabpanel" id="expense-workspace-panel-insights" aria-labelledby="expense-workspace-insights">
                <EducationSectionHeader eyebrow="Period analysis" title="Categories & insights" description="Breakdown reflects the current session, month, search, category and template filters." />
                <div className="edu-expenses-v1__metrics"><section><EducationIcon icon={TrendingDown} accent="blue"/><span>Period expenses</span><strong>{formatCurrency(stats.totalExpenses)}</strong></section><section><EducationIcon icon={DollarSign} accent={stats.sessionNetProfit >= 0 ? 'green' : 'orange'}/><span>Session margin</span><strong>{formatCurrency(stats.sessionNetProfit)}</strong></section><section><EducationIcon icon={PieChart} accent="purple"/><span>Highest category</span><strong className="capitalize">{stats.topCategory}</strong></section></div>
                <EducationRegister title="Category breakdown" description="Share of visible period expenses." icon={PieChart}>{Object.keys(stats.breakdown).length ? Object.entries(stats.breakdown).sort(([, a], [, b]) => b - a).map(([category, amount]) => { const percentage = stats.totalExpenses > 0 ? amount / stats.totalExpenses * 100 : 0; return <div className="edu-expenses-v1__category" key={category}><div><strong className="capitalize">{category}</strong><span>{Math.round(percentage)}% · {formatCurrency(amount)}</span></div><meter min="0" max="100" value={percentage} aria-label={category + ' share'}>{Math.round(percentage)}%</meter></div>; }) : <EducationState title="No category totals" description="There are no visible expenses in the filtered period." />}</EducationRegister>
            </div>}

            {activeView === 'templates' && <div className="edu-expenses-v1__content" role="tabpanel" id="expense-workspace-panel-templates" aria-labelledby="expense-workspace-templates">
                <EducationSectionHeader eyebrow="Recurring setup" title="Recurring templates" description="Define one monthly obligation, then review its occurrence each month." />
                {!canManage ? <EducationState kind="restricted" title="Read-only access" description="Your role can review recurring charges, but cannot change templates." /> : <div className="edu-expenses-v1__template-layout">
                    <form onSubmit={handleSaveTemplate} className="edu-expenses-v1__template-form">
                        <h3>{editingTemplateId ? 'Edit recurring charge' : 'New monthly charge'}</h3>
                        <EducationFormSection title="Charge details" icon={Repeat} accent="purple">
                            <EducationField label="Title"><input required value={templateForm.title || ''} onChange={event => setTemplateForm({ ...templateForm, title: event.target.value })} placeholder="Office rent" /></EducationField>
                            <EducationField label="Category"><select value={templateForm.category} onChange={event => setTemplateForm({ ...templateForm, category: event.target.value as ExpenseTemplate['category'] })}>{categories.slice(1).map(category => <option key={category} value={category}>{category}</option>)}</select></EducationField>
                            <EducationField label="Default amount"><input type="number" min="0.01" step="0.01" required value={templateForm.amount} onChange={event => setTemplateForm({ ...templateForm, amount: Number(event.target.value) })} /></EducationField>
                            <EducationField label="Beneficiary"><input required value={templateForm.beneficiary || ''} onChange={event => setTemplateForm({ ...templateForm, beneficiary: event.target.value })} /></EducationField>
                            <EducationField label="Due day" hint="Days beyond a short month's end are shown on its final day."><input type="number" min="1" max="31" required value={templateForm.dayDue || 1} onChange={event => setTemplateForm({ ...templateForm, dayDue: Number(event.target.value) })} /></EducationField>
                        </EducationFormSection>
                        <EducationNotice status="info">Monthly schedules are tracked automatically. Existing weekly templates need manual expense records because they have no stored weekday or occurrence count.</EducationNotice>
                        <div className="edu-expenses-v1__form-actions">{editingTemplateId && <EducationButton onClick={() => { setEditingTemplateId(null); setTemplateForm({ title: '', category: 'rent', amount: 0, beneficiary: '', recurring: true, frequency: 'monthly', dayDue: 1 }); }}>Cancel edit</EducationButton>}<EducationButton type="submit" variant="primary" disabled={isSavingTemplate}>{isSavingTemplate ? 'Saving…' : editingTemplateId ? 'Update charge' : 'Add charge'}</EducationButton></div>
                    </form>
                    <EducationRegister title="Active templates" description={expenseTemplates.filter(item => item.recurring).length + ' recurring charges'} icon={Repeat}>{expenseTemplates.filter(item => item.recurring).length ? expenseTemplates.filter(item => item.recurring).map(template => <article className="edu-expenses-v1__template-row" key={template.id}><div><strong>{template.title}</strong><small>{formatCurrency(template.amount)} · {template.frequency} · {template.beneficiary}</small></div><div><EducationButton icon={Edit} onClick={() => { setEditingTemplateId(template.id); setTemplateForm(template); }}>Edit</EducationButton><EducationButton icon={Trash2} status="danger" onClick={() => handleDeleteTemplate(template.id)}>Delete</EducationButton></div></article>) : <EducationState title="No recurring templates" description="Define a monthly obligation to track it by due day." />}</EducationRegister>
                </div>}
            </div>}

            <Modal designSystem isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'Edit expense' : 'Record expense'}>
                <form onSubmit={handleSaveAdHocExpense} className="edu-expenses-v1__modal-form">
                    <p>Start with the cost and beneficiary. Add payment and evidence details when needed.</p>
                    <EducationFormSection title="Expense" icon={Receipt}>
                        <EducationField label="Title"><input required value={expenseForm.title || ''} onChange={event => setExpenseForm({ ...expenseForm, title: event.target.value })} placeholder="Plumbing repair" /></EducationField>
                        <EducationField label="Category"><select value={expenseForm.category} onChange={event => setExpenseForm({ ...expenseForm, category: event.target.value as Expense['category'] })}>{categories.slice(1).map(category => <option key={category} value={category}>{category}</option>)}</select></EducationField>
                        <EducationField label="Amount"><input type="number" min="0.01" step="0.01" required value={expenseForm.amount} onChange={event => setExpenseForm({ ...expenseForm, amount: Number(event.target.value) })} /></EducationField>
                        <EducationField label="Accounting date"><input type="date" required value={expenseForm.date || ''} onChange={event => setExpenseForm({ ...expenseForm, date: event.target.value })} /></EducationField>
                        <EducationField label="Beneficiary or supplier"><input required value={expenseForm.beneficiary || ''} onChange={event => setExpenseForm({ ...expenseForm, beneficiary: event.target.value })} /></EducationField>
                    </EducationFormSection>
                    <button type="button" className="edu-expenses-v1__disclosure" aria-expanded={showExpenseDetails} onClick={() => setShowExpenseDetails(!showExpenseDetails)}>{showExpenseDetails ? 'Hide' : 'Add'} payment and evidence details</button>
                    {showExpenseDetails && <EducationFormSection title="Payment and evidence" icon={Upload} accent="purple">
                        <EducationField label="Payment method"><select value={expenseForm.method || 'cash'} onChange={event => setExpenseForm({ ...expenseForm, method: event.target.value as Expense['method'] })}><option value="cash">Cash</option><option value="check">Check</option><option value="virement">Bank transfer</option></select></EducationField>
                        <EducationField label="Ledger status"><select value={expenseForm.status || 'paid'} onChange={event => setExpenseForm({ ...expenseForm, status: event.target.value as Expense['status'] })}><option value="paid">Paid</option><option value="pending">Pending</option></select></EducationField>
                        <EducationField label="Audit notes"><textarea rows={3} value={expenseForm.notes || ''} onChange={event => setExpenseForm({ ...expenseForm, notes: event.target.value })} placeholder="Reference or approval context" /></EducationField>
                        <EducationField label="Receipt image" hint={expenseForm.receiptUrl ? 'Image attached' : 'Optional image proof'}><input type="file" accept="image/*" onChange={event => handleFileUpload(event, 'form')} /></EducationField>
                    </EducationFormSection>}
                    <div className="edu-expenses-v1__form-actions"><EducationButton onClick={() => setIsModalOpen(false)}>Cancel</EducationButton><EducationButton type="submit" variant="primary" disabled={isSavingExpense}>{isSavingExpense ? 'Saving expense…' : isEditing ? 'Save changes' : 'Record expense'}</EducationButton></div>
                </form>
            </Modal>

            <Modal designSystem isOpen={isPayTemplateModalOpen} onClose={() => setIsPayTemplateModalOpen(false)} title={'Record ' + (payingTemplate?.title || 'recurring payment')}>
                <form onSubmit={handleConfirmPayment} className="edu-expenses-v1__modal-form">
                    <EducationNotice status="info">Template amount: {formatCurrency(payingTemplate?.amount || 0)}. This payment will be linked to the selected monthly charge.</EducationNotice>
                    <EducationFormSection title="Payment" icon={CheckCircle2}>
                        <EducationField label="Payment amount"><input type="number" min="0.01" step="0.01" required value={expenseForm.amount} onChange={event => setExpenseForm({ ...expenseForm, amount: Number(event.target.value) })} /></EducationField>
                        <EducationField label="Date"><input type="date" required value={expenseForm.date || ''} onChange={event => setExpenseForm({ ...expenseForm, date: event.target.value })} /></EducationField>
                        <EducationField label="Method"><select value={expenseForm.method || 'cash'} onChange={event => setExpenseForm({ ...expenseForm, method: event.target.value as Expense['method'] })}><option value="cash">Cash</option><option value="check">Check</option><option value="virement">Transfer</option></select></EducationField>
                        <EducationField label="Proof image" hint={paymentProof ? 'Image attached' : 'Optional receipt'}><input type="file" accept="image/*" onChange={event => handleFileUpload(event, 'pay')} /></EducationField>
                    </EducationFormSection>
                    {paymentProof && <img className="edu-expenses-v1__proof" src={paymentProof} alt="Payment proof preview" />}
                    <div className="edu-expenses-v1__form-actions"><EducationButton onClick={() => setIsPayTemplateModalOpen(false)}>Cancel</EducationButton><EducationButton type="submit" variant="primary" disabled={isSavingRecurringPayment}>{isSavingRecurringPayment ? 'Recording…' : 'Record payment'}</EducationButton></div>
                </form>
            </Modal>
            <Modal designSystem isOpen={!!showProof} onClose={() => setShowProof(null)} title="Expense receipt" size="lg">{showProof && <img src={showProof} className="edu-expenses-v1__proof" alt="Expense receipt" />}</Modal>
        </main>
    );
};
