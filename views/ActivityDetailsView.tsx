
import React, { useState } from 'react';
import { ArrowLeft, ArrowRightLeft, Printer, CalendarCheck, Phone, User, Clock, CheckCircle2, AlertCircle, Building, Briefcase, ArrowRight, ImageIcon, Eye, Trash2, Pencil, XCircle, Receipt, BookOpen, WalletCards, ExternalLink } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { formatCurrency, formatDate, generateReceipt } from '../utils/helpers';
import { updateDoc, doc, deleteDoc, increment } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Payment } from '../types';
import { Modal } from '../components/Modal';
import { useConfirm } from '../context/ConfirmContext';
import {
    AtlasActionButton,
    AtlasCommandHeader,
    AtlasEmptyState,
    AtlasSectionHeader,
    AtlasSignalCard
} from '../components/atlas/AtlasSurface';

export const ActivityDetailsView = () => {
    const { viewParams, navigateTo, enrollments, payments, students, settings, bookings, workshopTemplates, workshopSlots } = useAppContext();
    const { confirm, alert: showAlert } = useConfirm();
    const { activityId } = viewParams;
    
    // Edit Payment State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Payment>>({});
    const [showProofModal, setShowProofModal] = useState(false);

    if (!activityId) return <AtlasEmptyState icon={Receipt} title="Activity not found" description="This record is unavailable or the link is incomplete." />;

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

    const openStatusConfirmation = async (payment: Payment, newStatus: Payment['status']) => {
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

        const approved = await confirm({
            title,
            message,
            variant: type,
            confirmText: newStatus === 'check_bounced' ? 'Reject check' : 'Update status'
        });
        if (!approved || !db) return;

        try {
            const updates: any = { status: newStatus };
            if (newStatus === 'check_deposited' && !payment.depositDate) {
                updates.depositDate = new Date().toISOString().split('T')[0];
            }
            await updateDoc(doc(db, 'payments', payment.id), updates);

            if ((newStatus === 'paid' || newStatus === 'verified') && payment.status !== 'paid' && payment.status !== 'verified') {
                const enrollment = enrollments.find(e => e.id === payment.enrollmentId);
                if (enrollment) {
                    const newPaid = (enrollment.paidAmount || 0) + payment.amount;
                    const newBalance = enrollment.totalAmount - newPaid;
                    await updateDoc(doc(db, 'enrollments', enrollment.id), { paidAmount: newPaid, balance: newBalance });
                }
            }
        } catch (error) {
            console.error(error);
            await showAlert('Status was not updated', 'The payment record could not be changed. Try again.', 'danger');
        }
    };

    const openDeleteConfirmation = async (payment: Payment) => {
        const approved = await confirm({
            title: "Delete Payment Record",
            message: "Are you sure you want to permanently delete this payment? If the payment was already cleared, the student's balance will increase (debt returns).",
            variant: 'danger',
            confirmText: 'Delete payment'
        });
        if (!approved || !db) return;

        try {
            const enrollment = enrollments.find(e => e.id === payment.enrollmentId);
            if (enrollment) {
                const otherPayments = payments.filter(p => p.enrollmentId === payment.enrollmentId && p.id !== payment.id);
                const newPaid = otherPayments.filter(p => ['paid', 'verified'].includes(p.status)).reduce((sum, p) => sum + p.amount, 0);
                const newBalance = (enrollment.totalAmount || 0) - newPaid;
                await updateDoc(doc(db, 'enrollments', enrollment.id), { paidAmount: newPaid, balance: newBalance });
            }
            await deleteDoc(doc(db, 'payments', payment.id));
            navigateTo(backTarget.view, backTarget.params);
        } catch (error) {
            console.error(error);
            await showAlert('Payment was not deleted', 'The payment record is still available. Try again.', 'danger');
        }
    };

    const handleEditPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!db || !activityId.id || !editForm) return;
        
        const originalPayment = payments.find(p => p.id === activityId.id);
        if(!originalPayment) return;

        try {
            let newStatus = originalPayment.status;
            const updatedPayment = { ...editForm };
            if (editForm.method && editForm.method !== originalPayment.method) {
                if (editForm.method === 'cash') newStatus = 'paid';
                else if (editForm.method === 'virement') newStatus = 'pending_verification';
                else if (editForm.method === 'check') newStatus = 'check_received';
                
                updatedPayment.status = newStatus;
                
                // Clean up fields
                if (editForm.method !== 'check') {
                    updatedPayment.checkNumber = null as any;
                    updatedPayment.bankName = null as any;
                    updatedPayment.depositDate = null as any;
                }
                if (editForm.method !== 'virement') {
                    updatedPayment.proofUrl = null as any;
                }
            }

            await updateDoc(doc(db, 'payments', activityId.id), updatedPayment);
            
            const wasCleared = ['paid', 'verified'].includes(originalPayment.status);
            const isCleared = ['paid', 'verified'].includes(newStatus);
            const originalAmount = Number(originalPayment.amount) || 0;
            const newAmount = Number(editForm.amount !== undefined ? editForm.amount : originalPayment.amount) || 0;
            
            const diff = (isCleared ? newAmount : 0) - (wasCleared ? originalAmount : 0);
            if (diff !== 0) {
                const enrollment = enrollments.find(e => e.id === originalPayment.enrollmentId);
                if (enrollment) {
                    await updateDoc(doc(db, 'enrollments', enrollment.id), {
                        paidAmount: increment(diff),
                        balance: increment(-diff)
                    });
                }
            }
            
            setIsEditModalOpen(false);
        } catch(err) {
            console.error(err);
            await showAlert('Payment was not updated', 'The changes could not be saved. Review the details and try again.', 'danger');
        }
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
        if (!booking) return <AtlasEmptyState icon={CalendarCheck} title="Booking not found" description="This workshop booking may have been removed." />;
        const template = workshopTemplates.find(t => t.id === booking.workshopTemplateId);
        const slot = workshopSlots.find(s => s.id === booking.workshopSlotId);
        return (
            <div className="mx-auto max-w-5xl space-y-5 pb-24 animate-in fade-in duration-200 md:pb-8">
                <AtlasCommandHeader
                    eyebrow="Workshop record"
                    title={booking.kidName}
                    description={`Booking for ${template?.title || 'workshop session'}, coordinated with ${booking.parentName}.`}
                    icon={CalendarCheck}
                    badges={<span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${booking.status === 'confirmed' || booking.status === 'attended' ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-white/10 bg-white/[0.04] text-slate-300'}`}>{booking.status.replace('_', ' ')}</span>}
                    actions={<AtlasActionButton icon={ArrowLeft} variant="quiet" onClick={() => navigateTo(backTarget.view, backTarget.params)}>{backTarget.label}</AtlasActionButton>}
                />
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <AtlasSignalCard label="Workshop" value={template?.title || 'Unassigned'} detail="Booked experience" icon={BookOpen} tone="teal" />
                    <AtlasSignalCard label="Session date" value={slot?.date ? formatDate(slot.date) : 'Not set'} detail={slot ? `${slot.startTime} - ${slot.endTime}` : 'Schedule unavailable'} icon={Clock} tone="blue" />
                    <AtlasSignalCard label="Learner age" value={`${booking.kidAge} years`} detail={booking.kidInterests || 'No interests recorded'} icon={User} tone="slate" />
                    <AtlasSignalCard label="Family contact" value={booking.parentName} detail={booking.phoneNumber} icon={Phone} tone="amber" />
                </div>
                <section className="space-y-4 rounded-lg border border-white/10 bg-slate-900/55 p-5">
                    <AtlasSectionHeader
                        title="Booking details"
                        description="Family contact, learner context, and the selected workshop schedule."
                        icon={CalendarCheck}
                        actions={<a href={`tel:${booking.phoneNumber}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-3.5 py-2 text-sm font-bold text-slate-200 transition-colors hover:bg-white/[0.08]"><Phone size={16}/>Call parent</a>}
                    />
                    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-white/10 bg-slate-950/60 p-4"><dt className="text-[10px] font-bold uppercase text-slate-500">Parent</dt><dd className="mt-1 font-bold text-white">{booking.parentName}</dd><dd className="text-sm text-slate-400">{booking.phoneNumber}</dd></div>
                        <div className="rounded-lg border border-white/10 bg-slate-950/60 p-4"><dt className="text-[10px] font-bold uppercase text-slate-500">Learner</dt><dd className="mt-1 font-bold text-white">{booking.kidName}</dd><dd className="text-sm text-slate-400">{booking.kidAge} years old</dd></div>
                        {booking.notes && <div className="rounded-lg border border-white/10 bg-slate-950/60 p-4 sm:col-span-2"><dt className="text-[10px] font-bold uppercase text-slate-500">Notes</dt><dd className="mt-1 text-sm leading-6 text-slate-300">{booking.notes}</dd></div>}
                    </dl>
                </section>
            </div>
        );
    } 
    
    // --- CASE 2: ENROLLMENT ---
    else if (activityId.type === 'enrollment') {
        const enrollment = enrollments.find(e => e.id === activityId.id);
        if (!enrollment) return <AtlasEmptyState icon={BookOpen} title="Enrollment not found" description="This enrollment may have been archived or removed." />;
        return (
           <div className="mx-auto max-w-5xl space-y-5 pb-24 animate-in fade-in duration-200 md:pb-8">
               <AtlasCommandHeader
                   eyebrow="Enrollment record"
                   title={enrollment.studentName}
                   description={`${enrollment.programName} · ${enrollment.gradeName} · ${enrollment.groupName}`}
                   icon={BookOpen}
                   badges={<span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${enrollment.status === 'active' ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-white/10 bg-white/[0.04] text-slate-300'}`}>{enrollment.status}</span>}
                   actions={<><AtlasActionButton icon={ArrowLeft} variant="quiet" onClick={() => navigateTo(backTarget.view, backTarget.params)}>{backTarget.label}</AtlasActionButton><AtlasActionButton icon={ExternalLink} variant="primary" onClick={() => navigateTo('student-details', { studentId: enrollment.studentId })}>Open profile</AtlasActionButton></>}
               />
               <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                   <AtlasSignalCard label="Total tuition" value={formatCurrency(enrollment.totalAmount || 0)} detail="Enrollment value" icon={WalletCards} tone="blue" />
                   <AtlasSignalCard label="Paid" value={formatCurrency(enrollment.paidAmount || 0)} detail="Cleared payments" icon={CheckCircle2} tone="emerald" />
                   <AtlasSignalCard label="Balance due" value={formatCurrency(enrollment.balance || 0)} detail={enrollment.balance > 0 ? 'Family follow-up needed' : 'Account settled'} icon={AlertCircle} tone={enrollment.balance > 0 ? 'amber' : 'teal'} />
                   <AtlasSignalCard label="Pack" value={enrollment.packName || 'Not set'} detail={enrollment.startDate ? `Started ${formatDate(enrollment.startDate)}` : 'Start date unavailable'} icon={Briefcase} tone="slate" />
               </div>
               <section className="overflow-hidden rounded-lg border border-white/10 bg-slate-900/55">
                   <div className="p-5"><AtlasSectionHeader title="Learning placement" description="The program, level, and class attached to this enrollment." icon={BookOpen} /></div>
                   <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-4">
                           <div><span className="text-slate-500 text-xs block">Program</span><span className="text-white font-medium">{enrollment.programName}</span></div>
                           <div><span className="text-slate-500 text-xs block">Class</span><span className="text-white">{enrollment.gradeName} • {enrollment.groupName}</span></div>
                       </div>
                       <div className="space-y-4">
                           <div><span className="text-slate-500 text-xs block">Balance</span><span className={`font-bold text-lg ${enrollment.balance > 0 ? 'text-red-400' : 'text-slate-300'}`}>{formatCurrency(enrollment.balance)}</span></div>
                       </div>
                   </div>
               </section>
           </div>
        );
    } 
    
    // --- CASE 3: PAYMENT (Detail View) ---
    else {
        const payment = payments.find(p => p.id === activityId.id);
        if(!payment) return <AtlasEmptyState icon={Receipt} title="Payment not found" description="This payment may have been deleted or moved." />;
        const enrollment = enrollments.find(e => e.id === payment.enrollmentId);
        const student = students.find(s => s.id === enrollment?.studentId);

        return (
            <div className="relative mx-auto max-w-5xl space-y-5 pb-24 animate-in fade-in duration-200 md:pb-8">
               <AtlasCommandHeader
                   eyebrow="Payment record"
                   title={formatCurrency(payment.amount)}
                   description={`Recorded for ${payment.studentName} on ${formatDate(payment.date)}.`}
                   icon={Receipt}
                   badges={<span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${['paid','verified'].includes(payment.status) ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : payment.status === 'check_bounced' ? 'border-red-400/20 bg-red-400/10 text-red-300' : 'border-amber-300/20 bg-amber-300/10 text-amber-200'}`}>{payment.status.replace('_', ' ')}</span>}
                   actions={<><AtlasActionButton icon={ArrowLeft} variant="quiet" onClick={() => navigateTo(backTarget.view, backTarget.params)}>{backTarget.label}</AtlasActionButton><AtlasActionButton icon={Printer} variant="primary" onClick={() => generateReceipt(payment, enrollment, student, settings)}>Print receipt</AtlasActionButton></>}
               />
               <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                   <AtlasSignalCard label="Amount" value={formatCurrency(payment.amount)} detail="Recorded payment" icon={WalletCards} tone="teal" />
                   <AtlasSignalCard label="Method" value={payment.method === 'virement' ? 'Bank transfer' : payment.method} detail="Payment channel" icon={ArrowRightLeft} tone="blue" />
                   <AtlasSignalCard label="Status" value={payment.status.replace('_', ' ')} detail={['paid','verified'].includes(payment.status) ? 'Funds cleared' : 'Action may be required'} icon={CheckCircle2} tone={['paid','verified'].includes(payment.status) ? 'emerald' : payment.status === 'check_bounced' ? 'red' : 'amber'} />
                   <AtlasSignalCard label="Linked balance" value={formatCurrency(enrollment?.balance || 0)} detail={enrollment?.programName || 'Enrollment unavailable'} icon={BookOpen} tone="slate" />
               </div>
               <section className="overflow-hidden rounded-lg border border-white/10 bg-slate-900/55">
                    <div className="p-5 pb-0"><AtlasSectionHeader title="Payment workflow" description="Review evidence, move the payment through clearance, or correct the record." icon={WalletCards} /></div>
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
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-slate-950/60 p-4">
                        <div className="flex gap-2">
                            <AtlasActionButton icon={Pencil} onClick={() => { setEditForm(payment); setIsEditModalOpen(true); }}>Edit payment</AtlasActionButton>
                            <AtlasActionButton aria-label="Delete payment" title="Delete payment" icon={Trash2} variant="danger" onClick={() => openDeleteConfirmation(payment)} />
                        </div>
                        <AtlasActionButton icon={Printer} variant="primary" onClick={() => generateReceipt(payment, enrollment, student, settings)}>Print receipt</AtlasActionButton>
                    </div>
               </section>

               {/* Proof Modal */}
               {showProofModal && payment.proofUrl && (
                   <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={() => setShowProofModal(false)} role="dialog" aria-label="Payment proof">
                       <img src={payment.proofUrl} className="max-h-full max-w-full rounded-lg shadow-2xl" alt="Payment proof" />
                   </div>
               )}

               {/* Edit Payment Modal */}
               <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Payment Record">
                   <form onSubmit={handleEditPayment} className="space-y-4">
                        <div><label className="mb-1 block text-xs text-slate-400">Amount</label><input type="number" className="min-h-10 w-full rounded-lg border border-white/10 bg-slate-950 p-2 text-white outline-none focus:border-teal-400/60" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: Number(e.target.value)})} /></div>
                        <div><label className="mb-1 block text-xs text-slate-400">Date</label><input type="date" className="min-h-10 w-full rounded-lg border border-white/10 bg-slate-950 p-2 text-white outline-none focus:border-teal-400/60" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} /></div>
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Method</label>
                            <select 
                                className="min-h-10 w-full rounded-lg border border-white/10 bg-slate-950 p-2 text-white outline-none focus:border-teal-400/60"
                                value={editForm.method} 
                                onChange={e => setEditForm({...editForm, method: e.target.value as any})}>
                                <option value="cash">Cash</option><option value="check">Check</option><option value="virement">Transfer</option>
                            </select>
                        </div>
                        {editForm.method === 'check' && (
                            <>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="mb-1 block text-xs text-slate-400">Check No.</label><input className="min-h-10 w-full rounded-lg border border-white/10 bg-slate-950 p-2 text-white outline-none focus:border-teal-400/60" value={editForm.checkNumber || ''} onChange={e => setEditForm({...editForm, checkNumber: e.target.value})} /></div>
                                    <div><label className="mb-1 block text-xs text-slate-400">Bank</label><input className="min-h-10 w-full rounded-lg border border-white/10 bg-slate-950 p-2 text-white outline-none focus:border-teal-400/60" value={editForm.bankName || ''} onChange={e => setEditForm({...editForm, bankName: e.target.value})} /></div>
                                </div>
                                <div><label className="mb-1 block text-xs text-slate-400">Deposit date</label><input type="date" className="min-h-10 w-full rounded-lg border border-white/10 bg-slate-950 p-2 text-white outline-none focus:border-teal-400/60" value={editForm.depositDate || ''} onChange={e => setEditForm({...editForm, depositDate: e.target.value})} /></div>
                            </>
                        )}
                        <AtlasActionButton type="submit" variant="primary" className="w-full">Save changes</AtlasActionButton>
                   </form>
               </Modal>
            </div>
        );
    }
};
