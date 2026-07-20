import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Megaphone, Target, Users } from 'lucide-react';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Modal } from '../../components/Modal';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';

interface GrowthWizardModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialCampaignType?: 'holiday' | 'next_level';
}

export const GrowthWizardModal: React.FC<GrowthWizardModalProps> = ({ isOpen, onClose, initialCampaignType = 'holiday' }) => {
    const { students, programs, enrollments, leads } = useAppContext();
    const { currentOrganization, can } = useAuth();
    const [step, setStep] = useState(1);
    const [campaignType, setCampaignType] = useState<'holiday' | 'next_level' | 'custom'>('holiday');
    const [sourceProgramId, setSourceProgramId] = useState('');
    const [campaignName, setCampaignName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setCampaignType(initialCampaignType);
        setCampaignName(`${initialCampaignType === 'holiday' ? 'Holiday camp' : 'Next level'} - ${new Date().toLocaleDateString()}`);
    }, [initialCampaignType, isOpen]);

    const eligibleStudents = useMemo(() => {
        const enrolledStudentIds = sourceProgramId
            ? new Set(enrollments.filter(enrollment => enrollment.programId === sourceProgramId).map(enrollment => enrollment.studentId))
            : null;
        const existingPhones = new Set(
            leads
                .filter(lead => lead.source === 'Internal Upsell' && lead.interests?.includes(campaignType))
                .map(lead => lead.phone.replace(/\D/g, ''))
                .filter(Boolean)
        );

        return students.filter(student => {
            if (student.status !== 'active') return false;
            if (enrolledStudentIds && !enrolledStudentIds.has(student.id)) return false;
            const phone = student.parentPhone?.replace(/\D/g, '');
            return !phone || !existingPhones.has(phone);
        });
    }, [campaignType, enrollments, leads, sourceProgramId, students]);

    const selectedProgram = programs.find(program => program.id === sourceProgramId);
    const defaultCampaignName = campaignType === 'holiday' ? 'Holiday camp' : 'Next level';

    const resetAndClose = () => {
        if (isCreating) return;
        setStep(1);
        setCampaignType('holiday');
        setSourceProgramId('');
        setCampaignName('');
        setFeedback(null);
        onClose();
    };

    const handleCreateCampaign = async () => {
        if (!db || isCreating) return;
        const orgId = currentOrganization?.id;
        if (!orgId) {
            setFeedback({ kind: 'error', message: 'Select an organization before creating a campaign.' });
            return;
        }
        if (!can('marketing.create')) {
            setFeedback({ kind: 'error', message: 'You have view-only access. A marketing creator must launch this workflow.' });
            return;
        }
        if (!campaignName.trim()) {
            setFeedback({ kind: 'error', message: 'Name the campaign before creating it.' });
            return;
        }
        if (eligibleStudents.length === 0) {
            setFeedback({ kind: 'error', message: 'This audience has no eligible students. Choose another program or campaign goal.' });
            return;
        }
        if (eligibleStudents.length > 450) {
            setFeedback({ kind: 'error', message: 'This audience is too large for one safe launch. Narrow it to 450 students or fewer.' });
            return;
        }

        setIsCreating(true);
        setFeedback(null);
        try {
            const batch = writeBatch(db);
            const campaignRef = doc(collection(db, 'campaigns'));
            batch.set(campaignRef, {
                organizationId: orgId,
                name: campaignName.trim(),
                status: 'planned',
                budget: 0,
                spend: 0,
                goals: `${eligibleStudents.length} Students Targeted`,
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                createdAt: serverTimestamp()
            });

            eligibleStudents.forEach(student => {
                const leadRef = doc(collection(db, 'leads'));
                batch.set(leadRef, {
                    organizationId: orgId,
                    name: student.name,
                    parentName: student.parentName || 'Parent or guardian',
                    phone: student.parentPhone || '',
                    email: student.email || '',
                    status: 'new',
                    source: 'Internal Upsell',
                    campaignId: campaignRef.id,
                    interests: [campaignType],
                    tags: [selectedProgram?.name || 'All active students'],
                    createdAt: serverTimestamp()
                });
            });
            await batch.commit();

            setFeedback({ kind: 'success', message: `Campaign prepared. ${eligibleStudents.length} students were added to the pipeline for review.` });
            window.setTimeout(() => {
                resetAndClose();
            }, 700);
        } catch (error) {
            console.error('Campaign creation failed', error);
            setFeedback({ kind: 'error', message: 'The campaign could not be created. Review the setup and try again.' });
        } finally {
            setIsCreating(false);
        }
    };

    const steps = [
        { number: 1, label: 'Goal' },
        { number: 2, label: 'Audience' },
        { number: 3, label: 'Launch' }
    ];

    return (
        <Modal isOpen={isOpen} onClose={resetAndClose} title="Growth campaign">
            <div className="flex h-[min(72vh,560px)] flex-col gap-4 text-slate-900">
                <header className="shrink-0 rounded-lg border border-slate-800 bg-[#08111F] px-4 py-3 text-white">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-bold uppercase text-teal-300">Pipeline builder</p>
                            <h2 className="mt-0.5 text-base font-bold">Turn current families into the next campaign</h2>
                        </div>
                        <span className="rounded-full border border-[#F2C766]/30 bg-[#F2C766]/10 px-2 py-1 text-xs font-bold text-[#F2C766]">{eligibleStudents.length} eligible</span>
                    </div>
                </header>

                <ol className="grid shrink-0 grid-cols-3 gap-2" aria-label="Campaign steps">
                    {steps.map(item => (
                        <li key={item.number} className={`flex h-10 items-center gap-2 rounded-lg border px-3 text-xs font-bold ${step === item.number ? 'border-teal-500 bg-teal-50 text-teal-800' : step > item.number ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-slate-200 bg-white text-slate-400'}`}>
                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${step >= item.number ? 'bg-[#14B8A6] text-[#08111F]' : 'bg-slate-100 text-slate-500'}`}>{item.number}</span>
                            <span className="truncate">{item.label}</span>
                        </li>
                    ))}
                </ol>

                {feedback && (
                    <div className={`shrink-0 rounded-lg border px-3 py-2 text-sm ${feedback.kind === 'success' ? 'border-teal-200 bg-teal-50 text-teal-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`} role="status">
                        {feedback.message}
                    </div>
                )}

                <div className="min-h-0 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                    {step === 1 && (
                        <section className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700"><Target size={19} /></div>
                                <div><h3 className="text-base font-bold">Choose the campaign goal</h3><p className="mt-0.5 text-sm text-slate-500">Select the offer families should receive.</p></div>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <button type="button" onClick={() => { setCampaignType('holiday'); setCampaignName(`Holiday camp - ${new Date().toLocaleDateString()}`); }} className={`min-h-20 rounded-lg border p-3 text-left transition-colors ${campaignType === 'holiday' ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-white hover:border-teal-300'}`}>
                                    <span className="block text-sm font-bold text-slate-900">Holiday camp</span>
                                    <span className="mt-1 block text-xs text-slate-500">Fill seats for the upcoming break.</span>
                                </button>
                                <button type="button" onClick={() => { setCampaignType('next_level'); setCampaignName(`Next level - ${new Date().toLocaleDateString()}`); }} className={`min-h-20 rounded-lg border p-3 text-left transition-colors ${campaignType === 'next_level' ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-white hover:border-teal-300'}`}>
                                    <span className="block text-sm font-bold text-slate-900">Level up</span>
                                    <span className="mt-1 block text-xs text-slate-500">Move students into their next program.</span>
                                </button>
                            </div>
                            <div>
                                <label htmlFor="growth-campaign-name" className="mb-1.5 block text-xs font-bold text-slate-600">Campaign name</label>
                                <input
                                    id="growth-campaign-name"
                                    value={campaignName}
                                    onChange={event => setCampaignName(event.target.value)}
                                    onFocus={() => { if (!campaignName) setCampaignName(`${defaultCampaignName} - ${new Date().toLocaleDateString()}`); }}
                                    placeholder={`${defaultCampaignName} - ${new Date().toLocaleDateString()}`}
                                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#14B8A6] focus:ring-2 focus:ring-teal-100"
                                />
                            </div>
                        </section>
                    )}

                    {step === 2 && (
                        <section className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700"><Users size={19} /></div>
                                <div><h3 className="text-base font-bold">Set the audience</h3><p className="mt-0.5 text-sm text-slate-500">Choose which current students enter the upsell pipeline.</p></div>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                <label htmlFor="growth-source-program" className="mb-1.5 block text-xs font-bold text-slate-600">Current program</label>
                                <select id="growth-source-program" className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#14B8A6] focus:ring-2 focus:ring-teal-100" value={sourceProgramId} onChange={event => setSourceProgramId(event.target.value)}>
                                    <option value="">All students</option>
                                    {programs.map(program => <option key={program.id} value={program.id}>{program.name}</option>)}
                                </select>
                                <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-sm">
                                    <span className="text-slate-600">Eligible students</span>
                                    <span className="font-mono font-bold text-teal-700">{eligibleStudents.length}</span>
                                </div>
                            </div>
                        </section>
                    )}

                    {step === 3 && (
                        <section className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700"><Megaphone size={19} /></div>
                                <div><h3 className="text-base font-bold">Review and launch</h3><p className="mt-0.5 text-sm text-slate-500">The campaign and linked lead records will be created together.</p></div>
                            </div>
                            <dl className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white px-3">
                                <div className="flex justify-between gap-4 py-3"><dt className="text-sm text-slate-500">Campaign</dt><dd className="max-w-[65%] truncate text-right text-sm font-bold">{campaignName || defaultCampaignName}</dd></div>
                                <div className="flex justify-between gap-4 py-3"><dt className="text-sm text-slate-500">Campaign type</dt><dd className="text-right text-sm font-bold capitalize">{campaignType.replace('_', ' ')}</dd></div>
                                <div className="flex justify-between gap-4 py-3"><dt className="text-sm text-slate-500">Target audience</dt><dd className="text-right text-sm font-bold">{selectedProgram?.name || 'All active students'}</dd></div>
                                <div className="flex justify-between gap-4 py-3"><dt className="text-sm text-slate-500">Estimated reach</dt><dd className="font-mono text-sm font-bold text-teal-700">{eligibleStudents.length} families</dd></div>
                            </dl>
                            {eligibleStudents.length === 0 && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">No eligible students remain in this audience. Existing matching upsell leads are excluded.</p>}
                            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">This creates a planned campaign and CRM leads. It does not send messages or publish ads.</p>
                        </section>
                    )}
                </div>

                <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 pt-3">
                    <button type="button" onClick={() => setStep(value => Math.max(1, value - 1))} disabled={step === 1 || isCreating} className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30">
                        <ArrowLeft size={16} /> Back
                    </button>
                    {step < 3 ? (
                        <button type="button" onClick={() => { setFeedback(null); setStep(value => Math.min(3, value + 1)); }} className="flex h-10 items-center gap-2 rounded-lg bg-[#14B8A6] px-4 text-sm font-bold text-[#08111F] hover:bg-teal-300">
                            Continue <ArrowRight size={16} />
                        </button>
                    ) : (
                        <button type="button" onClick={handleCreateCampaign} disabled={isCreating || eligibleStudents.length === 0 || !can('marketing.create')} className="flex h-10 items-center gap-2 rounded-lg bg-[#14B8A6] px-4 text-sm font-bold text-[#08111F] hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-50">
                            <CheckCircle2 size={16} /> {isCreating ? 'Creating...' : 'Create campaign'}
                        </button>
                    )}
                </footer>
            </div>
        </Modal>
    );
};
