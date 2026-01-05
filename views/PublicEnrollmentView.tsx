import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Program } from '../types';
import { Logo } from '../components/Logo';
import { CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';

export const PublicEnrollmentView = () => {
    const [loading, setLoading] = useState(true);
    const [program, setProgram] = useState<Program | null>(null);
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
                // Store form details in notes or timeline
                notes: [`Kiosk Enrollment Request for ${program.name}`, `Pack: ${formData.selectedPack}`, `Payment Preference: ${formData.paymentPlan || 'Not Selected'}`, `Slot: ${formData.selectedSlot}`, `School/Job: ${formData.school}`, `DOB: ${formData.birthDate}`, `Comments: ${formData.comments}`],
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
        <div className={`min-h-screen bg-slate-50 font-sans selection:bg-${colorTheme}-200`}>
            {/* Header */}
            <div className={`bg-${colorTheme}-600 text-white p-6 pb-24`}>
                <div className="max-w-xl mx-auto">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                            <Logo className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-bold tracking-tight">MakerLab Academy</span>
                    </div>
                    <h1 className="text-3xl font-black uppercase tracking-tight mb-2">{program.name}</h1>
                    <p className="text-white/80 font-medium">{program.type} Registration</p>
                </div>
            </div>

            {/* Form Container */}
            <div className="max-w-xl mx-auto px-4 -mt-16 pb-12">
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 md:p-8 space-y-8 animate-in slide-in-from-bottom-8">

                    {/* Section 1: Participant */}
                    <div className="space-y-4">
                        <h3 className={`text-sm font-black uppercase text-${colorTheme}-600 tracking-wider border-b border-slate-100 pb-2`}>1. Participant Info</h3>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                            <input required name="studentName" value={formData.studentName} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-slate-800 transition-colors" placeholder="e.g. Neil Hamdouch" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Date of Birth</label>
                                <input required type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-slate-800 transition-colors" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">{program?.targetAudience === 'adults' ? 'Profession' : 'School'}</label>
                                <input name="school" value={formData.school} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-slate-800 transition-colors" placeholder={program?.targetAudience === 'adults' ? 'Current Profession' : 'Current School'} />
                            </div>
                        </div>

                        {program?.targetAudience === 'adults' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Phone Number</label>
                                    <input required name="parentPhone" value={formData.parentPhone} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-slate-800 transition-colors" placeholder="+212 6..." />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                                    <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-slate-800 transition-colors" placeholder="For contacts" />
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
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Parent Name</label>
                                    <input required name="parentName" value={formData.parentName} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-slate-800 transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">WhatsApp Number</label>
                                    <input required name="parentPhone" value={formData.parentPhone} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-slate-800 transition-colors" placeholder="+212 6..." />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-slate-800 transition-colors" placeholder="For updates & follow-up" />
                            </div>
                        </div>
                    )}

                    {/* Section 3: Program Options */}
                    <div className="space-y-4">
                        <h3 className={`text-sm font-black uppercase text-${colorTheme}-600 tracking-wider border-b border-slate-100 pb-2`}>{program?.targetAudience === 'adults' ? '2. Preference' : '3. Preferences'}</h3>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Select Formula</label>
                            <select name="selectedPack" value={formData.selectedPack} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-slate-800 transition-colors">
                                <option value="">-- Choose a Pack --</option>
                                {program.packs?.map((pack: any) => (
                                    <option key={pack.name} value={pack.name}>{pack.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Payment Preference Checkbox */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <label className="block text-sm font-bold text-slate-700 mb-3">Preferred Payment Plan</label>
                            <div className="flex gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="paymentPlan" value="annual" className={`accent-${colorTheme}-600 w-5 h-5`} />
                                    <span className="text-slate-700 font-medium">Annual</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="paymentPlan" value="trimester" className={`accent-${colorTheme}-600 w-5 h-5`} />
                                    <span className="text-slate-700 font-medium">Trimester</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Preferred Slot</label>
                            <input name="selectedSlot" value={formData.selectedSlot} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-slate-800 transition-colors" placeholder="e.g. Wednesday 15:30 or Saturday Morning" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Comments / Questions</label>
                            <textarea name="comments" value={formData.comments} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-slate-800 transition-colors" rows={3} placeholder="Any specific needs?" />
                        </div>
                    </div>

                    <button type="submit" className={`w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2 group`}>
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
