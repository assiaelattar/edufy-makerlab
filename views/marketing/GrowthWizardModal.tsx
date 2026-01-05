import React, { useState } from 'react';
import { Target, Users, Megaphone, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { useAppContext } from '../../context/AppContext';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface GrowthWizardModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const GrowthWizardModal: React.FC<GrowthWizardModalProps> = ({ isOpen, onClose }) => {
    const { students, programs } = useAppContext();
    const [step, setStep] = useState(1);
    const [campaignType, setCampaignType] = useState<'holiday' | 'next_level' | 'custom'>('holiday');
    const [targetProgramId, setTargetProgramId] = useState('');
    const [sourceProgramId, setSourceProgramId] = useState('');

    // Filter Logic
    const eligibleStudents = students.filter(s => {
        if (!sourceProgramId) return true;
        // Mock logic: assuming student has a 'currentProgramId' or we check enrollments. 
        // For this MVP, let's assume we filter by some reliable field or just show all if no filter.
        // In real app, we'd check `enrollments`.
        return true;
    });

    const handleCreateCampaign = async () => {
        if (!db) return;

        // 1. Create Campaign
        const campaignRef = await addDoc(collection(db, 'campaigns'), {
            name: `${campaignType === 'holiday' ? 'Holiday Camp' : 'Level Up'} - ${new Date().toLocaleDateString()}`,
            status: 'active',
            budget: 0,
            spend: 0,
            goals: `${eligibleStudents.length} Students Targeted`,
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            createdAt: serverTimestamp()
        });

        // 2. Add Students as Leads (Upsell)
        const batchPromises = eligibleStudents.map(s =>
            addDoc(collection(db, 'leads'), {
                name: s.name,
                parentName: s.parentName,
                phone: s.parentPhone,
                email: s.email,
                status: 'new',
                source: 'Internal Upsell', // specific source
                campaignId: campaignRef.id,
                interests: [campaignType],
                createdAt: serverTimestamp()
            })
        );

        await Promise.all(batchPromises);

        alert(`Campaign Created! ${eligibleStudents.length} students added to pipeline.`);
        onClose();
        setStep(1);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Growth Campaign Wizard">
            <div className="flex flex-col h-[500px]">
                {/* Steps Indicator */}
                <div className="flex justify-between mb-8 px-8 relative">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -z-10"></div>
                    {[1, 2, 3].map(s => (
                        <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${step >= s ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                            {s}
                        </div>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto px-4">
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
                            <div className="text-center mb-6">
                                <Target size={48} className="mx-auto text-purple-500 mb-2" />
                                <h3 className="text-xl font-bold text-slate-800">Choose Your Goal</h3>
                                <p className="text-slate-500 text-sm">What do you want to promote?</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => setCampaignType('holiday')} className={`p-4 rounded-xl border-2 text-left transition-all ${campaignType === 'holiday' ? 'border-purple-500 bg-purple-50' : 'border-slate-100 hover:border-purple-200'}`}>
                                    <div className="font-bold text-slate-800">Holiday Camp</div>
                                    <div className="text-xs text-slate-500 mt-1">Fill seats for upcoming break</div>
                                </button>
                                <button onClick={() => setCampaignType('next_level')} className={`p-4 rounded-xl border-2 text-left transition-all ${campaignType === 'next_level' ? 'border-purple-500 bg-purple-50' : 'border-slate-100 hover:border-purple-200'}`}>
                                    <div className="font-bold text-slate-800">Level Up</div>
                                    <div className="text-xs text-slate-500 mt-1">Move students to next level</div>
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
                            <div className="text-center mb-6">
                                <Users size={48} className="mx-auto text-blue-500 mb-2" />
                                <h3 className="text-xl font-bold text-slate-800">Target Audience</h3>
                                <p className="text-slate-500 text-sm">Select which students to include.</p>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Filter by Current Program</label>
                                    <select className="w-full p-2 rounded border border-slate-200" value={sourceProgramId} onChange={e => setSourceProgramId(e.target.value)}>
                                        <option value="">All Students</option>
                                        {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center justify-between text-sm font-medium text-slate-600 pt-2 border-t border-slate-200">
                                    <span>Eligible Students:</span>
                                    <span className="bg-white px-2 py-1 rounded border border-slate-200 shadow-sm text-indigo-600 font-bold">{eligibleStudents.length}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
                            <div className="text-center mb-6">
                                <Megaphone size={48} className="mx-auto text-emerald-500 mb-2" />
                                <h3 className="text-xl font-bold text-slate-800">Ready to Launch</h3>
                                <p className="text-slate-500 text-sm">Review and activate your campaign.</p>
                            </div>

                            <div className="bg-white border-2 border-slate-100 rounded-xl p-4">
                                <div className="flex justify-between py-2 border-b border-slate-50">
                                    <span className="text-slate-500 text-sm">Campaign Type</span>
                                    <span className="font-bold text-slate-800 capitalize">{campaignType.replace('_', ' ')}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-50">
                                    <span className="text-slate-500 text-sm">Target Audience</span>
                                    <span className="font-bold text-slate-800">{sourceProgramId ? 'Selected Program' : 'All Students'}</span>
                                </div>
                                <div className="flex justify-between py-2">
                                    <span className="text-slate-500 text-sm">Estimated Reach</span>
                                    <span className="font-bold text-emerald-600">{eligibleStudents.length} Families</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="flex justify-between pt-4 border-t border-slate-100 mt-4">
                    <button
                        onClick={() => setStep(s => Math.max(1, s - 1))}
                        disabled={step === 1}
                        className="px-4 py-2 text-slate-400 hover:text-slate-600 font-medium disabled:opacity-30"
                    >
                        Back
                    </button>

                    {step < 3 ? (
                        <button
                            onClick={() => setStep(s => Math.min(3, s + 1))}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2"
                        >
                            Next <ArrowRight size={16} />
                        </button>
                    ) : (
                        <button
                            onClick={handleCreateCampaign}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2"
                        >
                            <CheckCircle2 size={16} /> Launch Campaign
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
};
