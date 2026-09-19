import React, { useEffect, useMemo, useRef, useState } from 'react';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Banknote,
    Briefcase,
    Check,
    CheckCircle2,
    Copy,
    FileDown,
    FileText,
    GraduationCap,
    Landmark,
    Loader2,
    RefreshCw,
    ShieldCheck
} from 'lucide-react';
import { db } from '../services/firebase';
import type { Program } from '../types';
import { getProgramReadiness } from '../utils/program-readiness';
import { groupScheduleLabel, groupsOverlap, weeklySessionCount } from '../utils/publicProgramSchedule';
import { MakerLabFormHeader } from '../components/public/MakerLabFormHeader';
import '../components/public/makerlab-forms.css';

const emptyForm = {
    studentName: '',
    birthDate: '',
    school: '',
    parentName: '',
    parentPhone: '',
    email: '',
    selectedPack: '',
    selectedSlot: '',
    selectedGroupId: '',
    secondGroupId: '',
    selectedGradeId: '',
    selectedCampSessionId: '',
    selectedCampShiftId: '',
    selectedCampWeekId: '',
    paymentPlan: '',
    paymentMethod: '',
    comments: ''
};

const BANK_TRANSFER_DETAILS = {
    bank: 'CIH Bank',
    accountHolder: 'MakerLab Academy',
    ribDisplay: '230 780 2825423211002900 15',
    ribCopy: '230780282542321100290015'
};

const FORM_STEPS = [
    { label: 'Le participant', shortLabel: 'Participant' },
    { label: 'Pack et séances', shortLabel: 'Séances' },
    { label: 'Règlement', shortLabel: 'Règlement' },
    { label: 'Récapitulatif', shortLabel: 'Résumé' }
];

const fieldClass = 'min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-base text-[#08111F] outline-none transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-orange-600 focus:ring-2 focus:ring-orange-500/20 disabled:cursor-not-allowed disabled:bg-slate-100';
const labelClass = 'mb-1.5 block text-sm font-bold text-slate-700';
const optionClass = 'flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-orange-400 active:bg-orange-50 has-[:checked]:border-orange-600 has-[:checked]:bg-orange-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-orange-500/30';

const escapeHtml = (value: unknown) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const formatMoney = (value: number, currency = 'MAD') => new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
}).format(value || 0);

const getPaymentMethodLabel = (method: string) => ({
    cash: 'Espèces',
    check: 'Chèque',
    virement: 'Virement bancaire'
}[method] || method || 'Non choisi');

const getPublicEnrollmentSubmitError = (error: unknown) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return 'You appear to be offline. Your information was not sent. Reconnect, then try again.';
    }

    const code = typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code || '')
        : '';

    if (code.includes('permission-denied')) {
        return 'The enrollment service could not accept this request. Your information was not sent. Please try again or contact the academy.';
    }

    if (code.includes('unavailable') || code.includes('deadline-exceeded') || code.includes('network-request-failed')) {
        return 'The connection was interrupted before we could confirm your request. Check your connection, then try again.';
    }

    if (code.includes('invalid-argument') || code.includes('failed-precondition')) {
        return 'One of the enrollment details could not be accepted. Review the form and try again.';
    }

    return 'We could not submit the form. Your information was not sent. Please try again.';
};

export const PublicEnrollmentView = () => {
    const [loading, setLoading] = useState(true);
    const [program, setProgram] = useState<Program | null>(null);
    const [settings, setSettings] = useState<any>(null);
    const [submitted, setSubmitted] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [submitError, setSubmitError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expandedSession, setExpandedSession] = useState(1);
    const [secondSessionGradeId, setSecondSessionGradeId] = useState('');
    const [formData, setFormData] = useState(emptyForm);
    const [currentStep, setCurrentStep] = useState(1);
    const [stepError, setStepError] = useState('');
    const [copiedBankField, setCopiedBankField] = useState<'rib' | 'holder' | null>(null);
    const [submissionReference, setSubmissionReference] = useState('');
    const [receiptError, setReceiptError] = useState('');
    const stepHeadingRef = useRef<HTMLHeadingElement>(null);

    const selectedPack = program?.packs.find(pack => pack.name === formData.selectedPack);
    const sessionCount = weeklySessionCount(selectedPack);
    const selectedGrade = program?.grades.find(grade => grade.id === formData.selectedGradeId);
    const firstGroup = selectedGrade?.groups.find(group => group.id === formData.selectedGroupId);
    const secondChoices = [...(selectedGrade?.groups || []), ...(program?.grades.filter(grade => grade.id !== selectedGrade?.id && /diy/i.test(grade.name)).flatMap(grade => grade.groups) || [])];
    const secondGroup = secondChoices.find(group => group.id === formData.secondGroupId);
    const weeklyScheduleLabel = [firstGroup, secondGroup].filter(Boolean).map(group => `${group!.name.trim()} — ${groupScheduleLabel(group!)}`).join(' + ') || formData.selectedSlot;
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
    const selectedPricing = useMemo(() => {
        if (!selectedPack || !program) return { originalPrice: 0, finalPrice: 0, discountAmount: 0, discountPercentage: 0 };

        const originalPrice = Number(selectedPack.priceAnnual || selectedPack.price || selectedPack.priceTrimester || 0);
        const promoPrice = Number(selectedPack.promoPrice || 0);
        const hasDiscount = Boolean(program.discountAvailable && promoPrice > 0 && promoPrice < originalPrice);
        const finalPrice = hasDiscount ? promoPrice : originalPrice;
        const discountAmount = hasDiscount ? originalPrice - promoPrice : 0;
        const discountPercentage = hasDiscount && originalPrice > 0
            ? Math.round((discountAmount / originalPrice) * 10000) / 100
            : 0;

        return { originalPrice, finalPrice, discountAmount, discountPercentage };
    }, [program, selectedPack]);

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
        if (name === 'selectedGradeId') setSecondSessionGradeId('');
        setFormData(current => ({
            ...current,
            [name]: value,
            ...(name === 'selectedGradeId' ? { selectedGroupId: '', secondGroupId: '', selectedSlot: '' } : {}),
            ...(name === 'selectedPack' ? { secondGroupId: '' } : {}),
            ...(['selectedPack', 'selectedCampSessionId'].includes(name) ? { selectedCampWeekId: '' } : {})
        }));
        if (submitError) setSubmitError('');
        if (stepError) setStepError('');
    };

    const focusCurrentStep = () => {
        window.requestAnimationFrame(() => {
            stepHeadingRef.current?.focus({ preventScroll: true });
            stepHeadingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    };

    const getStepValidationError = (step: number) => {
        const adult = program?.targetAudience === 'adults';

        if (step === 1) {
            if (!formData.studentName.trim()) return adult ? 'Indiquez le nom du participant.' : 'Indiquez le nom de votre enfant.';
            if (!formData.birthDate) return 'Indiquez la date de naissance.';
            if (!adult && !formData.parentName.trim()) return 'Indiquez le nom du parent.';
            if (!formData.parentPhone.trim()) return adult ? 'Indiquez votre numéro de téléphone.' : 'Indiquez votre numéro WhatsApp.';
            if (formData.parentPhone.replace(/\D/g, '').length < 8) return 'Indiquez un numéro de téléphone complet.';
            if (adult && !formData.email.trim()) return 'Indiquez votre adresse email.';
            if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email.trim())) return 'Vérifiez votre adresse email.';
        }

        if (step === 2) {
            if (!formData.selectedPack) return 'Choisissez votre pack.';
            if (!program?.campSetup && program?.grades.some(grade => grade.groups.length)) {
                if (!selectedGrade || !firstGroup) return 'Choisissez votre niveau et votre première séance.';
                if (sessionCount > 2) return 'Ce pack nécessite un planning personnalisé. Contactez MakerLab pour le finaliser.';
                if (sessionCount === 2 && !secondGroup) return 'Le pack Innovator comprend deux ateliers : choisissez aussi votre deuxième séance.';
                if (secondGroup && groupsOverlap(firstGroup, secondGroup)) return 'Choisissez deux séances différentes, sans chevauchement.';
            }
            if (program?.campSetup) {
                if (!formData.selectedGradeId) return 'Choose an age group.';
                if (!formData.selectedCampSessionId) return 'Choose a camp session.';
                if (!formData.selectedCampShiftId) return 'Choose a shift.';
                if ((selectedPack?.includedModuleCount || 1) < 2 && !formData.selectedCampWeekId) return 'Choose a camp week.';
            }
        }

        if (step === 3) {
            const hasPaymentPlans = Boolean(program?.paymentTerms?.some(term => term && term.trim()));
            if (hasPaymentPlans && !formData.paymentPlan) return 'Choisissez votre échéancier.';
            if (!formData.paymentMethod) return 'Choisissez votre moyen de règlement.';
        }

        return '';
    };

    const goToStep = (step: number) => {
        setCurrentStep(step);
        setStepError('');
        focusCurrentStep();
    };

    const goForward = () => {
        const error = getStepValidationError(currentStep);
        if (error) {
            setStepError(error);
            return;
        }
        goToStep(Math.min(4, currentStep + 1));
    };

    const copyBankValue = async (field: 'rib' | 'holder', value: string) => {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(value);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = value;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
            }
            setCopiedBankField(field);
            window.setTimeout(() => setCopiedBankField(current => current === field ? null : current), 1800);
        } catch {
            setStepError('Copy is unavailable on this device. Press and hold the account number to copy it.');
        }
    };

    const openPreEnrollmentReceipt = () => {
        if (!program || !submissionReference) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            setReceiptError('Allow pop-ups for this page, then try downloading the receipt again.');
            return;
        }
        printWindow.opener = null;

        setReceiptError('');
        const academyName = settings?.academyName || 'MakerLab Academy';
        const currency = settings?.currency || 'MAD';
        const isAdult = program.targetAudience === 'adults';
        const participantLabel = isAdult ? 'Participant' : 'Learner';
        const scheduleLabel = program.campSetup
            ? [
                selectedCampSession?.name,
                program.campSetup.shifts.find(shift => shift.id === formData.selectedCampShiftId)?.label,
                selectedCampSession?.weeks.filter(week => selectedModuleIds.includes(week.id)).map(week => week.label).join(' + ')
            ].filter(Boolean).join(' / ')
            : weeklyScheduleLabel || 'To be confirmed';
        const receiptLogo = settings?.documentConfig?.logoUrl || settings?.logoUrl || `${window.location.origin}/images/logo.png`;
        const paymentInstruction = formData.paymentMethod === 'virement'
            ? 'Transfer payment to the account below. Enrollment is confirmed only after the academy verifies the transfer.'
            : formData.paymentMethod === 'check'
                ? 'Bring the check to the academy. Enrollment is confirmed after the check is received and validated.'
                : 'Pay at the academy. Enrollment is confirmed after the cash payment is received.';
        const bankSection = formData.paymentMethod === 'virement' ? `
            <section class="bank-card">
                <p class="eyebrow">Virement bancaire</p>
                <div class="bank-row"><span>Bank / Banque</span><strong>${escapeHtml(BANK_TRANSFER_DETAILS.bank)}</strong></div>
                <div class="bank-row"><span>Account holder / Titulaire</span><strong>${escapeHtml(BANK_TRANSFER_DETAILS.accountHolder)}</strong></div>
                <div class="bank-row"><span>RIB</span><strong class="rib">${escapeHtml(BANK_TRANSFER_DETAILS.ribDisplay)}</strong></div>
            </section>
        ` : '';

        printWindow.document.write(`
            <!doctype html>
            <html lang="en">
                <head>
                    <meta charset="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                    <title>Pre-enrollment ${escapeHtml(submissionReference)}</title>
                    <style>
                        * { box-sizing: border-box; }
                        body { margin: 0; background: #eef3f4; color: #08111f; font-family: Arial, Helvetica, sans-serif; }
                        .sheet { width: min(760px, calc(100% - 32px)); margin: 24px auto; background: white; border: 1px solid #dbe4e7; border-radius: 20px; overflow: hidden; }
                        .header { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 28px 32px; background: #08111f; color: white; }
                        .brand { display: flex; align-items: center; gap: 14px; min-width: 0; }
                        .logo { width: 58px; height: 58px; border-radius: 14px; padding: 5px; background: white; object-fit: contain; }
                        .academy { margin: 0; font-size: 19px; font-weight: 800; }
                        .document-name { margin: 4px 0 0; color: #a7f3d0; font-size: 12px; font-weight: 700; }
                        .reference { text-align: right; font: 700 12px/1.5 ui-monospace, SFMono-Regular, Consolas, monospace; color: #cbd5e1; }
                        .body { padding: 30px 32px 34px; }
                        .status { display: inline-flex; padding: 7px 11px; border-radius: 999px; background: #fff7dd; color: #8a4b08; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }
                        h1 { margin: 14px 0 8px; font-size: 28px; line-height: 1.15; }
                        .notice { margin: 0 0 26px; color: #52606d; font-size: 13px; line-height: 1.6; }
                        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: #dbe4e7; border: 1px solid #dbe4e7; border-radius: 14px; overflow: hidden; }
                        .item { min-height: 82px; padding: 15px; background: white; }
                        .item span, .bank-row span { display: block; color: #667085; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; }
                        .item strong { display: block; margin-top: 6px; font-size: 14px; line-height: 1.4; }
                        .bank-card { margin-top: 22px; border: 1px solid #99f6e4; border-radius: 14px; background: #f0fdfa; padding: 18px; }
                        .eyebrow { margin: 0 0 12px; color: #0f766e; font-size: 11px; font-weight: 900; text-transform: uppercase; }
                        .bank-row { display: flex; justify-content: space-between; gap: 20px; padding: 9px 0; border-top: 1px solid #ccfbf1; }
                        .bank-row strong { text-align: right; font-size: 13px; }
                        .rib { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
                        .next { margin-top: 22px; padding: 18px; border-left: 4px solid #d97706; background: #fffbeb; font-size: 13px; line-height: 1.6; }
                        .footer { padding: 18px 32px 26px; color: #667085; font-size: 10px; line-height: 1.6; text-align: center; }
                        @media print {
                            @page { size: A4; margin: 14mm; }
                            body { background: white; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                            .sheet { width: 100%; margin: 0; border: 0; border-radius: 0; }
                        }
                        @media (max-width: 580px) {
                            .sheet { width: 100%; margin: 0; border: 0; border-radius: 0; }
                            .header { align-items: flex-start; padding: 22px 20px; }
                            .logo { width: 48px; height: 48px; }
                            .reference { font-size: 10px; }
                            .body { padding: 24px 20px; }
                            .grid { grid-template-columns: 1fr; }
                            .bank-row { display: block; }
                            .bank-row strong { display: block; margin-top: 5px; text-align: left; word-break: break-word; }
                        }
                    </style>
                </head>
                <body>
                    <article class="sheet">
                        <header class="header">
                            <div class="brand">
                                <img class="logo" src="${escapeHtml(receiptLogo)}" alt="${escapeHtml(academyName)}" />
                                <div><p class="academy">${escapeHtml(academyName)}</p><p class="document-name">Pre-enrollment / Préinscription</p></div>
                            </div>
                            <div class="reference">REF<br />${escapeHtml(submissionReference.toUpperCase())}</div>
                        </header>
                        <div class="body">
                            <span class="status">Pending verification / En attente</span>
                            <h1>Pre-enrollment receipt</h1>
                            <p class="notice">This document confirms that the academy received the registration request. It is not proof of payment and does not confirm a place in the program.</p>
                            <div class="grid">
                                <div class="item"><span>${participantLabel}</span><strong>${escapeHtml(formData.studentName)}</strong></div>
                                <div class="item"><span>${isAdult ? 'Contact' : 'Parent / Guardian'}</span><strong>${escapeHtml(isAdult ? formData.parentPhone : `${formData.parentName} · ${formData.parentPhone}`)}</strong></div>
                                <div class="item"><span>Programme</span><strong>${escapeHtml(program.name)}</strong></div>
                                <div class="item"><span>Pack</span><strong>${escapeHtml(formData.selectedPack)}</strong></div>
                                <div class="item"><span>Séances choisies</span><strong>${escapeHtml(scheduleLabel)}</strong></div>
                                <div class="item"><span>Règlement</span><strong>${escapeHtml(getPaymentMethodLabel(formData.paymentMethod))}</strong></div>
                                <div class="item"><span>Preferred plan</span><strong>${escapeHtml(formData.paymentPlan || 'To be agreed')}</strong></div>
                                <div class="item"><span>Tarif estimé</span><strong>${escapeHtml(formatMoney(selectedPricing.finalPrice, currency))}</strong></div>
                            </div>
                            ${bankSection}
                            <div class="next"><strong>Next step / Prochaine étape</strong><br />${escapeHtml(paymentInstruction)}</div>
                        </div>
                        <footer class="footer">Generated ${escapeHtml(new Date().toLocaleString())}. ${escapeHtml(settings?.receiptContact || '')}</footer>
                    </article>
                    <script>window.addEventListener('load', function () { window.print(); });</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (currentStep < 4) {
            goForward();
            return;
        }
        if (!db || !program || isSubmitting) return;

        for (const step of [1, 2, 3]) {
            const validationError = getStepValidationError(step);
            if (validationError) {
                setCurrentStep(step);
                setStepError(validationError);
                focusCurrentStep();
                return;
            }
        }

        setSubmitError('');
        setIsSubmitting(true);

        try {
            if (!program.organizationId) {
                throw Object.assign(new Error('Program organization is missing.'), { code: 'failed-precondition' });
            }

            const isAdult = program.targetAudience === 'adults';

            const leadReference = await addDoc(collection(db, 'leads'), {
                organizationId: program.organizationId,
                name: formData.studentName.trim(),
                parentName: (isAdult ? formData.studentName : formData.parentName).trim(),
                phone: formData.parentPhone.trim(),
                email: formData.email.trim(),
                source: 'Kiosk Form',
                status: 'new',
                interests: [program.name],
                programId: program.id,
                selectedPack: formData.selectedPack,
                selectedSlot: selectedCampGroups.map(group => group.name).join(' + ') || weeklyScheduleLabel,
                selectedGradeId: formData.selectedGradeId || null,
                selectedGroupId: selectedCampGroups[0]?.id || firstGroup?.id || null,
                secondGroupId: selectedCampGroups[1]?.id || secondGroup?.id || null,
                campSessionId: formData.selectedCampSessionId || null,
                campShiftId: formData.selectedCampShiftId || null,
                moduleIds: selectedModuleIds,
                preferredPaymentTerm: formData.paymentPlan,
                paymentMethod: formData.paymentMethod,
                notes: [
                    `Kiosk Enrollment Request for ${program.name}`,
                    `Pack: ${formData.selectedPack}`,
                    `Payment: ${formData.paymentPlan}`,
                    `Slot: ${selectedCampGroups.map(group => group.name).join(' + ') || weeklyScheduleLabel}`,
                    `School: ${formData.school}`,
                    `DOB: ${formData.birthDate}`,
                    `Comments: ${formData.comments}`
                ],
                createdAt: serverTimestamp()
            });

            setSubmissionReference(leadReference.id);
            setSubmitted(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            console.error('Error submitting public enrollment form', error);
            setSubmitError(getPublicEnrollmentSubmitError(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F7F1E4] p-6 text-[#08111F]" role="status">
                <div className="text-center">
                    <Loader2 className="mx-auto animate-spin text-orange-600" size={28} />
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
                            className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#08111F] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#0F1B2D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
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
    const publicLogoUrl = settings?.documentConfig?.logoUrl || settings?.logoUrl || '/images/logo.png';
    const availableSlots = (program.grades || [])
        .flatMap(grade => (grade.groups || []).map(group => `${group.day} at ${group.time}`))
        .filter((slot, index, allSlots) => allSlots.indexOf(slot) === index);
    const selectedScheduleLabel = program.campSetup
        ? [
            selectedCampSession?.name,
            program.campSetup.shifts.find(shift => shift.id === formData.selectedCampShiftId)?.label,
            selectedCampSession?.weeks.filter(week => selectedModuleIds.includes(week.id)).map(week => week.label).join(' + ')
        ].filter(Boolean).join(' / ')
        : weeklyScheduleLabel || 'Schedule to be confirmed';
    const postSubmissionMessage = formData.paymentMethod === 'virement'
        ? 'Complete the bank transfer and send the payment proof to the academy. Your place is confirmed only after verification.'
        : formData.paymentMethod === 'check'
            ? 'Bring the check to the academy. Your place is confirmed after the team receives and validates it.'
            : 'Pay in cash at the academy. Your place is confirmed after the payment is received.';

    if (submitted) {
        return (
            <div className="min-h-dvh bg-[#EAF0F1] px-4 py-6 text-[#08111F] sm:px-6 sm:py-10">
                <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(8,17,31,0.14)]">
                    <div className="bg-[#08111F] px-5 py-5 text-white sm:px-8">
                        <div className="flex items-center gap-3">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5">
                                <img src={publicLogoUrl} alt={`${academyName} logo`} className="h-full w-full object-contain" onError={event => { event.currentTarget.src = '/images/logo.png'; }} />
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-base font-black">{academyName}</p>
                                <p className="text-xs font-semibold text-orange-200">Pre-enrollment / Préinscription</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-5 sm:p-8">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
                            <CheckCircle2 size={29} />
                        </div>
                        <p className="mt-5 text-[11px] font-black uppercase tracking-[0.12em] text-orange-700">Request received</p>
                        <h1 className="mt-1 text-2xl font-black sm:text-3xl">Your pre-enrollment is recorded</h1>
                        <p className="mt-3 text-base leading-7 text-slate-600">
                            The request for <strong className="text-[#08111F]">{program.name}</strong> was received. It is still pending and does not reserve a place until payment is validated.
                        </p>

                        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                            <div className="flex items-start gap-3">
                                <ShieldCheck className="mt-0.5 shrink-0 text-amber-700" size={20} />
                                <div>
                                    <p className="font-black text-amber-950">En attente de vérification du règlement</p>
                                    <p className="mt-1 text-sm leading-6 text-amber-900">{postSubmissionMessage}</p>
                                </div>
                            </div>
                        </div>

                        {formData.paymentMethod === 'virement' && (
                            <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                                <div className="flex items-center gap-2 text-orange-900"><Landmark size={19} /><h2 className="font-black">Virement bancaire CIH</h2></div>
                                <div className="mt-4 space-y-3">
                                    <div className="rounded-xl border border-orange-200 bg-white p-3">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">RIB</p>
                                        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <code className="break-all text-sm font-black text-[#08111F]">{BANK_TRANSFER_DETAILS.ribDisplay}</code>
                                            <button type="button" onClick={() => copyBankValue('rib', BANK_TRANSFER_DETAILS.ribCopy)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-orange-300 bg-orange-50 px-3 text-sm font-black text-orange-800 transition-colors hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
                                                {copiedBankField === 'rib' ? <><Check size={16} /> Copié</> : <><Copy size={16} /> Copier le RIB</>}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="rounded-xl border border-orange-200 bg-white p-3"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Banque</p><p className="mt-1 font-bold">{BANK_TRANSFER_DETAILS.bank}</p></div>
                                        <div className="rounded-xl border border-orange-200 bg-white p-3"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Titulaire du compte</p><p className="mt-1 font-bold">{BANK_TRANSFER_DETAILS.accountHolder}</p></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                            <button type="button" onClick={openPreEnrollmentReceipt} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#C64F12] px-4 text-sm font-black text-white transition-colors hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2">
                                <FileDown size={18} /> Télécharger / imprimer le reçu
                            </button>
                            <button type="button" onClick={() => window.location.reload()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
                                Inscrire un autre participant <ArrowRight size={17} />
                            </button>
                        </div>
                        {receiptError && <p role="alert" className="mt-3 text-sm font-bold text-rose-700">{receiptError}</p>}
                        <p className="mt-4 text-center font-mono text-[11px] font-bold text-slate-500">Référence : {submissionReference.toUpperCase()}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`makerlab-public ${import.meta.env.DEV && new URLSearchParams(window.location.search).get('ui') === 'education-v1' ? 'edu-public-enrollment-v1' : ''}`} data-testid={import.meta.env.DEV && new URLSearchParams(window.location.search).get('ui') === 'education-v1' ? 'education-public-enrollment-v1' : undefined}>
            <MakerLabFormHeader label="Préinscription" />
            <div className="ml-enroll-intro">
                <p>Une année pour imaginer et créer</p>
                <h1>{program.name}</h1>
                <small>Quelques étapes pour rejoindre MakerLab.</small>
                {program.partnerName && <small>Avec {program.partnerName}</small>}
            </div>
            <main className="ml-enrollment-main">
                <form
                    onSubmit={handleSubmit}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(8,17,31,0.09)]"
                    aria-busy={isSubmitting}
                    noValidate
                >
                    <div className="border-b border-slate-200 bg-slate-50/80 p-4 sm:p-6">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-orange-700">Étape {currentStep} / {FORM_STEPS.length}</p>
                                <h2 ref={stepHeadingRef} tabIndex={-1} className="mt-1 text-xl font-black outline-none sm:text-2xl">{FORM_STEPS[currentStep - 1].label}</h2>
                            </div>
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-500">{Math.round((currentStep / FORM_STEPS.length) * 100)}%</span>
                        </div>
                        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200" aria-hidden="true"><div className="h-full rounded-full bg-[#C64F12] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${(currentStep / FORM_STEPS.length) * 100}%` }} /></div>
                        <div className="mt-3 hidden grid-cols-4 gap-2 sm:grid">
                            {FORM_STEPS.map((step, index) => <span key={step.label} className={`truncate text-center text-[10px] font-bold ${currentStep === index + 1 ? 'text-orange-700' : currentStep > index + 1 ? 'text-slate-600' : 'text-slate-400'}`}>{step.shortLabel}</span>)}
                        </div>
                    </div>

                    <div className="space-y-6 p-4 sm:p-6">
                        {currentStep === 1 && <>
                        <section className="space-y-4">
                            <div><h3 className="text-lg font-black">{isAdult ? 'Le participant' : 'Votre enfant'}</h3></div>
                            <div>
                                <label htmlFor="studentName" className={labelClass}>Nom complet</label>
                                <input id="studentName" required autoComplete="name" name="studentName" value={formData.studentName} onChange={handleChange} className={fieldClass} placeholder="Prénom et nom" />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="birthDate" className={labelClass}>Date de naissance</label>
                                    <input id="birthDate" required type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} className={fieldClass} />
                                </div>

                            </div>
                            {isAdult && (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="parentPhone" className={labelClass}>Numéro de téléphone</label>
                                        <input id="parentPhone" required type="tel" inputMode="tel" autoComplete="tel" name="parentPhone" value={formData.parentPhone} onChange={handleChange} className={fieldClass} placeholder="+212 6..." />
                                    </div>
                                    <div>
                                        <label htmlFor="email" className={labelClass}>Email</label>
                                        <input id="email" required type="email" autoComplete="email" name="email" value={formData.email} onChange={handleChange} className={fieldClass} placeholder="name@example.com" />
                                    </div>
                                </div>
                            )}
                        </section></>}

                        {currentStep === 3 && (
                            <section className="space-y-6">
                                <div><h3 className="text-lg font-black">Votre règlement</h3><p className="mt-1 text-sm leading-6 text-slate-500">Indiquez votre moyen de règlement. L’équipe confirme l’inscription après vérification.</p></div>

                                {program.paymentTerms?.some(term => term && term.trim()) && (
                                    <fieldset>
                                        <legend className={labelClass}>Échéancier</legend>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            {program.paymentTerms.filter(term => term && term.trim()).map((term, index) => (
                                                <label key={`${term}-${index}`} className={optionClass}>
                                                    <input type="radio" name="paymentPlan" value={term} checked={formData.paymentPlan === term} onChange={handleChange} className="h-4 w-4 accent-orange-600" />
                                                    <span>{term}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </fieldset>
                                )}

                                <fieldset>
                                    <legend className={labelClass}>Moyen de règlement</legend>
                                    <div className="grid gap-3 sm:grid-cols-3">
                                        {[
                                            { value: 'cash', label: 'Espèces', detail: 'À l’académie', icon: Banknote },
                                            { value: 'check', label: 'Chèque', detail: 'À l’académie', icon: FileText },
                                            { value: 'virement', label: 'Virement', detail: 'Compte CIH', icon: Landmark }
                                        ].map(method => {
                                            const MethodIcon = method.icon;
                                            return (
                                                <label key={method.value} className={`${optionClass} items-start`}>
                                                    <input type="radio" name="paymentMethod" value={method.value} checked={formData.paymentMethod === method.value} onChange={handleChange} className="mt-1 h-4 w-4 shrink-0 accent-orange-600" />
                                                    <span><MethodIcon size={19} className="mb-2 text-orange-700" /><span className="block font-black text-[#08111F]">{method.label}</span><span className="mt-0.5 block text-xs font-medium leading-5 text-slate-500">{method.detail}</span></span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </fieldset>

                                {formData.paymentMethod === 'virement' && (
                                    <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 sm:p-5">
                                        <div className="flex items-center gap-2 text-orange-900"><Landmark size={20} /><h4 className="font-black">Coordonnées bancaires</h4></div>
                                        <p className="mt-2 text-sm leading-6 text-orange-900">Indiquez le nom du participant en référence. L’équipe validera votre règlement.</p>
                                        <div className="mt-4 rounded-xl border border-orange-200 bg-white p-3.5">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">RIB</p>
                                            <div className="mt-1.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <code className="select-all break-all text-sm font-black leading-6 text-[#08111F]">{BANK_TRANSFER_DETAILS.ribDisplay}</code>
                                                <button type="button" onClick={() => copyBankValue('rib', BANK_TRANSFER_DETAILS.ribCopy)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-orange-300 bg-orange-50 px-3 text-sm font-black text-orange-800 transition-colors hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
                                                    {copiedBankField === 'rib' ? <><Check size={16} /> Copié</> : <><Copy size={16} /> Copier le RIB</>}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                            <div className="rounded-xl border border-orange-200 bg-white p-3"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Banque</p><p className="mt-1 font-bold">{BANK_TRANSFER_DETAILS.bank}</p></div>
                                            <div className="rounded-xl border border-orange-200 bg-white p-3"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Titulaire du compte</p><div className="mt-1 flex items-center justify-between gap-2"><p className="font-bold">{BANK_TRANSFER_DETAILS.accountHolder}</p><button type="button" aria-label="Copier le titulaire du compte" onClick={() => copyBankValue('holder', BANK_TRANSFER_DETAILS.accountHolder)} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-orange-700 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">{copiedBankField === 'holder' ? <Check size={17} /> : <Copy size={17} />}</button></div></div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><ShieldCheck className="mt-0.5 shrink-0 text-amber-700" size={19} /><p><strong>Aucun paiement en ligne.</strong> Vous indiquez simplement le moyen de règlement souhaité.</p></div>
                            </section>
                        )}

                        {currentStep === 4 && (
                            <section className="space-y-5">
                                <div><h3 className="text-lg font-black">Vérifiez votre demande</h3><p className="mt-1 text-sm leading-6 text-slate-500">Vos choix seront transmis à l’équipe MakerLab.</p></div>

                                <div className="overflow-hidden rounded-2xl border border-slate-200">
                                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 p-4"><div><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Participant</p><p className="mt-1 font-black">{formData.studentName}</p></div><button type="button" onClick={() => goToStep(1)} className="min-h-11 rounded-xl px-3 text-sm font-black text-orange-700 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">Modifier</button></div>
                                    <div className="grid gap-px bg-slate-200 sm:grid-cols-2">
                                        <div className="bg-white p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Programme</p><p className="mt-1 font-bold">{program.name}</p><p className="mt-1 text-sm text-slate-500">{formData.selectedPack}</p></div>
                                        <div className="bg-white p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Séances choisies</p><p className="mt-1 text-sm font-bold leading-6">{selectedScheduleLabel}</p></div>
                                        <div className="bg-white p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Règlement</p><p className="mt-1 font-bold">{getPaymentMethodLabel(formData.paymentMethod)}</p><p className="mt-1 text-sm text-slate-500">{formData.paymentPlan || 'Échéancier à définir'}</p></div>
                                        <div className="bg-white p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Tarif estimé</p><p className="mt-1 font-mono text-lg font-black">{formatMoney(selectedPricing.finalPrice, settings?.currency || 'MAD')}</p>{selectedPricing.discountAmount > 0 && <p className="mt-1 text-xs font-bold text-amber-700">Remise : {formatMoney(selectedPricing.discountAmount, settings?.currency || 'MAD')} incluse</p>}</div>
                                    </div>
                                </div>

                                <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-4 sm:p-5">
                                    <p className="text-[11px] font-black uppercase tracking-wider text-amber-800">Important</p>
                                    <h4 className="mt-1 font-black text-amber-950">Votre place sera confirmée par l’équipe.</h4>
                                    <p className="mt-2 text-sm leading-6 text-amber-900">Après l’envoi, téléchargez votre reçu de préinscription. L’inscription sera confirmée après vérification du règlement.</p>
                                </div>
                            </section>
                        )}

                        {currentStep === 1 && !isAdult && (
                            <section className="space-y-4">
                                <div className="border-t border-slate-200 pt-5"><h3 className="text-lg font-black">Le parent</h3></div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="parentName" className={labelClass}>Nom du parent</label>
                                        <input id="parentName" required autoComplete="name" name="parentName" value={formData.parentName} onChange={handleChange} className={fieldClass} />
                                    </div>
                                    <div>
                                        <label htmlFor="parentPhone" className={labelClass}>Numéro WhatsApp</label>
                                        <input id="parentPhone" required type="tel" inputMode="tel" autoComplete="tel" name="parentPhone" value={formData.parentPhone} onChange={handleChange} className={fieldClass} placeholder="+212 6..." />
                                    </div>
                                </div>
                                <details className="rounded-xl border border-slate-200 p-3">
                                    <summary className="cursor-pointer text-sm font-bold text-slate-600">École et email (facultatif)</summary>
                                    <div className="mt-3 space-y-3">
                                <div>
                                    <label htmlFor="school" className={labelClass}>{isAdult ? 'Profession' : 'École'}</label>
                                    <input id="school" name="school" value={formData.school} onChange={handleChange} className={fieldClass} placeholder={isAdult ? 'Votre profession' : 'Établissement scolaire'} />
                                </div>
                                <div>
                                    <label htmlFor="email" className={labelClass}>Email <span className="font-medium text-slate-400">(facultatif)</span></label>
                                    <input id="email" type="email" autoComplete="email" name="email" value={formData.email} onChange={handleChange} className={fieldClass} placeholder="name@example.com" />
                                </div>
                                    </div>
                                </details>
                            </section>
                        )}
                        {currentStep === 2 && <section className="space-y-5">
                            <p className="text-sm text-slate-500">Choisissez les jours qui vous conviennent.</p>
                            <div>
                                <fieldset>
                                    <legend className={labelClass}>Choisissez votre pack</legend>
                                    <div className="ml-pack-options">
                                        {program.packs?.map(pack => <label key={pack.name} className="ml-pack-option">
                                            <input type="radio" name="selectedPack" value={pack.name} checked={formData.selectedPack === pack.name} onChange={handleChange} />
                                            <strong>{pack.name.trim()}</strong>
                                            <span>{program.campSetup ? 'Pack vacances' : `${weeklySessionCount(pack)} séance${weeklySessionCount(pack) > 1 ? 's' : ''} / semaine`}</span>
                                        </label>)}
                                    </div>
                                </fieldset>

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
                                                <p className="text-[10px] font-black uppercase text-amber-800">Tarif du pack</p>
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

                            {program.campSetup ? (
                            <fieldset className="space-y-4 rounded-lg border border-orange-200 bg-orange-50/50 p-4">
                                <legend className="px-1 text-sm font-black text-orange-900">Choose your camp place</legend>
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
                                                        <input required={!bothWeeks} disabled={bothWeeks} type="radio" name="selectedCampWeekId" value={week.id} checked={checked} onChange={handleChange} className="accent-orange-600" />
                                                        <span><span className="block font-black">{week.label}</span><span className="block text-xs font-medium text-slate-500">{week.startDate} to {week.endDate}</span></span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </fieldset>
                            ) : <div className="space-y-4">
                                <div>
                                    <label htmlFor="selectedGradeId" className={labelClass}>Niveau du participant</label>
                                    <select id="selectedGradeId" name="selectedGradeId" value={formData.selectedGradeId} onChange={handleChange} className={fieldClass}>
                                        <option value="">Choisir un niveau</option>
                                        {program.grades.filter(grade => !/diy/i.test(grade.name)).map(grade => <option key={grade.id} value={grade.id}>{grade.name}</option>)}
                                    </select>
                                </div>
                                {selectedPack && selectedGrade && <>
                                    <p className="rounded-xl bg-orange-50 px-3 py-2 text-sm font-bold text-orange-900" role="status">
                                        {sessionCount === 2 ? `${Number(Boolean(firstGroup)) + Number(Boolean(secondGroup))} / 2 séances choisies` : '1 séance par semaine'}
                                    </p>
                                    {[1, ...(sessionCount === 2 ? [2] : [])].map(number => <details key={number} className="ml-session-section" open={!(number === 1 ? firstGroup : secondGroup) || expandedSession === number}>
                                        <summary onClick={event => { event.preventDefault(); setExpandedSession(current => current === number ? 0 : number); }}>
                                            <span><strong>Séance {number}</strong><small>{(number === 1 ? firstGroup : secondGroup) ? groupScheduleLabel((number === 1 ? firstGroup : secondGroup)!) : 'Choisir un jour et un horaire'}</small></span>
                                            <span className="ml-session-edit">{(number === 1 ? firstGroup : secondGroup) ? 'Modifier' : 'Choisir'}</span>
                                        </summary>
                                        <fieldset className="pt-3">
                                        <legend className="sr-only">{number === 1 ? 'Votre première séance' : 'Votre deuxième séance'}</legend>
                                        {number === 2 && <div className="mb-3">
                                            <label htmlFor="secondSessionGrade" className={labelClass}>Atelier de la deuxième séance</label>
                                            <select id="secondSessionGrade" value={secondSessionGradeId || selectedGrade.id} onChange={event => {
                                                setSecondSessionGradeId(event.target.value);
                                                setFormData(current => ({ ...current, secondGroupId: '' }));
                                            }} className={fieldClass}>
                                                {[selectedGrade, ...program.grades.filter(grade => grade.id !== selectedGrade.id && /diy/i.test(grade.name))].map(grade => <option key={grade.id} value={grade.id}>{/diy/i.test(grade.name) ? 'Atelier DIY' : grade.name}</option>)}
                                            </select>
                                        </div>}
                                        <div className="ml-session-choices">
                                            {(number === 1 ? selectedGrade.groups : (program.grades.find(grade => grade.id === (secondSessionGradeId || selectedGrade.id))?.groups || selectedGrade.groups)).map(group => {
                                                const disabled = number === 2 && (!firstGroup || groupsOverlap(firstGroup, group));
                                                const name = number === 1 ? 'selectedGroupId' : 'secondGroupId';
                                                return <label key={group.id} className="ml-session-choice">
                                                    <input type="radio" name={name} value={group.id} disabled={disabled} checked={formData[name] === group.id} onChange={() => {
                                                        setFormData(current => ({ ...current, [name]: group.id, ...(number === 1 ? { secondGroupId: '' } : {}) }));
                                                        setStepError('');
                                                        setExpandedSession(number === 1 && sessionCount === 2 ? 2 : 0);
                                                    }} />
                                                    <span><strong>{groupScheduleLabel(group).split(' · ')[0]}</strong><small className="ml-session-time">{groupScheduleLabel(group).split(' · ').slice(1).join(' · ')}</small>{disabled && firstGroup && <small>Indisponible avec la séance 1</small>}</span>
                                                </label>;
                                            })}
                                        </div>
                                        </fieldset>
                                    </details>)}
                                </>}
                                {!program.grades.some(grade => grade.groups.length) && <input name="selectedSlot" value={formData.selectedSlot} onChange={handleChange} className={fieldClass} placeholder="Votre disponibilité" />}
                            </div>}

                            <details className="rounded-xl border border-slate-200 p-3"><summary className="cursor-pointer text-sm font-bold text-slate-600">Une précision ? (facultatif)</summary>
                                <label htmlFor="comments" className="sr-only">Précisions ou questions <span className="font-medium text-slate-400">(facultatif)</span></label>
                                <textarea id="comments" name="comments" value={formData.comments} onChange={handleChange} className={fieldClass} rows={3} placeholder={isAdult ? 'Vos objectifs ou votre niveau…' : 'Une contrainte horaire, un besoin particulier…'} />
                            </details>
                        </section>}

                        {(stepError || submitError) && (
                            <div role="alert" className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">
                                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                                <span>{stepError || submitError}</span>
                            </div>
                        )}

                        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-between">
                            {currentStep > 1 ? (
                                <button type="button" onClick={() => goToStep(currentStep - 1)} disabled={isSubmitting} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-50"><ArrowLeft size={17} /> Retour</button>
                            ) : <span />}

                            {currentStep < 4 ? (
                                <button type="button" onClick={goForward} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#C64F12] px-5 text-sm font-black text-white transition-colors hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2">Continuer <ArrowRight size={18} /></button>
                            ) : (
                                <button type="submit" disabled={isSubmitting} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#C64F12] px-5 text-sm font-black text-white transition-colors hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
                                    {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Envoi en cours…</> : <><FileText size={18} /> Envoyer ma préinscription</>}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </main>

            <footer className="border-t border-slate-300 px-4 py-5 text-center text-xs font-bold text-slate-500">
                {academyName} / {new Date().getFullYear()}
            </footer>
        </div>
    );
};
