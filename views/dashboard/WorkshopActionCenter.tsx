import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, MessageCircle, MessageSquare, UserCheck } from 'lucide-react';
import { arrayUnion, collection, doc, getDocs, query, runTransaction, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import { db } from '../../services/firebase';
import { Booking } from '../../types';
import { Modal } from '../../components/Modal';
import { AtlasActionButton, AtlasSectionHeader } from '../../components/atlas/AtlasSurface';

type OperationalBooking = Booking & {
    reminderSentAt?: unknown;
    feedbackRequestedAt?: unknown;
    followUpCompletedAt?: unknown;
    convertedAt?: unknown;
    crmLeadId?: string;
    followUpStatus?: 'feedback_received' | 'not_interested' | 'converted';
};

const toLocalDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
const completedFollowUps = new Set(['feedback_received', 'not_interested', 'converted']);

export const WorkshopActionCenter = () => {
    const { bookings, workshopSlots, workshopTemplates, programs } = useAppContext();
    const { currentOrganization, can } = useAuth();
    const { alert, confirm } = useConfirm();
    const [selectedBooking, setSelectedBooking] = useState<OperationalBooking | null>(null);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [feedbackNotes, setFeedbackNotes] = useState('');
    const [selectedProgramInterest, setSelectedProgramInterest] = useState('');
    const [busyBookingIds, setBusyBookingIds] = useState<string[]>([]);

    const operationalBookings = bookings as OperationalBooking[];
    const getTemplate = (slotId: string) => {
        const slot = workshopSlots.find(item => item.id === slotId);
        return slot ? workshopTemplates.find(item => item.id === slot.workshopTemplateId) : null;
    };
    const getSlotDate = (slotId: string) => {
        const slot = workshopSlots.find(item => item.id === slotId);
        return slot ? { date: slot.date, time: slot.startTime } : { date: '', time: '' };
    };
    const isOwnedBooking = (booking: Booking) => Boolean(currentOrganization?.id && booking.organizationId === currentOrganization.id);
    const setBookingBusy = (bookingId: string, busy: boolean) => setBusyBookingIds(ids => busy ? [...new Set([...ids, bookingId])] : ids.filter(id => id !== bookingId));

    const handleUpdateStatus = async (booking: OperationalBooking, status: Booking['status']) => {
        if (!db || !currentOrganization || !can('workshops.manage') || busyBookingIds.includes(booking.id)) return false;
        if (!isOwnedBooking(booking)) {
            await alert('Booking unavailable', 'This booking is not available in the active organization.', 'warning');
            return false;
        }
        if (status === 'cancelled' && booking.status !== 'cancelled') {
            const approved = await confirm({
                title: 'Cancel this booking?',
                message: `Cancel ${booking.kidName}'s booking and return the seat to public availability?`,
                confirmText: 'Cancel booking',
                cancelText: 'Keep booking',
                variant: 'warning'
            });
            if (!approved) return false;
        }

        setBookingBusy(booking.id, true);
        try {
            await runTransaction(db, async transaction => {
                const bookingRef = doc(db, 'bookings', booking.id);
                const bookingSnapshot = await transaction.get(bookingRef);
                if (!bookingSnapshot.exists()) throw new Error('Booking no longer exists.');
                const bookingData = bookingSnapshot.data() as Booking;
                if (bookingData.organizationId !== currentOrganization.id) throw new Error('Booking ownership changed.');

                const releasesSeat = bookingData.status !== 'cancelled' && status === 'cancelled';
                const restoresSeat = bookingData.status === 'cancelled' && status !== 'cancelled';
                let slotUpdate: { ref: ReturnType<typeof doc>; bookedCount: number; status: 'available' | 'full' | 'cancelled' } | null = null;

                if ((releasesSeat || restoresSeat) && bookingData.workshopSlotId) {
                    const slotRef = doc(db, 'workshop_slots', bookingData.workshopSlotId);
                    const slotSnapshot = await transaction.get(slotRef);
                    if (slotSnapshot.exists()) {
                        const slotData = slotSnapshot.data() as { organizationId?: string; bookedCount?: number; capacity?: number; status?: 'available' | 'full' | 'cancelled' };
                        if (slotData.organizationId && slotData.organizationId !== currentOrganization.id) throw new Error('Slot ownership changed.');
                        const capacity = Math.max(1, Number(slotData.capacity) || 1);
                        const currentCount = Math.max(0, Number(slotData.bookedCount) || 0);
                        if (restoresSeat && currentCount >= capacity) throw new Error('CAPACITY_FULL');
                        const bookedCount = Math.max(0, currentCount + (restoresSeat ? 1 : -1));
                        slotUpdate = {
                            ref: slotRef,
                            bookedCount,
                            status: slotData.status === 'cancelled' ? 'cancelled' : bookedCount >= capacity ? 'full' : 'available'
                        };
                    }
                }

                if (slotUpdate) transaction.update(slotUpdate.ref, { bookedCount: slotUpdate.bookedCount, status: slotUpdate.status });
                transaction.update(bookingRef, { status, statusUpdatedAt: serverTimestamp() });
            });
            return true;
        } catch (error) {
            console.error('Workshop status update failed', error);
            const message = error instanceof Error && error.message === 'CAPACITY_FULL'
                ? 'This workshop is full. Increase capacity before restoring the booking.'
                : error instanceof Error ? error.message : 'Check your connection and try again.';
            await alert('Status was not updated', message, 'danger');
            return false;
        } finally {
            setBookingBusy(booking.id, false);
        }
    };

    const handleOpenWhatsApp = async (booking: OperationalBooking, type: 'reminder' | 'feedback') => {
        if (!db || !currentOrganization || !isOwnedBooking(booking) || busyBookingIds.includes(booking.id)) return;
        const phone = normalizePhone(booking.phoneNumber);
        if (phone.length < 8) {
            await alert('Phone number required', 'Add a valid parent phone number before opening WhatsApp.', 'warning');
            return;
        }

        const slot = workshopSlots.find(item => item.id === booking.workshopSlotId);
        const template = workshopTemplates.find(item => item.id === slot?.workshopTemplateId);
        const workshopName = template?.title || 'the workshop';
        const message = type === 'reminder'
            ? `Hello ${booking.parentName}, this is a reminder about ${workshopName} for ${booking.kidName} on ${slot?.date || 'the scheduled date'} at ${slot?.startTime || 'the scheduled time'}. We are excited to see you.`
            : `Hi ${booking.parentName}, we hope ${booking.kidName} enjoyed ${workshopName}. We would value your feedback. What worked well, and what could be better?`;
        const opened = window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
        if (!opened) {
            await alert('WhatsApp did not open', 'Allow pop-ups for Edufy and try again. The booking was not changed.', 'warning');
            return;
        }
        opened.opener = null;

        setBookingBusy(booking.id, true);
        try {
            const bookingRef = doc(db, 'bookings', booking.id);
            await runTransaction(db, async transaction => {
                const snapshot = await transaction.get(bookingRef);
                if (!snapshot.exists() || snapshot.data().organizationId !== currentOrganization.id) throw new Error('Booking is no longer available.');
                transaction.update(bookingRef, type === 'reminder'
                    ? { status: 'reminder_sent', reminderSentAt: serverTimestamp() }
                    : { status: 'feedback_requested', feedbackRequestedAt: serverTimestamp() });
            });
        } catch (error) {
            console.error('Workshop follow-up state update failed', error);
            await alert('Follow-up was not recorded', 'WhatsApp opened, but Edufy could not save the follow-up state. Try again from the booking record.', 'danger');
        } finally {
            setBookingBusy(booking.id, false);
        }
    };

    const now = new Date();
    const today = toLocalDateKey(now);
    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(now.getDate() + 1);
    const tomorrow = toLocalDateKey(tomorrowDate);

    const upcomingReminders = useMemo(() => operationalBookings.filter(booking => {
        const slot = workshopSlots.find(item => item.id === booking.workshopSlotId);
        return Boolean(slot && booking.status === 'confirmed' && !booking.reminderSentAt && (slot.date === today || slot.date === tomorrow));
    }).sort((a, b) => `${getSlotDate(a.workshopSlotId).date}T${getSlotDate(a.workshopSlotId).time}`.localeCompare(`${getSlotDate(b.workshopSlotId).date}T${getSlotDate(b.workshopSlotId).time}`)), [operationalBookings, workshopSlots, today, tomorrow]);

    const pendingFeedback = useMemo(
        () => operationalBookings.filter(booking => (booking.status === 'attended' || booking.status === 'feedback_requested') && !completedFollowUps.has(booking.followUpStatus || '')),
        [operationalBookings]
    );
    const pendingConfirmation = useMemo(
        () => operationalBookings.filter(booking => booking.status === 'reminder_sent'),
        [operationalBookings]
    );

    const closeFeedbackModal = () => {
        setIsFeedbackModalOpen(false);
        setSelectedBooking(null);
        setSelectedProgramInterest('');
        setFeedbackNotes('');
    };
    const openFeedbackModal = (booking: OperationalBooking) => {
        setSelectedBooking(booking);
        setSelectedProgramInterest(booking.programInterest || '');
        setFeedbackNotes(booking.feedbackNotes || '');
        setIsFeedbackModalOpen(true);
    };

    const handleConvert = async () => {
        if (!selectedBooking || !db || !currentOrganization || busyBookingIds.includes(selectedBooking.id)) return;
        if (!isOwnedBooking(selectedBooking)) {
            await alert('Booking unavailable', 'This booking is not available in the active organization.', 'warning');
            return;
        }
        if (!selectedProgramInterest || !programs.some(program => program.name === selectedProgramInterest)) {
            await alert('Program required', 'Choose the program this family is interested in before converting the booking.', 'warning');
            return;
        }
        const approved = await confirm({
            title: 'Convert this family to CRM?',
            message: `${selectedBooking.kidName} will be added to the admissions pipeline with interest in ${selectedProgramInterest}.`,
            confirmText: 'Convert to lead',
            cancelText: 'Keep follow-up open',
            variant: 'info'
        });
        if (!approved) return;

        const booking = selectedBooking;
        setBookingBusy(booking.id, true);
        try {
            const leadSnapshot = await getDocs(query(collection(db, 'leads'), where('organizationId', '==', currentOrganization.id)));
            const phone = normalizePhone(booking.phoneNumber);
            const existingLead = leadSnapshot.docs.find(item => normalizePhone(String(item.data().phone || '')) === phone);
            const batch = writeBatch(db);
            const leadRef = existingLead ? doc(db, 'leads', existingLead.id) : doc(collection(db, 'leads'));
            const timelineEntry = {
                date: new Date().toISOString(),
                type: 'conversion',
                details: `Converted from workshop with interest in ${selectedProgramInterest}.${feedbackNotes.trim() ? ` Feedback: ${feedbackNotes.trim()}` : ''}`,
                author: 'Workshop Action Center'
            };

            if (existingLead) {
                batch.update(leadRef, {
                    tags: arrayUnion('Workshop', 'Prospect'),
                    interests: arrayUnion(selectedProgramInterest),
                    timeline: arrayUnion(timelineEntry)
                });
            } else {
                batch.set(leadRef, {
                    organizationId: currentOrganization.id,
                    name: booking.kidName,
                    parentName: booking.parentName,
                    phone: booking.phoneNumber,
                    status: 'new',
                    source: 'Workshop Conversion',
                    createdAt: serverTimestamp(),
                    interests: [selectedProgramInterest],
                    tags: ['Workshop', 'Prospect'],
                    notes: feedbackNotes.trim() ? [feedbackNotes.trim()] : [],
                    timeline: [timelineEntry]
                });
            }
            batch.update(doc(db, 'bookings', booking.id), {
                status: 'converted',
                followUpStatus: 'converted',
                feedbackNotes: feedbackNotes.trim(),
                programInterest: selectedProgramInterest,
                crmLeadId: leadRef.id,
                convertedAt: serverTimestamp()
            });
            await batch.commit();
            closeFeedbackModal();
            await alert(existingLead ? 'Lead updated' : 'Lead created', `${booking.kidName} is now connected to the admissions pipeline.`, 'success');
        } catch (error) {
            console.error('Workshop conversion failed', error);
            await alert('Conversion failed', 'No conversion was saved. Check your connection and try again.', 'danger');
        } finally {
            setBookingBusy(booking.id, false);
        }
    };

    const handleCompleteFollowUp = async (status: 'feedback_received' | 'not_interested') => {
        if (!selectedBooking || !db || !currentOrganization || busyBookingIds.includes(selectedBooking.id)) return;
        if (feedbackNotes.trim().length < 3) {
            await alert('Follow-up note required', 'Add a short note before completing this follow-up.', 'warning');
            return;
        }
        if (status === 'not_interested') {
            const approved = await confirm({
                title: 'Mark as not interested?',
                message: 'This follow-up will leave the dashboard queue without creating a CRM lead. The booking history remains available.',
                confirmText: 'Mark not interested',
                cancelText: 'Keep open',
                variant: 'warning'
            });
            if (!approved) return;
        }

        const booking = selectedBooking;
        setBookingBusy(booking.id, true);
        try {
            await runTransaction(db, async transaction => {
                const bookingRef = doc(db, 'bookings', booking.id);
                const snapshot = await transaction.get(bookingRef);
                if (!snapshot.exists() || snapshot.data().organizationId !== currentOrganization.id) throw new Error('Booking is no longer available.');
                transaction.update(bookingRef, {
                    feedbackNotes: feedbackNotes.trim(),
                    programInterest: status === 'not_interested' ? 'Not Interested' : selectedProgramInterest,
                    followUpStatus: status,
                    followUpCompletedAt: serverTimestamp()
                });
            });
            closeFeedbackModal();
            await alert(status === 'not_interested' ? 'Follow-up closed' : 'Feedback saved', status === 'not_interested' ? 'The family is marked not interested and no lead was created.' : 'The feedback is saved in the booking history.', 'success');
        } catch (error) {
            console.error('Workshop follow-up completion failed', error);
            await alert('Follow-up was not saved', 'Check your connection and try again.', 'danger');
        } finally {
            setBookingBusy(booking.id, false);
        }
    };

    if (!can('workshops.manage')) return null;
    const totalActions = upcomingReminders.length + pendingConfirmation.length + pendingFeedback.length;
    if (totalActions === 0) return null;

    return (
        <section className="rounded-lg border border-amber-300/20 bg-slate-900/80 p-4 md:p-5">
            <AtlasSectionHeader title="Workshop follow-up" description="Keep every family moving from reminder to attendance and admission." icon={AlertTriangle} meta={<span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-0.5 text-[10px] font-bold text-amber-200">{totalActions} actions</span>} />

            <div className="mt-4 grid gap-4 xl:grid-cols-3">
                <QueueColumn title="Reminders" count={upcomingReminders.length} icon={Clock} tone="amber">
                    {upcomingReminders.length === 0 ? <CompactEmpty label="No reminders due" /> : upcomingReminders.map(booking => {
                        const slot = getSlotDate(booking.workshopSlotId);
                        const template = getTemplate(booking.workshopSlotId);
                        return <QueueItem key={booking.id} title={booking.kidName} detail={`${booking.parentName} | ${slot.date === today ? 'Today' : 'Tomorrow'} at ${slot.time}`} meta={template?.title} action={<AtlasActionButton className="w-full" icon={MessageCircle} disabled={busyBookingIds.includes(booking.id)} onClick={() => void handleOpenWhatsApp(booking, 'reminder')}>Send reminder</AtlasActionButton>} />;
                    })}
                </QueueColumn>

                <QueueColumn title="Confirmations" count={pendingConfirmation.length} icon={CheckCircle2} tone="teal">
                    {pendingConfirmation.length === 0 ? <CompactEmpty label="No confirmations waiting" /> : pendingConfirmation.map(booking => (
                        <QueueItem key={booking.id} title={booking.kidName} detail={booking.parentName} meta="Reminder sent" action={<div className="grid grid-cols-2 gap-2"><AtlasActionButton variant="primary" disabled={busyBookingIds.includes(booking.id)} onClick={() => void handleUpdateStatus(booking, 'confirmed')}>Confirm</AtlasActionButton><AtlasActionButton disabled={busyBookingIds.includes(booking.id)} onClick={() => void handleUpdateStatus(booking, 'cancelled')}>Cancel</AtlasActionButton></div>} />
                    ))}
                </QueueColumn>

                <QueueColumn title="Feedback & admission" count={pendingFeedback.length} icon={UserCheck} tone="teal">
                    {pendingFeedback.length === 0 ? <CompactEmpty label="No feedback pending" /> : pendingFeedback.map(booking => (
                        <QueueItem key={booking.id} title={booking.kidName} detail={booking.parentName} meta={booking.status === 'feedback_requested' ? 'Feedback requested' : 'Workshop attended'} action={<div className="grid grid-cols-2 gap-2"><AtlasActionButton icon={MessageSquare} disabled={busyBookingIds.includes(booking.id)} onClick={() => void handleOpenWhatsApp(booking, 'feedback')}>Ask</AtlasActionButton><AtlasActionButton variant="primary" icon={ArrowRight} disabled={busyBookingIds.includes(booking.id)} onClick={() => openFeedbackModal(booking)}>Review</AtlasActionButton></div>} />
                    ))}
                </QueueColumn>
            </div>

            <Modal isOpen={isFeedbackModalOpen} onClose={closeFeedbackModal} title="Workshop follow-up">
                <div className="space-y-4">
                    <p className="text-sm text-slate-500">Record the family response for <span className="font-bold text-slate-700">{selectedBooking?.kidName}</span>, then complete the follow-up or convert it to CRM.</p>
                    <label className="block"><span className="mb-1 block text-xs font-bold text-slate-500">Parent feedback or follow-up note</span><textarea className="min-h-[104px] w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15" placeholder="Capture what they enjoyed, what they need next, or why they declined." value={feedbackNotes} onChange={event => setFeedbackNotes(event.target.value)} /></label>
                    <label className="block"><span className="mb-1 block text-xs font-bold text-slate-500">Interested program</span><select className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15" value={selectedProgramInterest} onChange={event => setSelectedProgramInterest(event.target.value)}><option value="">Choose a program for conversion</option>{programs.map(program => <option key={program.id} value={program.name}>{program.name}</option>)}</select></label>
                    {programs.length === 0 && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">Create an active program before converting workshop families into admissions leads.</p>}
                    <div className="grid gap-2 sm:grid-cols-3">
                        <AtlasActionButton disabled={!selectedBooking || busyBookingIds.includes(selectedBooking.id)} onClick={() => void handleCompleteFollowUp('not_interested')}>Not interested</AtlasActionButton>
                        <AtlasActionButton disabled={!selectedBooking || busyBookingIds.includes(selectedBooking.id)} onClick={() => void handleCompleteFollowUp('feedback_received')}>Save feedback</AtlasActionButton>
                        <AtlasActionButton variant="primary" icon={ArrowRight} disabled={!selectedBooking || !selectedProgramInterest || busyBookingIds.includes(selectedBooking.id)} onClick={() => void handleConvert()}>Convert to lead</AtlasActionButton>
                    </div>
                </div>
            </Modal>
        </section>
    );
};

const QueueColumn = ({ title, count, icon: Icon, tone, children }: { title: string; count: number; icon: typeof Clock; tone: 'teal' | 'amber'; children: React.ReactNode }) => (
    <div className="min-w-0 rounded-lg border border-white/10 bg-slate-950/55 p-3">
        <div className="mb-3 flex items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><Icon size={15} className={tone === 'amber' ? 'text-amber-200' : 'text-teal-300'} /><h4 className="truncate text-xs font-black uppercase text-slate-300">{title}</h4></div><span className="text-xs font-black text-white">{count}</span></div>
        <div className="space-y-2">{children}</div>
    </div>
);

const QueueItem = ({ title, detail, meta, action }: { title: string; detail: string; meta?: string; action: React.ReactNode }) => (
    <article className="rounded-lg border border-white/10 bg-white/[0.04] p-3"><h5 className="truncate text-sm font-black text-white">{title}</h5><p className="mt-0.5 truncate text-xs text-slate-400">{detail}</p>{meta && <p className="mt-1 truncate text-[10px] font-bold uppercase text-amber-200">{meta}</p>}<div className="mt-3">{action}</div></article>
);

const CompactEmpty = ({ label }: { label: string }) => <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-3 py-5 text-center text-xs text-slate-500">{label}</div>;
