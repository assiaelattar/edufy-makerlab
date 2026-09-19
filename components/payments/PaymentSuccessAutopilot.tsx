import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
    ArrowUpRight,
    Check,
    CheckCircle2,
    Clock3,
    MessageCircle,
    Printer,
    ReceiptText,
    UserRound
} from 'lucide-react';
import { AppSettings, Enrollment, Payment, Student } from '../../types';
import {
    formatCurrency,
    formatDate,
    generateReceipt,
    normalizePhoneForWhatsApp
} from '../../utils/helpers';
import { Modal } from '../Modal';
import { AtlasActionButton } from '../atlas/AtlasSurface';

export interface PaymentReceiptEntry {
    payment: Payment;
    enrollment?: Enrollment;
    student?: Student;
}

interface PaymentSuccessAutopilotProps {
    open: boolean;
    entries: PaymentReceiptEntry[];
    settings: AppSettings;
    context?: 'enrollment' | 'payment';
    note?: string;
    onClose: () => void;
}

const isCleared = (payment: Payment) => ['paid', 'verified'].includes(payment.status);

const paymentStatusLabel = (payment: Payment) => {
    if (isCleared(payment)) return 'Cleared';
    if (payment.status === 'check_received') return 'Check received';
    if (payment.status === 'check_deposited') return 'Check deposited';
    if (payment.status === 'pending_verification') return 'Awaiting verification';
    if (payment.status === 'check_bounced') return 'Check bounced';
    return payment.status;
};

export const PaymentSuccessAutopilot = ({
    open,
    entries,
    settings,
    context = 'payment',
    note,
    onClose
}: PaymentSuccessAutopilotProps) => {
    const reduceMotion = useReducedMotion();
    const total = useMemo(
        () => entries.reduce((sum, entry) => sum + Number(entry.payment.amount || 0), 0),
        [entries]
    );
    const clearedEntries = useMemo(() => entries.filter(entry => isCleared(entry.payment)), [entries]);
    const firstEntry = entries[0];
    const parentPhone = firstEntry?.student?.parentPhone || '';
    const whatsappPhone = normalizePhoneForWhatsApp(parentPhone);
    const allCleared = entries.length > 0 && clearedEntries.length === entries.length;
    const familyName = firstEntry?.student?.parentName || 'there';
    const academyName = settings.academyName || 'the academy';

    const whatsappMessage = useMemo(() => {
        if (!entries.length) return '';

        const learnerLines = entries.map(entry => {
            const learner = entry.student?.name || entry.payment.studentName;
            const program = entry.enrollment?.programName ? ` - ${entry.enrollment.programName}` : '';
            return `${learner}${program}: ${formatCurrency(entry.payment.amount)}`;
        });
        const paymentState = allCleared
            ? `Your payment of ${formatCurrency(total)} has been confirmed.`
            : `We received your payment details for ${formatCurrency(total)}. It is awaiting verification.`;
        const receiptLine = allCleared
            ? `Receipt reference: ${entries.map(entry => entry.payment.id.slice(0, 8).toUpperCase()).join(', ')}.`
            : 'We will confirm the receipt as soon as the payment clears.';

        return [
            `Hello ${familyName},`,
            paymentState,
            ...learnerLines,
            receiptLine,
            `Thank you, ${academyName}.`
        ].join('\n');
    }, [academyName, allCleared, entries, familyName, total]);

    const handleWhatsApp = () => {
        if (!whatsappPhone) return;
        window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(whatsappMessage)}`, '_blank', 'noopener,noreferrer');
    };

    const handlePrimaryPrint = () => {
        const entry = clearedEntries[0];
        if (!entry) return;
        generateReceipt(entry.payment, entry.enrollment, entry.student, settings);
    };

    const title = context === 'enrollment' ? 'Enrollment and payment saved' : 'Payment recorded';
    const subtitle = allCleared
        ? 'The money is cleared. Finish the family handoff now.'
        : 'The payment is saved. A receipt becomes available after it clears.';

    return (
        <Modal isOpen={open} onClose={onClose} title="Next family action" size="lg">
            <div className="overflow-hidden rounded-xl border atlas-panel-border atlas-surface-raised">
                <div className="relative border-b border-white/10 px-5 py-6 sm:px-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                        <motion.div
                            initial={reduceMotion ? false : { scale: 0.72, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 330, damping: 22 }}
                            className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-teal-300/30 bg-teal-400/15 text-teal-200"
                        >
                            <CheckCircle2 size={30} strokeWidth={1.8} />
                            <motion.span
                                initial={reduceMotion ? false : { scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: reduceMotion ? 0 : 0.2, type: 'spring', stiffness: 400, damping: 18 }}
                                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-teal-300 text-[#06201e] shadow-lg"
                            >
                                <Check size={12} strokeWidth={3} />
                            </motion.span>
                        </motion.div>
                        <div className="min-w-0 flex-1">
                            <p className="atlas-text-accent text-[10px] font-black uppercase tracking-[0.16em]">Payment autopilot</p>
                            <h3 className="atlas-text-strong mt-1 text-xl font-black sm:text-2xl">{title}</h3>
                            <p className="atlas-text-muted mt-1 text-sm leading-5">{subtitle}</p>
                        </div>
                        <div className="shrink-0 sm:text-right">
                            <p className="atlas-text-subtle text-[10px] font-bold uppercase tracking-wider">Recorded now</p>
                            <p className="atlas-text-strong mt-1 text-2xl font-black tabular-nums">{formatCurrency(total)}</p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-px bg-white/10 sm:grid-cols-2">
                    <div className="atlas-surface flex min-h-20 items-center gap-3 px-5 py-4 sm:px-6">
                        <span className="atlas-muted-well flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"><UserRound size={17} /></span>
                        <div className="min-w-0">
                            <p className="atlas-text-subtle text-[10px] font-bold uppercase tracking-wider">Family</p>
                            <p className="atlas-text-strong truncate text-sm font-bold">{firstEntry?.student?.parentName || firstEntry?.student?.name || firstEntry?.payment.studentName}</p>
                            <p className="atlas-text-muted truncate text-xs">{parentPhone || 'No WhatsApp number saved'}</p>
                        </div>
                    </div>
                    <div className="atlas-surface flex min-h-20 items-center gap-3 px-5 py-4 sm:px-6">
                        <span className="atlas-muted-well flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"><ReceiptText size={17} /></span>
                        <div className="min-w-0">
                            <p className="atlas-text-subtle text-[10px] font-bold uppercase tracking-wider">Receipt status</p>
                            <p className={`text-sm font-bold ${allCleared ? 'text-teal-300' : 'text-amber-300'}`}>{allCleared ? 'Ready to print and share' : 'Waiting for clearance'}</p>
                            <p className="atlas-text-muted text-xs">{entries.length} payment allocation{entries.length === 1 ? '' : 's'}</p>
                        </div>
                    </div>
                </div>

                {note && <div className="atlas-text-muted border-t border-white/10 px-5 py-3 text-xs leading-5 sm:px-6">{note}</div>}

                <div className="space-y-2 border-t border-white/10 px-5 py-4 sm:px-6">
                    {entries.map((entry, index) => {
                        const cleared = isCleared(entry.payment);
                        return (
                            <motion.div
                                key={entry.payment.id}
                                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: reduceMotion ? 0 : 0.08 + index * 0.04 }}
                                className="flex min-h-12 items-center gap-3 rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2.5"
                            >
                                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cleared ? 'bg-teal-400/10 text-teal-300' : 'bg-amber-400/10 text-amber-300'}`}>
                                    {cleared ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="atlas-text-strong truncate text-sm font-bold">{entry.student?.name || entry.payment.studentName}</p>
                                    <p className="atlas-text-muted truncate text-xs">{entry.enrollment?.programName || 'Enrollment'} · {formatDate(entry.payment.date)} · {paymentStatusLabel(entry.payment)}</p>
                                </div>
                                <p className="atlas-text-strong shrink-0 text-sm font-black tabular-nums">{formatCurrency(entry.payment.amount)}</p>
                                {cleared && (
                                    <button
                                        type="button"
                                        onClick={() => generateReceipt(entry.payment, entry.enrollment, entry.student, settings)}
                                        className="atlas-action flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
                                        data-atlas-variant="quiet"
                                        aria-label={`Print receipt for ${entry.student?.name || entry.payment.studentName}`}
                                        title="Print receipt"
                                    >
                                        <Printer size={16} />
                                    </button>
                                )}
                            </motion.div>
                        );
                    })}
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-white/10 bg-black/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <AtlasActionButton variant="quiet" onClick={onClose}>Done</AtlasActionButton>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <AtlasActionButton
                            variant="secondary"
                            icon={Printer}
                            onClick={handlePrimaryPrint}
                            disabled={clearedEntries.length === 0}
                            title={clearedEntries.length === 0 ? 'Receipt available after payment clearance' : undefined}
                        >
                            {clearedEntries.length > 1 ? 'Print first receipt' : 'Print receipt'}
                        </AtlasActionButton>
                        <AtlasActionButton
                            variant="primary"
                            icon={MessageCircle}
                            onClick={handleWhatsApp}
                            disabled={!whatsappPhone}
                            title={!whatsappPhone ? 'Add a parent phone number to share on WhatsApp' : undefined}
                        >
                            Share on WhatsApp <ArrowUpRight size={14} />
                        </AtlasActionButton>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
