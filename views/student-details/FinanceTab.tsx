import React from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  FileText,
  Image as ImageIcon,
  Pencil,
  Printer,
  ReceiptText,
  Share2,
  Trash2,
  Wallet
} from 'lucide-react';
import { Enrollment, Payment, Student } from '../../types';
import { formatCurrency, formatDate, generateReceipt, normalizePhone } from '../../utils/helpers';
import { useConfirm } from '../../context/ConfirmContext';
import { useAuth } from '../../context/AuthContext';
import { InvoiceModal } from '../../components/finance/InvoiceModal';
import { Modal } from '../../components/Modal';
import { AtlasActionButton, AtlasEmptyState, AtlasSectionHeader, AtlasSignalCard } from '../../components/atlas/AtlasSurface';

interface FinanceTabProps {
  studentPayments: Payment[];
  studentEnrollments: Enrollment[];
  student: Student;
  onRecordPayment: (id: string, enrollmentId?: string) => void;
  navigateTo: (view: string, params: any) => void;
  setEditPayment: (payment: Payment) => void;
  initiateDeletePayment: (payment: Payment) => void;
  settings: any;
  onShareReceipt: (id: string) => void | Promise<void>;
}

const isCleared = (payment: Payment) => ['paid', 'verified'].includes(payment.status);

const statusLabel: Record<Payment['status'], string> = {
  paid: 'Paid',
  verified: 'Verified',
  pending_verification: 'Pending verification',
  check_received: 'Check received',
  check_deposited: 'Check deposited',
  check_bounced: 'Check bounced'
};

const getStatusLabel = (status: string) => statusLabel[status as Payment['status']] || status.replace(/_/g, ' ');

export const FinanceTab: React.FC<FinanceTabProps> = ({
  studentPayments,
  studentEnrollments,
  student,
  onRecordPayment,
  navigateTo,
  setEditPayment,
  initiateDeletePayment,
  settings,
  onShareReceipt
}) => {
  const [invoiceModal, setInvoiceModal] = React.useState<{ isOpen: boolean; payment: Payment | null }>({ isOpen: false, payment: null });
  const [proofUrl, setProofUrl] = React.useState<string | null>(null);
  const { alert: showAlert } = useConfirm();
  const { can, currentOrganization } = useAuth();
  const canManagePayments = can('finance.record_payment');

  const tenantEnrollments = React.useMemo(
    () => studentEnrollments.filter(enrollment => !currentOrganization?.id || enrollment.organizationId === currentOrganization.id),
    [studentEnrollments, currentOrganization?.id]
  );
  const tenantEnrollmentIds = React.useMemo(() => new Set(tenantEnrollments.map(enrollment => enrollment.id)), [tenantEnrollments]);
  const sortedPayments = React.useMemo(
    () => studentPayments
      .filter(payment => tenantEnrollmentIds.has(payment.enrollmentId) && (!currentOrganization?.id || !payment.organizationId || payment.organizationId === currentOrganization.id))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [studentPayments, tenantEnrollmentIds, currentOrganization?.id]
  );

  const clearedTotal = sortedPayments.filter(isCleared).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const pendingTotal = sortedPayments.filter(payment => !isCleared(payment) && payment.status !== 'check_bounced').reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const activeEnrollments = tenantEnrollments.filter(enrollment => enrollment.status === 'active');
  const openBalance = activeEnrollments.reduce((sum, enrollment) => sum + Math.max(0, Number(enrollment.balance) || 0), 0);
  const bouncedCount = sortedPayments.filter(payment => payment.status === 'check_bounced').length;
  const academyName = settings?.academyName || currentOrganization?.name || 'Edufy ERP';

  const openWhatsApp = async (message: string) => {
    const phone = normalizePhone(student.parentPhone);
    if (!phone) {
      await showAlert('Parent phone missing', 'Add a valid parent phone number before sharing finance documents.', 'warning');
      return false;
    }
    const shareWindow = window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    if (!shareWindow) {
      await showAlert('WhatsApp could not open', 'Allow popups for this site, then try sharing again.', 'warning');
      return false;
    }
    try { shareWindow.opener = null; } catch { /* Browser already isolated the new tab. */ }
    return true;
  };

  const handleRecordPayment = async (enrollmentId?: string) => {
    if (!canManagePayments) {
      await showAlert('Permission required', 'Your role cannot record payments.', 'warning');
      return;
    }
    const target = enrollmentId ? activeEnrollments.find(enrollment => enrollment.id === enrollmentId) : activeEnrollments[0];
    if (!target) {
      await showAlert('No active enrollment', 'Add or reactivate an enrollment before recording a payment.', 'warning');
      return;
    }
    onRecordPayment(student.id, enrollmentId || (activeEnrollments.length === 1 ? target.id : undefined));
  };

  const shareContract = async (enrollment: Enrollment) => {
    const schedule = enrollment.paymentPromises || [];
    if (schedule.length === 0) {
      await showAlert('No payment schedule', 'Add payment promises to the enrollment before sharing a contract.', 'info');
      return;
    }
    const promisedTotal = schedule.reduce((sum, promise) => sum + Number(promise.amount || 0), 0);
    if (Math.abs(promisedTotal - Number(enrollment.totalAmount || 0)) > 0.01) {
      await showAlert('Contract totals do not match', 'Reconcile the payment promise total with the enrollment fee before sharing this contract.', 'warning');
      return;
    }
    const promisesList = schedule.map(promise => `- ${promise.month}: ${formatCurrency(promise.amount)}`).join('\n');
    const message = `Payment contract - ${academyName}\n\nStudent: ${student.name}\nProgram: ${enrollment.programName}\nTotal fee: ${formatCurrency(enrollment.totalAmount)}\nRemaining balance: ${formatCurrency(enrollment.balance)}\n\nScheduled payments:\n${promisesList}\n\nPlease contact the academy if this schedule needs to change.`;
    await openWhatsApp(message);
  };

  const shareReceipt = async (payment: Payment) => {
    if (!isCleared(payment)) {
      await showAlert('Receipt not available yet', 'Share a receipt only after the payment is cleared. Pending transfers and checks remain acknowledgements, not receipts.', 'warning');
      return;
    }
    const enrollment = tenantEnrollments.find(item => item.id === payment.enrollmentId);
    const message = `Payment receipt - ${academyName}\n\nStudent: ${student.name}\nDate: ${formatDate(payment.date)}\nAmount: ${formatCurrency(payment.amount)}\nMethod: ${payment.method === 'virement' ? 'Bank transfer' : payment.method}\nProgram: ${enrollment?.programName || 'Enrollment'}\nReference: ${payment.id.slice(0, 8).toUpperCase()}\n\nThank you for your payment.`;
    if (await openWhatsApp(message)) {
      await Promise.resolve(onShareReceipt(payment.id));
    }
  };

  const printReceipt = async (payment: Payment) => {
    if (!isCleared(payment)) {
      await showAlert('Receipt not available yet', 'A printable receipt becomes available when the payment is paid or verified.', 'warning');
      return;
    }
    const enrollment = tenantEnrollments.find(item => item.id === payment.enrollmentId);
    generateReceipt(payment, enrollment, student, settings);
  };

  const renderPaymentActions = (payment: Payment, stopPropagation = false) => {
    const stop = (event: React.MouseEvent) => { if (stopPropagation) event.stopPropagation(); };
    const receiptReady = isCleared(payment);
    return (
      <div className="flex flex-wrap justify-end gap-1">
        <button type="button" onClick={event => { stop(event); navigateTo('activity-details', { activityId: { type: 'payment', id: payment.id } }); }} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-teal-300" title="View payment audit details" aria-label="View payment audit details"><Eye size={16} /></button>
        {payment.proofUrl && <button type="button" onClick={event => { stop(event); setProofUrl(payment.proofUrl!); }} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-sky-300" title="View payment proof" aria-label="View payment proof"><ImageIcon size={16} /></button>}
        <button type="button" onClick={event => { stop(event); setInvoiceModal({ isOpen: true, payment }); }} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-amber-200" title="Open invoice" aria-label="Open invoice"><FileText size={16} /></button>
        <button type="button" onClick={event => { stop(event); void printReceipt(payment); }} disabled={!receiptReady} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-30" title={receiptReady ? 'Print cleared payment receipt' : 'Available when payment clears'} aria-label="Print payment receipt"><ReceiptText size={16} /></button>
        <button type="button" onClick={event => { stop(event); void shareReceipt(payment); }} disabled={!receiptReady} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-teal-300 disabled:cursor-not-allowed disabled:opacity-30" title={receiptReady ? 'Share cleared receipt on WhatsApp' : 'Available when payment clears'} aria-label="Share payment receipt"><Share2 size={16} /></button>
        {canManagePayments && <button type="button" onClick={event => { stop(event); setEditPayment(payment); }} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white" title="Edit payment" aria-label="Edit payment"><Pencil size={16} /></button>}
        {canManagePayments && <button type="button" onClick={event => { stop(event); initiateDeletePayment(payment); }} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-300" title="Delete payment and recalculate balance" aria-label="Delete payment"><Trash2 size={16} /></button>}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <AtlasSignalCard label="Open balance" value={formatCurrency(openBalance)} detail={openBalance > 0 ? 'Across active tenant enrollments' : 'Account settled'} icon={Wallet} tone={openBalance > 0 ? 'amber' : 'emerald'} />
        <AtlasSignalCard label="Cleared payments" value={formatCurrency(clearedTotal)} detail={`${sortedPayments.filter(isCleared).length} cleared record${sortedPayments.filter(isCleared).length === 1 ? '' : 's'}`} icon={CheckCircle2} tone="emerald" />
        <AtlasSignalCard label="In transit" value={formatCurrency(pendingTotal)} detail="Transfers and checks not cleared" icon={Clock} tone={pendingTotal > 0 ? 'amber' : 'slate'} />
        <AtlasSignalCard label="Rejected checks" value={bouncedCount} detail={bouncedCount > 0 ? 'Review before collecting again' : 'No bounced checks'} icon={AlertTriangle} tone={bouncedCount > 0 ? 'red' : 'slate'} />
      </div>

      {tenantEnrollments.filter(enrollment => enrollment.paymentPromises?.length).map(enrollment => {
        const schedule = [...(enrollment.paymentPromises || [])].sort((a, b) => a.month.localeCompare(b.month));
        const totalPromised = schedule.reduce((sum, promise) => sum + Number(promise.amount || 0), 0);
        const paidForEnrollment = sortedPayments.filter(payment => payment.enrollmentId === enrollment.id && isCleared(payment)).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
        let cumulative = 0;
        const currentMonth = new Date().toISOString().slice(0, 7);
        return (
          <section key={`contract-${enrollment.id}`} className="overflow-hidden rounded-lg border border-amber-300/15 bg-amber-400/[0.035]">
            <div className="p-4">
              <AtlasSectionHeader
                title={enrollment.programName}
                description="Payment promise schedule"
                icon={FileText}
                actions={<AtlasActionButton icon={Share2} onClick={() => void shareContract(enrollment)}>Send contract</AtlasActionButton>}
              />
            </div>
            <div className="border-t border-white/10 p-4">
              <div className="mb-4 flex flex-wrap gap-x-8 gap-y-3 text-sm">
                <div><span className="mb-1 block text-xs font-bold text-slate-500">Promised</span><span className="font-mono text-white">{formatCurrency(totalPromised)}</span></div>
                <div><span className="mb-1 block text-xs font-bold text-slate-500">Cleared</span><span className="font-mono font-bold text-emerald-300">{formatCurrency(paidForEnrollment)}</span></div>
                <div><span className="mb-1 block text-xs font-bold text-slate-500">Current balance</span><span className={`font-mono font-bold ${enrollment.balance > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>{formatCurrency(enrollment.balance)}</span></div>
              </div>
              {Math.abs(totalPromised - Number(enrollment.totalAmount || 0)) > 0.01 && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-300/20 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" /> Promise total differs from the enrollment fee by {formatCurrency(Math.abs(totalPromised - Number(enrollment.totalAmount || 0)))}. Review the contract before sharing it.
                </div>
              )}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {schedule.map((promise, index) => {
                  const previousCumulative = cumulative;
                  cumulative += Number(promise.amount || 0);
                  const covered = paidForEnrollment + 0.005 >= cumulative;
                  const partial = !covered && paidForEnrollment > previousCumulative;
                  const overdue = !covered && promise.month < currentMonth;
                  const tone = covered ? 'text-emerald-300' : overdue ? 'text-red-300' : partial ? 'text-amber-300' : 'text-slate-400';
                  return (
                    <div key={`${promise.month}-${index}`} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/60 p-3">
                      <div><div className="mb-1 flex items-center gap-1 text-xs font-bold uppercase text-slate-500"><Calendar size={12} /> {promise.month}</div><div className="font-mono font-bold text-white">{formatCurrency(promise.amount)}</div></div>
                      <span className={`text-[10px] font-bold uppercase ${tone}`}>{covered ? 'Covered' : overdue ? 'Overdue' : partial ? 'Partial' : 'Scheduled'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}

      <section className="overflow-hidden rounded-lg border border-white/10 bg-slate-900/55">
        <div className="p-4">
          <AtlasSectionHeader
            title="Payment history"
            description="Clearing status, proof, receipts, and account audit activity"
            icon={Wallet}
            meta={<span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-slate-400">{sortedPayments.length}</span>}
            actions={canManagePayments ? <AtlasActionButton icon={CreditCard} variant="primary" onClick={() => void handleRecordPayment()}>Record payment</AtlasActionButton> : undefined}
          />
        </div>

        <div className="hidden overflow-x-auto border-t border-white/10 md:block">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead className="bg-slate-950/50 text-[10px] font-bold uppercase text-slate-500">
              <tr><th className="p-3 pl-4">Date</th><th className="p-3">Method / reference</th><th className="p-3 text-right">Amount</th><th className="p-3">Status</th><th className="p-3">Shared</th><th className="p-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {sortedPayments.map(payment => (
                <tr key={payment.id} className="transition-colors hover:bg-white/[0.025]">
                  <td className="p-3 pl-4 font-medium text-slate-300">{formatDate(payment.date)}</td>
                  <td className="p-3"><div className="capitalize text-slate-300">{payment.method === 'virement' ? 'Bank transfer' : payment.method}</div><div className="font-mono text-[10px] text-slate-600">{payment.checkNumber ? `#${payment.checkNumber}` : payment.bankName || payment.id.slice(0, 8).toUpperCase()}</div></td>
                  <td className={`p-3 text-right font-mono font-bold ${isCleared(payment) ? 'text-emerald-300' : payment.status === 'check_bounced' ? 'text-red-300' : 'text-amber-300'}`}>{formatCurrency(payment.amount)}</td>
                  <td className="p-3"><span className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase ${isCleared(payment) ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : payment.status === 'check_bounced' ? 'border-red-400/20 bg-red-400/10 text-red-300' : 'border-amber-400/20 bg-amber-400/10 text-amber-300'}`}>{getStatusLabel(payment.status)}</span></td>
                  <td className="p-3">{payment.receiptSharedAt ? <span className="flex items-center gap-1 text-xs font-medium text-emerald-300" title={`Shared on ${formatDate(((payment.receiptSharedAt as any).toDate ? (payment.receiptSharedAt as any).toDate() : payment.receiptSharedAt) as any)}`}><CheckCircle2 size={13} /> Shared</span> : <span className="text-xs text-slate-600">Not shared</span>}</td>
                  <td className="p-3">{renderPaymentActions(payment)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 gap-3 border-t border-white/10 p-4 md:hidden">
          {sortedPayments.map(payment => (
            <div key={payment.id} className="rounded-lg border border-slate-800 bg-slate-950/55 p-4" onClick={() => navigateTo('activity-details', { activityId: { type: 'payment', id: payment.id } })}>
              <div className="mb-3 flex items-start justify-between gap-3"><div><div className={`font-mono text-lg font-bold ${isCleared(payment) ? 'text-emerald-300' : payment.status === 'check_bounced' ? 'text-red-300' : 'text-amber-300'}`}>{formatCurrency(payment.amount)}</div><div className="mt-1 text-xs text-slate-500">{formatDate(payment.date)} / {payment.method === 'virement' ? 'Bank transfer' : payment.method}</div></div><span className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase ${isCleared(payment) ? 'border-emerald-400/20 text-emerald-300' : payment.status === 'check_bounced' ? 'border-red-400/20 text-red-300' : 'border-amber-400/20 text-amber-300'}`}>{getStatusLabel(payment.status)}</span></div>
              <div className="border-t border-white/10 pt-2">{renderPaymentActions(payment, true)}</div>
            </div>
          ))}
        </div>

        {sortedPayments.length === 0 && (
          <div className="border-t border-white/10 p-4">
            <AtlasEmptyState icon={Wallet} title="No payments recorded" description={activeEnrollments.length > 0 ? 'Record the first payment to start the tenant-scoped financial history.' : 'An active enrollment is required before a payment can be recorded.'} action={canManagePayments && activeEnrollments.length > 0 ? <AtlasActionButton icon={CreditCard} variant="primary" onClick={() => void handleRecordPayment()}>Record first payment</AtlasActionButton> : undefined} />
          </div>
        )}
      </section>

      {invoiceModal.isOpen && (
        <InvoiceModal
          isOpen={invoiceModal.isOpen}
          onClose={() => setInvoiceModal({ isOpen: false, payment: null })}
          payment={invoiceModal.payment}
          enrollment={tenantEnrollments.find(enrollment => enrollment.id === invoiceModal.payment?.enrollmentId)}
          student={student}
          settings={settings}
        />
      )}
      <Modal isOpen={!!proofUrl} onClose={() => setProofUrl(null)} title="Payment proof" size="lg">
        {proofUrl && <img src={proofUrl} alt="Payment proof" className="max-h-[70vh] w-full rounded-lg bg-slate-950 object-contain" />}
      </Modal>
    </div>
  );
};
