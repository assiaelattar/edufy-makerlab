import React, { useEffect, useMemo, useState } from 'react';
import {
    Calendar,
    CheckCircle2,
    Clock,
    Mail,
    MessageSquare,
    Phone,
    Plus,
    User,
    UserCheck,
    X
} from 'lucide-react';
import { arrayUnion, doc, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Modal } from '../../components/Modal';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { Lead } from '../../types';
import { formatDate } from '../../utils/helpers';
import { ChatImporterModal } from './ChatImporterModal';

interface LeadProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: Lead;
    onEnroll?: () => void;
    initialAction?: 'call' | 'booking' | null;
}

type Feedback = { kind: 'success' | 'error'; message: string } | null;

const CALL_OUTCOMES = [
    { value: 'interested', label: 'Interested', nextStatus: 'interested' as Lead['status'] },
    { value: 'follow_up', label: 'Follow up later', nextStatus: 'contacted' as Lead['status'] },
    { value: 'no_answer', label: 'No answer', nextStatus: 'contacted' as Lead['status'] },
    { value: 'not_interested', label: 'Not interested', nextStatus: 'closed' as Lead['status'] }
];

export const LeadProfileModal: React.FC<LeadProfileModalProps> = ({ isOpen, onClose, lead, onEnroll, initialAction = null }) => {
    const { bookings, workshopSlots, workshopTemplates } = useAppContext();
    const { currentOrganization, userProfile, can } = useAuth();
    const [note, setNote] = useState('');
    const [callOutcome, setCallOutcome] = useState('interested');
    const [callNote, setCallNote] = useState('');
    const [activeTab, setActiveTab] = useState<'timeline' | 'workshops'>('timeline');
    const [isBookingMode, setIsBookingMode] = useState(false);
    const [isCallMode, setIsCallMode] = useState(false);
    const [isChatImportOpen, setIsChatImportOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<'booking' | 'note' | 'call' | null>(null);
    const [feedback, setFeedback] = useState<Feedback>(null);
    const canManageMarketing = can('marketing.create');
    const isCurrentTenant = Boolean(currentOrganization?.id && lead.organizationId === currentOrganization.id);

    useEffect(() => {
        if (!isOpen) return;
        setIsCallMode(initialAction === 'call');
        setIsBookingMode(initialAction === 'booking');
        setActiveTab('timeline');
        setFeedback(null);
    }, [initialAction, isOpen, lead.id]);

    const leadBookings = useMemo(() => {
        const cleanPhone = (phone: string) => phone.replace(/[^0-9]/g, '');
        const leadPhone = cleanPhone(lead.phone);

        if (!leadPhone) return [];
        return bookings
            .filter(booking => booking.organizationId === lead.organizationId && cleanPhone(booking.phoneNumber) === leadPhone)
            .sort((a, b) => (b.bookedAt?.toMillis?.() || 0) - (a.bookedAt?.toMillis?.() || 0));
    }, [bookings, lead.organizationId, lead.phone]);

    const timelineEvents = useMemo(() => {
        return [...(lead.timeline || [])].sort(
            (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    }, [lead.timeline]);

    const upcomingSlots = useMemo(() => {
        return workshopSlots
            .filter(slot => slot.organizationId === lead.organizationId && slot.status === 'available' && slot.bookedCount < slot.capacity && new Date(`${slot.date}T23:59:59`) >= new Date())
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [lead.organizationId, workshopSlots]);

    const handleBookDemo = async (slotId: string) => {
        if (!db || pendingAction) return;
        if (!canManageMarketing || !isCurrentTenant) {
            setFeedback({ kind: 'error', message: 'This lead is view-only for your current organization.' });
            return;
        }
        const slot = workshopSlots.find(item => item.id === slotId);
        const template = workshopTemplates.find(item => item.id === slot?.workshopTemplateId);
        const orgId = lead.organizationId || slot?.organizationId || template?.organizationId;

        if (!slot || !orgId || orgId !== currentOrganization?.id || slot.organizationId !== orgId) {
            setFeedback({ kind: 'error', message: 'Select a valid workshop slot before booking.' });
            return;
        }
        if (slot.status !== 'available' || slot.bookedCount >= slot.capacity) {
            setFeedback({ kind: 'error', message: 'This workshop is now full or unavailable. Choose another session.' });
            return;
        }
        const cleanPhone = (phone: string) => phone.replace(/\D/g, '');
        const duplicateBooking = bookings.some(booking =>
            booking.organizationId === orgId &&
            booking.workshopSlotId === slotId &&
            cleanPhone(booking.phoneNumber) === cleanPhone(lead.phone) &&
            booking.status !== 'cancelled'
        );
        if (duplicateBooking) {
            setFeedback({ kind: 'error', message: 'This lead already has a booking for that workshop.' });
            return;
        }

        setPendingAction('booking');
        setFeedback(null);
        try {
            const slotRef = doc(db, 'workshop_slots', slot.id);
            const bookingRef = doc(db, 'bookings', `crm_${slot.id}_${lead.id}`);
            const leadRef = doc(db, 'leads', lead.id);
            await runTransaction(db, async transaction => {
                const [freshSlot, existingBooking] = await Promise.all([transaction.get(slotRef), transaction.get(bookingRef)]);
                if (!freshSlot.exists()) throw new Error('slot-missing');
                const slotData = freshSlot.data();
                if (slotData.organizationId !== orgId || slotData.status !== 'available' || Number(slotData.bookedCount || 0) >= Number(slotData.capacity || 0)) throw new Error('slot-full');
                if (existingBooking.exists() && existingBooking.data().status !== 'cancelled') throw new Error('duplicate-booking');

                transaction.set(bookingRef, {
                    organizationId: orgId,
                    workshopSlotId: slotId,
                    workshopTemplateId: slot.workshopTemplateId,
                    kidName: lead.name,
                    kidAge: 0,
                    parentName: lead.parentName,
                    phoneNumber: lead.phone,
                    email: lead.email || '',
                    status: 'confirmed',
                    bookedAt: serverTimestamp(),
                    notes: 'Booked via CRM Lead Profile',
                    paymentStatus: 'pending'
                });
                transaction.update(leadRef, {
                    status: 'workshop_booked',
                    timeline: arrayUnion({ date: new Date().toISOString(), type: 'workshop', details: `Booked workshop: ${template?.title || 'Workshop'} on ${slot.date} at ${slot.startTime}`, author: userProfile?.name || 'Team member' })
                });
                transaction.update(slotRef, { bookedCount: Number(slotData.bookedCount || 0) + 1 });
            });

            setIsBookingMode(false);
            setActiveTab('workshops');
            setFeedback({ kind: 'success', message: 'Demo workshop booked and added to the lead timeline.' });
        } catch (error) {
            console.error('Workshop booking failed', error);
            const message = error instanceof Error && error.message === 'duplicate-booking'
                ? 'This lead already has a booking for that workshop.'
                : error instanceof Error && ['slot-full', 'slot-missing'].includes(error.message)
                    ? 'This workshop is now full or unavailable. Choose another session.'
                    : 'The workshop could not be booked. Try again.';
            setFeedback({ kind: 'error', message });
        } finally {
            setPendingAction(null);
        }
    };

    const handleAddNote = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!db || !note.trim() || pendingAction) return;
        if (!canManageMarketing || !isCurrentTenant) {
            setFeedback({ kind: 'error', message: 'This lead is view-only for your current organization.' });
            return;
        }

        setPendingAction('note');
        setFeedback(null);
        try {
            await updateDoc(doc(db, 'leads', lead.id), {
                timeline: arrayUnion({
                    date: new Date().toISOString(),
                    type: 'note',
                    details: note.trim(),
                    author: userProfile?.name || 'Team member'
                })
            });
            setNote('');
            setFeedback({ kind: 'success', message: 'Note added to the lead timeline.' });
        } catch (error) {
            console.error('Lead note failed', error);
            setFeedback({ kind: 'error', message: 'The note could not be saved. Try again.' });
        } finally {
            setPendingAction(null);
        }
    };

    const handleLogCall = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!db || !callOutcome || pendingAction) return;
        if (!canManageMarketing || !isCurrentTenant) {
            setFeedback({ kind: 'error', message: 'This lead is view-only for your current organization.' });
            return;
        }
        const selectedOutcome = CALL_OUTCOMES.find(outcome => outcome.value === callOutcome);
        if (!selectedOutcome) return;

        setPendingAction('call');
        setFeedback(null);
        try {
            await updateDoc(doc(db, 'leads', lead.id), {
                status: selectedOutcome.nextStatus,
                timeline: arrayUnion({
                    date: new Date().toISOString(),
                    type: 'call',
                    details: `Call outcome: ${selectedOutcome.label}${callNote.trim() ? `\n${callNote.trim()}` : ''}`,
                    author: userProfile?.name || 'Team member'
                })
            });
            setIsCallMode(false);
            setCallNote('');
            setFeedback({ kind: 'success', message: `Call logged. Lead moved to ${selectedOutcome.nextStatus.replace('_', ' ')}.` });
        } catch (error) {
            console.error('Call log failed', error);
            setFeedback({ kind: 'error', message: 'The call outcome could not be saved. Try again.' });
        } finally {
            setPendingAction(null);
        }
    };

    const statusClass = lead.status === 'converted'
        ? 'border-teal-400/30 bg-teal-400/10 text-teal-200'
        : lead.status === 'new'
            ? 'border-[#F2C766]/30 bg-[#F2C766]/10 text-[#F2C766]'
            : 'border-slate-600 bg-slate-800 text-slate-300';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Lead profile" size="lg">
            <div className="flex h-[min(76vh,660px)] flex-col gap-4 text-slate-900">
                <section className="shrink-0 rounded-lg border border-slate-800 bg-[#08111F] p-4 text-white">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-teal-400/30 bg-[#0F1B2D] text-lg font-black text-teal-300">
                                {lead.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="truncate text-lg font-bold">{lead.name}</h2>
                                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusClass}`}>
                                        {lead.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-300">
                                    <User size={14} className="text-teal-300" /> {lead.parentName}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                                    <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 rounded text-slate-300 hover:text-teal-200" title={`Call ${lead.parentName}`}><Phone size={12} /> {lead.phone}</a>
                                    {lead.email && <span className="flex items-center gap-1.5"><Mail size={12} /> {lead.email}</span>}
                                </div>
                            </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                            {lead.interests?.slice(0, 3).map((interest, index) => (
                                <span key={index} className="rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] font-semibold text-slate-300">
                                    {interest}
                                </span>
                            ))}
                            {onEnroll && lead.status !== 'converted' && (
                                <button
                                    type="button"
                                    onClick={() => { onEnroll(); onClose(); }}
                                    className="flex h-10 items-center gap-2 rounded-lg bg-[#14B8A6] px-3 text-sm font-bold text-[#08111F] transition-colors hover:bg-teal-300"
                                >
                                    <UserCheck size={16} /> Enroll student
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                {feedback && (
                    <div className={`flex shrink-0 items-start gap-2 rounded-lg border px-3 py-2 text-sm ${feedback.kind === 'success' ? 'border-teal-200 bg-teal-50 text-teal-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`} role="status">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                        <span>{feedback.message}</span>
                    </div>
                )}

                {(!canManageMarketing || !isCurrentTenant) && (
                    <div className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        View-only record. Switch to the lead's organization or ask for Marketing create access to add activity.
                    </div>
                )}

                <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200" role="tablist" aria-label="Lead record">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'timeline'}
                        onClick={() => setActiveTab('timeline')}
                        className={`flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-bold transition-colors ${activeTab === 'timeline' ? 'border-[#14B8A6] text-slate-950' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <MessageSquare size={16} /> Timeline and notes
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'workshops'}
                        onClick={() => setActiveTab('workshops')}
                        className={`flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-bold transition-colors ${activeTab === 'workshops' ? 'border-[#14B8A6] text-slate-950' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <Calendar size={16} /> Workshops
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{leadBookings.length}</span>
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                    {activeTab === 'timeline' && (
                        <div className="space-y-4">
                            <form onSubmit={handleAddNote} className="flex flex-col gap-2 sm:flex-row">
                                <label className="sr-only" htmlFor="lead-note">Add a lead note</label>
                                <input
                                    id="lead-note"
                                    className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-[#14B8A6] focus:ring-2 focus:ring-teal-100"
                                    placeholder="Add a note or observation"
                                    value={note}
                                    onChange={event => setNote(event.target.value)}
                                />
                                <button
                                    type="submit"
                                    disabled={!canManageMarketing || !isCurrentTenant || !note.trim() || pendingAction !== null}
                                    className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#08111F] px-4 text-sm font-bold text-white transition-colors hover:bg-[#0F1B2D] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Plus size={16} /> {pendingAction === 'note' ? 'Saving...' : 'Add note'}
                                </button>
                            </form>

                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                <button
                                    type="button"
                                    onClick={() => { setIsBookingMode(value => !value); setIsCallMode(false); }}
                                    disabled={!canManageMarketing || !isCurrentTenant || lead.status === 'closed'}
                                    className={`flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-bold transition-colors ${isBookingMode ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300'}`}
                                >
                                    <Calendar size={16} /> Book demo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setIsCallMode(value => !value); setIsBookingMode(false); }}
                                    disabled={!canManageMarketing || !isCurrentTenant}
                                    className={`flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-bold transition-colors ${isCallMode ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300'}`}
                                >
                                    <Phone size={16} /> Log call
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsChatImportOpen(true)}
                                    disabled={!canManageMarketing || !isCurrentTenant}
                                    className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition-colors hover:border-teal-300"
                                >
                                    <MessageSquare size={16} /> Import chat
                                </button>
                            </div>

                            {isCallMode && (
                                <form onSubmit={handleLogCall} className="rounded-lg border border-teal-200 bg-teal-50 p-3">
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">Call outcome</h3>
                                            <p className="text-xs text-slate-600">Record what happened before saving the activity.</p>
                                        </div>
                                        <button type="button" onClick={() => setIsCallMode(false)} className="rounded-lg p-2 text-slate-500 hover:bg-white" aria-label="Close call outcome"><X size={16} /></button>
                                    </div>
                                    <div className="grid gap-2 sm:grid-cols-[180px_1fr_auto]">
                                        <select
                                            value={callOutcome}
                                            onChange={event => setCallOutcome(event.target.value)}
                                            className="h-10 min-w-0 flex-1 rounded-lg border border-teal-200 bg-white px-3 text-sm outline-none focus:border-[#14B8A6] focus:ring-2 focus:ring-teal-100"
                                            aria-label="Call outcome"
                                            autoFocus
                                        >
                                            {CALL_OUTCOMES.map(outcome => <option key={outcome.value} value={outcome.value}>{outcome.label}</option>)}
                                        </select>
                                        <input value={callNote} onChange={event => setCallNote(event.target.value)} placeholder="Optional follow-up note" className="h-10 min-w-0 rounded-lg border border-teal-200 bg-white px-3 text-sm outline-none focus:border-[#14B8A6] focus:ring-2 focus:ring-teal-100" />
                                        <button type="submit" disabled={!callOutcome || pendingAction !== null} className="h-10 rounded-lg bg-[#14B8A6] px-4 text-sm font-bold text-[#08111F] hover:bg-teal-300 disabled:opacity-50">
                                            {pendingAction === 'call' ? 'Saving...' : 'Save outcome'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {isBookingMode && (
                                <section className="rounded-lg border border-[#F2C766]/60 bg-amber-50 p-3">
                                    <div className="mb-3 flex items-start justify-between gap-3">
                                        <div>
                                            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Clock size={15} className="text-amber-600" /> Upcoming workshops</h3>
                                            <p className="mt-0.5 text-xs text-slate-600">Choose a session to create a confirmed booking.</p>
                                        </div>
                                        <button type="button" onClick={() => setIsBookingMode(false)} className="rounded-lg p-2 text-slate-500 hover:bg-white" aria-label="Close workshop selection"><X size={16} /></button>
                                    </div>
                                    <div className="max-h-56 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                                        {upcomingSlots.map(slot => {
                                            const template = workshopTemplates.find(item => item.id === slot.workshopTemplateId);
                                            return (
                                                <button
                                                    key={slot.id}
                                                    type="button"
                                                    onClick={() => handleBookDemo(slot.id)}
                                                    disabled={pendingAction !== null}
                                                    className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white px-3 py-2 text-left transition-colors hover:border-amber-400 disabled:opacity-50"
                                                >
                                                    <span className="min-w-0">
                                                        <span className="block truncate text-sm font-bold text-slate-900">{template?.title || 'Workshop'}</span>
                                                        <span className="mt-0.5 flex flex-wrap gap-3 text-xs text-slate-500">
                                                            <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(slot.date)}</span>
                                                            <span className="flex items-center gap-1"><Clock size={12} /> {slot.startTime}</span>
                                                            <span>{Math.max(0, slot.capacity - slot.bookedCount)} seats left</span>
                                                        </span>
                                                    </span>
                                                    <Plus size={16} className="shrink-0 text-amber-700" />
                                                </button>
                                            );
                                        })}
                                        {upcomingSlots.length === 0 && (
                                            <div className="rounded-lg border border-dashed border-amber-300 px-4 py-6 text-center">
                                                <p className="text-sm font-bold text-slate-800">No workshops scheduled</p>
                                                <p className="mt-1 text-xs text-slate-500">Add a workshop slot before booking this lead.</p>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}

                            <section aria-label="Lead timeline" className="divide-y divide-slate-200 border-y border-slate-200">
                                {timelineEvents.length === 0 ? (
                                    <div className="py-10 text-center">
                                        <MessageSquare size={24} className="mx-auto text-slate-300" />
                                        <p className="mt-2 text-sm font-bold text-slate-700">No history recorded yet</p>
                                        <p className="mt-1 text-xs text-slate-500">Add a note, call, booking, or imported chat to begin the timeline.</p>
                                    </div>
                                ) : timelineEvents.map((event: any, index: number) => (
                                    <article key={index} className="grid gap-2 py-3 sm:grid-cols-[112px_1fr]">
                                        <div>
                                            <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase ${event.type === 'call' ? 'bg-teal-50 text-teal-700' : event.type === 'conversion' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {event.type.replace('_', ' ')}
                                            </span>
                                            <p className="mt-1 font-mono text-[10px] text-slate-400">{formatDate(event.date)}</p>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{event.details}</p>
                                            <p className="mt-1 text-[10px] font-bold uppercase text-slate-400">by {event.author}</p>
                                        </div>
                                    </article>
                                ))}
                            </section>
                        </div>
                    )}

                    {activeTab === 'workshops' && (
                        <div className="space-y-2">
                            {leadBookings.map(booking => {
                                const slot = workshopSlots.find(item => item.id === booking.workshopSlotId);
                                const template = workshopTemplates.find(item => item.id === slot?.workshopTemplateId);
                                return (
                                    <article key={booking.id} className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700"><Calendar size={18} /></div>
                                            <div className="min-w-0">
                                                <h3 className="truncate text-sm font-bold text-slate-900">{template?.title || 'Workshop'}</h3>
                                                <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                                                    <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(slot?.date || '')}</span>
                                                    <span className="flex items-center gap-1"><Clock size={12} /> {slot?.startTime}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <span className={`self-start rounded-full px-2 py-1 text-[10px] font-bold uppercase sm:self-auto ${booking.status === 'attended' ? 'bg-teal-50 text-teal-700' : booking.status === 'cancelled' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                                            {booking.status}
                                        </span>
                                    </article>
                                );
                            })}
                            {leadBookings.length === 0 && (
                                <div className="rounded-lg border border-dashed border-slate-300 py-12 text-center">
                                    <Clock size={26} className="mx-auto text-slate-300" />
                                    <p className="mt-2 text-sm font-bold text-slate-700">No workshops booked yet</p>
                                    <button type="button" onClick={() => { setActiveTab('timeline'); setIsBookingMode(true); }} className="mt-3 h-10 rounded-lg bg-[#14B8A6] px-4 text-sm font-bold text-[#08111F] hover:bg-teal-300">
                                        Book a demo
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <ChatImporterModal isOpen={isChatImportOpen} onClose={() => setIsChatImportOpen(false)} lead={lead} />
        </Modal>
    );
};
