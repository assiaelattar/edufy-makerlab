
import React, { useState, useEffect, useMemo } from 'react';
import { AlertCircle, CheckCircle2, Calendar, ArrowLeft, RefreshCw, Clock, MapPin, Users } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, where, addDoc, updateDoc, doc, serverTimestamp, getDocs, increment } from 'firebase/firestore';
import { WorkshopTemplate, WorkshopSlot } from '../types';
import { getGeneratedSlots, formatDate, VirtualSlot } from '../utils/helpers';

export const PublicBookingView = () => {
    const [slug, setSlug] = useState<string | null>(null);
    const [template, setTemplate] = useState<WorkshopTemplate | null>(null);
    const [step, setStep] = useState<'loading' | 'calendar' | 'form' | 'success' | 'not-found'>('loading');

    const [existingSlots, setExistingSlots] = useState<WorkshopSlot[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<VirtualSlot | null>(null);

    const [bookingForm, setBookingForm] = useState({ parentName: '', phone: '', kidName: '', kidAge: '', kidInterests: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bookingError, setBookingError] = useState('');

    // Helpers for Dynamic Form
    const getFormConfig = (audience?: string) => {
        switch (audience) {
            case 'School': return {
                primary: { label: 'Contact Person', placeholder: 'e.g. Principal Skinner' },
                secondary: { label: 'School Name', placeholder: 'e.g. Springfield Elementary' },
                numeric: { label: 'Est. Students', placeholder: 'e.g. 25' },
                notes: { label: 'Class Goals / Topics', placeholder: 'What do you want to cover?' }
            };
            case 'Teacher': return {
                primary: { label: 'Teacher Name', placeholder: 'e.g. Ms. Krabappel' },
                secondary: { label: 'Subject / Grade', placeholder: 'e.g. Science - Grade 4' },
                numeric: null,
                notes: { label: 'Professional Development Goals', placeholder: 'Specific skills to learn...' }
            };
            case 'Professional': return {
                primary: { label: 'Full Name', placeholder: 'e.g. Homer Simpson' },
                secondary: { label: 'Company (Optional)', placeholder: 'e.g. Sector 7G' },
                numeric: null,
                notes: { label: 'Project Needs / Questions', placeholder: 'Is this suitable for beginners?' }
            };
            default: return {
                primary: { label: 'Parent Name', placeholder: 'John Doe' },
                secondary: { label: 'Child Name', placeholder: "Child's Name" },
                numeric: { label: 'Age', placeholder: 'e.g. 8' },
                notes: { label: 'Interests / Notes (Optional)', placeholder: 'e.g. Loves Lego, Coding, Minecraft...' }
            };
        }
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const slugParam = params.get('slug');
        if (!slugParam) {
            setStep('not-found');
            return;
        }
        setSlug(slugParam);

        // Fetch Template by slug
        const q = query(collection(db!, 'workshop_templates'), where('shareableSlug', '==', slugParam));
        getDocs(q).then(snap => {
            if (snap.empty) {
                setStep('not-found');
            } else {
                const data = { id: snap.docs[0].id, ...snap.docs[0].data() } as WorkshopTemplate;
                setTemplate(data);
                setStep('calendar');

                // Start listening to slots for this template
                onSnapshot(query(collection(db!, 'workshop_slots'), where('workshopTemplateId', '==', data.id)), (slotSnap) => {
                    setExistingSlots(slotSnap.docs.map(d => ({ id: d.id, ...d.data() } as WorkshopSlot)));
                });
            }
        });
    }, []);

    const availableSlots = useMemo(() => {
        if (!template) return [];
        return getGeneratedSlots([template], existingSlots, new Date(), 60); // 60 days lookahead
    }, [template, existingSlots]);

    const handleBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !template || !selectedSlot) return;
        setBookingError('');
        setIsSubmitting(true);

        try {
            let slotId = selectedSlot.slotId;

            // 1. If real slot doesn't exist, create it
            if (!slotId) {
                const slotRef = await addDoc(collection(db, 'workshop_slots'), {
                    organizationId: template.organizationId, // Inherit from template
                    workshopTemplateId: template.id,
                    date: selectedSlot.dateStr,
                    startTime: selectedSlot.startTime,
                    endTime: selectedSlot.endTime,
                    capacity: template.capacityPerSlot,
                    bookedCount: 0,
                    status: 'available'
                });
                slotId = slotRef.id;
            }

            // 2. Create Booking
            await addDoc(collection(db, 'bookings'), {
                organizationId: template.organizationId, // Inherit from template
                workshopSlotId: slotId,
                workshopTemplateId: template.id,
                parentName: bookingForm.parentName,
                phoneNumber: bookingForm.phone,
                kidName: bookingForm.kidName,
                kidAge: Number(bookingForm.kidAge),
                kidInterests: bookingForm.kidInterests,
                status: 'confirmed',
                bookedAt: serverTimestamp()
            });

            // 3. Increment Booked Count
            await updateDoc(doc(db, 'workshop_slots', slotId), {
                bookedCount: increment(1)
            });

            setStep('success');
        } catch (err) {
            console.error(err);
            setBookingError('We could not confirm this booking. Please check your connection and try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (step === 'loading') return <div className="min-h-screen bg-[#F7F1E4] flex items-center justify-center text-[#0F766E]"><RefreshCw className="animate-spin" /></div>;

    if (step === 'not-found') return (
        <div className="min-h-screen bg-[#F7F1E4] text-[#08111F] flex flex-col items-center justify-center p-6 text-center">
            <Calendar className="mb-4 text-[#0F766E]" size={28} />
            <h1 className="text-2xl font-bold mb-2">Workshop not found</h1>
            <p className="max-w-sm text-[#52606D]">This booking link may be invalid or no longer available.</p>
        </div>
    );

    if (step === 'success') return (
        <div className="min-h-screen bg-[#F7F1E4] flex items-center justify-center p-4 text-[#08111F]">
            <div className="bg-white border border-[#D8D2C5] rounded-lg p-8 max-w-md w-full text-center shadow-[0_18px_50px_rgba(8,17,31,0.10)] animate-in zoom-in duration-300">
                <div className="w-16 h-16 bg-[#E6F7F3] rounded-full flex items-center justify-center mx-auto mb-6 text-[#0F766E] border border-[#A7E3D8]">
                    <CheckCircle2 size={34} />
                </div>
                <h2 className="text-2xl font-bold mb-2">Your place is reserved</h2>
                <p className="text-[#52606D] mb-6">
                    We've confirmed <strong>{bookingForm.kidName || bookingForm.parentName}'s</strong> spot for <br />
                    <span className="text-[#08111F] font-semibold">{template?.title}</span>
                </p>
                <div className="bg-[#F8FAF9] rounded-lg p-4 mb-6 border border-[#E3DED3] text-sm">
                    <div className="flex justify-between gap-4 mb-2"><span className="text-[#667085]">Date</span><span className="font-medium">{formatDate(selectedSlot?.dateStr || '')}</span></div>
                    <div className="flex justify-between gap-4"><span className="text-[#667085]">Time</span><span className="font-medium">{selectedSlot?.startTime} - {selectedSlot?.endTime}</span></div>
                </div>
                <button onClick={() => window.location.reload()} className="w-full min-h-10 px-4 bg-[#08111F] text-white rounded-lg font-semibold hover:bg-[#14233A] transition-colors">Book another session</button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F7F1E4] text-[#08111F] font-sans pb-10">
            <div className="max-w-2xl mx-auto p-4 md:p-8">
                {/* Header Info */}
                <div className="mb-8 bg-[#08111F] border border-[#1B2D45] rounded-lg p-6 text-white shadow-[0_18px_50px_rgba(8,17,31,0.16)]">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#F2C766] mb-3">Edufy workshop booking</p>
                    <h1 className="text-2xl md:text-3xl font-bold mb-2">{template?.title}</h1>
                    <p className="text-slate-300 text-sm leading-relaxed mb-5">{template?.description}</p>
                    <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-200">
                        <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-md border border-white/10"><Clock size={14} className="text-[#F2C766]" /> {template?.duration} mins</span>
                        <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-md border border-white/10"><MapPin size={14} className="text-[#14B8A6]" /> In person</span>
                        <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-md border border-white/10"><Users size={14} className="text-[#F2C766]" /> Small group</span>
                    </div>
                </div>

                {step === 'calendar' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-[#0F766E]" /> Select a date and time</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {availableSlots.length === 0 ? (
                                <div className="col-span-2 text-center p-8 border border-dashed border-[#C9C2B5] rounded-lg text-[#667085] bg-white/40">No available sessions are scheduled yet.</div>
                            ) : availableSlots.map((slot, idx) => (
                                <button key={idx} onClick={() => { setSelectedSlot(slot); setBookingError(''); setStep('form'); }} disabled={slot.bookedCount >= slot.capacity} className="group flex flex-col items-start p-4 bg-white border border-[#D8D2C5] rounded-lg hover:border-[#14B8A6] hover:shadow-[0_10px_28px_rgba(8,17,31,0.08)] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left">
                                    <div className="flex justify-between w-full mb-1">
                                        <span className="font-bold">{formatDate(slot.dateStr)}</span>
                                        {slot.bookedCount >= slot.capacity ? <span className="text-[#BE123C] text-[10px] uppercase font-bold">Full</span> : <span className="text-[#0F766E] text-[10px] uppercase font-bold">Available</span>}
                                    </div>
                                    <span className="text-2xl font-semibold text-[#0F766E]">{slot.startTime}</span>
                                    <div className="w-full h-1 bg-[#E8E2D7] mt-3 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#14B8A6] rounded-full" style={{ width: `${(slot.bookedCount / slot.capacity) * 100}%` }}></div>
                                    </div>
                                    <span className="text-[10px] text-[#667085] mt-1">{slot.capacity - slot.bookedCount} spots left</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {step === 'form' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <button onClick={() => { setBookingError(''); setStep('calendar'); }} className="flex items-center gap-2 text-[#52606D] hover:text-[#08111F] mb-6 text-sm font-medium transition-colors"><ArrowLeft size={16} /> Back to calendar</button>

                        <div className="bg-white border border-[#D8D2C5] rounded-lg p-6 md:p-8 shadow-[0_18px_50px_rgba(8,17,31,0.08)]">
                            <div className="flex items-center justify-between mb-6 pb-6 border-b border-[#E3DED3]">
                                <div>
                                    <h3 className="text-lg font-bold">Your details</h3>
                                    <p className="text-[#667085] text-sm">{formatDate(selectedSlot?.dateStr || '')} at {selectedSlot?.startTime}</p>
                                    {template?.targetAudience && template.targetAudience !== 'Child' && (
                                        <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider bg-[#E6F7F3] text-[#0F766E] px-2 py-1 rounded border border-[#A7E3D8]">
                                            For {template.targetAudience}s
                                        </span>
                                    )}
                                </div>
                                <div className="text-right hidden sm:block">
                                    <div className="text-2xl font-bold text-[#0F766E]">{selectedSlot?.startTime}</div>
                                </div>
                            </div>

                            <form onSubmit={handleBooking} className="space-y-5">
                                {(() => {
                                    const config = getFormConfig(template?.targetAudience);
                                    return (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <div>
                                                    <label className="block text-xs font-semibold text-[#52606D] mb-1.5">{config.primary.label}</label>
                                                    <input required className="w-full min-h-10 p-3 bg-[#FBFCFB] border border-[#D8D2C5] rounded-lg focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/15 outline-none transition-colors" value={bookingForm.parentName} onChange={e => setBookingForm({ ...bookingForm, parentName: e.target.value })} placeholder={config.primary.placeholder} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-[#52606D] mb-1.5">WhatsApp number</label>
                                                    <input required type="tel" className="w-full min-h-10 p-3 bg-[#FBFCFB] border border-[#D8D2C5] rounded-lg focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/15 outline-none transition-colors" value={bookingForm.phone} onChange={e => setBookingForm({ ...bookingForm, phone: e.target.value })} placeholder="06..." />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-5">
                                                <div className={config.numeric ? "col-span-2" : "col-span-3"}>
                                                    <label className="block text-xs font-semibold text-[#52606D] mb-1.5">{config.secondary.label}</label>
                                                    <input required={template?.targetAudience !== 'Professional'} className="w-full min-h-10 p-3 bg-[#FBFCFB] border border-[#D8D2C5] rounded-lg focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/15 outline-none transition-colors" value={bookingForm.kidName} onChange={e => setBookingForm({ ...bookingForm, kidName: e.target.value })} placeholder={config.secondary.placeholder} />
                                                </div>
                                                {config.numeric && (
                                                    <div>
                                                        <label className="block text-xs font-semibold text-[#52606D] mb-1.5">{config.numeric.label}</label>
                                                        <input required type="number" className="w-full min-h-10 p-3 bg-[#FBFCFB] border border-[#D8D2C5] rounded-lg focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/15 outline-none transition-colors" value={bookingForm.kidAge} onChange={e => setBookingForm({ ...bookingForm, kidAge: e.target.value })} placeholder={config.numeric.placeholder} />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-[#52606D] mb-1.5">{config.notes.label}</label>
                                                <textarea className="w-full p-3 bg-[#FBFCFB] border border-[#D8D2C5] rounded-lg focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/15 outline-none transition-colors h-24 resize-none" value={bookingForm.kidInterests} onChange={e => setBookingForm({ ...bookingForm, kidInterests: e.target.value })} placeholder={config.notes.placeholder} />
                                            </div>
                                        </>
                                    );
                                })()}

                                {bookingError && (
                                    <div role="alert" className="flex items-start gap-3 rounded-lg border border-[#FECDD3] bg-[#FFF1F2] p-3 text-sm text-[#9F1239]">
                                        <AlertCircle size={18} className="mt-0.5 shrink-0" />
                                        <span>{bookingError}</span>
                                    </div>
                                )}
                                <button disabled={isSubmitting} type="submit" className="w-full min-h-11 px-4 bg-[#0F766E] hover:bg-[#115E59] text-white rounded-lg font-bold mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 transition-colors">
                                    {isSubmitting ? <RefreshCw className="animate-spin w-5 h-5" /> : "Confirm free booking"}
                                </button>
                                <p className="text-center text-xs text-[#667085] mt-2">We will use WhatsApp only to confirm this booking.</p>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
