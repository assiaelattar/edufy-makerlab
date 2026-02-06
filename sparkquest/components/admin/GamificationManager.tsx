import React, { useState } from 'react';
import { useFactoryData } from '../../hooks/useFactoryData';
import { Gadget, Contest, PurchaseRequest } from '../../types';
import { db } from '../../services/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Plus, Trash2, Edit, Check, X, ShoppingBag, Trophy, Loader2 } from 'lucide-react';

export const GamificationManager: React.FC = () => {
    // Extended data hook to include programs for grade filtering
    const { gadgets, contests, purchaseRequests, programs } = useFactoryData();
    const [activeTab, setActiveTab] = useState<'GADGETS' | 'CONTESTS' | 'ORDERS'>('GADGETS');
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    // Gadget Form State
    const [gadgetForm, setGadgetForm] = useState<Partial<Gadget>>({
        name: '', description: '', cost: 100, stock: 1, type: 'physical', image: ''
    });

    // Contest Form State
    const [contestForm, setContestForm] = useState<Partial<Contest>>({
        title: '', description: '', rewardText: '', targetExploreCount: 5, isActive: true, image: '', targetGrades: []
    });

    // Toggle Grade Helper
    const toggleGrade = (gradeId: string) => {
        setContestForm(prev => {
            const current = prev.targetGrades || [];
            if (current.includes(gradeId)) {
                return { ...prev, targetGrades: current.filter(id => id !== gradeId) };
            } else {
                return { ...prev, targetGrades: [...current, gradeId] };
            }
        });
    };

    // --- ACTIONS ---

    // 1. GADGETS
    const handleSaveGadget = async () => {
        setLoading(true);
        try {
            if (gadgetForm.id) {
                await updateDoc(doc(db, 'gadgets', gadgetForm.id), gadgetForm);
            } else {
                await addDoc(collection(db, 'gadgets'), gadgetForm);
            }
            setIsEditing(false);
            setGadgetForm({ name: '', description: '', cost: 100, stock: 1, type: 'physical', image: '' });
        } catch (e) {
            alert('Error saving gadget');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteGadget = async (id: string) => {
        if (!confirm('Delete this gadget?')) return;
        await deleteDoc(doc(db, 'gadgets', id));
    };

    // 2. CONTESTS
    const handleSaveContest = async () => {
        setLoading(true);
        try {
            // Apply Logic: If banner image is empty, and rewardId is selected, use gadget image as banner if available?
            // User requirement: "if there no banner we take the image of teh product or the service selected"
            let finalImage = contestForm.image;
            if (!finalImage && contestForm.rewardId) {
                const selectedGadget = gadgets.find(g => g.id === contestForm.rewardId);
                if (selectedGadget) finalImage = selectedGadget.image;
            }

            const dataToSave = { ...contestForm, image: finalImage };

            if (contestForm.id) {
                await updateDoc(doc(db, 'contests', contestForm.id), dataToSave);
            } else {
                await addDoc(collection(db, 'contests'), dataToSave);
            }
            setIsEditing(false);
            setContestForm({ title: '', description: '', rewardText: '', targetExploreCount: 5, isActive: true, image: '', targetGrades: [] });
        } catch (e) {
            console.error(e);
            alert('Error saving contest');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteContest = async (id: string) => {
        if (!confirm('Delete this contest?')) return;
        await deleteDoc(doc(db, 'contests', id));
    };

    // 3. ORDERS
    const handleProcessOrder = async (request: PurchaseRequest, status: 'approved' | 'rejected') => {
        if (!confirm(`Mark order as ${status}?`)) return;
        setLoading(true);
        try {
            await updateDoc(doc(db, 'purchase_requests', request.id), { status });
            // TODO: If approved, maybe deduct stock automatically?
            // User coins should have been deducted or reserved.
        } catch (e) {
            alert('Error updating order');
        } finally {
            setLoading(false);
        }
    };

    // Handle Reward Selection logic
    const handleRewardSelect = (gadgetId: string) => {
        const gadget = gadgets.find(g => g.id === gadgetId);
        if (gadget) {
            setContestForm(prev => ({
                ...prev,
                rewardId: gadgetId,
                rewardText: gadget.name, // Auto-fill text or keep generic? User said "select from gadget... what is teh reward".
                // If using XP, inherit value?
                // User said: "for teh XP score la meme chose we take the value of teh selected gadget"
                // Assuming this refers to targetXP or a new value. The type has targetXP.
                targetXP: gadget.cost
            }));
        } else {
            setContestForm(prev => ({ ...prev, rewardId: '', targetXP: 0 }));
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Sub-Tabs */}
            <div className="flex gap-4 mb-6 border-b border-white/10 pb-4">
                <button
                    onClick={() => setActiveTab('GADGETS')}
                    className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${activeTab === 'GADGETS' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}
                >
                    <ShoppingBag size={16} /> Gadgets
                </button>
                <button
                    onClick={() => setActiveTab('CONTESTS')}
                    className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${activeTab === 'CONTESTS' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}
                >
                    <Trophy size={16} /> Contests
                </button>
                <button
                    onClick={() => setActiveTab('ORDERS')}
                    className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${activeTab === 'ORDERS' ? 'bg-green-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}
                >
                    <Check size={16} /> Orders
                    {purchaseRequests.filter(r => r.status === 'pending').length > 0 && (
                        <span className="bg-red-500 text-white text-xs px-2 rounded-full">
                            {purchaseRequests.filter(r => r.status === 'pending').length}
                        </span>
                    )}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">

                {/* --- GADGETS VIEW --- */}
                {activeTab === 'GADGETS' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">Store Inventory</h3>
                            <button
                                onClick={() => { setIsEditing(true); setGadgetForm({}); }}
                                className="px-4 py-2 bg-indigo-600 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-500"
                            >
                                <Plus size={16} /> Add Gadget
                            </button>
                        </div>

                        {/* List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {gadgets.map(gadget => (
                                <div key={gadget.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex gap-4">
                                    <img src={gadget.image} className="w-20 h-20 rounded-lg object-cover bg-slate-900" />
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-white">{gadget.name}</h4>
                                            <div className="text-yellow-400 font-bold">{gadget.cost} 🪙</div>
                                        </div>
                                        <p className="text-sm text-slate-400 line-clamp-2">{gadget.description}</p>
                                        <div className="mt-2 flex justify-between items-center">
                                            <span className="text-xs text-slate-500 uppercase font-bold">Stock: {gadget.stock}</span>
                                            <div className="flex gap-2">
                                                <button onClick={() => { setGadgetForm(gadget); setIsEditing(true); }} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400">
                                                    <Edit size={14} />
                                                </button>
                                                <button onClick={() => handleDeleteGadget(gadget.id)} className="p-2 hover:bg-red-900/20 rounded-lg text-red-500">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Edit Modal (Inline/Overlay) */}
                        {isEditing && (
                            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                                <div className="bg-slate-900 p-6 rounded-2xl w-full max-w-md border border-slate-700 max-h-[90vh] overflow-y-auto">
                                    <h3 className="text-xl font-bold text-white mb-4">{gadgetForm.id ? 'Edit Gadget' : 'New Gadget'}</h3>
                                    <div className="space-y-3">
                                        <input
                                            className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 text-white"
                                            placeholder="Name"
                                            value={gadgetForm.name || ''}
                                            onChange={e => setGadgetForm({ ...gadgetForm, name: e.target.value })}
                                        />
                                        <textarea
                                            className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 text-white"
                                            placeholder="Description"
                                            value={gadgetForm.description || ''}
                                            onChange={e => setGadgetForm({ ...gadgetForm, description: e.target.value })}
                                        />
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                className="w-1/2 bg-slate-800 p-3 rounded-lg border border-slate-700 text-white"
                                                placeholder="Cost (XP)"
                                                value={gadgetForm.cost || ''}
                                                onChange={e => setGadgetForm({ ...gadgetForm, cost: parseInt(e.target.value) })}
                                            />
                                            <input
                                                type="number"
                                                className="w-1/2 bg-slate-800 p-3 rounded-lg border border-slate-700 text-white"
                                                placeholder="Stock"
                                                value={gadgetForm.stock || ''}
                                                onChange={e => setGadgetForm({ ...gadgetForm, stock: parseInt(e.target.value) })}
                                            />
                                        </div>
                                        <input
                                            className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 text-white"
                                            placeholder="Image URL"
                                            value={gadgetForm.image || ''}
                                            onChange={e => setGadgetForm({ ...gadgetForm, image: e.target.value })}
                                        />
                                        <select
                                            className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 text-white"
                                            value={gadgetForm.type || 'physical'}
                                            onChange={e => setGadgetForm({ ...gadgetForm, type: e.target.value as any })}
                                        >
                                            <option value="physical">Physical Item</option>
                                            <option value="service">Service</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-3 mt-6">
                                        <button onClick={() => setIsEditing(false)} className="flex-1 py-3 bg-slate-800 rounded-lg font-bold text-slate-400 hover:text-white">Cancel</button>
                                        <button onClick={handleSaveGadget} disabled={loading} className="flex-1 py-3 bg-indigo-600 rounded-lg font-bold text-white hover:bg-indigo-500">
                                            {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Save'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- CONTESTS VIEW --- */}
                {activeTab === 'CONTESTS' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">Active Contests</h3>
                            <button
                                onClick={() => { setIsEditing(true); setContestForm({}); }}
                                className="px-4 py-2 bg-orange-600 rounded-lg font-bold flex items-center gap-2 hover:bg-orange-500"
                            >
                                <Plus size={16} /> New Contest
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {contests.map(c => (
                                <div key={c.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex gap-4">
                                    <img src={c.image} className="w-32 h-20 rounded-lg object-cover bg-slate-900" />
                                    <div className="flex-1">
                                        <div className="flex justify-between">
                                            <h4 className="font-bold text-white text-lg">{c.title}</h4>
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${c.isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-500'}`}>
                                                {c.isActive ? 'ACTIVE' : 'ENDED'}
                                            </span>
                                        </div>
                                        <p className="text-slate-400 text-sm">{c.description}</p>
                                        <div className="mt-2 text-sm text-yellow-400 font-bold">Prize: {c.rewardText}</div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button onClick={() => { setContestForm(c); setIsEditing(true); }} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400">
                                            <Edit size={14} />
                                        </button>
                                        <button onClick={() => handleDeleteContest(c.id)} className="p-2 hover:bg-red-900/20 rounded-lg text-red-500">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Contest Edit Modal */}
                        {isEditing && (
                            <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
                                <div className="bg-slate-900 p-6 rounded-2xl w-full max-w-2xl border border-slate-700 max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl relative">
                                    <h3 className="text-xl font-bold text-white mb-4">Contest Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="col-span-full space-y-3">
                                            <input
                                                className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="Title"
                                                value={contestForm.title || ''}
                                                onChange={e => setContestForm({ ...contestForm, title: e.target.value })}
                                            />
                                            <textarea
                                                className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="Description"
                                                value={contestForm.description || ''}
                                                onChange={e => setContestForm({ ...contestForm, description: e.target.value })}
                                            />
                                        </div>

                                        {/* Revised Reward Selection */}
                                        <div className="col-span-full">
                                            <label className="text-sm font-bold text-slate-400 mb-1 block">Reward Selection (Wins Gadget?)</label>
                                            <select
                                                className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 text-white cursor-pointer focus:ring-2 focus:ring-indigo-500 outline-none hover:bg-slate-700 transition-colors"
                                                value={contestForm.rewardId || ''}
                                                onChange={e => {
                                                    console.log('Selected Reward ID:', e.target.value);
                                                    handleRewardSelect(e.target.value);
                                                }}
                                            >
                                                <option value="">-- Manual Text Reward --</option>
                                                <optgroup label="Physical Gadgets">
                                                    {gadgets.filter(g => (g.type || 'physical') === 'physical').map(g => (
                                                        <option key={g.id} value={g.id}>{g.name} ({g.cost}XP)</option>
                                                    ))}
                                                </optgroup>
                                                <optgroup label="Services">
                                                    {gadgets.filter(g => g.type === 'service').map(g => (
                                                        <option key={g.id} value={g.id}>{g.name} ({g.cost}XP)</option>
                                                    ))}
                                                </optgroup>
                                            </select>
                                        </div>

                                        <div className="col-span-full">
                                            <input
                                                className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="Reward Text (e.g. Drone) - Auto-filled from Reward"
                                                value={contestForm.rewardText || ''}
                                                onChange={e => setContestForm({ ...contestForm, rewardText: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <label className="text-sm font-bold text-slate-400 mb-1 block">Required Missions</label>
                                            <input
                                                type="number"
                                                className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="Count"
                                                value={contestForm.targetExploreCount || ''}
                                                onChange={e => setContestForm({ ...contestForm, targetExploreCount: parseInt(e.target.value) })}
                                            />
                                        </div>

                                        <div>
                                            <label className="text-sm font-bold text-slate-400 mb-1 block">Target XP (Inherits Reward Cost)</label>
                                            <input
                                                type="number"
                                                className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="XP Goal"
                                                value={contestForm.targetXP !== undefined ? contestForm.targetXP : ''}
                                                onChange={e => setContestForm({ ...contestForm, targetXP: parseInt(e.target.value) })}
                                            />
                                        </div>

                                        <div className="col-span-full">
                                            <label className="text-sm font-bold text-slate-400 mb-1 block">Banner Image</label>
                                            <div className="flex flex-col gap-2">
                                                {contestForm.image && (
                                                    <img src={contestForm.image} alt="Banner Preview" className="w-full h-32 object-cover rounded-lg border border-slate-700" />
                                                )}
                                                <div className="flex gap-2">
                                                    <label className="flex-1 cursor-pointer bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white rounded-lg p-3 flex items-center justify-center gap-2 transition-colors">
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    const reader = new FileReader();
                                                                    reader.onloadend = () => {
                                                                        setContestForm({ ...contestForm, image: reader.result as string });
                                                                    };
                                                                    reader.readAsDataURL(file);
                                                                }
                                                            }}
                                                        />
                                                        <span className="font-bold text-sm">Upload Banner</span>
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setContestForm({ ...contestForm, image: '' })}
                                                        className="px-4 bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-lg"
                                                    >
                                                        Clear
                                                    </button>
                                                </div>
                                                <input
                                                    className="w-full bg-slate-800 p-3 rounded-lg border border-slate-700 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-xs"
                                                    placeholder="Or paste Image URL..."
                                                    value={contestForm.image?.startsWith('data:') ? '' : contestForm.image || ''}
                                                    onChange={e => setContestForm({ ...contestForm, image: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        {/* Target Grades Selector */}
                                        <div className="col-span-full bg-slate-800 p-4 rounded-xl border border-slate-700">
                                            <label className="text-sm font-bold text-slate-400 mb-3 block">Target Grades</label>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                                                {programs.map(prog => (
                                                    <React.Fragment key={prog.id}>
                                                        {prog.grades?.map((g: any) => (
                                                            <button
                                                                key={g.id}
                                                                type="button"
                                                                onClick={() => toggleGrade(g.id)}
                                                                className={`px-3 py-2 rounded-lg text-xs font-bold text-left transition-all ${contestForm.targetGrades?.includes(g.id)
                                                                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                                                                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                                                    }`}
                                                            >
                                                                {g.name}
                                                            </button>
                                                        ))}
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="col-span-full flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={contestForm.isActive}
                                                onChange={e => setContestForm({ ...contestForm, isActive: e.target.checked })}
                                                className="w-5 h-5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-white font-bold select-none">Is Active</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 mt-6">
                                        <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-3 bg-slate-800 rounded-lg font-bold text-slate-400 hover:text-white transition-colors">Cancel</button>
                                        <button type="button" onClick={handleSaveContest} disabled={loading} className="flex-1 py-3 bg-orange-600 rounded-lg font-bold text-white hover:bg-orange-500 transition-colors">
                                            {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Save'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- ORDERS VIEW --- */}
                {activeTab === 'ORDERS' && (
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-white mb-4">Purchase Requests</h3>

                        {purchaseRequests.length === 0 && <p className="text-slate-500">No orders yet.</p>}

                        {purchaseRequests.map(req => (
                            <div key={req.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${req.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                            req.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                                'bg-red-500/20 text-red-400'
                                            }`}>
                                            {req.status}
                                        </span>
                                        <span className="text-slate-500 text-xs">{new Date(req.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                                    </div>
                                    <h4 className="font-bold text-white">{req.gadgetName} <span className="text-slate-500">by {req.userName}</span></h4>
                                    <div className="text-sm text-yellow-400 font-bold">{req.cost} 🪙</div>
                                </div>

                                {req.status === 'pending' && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleProcessOrder(req, 'approved')}
                                            className="p-2 bg-green-600 rounded hover:bg-green-500 text-white" title="Approve">
                                            <Check size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleProcessOrder(req, 'rejected')}
                                            className="p-2 bg-red-600 rounded hover:bg-red-500 text-white" title="Reject">
                                            <X size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

            </div>
        </div>
    );
};
