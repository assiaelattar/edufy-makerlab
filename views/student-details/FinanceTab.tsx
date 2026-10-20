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
import { Enrollment, Payment, Student, Program } from '../../types';
import { formatCurrency, formatDate, generateReceipt, normalizePhone } from '../../utils/helpers';
import { useConfirm } from '../../context/ConfirmContext';
import { useAuth } from '../../context/AuthContext';
import { InvoiceModal } from '../../components/finance/InvoiceModal';
import { Modal } from '../../components/Modal';
import { EducationActionMenu, EducationButton, EducationNotice, EducationState, EducationStatusPill } from '../../components/education-ui/EducationPrimitives';
import './education-student-finance-polish.css';

interface FinanceTabProps {
  studentPayments: Payment[];
  studentEnrollments: Enrollment[];
  student: Student;
  programs?: Program[];
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
  programs = [],
  onRecordPayment,
  navigateTo,
  setEditPayment,
  initiateDeletePayment,
  settings,
  onShareReceipt
}) => {
  const [invoiceModal, setInvoiceModal] = React.useState<{ isOpen: boolean; payment: Payment | null }>({ isOpen: false, payment: null });
  const [proofUrl, setProofUrl] = React.useState<string | null>(null);
  const { alert: showAlert, confirm } = useConfirm();
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
    if (!await openWhatsApp(message)) return;
    const sent = await confirm({
      title: 'Was the receipt sent?',
      message: 'Opening WhatsApp does not confirm delivery. Mark this receipt shared only after you send the message to the verified parent.',
      confirmText: 'I sent it',
      cancelText: 'Not sent',
      variant: 'info'
    });
    if (sent) await Promise.resolve(onShareReceipt(payment.id));
  };

  const printReceipt = async (payment: Payment) => {
    if (!isCleared(payment)) {
      await showAlert('Receipt not available yet', 'A printable receipt becomes available when the payment is paid or verified.', 'warning');
      return;
    }
    const enrollment = tenantEnrollments.find(item => item.id === payment.enrollmentId);
    generateReceipt(payment, enrollment, student, settings, programs);
  };

  const renderPaymentActions = (payment: Payment) => {
    const receiptReady = isCleared(payment);
    return (
      <div className="edu-student-finance__payment-actions" role="group" aria-label={`Actions for ${formatCurrency(payment.amount)} payment on ${formatDate(payment.date)}`}>
        <EducationButton icon={Eye} variant="secondary" onClick={() => navigateTo('activity-details', { activityId: { type: 'payment', id: payment.id } })}>Audit</EducationButton>
        <EducationButton icon={FileText} variant="quiet" onClick={() => setInvoiceModal({ isOpen: true, payment })}>Invoice</EducationButton>
        <EducationActionMenu label="More payment actions">
          {payment.proofUrl && <button type="button" aria-label="View payment proof" onClick={() => setProofUrl(payment.proofUrl!)}><ImageIcon size={16} />View proof</button>}
          <button type="button" aria-label="Print payment receipt" onClick={() => void printReceipt(payment)} disabled={!receiptReady} title={receiptReady ? undefined : 'Available when payment clears'}><ReceiptText size={16} />Print receipt</button>
          <button type="button" aria-label="Share payment receipt" onClick={() => void shareReceipt(payment)} disabled={!receiptReady} title={receiptReady ? undefined : 'Available when payment clears'}><Share2 size={16} />Share receipt</button>
          {canManagePayments && <button type="button" aria-label="Edit payment" onClick={() => setEditPayment(payment)}><Pencil size={16} />Edit payment</button>}
          {canManagePayments && <button type="button" aria-label="Delete payment" className="edu-student-finance__delete" onClick={() => initiateDeletePayment(payment)}><Trash2 size={16} />Delete payment</button>}
        </EducationActionMenu>
      </div>
    );
  };

  return (
    <div className="edu-student-finance">
      <div className="edu-student-finance__signals" aria-label="Payment summary">
        {[
          { label:'Open balance', value:formatCurrency(openBalance), detail:openBalance > 0 ? 'Across active enrollments' : 'Account settled', icon:Wallet, tone:openBalance > 0 ? 'orange' : 'green' },
          { label:'Cleared payments', value:formatCurrency(clearedTotal), detail:`${sortedPayments.filter(isCleared).length} cleared record${sortedPayments.filter(isCleared).length === 1 ? '' : 's'}`, icon:CheckCircle2, tone:'green' },
          { label:'In transit', value:formatCurrency(pendingTotal), detail:'Transfers and checks awaiting clearance', icon:Clock, tone:pendingTotal > 0 ? 'orange' : 'blue' },
          { label:'Rejected checks', value:String(bouncedCount), detail:bouncedCount > 0 ? 'Review before collecting again' : 'No bounced checks', icon:AlertTriangle, tone:bouncedCount > 0 ? 'red' : 'blue' }
        ].map(item => { const Icon=item.icon; return <div key={item.label} className="edu-student-finance__metric" data-tone={item.tone}><span className="edu-student-finance__metric-icon"><Icon size={20} aria-hidden="true" /></span><span className="edu-student-finance__metric-label">{item.label}</span><strong>{item.value}</strong><small>{item.detail}</small></div>; })}
      </div>

      {tenantEnrollments.filter(enrollment => enrollment.paymentPromises?.length).map(enrollment => {
        const schedule = [...(enrollment.paymentPromises || [])].sort((a, b) => a.month.localeCompare(b.month));
        const totalPromised = schedule.reduce((sum, promise) => sum + Number(promise.amount || 0), 0);
        const paidForEnrollment = sortedPayments.filter(payment => payment.enrollmentId === enrollment.id && isCleared(payment)).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
        let cumulative = 0;
        const currentMonth = new Date().toISOString().slice(0, 7);
        return (
          <section key={`contract-${enrollment.id}`} className="edu-student-finance__contract">
            <div className="edu-student-finance__section-head">
              <span className="edu-student-finance__head-icon"><FileText size={20} aria-hidden="true" /></span>
              <div><span className="edu-student-finance__eyebrow">Payment plan</span><h3>{enrollment.programName}</h3><p>Payment promise schedule</p></div>
              <EducationButton icon={Share2} variant="secondary" onClick={() => void shareContract(enrollment)}>Send contract</EducationButton>
            </div>
            <div className="edu-student-finance__contract-body">
              <div className="edu-student-finance__contract-totals">
                <div><span>Promised</span><strong>{formatCurrency(totalPromised)}</strong></div>
                <div><span>Cleared</span><strong data-tone="green">{formatCurrency(paidForEnrollment)}</strong></div>
                <div><span>Current balance</span><strong data-tone={enrollment.balance > 0 ? 'orange' : 'green'}>{formatCurrency(enrollment.balance)}</strong></div>
              </div>
              {Math.abs(totalPromised - Number(enrollment.totalAmount || 0)) > 0.01 && (
                <EducationNotice status="warning"><AlertTriangle size={17} aria-hidden="true" /> Promise total differs from the enrollment fee by {formatCurrency(Math.abs(totalPromised - Number(enrollment.totalAmount || 0)))}. Review the contract before sharing it.</EducationNotice>
              )}
              <div className="edu-student-finance__promises">
                {schedule.map((promise, index) => {
                  const previousCumulative = cumulative;
                  cumulative += Number(promise.amount || 0);
                  const covered = paidForEnrollment + 0.005 >= cumulative;
                  const partial = !covered && paidForEnrollment > previousCumulative;
                  const overdue = !covered && promise.month < currentMonth;
                  return (
                    <div key={`${promise.month}-${index}`} className="edu-student-finance__promise" data-tone={covered ? 'green' : overdue ? 'red' : partial ? 'orange' : 'blue'}>
                      <div><span className="edu-student-finance__promise-month"><Calendar size={14} aria-hidden="true" /> {promise.month}</span><strong>{formatCurrency(promise.amount)}</strong></div>
                      <EducationStatusPill status={covered ? 'success' : overdue ? 'danger' : partial ? 'warning' : 'info'}>{covered ? 'Covered' : overdue ? 'Overdue' : partial ? 'Partial' : 'Scheduled'}</EducationStatusPill>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}

      <section className="edu-student-finance__history">
        <div className="edu-student-finance__section-head">
          <span className="edu-student-finance__head-icon"><Wallet size={20} aria-hidden="true" /></span>
          <div><span className="edu-student-finance__eyebrow">{sortedPayments.length} payment {sortedPayments.length === 1 ? 'record' : 'records'}</span><h3>Payment history</h3><p>Clearing status, documents, and account audit</p></div>
          {canManagePayments && <EducationButton icon={CreditCard} variant="primary" disabled={activeEnrollments.length === 0} title={activeEnrollments.length === 0 ? 'An active enrollment is required' : undefined} onClick={() => void handleRecordPayment()}>Record payment</EducationButton>}
        </div>

        {sortedPayments.length > 0 && <div className="edu-student-finance__payment-list">
          {sortedPayments.map(payment => {
            const status = isCleared(payment) ? 'success' : payment.status === 'check_bounced' ? 'danger' : 'warning';
            const enrollment = tenantEnrollments.find(item => item.id === payment.enrollmentId);
            return <article key={payment.id} className="edu-student-finance__payment" data-tone={status}>
              <div className="edu-student-finance__payment-main">
                <div className="edu-student-finance__payment-amount">
                  <span>{formatDate(payment.date)}</span>
                  <strong>{formatCurrency(payment.amount)}</strong>
                </div>
                <EducationStatusPill status={status}>{getStatusLabel(payment.status)}</EducationStatusPill>
              </div>
              <div className="edu-student-finance__payment-meta">
                <span>{payment.method === 'virement' ? 'Bank transfer' : payment.method}</span>
                <span>{enrollment?.programName || 'Enrollment'}</span>
                <span>{payment.checkNumber ? 'Check #' + payment.checkNumber : payment.bankName || `Reference ${payment.id.slice(-8).toUpperCase()}`}</span>
                <span>{payment.receiptSharedAt ? <><CheckCircle2 size={14} aria-hidden="true" /> Shared {formatDate(((payment.receiptSharedAt as any).toDate ? (payment.receiptSharedAt as any).toDate() : payment.receiptSharedAt) as any)}</> : 'Receipt not shared'}</span>
              </div>
              {renderPaymentActions(payment)}
            </article>;
          })}
        </div>}
        {sortedPayments.length === 0 && (
          <div className="edu-student-finance__empty">
            <EducationState kind={canManagePayments ? 'empty' : 'restricted'} title="No payments recorded" description={activeEnrollments.length > 0 ? canManagePayments ? 'Record the first payment to start this learner’s financial history.' : 'You can review this record, but your role cannot record payments.' : 'An active enrollment is required before a payment can be recorded.'}>
              {canManagePayments && activeEnrollments.length > 0 && <EducationButton icon={CreditCard} variant="primary" onClick={() => void handleRecordPayment()}>Record first payment</EducationButton>}
            </EducationState>
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
      <Modal designSystem isOpen={!!proofUrl} onClose={() => setProofUrl(null)} title="Payment proof" size="lg">
        {proofUrl && <img src={proofUrl} alt="Payment proof" className="edu-student-finance__proof" />}
      </Modal>
    </div>
  );
};
