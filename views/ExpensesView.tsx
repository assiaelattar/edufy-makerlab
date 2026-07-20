
import React, { useEffect, useState, useMemo } from 'react';
import { TrendingDown, Plus, Search, DollarSign, PieChart, Trash2, Receipt, CheckCircle2, Upload, Image as ImageIcon, Clock, ArrowRight, Settings, Repeat, Edit, Download, Loader2, Info } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { Modal } from '../components/Modal';
import { formatCurrency, formatDate, compressImage } from '../utils/helpers';
import { addDoc, collection, serverTimestamp, deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Expense, ExpenseTemplate } from '../types';
import { AtlasActionButton, AtlasCommandHeader, AtlasEmptyState, AtlasSectionHeader, AtlasSignalCard, AtlasToolbar } from '../components/atlas/AtlasSurface';

const getRecurringDueDate = (month: string, dayDue?: number) => {
    const [year, monthNumber] = month.split('-').map(Number);
    const lastDay = new Date(year, monthNumber, 0).getDate();
    const dueDay = Math.min(Math.max(Number(dayDue) || 1, 1), lastDay);
    return `${month}-${String(dueDay).padStart(2, '0')}`;
};

export const ExpensesView = () => {
    const { expenses, expenseTemplates, payments, settings } = useAppContext();
    const { can, currentOrganization } = useAuth();
    const { confirm, alert: showAlert } = useConfirm();
    const orgId = currentOrganization?.id || '';

    // Dynamic session list derived from real data
    const availableSessions = useMemo(() => {
        const set = new Set<string>();
        if (settings.academicYear) set.add(settings.academicYear);
        expenses.forEach(e => { if (e.session) set.add(e.session); });
        return Array.from(set).sort().reverse();
    }, [expenses, settings.academicYear]);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
    const [isPayTemplateModalOpen, setIsPayTemplateModalOpen] = useState(false);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('All');
    
    // Filters
    const [selectedSession, setSelectedSession] = useState(settings.academicYear || '2024-2025');
    const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM

    const [showProof, setShowProof] = useState<string | null>(null);

    // Form State (Ad-Hoc / Edit)
    const [expenseForm, setExpenseForm] = useState<Partial<Expense>>({
        title: '', category: 'rent', amount: 0, date: new Date().toISOString().split('T')[0],
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

    // --- DATA PROCESSING ---
    
    // 1. Recurring Status Logic (The "Virtual Bills" System)
    const recurringStatus = useMemo(() => {
        if (!selectedMonth) return [];
        
        return expenseTemplates.filter(t => t.recurring).map(template => {
            if (template.frequency === 'weekly') {
                return { template, status: 'manual' as const, expense: undefined, dueDate: undefined };
            }
            const dueDate = getRecurringDueDate(selectedMonth, template.dayDue);
            // Find if paid this month
            const matchedExpense = expenses.find(e => 
                e.templateId === template.id && 
                e.date.startsWith(selectedMonth) && 
                e.session === selectedSession
            );
            
            return {
                template,
                status: matchedExpense ? 'paid' as const : dueDate > new Date().toISOString().split('T')[0] ? 'scheduled' as const : 'due' as const,
                expense: matchedExpense,
                dueDate
            };
        });
    }, [expenseTemplates, expenses, selectedMonth, selectedSession]);

    // 2. Filtered Expenses (The History List)
    const filteredExpenses = useMemo(() => {
        return expenses.filter(e => {
            const matchesSession = e.session === selectedSession;
            const matchesMonth = !selectedMonth || e.date.startsWith(selectedMonth);
            const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || e.beneficiary.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = categoryFilter === 'All' || e.category === categoryFilter;
            return matchesSession && matchesMonth && matchesSearch && matchesCategory;
        }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [expenses, selectedSession, selectedMonth, searchQuery, categoryFilter]);

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
        const d = new Date(selectedMonth);
        return isNaN(d.getTime()) ? selectedMonth : d.toLocaleString('default', { month: 'long' });
    }, [selectedMonth]);

    const recurringDueCount = recurringStatus.filter(item => item.status === 'due').length;
    const recurringScheduledCount = recurringStatus.filter(item => item.status === 'scheduled').length;
    const recurringManualCount = recurringStatus.filter(item => item.status === 'manual').length;

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
        if (!selectedMonth) return new Date().toISOString().split('T')[0];
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
                date: expenseForm.date || new Date().toISOString().split('T')[0],
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
            await showAlert(editingTemplateId ? 'Recurring charge updated' : 'Recurring charge added', 'The monthly obligation is ready for period tracking.', 'success');
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
                date: expenseForm.date || new Date().toISOString().split('T')[0],
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

    return (
        <div className="flex flex-col space-y-6 pb-24 md:h-full md:pb-8">
            
            <AtlasCommandHeader
                eyebrow="Finance operations"
                title="Expenses & Bills"
                description="Control recurring obligations, record operating costs, and protect the center's margin."
                icon={TrendingDown}
                badges={
                    <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-bold uppercase text-slate-300">
                        {selectedSession} / {displayMonthName}
                    </span>
                }
                actions={
                    <>
                    {can('expenses.manage') && (
                        <>
                            <AtlasActionButton icon={Settings} onClick={() => setIsTemplateManagerOpen(true)} title="Manage recurring charges">Recurring</AtlasActionButton>
                            <AtlasActionButton variant="primary" icon={Plus} onClick={() => { setIsEditing(false); setExpenseForm({title: '', category: 'other', amount: 0, date: new Date().toISOString().split('T')[0], method: 'cash', status: 'paid', beneficiary: ''}); setIsModalOpen(true); }}>
                                Record expense
                            </AtlasActionButton>
                        </>
                    )}
                    </>
                }
            />

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <AtlasSignalCard label="Period expenses" value={formatCurrency(stats.totalExpenses)} detail={displayMonthName} icon={TrendingDown} tone="red" />
                <AtlasSignalCard label="Session margin" value={formatCurrency(stats.sessionNetProfit)} detail={`${formatCurrency(stats.sessionTotalIncome)} income`} icon={DollarSign} tone={stats.sessionNetProfit >= 0 ? 'emerald' : 'red'} />
                <AtlasSignalCard label="Recurring due" value={recurringDueCount} detail={recurringScheduledCount > 0 ? `${recurringScheduledCount} scheduled later` : recurringDueCount === 1 ? 'Charge needs payment' : 'Charges need payment'} icon={Clock} tone={recurringDueCount > 0 ? 'amber' : 'slate'} />
                <AtlasSignalCard label="Highest category" value={stats.topCategory} detail="Largest period cost" icon={PieChart} tone="blue" />
            </div>

            <AtlasToolbar
                leading={
                    <>
                        <select value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)} className="h-10 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-teal-400/50">
                            {availableSessions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="h-10 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-teal-400/50"/>
                    </>
                }
                trailing={
                    <AtlasActionButton icon={Download} onClick={handleExportExpenses} disabled={filteredExpenses.length === 0} title={filteredExpenses.length === 0 ? 'No visible expense records to export' : 'Export the filtered expense ledger as CSV'}>
                        Export {filteredExpenses.length > 0 ? `(${filteredExpenses.length})` : ''}
                    </AtlasActionButton>
                }
            >
                <span className="text-xs text-slate-500">Showing expenses for the selected academic session and month.</span>
            </AtlasToolbar>

            {/* RECURRING CHARGES GRID */}
            {recurringStatus.length > 0 && (
                <div className="space-y-3">
                    <AtlasSectionHeader
                        title={`Recurring charges / ${displayMonthName}`}
                        description="Review fixed obligations before they become overdue."
                        icon={Repeat}
                        meta={
                            <span className="rounded-md bg-amber-400/10 px-2 py-1 text-[10px] font-bold uppercase text-amber-200">
                                {recurringDueCount} due{recurringManualCount > 0 ? ` / ${recurringManualCount} manual` : ''}
                            </span>
                        }
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {recurringStatus.map(({ template, status, expense, dueDate }) => (
                            <div key={template.id} className={`group relative rounded-lg border p-4 transition-colors ${status === 'paid' ? 'border-emerald-400/20 bg-slate-900/50' : status === 'manual' || status === 'scheduled' ? 'border-sky-400/20 bg-slate-900/70' : 'border-amber-300/25 bg-slate-900'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${status === 'paid' ? 'bg-emerald-900/20 text-emerald-500' : status === 'manual' || status === 'scheduled' ? 'bg-sky-900/20 text-sky-400' : 'bg-amber-900/20 text-amber-500'}`}>
                                            {status === 'paid' ? <CheckCircle2 size={16}/> : status === 'manual' ? <Info size={16}/> : <Clock size={16}/>}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white leading-tight">{template.title}</div>
                                            <div className="text-[10px] text-slate-500 uppercase tracking-wide">{template.frequency}</div>
                                        </div>
                                    </div>
                                    {status === 'paid' && expense ? (
                                        <div className="text-right">
                                            <div className="text-emerald-400 font-bold text-sm">{formatCurrency(expense.amount)}</div>
                                            <div className="text-[10px] text-slate-500">{formatDate(expense.date)}</div>
                                        </div>
                                    ) : status === 'due' || status === 'scheduled' ? (
                                        <div className="text-right">
                                            <div className="text-slate-300 font-bold text-sm">{formatCurrency(template.amount)}</div>
                                            <div className={`text-[10px] font-medium ${status === 'due' ? 'text-amber-500' : 'text-sky-400'}`}>{status === 'due' ? 'Due' : 'Scheduled'} {dueDate ? formatDate(dueDate) : ''}</div>
                                        </div>
                                    ) : (
                                        <div className="text-right">
                                            <div className="text-slate-300 font-bold text-sm">{formatCurrency(template.amount)}</div>
                                            <div className="text-[10px] text-sky-400 font-medium">Manual schedule</div>
                                        </div>
                                    )}
                                </div>
                                
                                {(status === 'due' || status === 'scheduled') && (
                                    <button 
                                        onClick={() => handlePayTemplateOpen(template)}
                                        className={`w-full mt-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors ${status === 'due' ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'border border-sky-400/20 bg-sky-400/10 text-sky-300 hover:bg-sky-400/15'}`}
                                    >
                                        {status === 'due' ? 'Record payment' : 'Record early'} <ArrowRight size={12}/>
                                    </button>
                                )}
                                {status === 'paid' && (
                                    <div className="mt-3 text-center text-[10px] text-emerald-500 font-medium bg-emerald-950/30 py-1.5 rounded border border-emerald-900/30 flex items-center justify-center gap-1">
                                        Paid via {expense?.method}
                                    </div>
                                )}
                                {status === 'manual' && (
                                    <button
                                        type="button"
                                        onClick={() => handlePayTemplateOpen(template)}
                                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-sky-400/20 bg-sky-400/10 py-2 text-xs font-bold text-sky-300 transition-colors hover:bg-sky-400/15"
                                        title="Weekly templates need a weekday or occurrence count before automatic tracking is reliable"
                                    >
                                        Review limitation <Info size={12} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:h-full md:min-h-0">
                {/* Expense History List */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col min-h-[400px] md:h-full">
                    <AtlasToolbar className="rounded-none border-0 border-b border-slate-800 bg-slate-950/30">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                            <input type="text" placeholder="Search expenses..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:border-rose-500 outline-none" />
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
                            {['All', 'rent', 'salary', 'utilities', 'material', 'marketing', 'other'].map(cat => (
                                <button key={cat} onClick={() => setCategoryFilter(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap border transition-colors ${categoryFilter === cat ? 'bg-rose-950/30 text-rose-400 border-rose-900/50' : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600'}`}>{cat}</button>
                            ))}
                        </div>
                    </AtlasToolbar>

                    <div className="md:flex-1 md:overflow-y-auto custom-scrollbar p-2">
                        {filteredExpenses.length === 0 ? (
                            <AtlasEmptyState
                                title="No expenses found"
                                description="Adjust the month, academic session, category, or search terms. No totals or exports are generated from an empty result."
                                icon={Receipt}
                                action={(searchQuery || categoryFilter !== 'All') ? <AtlasActionButton onClick={() => { setSearchQuery(''); setCategoryFilter('All'); }}>Clear filters</AtlasActionButton> : undefined}
                            />
                        ) : (
                            <div className="space-y-2">
                                {filteredExpenses.map(expense => (
                                    <div key={expense.id} className="group rounded-lg border border-slate-800 bg-slate-950 p-4 transition-colors hover:border-slate-700">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-start gap-3">
                                                <div className={`p-2 rounded-lg ${expense.category === 'rent' ? 'bg-blue-900/20 text-blue-400' : expense.category === 'salary' ? 'bg-purple-900/20 text-purple-400' : 'bg-slate-800 text-slate-400'}`}><DollarSign size={18}/></div>
                                                <div>
                                                    <h4 className="font-bold text-white text-sm">{expense.title}</h4>
                                                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                                        <span>{formatDate(expense.date)}</span><span>•</span><span className="capitalize">{expense.category}</span><span>•</span><span className="text-slate-400">{expense.beneficiary}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-white text-lg">{formatCurrency(expense.amount)}</div>
                                                {expense.status === 'pending' && <span className="text-[10px] text-amber-500 font-bold uppercase">Pending</span>}
                                            </div>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-center">
                                            <div className="text-xs text-slate-500">{expense.notes || '-'}</div>
                                            <div className="flex gap-2">
                                                {expense.receiptUrl && <button onClick={() => setShowProof(expense.receiptUrl!)} className="p-1.5 hover:bg-slate-800 rounded text-sky-400" title="View receipt" aria-label={`View receipt for ${expense.title}`}><ImageIcon size={14}/></button>}
                                                {can('expenses.manage') && (
                                                    <>
                                                        <button onClick={() => { setExpenseForm(expense); setEditingId(expense.id); setIsEditing(true); setIsModalOpen(true); }} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-blue-400" title="Edit Expense"><Edit size={14}/></button>
                                                        <button onClick={() => handleDeleteExpense(expense.id)} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400" title="Delete expense" aria-label={`Delete ${expense.title}`}><Trash2 size={14}/></button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Breakdown Chart */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 h-fit">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><PieChart size={16} className="text-rose-400"/> Category Breakdown</h3>
                    <div className="space-y-3">
                        {Object.keys(stats.breakdown).length === 0 && <p className="rounded-lg border border-dashed border-white/10 p-5 text-center text-xs leading-5 text-slate-500">No category totals are available for the filtered period.</p>}
                        {Object.entries(stats.breakdown).sort(([,a], [,b]) => (b as number) - (a as number)).map(([cat, amount]) => {
                            const val = amount as number;
                            const percentage = stats.totalExpenses > 0 ? (val / stats.totalExpenses) * 100 : 0;
                            return (
                                <div key={cat}>
                                    <div className="flex justify-between text-xs mb-1"><span className="text-slate-300 capitalize">{cat}</span><span className="text-slate-400">{Math.round(percentage)}%</span></div>
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-950"><div className="h-full rounded-full bg-amber-300" style={{ width: `${percentage}%` }}></div></div>
                                    <div className="text-[10px] text-slate-500 mt-0.5 text-right">{formatCurrency(val)}</div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* --- MODALS --- */}

            {/* 1. Ad-Hoc Expense Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? "Edit Expense" : "Record Ad-Hoc Expense"}>
                <form onSubmit={handleSaveAdHocExpense} className="space-y-4">
                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Title</label><input required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={expenseForm.title} onChange={e => setExpenseForm({...expenseForm, title: e.target.value})} placeholder="e.g. Plumbing Repair"/></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Category</label><select className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white capitalize" value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value as any})}>{['rent', 'salary', 'utilities', 'material', 'marketing', 'other'].map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Amount</label><input type="number" min="0.01" step="0.01" required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white font-bold" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: Number(e.target.value)})}/></div>
                    </div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Date</label><input type="date" required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})}/></div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Beneficiary</label><input required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={expenseForm.beneficiary} onChange={e => setExpenseForm({...expenseForm, beneficiary: e.target.value})}/></div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Payment method</label><select className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={expenseForm.method || 'cash'} onChange={e => setExpenseForm({...expenseForm, method: e.target.value as Expense['method']})}><option value="cash">Cash</option><option value="check">Check</option><option value="virement">Bank transfer</option></select></div>
                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Ledger status</label><select className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={expenseForm.status || 'paid'} onChange={e => setExpenseForm({...expenseForm, status: e.target.value as Expense['status']})}><option value="paid">Paid</option><option value="pending">Pending</option></select></div>
                    </div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Audit notes</label><textarea rows={3} className="w-full resize-y p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={expenseForm.notes || ''} onChange={e => setExpenseForm({...expenseForm, notes: e.target.value})} placeholder="Reference, approval context, or supplier details" /></div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Receipt (Optional)</label>
                        <div className="flex items-center gap-3">
                            <label className="cursor-pointer bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition-colors">
                                <Upload size={14}/> Upload
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'form')} />
                            </label>
                            {expenseForm.receiptUrl && <span className="text-xs text-emerald-400 flex items-center gap-1"><ImageIcon size={12}/> Attached</span>}
                        </div>
                    </div>
                    <button type="submit" disabled={isSavingExpense} className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-500 py-3 font-bold text-slate-950 transition-colors hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50">
                        {isSavingExpense && <Loader2 size={16} className="animate-spin" />}{isSavingExpense ? 'Saving expense...' : isEditing ? 'Save expense changes' : 'Record expense'}
                    </button>
                </form>
            </Modal>

            {/* 2. Pay Recurring Template Modal (The "Pay Now" Flow) */}
            <Modal isOpen={isPayTemplateModalOpen} onClose={() => setIsPayTemplateModalOpen(false)} title={`Pay ${payingTemplate?.title}`}>
                <form onSubmit={handleConfirmPayment} className="space-y-5">
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center mb-2">
                        <span className="text-xs text-slate-400 uppercase">Default Amount</span>
                        <span className="text-white font-bold">{formatCurrency(payingTemplate?.amount || 0)}</span>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Payment Amount (Adjust if needed)</label>
                        <input type="number" min="0.01" step="0.01" required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white font-bold text-xl text-center focus:border-emerald-500 outline-none" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: Number(e.target.value)})}/>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Date</label><input type="date" required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})}/></div>
                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Method</label><select className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={expenseForm.method} onChange={e => setExpenseForm({...expenseForm, method: e.target.value as any})}><option value="cash">Cash</option><option value="check">Check</option><option value="virement">Transfer</option></select></div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Proof / Receipt (Optional)</label>
                        <div className="flex items-center gap-3">
                            <label className="cursor-pointer bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition-colors w-full justify-center">
                                <Upload size={14}/> {paymentProof ? "Change File" : "Upload File"}
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'pay')} />
                            </label>
                        </div>
                        {paymentProof && (
                            <div className="mt-2 relative w-full h-32 bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
                                <img src={paymentProof} alt="Proof" className="w-full h-full object-contain"/>
                            </div>
                        )}
                    </div>

                    <button type="submit" disabled={isSavingRecurringPayment} className="w-full py-3 bg-teal-500 hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50 text-slate-950 rounded-lg font-bold flex items-center justify-center gap-2">
                        {isSavingRecurringPayment ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18}/>} {isSavingRecurringPayment ? 'Recording payment...' : 'Record recurring payment'}
                    </button>
                </form>
            </Modal>

            {/* 3. Template Manager Modal */}
            <Modal isOpen={isTemplateManagerOpen} onClose={() => setIsTemplateManagerOpen(false)} title="Manage Recurring Charges">
                <div className="space-y-6">
                    {/* Create New Template */}
                    <form onSubmit={handleSaveTemplate} className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
                        <h4 className="text-sm font-bold text-white mb-2">{editingTemplateId ? 'Edit Recurring Charge' : 'Define New Recurring Charge'}</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <input required placeholder="Title (e.g. Office Rent)" className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white text-sm" value={templateForm.title} onChange={e => setTemplateForm({...templateForm, title: e.target.value})}/>
                            <select className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white text-sm capitalize" value={templateForm.category} onChange={e => setTemplateForm({...templateForm, category: e.target.value as any})}>{['rent', 'salary', 'utilities', 'material', 'marketing', 'other'].map(c => <option key={c} value={c}>{c}</option>)}</select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <input type="number" min="0.01" step="0.01" required placeholder="Default Amount" className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white text-sm" value={templateForm.amount} onChange={e => setTemplateForm({...templateForm, amount: Number(e.target.value)})}/>
                            <input required placeholder="Beneficiary" className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white text-sm" value={templateForm.beneficiary} onChange={e => setTemplateForm({...templateForm, beneficiary: e.target.value})}/>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Frequency</label><select disabled className="w-full cursor-not-allowed p-2 bg-slate-900 border border-slate-700 rounded text-slate-400 text-sm" value="monthly"><option value="monthly">Monthly</option></select></div>
                            <div><label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Due day</label><input type="number" min="1" max="31" required className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white text-sm" value={templateForm.dayDue || 1} onChange={e => setTemplateForm({...templateForm, dayDue: Number(e.target.value)})}/></div>
                        </div>
                        <p className="text-[11px] leading-5 text-slate-500">Monthly schedules are tracked automatically. Existing weekly templates stay visible but require manual expense records because they do not store a weekday or occurrence count.</p>
                        <div className="flex gap-2">
                            {editingTemplateId && (
                                <button type="button" onClick={() => { setEditingTemplateId(null); setTemplateForm({ title: '', category: 'rent', amount: 0, beneficiary: '', recurring: true, frequency: 'monthly', dayDue: 1 }); }} className="flex-1 py-2 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-lg text-sm transition-colors font-bold">Cancel Edit</button>
                            )}
                            <button type="submit" disabled={isSavingTemplate} className="flex-1 py-2 bg-teal-500 hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50 text-slate-950 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                                {isSavingTemplate ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} {isSavingTemplate ? 'Saving...' : editingTemplateId ? 'Update charge' : 'Add charge'}
                            </button>
                        </div>
                    </form>

                    {/* List Templates */}
                    <div className="mt-6 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Active Templates</h4>
                        {expenseTemplates.filter(t => t.recurring).length === 0 && <p className="rounded-lg border border-dashed border-white/10 p-5 text-center text-xs leading-5 text-slate-500">No recurring charges yet. Define a monthly obligation above to track it by due day.</p>}
                        {expenseTemplates.filter(t => t.recurring).map(template => (
                            <div key={template.id} className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors">
                                <div>
                                    <div className="font-bold text-white text-sm">{template.title}</div>
                                    <div className="text-xs text-slate-400">{formatCurrency(template.amount)} • {template.frequency}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => {
                                        setEditingTemplateId(template.id);
                                        setTemplateForm(template);
                                    }} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors" title="Edit Template">
                                        <Edit size={14} />
                                    </button>
                                    <button onClick={() => handleDeleteTemplate(template.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors" title="Delete Template">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>

            {/* Receipt Viewer */}
            <Modal isOpen={!!showProof} onClose={() => setShowProof(null)} title="Expense receipt" size="lg">
                {showProof && <img src={showProof} className="max-h-[70vh] w-full rounded-lg bg-slate-950 object-contain" alt="Expense receipt" />}
            </Modal>
        </div>
    );
};
