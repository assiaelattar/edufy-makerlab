import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import {
    AlertCircle,
    ArrowRight,
    Briefcase,
    CalendarDays,
    CheckCircle2,
    GraduationCap,
    Loader2,
    RefreshCw,
    ShieldCheck
} from 'lucide-react';
import { db } from '../services/firebase';
import { Program } from '../types';
import { Logo } from '../components/Logo';
import { getProgramReadiness } from '../utils/program-readiness';

const emptyForm = {
    studentName: '',
    birthDate: '',
    school: '',
    parentName: '',
    parentPhone: '',
    email: '',
    selectedPack: '',
    selectedSlot: '',
    selectedGradeId: '',
    selectedCampSessionId: '',
    selectedCampShiftId: '',
    selectedCampWeekId: '',
    paymentPlan: '',
    paymentMethod: '',
    comments: ''
};

const fieldClass = 'min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-[#08111F] outline-none transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:cursor-not-allowed disabled:bg-slate-100';
const labelClass = 'mb-1.5 block text-sm font-bold text-slate-700';
const sectionTitleClass = 'flex items-center gap-2 border-b border-slate-200 pb-3 text-sm font-black text-[#08111F]';
const optionClass = 'flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-teal-400 has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-500/30';

export const PublicEnrollmentView = () => {
    const [loading, setLoading] = useState(true);
    const [program, setProgram] = useState<Program | null>(null);
    const [settings, setSettings] = useState<any>(null);
    const [submitted, setSubmitted] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [submitError, setSubmitError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState(emptyForm);

    const selectedPack = program?.packs.find(pack => pack.name === formData.selectedPack);
    const selectedCampSession = program?.campSetup?.sessions.find(session => session.id === formData.selectedCampSessionId);
    const selectedModuleIds = useMemo(() => {
        if (!selectedCampSession || !selectedPack) return [];
        if ((selectedPack.includedModuleCount || 1) >= 2) return selectedCampSession.weeks.map(week => week.id);
        return formData.selectedCampWeekId ? [formData.selectedCampWeekId] : [];
    }, [formData.selectedCampWeekId, selectedCampSession, selectedPack]);
    const selectedCampGroups = useMemo(() => {
        const grade = program?.grades.find(item => item.id === formData.selectedGradeId);
        return (grade?.groups || []).filter(group =>
            group.campSessionId === formData.selectedCampSessionId
            && group.campShiftId === formData.selectedCampShiftId
            && selectedModuleIds.includes(group.campWeekId || '')
        );
    }, [formData.selectedCampSessionId, formData.selectedCampShiftId, formData.selectedGradeId, program, selectedModuleIds]);

    useEffect(() => {
        const programId = new URLSearchParams(window.location.search).get('program');

        if (!programId || !db) {
            setLoading(false);
            return;
        }

        getDoc(doc(db, 'programs', programId))
            .then(snapshot => {
                if (!snapshot.exists()) return;
                const loadedProgram = { id: snapshot.id, ...snapshot.data() } as Program;
                if (!getProgramReadiness(loadedProgram).isReady) {
                    setLoadError('Enrollment is not currently open for this program. Ask the academy for an updated link.');
                    return;
                }
                setProgram(loadedProgram);
            })
            .catch(error => {
                console.error('Error fetching program', error);
                setLoadError('We could not load this enrollment form. Please check your connection and try again.');
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!db) return;

        getDoc(doc(db, 'settings', 'global'))
            .then(snapshot => {
                if (snapshot.exists()) setSettings(snapshot.data());
            })
            .catch(error => console.error('Error fetching public enrollment settings', error));
    }, []);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = event.target;
        setFormData(current => ({
            ...current,
            [name]: value,
            ...(['selectedPack', 'selectedCampSessionId'].includes(name) ? { selectedCampWeekId: '' } : {})
        }));
        if (submitError) setSubmitError('');
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!db || !program || isSubmitting) return;

        setSubmitError('');
        setIsSubmitting(true);

        try {
            const isAdult = program.targetAudience === 'adults';

            await addDoc(collection(db, 'leads'), {
                organizationId: program.organizationId,
                name: formData.studentName,
                parentName: isAdult ? formData.studentName : formData.parentName,
                phone: formData.parentPhone,
                email: formData.email,
                source: 'Kiosk Form',
                status: 'new',
                interests: [program.name],
                programId: program.id,
                selectedPack: formData.selectedPack,
                selectedSlot: selectedCampGroups[0]?.name || formData.selectedSlot,
                selectedGradeId: formData.selectedGradeId || null,
                selectedGroupId: selectedCampGroups[0]?.id || null,
                secondGroupId: selectedCampGroups[1]?.id || null,
                campSessionId: formData.selectedCampSessionId || null,
                campShiftId: formData.selectedCampShiftId || null,
                moduleIds: selectedModuleIds,
                preferredPaymentTerm: formData.paymentPlan,
                paymentMethod: formData.paymentMethod,
                notes: [
                    `Kiosk Enrollment Request for ${program.name}`,
                    `Pack: ${formData.selectedPack}`,
                    `Payment: ${formData.paymentPlan}`,
                    `Slot: ${selectedCampGroups.map(group => group.name).join(' + ') || formData.selectedSlot}`,
                    `School: ${formData.school}`,
                    `DOB: ${formData.birthDate}`,
                    `Comments: ${formData.comments}`
                ],
                createdAt: serverTimestamp()
            });

            setSubmitted(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            console.error('Error submitting public enrollment form', error);
            setSubmitError('We could not submit the form. Please check your connection and try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F7F1E4] p-6 text-[#08111F]" role="status">
                <div className="text-center">
                    <Loader2 className="mx-auto animate-spin text-teal-600" size={28} />
                    <p className="mt-3 text-sm font-bold">Preparing your enrollment form</p>
                </div>
            </div>
        );
    }

    if (!program) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F7F1E4] p-6">
                <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                        <AlertCircle size={22} />
                    </div>
                    <h1 className="mt-4 text-xl font-black text-[#08111F]">Enrollment form unavailable</h1>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                        {loadError || 'This program link is missing or no longer available. Ask the academy for an updated enrollment link.'}
                    </p>
                    {loadError && (
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#08111F] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#0F1B2D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                        >
                            <RefreshCw size={16} /> Try again
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const isAdult = program.targetAudience === 'adults';
    const audienceLabel = isAdult ? 'Maker Pro application' : 'SparkQuest enrollment';
    const audienceCopy = isAdult
        ? 'Share your contact details and cohort preferences. The academy team will follow up to confirm your place.'
        : 'Tell us about the learner and preferred schedule. The academy team will follow up with the guardian.';
    const AudienceIcon = isAdult ? Briefcase : GraduationCap;
    const academyName = settings?.academyName || 'MakerLab Academy';
    const availableSlots = (program.grades || [])
        .flatMap(grade => (grade.groups || []).map(group => `${group.day} at ${group.time}`))
        .filter((slot, index, allSlots) => allSlots.indexOf(slot) === index);

    if (submitted) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#08111F] p-4">
                <div className="w-full max-w-md rounded-lg border border-teal-300/20 bg-[#F7F1E4] p-7 text-center shadow-2xl">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                        <CheckCircle2 size={29} />
                    </div>
                    <p className="mt-5 text-[11px] font-black uppercase text-teal-700">Request received</p>
                    <h1 className="mt-1 text-2xl font-black text-[#08111F]">Your next step is with us</h1>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                        Thank you for registering for <strong className="text-[#08111F]">{program.name}</strong>. The {academyName} team will contact you to confirm enrollment.
                    </p>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="mt-6 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#08111F] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#0F1B2D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    >
                        Start another form <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F7F1E4] text-[#08111F] selection:bg-teal-200">
            <header className="border-b border-white/10 bg-[#08111F] text-white">
                <div className="mx-auto grid max-w-6xl gap-7 px-4 py-7 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center lg:py-9">
                    <div className="min-w-0">
                        <div className="mb-6 flex flex-wrap items-center gap-3">
                            {program.partnerLogoUrl && (
                                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg border border-white/15 bg-white p-1.5" title={program.partnerName}>
                                    <img
                                        src={program.partnerLogoUrl}
                                        alt={program.partnerName || 'Program partner'}
                                        className="h-full w-full object-contain"
                                        onError={event => { event.currentTarget.style.display = 'none'; }}
                                    />
                                </div>
                            )}
                            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg border border-white/15 bg-white p-1.5">
                                {settings?.logoUrl ? (
                                    <img src={settings.logoUrl} alt={academyName} className="h-full w-full object-contain" />
                                ) : (
                                    <Logo className="h-7 w-7 text-teal-600" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-black">{program.partnerName ? `${program.partnerName} x ${academyName}` : academyName}</p>
                                <p className="mt-0.5 text-xs text-slate-400">Secure public enrollment</p>
                            </div>
                        </div>

                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-300/25 bg-teal-300/10 px-3 py-1.5 text-xs font-bold text-teal-200">
                            <AudienceIcon size={15} /> {audienceLabel}
                        </div>
                        <h1 className="max-w-3xl text-3xl font-black text-white sm:text-4xl">{program.name}</h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{audienceCopy}</p>
                    </div>

                    {program.thumbnailUrl ? (
                        <img
                            src={program.thumbnailUrl}
                            alt={`${program.name} program`}
                            className="aspect-[16/10] w-full rounded-lg border border-white/10 object-cover"
                        />
                    ) : (
                        <div className="flex min-h-36 items-center justify-center rounded-lg border border-white/10 bg-[#0F1B2D] text-teal-300">
                            <AudienceIcon size={40} />
                        </div>
                    )}
                </div>
            </header>

            <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start lg:py-8">
                <aside className="space-y-5 lg:sticky lg:top-6">
                    <div>
                        <p className="text-[11px] font-black uppercase text-teal-700">Before you begin</p>
                        <h2 className="mt-1 text-lg font-black">A few details, then we take care of the rest.</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">Complete the form once. Your request goes directly to the program team for follow-up.</p>
                    </div>
                    <div className="space-y-3 border-t border-slate-300 pt-4">
                        <div className="flex items-start gap-3">
                            <ShieldCheck className="mt-0.5 shrink-0 text-teal-700" size={18} />
                            <div>
                                <p className="text-sm font-bold">Scoped to this program</p>
                                <p className="mt-0.5 text-xs leading-5 text-slate-500">Your request is sent only to the academy running {program.name}.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <CalendarDays className="mt-0.5 shrink-0 text-amber-700" size={18} />
                            <div>
                                <p className="text-sm font-bold">Schedule confirmed next</p>
                                <p className="mt-0.5 text-xs leading-5 text-slate-500">A preference is helpful; the team confirms final availability with you.</p>
                            </div>
                        </div>
                    </div>
                </aside>

                <form
                    onSubmit={handleSubmit}
                    className="rounded-lg border border-slate-200 bg-white shadow-sm"
                    aria-busy={isSubmitting}
                >
                    <div className="border-b border-slate-200 p-5 sm:p-6">
                        <h2 className="text-xl font-black">{isAdult ? 'Participant details' : 'Learner and guardian details'}</h2>
                        <p className="mt-1 text-sm leading-6 text-slate-500">Fields marked required must be completed before submitting.</p>
                    </div>

                    <div className="space-y-7 p-5 sm:p-6">
                        <section className="space-y-4">
                            <h3 className={sectionTitleClass}><span className="text-teal-700">01</span> Participant information</h3>
                            <div>
                                <label htmlFor="studentName" className={labelClass}>Full name</label>
                                <input id="studentName" required autoComplete="name" name="studentName" value={formData.studentName} onChange={handleChange} className={fieldClass} placeholder="Participant full name" />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="birthDate" className={labelClass}>Date of birth</label>
                                    <input id="birthDate" required type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} className={fieldClass} />
                                </div>
                                <div>
                                    <label htmlFor="school" className={labelClass}>{isAdult ? 'Profession' : 'School'}</label>
                                    <input id="school" name="school" value={formData.school} onChange={handleChange} className={fieldClass} placeholder={isAdult ? 'Current profession' : 'Current school'} />
                                </div>
                            </div>
                            {isAdult && (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="parentPhone" className={labelClass}>Phone number</label>
                                        <input id="parentPhone" required type="tel" inputMode="tel" autoComplete="tel" name="parentPhone" value={formData.parentPhone} onChange={handleChange} className={fieldClass} placeholder="+212 6..." />
                                    </div>
                                    <div>
                                        <label htmlFor="email" className={labelClass}>Email</label>
                                        <input id="email" required type="email" autoComplete="email" name="email" value={formData.email} onChange={handleChange} className={fieldClass} placeholder="name@example.com" />
                                    </div>
                                </div>
                            )}
                        </section>

                        {!isAdult && (
                            <section className="space-y-4">
                                <h3 className={sectionTitleClass}><span className="text-teal-700">02</span> Parent or guardian</h3>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="parentName" className={labelClass}>Guardian name</label>
                                        <input id="parentName" required autoComplete="name" name="parentName" value={formData.parentName} onChange={handleChange} className={fieldClass} />
                                    </div>
                                    <div>
                                        <label htmlFor="parentPhone" className={labelClass}>WhatsApp number</label>
                                        <input id="parentPhone" required type="tel" inputMode="tel" autoComplete="tel" name="parentPhone" value={formData.parentPhone} onChange={handleChange} className={fieldClass} placeholder="+212 6..." />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="email" className={labelClass}>Email <span className="font-medium text-slate-400">(optional)</span></label>
                                    <input id="email" type="email" autoComplete="email" name="email" value={formData.email} onChange={handleChange} className={fieldClass} placeholder="name@example.com" />
                                </div>
                            </section>
                        )}

                        <section className="space-y-4">
                            <h3 className={sectionTitleClass}><span className="text-teal-700">{isAdult ? '02' : '03'}</span> Program preferences</h3>
                            <div>
                                <label htmlFor="selectedPack" className={labelClass}>Program pack</label>
                                <select id="selectedPack" required name="selectedPack" value={formData.selectedPack} onChange={handleChange} className={fieldClass}>
                                    <option value="">Choose a pack</option>
                                    {program.packs?.map((pack: any) => <option key={pack.name} value={pack.name}>{pack.name}</option>)}
                                </select>

                                {formData.selectedPack && (() => {
                                    const pack = program.packs?.find((item: any) => item.name === formData.selectedPack);
                                    if (!pack) return null;

                                    const originalPrice = pack.priceAnnual || pack.price || 0;
                                    const promoPrice = Number(pack.promoPrice || 0);
                                    const hasDiscount = Boolean(program.discountAvailable && promoPrice > 0);
                                    const discountedPrice = hasDiscount ? promoPrice : originalPrice;
                                    const discountPercentage = hasDiscount && originalPrice > 0
                                        ? Math.round((1 - (promoPrice / originalPrice)) * 100)
                                        : 0;

                                    return (
                                        <div className="mt-3 flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-end sm:justify-between">
                                            <div>
                                                <p className="text-[10px] font-black uppercase text-amber-800">Estimated tuition</p>
                                                <div className="mt-1 flex flex-wrap items-baseline gap-2">
                                                    {hasDiscount && <span className="text-sm font-medium text-slate-400 line-through">{originalPrice} Dhs</span>}
                                                    <span className="font-mono text-xl font-black text-[#08111F]">{discountedPrice} Dhs</span>
                                                    {discountPercentage > 0 && <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-black text-amber-900">Save {discountPercentage}%</span>}
                                                </div>
                                            </div>
                                            {hasDiscount && program.discountEndDate && (
                                                <p className="text-xs font-bold text-amber-900">Ends {new Date(program.discountEndDate).toLocaleDateString()}</p>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>

                            {program.paymentTerms?.some(term => term && term.trim()) && (
                                <fieldset>
                                    <legend className={labelClass}>Preferred payment plan</legend>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {program.paymentTerms.filter(term => term && term.trim()).map((term, index) => (
                                            <label key={`${term}-${index}`} className={optionClass}>
                                                <input type="radio" name="paymentPlan" value={term} checked={formData.paymentPlan === term} onChange={handleChange} className="accent-teal-600" />
                                                <span>{term}</span>
                                            </label>
                                        ))}
                                    </div>
                                </fieldset>
                            )}

                            <fieldset>
                                <legend className={labelClass}>Payment method</legend>
                                <div className="grid gap-2 sm:grid-cols-3">
                                    {[
                                        { value: 'cash', label: 'Cash' },
                                        { value: 'check', label: 'Check' },
                                        { value: 'card', label: 'Card' }
                                    ].map(method => (
                                        <label key={method.value} className={optionClass}>
                                            <input type="radio" name="paymentMethod" value={method.value} checked={formData.paymentMethod === method.value} onChange={handleChange} className="accent-teal-600" />
                                            <span>{method.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </fieldset>

                            {program.campSetup ? (
                            <fieldset className="space-y-4 rounded-lg border border-teal-200 bg-teal-50/50 p-4">
                                <legend className="px-1 text-sm font-black text-teal-900">Choose your camp place</legend>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="selectedGradeId" className={labelClass}>Age group</label>
                                        <select required id="selectedGradeId" name="selectedGradeId" value={formData.selectedGradeId} onChange={handleChange} className={fieldClass}>
                                            <option value="">Choose an age group</option>
                                            {program.grades.map(grade => <option key={grade.id} value={grade.id}>{grade.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="selectedCampSessionId" className={labelClass}>Session</label>
                                        <select required id="selectedCampSessionId" name="selectedCampSessionId" value={formData.selectedCampSessionId} onChange={handleChange} className={fieldClass}>
                                            <option value="">Choose a session</option>
                                            {program.campSetup.sessions.map(session => <option key={session.id} value={session.id}>{session.name} / {session.startDate} to {session.endDate}</option>)}
                                        </select>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label htmlFor="selectedCampShiftId" className={labelClass}>Shift</label>
                                        <select required id="selectedCampShiftId" name="selectedCampShiftId" value={formData.selectedCampShiftId} onChange={handleChange} className={fieldClass}>
                                            <option value="">Choose a shift</option>
                                            {program.campSetup.shifts.map(shift => <option key={shift.id} value={shift.id}>{shift.label} / {shift.startTime} to {shift.endTime}</option>)}
                                        </select>
                                    </div>
                                </div>
                                {selectedCampSession && selectedPack && (
                                    <div>
                                        <p className={labelClass}>{selectedPack.includedModuleCount === 2 ? 'Weeks included in this pack' : 'Choose one week'}</p>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {selectedCampSession.weeks.map(week => {
                                                const bothWeeks = selectedPack.includedModuleCount === 2;
                                                const checked = bothWeeks || formData.selectedCampWeekId === week.id;
                                                return (
                                                    <label key={week.id} className={`${optionClass} ${bothWeeks ? 'cursor-default' : ''}`}>
                                                        <input required={!bothWeeks} disabled={bothWeeks} type="radio" name="selectedCampWeekId" value={week.id} checked={checked} onChange={handleChange} className="accent-teal-600" />
                                                        <span><span className="block font-black">{week.label}</span><span className="block text-xs font-medium text-slate-500">{week.startDate} to {week.endDate}</span></span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </fieldset>
                            ) : <fieldset>
                                <legend className={labelClass}>Preferred slot</legend>
                                {availableSlots.length > 0 ? (
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {availableSlots.map(slot => (
                                            <label key={slot} className={optionClass}>
                                                <input type="radio" name="selectedSlot" value={slot} checked={formData.selectedSlot === slot} onChange={handleChange} className="accent-teal-600" />
                                                <span className="capitalize">{slot}</span>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <input name="selectedSlot" value={formData.selectedSlot} onChange={handleChange} className={fieldClass} placeholder="For example, Wednesday 15:30" />
                                )}
                            </fieldset>}

                            <div>
                                <label htmlFor="comments" className={labelClass}>Comments or questions <span className="font-medium text-slate-400">(optional)</span></label>
                                <textarea id="comments" name="comments" value={formData.comments} onChange={handleChange} className={fieldClass} rows={3} placeholder={isAdult ? 'Share your goals, level, or preferred cohort.' : 'Share schedule constraints or learning needs.'} />
                            </div>
                        </section>

                        {submitError && (
                            <div role="alert" className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">
                                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                                <span>{submitError}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-teal-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Sending request</> : <>Submit enrollment request <ArrowRight size={18} /></>}
                        </button>
                    </div>
                </form>
            </main>

            <footer className="border-t border-slate-300 px-4 py-5 text-center text-xs font-bold text-slate-500">
                {academyName} / {new Date().getFullYear()}
            </footer>
        </div>
    );
};
