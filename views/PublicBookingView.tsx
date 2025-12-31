
import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, Calendar, ArrowLeft, RefreshCw, Clock, MapPin, Users } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, where, addDoc, updateDoc, doc, serverTimestamp, getDocs, increment } from 'firebase/firestore';
import { WorkshopTemplate, WorkshopSlot, AppSettings } from '../types';
import { getGeneratedSlots, formatDate, VirtualSlot } from '../utils/helpers';

export const PublicBookingView = () => {
    const [slug, setSlug] = useState<string | null>(null);
    const [template, setTemplate] = useState<WorkshopTemplate | null>(null);
    const [step, setStep] = useState<'loading' | 'calendar' | 'form' | 'success' | 'not-found'>('loading');

    const [existingSlots, setExistingSlots] = useState<WorkshopSlot[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<VirtualSlot | null>(null);

    const [bookingForm, setBookingForm] = useState({ parentName: '', phone: '', kidName: '', kidAge: '', kidInterests: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

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
        setIsSubmitting(true);

        try {
            let slotId = selectedSlot.slotId;

            // 1. If real slot doesn't exist, create it
            if (!slotId) {
                const slotRef = await addDoc(collection(db, 'workshop_slots'), {
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
            alert("Booking failed. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (step === 'loading') return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500"><RefreshCw className="animate-spin" /></div>;

    if (step === 'not-found') return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
            <h1 className="text-2xl font-bold text-white mb-2">Workshop Not Found</h1>
            <p className="text-slate-500">The link you followed may be invalid or expired.</p>
        </div>
    );

    if (step === 'success') return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center animate-in zoom-in duration-300">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500 border border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                    <CheckCircle2 size={40} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">You're All Set!</h2>
                <p className="text-slate-400 mb-6">
                    We've confirmed <strong>{bookingForm.kidName || bookingForm.parentName}'s</strong> spot for <br />
                    <span className="text-white font-medium">{template?.title}</span>
                </p>
                <div className="bg-slate-950 rounded-lg p-4 mb-6 border border-slate-800 text-sm">
                    <div className="flex justify-between mb-2"><span className="text-slate-500">Date</span><span className="text-white">{formatDate(selectedSlot?.dateStr || '')}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Time</span><span className="text-white">{selectedSlot?.startTime} - {selectedSlot?.endTime}</span></div>
                </div>
                <button onClick={() => window.location.reload()} className="w-full py-3 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700 transition-colors">Book Another</button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans pb-10">
            <div className="max-w-2xl mx-auto p-4 md:p-8">
                {/* Header Info */}
                <div className="mb-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 relative z-10">{template?.title}</h1>
                    <p className="text-slate-400 text-sm leading-relaxed mb-4 relative z-10">{template?.description}</p>
                    <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-300 relative z-10">
                        <span className="flex items-center gap-1 bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800"><Clock size={14} className="text-blue-400" /> {template?.duration} mins</span>
                        <span className="flex items-center gap-1 bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800"><MapPin size={14} className="text-emerald-400" /> In-Person</span>
                        <span className="flex items-center gap-1 bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800"><Users size={14} className="text-purple-400" /> Small Group</span>
                    </div>
                </div>

                {step === 'calendar' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-500" /> Select a Date & Time</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {availableSlots.length === 0 ? (
                                <div className="col-span-2 text-center p-8 border border-dashed border-slate-800 rounded-xl text-slate-500">No available slots found coming up.</div>
                            ) : availableSlots.map((slot, idx) => (
                                <button key={idx} onClick={() => { setSelectedSlot(slot); setStep('form'); }} disabled={slot.bookedCount >= slot.capacity} className="group flex flex-col items-start p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-blue-500/50 hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left">
                                    <div className="flex justify-between w-full mb-1">
                                        <span className="font-bold text-white">{formatDate(slot.dateStr)}</span>
                                        {slot.bookedCount >= slot.capacity ? <span className="text-red-500 text-[10px] uppercase font-bold">Full</span> : <span className="text-emerald-500 text-[10px] uppercase font-bold">Available</span>}
                                    </div>
                                    <span className="text-2xl font-light text-blue-400 group-hover:text-blue-300 transition-colors">{slot.startTime}</span>
                                    <div className="w-full h-1 bg-slate-800 mt-3 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(slot.bookedCount / slot.capacity) * 100}%` }}></div>
                                    </div>
                                    <span className="text-[10px] text-slate-500 mt-1">{slot.capacity - slot.bookedCount} spots left</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {step === 'form' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <button onClick={() => setStep('calendar')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 text-sm transition-colors"><ArrowLeft size={16} /> Back to Calendar</button>

                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8">
                            <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-800">
                                <div>
                                    <h3 className="text-lg font-bold text-white">Enter Details</h3>
                                    <p className="text-slate-500 text-sm">Booking for {formatDate(selectedSlot?.dateStr || '')} at {selectedSlot?.startTime}</p>
                                    {template?.targetAudience && template.targetAudience !== 'Child' && (
                                        <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider bg-blue-900/30 text-blue-400 px-2 py-1 rounded border border-blue-900/50">
                                            For {template.targetAudience}s
                                        </span>
                                    )}
                                </div>
                                <div className="text-right hidden sm:block">
                                    <div className="text-2xl font-bold text-blue-400">{selectedSlot?.startTime}</div>
                                </div>
                            </div>

                            <form onSubmit={handleBooking} className="space-y-5">
                                {(() => {
                                    const config = getFormConfig(template?.targetAudience);
                                    return (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{config.primary.label}</label>
                                                    <input required className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-blue-500 outline-none transition-colors" value={bookingForm.parentName} onChange={e => setBookingForm({ ...bookingForm, parentName: e.target.value })} placeholder={config.primary.placeholder} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">WhatsApp Number</label>
                                                    <input required type="tel" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-blue-500 outline-none transition-colors" value={bookingForm.phone} onChange={e => setBookingForm({ ...bookingForm, phone: e.target.value })} placeholder="06..." />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-5">
                                                <div className={config.numeric ? "col-span-2" : "col-span-3"}>
                                                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{config.secondary.label}</label>
                                                    <input required={template?.targetAudience !== 'Professional'} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-blue-500 outline-none transition-colors" value={bookingForm.kidName} onChange={e => setBookingForm({ ...bookingForm, kidName: e.target.value })} placeholder={config.secondary.placeholder} />
                                                </div>
                                                {config.numeric && (
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{config.numeric.label}</label>
                                                        <input required type="number" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-blue-500 outline-none transition-colors" value={bookingForm.kidAge} onChange={e => setBookingForm({ ...bookingForm, kidAge: e.target.value })} placeholder={config.numeric.placeholder} />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{config.notes.label}</label>
                                                <textarea className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-blue-500 outline-none transition-colors h-24 resize-none" value={bookingForm.kidInterests} onChange={e => setBookingForm({ ...bookingForm, kidInterests: e.target.value })} placeholder={config.notes.placeholder} />
                                            </div>
                                        </>
                                    );
                                })()}

                                <button disabled={isSubmitting} type="submit" className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold mt-4 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20 flex justify-center items-center gap-2 transition-all">
                                    {isSubmitting ? <RefreshCw className="animate-spin w-5 h-5" /> : "Confirm Free Booking"}
                                </button>
                                <p className="text-center text-xs text-slate-500 mt-2">By booking, you agree to be contacted via WhatsApp for confirmation.</p>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
