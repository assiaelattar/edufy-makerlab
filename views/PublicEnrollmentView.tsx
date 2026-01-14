import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Program } from '../types';
import { Logo } from '../components/Logo';
import { CheckCircle2, ChevronRight, Loader2, Rocket, Star } from 'lucide-react';

export const PublicEnrollmentView = () => {
    const [loading, setLoading] = useState(true);
    const [program, setProgram] = useState<Program | null>(null);
    const [settings, setSettings] = useState<any>(null);
    const [submitted, setSubmitted] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        studentName: '',
        birthDate: '',
        school: '',
        parentName: '',
        parentPhone: '',
        email: '',
        selectedPack: '',
        selectedSlot: '',
        paymentPlan: '',
        comments: ''
    });

    // Get Program ID from URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const programId = params.get('program');

        if (programId && db) {
            getDoc(doc(db, 'programs', programId)).then(snap => {
                if (snap.exists()) {
                    setProgram({ id: snap.id, ...snap.data() } as Program);
                }
                setLoading(false);
            }).catch(err => {
                console.error("Error fetching program", err);
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }, []);

    // Fetch Settings (Logo)
    useEffect(() => {
        if (db) {
            getDoc(doc(db, 'settings', 'global')).then(snap => {
                if (snap.exists()) setSettings(snap.data());
            }).catch(console.error);
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !program) return;

        try {
            // Create a Lead in CRM
            await addDoc(collection(db, 'leads'), {
                name: formData.studentName,
                parentName: formData.parentName,
                phone: formData.parentPhone,
                email: formData.email,
                source: 'Kiosk Form',
                status: 'new',
                interests: [program.name],
                programId: program.id, // NEW: For direct linking
                selectedPack: formData.selectedPack, // NEW
                selectedSlot: formData.selectedSlot, // NEW
                preferredPaymentTerm: formData.paymentPlan,
                paymentMethod: (formData as any).paymentMethod,
                // Store form details in notes as fallback
                notes: [`Kiosk Enrollment Request for ${program.name}`, `Pack: ${formData.selectedPack}`, `Payment: ${formData.paymentPlan}`, `Slot: ${formData.selectedSlot}`, `School: ${formData.school}`, `DOB: ${formData.birthDate}`, `Comments: ${formData.comments}`],
                createdAt: serverTimestamp()
            });
            setSubmitted(true);
        } catch (err) {
            alert('Error submitting form. Please try again.');
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-slate-400" /></div>;
    if (!program) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Program not found.</div>;

    if (submitted) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center animate-in zoom-in-50">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Registration Received!</h2>
                    <p className="text-slate-500 mb-6">Thank you for registering for <strong>{program.name}</strong>. Our team will contact you shortly to finalize the enrollment.</p>
                    <button onClick={() => window.location.reload()} className="text-blue-600 font-bold text-sm hover:underline">Start New Form</button>
                </div>
            </div>
        );
    }

    // Dynamic Color Theme
    const colorTheme = {
        blue: 'blue',
        purple: 'purple',
        emerald: 'emerald',
        amber: 'amber',
        rose: 'rose',
        cyan: 'cyan',
        slate: 'slate'
    }[program.themeColor || 'blue'];

    return (
        <div className={`min-h-screen bg-gradient-to-b from-${colorTheme}-50 to-white font-sans selection:bg-${colorTheme}-200`}>
            {/* Header */}
            <div
                className={`relative bg-gradient-to-br from-${colorTheme}-600 via-${colorTheme}-500 to-${colorTheme}-700 text-white p-8 pb-32 overflow-hidden bg-cover bg-center transition-all duration-700`}
                style={program.thumbnailUrl ? { backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.9)), url(${program.thumbnailUrl})` } : {}}
            >
                {/* Decorative Elements Removed for Performance */}

                <div className="max-w-xl mx-auto relative z-10">
                    <div className="flex items-center gap-4 mb-8">
                        {/* Partner Logo (First if exists) */}
                        {program.partnerLogoUrl && (
                            <>
                                <div className="w-14 h-14 bg-white rounded-2xl shadow-xl flex items-center justify-center p-1.5 overflow-hidden" title={program.partnerName}>
                                    <img
                                        src={program.partnerLogoUrl}
                                        alt="Partner Logo"
                                        className="w-full h-full object-contain"
                                        onError={(e) => {
                                            console.error("Failed to load partner logo", program.partnerLogoUrl);
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    />
                                </div>
                                <span className="text-white/50 font-bold text-lg">x</span>
                            </>
                        )}

                        {/* Academy Logo */}
                        <div className="w-14 h-14 bg-white rounded-2xl shadow-xl flex items-center justify-center p-1.5 overflow-hidden">
                            {settings?.logoUrl ? (
                                <img src={settings.logoUrl} alt="Academy Logo" className="w-full h-full object-contain" />
                            ) : (
                                <Logo className={`w-8 h-8 text-${colorTheme}-600`} />
                            )}
                        </div>

                        <div>
                            <span className="font-bold tracking-tight text-lg opacity-90 block">
                                {program.partnerName ? (
                                    <>
                                        {program.partnerName} <span className="mx-1 text-white/70">x</span> {settings?.academyName || 'MakerLab Academy'}
                                    </>
                                ) : (
                                    settings?.academyName || 'MakerLab Academy'
                                )}
                            </span>
                            <div className="h-1 w-12 bg-white/30 rounded-full mt-1"></div>
                        </div>
                    </div>
                    <h1 className="text-4xl font-black uppercase tracking-tight mb-3 text-white drop-shadow-sm">{program.name}</h1>
                    <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <p className="text-white font-bold text-sm tracking-wide">{program.type} Registration</p>
                    </div>
                </div>
            </div>

            {/* Form Container */}
            <div className="max-w-xl mx-auto px-4 -mt-24 pb-12 relative z-20">
                <form onSubmit={handleSubmit} className={`bg-white rounded-3xl shadow-2xl shadow-${colorTheme}-900/10 border border-${colorTheme}-100/50 p-6 md:p-10 space-y-8 animate-in slide-in-from-bottom-8`}>

                    {/* Section 1: Participant */}
                    <div className="space-y-4">
                        <h3 className={`text-sm font-black uppercase text-${colorTheme}-600 tracking-wider border-b border-slate-100 pb-2`}>1. Participant Info</h3>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Full Name</label>
                            <input required name="studentName" value={formData.studentName} onChange={handleChange} className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 outline-none focus:border-${colorTheme}-500 focus:ring-4 focus:ring-${colorTheme}-500/10 transition-all`} placeholder="e.g. Neil Hamdouch" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Date of Birth</label>
                                <input required type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 outline-none focus:border-${colorTheme}-500 focus:ring-4 focus:ring-${colorTheme}-500/10 transition-all`} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">{program?.targetAudience === 'adults' ? 'Profession' : 'School'}</label>
                                <input name="school" value={formData.school} onChange={handleChange} className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 outline-none focus:border-${colorTheme}-500 focus:ring-4 focus:ring-${colorTheme}-500/10 transition-all`} placeholder={program?.targetAudience === 'adults' ? 'Current Profession' : 'Current School'} />
                            </div>
                        </div>

                        {program?.targetAudience === 'adults' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Phone Number</label>
                                    <input required name="parentPhone" value={formData.parentPhone} onChange={handleChange} className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 outline-none focus:border-${colorTheme}-500 focus:ring-4 focus:ring-${colorTheme}-500/10 transition-all`} placeholder="+212 6..." />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Email</label>
                                    <input required type="email" name="email" value={formData.email} onChange={handleChange} className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 outline-none focus:border-${colorTheme}-500 focus:ring-4 focus:ring-${colorTheme}-500/10 transition-all`} placeholder="For contacts" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section 2: Parent (Only for children) */}
                    {program?.targetAudience !== 'adults' && (
                        <div className="space-y-4">
                            <h3 className={`text-sm font-black uppercase text-${colorTheme}-600 tracking-wider border-b border-slate-100 pb-2`}>2. Parent / Guardian</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Parent Name</label>
                                    <input required name="parentName" value={formData.parentName} onChange={handleChange} className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 outline-none focus:border-${colorTheme}-500 focus:ring-4 focus:ring-${colorTheme}-500/10 transition-all`} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">WhatsApp Number</label>
                                    <input required name="parentPhone" value={formData.parentPhone} onChange={handleChange} className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 outline-none focus:border-${colorTheme}-500 focus:ring-4 focus:ring-${colorTheme}-500/10 transition-all`} placeholder="+212 6..." />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Email</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 outline-none focus:border-${colorTheme}-500 focus:ring-4 focus:ring-${colorTheme}-500/10 transition-all`} placeholder="For updates & follow-up" />
                            </div>
                        </div>
                    )}

                    {/* Section 3: Program Options */}
                    <div className="space-y-4">
                        <h3 className={`text-sm font-black uppercase text-${colorTheme}-600 tracking-wider border-b border-slate-100 pb-2`}>{program?.targetAudience === 'adults' ? '2. Preference' : '3. Preferences'}</h3>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Select Formula</label>
                            <select name="selectedPack" value={formData.selectedPack} onChange={handleChange} className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 outline-none focus:border-${colorTheme}-500 focus:ring-4 focus:ring-${colorTheme}-500/10 transition-all text-slate-900`}>
                                <option value="">-- Choose a Pack --</option>
                                {program.packs?.map((pack: any) => (
                                    <option key={pack.name} value={pack.name}>{pack.name}</option>
                                ))}
                            </select>

                            {formData.selectedPack && (() => {
                                const pack = program.packs?.find((p: any) => p.name === formData.selectedPack);
                                if (pack) {
                                    const originalPrice = pack.priceAnnual || pack.price || 0;
                                    // Use per-pack promoPrice if available and discount is globally enabled
                                    const hasDiscount = program.discountAvailable && pack.promoPrice && pack.promoPrice > 0;
                                    const discountedPrice = hasDiscount ? pack.promoPrice : originalPrice;
                                    // Calculate percentage
                                    const discountPercentage = hasDiscount && originalPrice > 0 ? Math.round((1 - (pack.promoPrice! / originalPrice)) * 100) : 0;

                                    return (
                                        <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between animate-in fade-in">
                                            <div>
                                                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Estimated Tuition</div>
                                                <div className="flex items-baseline gap-2">
                                                    {hasDiscount && (
                                                        <span className="text-sm text-slate-400 line-through font-medium">{originalPrice} Dhs</span>
                                                    )}
                                                    <span className={`text-xl font-bold ${hasDiscount ? 'text-emerald-600' : 'text-slate-800'}`}>
                                                        {discountedPrice} Dhs
                                                    </span>
                                                    {hasDiscount && discountPercentage > 0 && (
                                                        <span className="text-xs font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">-{discountPercentage}% PROMO</span>
                                                    )}
                                                </div>
                                            </div>
                                            {hasDiscount && program.discountEndDate && (
                                                <div className="text-right">
                                                    <div className="text-[10px] font-bold text-red-500 uppercase">Offer Ends</div>
                                                    <div className="text-xs font-bold text-slate-700">{new Date(program.discountEndDate).toLocaleDateString()}</div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                        </div>

                        {/* Payment Preference Checkbox */}
                        {/* Payment Preference Checkbox - Only show if custom terms exist */}
                        {program.paymentTerms && program.paymentTerms.some(t => t && t.trim()) && (
                            <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/60">
                                <label className="block text-sm font-bold text-slate-700 mb-3 ml-1">Preferred Payment Plan</label>
                                <div className="flex flex-wrap gap-4">
                                    {program.paymentTerms.filter(t => t && t.trim()).map((term, i) => (
                                        <label key={i} className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm hover:border-slate-300 transition-all select-none">
                                            <input type="radio" name="paymentPlan" value={term} checked={formData.paymentPlan === term} onChange={handleChange} className={`accent-${colorTheme}-600 w-4 h-4`} />
                                            <span className="text-slate-700 font-medium text-sm">{term}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* NEW: Payment Method Selection */}
                        {/* NEW: Payment Method Selection */}
                        <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/60">
                            <label className="block text-sm font-bold text-slate-700 mb-3 ml-1">Payment Method</label>
                            <div className="flex flex-wrap gap-4">
                                <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm hover:border-slate-300 transition-all select-none">
                                    <input type="radio" name="paymentMethod" value="cash" checked={(formData as any).paymentMethod === 'cash'} onChange={handleChange} className={`accent-${colorTheme}-600 w-4 h-4`} />
                                    <span className="text-slate-700 font-medium text-sm">Cash (Espèces)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm hover:border-slate-300 transition-all select-none">
                                    <input type="radio" name="paymentMethod" value="check" checked={(formData as any).paymentMethod === 'check'} onChange={handleChange} className={`accent-${colorTheme}-600 w-4 h-4`} />
                                    <span className="text-slate-700 font-medium text-sm">Check (Chèque)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm hover:border-slate-300 transition-all select-none">
                                    <input type="radio" name="paymentMethod" value="card" checked={(formData as any).paymentMethod === 'card'} onChange={handleChange} className={`accent-${colorTheme}-600 w-4 h-4`} />
                                    <span className="text-slate-700 font-medium text-sm">Card (Carte Bancaire)</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Preferred Slot</label>
                            {program.grades && program.grades.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                    {(() => {
                                        const slots = program.grades.flatMap(g => g.groups.map(grp => `${grp.day} at ${grp.time}`)).filter((v, i, a) => a.indexOf(v) === i);

                                        if (slots.length === 0) return <p className="text-sm text-slate-500 italic">No specific slots available. Please contact us.</p>;

                                        return slots.map((slot, idx) => (
                                            <label key={idx} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${formData.selectedSlot === slot ? `border-${colorTheme}-600 bg-${colorTheme}-50 ring-1 ring-${colorTheme}-600` : 'border-slate-200 hover:border-slate-300'}`}>
                                                <input
                                                    type="radio"
                                                    name="selectedSlot"
                                                    value={slot}
                                                    checked={formData.selectedSlot === slot}
                                                    onChange={handleChange}
                                                    className={`accent-${colorTheme}-600 w-4 h-4`}
                                                />
                                                <span className="text-sm font-medium text-slate-700 capitalize">{slot}</span>
                                            </label>
                                        ));
                                    })()}
                                </div>

                            ) : (
                                <input name="selectedSlot" value={formData.selectedSlot} onChange={handleChange} className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 outline-none focus:border-${colorTheme}-500 focus:ring-4 focus:ring-${colorTheme}-500/10 transition-all`} placeholder="e.g. Wednesday 15:30 or Saturday Morning" />
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Comments / Questions</label>
                            <textarea name="comments" value={formData.comments} onChange={handleChange} className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 outline-none focus:border-${colorTheme}-500 focus:ring-4 focus:ring-${colorTheme}-500/10 transition-all`} rows={3} placeholder="Any specific needs?" />
                        </div>
                    </div>

                    <button type="submit" className={`w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2 group transform active:scale-[0.98]`}>
                        Submit Registration <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                    </button>

                </form>

                <div className="text-center mt-8">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">MakerLab Academy © {new Date().getFullYear()}</p>
                </div>
            </div>
        </div>
    );
};
