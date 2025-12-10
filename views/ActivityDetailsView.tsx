
import React, { useState } from 'react';
import { ArrowLeft, ArrowRightLeft, Printer, CalendarCheck, Phone, User, Clock, CheckCircle2, AlertCircle, Building, Briefcase, ArrowRight, Loader2, ImageIcon, Eye, Trash2, Pencil, XCircle, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { formatCurrency, formatDate, generateReceipt } from '../utils/helpers';
import { updateDoc, doc, deleteDoc, increment } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Payment } from '../types';
import { Modal } from '../components/Modal';

export const ActivityDetailsView = () => {
    const { viewParams, navigateTo, enrollments, payments, students, settings, bookings, workshopTemplates, workshopSlots } = useAppContext();
    const { activityId } = viewParams;
    
    // Edit Payment State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Payment>>({});
    const [showProofModal, setShowProofModal] = useState(false);

    // Confirmation Modal State
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'info' | 'danger' | 'warning';
        action: () => Promise<void>;
        isLoading?: boolean;
    }>({ isOpen: false, title: '', message: '', type: 'info', action: async () => {} });

    if (!activityId) return <div>Activity not found</div>;

    // Navigation Helper
    const getBackTarget = () => {
        if (activityId.type === 'booking') {
            return { view: 'workshops' as const, label: 'Back to Workshops', params: {} };
        }
        
        let studentId = '';
        if (activityId.type === 'enrollment') {
            const enrollment = enrollments.find(e => e.id === activityId.id);
            if (enrollment) studentId = enrollment.studentId;
        } else if (activityId.type === 'payment') {
            const payment = payments.find(p => p.id === activityId.id);
            if (payment) {
                const enrollment = enrollments.find(e => e.id === payment.enrollmentId);
                if (enrollment) studentId = enrollment.studentId;
            }
        }

        if (studentId) {
            return { view: 'student-details' as const, label: 'Back to Student Profile', params: { studentId } };
        }
        
        return { view: 'dashboard' as const, label: 'Back to Dashboard', params: {} };
    };

    const backTarget = getBackTarget();

    // --- ACTIONS ---

    const openStatusConfirmation = (payment: Payment, newStatus: Payment['status']) => {
        let title = "Update Status";
        let message = "Are you sure you want to update the status of this payment?";
        let type: 'info' | 'danger' | 'warning' = 'info';

        if (newStatus === 'check_bounced') {
            title = "Reject Check";
            message = "Are you sure you want to mark this check as BOUNCED/REJECTED?\n\nThis indicates the payment failed. If the amount was previously credited, this action will NOT automatically reverse the balance (unless you delete/edit). This status serves as a record of the failed transaction.";
            type = 'danger';
        } else if (newStatus === 'paid' || newStatus === 'verified') {
            title = "Confirm Payment Clearance";
            message = `This will mark the funds as CLEARED and reduce the student's debt by ${formatCurrency(payment.amount)}. Continue?`;
            type = 'warning'; // Warning because it affects financial balance
        } else if (newStatus === 'check_deposited') {
            title = "Confirm Deposit";
            message = "Mark this check as deposited in the bank? Funds are not yet cleared.";
        }

        setConfirmConfig({
            isOpen: true,
            title,
            message,
            type,
            action: async () => {
                if (!db) return;
                try {
                    const updates: any = { status: newStatus };
                    if (newStatus === 'check_deposited' && !payment.depositDate) {
                        updates.depositDate = new Date().toISOString().split('T')[0];
                    }
                    await updateDoc(doc(db, 'payments', payment.id), updates);
                    
                    // Handle Balance Update - ONLY when funds clear
                    if ((newStatus === 'paid' || newStatus === 'verified') && payment.status !== 'paid' && payment.status !== 'verified') {
                        const enrollment = enrollments.find(e => e.id === payment.enrollmentId);
                        if (enrollment) {
                            const newPaid = (enrollment.paidAmount || 0) + payment.amount;
                            const newBalance = enrollment.totalAmount - newPaid;
                            await updateDoc(doc(db, 'enrollments', enrollment.id), { paidAmount: newPaid, balance: newBalance });
                        }
                    }
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                } catch (e) {
                    console.error(e);
                    alert("Error updating status.");
                }
            }
        });
    };

    const openDeleteConfirmation = (payment: Payment) => {
        setConfirmConfig({
            isOpen: true,
            title: "Delete Payment Record",
            message: "Are you sure you want to permanently delete this payment? If the payment was already cleared, the student's balance will increase (debt returns).",
            type: 'danger',
            action: async () => {
                if (!db) return;
                try {
                    // If payment was cleared/paid, we need to revert the balance
                    if (['paid', 'verified'].includes(payment.status)) {
                        const enrollment = enrollments.find(e => e.id === payment.enrollmentId);
                        if (enrollment) {
                            await updateDoc(doc(db, 'enrollments', enrollment.id), {
                                paidAmount: increment(-payment.amount),
                                balance: increment(payment.amount)
                            });
                        }
                    }
                    await deleteDoc(doc(db, 'payments', payment.id));
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                    navigateTo(backTarget.view, backTarget.params);
                } catch (err) {
                    console.error(err);
                    alert("Failed to delete payment.");
                }
            }
        });
    };

    const handleEditPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!db || !activityId.id || !editForm) return;
        
        const originalPayment = payments.find(p => p.id === activityId.id);
        if(!originalPayment) return;

        try {
            await updateDoc(doc(db, 'payments', activityId.id), editForm);
            
            // If amount changed and it was a paid transaction, update enrollment balance
            if (editForm.amount && editForm.amount !== originalPayment.amount && ['paid', 'verified'].includes(originalPayment.status)) {
                const diff = editForm.amount - originalPayment.amount;
                const enrollment = enrollments.find(e => e.id === originalPayment.enrollmentId);
                if(enrollment) {
                    await updateDoc(doc(db, 'enrollments', enrollment.id), {
                        paidAmount: increment(diff),
                        balance: increment(-diff)
                    });
                }
            }
            
            setIsEditModalOpen(false);
        } catch(err) { console.error(err); }
    };

    // Helper to render check lifecycle stepper
    const renderCheckStepper = (status: string) => {
        const steps = [
            { id: 'check_received', label: 'Received' },
            { id: 'check_deposited', label: 'Deposited' },
            { id: 'paid', label: 'Cleared' }
        ];
        const currentIdx = steps.findIndex(s => s.id === status);
        if (currentIdx === -1 && status !== 'check_bounced') return null; 

        if (status === 'check_bounced') {
             return (
                <div className="flex items-center w-full max-w-md mb-6 bg-red-950/10 p-4 rounded-xl border border-red-900/30">
                    <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white"><XCircle size={16}/></div>
                        <span className="text-[10px] font-bold mt-2 uppercase tracking-wide text-red-400">Bounced</span>
                    </div>
                    <div className="flex-1 ml-4">
                        <p className="text-xs text-red-300">This check was rejected by the bank.</p>
                    </div>
                </div>
             )
        }

        return (
            <div className="flex items-center w-full max-w-md mb-6 bg-slate-950 p-4 rounded-xl border border-slate-800">
                {steps.map((step, idx) => (
                    <React.Fragment key={step.id}>
                        <div className="flex flex-col items-center relative z-10">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 border-2 ${idx <= currentIdx ? 'bg-emerald-500 border-emerald-500 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>{idx < currentIdx ? <CheckCircle2 size={16}/> : idx + 1}</div>
                            <span className={`text-[10px] font-bold mt-2 uppercase tracking-wide ${idx <= currentIdx ? 'text-emerald-400' : 'text-slate-600'}`}>{step.label}</span>
                        </div>
                        {idx < steps.length - 1 && (<div className={`flex-1 h-0.5 mx-2 -mt-4 transition-all duration-500 ${idx < currentIdx ? 'bg-emerald-500' : 'bg-slate-800'}`}></div>)}
                    </React.Fragment>
                ))}
            </div>
        );
    };

    // --- CASE 1: WORKSHOP BOOKING ---
    if (activityId.type === 'booking') {
        const booking = bookings.find(b => b.id === activityId.id);
        if (!booking) return <div className="p-8 text-center text-slate-500">Booking not found.</div>;
        const template = workshopTemplates.find(t => t.id === booking.workshopTemplateId);
        return (
            <div className="max-w-2xl mx-auto pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4">
               <button onClick={() => navigateTo(backTarget.view, backTarget.params)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"><ArrowLeft size={16}/> {backTarget.label}</button>
               <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                   <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-pink-900/20 to-slate-900 flex justify-between items-start">
                       <div>
                           <div className="flex items-center gap-2 mb-1"><CalendarCheck className="text-pink-500" size={20}/><h2 className="text-xl font-bold text-white">Workshop Booking</h2></div>
                           <p className="text-slate-400 text-sm">For {template?.title}</p>
                       </div>
                       <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${booking.status === 'confirmed' ? 'bg-emerald-500 text-emerald-950' : 'bg-slate-700 text-slate-300'}`}>{booking.status}</span>
                   </div>
                   <div className="p-6 space-y-6">
                        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 grid grid-cols-2 gap-4">
                             <div><span className="text-slate-500 text-xs uppercase tracking-wider font-bold mb-1 block">Parent</span><div className="font-medium text-white flex items-center gap-2"><User size={14} className="text-blue-400"/> {booking.parentName}</div><div className="text-sm text-slate-400 mt-1 flex items-center gap-2"><Phone size={14} className="text-emerald-400"/> <a href={`tel:${booking.phoneNumber}`} className="hover:text-white">{booking.phoneNumber}</a></div></div>
                             <div><span className="text-slate-500 text-xs uppercase tracking-wider font-bold mb-1 block">Student</span><div className="font-medium text-white">{booking.kidName}</div><div className="text-sm text-slate-400 mt-1">{booking.kidAge} years old</div></div>
                        </div>
                   </div>
               </div>
            </div>
        );
    } 
    
    // --- CASE 2: ENROLLMENT ---
    else if (activityId.type === 'enrollment') {
        const enrollment = enrollments.find(e => e.id === activityId.id);
        if (!enrollment) return <div>Enrollment not found</div>;
        return (
           <div className="max-w-3xl mx-auto pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4">
               <button onClick={() => navigateTo(backTarget.view, backTarget.params)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"><ArrowLeft size={16}/> {backTarget.label}</button>
               <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                   <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-blue-900/20 to-slate-900">
                       <h2 className="text-xl font-bold text-white mb-1">Enrollment Details</h2>
                       <p className="text-blue-400 font-medium">{enrollment.studentName}</p>
                   </div>
                   <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-4">
                           <div><span className="text-slate-500 text-xs block">Program</span><span className="text-white font-medium">{enrollment.programName}</span></div>
                           <div><span className="text-slate-500 text-xs block">Class</span><span className="text-white">{enrollment.gradeName} • {enrollment.groupName}</span></div>
                       </div>
                       <div className="space-y-4">
                           <div><span className="text-slate-500 text-xs block">Balance</span><span className={`font-bold text-lg ${enrollment.balance > 0 ? 'text-red-400' : 'text-slate-300'}`}>{formatCurrency(enrollment.balance)}</span></div>
                       </div>
                   </div>
                   <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-3">
                        <button onClick={() => navigateTo('student-details', { studentId: enrollment.studentId })} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors">View Student Profile</button>
                   </div>
               </div>
           </div>
        );
    } 
    
    // --- CASE 3: PAYMENT (Detail View) ---
    else {
        const payment = payments.find(p => p.id === activityId.id);
        if(!payment) return <div>Payment not found</div>;
        const enrollment = enrollments.find(e => e.id === payment.enrollmentId);
        const student = students.find(s => s.id === enrollment?.studentId);

        return (
            <div className="max-w-2xl mx-auto pb-24 md:pb-8 animate-in fade-in slide-in-from-bottom-4 relative">
               <button onClick={() => navigateTo(backTarget.view, backTarget.params)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"><ArrowLeft size={16}/> {backTarget.label}</button>
               
               <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-emerald-900/20 to-slate-900 flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold text-white mb-1">Payment Details</h2>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${['paid','verified'].includes(payment.status) ? 'bg-emerald-500 text-emerald-950' : payment.status === 'check_bounced' ? 'bg-red-500 text-white' : 'bg-amber-500 text-amber-950'}`}>
                                {payment.status.replace('_', ' ')}
                            </span>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-white">{formatCurrency(payment.amount)}</div>
                            <div className="text-slate-500 text-sm">{formatDate(payment.date)}</div>
                        </div>
                    </div>
                    <div className="p-6 space-y-6">
                        
                        {/* CHECK LIFECYCLE */}
                        {payment.method === 'check' && renderCheckStepper(payment.status)}

                        {/* WORKFLOW ACTIONS */}
                        {payment.status !== 'paid' && payment.status !== 'verified' && payment.status !== 'check_bounced' && (
                             <div className="mb-6 animate-in slide-in-from-bottom-2">
                                 {/* Received Check -> Deposit */}
                                 {payment.method === 'check' && payment.status === 'check_received' && (
                                     <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 shadow-inner">
                                         <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Briefcase size={12}/> Next Action</h4>
                                         <button onClick={() => openStatusConfirmation(payment, 'check_deposited')} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-900/20 active:scale-[0.98]">
                                             <Building className="w-5 h-5"/>
                                             <span>Confirm Check Deposit</span>
                                         </button>
                                     </div>
                                 )}
                                 
                                 {/* Deposited Check -> Clear or Bounce */}
                                 {payment.method === 'check' && payment.status === 'check_deposited' && (
                                     <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-inner">
                                         <div className="flex items-center gap-2 mb-4 text-emerald-400 text-sm font-medium bg-emerald-950/20 p-3 rounded-lg border border-emerald-900/30">
                                            <CheckCircle2 size={18}/> <span>Deposited on {formatDate(payment.depositDate || payment.date)}</span>
                                         </div>
                                         <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Briefcase size={12}/> Finalize Status</h4>
                                         <div className="grid grid-cols-2 gap-4">
                                             <button onClick={() => openStatusConfirmation(payment, 'paid')} className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-[0.98]">
                                                 <CheckCircle2 className="w-5 h-5"/>
                                                 <span>Funds Cleared</span>
                                             </button>
                                             <button onClick={() => openStatusConfirmation(payment, 'check_bounced')} className="py-3 bg-slate-800 hover:bg-red-900/30 text-red-400 hover:text-red-300 border border-red-900/30 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                                                 <XCircle className="w-5 h-5"/>
                                                 <span>Reject / Bounce</span>
                                             </button>
                                         </div>
                                     </div>
                                 )}

                                 {/* Pending Transfer -> Verify */}
                                 {payment.method === 'virement' && payment.status === 'pending_verification' && (
                                      <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 shadow-inner">
                                          {payment.proofUrl && (
                                              <div className="mb-4 relative group cursor-pointer" onClick={() => setShowProofModal(true)}>
                                                  <img src={payment.proofUrl} alt="Proof" className="w-full h-32 object-cover rounded-lg opacity-70 group-hover:opacity-100 transition-opacity border border-slate-700"/>
                                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><span className="bg-black/70 text-white px-3 py-1 rounded-full text-xs flex items-center gap-1"><Eye size={12}/> View Proof</span></div>
                                              </div>
                                          )}
                                          <button onClick={() => openStatusConfirmation(payment, 'verified')} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2">
                                              <CheckCircle2 size={18}/>
                                              <span>Verify Transfer & Clear Balance</span>
                                          </button>
                                      </div>
                                 )}
                             </div>
                        )}
                        
                        {payment.status === 'check_bounced' && (
                            <div className="bg-red-950/20 border border-red-900/50 p-4 rounded-xl flex items-start gap-3">
                                <AlertCircle className="text-red-500 mt-1" size={24}/>
                                <div>
                                    <h4 className="text-red-400 font-bold">Payment Rejected</h4>
                                    <p className="text-slate-400 text-xs mt-1">
                                        This check bounced. The amount has NOT been credited to the student's balance.
                                        You may need to contact the parent or delete this record and try again.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                             <div><span className="text-slate-500 text-xs block uppercase tracking-wider font-bold mb-1">Student</span><span className="text-white font-medium text-lg">{payment.studentName}</span></div>
                             <div><span className="text-slate-500 text-xs block uppercase tracking-wider font-bold mb-1">Method</span><span className="text-white capitalize">{payment.method === 'virement' ? 'Bank Transfer' : payment.method}</span></div>
                             {payment.checkNumber && <div><span className="text-slate-500 text-xs block uppercase tracking-wider font-bold mb-1">Check No.</span><span className="text-white font-mono bg-slate-950 px-2 py-1 rounded border border-slate-800">{payment.checkNumber}</span></div>}
                             {payment.bankName && <div><span className="text-slate-500 text-xs block uppercase tracking-wider font-bold mb-1">Bank</span><span className="text-white">{payment.bankName}</span></div>}
                             {payment.depositDate && <div><span className="text-slate-500 text-xs block uppercase tracking-wider font-bold mb-1">Deposit Date</span><span className="text-white">{formatDate(payment.depositDate)}</span></div>}
                             {payment.proofUrl && <div><span className="text-slate-500 text-xs block uppercase tracking-wider font-bold mb-1">Proof</span><button onClick={() => setShowProofModal(true)} className="text-blue-400 hover:underline flex items-center gap-1"><ImageIcon size={14}/> View Image</button></div>}
                        </div>
                        
                        {enrollment && <div className="bg-slate-950 p-4 rounded border border-slate-800"><h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Linked Enrollment</h4><div className="text-sm text-white font-medium">{enrollment.programName}</div><div className="text-xs text-slate-500">{enrollment.gradeName} • {enrollment.groupName}</div></div>}
                    </div>
                    <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center gap-3">
                        <div className="flex gap-2">
                            <button onClick={() => { setEditForm(payment); setIsEditModalOpen(true); }} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors border border-slate-700 flex items-center gap-2"><Pencil size={14}/> Edit</button>
                            <button onClick={() => openDeleteConfirmation(payment)} className="px-3 py-2 bg-slate-800 hover:bg-red-900/20 text-slate-400 hover:text-red-400 rounded-lg text-sm transition-colors border border-slate-700 hover:border-red-900/50 flex items-center gap-2"><Trash2 size={14}/></button>
                        </div>
                        <button onClick={() => generateReceipt(payment, enrollment, student, settings)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors flex items-center gap-2"><Printer size={16}/> Print Receipt</button>
                    </div>
               </div>

               {/* Proof Modal */}
               {showProofModal && payment.proofUrl && (
                   <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setShowProofModal(false)}>
                       <img src={payment.proofUrl} className="max-w-full max-h-full rounded-lg shadow-2xl" alt="Proof Fullscreen" />
                   </div>
               )}

               {/* Edit Payment Modal */}
               <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Payment Record">
                   <form onSubmit={handleEditPayment} className="space-y-4">
                        <div><label className="text-xs text-slate-400 block mb-1">Amount</label><input type="number" className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: Number(e.target.value)})} /></div>
                        <div><label className="text-xs text-slate-400 block mb-1">Date</label><input type="date" className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} /></div>
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Method</label>
                            <select 
                                className="w-full p-3 bg-slate-950 border border-slate-800 rounded p-2 text-white" 
                                value={editForm.method} 
                                onChange={e => setEditForm({...editForm, method: e.target.value as any})}>
                                <option value="cash">Cash</option><option value="check">Check</option><option value="virement">Transfer</option>
                            </select>
                        </div>
                        {editForm.method === 'check' && (
                            <>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="text-xs text-slate-400 block mb-1">Check No.</label><input className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" value={editForm.checkNumber || ''} onChange={e => setEditForm({...editForm, checkNumber: e.target.value})} /></div>
                                    <div><label className="text-xs text-slate-400 block mb-1">Bank</label><input className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" value={editForm.bankName || ''} onChange={e => setEditForm({...editForm, bankName: e.target.value})} /></div>
                                </div>
                                <div><label className="text-xs text-slate-400 block mb-1">Deposit Date</label><input type="date" className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white" value={editForm.depositDate || ''} onChange={e => setEditForm({...editForm, depositDate: e.target.value})} /></div>
                            </>
                        )}
                        <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold">Save Changes</button>
                   </form>
               </Modal>

                {/* Custom Confirmation Modal */}
                <Modal isOpen={confirmConfig.isOpen} onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} title={confirmConfig.title} size="md">
                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-full ${confirmConfig.type === 'danger' ? 'bg-red-900/20 text-red-500' : confirmConfig.type === 'warning' ? 'bg-amber-900/20 text-amber-500' : 'bg-blue-900/20 text-blue-500'}`}>
                                <AlertTriangle size={24}/>
                            </div>
                            <div>
                                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{confirmConfig.message}</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button 
                                onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                                className="px-4 py-2 text-slate-400 hover:text-white text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={async () => {
                                    setConfirmConfig(prev => ({ ...prev, isLoading: true }));
                                    await confirmConfig.action();
                                    setConfirmConfig(prev => ({ ...prev, isLoading: false }));
                                }}
                                disabled={confirmConfig.isLoading}
                                className={`px-5 py-2 rounded-lg text-white text-sm font-bold flex items-center gap-2 shadow-lg transition-all ${confirmConfig.type === 'danger' ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20' : confirmConfig.type === 'warning' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'}`}
                            >
                                {confirmConfig.isLoading && <Loader2 size={16} className="animate-spin"/>}
                                Confirm
                            </button>
                        </div>
                    </div>
                </Modal>
            </div>
        );
    }
};
