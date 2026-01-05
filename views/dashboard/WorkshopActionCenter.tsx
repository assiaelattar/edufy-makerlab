import React, { useMemo, useState } from 'react';
import { MessageCircle, CheckCircle2, Phone, UserCheck, Clock, Calendar, AlertTriangle, ArrowRight, MessageSquare, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { updateDoc, doc, addDoc, collection, serverTimestamp } from 'firebase/firestore'; // Updated imports

// ...


import { db } from '../../services/firebase';
import { Booking } from '../../types';
import { Modal } from '../../components/Modal';

export const WorkshopActionCenter = () => {
    const { bookings, workshopSlots, workshopTemplates } = useAppContext();
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [feedbackForm, setFeedbackForm] = useState({ notes: '', interest: '' });

    // --- Helpers ---
    const getTemplate = (slotId: string) => {
        const slot = workshopSlots.find(s => s.id === slotId);
        if (!slot) return null;
        return workshopTemplates.find(t => t.id === slot.workshopTemplateId);
    };

    const getSlotDate = (slotId: string) => {
        const slot = workshopSlots.find(s => s.id === slotId);
        return slot ? { date: slot.date, time: slot.startTime } : { date: '', time: '' };
    };

    const handleUpdateStatus = async (bookingId: string, status: any) => {
        if (!db) return;
        await updateDoc(doc(db, 'bookings', bookingId), { status });
    };

    const handleOpenWhatsApp = (booking: Booking, type: 'reminder' | 'feedback') => {
        const slot = workshopSlots.find(s => s.id === booking.workshopSlotId);
        const template = workshopTemplates.find(t => t.id === slot?.workshopTemplateId);
        const workshopName = template?.title || 'the workshop';
        const date = slot?.date || '';
        const time = slot?.startTime || '';

        let message = '';
        if (type === 'reminder') {
            message = `Hello ${booking.parentName}, this is a friendly reminder about the ${workshopName} for ${booking.kidName} tomorrow at ${time}. We are excited to see you!`;
        } else {
            message = `Hi ${booking.parentName}, we hope ${booking.kidName} enjoyed ${workshopName}! We would love to hear your feedback. How was it?`;
        }

        window.open(`https://wa.me/${booking.phoneNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`, '_blank');

        // Auto-update status if it's the first time
        if (type === 'reminder' && booking.status === 'confirmed') {
            handleUpdateStatus(booking.id, 'reminder_sent');
        }
    };

    const [selectedProgramInterest, setSelectedProgramInterest] = useState('');
    const { programs } = useAppContext(); // Get active programs for dynamic list

    // --- Derived Data ---
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    // ... existing ...

    const handleConvert = async () => {
        if (!selectedBooking || !db) return;

        try {
            // 1. Update Booking Status
            await updateDoc(doc(db, 'bookings', selectedBooking.id), {
                status: 'converted',
                feedbackNotes: feedbackForm.notes,
                programInterest: selectedProgramInterest
            });

            // 2. Create Lead
            const newLead = {
                name: selectedBooking.kidName,
                parentName: selectedBooking.parentName,
                phone: selectedBooking.phoneNumber,
                status: 'new',
                source: 'Workshop Conversion',
                createdAt: serverTimestamp(),
                interests: selectedProgramInterest ? [selectedProgramInterest] : [],
                tags: ['workshop_attendee'],
                notes: feedbackForm.notes ? [feedbackForm.notes] : [],
                timeline: [{
                    date: new Date().toISOString(),
                    type: 'conversion',
                    details: `Converted from workshop. Feedback: ${feedbackForm.notes}`
                }]
            };

            await addDoc(collection(db, 'leads'), newLead);

            setIsFeedbackModalOpen(false);
            setFeedbackForm({ notes: '', interest: '' });
            alert("Lead created successfully!");
        } catch (e) {
            console.error("Conversion failed", e);
            alert("Error converting lead");
        }
    };

    // ... existing ...


    const upcomingReminders = useMemo(() => {
        return bookings.filter(b => {
            const slot = workshopSlots.find(s => s.id === b.workshopSlotId);
            if (!slot) return false;
            // Show if confirmed and date is today or tomorrow
            return b.status === 'confirmed' && (slot.date === today || slot.date === tomorrow);
        });
    }, [bookings, workshopSlots, today, tomorrow]);

    const pendingFeedback = useMemo(() => {
        return bookings.filter(b => b.status === 'attended' || b.status === 'feedback_requested');
    }, [bookings]);

    const pendingConfirmation = useMemo(() => {
        // Bookings where reminder sent but not yet re-confirmed (if that's a flow we want, implies 'reminder_sent' is waiting state)
        // For now, let's just list 'reminder_sent' items here as "Waiting for Confirmation"
        return bookings.filter(b => b.status === 'reminder_sent');
    }, [bookings]);

    if (upcomingReminders.length === 0 && pendingFeedback.length === 0 && pendingConfirmation.length === 0) return null;

    return (
        <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 shadow-sm mb-8 animate-in fade-in slide-in-from-bottom-2">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <AlertTriangle className="text-amber-500" size={24} />
                Workshop Action Center
            </h2>

            <div className="space-y-6">

                {/* 1. UPCOMING REMINDERS */}
                {upcomingReminders.length > 0 && (
                    <div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Clock size={14} /> Send Reminders ({upcomingReminders.length})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {upcomingReminders.map(b => {
                                const info = getSlotDate(b.workshopSlotId);
                                const tpl = getTemplate(b.workshopSlotId);
                                return (
                                    <div key={b.id} className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex flex-col justify-between">
                                        <div className="mb-4">
                                            <div className="font-bold text-slate-800">{b.kidName}</div>
                                            <div className="text-xs text-slate-500">{b.parentName} • {info.date === today ? 'Today' : 'Tomorrow'} @ {info.time}</div>
                                            <div className="text-xs font-medium text-amber-600 mt-1">{tpl?.title}</div>
                                        </div>
                                        <button
                                            onClick={() => handleOpenWhatsApp(b, 'reminder')}
                                            className="w-full py-2 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <MessageCircle size={14} /> Send Reminder
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 2. PENDING CONFIRMATIONS (Sent but not confirmed) */}
                {pendingConfirmation.length > 0 && (
                    <div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <CheckCircle2 size={14} /> Confirm Attendance ({pendingConfirmation.length})
                        </h3>
                        <div className="space-y-2">
                            {pendingConfirmation.map(b => (
                                <div key={b.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">{b.kidName.charAt(0)}</div>
                                        <div>
                                            <div className="font-bold text-slate-700 text-sm">{b.kidName} <span className="text-slate-400 font-normal">({b.parentName})</span></div>
                                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider text-green-600">Reminder Sent</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleUpdateStatus(b.id, 'confirmed')} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200">Confirm</button>
                                        <button onClick={() => handleUpdateStatus(b.id, 'cancelled')} className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold hover:bg-slate-200">Cancel</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. FEEDBACK & CONVERSION */}
                {pendingFeedback.length > 0 && (
                    <div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <UserCheck size={14} /> Feedback & Admission ({pendingFeedback.length})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {pendingFeedback.map(b => (
                                <div key={b.id} className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="font-bold text-indigo-900">{b.kidName}</div>
                                            <div className="text-xs text-indigo-500">Attended Workshop</div>
                                        </div>
                                        <div className="p-2 bg-indigo-100 rounded-full text-indigo-500">
                                            <MessageSquare size={16} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => handleOpenWhatsApp(b, 'feedback')}
                                            className="py-2 bg-white text-indigo-600 border border-indigo-200 rounded-xl text-xs font-bold hover:bg-indigo-50"
                                        >
                                            Ask "How was it?"
                                        </button>
                                        <button
                                            onClick={() => { setSelectedBooking(b); setIsFeedbackModalOpen(true); }}
                                            className="py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                                        >
                                            Convert / Close
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* FEEDBACK MODAL */}
            <Modal isOpen={isFeedbackModalOpen} onClose={() => setIsFeedbackModalOpen(false)} title="Workshop Feedback">
                <div className="space-y-4">
                    <p className="text-sm text-slate-500">Record feedback for <span className="font-bold text-slate-700">{selectedBooking?.kidName}</span>.</p>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Parent's Feedback / Notes</label>
                        <textarea
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm min-h-[100px]"
                            placeholder="They loved the robot part, but..."
                            value={feedbackForm.notes}
                            onChange={e => setFeedbackForm({ ...feedbackForm, notes: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Interested Program</label>
                        <select
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                            value={selectedProgramInterest}
                            onChange={e => setSelectedProgramInterest(e.target.value)}
                        >
                            <option value="">Select Interest...</option>
                            {programs.map(p => (
                                <option key={p.id} value={p.name}>{p.name}</option>
                            ))}
                            <option value="Not Interested">Not Interested</option>
                        </select>
                    </div>

                    <button
                        onClick={handleConvert}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                    >
                        Save & Convert
                    </button>
                </div>
            </Modal>
        </div>
    );
};
