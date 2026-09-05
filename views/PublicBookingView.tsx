
import React, { useState, useEffect, useMemo } from 'react';
import { AlertCircle, CheckCircle2, Calendar, ArrowLeft, RefreshCw, Clock, Users, ShieldCheck, Sparkles, ArrowRight, ChevronDown } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, onSnapshot, query, where, addDoc, updateDoc, doc, serverTimestamp, getDocs, increment } from 'firebase/firestore';
import { WorkshopTemplate, WorkshopSlot } from '../types';
import { getGeneratedSlots, VirtualSlot } from '../utils/helpers';
import { formatWorkshopDate, getWorkshopDayName, getWorkshopOgImageUrl, getWorkshopScheduleLabel } from '../utils/workshops';

export const PublicBookingView = () => {
    const [template, setTemplate] = useState<WorkshopTemplate | null>(null);
    const [step, setStep] = useState<'loading' | 'calendar' | 'form' | 'success' | 'not-found'>('loading');

    const [existingSlots, setExistingSlots] = useState<WorkshopSlot[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<VirtualSlot | null>(null);

    const [bookingForm, setBookingForm] = useState({ parentName: '', phone: '', kidName: '', kidAge: '', kidInterests: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bookingError, setBookingError] = useState('');
    const [showAllSlots, setShowAllSlots] = useState(false);

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
        const pathMatch = window.location.pathname.match(/^\/w\/([^/]+)\/?$/);
        const slugParam = params.get('slug') || (pathMatch ? decodeURIComponent(pathMatch[1]) : '');
        let unsubscribeSlots: (() => void) | undefined;
        let cancelled = false;

        if (!slugParam || !db) {
            setStep('not-found');
            return;
        }

        const q = query(collection(db, 'workshop_templates'), where('shareableSlug', '==', slugParam));
        getDocs(q).then(snap => {
            if (cancelled) return;
            if (snap.empty) {
                setStep('not-found');
            } else {
                const data = { id: snap.docs[0].id, ...snap.docs[0].data() } as WorkshopTemplate;
                if (data.isActive === false) {
                    setStep('not-found');
                    return;
                }
                setTemplate(data);
                setStep('calendar');

                unsubscribeSlots = onSnapshot(query(collection(db, 'workshop_slots'), where('workshopTemplateId', '==', data.id)), (slotSnap) => {
                    setExistingSlots(slotSnap.docs.map(d => ({ id: d.id, ...d.data() } as WorkshopSlot)));
                });
            }
        }).catch(error => {
            console.error('Workshop invitation could not be loaded', error);
            if (!cancelled) setStep('not-found');
        });

        return () => {
            cancelled = true;
            unsubscribeSlots?.();
        };
    }, []);

    useEffect(() => {
        if (!template) return;
        const previousTitle = document.title;
        document.title = `${template.title} · Workshop invitation`;
        return () => { document.title = previousTitle; };
    }, [template]);

    const availableSlots = useMemo(() => {
        if (!template) return [];
        return getGeneratedSlots([template], existingSlots, new Date(), 60)
            .filter(slot => slot.status !== 'cancelled');
    }, [template, existingSlots]);

    const visibleSlots = showAllSlots ? availableSlots : availableSlots.slice(0, 6);
    const durationLabel = template
        ? template.duration % 60 === 0
            ? `${template.duration / 60} ${template.duration === 60 ? 'hour' : 'hours'}`
            : `${template.duration} min`
        : '';

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
        <div className="flex min-h-screen items-center justify-center bg-[#F4F7F2] p-3 text-[#08111F]">
            <div className="w-full max-w-md animate-in overflow-hidden rounded-2xl border border-[#DCE2D8] bg-white shadow-[0_20px_60px_rgba(8,17,31,0.1)] zoom-in duration-300">
                <div className="h-1.5 bg-[#B7F34A]" />
                <div className="p-5 text-center sm:p-8">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F8F3] text-[#087A68]">
                    <CheckCircle2 size={27} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#087A68]">Booking confirmed</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.035em]">Place reserved</h2>
                <p className="mt-1 text-sm text-[#617065]">{bookingForm.kidName || bookingForm.parentName} · {template?.title}</p>
                <div className="my-5 flex items-center justify-between gap-4 rounded-xl bg-[#F1F5EE] p-4 text-left">
                    <div><p className="font-black text-[#08111F]">{getWorkshopDayName(selectedSlot?.dateStr || '')}, {formatWorkshopDate(selectedSlot?.dateStr || '', { day: 'numeric', month: 'short' })}</p><p className="mt-0.5 text-xs text-[#617065]">{formatWorkshopDate(selectedSlot?.dateStr || '', { year: 'numeric' })}</p></div>
                    <span className="shrink-0 text-sm font-black text-[#087A68]">{selectedSlot?.startTime}–{selectedSlot?.endTime}</span>
                </div>
                <p className="mb-5 flex items-center justify-center gap-1.5 text-xs text-[#617065]"><ShieldCheck size={14} /> Updates will be sent to your WhatsApp number.</p>
                <button onClick={() => window.location.reload()} className="min-h-11 w-full rounded-xl bg-[#08111F] px-4 text-sm font-bold text-white transition-colors hover:bg-[#14233A]">Book another session</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F4F7F2] pb-8 font-sans text-[#08111F]" style={{ backgroundImage: 'radial-gradient(circle at 12% 4%, rgba(183,243,74,0.16), transparent 20rem)' }}>
            <header className="border-b border-[#DCE2D8]/80 bg-[#F4F7F2]/90 backdrop-blur">
                <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#08111F] text-[#B7F34A]"><Sparkles size={15} /></span><span className="text-sm font-black tracking-[-0.02em]">MakerLab workshop</span></div>
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#617065]"><ShieldCheck size={13} /> Secure</span>
                </div>
            </header>

            <main className="mx-auto max-w-3xl px-3 sm:px-5">
                {step === 'calendar' && <section className="mt-3 overflow-hidden rounded-2xl bg-[#08111F] text-white shadow-[0_16px_45px_rgba(8,17,31,0.14)]">
                    <div className="grid lg:grid-cols-[1fr_18rem]">
                        <div className="p-4 sm:p-6 lg:p-8">
                            <p className="hidden text-[10px] font-black uppercase tracking-[0.18em] text-[#B7F34A] sm:block">Workshop invitation</p>
                            <h1 className="text-2xl font-black leading-tight tracking-[-0.04em] sm:mt-2 sm:text-3xl">{template?.title}</h1>
                            <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-300 sm:text-sm sm:leading-6">{template?.description}</p>
                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-white/10 pt-3 text-[11px] font-bold text-slate-200 sm:text-xs">
                                <span className="flex items-center gap-1.5"><Clock size={13} className="text-[#B7F34A]" /> {durationLabel}</span>
                                <span className="flex items-center gap-1.5"><Users size={13} className="text-[#F7C85E]" /> {template?.capacityPerSlot} places</span>
                                {template && <span className="flex basis-full items-start gap-1.5 text-slate-300 sm:basis-auto"><Calendar size={13} className="mt-0.5 shrink-0 text-[#55D6BE]" /> {getWorkshopScheduleLabel(template)}</span>}
                            </div>
                        </div>
                        <div className="relative hidden min-h-64 overflow-hidden border-l border-white/10 lg:block">
                            <img src={getWorkshopOgImageUrl(template?.imageUrl)} alt={`${template?.title || 'Workshop'} preview`} className="absolute inset-0 h-full w-full object-cover" onError={event => { event.currentTarget.src = `${window.location.origin}/images/makerlab-tello-python-hero-v1.png`; }} />
                            <div className="absolute inset-0 bg-gradient-to-r from-[#08111F]/30 to-transparent" />
                        </div>
                    </div>
                </section>}

                {step === 'calendar' && (
                    <section className="mt-3 animate-in rounded-2xl border border-[#DCE2D8] bg-white p-3 shadow-[0_12px_35px_rgba(8,17,31,0.06)] fade-in slide-in-from-bottom-3 sm:p-5">
                            <div className="mb-3 flex items-start justify-between gap-3 px-1">
                                <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#087A68]">Step 1 of 2</p><h2 className="mt-0.5 text-xl font-black tracking-[-0.03em]">Choose a session</h2><p className="mt-1 text-[11px] text-[#617065]">Free booking · no payment</p></div>
                                <span className="rounded-full bg-[#F0F4ED] px-2.5 py-1 text-[10px] font-black text-[#617065]">{availableSlots.length} dates</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {availableSlots.length === 0 ? (
                                    <div className="col-span-full rounded-xl border border-dashed border-[#C9D1C7] bg-[#F8FAF7] p-7 text-center text-sm text-[#667085]">No sessions available yet.</div>
                                ) : visibleSlots.map(slot => {
                                    const isFull = slot.bookedCount >= slot.capacity;
                                    const spotsLeft = Math.max(0, slot.capacity - slot.bookedCount);
                                    return (
                                        <button key={`${slot.dateStr}-${slot.startTime}`} onClick={() => { setSelectedSlot(slot); setBookingError(''); setStep('form'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={isFull} className="group min-h-[104px] overflow-hidden rounded-xl border border-[#DCE2D8] bg-[#FBFCFA] p-3 text-left transition-colors hover:border-[#20A88D] hover:bg-[#F6FBF8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20A88D]/50 disabled:cursor-not-allowed disabled:opacity-55">
                                            <div className="flex h-full flex-col justify-between">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[#087A68]">{getWorkshopDayName(slot.dateStr)}</span>
                                                    <span className={`text-[9px] font-black uppercase ${isFull ? 'text-[#BE123C]' : 'text-[#617065]'}`}>{isFull ? 'Full' : `${spotsLeft} left`}</span>
                                                </div>
                                                <div className="mt-2 flex items-end justify-between gap-2">
                                                    <p className="text-xl font-black leading-none tracking-[-0.03em]">{formatWorkshopDate(slot.dateStr, { day: 'numeric' })} <span className="text-xs font-bold text-[#617065]">{formatWorkshopDate(slot.dateStr, { month: 'short' })}</span></p>
                                                    <ArrowRight className="text-[#20A88D] transition-transform group-hover:translate-x-0.5" size={15} />
                                                </div>
                                                <p className="mt-3 border-t border-[#E3E8E1] pt-2 text-xs font-black text-[#08111F]">{slot.startTime}–{slot.endTime}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            {availableSlots.length > 6 && <button type="button" onClick={() => setShowAllSlots(current => !current)} className="mt-3 flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-[#DCE2D8] text-xs font-bold text-[#52606D] hover:bg-[#F7F9F5]">{showAllSlots ? 'Show fewer dates' : `Show ${availableSlots.length - 6} more dates`}<ChevronDown size={14} className={`transition-transform ${showAllSlots ? 'rotate-180' : ''}`} /></button>}
                    </section>
                )}

                {step === 'form' && (
                    <section className="mt-3 animate-in fade-in slide-in-from-right-3">
                        <button onClick={() => { setBookingError(''); setStep('calendar'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="mb-2 flex min-h-9 items-center gap-1.5 rounded-lg px-1 text-xs font-bold text-[#52606D] transition-colors hover:text-[#08111F]"><ArrowLeft size={14} /> Change session</button>

                        <div className="rounded-2xl border border-[#DCE2D8] bg-white p-3 shadow-[0_12px_35px_rgba(8,17,31,0.06)] sm:p-6">
                            <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-[#E7F8C7] p-3 text-[#1F3508]">
                                <div><p className="text-[9px] font-black uppercase tracking-[0.12em]">Selected session</p><p className="mt-0.5 text-sm font-black">{getWorkshopDayName(selectedSlot?.dateStr || '')}, {formatWorkshopDate(selectedSlot?.dateStr || '', { day: 'numeric', month: 'short' })}</p></div>
                                <span className="shrink-0 text-sm font-black">{selectedSlot?.startTime}–{selectedSlot?.endTime}</span>
                            </div>
                            <div className="mb-4 px-1"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#087A68]">Step 2 of 2</p><h2 className="mt-0.5 text-xl font-black tracking-[-0.03em]">Your details</h2></div>
                                <form onSubmit={handleBooking} className="space-y-3">
                                    {(() => {
                                        const config = getFormConfig(template?.targetAudience);
                                        const inputClass = 'min-h-11 w-full rounded-lg border border-[#D8DFD6] bg-[#FBFCFA] px-3 py-2.5 text-sm text-[#08111F] outline-none transition-colors focus:border-[#20A88D] focus:ring-3 focus:ring-[#20A88D]/10';
                                        return (
                                            <>
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    <div><label className="mb-1 block text-[11px] font-bold text-[#52606D]">{config.primary.label}</label><input required autoComplete="name" className={inputClass} value={bookingForm.parentName} onChange={e => setBookingForm({ ...bookingForm, parentName: e.target.value })} placeholder={config.primary.placeholder} /></div>
                                                    <div><label className="mb-1 block text-[11px] font-bold text-[#52606D]">WhatsApp number</label><input required type="tel" inputMode="tel" autoComplete="tel" className={inputClass} value={bookingForm.phone} onChange={e => setBookingForm({ ...bookingForm, phone: e.target.value })} placeholder="06..." /></div>
                                                </div>
                                                <div className={`grid gap-3 ${config.numeric ? 'grid-cols-[minmax(0,1fr)_5.5rem]' : ''}`}>
                                                    <div><label className="mb-1 block text-[11px] font-bold text-[#52606D]">{config.secondary.label}</label><input required={template?.targetAudience !== 'Professional'} className={inputClass} value={bookingForm.kidName} onChange={e => setBookingForm({ ...bookingForm, kidName: e.target.value })} placeholder={config.secondary.placeholder} /></div>
                                                    {config.numeric && <div><label className="mb-1 block text-[11px] font-bold text-[#52606D]">{config.numeric.label}</label><input required type="number" min={1} max={99} inputMode="numeric" className={inputClass} value={bookingForm.kidAge} onChange={e => setBookingForm({ ...bookingForm, kidAge: e.target.value })} placeholder="8" /></div>}
                                                </div>
                                                <details className="group rounded-lg border border-[#E1E6DF] bg-[#FBFCFA]">
                                                    <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between px-3 text-xs font-bold text-[#52606D]">Add a note <span className="flex items-center gap-1 text-[10px] font-medium text-[#7B897F]">Optional <ChevronDown size={13} className="transition-transform group-open:rotate-180" /></span></summary>
                                                    <div className="border-t border-[#E1E6DF] p-2"><label className="sr-only">{config.notes.label}</label><textarea className={`${inputClass} h-20 resize-none`} value={bookingForm.kidInterests} onChange={e => setBookingForm({ ...bookingForm, kidInterests: e.target.value })} placeholder={config.notes.placeholder} /></div>
                                                </details>
                                            </>
                                        );
                                    })()}

                                    {bookingError && <div role="alert" className="flex items-start gap-2 rounded-lg border border-[#FECDD3] bg-[#FFF1F2] p-3 text-xs leading-5 text-[#9F1239]"><AlertCircle size={16} className="mt-0.5 shrink-0" /><span>{bookingError}</span></div>}
                                    <button disabled={isSubmitting} type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#087A68] px-4 text-sm font-black text-white shadow-[0_8px_20px_rgba(8,122,104,0.2)] transition-colors hover:bg-[#066356] disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting ? <RefreshCw className="h-5 w-5 animate-spin" /> : <>Reserve this place <ArrowRight size={16} /></>}</button>
                                    <p className="text-center text-[10px] leading-4 text-[#7B897F]">We only use your number for this booking.</p>
                                </form>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
};
