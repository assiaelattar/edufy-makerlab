
import React, { useState, useEffect, useMemo } from 'react';
import { AlertCircle, CheckCircle2, Calendar, ArrowLeft, RefreshCw, Clock, MapPin, Users, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';
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
        <div className="flex min-h-screen items-center justify-center bg-[#F4F7F2] p-4 text-[#08111F]">
            <div className="w-full max-w-lg animate-in overflow-hidden rounded-[28px] border border-[#DCE2D8] bg-white text-center shadow-[0_28px_80px_rgba(8,17,31,0.12)] zoom-in duration-300">
                <div className="h-2 bg-[#B7F34A]" />
                <div className="p-7 sm:p-10">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#B9E5D9] bg-[#E8F8F3] text-[#087A68]">
                    <CheckCircle2 size={34} />
                </div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#087A68]">Booking confirmed</p>
                <h2 className="mb-2 text-2xl font-black tracking-[-0.035em] sm:text-3xl">Your place is reserved</h2>
                <p className="mb-7 text-[#52606D]">
                    We've confirmed <strong>{bookingForm.kidName || bookingForm.parentName}'s</strong> spot for <br />
                    <span className="text-[#08111F] font-semibold">{template?.title}</span>
                </p>
                <div className="mb-6 rounded-2xl border border-[#DCE2D8] bg-[#F7F9F5] p-5 text-left">
                    <p className="text-lg font-black text-[#08111F]">{getWorkshopDayName(selectedSlot?.dateStr || '')}</p>
                    <p className="mt-0.5 text-sm text-[#52606D]">{formatWorkshopDate(selectedSlot?.dateStr || '', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <div className="mt-4 flex items-center gap-2 border-t border-[#DCE2D8] pt-4 text-sm font-bold text-[#087A68]"><Clock size={16} /> {selectedSlot?.startTime}–{selectedSlot?.endTime}</div>
                </div>
                <div className="mb-6 flex items-start gap-2 rounded-xl bg-[#FFF8E5] p-3 text-left text-xs leading-5 text-[#795716]"><ShieldCheck className="mt-0.5 shrink-0" size={16} /><span>Keep this page for your reference. The workshop team can contact you on WhatsApp if any practical detail changes.</span></div>
                <button onClick={() => window.location.reload()} className="min-h-11 w-full rounded-xl bg-[#08111F] px-4 font-bold text-white transition-colors hover:bg-[#14233A]">Book another session</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F4F7F2] pb-14 font-sans text-[#08111F]" style={{ backgroundImage: 'radial-gradient(circle at 16% 10%, rgba(183,243,74,0.18), transparent 24rem), linear-gradient(rgba(8,17,31,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(8,17,31,0.035) 1px, transparent 1px)', backgroundSize: 'auto, 32px 32px, 32px 32px' }}>
            <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
                <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#08111F] text-[#B7F34A]"><Sparkles size={17} /></span><span className="text-sm font-black tracking-[-0.02em]">Workshop invitation</span></div>
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#617065]"><ShieldCheck size={14} /> Secure booking by Edufy</span>
            </header>

            <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <section className="relative mb-8 overflow-hidden rounded-[30px] bg-[#08111F] text-white shadow-[0_28px_80px_rgba(8,17,31,0.18)]">
                    <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
                        <div className="relative z-10 flex flex-col justify-center p-6 sm:p-9 lg:p-12">
                            <p className="mb-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#B7F34A]">Make · learn · take it home</p>
                            <h1 className="max-w-2xl text-3xl font-black leading-[1.05] tracking-[-0.045em] sm:text-4xl lg:text-5xl">{template?.title}</h1>
                            <p className="mt-5 max-w-xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">{template?.description}</p>
                            <div className="mt-7 flex flex-wrap gap-2 text-xs font-bold text-slate-200">
                                <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2"><Clock size={14} className="text-[#B7F34A]" /> {template?.duration} minutes</span>
                                <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2"><MapPin size={14} className="text-[#55D6BE]" /> In person</span>
                                <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2"><Users size={14} className="text-[#F7C85E]" /> {template?.capacityPerSlot} places</span>
                            </div>
                            {template && <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-slate-400"><Calendar size={15} className="mt-0.5 shrink-0 text-[#55D6BE]" /> {getWorkshopScheduleLabel(template)}</p>}
                        </div>
                        <div className="relative min-h-56 overflow-hidden border-t border-white/10 lg:min-h-[420px] lg:border-l lg:border-t-0">
                            <img src={getWorkshopOgImageUrl(template?.imageUrl)} alt={`${template?.title || 'Workshop'} preview`} className="absolute inset-0 h-full w-full object-cover" onError={event => { event.currentTarget.src = `${window.location.origin}/images/makerlab-tello-python-hero-v1.png`; }} />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#08111F]/70 via-transparent to-transparent lg:bg-gradient-to-r lg:from-[#08111F]/30 lg:to-transparent" />
                        </div>
                    </div>
                </section>

                <div className="mb-7 flex items-center gap-3" aria-label="Booking progress">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${step === 'calendar' ? 'bg-[#08111F] text-[#B7F34A]' : 'bg-[#B7F34A] text-[#08111F]'}`}>{step === 'form' ? <CheckCircle2 size={16} /> : '1'}</span><span className="text-xs font-black text-[#34443A]">Choose a session</span>
                    <span className="h-px flex-1 bg-[#CDD6CC]" />
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${step === 'form' ? 'bg-[#08111F] text-[#B7F34A]' : 'border border-[#CDD6CC] bg-white text-[#7B897F]'}`}>2</span><span className={`text-xs font-black ${step === 'form' ? 'text-[#34443A]' : 'text-[#7B897F]'}`}>Your details</span>
                </div>

                {step === 'calendar' && (
                    <section className="grid animate-in gap-6 fade-in slide-in-from-bottom-4 lg:grid-cols-[0.62fr_1.38fr]">
                        <div className="rounded-[24px] border border-[#DCE2D8] bg-white/85 p-6 shadow-[0_16px_45px_rgba(8,17,31,0.06)] backdrop-blur sm:p-7">
                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E7F8C7] text-[#294507]"><Calendar size={21} /></span>
                            <h2 className="mt-7 text-2xl font-black tracking-[-0.035em]">Pick the day that works for you.</h2>
                            <p className="mt-3 text-sm leading-6 text-[#617065]">Only the workshop's selected recurring days appear here. Choose a time to continue with the reservation.</p>
                            <div className="mt-7 border-t border-[#E3E8E1] pt-5"><p className="text-xs font-bold text-[#617065]">Free reservation</p><p className="mt-1 text-xs leading-5 text-[#859087]">Your place is confirmed when the form is sent. No payment is collected on this page.</p></div>
                        </div>

                        <div className="rounded-[24px] border border-[#DCE2D8] bg-white p-4 shadow-[0_16px_45px_rgba(8,17,31,0.07)] sm:p-6">
                            <div className="mb-5 flex items-end justify-between gap-4 px-1"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#087A68]">Upcoming availability</p><h2 className="mt-1 text-xl font-black tracking-[-0.03em]">Select a date and time</h2></div><span className="rounded-full bg-[#F0F4ED] px-3 py-1.5 text-[10px] font-black text-[#617065]">{availableSlots.length} sessions</span></div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {availableSlots.length === 0 ? (
                                    <div className="col-span-full rounded-2xl border border-dashed border-[#C9D1C7] bg-[#F8FAF7] p-10 text-center text-sm text-[#667085]">No available sessions are scheduled yet. Please check back soon.</div>
                                ) : availableSlots.map(slot => {
                                    const isFull = slot.bookedCount >= slot.capacity;
                                    const spotsLeft = Math.max(0, slot.capacity - slot.bookedCount);
                                    return (
                                        <button key={`${slot.dateStr}-${slot.startTime}`} onClick={() => { setSelectedSlot(slot); setBookingError(''); setStep('form'); }} disabled={isFull} className="group overflow-hidden rounded-2xl border border-[#DCE2D8] bg-[#FBFCFA] text-left transition-all hover:-translate-y-0.5 hover:border-[#20A88D] hover:shadow-[0_14px_28px_rgba(8,17,31,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20A88D]/50 disabled:cursor-not-allowed disabled:opacity-55">
                                            <div className="flex min-h-36">
                                                <div className="flex w-[6.5rem] shrink-0 flex-col justify-between bg-[#E7F8C7] p-4 text-[#1F3508]">
                                                    <span className="text-[11px] font-black uppercase tracking-[0.12em]">{getWorkshopDayName(slot.dateStr)}</span>
                                                    <span><strong className="block text-4xl font-black leading-none">{formatWorkshopDate(slot.dateStr, { day: 'numeric' })}</strong><span className="mt-1 block text-xs font-bold">{formatWorkshopDate(slot.dateStr, { month: 'short' })}</span></span>
                                                </div>
                                                <div className="flex flex-1 flex-col justify-between p-4">
                                                    <div className="flex items-start justify-between gap-2"><span className="text-2xl font-black tracking-[-0.03em] text-[#08111F]">{slot.startTime}</span><ArrowRight className="text-[#20A88D] transition-transform group-hover:translate-x-1" size={18} /></div>
                                                    <div><p className="text-xs font-bold text-[#52606D]">Until {slot.endTime}</p><p className={`mt-2 text-[10px] font-black uppercase tracking-[0.1em] ${isFull ? 'text-[#BE123C]' : 'text-[#087A68]'}`}>{isFull ? 'Session full' : `${spotsLeft} ${spotsLeft === 1 ? 'place' : 'places'} left`}</p></div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                )}

                {step === 'form' && (
                    <section className="animate-in fade-in slide-in-from-right-4">
                        <button onClick={() => { setBookingError(''); setStep('calendar'); }} className="mb-5 flex items-center gap-2 rounded-lg px-1 py-2 text-sm font-bold text-[#52606D] transition-colors hover:text-[#08111F]"><ArrowLeft size={16} /> Choose a different session</button>

                        <div className="grid overflow-hidden rounded-[26px] border border-[#DCE2D8] bg-white shadow-[0_20px_60px_rgba(8,17,31,0.09)] lg:grid-cols-[19rem_1fr]">
                            <aside className="bg-[#08111F] p-6 text-white sm:p-8">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#B7F34A]">Your selected session</p>
                                <p className="mt-7 text-2xl font-black tracking-[-0.035em]">{getWorkshopDayName(selectedSlot?.dateStr || '')}</p>
                                <p className="mt-1 text-sm text-slate-400">{formatWorkshopDate(selectedSlot?.dateStr || '', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                <div className="mt-7 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4"><Clock className="text-[#55D6BE]" size={19} /><div><p className="text-lg font-black">{selectedSlot?.startTime}–{selectedSlot?.endTime}</p><p className="mt-0.5 text-xs text-slate-400">{template?.duration} minutes</p></div></div>
                                <p className="mt-7 text-sm font-bold">{template?.title}</p>
                                {template?.targetAudience && template.targetAudience !== 'Child' && <span className="mt-3 inline-flex rounded-full border border-[#55D6BE]/30 bg-[#55D6BE]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#83E2D0]">For {template.targetAudience}s</span>}
                            </aside>

                            <div className="p-5 sm:p-8 lg:p-10">
                                <div className="mb-7"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#087A68]">Almost there</p><h2 className="mt-1 text-2xl font-black tracking-[-0.035em]">Who should we reserve this for?</h2><p className="mt-2 text-sm leading-6 text-[#667085]">Add the contact details the workshop team should use for this booking.</p></div>
                                <form onSubmit={handleBooking} className="space-y-5">
                                    {(() => {
                                        const config = getFormConfig(template?.targetAudience);
                                        const inputClass = 'min-h-12 w-full rounded-xl border border-[#D8DFD6] bg-[#FBFCFA] p-3 text-[#08111F] outline-none transition-colors focus:border-[#20A88D] focus:ring-4 focus:ring-[#20A88D]/10';
                                        return (
                                            <>
                                                <div className="grid gap-5 sm:grid-cols-2">
                                                    <div><label className="mb-1.5 block text-xs font-bold text-[#52606D]">{config.primary.label}</label><input required autoComplete="name" className={inputClass} value={bookingForm.parentName} onChange={e => setBookingForm({ ...bookingForm, parentName: e.target.value })} placeholder={config.primary.placeholder} /></div>
                                                    <div><label className="mb-1.5 block text-xs font-bold text-[#52606D]">WhatsApp number</label><input required type="tel" inputMode="tel" autoComplete="tel" className={inputClass} value={bookingForm.phone} onChange={e => setBookingForm({ ...bookingForm, phone: e.target.value })} placeholder="06..." /></div>
                                                </div>
                                                <div className={`grid gap-5 ${config.numeric ? 'sm:grid-cols-[1fr_8rem]' : ''}`}>
                                                    <div><label className="mb-1.5 block text-xs font-bold text-[#52606D]">{config.secondary.label}</label><input required={template?.targetAudience !== 'Professional'} className={inputClass} value={bookingForm.kidName} onChange={e => setBookingForm({ ...bookingForm, kidName: e.target.value })} placeholder={config.secondary.placeholder} /></div>
                                                    {config.numeric && <div><label className="mb-1.5 block text-xs font-bold text-[#52606D]">{config.numeric.label}</label><input required type="number" min={1} max={99} inputMode="numeric" className={inputClass} value={bookingForm.kidAge} onChange={e => setBookingForm({ ...bookingForm, kidAge: e.target.value })} placeholder={config.numeric.placeholder} /></div>}
                                                </div>
                                                <div><label className="mb-1.5 block text-xs font-bold text-[#52606D]">{config.notes.label}</label><textarea className={`${inputClass} h-24 resize-none`} value={bookingForm.kidInterests} onChange={e => setBookingForm({ ...bookingForm, kidInterests: e.target.value })} placeholder={config.notes.placeholder} /></div>
                                            </>
                                        );
                                    })()}

                                    {bookingError && <div role="alert" className="flex items-start gap-3 rounded-xl border border-[#FECDD3] bg-[#FFF1F2] p-3 text-sm text-[#9F1239]"><AlertCircle size={18} className="mt-0.5 shrink-0" /><span>{bookingError}</span></div>}
                                    <button disabled={isSubmitting} type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#087A68] px-4 font-black text-white transition-colors hover:bg-[#066356] disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting ? <RefreshCw className="h-5 w-5 animate-spin" /> : <>Confirm free booking <ArrowRight size={17} /></>}</button>
                                    <p className="text-center text-xs leading-5 text-[#667085]">Your number is used only for this booking and practical workshop updates.</p>
                                </form>
                            </div>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
};
