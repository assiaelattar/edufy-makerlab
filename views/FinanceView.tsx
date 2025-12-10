
import React, { useState, useMemo, useEffect } from 'react';
import { CreditCard, Search, Eye, Printer, X, Filter, TrendingUp, Clock, DollarSign, FileText, Building, Calendar, RefreshCw, PieChart, AlertCircle, CheckCircle2, Users, ArrowRight, Phone } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, generateReceipt } from '../utils/helpers';

export const FinanceView = ({ onRecordPayment }: { onRecordPayment: (studentId?: string) => void }) => {
    const { payments, enrollments, students, programs, navigateTo, settings, viewParams } = useAppContext();
    const { can } = useAuth();
    
    // State
    const [viewMode, setViewMode] = useState<'transactions' | 'balances'>('balances'); // Default to balances for overview
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSession, setSelectedSession] = useState(settings.academicYear || '2024-2025');
    const [selectedProgram, setSelectedProgram] = useState('All');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    
    // Specific filters
    const [balanceFilter, setBalanceFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
    const [transactionStatusFilter, setTransactionStatusFilter] = useState<string>('all');

    // Initialize filters from params if present (e.g., from Dashboard "Checks to deposit")
    useEffect(() => {
        if (viewParams?.filter) {
            setViewMode('transactions');
            setTransactionStatusFilter(viewParams.filter as string);
        }
    }, [viewParams]);

    // --- DATA PREPARATION ---

    // 1. Available Sessions
    const availableSessions = useMemo(() => {
        const sessions = new Set<string>();
        if (settings.academicYear) sessions.add(settings.academicYear);
        payments.forEach(p => { if (p.session) sessions.add(p.session); });
        enrollments.forEach(e => { if (e.session) sessions.add(e.session); });
        return Array.from(sessions).sort().reverse();
    }, [payments, enrollments, settings.academicYear]);

    // 2. Filtered Data
    const { filteredPayments, filteredEnrollments } = useMemo(() => {
        // Common Filters (Search, Session, Program)
        const matchesSearch = (text: string) => !searchQuery || text.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSession = (itemSession?: string) => {
            if (itemSession) return itemSession === selectedSession;
            return selectedSession === settings.academicYear; // Fallback for legacy
        };
        const matchesProgram = (progId: string) => selectedProgram === 'All' || progId === selectedProgram;

        // Filter Payments
        const pFiltered = payments.filter(p => {
            const enrollment = enrollments.find(e => e.id === p.enrollmentId);
            return matchesSession(p.session) && 
                   matchesSearch(p.studentName + (p.checkNumber || '')) &&
                   (selectedProgram === 'All' || enrollment?.programId === selectedProgram) &&
                   (!dateRange.start || p.date >= dateRange.start) &&
                   (!dateRange.end || p.date <= dateRange.end) &&
                   (transactionStatusFilter === 'all' || p.status === transactionStatusFilter);
        });

        // Filter Enrollments (For Balance View)
        const eFiltered = enrollments.filter(e => {
            return e.status === 'active' && // Only care about active debt
                   matchesSession(e.session) &&
                   matchesSearch(e.studentName) &&
                   matchesProgram(e.programId) &&
                   (balanceFilter === 'all' || (balanceFilter === 'paid' ? e.balance <= 0 : e.balance > 0));
        });

        return { filteredPayments: pFiltered, filteredEnrollments: eFiltered };
    }, [payments, enrollments, searchQuery, selectedSession, selectedProgram, dateRange, balanceFilter, transactionStatusFilter, settings.academicYear]);

    // 3. Dashboard Statistics (Calculated from Enrollments for Accuracy on Debt)
    const stats = useMemo(() => {
        // We calculate stats based on ALL active enrollments in the session (ignoring text search/program filter for the top cards to give global context, 
        // unless we want cards to reflect filters. Let's make cards reflect SESSION only for stability, or filters? 
        // Usually dashboard cards reflect the current filtered view context is better for drilling down.)
        
        // Let's calculate stats based on the "Session" + "Program" filter, but ignore "Search" and "BalanceFilter" for the high-level cards
        // to ensure the "Total Paid" vs "Total Unpaid" numbers are useful.
        
        const baseEnrollments = enrollments.filter(e => {
            const matchesSession = e.session ? e.session === selectedSession : selectedSession === settings.academicYear;
            const matchesProgram = selectedProgram === 'All' || e.programId === selectedProgram;
            return e.status === 'active' && matchesSession && matchesProgram;
        });

        const totalExpected = baseEnrollments.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
        const totalPaid = baseEnrollments.reduce((sum, e) => sum + (e.paidAmount || 0), 0);
        const totalOutstanding = baseEnrollments.reduce((sum, e) => sum + (e.balance || 0), 0);
        
        const paidCount = baseEnrollments.filter(e => e.balance <= 0).length;
        const unpaidCount = baseEnrollments.filter(e => e.balance > 0).length;
        const totalStudents = baseEnrollments.length;
        
        const collectionRate = totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0;

        // Transaction Stats (for the Transaction view context)
        const realizedRevenue = payments.filter(p => 
            (p.session ? p.session === selectedSession : selectedSession === settings.academicYear) &&
            ['paid', 'verified'].includes(p.status)
        ).reduce((sum, p) => sum + p.amount, 0);

        return { totalExpected, totalPaid, totalOutstanding, paidCount, unpaidCount, totalStudents, collectionRate, realizedRevenue };
    }, [enrollments, payments, selectedSession, selectedProgram, settings.academicYear]);

    // Handlers
    const handleCardClick = (filterType: 'paid' | 'unpaid') => {
        setViewMode('balances');
        setBalanceFilter(filterType);
    };

    const handleWhatsApp = (enrollment: any) => {
        const student = students.find(s => s.id === enrollment.studentId);
        if (!student || !student.parentPhone) return alert("No parent phone number found.");
        
        const msg = `Hello ${student.parentName || 'Parent'}, kindly reminder regarding the outstanding balance of ${formatCurrency(enrollment.balance)} for ${student.name}'s enrollment in ${enrollment.programName}. Thank you.`;
        window.open(`https://wa.me/${student.parentPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    return (
        <div className="space-y-6 pb-24 md:pb-8 md:h-full flex flex-col animate-in fade-in slide-in-from-right-4">
           
           {/* Header & Action */}
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 p-4 rounded-xl border border-slate-800 gap-4">
              <div>
                  <h2 className="text-xl font-bold text-white">Financial Overview</h2>
                  <p className="text-slate-500 text-sm">Manage revenue, track debts, and monitor cash flow.</p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5 pointer-events-none"><Calendar size={14}/></div>
                        <select 
                            value={selectedSession} 
                            onChange={(e) => setSelectedSession(e.target.value)} 
                            className="pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg appearance-none focus:border-emerald-500 outline-none cursor-pointer hover:bg-slate-900"
                        >
                            {availableSessions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                   </div>
                  {can('finance.record_payment') && (
                      <button 
                          onClick={() => onRecordPayment()} 
                          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition-colors font-bold text-sm shadow-lg shadow-emerald-900/20"
                      >
                          <CreditCard size={16}/> <span className="hidden sm:inline">Record</span> Payment
                      </button>
                  )}
              </div>
           </div>

           {/* SMART CARDS - Student Centric */}
           {can('finance.view_totals') && (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                   {/* Card 1: Realized Revenue */}
                   <div className="bg-slate-900 border border-emerald-900/30 p-4 rounded-xl relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
                        <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><TrendingUp size={12}/> Realized Revenue</div>
                        <div className="text-2xl font-bold text-emerald-400 truncate">{formatCurrency(stats.realizedRevenue)}</div>
                        <div className="text-[10px] text-slate-500 mt-1">Cash in bank</div>
                   </div>

                   {/* Card 2: Outstanding Debt */}
                   <div className="bg-slate-900 border border-red-900/30 p-4 rounded-xl relative overflow-hidden group hover:border-red-500/50 transition-colors">
                        <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><AlertCircle size={12}/> Outstanding Debt</div>
                        <div className="text-2xl font-bold text-red-400 truncate">{formatCurrency(stats.totalOutstanding)}</div>
                        <div className="text-[10px] text-slate-500 mt-1">Total unpaid balances</div>
                   </div>

                   {/* Card 3: Paid Students (Clickable) */}
                   <div onClick={() => handleCardClick('paid')} className={`bg-slate-900 border p-4 rounded-xl relative overflow-hidden group transition-all cursor-pointer ${balanceFilter === 'paid' && viewMode === 'balances' ? 'border-emerald-500 bg-emerald-900/10' : 'border-slate-800 hover:border-emerald-500/30'}`}>
                        <div className="flex justify-between items-start">
                            <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><CheckCircle2 size={12}/> Fully Paid</div>
                            <ArrowRight size={14} className="text-slate-600 group-hover:text-emerald-400 transition-colors"/>
                        </div>
                        <div className="text-2xl font-bold text-white">{stats.paidCount} <span className="text-sm text-slate-500 font-medium">/ {stats.totalStudents}</span></div>
                        <div className="text-[10px] text-emerald-500 mt-1 font-medium">{Math.round((stats.paidCount/stats.totalStudents)*100 || 0)}% of students</div>
                   </div>

                   {/* Card 4: Unpaid Students (Clickable) */}
                   <div onClick={() => handleCardClick('unpaid')} className={`bg-slate-900 border p-4 rounded-xl relative overflow-hidden group transition-all cursor-pointer ${balanceFilter === 'unpaid' && viewMode === 'balances' ? 'border-red-500 bg-red-900/10' : 'border-slate-800 hover:border-red-500/30'}`}>
                        <div className="flex justify-between items-start">
                            <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Users size={12}/> Unpaid / Partial</div>
                            <ArrowRight size={14} className="text-slate-600 group-hover:text-red-400 transition-colors"/>
                        </div>
                        <div className="text-2xl font-bold text-white">{stats.unpaidCount} <span className="text-sm text-slate-500 font-medium">Students</span></div>
                        <div className="text-[10px] text-red-400 mt-1 font-medium">Action Required</div>
                   </div>

                   {/* Card 5: Collection Rate */}
                   <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl relative overflow-hidden group">
                        <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><PieChart size={12}/> Collection Rate</div>
                        <div className="flex items-center gap-3">
                            <div className="text-2xl font-bold text-blue-400">{Math.round(stats.collectionRate)}%</div>
                            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${stats.collectionRate}%` }}></div>
                            </div>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">Target: 100%</div>
                   </div>
               </div>
           )}

           {/* Main Content: Filters & List */}
           <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden md:flex-1 md:flex md:flex-col shadow-lg shadow-black/10">
               
               {/* Toolbar */}
               <div className="p-4 border-b border-slate-800 bg-slate-950/30 space-y-4">
                   {/* View Switcher */}
                   <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 w-full sm:w-auto">
                            <button onClick={() => setViewMode('balances')} className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${viewMode === 'balances' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>
                                <Users size={14}/> Student Balances
                            </button>
                            <button onClick={() => setViewMode('transactions')} className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${viewMode === 'transactions' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>
                                <FileText size={14}/> Transaction History
                            </button>
                        </div>

                        <div className="flex gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4"/>
                                <input 
                                    type="text" 
                                    placeholder={viewMode === 'balances' ? "Search student name..." : "Search transaction..."}
                                    value={searchQuery} 
                                    onChange={(e) => setSearchQuery(e.target.value)} 
                                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-emerald-500 outline-none" 
                                />
                            </div>
                            <div className="relative w-32 sm:w-40">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5" />
                                <select 
                                    value={selectedProgram} 
                                    onChange={(e) => setSelectedProgram(e.target.value)} 
                                    className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg appearance-none focus:border-emerald-500 outline-none cursor-pointer truncate"
                                >
                                    <option value="All">All Programs</option>
                                    {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                        </div>
                   </div>

                   {/* Secondary Filters for Transactions */}
                   {viewMode === 'transactions' && (
                       <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-slate-800/50 animate-in slide-in-from-top-2">
                           <div className="flex items-center gap-2 mr-4">
                                <span className="text-xs font-bold text-slate-500 uppercase">Status:</span>
                                <select 
                                    value={transactionStatusFilter} 
                                    onChange={(e) => setTransactionStatusFilter(e.target.value)} 
                                    className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none cursor-pointer"
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="paid">Paid / Verified</option>
                                    <option value="check_received">Check Received</option>
                                    <option value="check_deposited">Check Deposited</option>
                                    <option value="check_bounced">Check Bounced</option>
                                    <option value="pending_verification">Pending Transfer</option>
                                </select>
                           </div>
                           
                           <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-500 uppercase">Date Range:</span>
                                <input type="date" className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
                                <span className="text-slate-500">-</span>
                                <input type="date" className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
                                {(dateRange.start || dateRange.end || transactionStatusFilter !== 'all') && <button onClick={() => { setDateRange({start:'', end:''}); setTransactionStatusFilter('all'); }} className="text-xs text-red-400 hover:underline ml-2">Clear</button>}
                           </div>
                       </div>
                   )}

                   {/* Secondary Filters for Balances */}
                   {viewMode === 'balances' && (
                        <div className="flex gap-2 items-center pt-2 border-t border-slate-800/50 animate-in slide-in-from-top-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">Status:</span>
                            <button onClick={() => setBalanceFilter('all')} className={`px-3 py-1 rounded-full text-xs font-medium border ${balanceFilter === 'all' ? 'bg-slate-800 text-white border-slate-600' : 'text-slate-500 border-transparent hover:bg-slate-900'}`}>All</button>
                            <button onClick={() => setBalanceFilter('paid')} className={`px-3 py-1 rounded-full text-xs font-medium border ${balanceFilter === 'paid' ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900' : 'text-slate-500 border-transparent hover:bg-slate-900'}`}>Fully Paid</button>
                            <button onClick={() => setBalanceFilter('unpaid')} className={`px-3 py-1 rounded-full text-xs font-medium border ${balanceFilter === 'unpaid' ? 'bg-red-950/30 text-red-400 border-red-900' : 'text-slate-500 border-transparent hover:bg-slate-900'}`}>Unpaid / Partial</button>
                        </div>
                   )}
               </div>

               {/* DATA TABLE */}
               <div className="md:flex-1 md:overflow-y-auto custom-scrollbar bg-slate-900/50">
                   
                   {/* MODE: BALANCES */}
                   {viewMode === 'balances' && (
                       <table className="w-full text-left text-sm border-collapse">
                           <thead className="bg-slate-900 text-slate-400 font-semibold sticky top-0 z-10 shadow-sm text-xs uppercase tracking-wider">
                               <tr>
                                   <th className="p-4">Student</th>
                                   <th className="p-4">Program Info</th>
                                   <th className="p-4 text-right">Total Fee</th>
                                   <th className="p-4 text-right">Paid</th>
                                   <th className="p-4 text-right">Balance</th>
                                   <th className="p-4 text-right">Actions</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-800">
                               {filteredEnrollments.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-500 italic">No students found.</td></tr> : 
                               filteredEnrollments.map(enrollment => (
                                   <tr key={enrollment.id} className="hover:bg-slate-800/50 transition-colors group">
                                       <td className="p-4">
                                           <div className="font-bold text-white">{enrollment.studentName}</div>
                                           <div className="text-[10px] text-slate-500 uppercase">ID: {enrollment.studentId.slice(0,6)}</div>
                                       </td>
                                       <td className="p-4">
                                           <div className="text-xs text-blue-300 mb-0.5">{enrollment.programName}</div>
                                           <div className="text-[10px] text-slate-500">{enrollment.gradeName} • {enrollment.groupName}</div>
                                       </td>
                                       <td className="p-4 text-right text-slate-300 font-mono">{formatCurrency(enrollment.totalAmount)}</td>
                                       <td className="p-4 text-right text-emerald-400 font-mono">{formatCurrency(enrollment.paidAmount)}</td>
                                       <td className="p-4 text-right">
                                           <span className={`font-bold font-mono px-2 py-1 rounded ${enrollment.balance > 0 ? 'bg-red-950/30 text-red-400 border border-red-900/50' : 'text-slate-500'}`}>
                                               {formatCurrency(enrollment.balance)}
                                           </span>
                                       </td>
                                       <td className="p-4 text-right">
                                           <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                               {enrollment.balance > 0 && (
                                                   <button onClick={() => handleWhatsApp(enrollment)} className="p-2 hover:bg-slate-800 rounded text-emerald-500 transition-colors" title="Contact via WhatsApp">
                                                       <Phone size={16}/>
                                                   </button>
                                               )}
                                               <button onClick={() => onRecordPayment(enrollment.studentId)} className="p-2 hover:bg-slate-800 rounded text-blue-400 transition-colors" title="Record Payment">
                                                   <CreditCard size={16}/>
                                               </button>
                                               <button onClick={() => navigateTo('student-details', { studentId: enrollment.studentId })} className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors" title="View Profile">
                                                   <Eye size={16}/>
                                               </button>
                                           </div>
                                       </td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                   )}

                   {/* MODE: TRANSACTIONS */}
                   {viewMode === 'transactions' && (
                       <table className="w-full text-left text-sm border-collapse">
                           <thead className="bg-slate-900 text-slate-400 font-semibold sticky top-0 z-10 shadow-sm text-xs uppercase tracking-wider">
                               <tr>
                                   <th className="p-4 w-32">Date</th>
                                   <th className="p-4">Student</th>
                                   <th className="p-4">Amount</th>
                                   <th className="p-4">Method</th>
                                   <th className="p-4">Status</th>
                                   <th className="p-4 text-right">Actions</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-800">
                               {filteredPayments.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-500">No transactions found.</td></tr> :
                               filteredPayments.map(payment => (
                                   <tr key={payment.id} className="hover:bg-slate-800/50 transition-colors group">
                                       <td className="p-4 text-slate-400 font-mono text-xs">{formatDate(payment.date)}</td>
                                       <td className="p-4 font-medium text-white">{payment.studentName}</td>
                                       <td className="p-4 font-bold text-white font-mono">{can('finance.view_totals') ? formatCurrency(payment.amount) : '***'}</td>
                                       <td className="p-4">
                                           <div className="flex items-center gap-2 text-slate-300 capitalize text-xs">
                                               {payment.method === 'cash' && <DollarSign size={14} className="text-blue-400"/>}
                                               {payment.method === 'check' && <FileText size={14} className="text-purple-400"/>}
                                               {payment.method === 'virement' && <Building size={14} className="text-pink-400"/>}
                                               {payment.method === 'virement' ? 'Transfer' : payment.method}
                                           </div>
                                       </td>
                                       <td className="p-4">
                                           <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${['paid','verified'].includes(payment.status) ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/50' : payment.status === 'check_bounced' ? 'bg-red-950/30 text-red-400 border-red-900/50' : 'bg-amber-950/30 text-amber-400 border-amber-900/50'}`}>
                                               {payment.status.replace('_', ' ')}
                                           </span>
                                       </td>
                                       <td className="p-4 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                           <button onClick={() => navigateTo('activity-details', { activityId: { type: 'payment', id: payment.id }})} className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-blue-400 transition-colors" title="View Details"><Eye size={16}/></button>
                                           <button onClick={() => { const enrollment = enrollments.find(e => e.id === payment.enrollmentId); const student = students.find(s => s.id === enrollment?.studentId); generateReceipt(payment, enrollment, student, settings); }} className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-400 transition-colors" title="Print Receipt"><Printer size={16}/></button>
                                       </td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                   )}
               </div>
           </div>
        </div>
    );
};
