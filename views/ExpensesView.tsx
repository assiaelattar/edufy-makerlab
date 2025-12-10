
import React, { useState, useMemo } from 'react';
import { TrendingDown, Plus, Filter, Search, DollarSign, PieChart, Trash2, Receipt, CheckCircle2, XCircle, Upload, Image as ImageIcon, Clock, Save, ArrowRight, Settings, CalendarCheck, Repeat, AlertTriangle, CheckSquare } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { formatCurrency, formatDate, compressImage } from '../utils/helpers';
import { addDoc, collection, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Expense, ExpenseTemplate } from '../types';

export const ExpensesView = () => {
    const { expenses, expenseTemplates, payments, settings } = useAppContext();
    const { can } = useAuth();
    
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

    // Payment Flow State
    const [payingTemplate, setPayingTemplate] = useState<ExpenseTemplate | null>(null);
    const [paymentProof, setPaymentProof] = useState<string>('');

    // --- DATA PROCESSING ---
    
    // 1. Recurring Status Logic (The "Virtual Bills" System)
    const recurringStatus = useMemo(() => {
        if (!selectedMonth) return [];
        
        return expenseTemplates.filter(t => t.recurring).map(template => {
            // Find if paid this month
            const matchedExpense = expenses.find(e => 
                e.templateId === template.id && 
                e.date.startsWith(selectedMonth) && 
                e.session === selectedSession
            );
            
            return {
                template,
                status: matchedExpense ? 'paid' : 'due',
                expense: matchedExpense
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
        const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
        
        // Income (From Payments)
        const relevantPayments = payments.filter(p => 
            (p.session === selectedSession) && 
            ['paid', 'verified'].includes(p.status) &&
            (!selectedMonth || p.date.startsWith(selectedMonth))
        );
        const totalIncome = relevantPayments.reduce((sum, p) => sum + p.amount, 0);
        const netProfit = totalIncome - totalExpenses;
        
        // Breakdown
        const breakdown: Record<string, number> = {};
        filteredExpenses.forEach(e => {
            breakdown[e.category] = (breakdown[e.category] || 0) + e.amount;
        });
        
        let topCategory = '-';
        let maxVal = 0;
        Object.entries(breakdown).forEach(([cat, val]) => {
            if(val > maxVal) { maxVal = val; topCategory = cat; }
        });

        return { totalExpenses, netProfit, totalIncome, breakdown, topCategory };
    }, [filteredExpenses, payments, selectedSession, selectedMonth]);

    // Helper for month display
    const displayMonthName = useMemo(() => {
        if(!selectedMonth) return "All Time";
        const d = new Date(selectedMonth);
        return isNaN(d.getTime()) ? selectedMonth : d.toLocaleString('default', { month: 'long' });
    }, [selectedMonth]);

    // --- ACTIONS ---

    const handlePayTemplateOpen = (template: ExpenseTemplate) => {
        setPayingTemplate(template);
        setExpenseForm({
            title: template.title,
            category: template.category,
            amount: template.amount,
            beneficiary: template.beneficiary,
            date: new Date().toISOString().split('T')[0],
            method: 'cash',
            status: 'paid',
            notes: `Monthly payment for ${template.title}`
        });
        setPaymentProof('');
        setIsPayTemplateModalOpen(true);
    };

    const handleConfirmPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !payingTemplate) return;

        try {
            await addDoc(collection(db, 'expenses'), {
                ...expenseForm,
                receiptUrl: paymentProof,
                templateId: payingTemplate.id,
                session: selectedSession,
                status: 'paid', // Immediate payment
                createdAt: serverTimestamp()
            });
            setIsPayTemplateModalOpen(false);
            setPayingTemplate(null);
        } catch (err) {
            console.error(err);
            alert("Error recording payment.");
        }
    };

    const handleSaveTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db) return;
        try {
            await addDoc(collection(db, 'expense_templates'), {
                ...templateForm,
                createdAt: serverTimestamp()
            });
            // Reset form but keep modal open for more
            setTemplateForm({ title: '', category: 'rent', amount: 0, beneficiary: '', recurring: true, frequency: 'monthly', dayDue: 1 });
        } catch (err) { console.error(err); }
    };

    const handleSaveAdHocExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db) return;
        try {
            if (isEditing && editingId) {
                await updateDoc(doc(db, 'expenses', editingId), expenseForm);
            } else {
                await addDoc(collection(db, 'expenses'), {
                    ...expenseForm,
                    session: selectedSession,
                    createdAt: serverTimestamp()
                });
            }
            setIsModalOpen(false);
            setIsEditing(false);
            setEditingId(null);
        } catch (err) { console.error(err); }
    };

    const handleDeleteExpense = async (id: string) => {
        if (!confirm("Delete this expense record?")) return;
        if (!db) return;
        await deleteDoc(doc(db, 'expenses', id));
    };

    const handleDeleteTemplate = async (id: string) => {
        if (!db || !confirm("Delete this template?")) return;
        await deleteDoc(doc(db, 'expense_templates', id));
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
            alert("Image processing failed.");
        }
    };

    return (
        <div className="space-y-6 pb-24 md:pb-8 md:h-full flex flex-col animate-in fade-in slide-in-from-right-4">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 p-4 rounded-xl border border-slate-800 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><TrendingDown className="w-6 h-6 text-rose-500"/> Expenses & Bills</h2>
                    <p className="text-slate-500 text-sm">Manage recurring obligations and track operating costs.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                     <select value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)} className="bg-slate-950 border border-slate-800 text-white text-sm rounded-lg px-3 py-2 focus:border-rose-500 outline-none">
                        <option value={settings.academicYear}>{settings.academicYear}</option>
                        <option value="2023-2024">2023-2024</option>
                    </select>
                    <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-slate-950 border border-slate-800 text-white text-sm rounded-lg px-3 py-2 focus:border-rose-500 outline-none"/>
                    
                    {can('expenses.manage') && (
                        <>
                            <button onClick={() => setIsTemplateManagerOpen(true)} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700" title="Manage Recurring Templates">
                                <Settings size={18}/>
                            </button>
                            <button onClick={() => { setIsEditing(false); setExpenseForm({title: '', category: 'other', amount: 0, date: new Date().toISOString().split('T')[0], method: 'cash', status: 'paid', beneficiary: ''}); setIsModalOpen(true); }} className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg transition-colors font-bold text-sm shadow-lg shadow-rose-900/20">
                                <Plus size={16}/> Record Expense
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* RECURRING CHARGES GRID */}
            {recurringStatus.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Repeat size={14}/> Recurring Charges for {displayMonthName}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {recurringStatus.map(({ template, status, expense }) => (
                            <div key={template.id} className={`border rounded-xl p-4 relative group transition-all ${status === 'paid' ? 'bg-slate-900/50 border-emerald-900/30' : 'bg-slate-900 border-amber-900/30 shadow-lg shadow-amber-900/5'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${status === 'paid' ? 'bg-emerald-900/20 text-emerald-500' : 'bg-amber-900/20 text-amber-500'}`}>
                                            {status === 'paid' ? <CheckCircle2 size={16}/> : <Clock size={16}/>}
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
                                    ) : (
                                        <div className="text-right">
                                            <div className="text-slate-300 font-bold text-sm">{formatCurrency(template.amount)}</div>
                                            <div className="text-[10px] text-amber-500 font-medium">Due Now</div>
                                        </div>
                                    )}
                                </div>
                                
                                {status === 'due' && (
                                    <button 
                                        onClick={() => handlePayTemplateOpen(template)}
                                        className="w-full mt-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                                    >
                                        Pay Now <ArrowRight size={12}/>
                                    </button>
                                )}
                                {status === 'paid' && (
                                    <div className="mt-3 text-center text-[10px] text-emerald-500 font-medium bg-emerald-950/30 py-1.5 rounded border border-emerald-900/30 flex items-center justify-center gap-1">
                                        Paid via {expense?.method}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                    <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><TrendingDown size={14}/> Total Expenses</div>
                    <div className="text-3xl font-bold text-white">{formatCurrency(stats.totalExpenses)}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                    <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><DollarSign size={14}/> Net Profit</div>
                    <div className={`text-3xl font-bold ${stats.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(stats.netProfit)}</div>
                    <div className="text-xs flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/50 font-medium">
                        <span className="text-emerald-500" title="Income">{formatCurrency(stats.totalIncome)}</span>
                        <span className="text-slate-500">-</span>
                        <span className="text-red-400" title="Expenses">{formatCurrency(stats.totalExpenses)}</span>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-xl p-5">
                    <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Highest Category</div>
                    <div className="text-xl font-bold text-white capitalize">{stats.topCategory}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:h-full md:min-h-0">
                {/* Expense History List */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col min-h-[400px] md:h-full">
                    <div className="p-4 border-b border-slate-800 bg-slate-950/30 flex flex-col sm:flex-row gap-3 justify-between items-center">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                            <input type="text" placeholder="Search expenses..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:border-rose-500 outline-none" />
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
                            {['All', 'rent', 'salary', 'utilities', 'material', 'marketing', 'other'].map(cat => (
                                <button key={cat} onClick={() => setCategoryFilter(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap border transition-colors ${categoryFilter === cat ? 'bg-rose-950/30 text-rose-400 border-rose-900/50' : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600'}`}>{cat}</button>
                            ))}
                        </div>
                    </div>

                    <div className="md:flex-1 md:overflow-y-auto custom-scrollbar p-2">
                        {filteredExpenses.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-500"><Receipt size={48} className="mb-4 opacity-20"/><p>No expenses found.</p></div>
                        ) : (
                            <div className="space-y-2">
                                {filteredExpenses.map(expense => (
                                    <div key={expense.id} className="bg-slate-950 border border-slate-800 hover:border-slate-700 p-4 rounded-xl transition-all group">
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
                                                {expense.receiptUrl && <button onClick={() => setShowProof(expense.receiptUrl!)} className="p-1.5 hover:bg-slate-800 rounded text-blue-400"><ImageIcon size={14}/></button>}
                                                {can('expenses.manage') && <button onClick={() => handleDeleteExpense(expense.id)} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400"><Trash2 size={14}/></button>}
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
                        {Object.entries(stats.breakdown).sort(([,a], [,b]) => (b as number) - (a as number)).map(([cat, amount]) => {
                            const val = amount as number;
                            const percentage = stats.totalExpenses > 0 ? (val / stats.totalExpenses) * 100 : 0;
                            return (
                                <div key={cat}>
                                    <div className="flex justify-between text-xs mb-1"><span className="text-slate-300 capitalize">{cat}</span><span className="text-slate-400">{Math.round(percentage)}%</span></div>
                                    <div className="h-2 bg-slate-950 rounded-full overflow-hidden"><div className="h-full bg-rose-600 rounded-full" style={{ width: `${percentage}%` }}></div></div>
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
                {/* ... form content ... */}
                <form onSubmit={handleSaveAdHocExpense} className="space-y-4">
                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Title</label><input required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={expenseForm.title} onChange={e => setExpenseForm({...expenseForm, title: e.target.value})} placeholder="e.g. Plumbing Repair"/></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Category</label><select className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white capitalize" value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value as any})}>{['rent', 'salary', 'utilities', 'material', 'marketing', 'other'].map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Amount</label><input type="number" required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white font-bold" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: Number(e.target.value)})}/></div>
                    </div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Date</label><input type="date" required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})}/></div>
                    <div><label className="block text-xs font-medium text-slate-400 mb-1">Beneficiary</label><input required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white" value={expenseForm.beneficiary} onChange={e => setExpenseForm({...expenseForm, beneficiary: e.target.value})}/></div>
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
                    <button type="submit" className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold">Save Expense</button>
                </form>
            </Modal>

            {/* 2. Pay Recurring Template Modal (The "Pay Now" Flow) */}
            <Modal isOpen={isPayTemplateModalOpen} onClose={() => setIsPayTemplateModalOpen(false)} title={`Pay ${payingTemplate?.title}`}>
                {/* ... form content ... */}
                <form onSubmit={handleConfirmPayment} className="space-y-5">
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center mb-2">
                        <span className="text-xs text-slate-400 uppercase">Default Amount</span>
                        <span className="text-white font-bold">{formatCurrency(payingTemplate?.amount || 0)}</span>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Payment Amount (Adjust if needed)</label>
                        <input type="number" required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white font-bold text-xl text-center focus:border-emerald-500 outline-none" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: Number(e.target.value)})}/>
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

                    <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center justify-center gap-2">
                        <CheckCircle2 size={18}/> Confirm Payment
                    </button>
                </form>
            </Modal>

            {/* 3. Template Manager Modal */}
            <Modal isOpen={isTemplateManagerOpen} onClose={() => setIsTemplateManagerOpen(false)} title="Manage Recurring Charges">
                {/* ... manager content ... */}
                <div className="space-y-6">
                    {/* Create New Template */}
                    <form onSubmit={handleSaveTemplate} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                        <h4 className="text-sm font-bold text-white mb-2">Define New Recurring Charge</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <input required placeholder="Title (e.g. Office Rent)" className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white text-sm" value={templateForm.title} onChange={e => setTemplateForm({...templateForm, title: e.target.value})}/>
                            <select className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white text-sm capitalize" value={templateForm.category} onChange={e => setTemplateForm({...templateForm, category: e.target.value as any})}>{['rent', 'salary', 'utilities', 'material', 'marketing', 'other'].map(c => <option key={c} value={c}>{c}</option>)}</select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <input type="number" required placeholder="Default Amount" className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white text-sm" value={templateForm.amount} onChange={e => setTemplateForm({...templateForm, amount: Number(e.target.value)})}/>
                            <input required placeholder="Beneficiary" className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white text-sm" value={templateForm.beneficiary} onChange={e => setTemplateForm({...templateForm, beneficiary: e.target.value})}/>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <select className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white text-sm" value={templateForm.frequency} onChange={e => setTemplateForm({...templateForm, frequency: e.target.value as any})}>
                                <option value="monthly">Monthly</option>
                                <option value="weekly">Weekly</option>
                            </select>
                            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-sm transition-colors">Add Template</button>
                        </div>
                    </form>

                    {/* List Existing */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Active Templates</h4>
                        {expenseTemplates.length === 0 ? <p className="text-slate-500 text-sm italic">No templates defined.</p> : 
                        expenseTemplates.map(t => (
                            <div key={t.id} className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800">
                                <div>
                                    <div className="font-bold text-white text-sm">{t.title}</div>
                                    <div className="text-xs text-slate-500">{t.frequency} • {formatCurrency(t.amount)}</div>
                                </div>
                                <button onClick={() => handleDeleteTemplate(t.id)} className="text-slate-500 hover:text-red-400 p-2 hover:bg-slate-900 rounded transition-colors"><Trash2 size={14}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>

            {/* Receipt Viewer */}
            {showProof && (
                <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setShowProof(null)}>
                    <img src={showProof} className="max-w-full max-h-full rounded-lg shadow-2xl" alt="Receipt" />
                    <button className="absolute top-4 right-4 text-white bg-slate-800 p-2 rounded-full hover:bg-slate-700"><XCircle size={24}/></button>
                </div>
            )}
        </div>
    );
};
