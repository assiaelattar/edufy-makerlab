import React, { useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Check, Coins, Edit3, Gift, Loader2, PackageOpen, Plus, ShoppingBag, Sparkles, Trash2, Trophy, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFactoryData } from '../../hooks/useFactoryData';
import { db } from '../../services/firebase';
import type { Contest, Gadget, PurchaseRequest } from '../../types';
import { FactoryEmptyState, FactoryPageHeader, FactoryStat, factoryButton } from '../factory/FactoryPage';

type Tab = 'GADGETS' | 'CONTESTS' | 'ORDERS';
type Editor = 'gadget' | 'contest' | null;

const fieldClass = 'mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100';
const emptyGadget = (): Partial<Gadget> => ({ name: '', description: '', cost: 100, stock: 1, type: 'physical', image: '' });
const emptyContest = (): Partial<Contest> => ({ title: '', description: '', rewardText: '', targetExploreCount: 5, targetXP: 0, isActive: true, image: '', targetGrades: [] });

const dateLabel = (value: any) => {
    const millis = value?.toMillis?.() || (value?.seconds ? value.seconds * 1000 : 0);
    return millis ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(millis)) : 'Date unavailable';
};

export const GamificationManager: React.FC = () => {
    const { userProfile } = useAuth();
    const { gadgets, contests, purchaseRequests, programs } = useFactoryData();
    const organizationId = userProfile?.organizationId;
    const [activeTab, setActiveTab] = useState<Tab>('GADGETS');
    const [editor, setEditor] = useState<Editor>(null);
    const [gadgetForm, setGadgetForm] = useState<Partial<Gadget>>(emptyGadget());
    const [contestForm, setContestForm] = useState<Partial<Contest>>(emptyContest());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'gadget' | 'contest'; id: string; name: string } | null>(null);

    const pendingOrders = useMemo(() => purchaseRequests.filter((request: PurchaseRequest) => request.status === 'pending'), [purchaseRequests]);
    const grades = useMemo(() => programs.flatMap((program: any) =>
        (program.grades || []).map((grade: any) => ({ ...grade, programName: program.name || program.title }))
    ), [programs]);

    const closeEditor = () => {
        setEditor(null);
        setError(null);
    };

    const openGadget = (gadget?: Gadget) => {
        setGadgetForm(gadget ? { ...gadget } : emptyGadget());
        setEditor('gadget');
        setError(null);
    };

    const openContest = (contest?: Contest) => {
        setContestForm(contest ? { ...contest, targetGrades: [...(contest.targetGrades || [])] } : emptyContest());
        setEditor('contest');
        setError(null);
    };

    const handleSaveGadget = async () => {
        if (!organizationId) return setError('Your account is not connected to an organization.');
        if (!gadgetForm.name?.trim()) return setError('Add a reward name before saving.');
        setLoading(true);
        setError(null);
        try {
            const payload = {
                name: gadgetForm.name.trim(),
                description: gadgetForm.description?.trim() || '',
                cost: Math.max(0, Number(gadgetForm.cost) || 0),
                stock: Math.max(0, Number(gadgetForm.stock) || 0),
                type: gadgetForm.type || 'physical',
                image: gadgetForm.image?.trim() || '',
                organizationId,
                updatedAt: serverTimestamp(),
            };
            if (gadgetForm.id) await updateDoc(doc(db, 'gadgets', gadgetForm.id), payload);
            else await addDoc(collection(db, 'gadgets'), { ...payload, createdAt: serverTimestamp() });
            closeEditor();
        } catch (saveError: any) {
            setError(saveError?.message || 'The reward could not be saved.');
        } finally {
            setLoading(false);
        }
    };

    const handleRewardSelect = (gadgetId: string) => {
        const gadget = gadgets.find((item: Gadget) => item.id === gadgetId);
        setContestForm(current => ({
            ...current,
            rewardId: gadgetId || undefined,
            rewardText: gadget?.name || current.rewardText || '',
            targetXP: gadget?.cost ?? current.targetXP ?? 0,
            image: current.image || gadget?.image || '',
        }));
    };

    const toggleGrade = (gradeId: string) => setContestForm(current => {
        const selected = current.targetGrades || [];
        return { ...current, targetGrades: selected.includes(gradeId) ? selected.filter(id => id !== gradeId) : [...selected, gradeId] };
    });

    const handleSaveContest = async () => {
        if (!organizationId) return setError('Your account is not connected to an organization.');
        if (!contestForm.title?.trim()) return setError('Add a contest title before saving.');
        setLoading(true);
        setError(null);
        try {
            const reward = gadgets.find((item: Gadget) => item.id === contestForm.rewardId);
            const payload = {
                title: contestForm.title.trim(),
                description: contestForm.description?.trim() || '',
                rewardId: contestForm.rewardId || '',
                rewardText: contestForm.rewardText?.trim() || '',
                targetExploreCount: Math.max(0, Number(contestForm.targetExploreCount) || 0),
                targetXP: Math.max(0, Number(contestForm.targetXP) || 0),
                targetGrades: contestForm.targetGrades || [],
                image: contestForm.image?.trim() || reward?.image || '',
                isActive: contestForm.isActive !== false,
                organizationId,
                updatedAt: serverTimestamp(),
            };
            if (contestForm.id) await updateDoc(doc(db, 'contests', contestForm.id), payload);
            else await addDoc(collection(db, 'contests'), { ...payload, createdAt: serverTimestamp() });
            closeEditor();
        } catch (saveError: any) {
            setError(saveError?.message || 'The contest could not be saved.');
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setLoading(true);
        setError(null);
        try {
            await deleteDoc(doc(db, deleteTarget.type === 'gadget' ? 'gadgets' : 'contests', deleteTarget.id));
            setDeleteTarget(null);
        } catch (deleteError: any) {
            setError(deleteError?.message || 'The item could not be deleted.');
        } finally {
            setLoading(false);
        }
    };

    const handleProcessOrder = async (request: PurchaseRequest, status: 'approved' | 'rejected') => {
        setLoading(true);
        setError(null);
        try {
            await updateDoc(doc(db, 'purchase_requests', request.id), { status, updatedAt: serverTimestamp() });
        } catch (orderError: any) {
            setError(orderError?.message || 'The order could not be updated.');
        } finally {
            setLoading(false);
        }
    };

    const tabs: Array<{ id: Tab; label: string; icon: typeof Gift; count: number }> = [
        { id: 'GADGETS', label: 'Rewards', icon: Gift, count: gadgets.length },
        { id: 'CONTESTS', label: 'Contests', icon: Trophy, count: contests.length },
        { id: 'ORDERS', label: 'Orders', icon: ShoppingBag, count: pendingOrders.length },
    ];

    return (
        <div className="space-y-6">
            <FactoryPageHeader
                eyebrow="Engagement system"
                title="Rewards & challenges"
                description="Manage the reward catalogue, publish class challenges, and resolve student orders from one queue."
                icon={Sparkles}
                meta={<div className="grid max-w-2xl grid-cols-3 gap-2"><FactoryStat label="Rewards" value={gadgets.length} tone="blue" /><FactoryStat label="Active contests" value={contests.filter((contest: Contest) => contest.isActive).length} tone="amber" /><FactoryStat label="Orders waiting" value={pendingOrders.length} tone="green" /></div>}
            />

            <div className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm" role="tablist" aria-label="Gamification sections">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return <button key={tab.id} role="tab" aria-selected={active} onClick={() => { setActiveTab(tab.id); setError(null); }} className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${active ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}><Icon size={17} aria-hidden="true" /> {tab.label}<span className={`rounded-full px-2 py-0.5 text-[11px] ${active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'}`}>{tab.count}</span></button>;
                })}
            </div>

            {error && !editor && !deleteTarget && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div>}

            {activeTab === 'GADGETS' && (
                <section className="space-y-4" aria-labelledby="rewards-heading">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="rewards-heading" className="text-xl font-black text-slate-950">Reward catalogue</h2><p className="mt-1 text-sm text-slate-500">Physical items and mentor services students can request.</p></div><button onClick={() => openGadget()} className={factoryButton.primary}><Plus size={18} /> Add reward</button></div>
                    {gadgets.length === 0 ? <FactoryEmptyState icon={Gift} title="No rewards yet" description="Add the first reward before publishing a prize-based contest." action={<button onClick={() => openGadget()} className={factoryButton.primary}><Plus size={18} /> Add reward</button>} /> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{gadgets.map((gadget: Gadget) => <article key={gadget.id} className="flex min-h-40 gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100 text-slate-400">{gadget.image ? <img src={gadget.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Gift size={28} />}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h3 className="truncate font-black text-slate-950">{gadget.name}</h3><span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-black text-amber-800"><Coins size={13} />{gadget.cost}</span></div><p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">{gadget.description || 'No description provided.'}</p><div className="mt-3 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wide text-slate-400">{gadget.type} · {gadget.stock} in stock</span><div className="flex gap-1"><button onClick={() => openGadget(gadget)} className="grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100" aria-label={`Edit ${gadget.name}`}><Edit3 size={17} /></button><button onClick={() => setDeleteTarget({ type: 'gadget', id: gadget.id, name: gadget.name })} className="grid min-h-11 min-w-11 place-items-center rounded-xl text-red-600 hover:bg-red-50" aria-label={`Delete ${gadget.name}`}><Trash2 size={17} /></button></div></div></div></article>)}</div>}
                </section>
            )}

            {activeTab === 'CONTESTS' && (
                <section className="space-y-4" aria-labelledby="contests-heading">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="contests-heading" className="text-xl font-black text-slate-950">Class challenges</h2><p className="mt-1 text-sm text-slate-500">Set an outcome, audience, and reward students can understand at a glance.</p></div><button onClick={() => openContest()} className={factoryButton.primary}><Plus size={18} /> New contest</button></div>
                    {contests.length === 0 ? <FactoryEmptyState icon={Trophy} title="No contests published" description="Create a challenge and select the grades that should see it." action={<button onClick={() => openContest()} className={factoryButton.primary}><Plus size={18} /> New contest</button>} /> : <div className="grid gap-3 lg:grid-cols-2">{contests.map((contest: Contest) => <article key={contest.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex gap-4 p-4"><div className="grid h-24 w-32 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100 text-slate-400">{contest.image ? <img src={contest.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Trophy size={30} />}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h3 className="font-black text-slate-950">{contest.title}</h3><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${contest.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{contest.isActive ? 'Active' : 'Paused'}</span></div><p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">{contest.description || 'No description provided.'}</p><p className="mt-2 text-xs font-bold text-amber-800">Reward: {contest.rewardText || 'Not set'}</p></div></div><div className="flex items-center justify-between border-t border-slate-100 px-4 py-2"><span className="text-xs font-semibold text-slate-500">{contest.targetGrades?.length || 0} grade{contest.targetGrades?.length === 1 ? '' : 's'} · {contest.targetExploreCount || 0} missions</span><div className="flex gap-1"><button onClick={() => openContest(contest)} className="grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100" aria-label={`Edit ${contest.title}`}><Edit3 size={17} /></button><button onClick={() => setDeleteTarget({ type: 'contest', id: contest.id, name: contest.title })} className="grid min-h-11 min-w-11 place-items-center rounded-xl text-red-600 hover:bg-red-50" aria-label={`Delete ${contest.title}`}><Trash2 size={17} /></button></div></div></article>)}</div>}
                </section>
            )}

            {activeTab === 'ORDERS' && (
                <section className="space-y-4" aria-labelledby="orders-heading"><div><h2 id="orders-heading" className="text-xl font-black text-slate-950">Student orders</h2><p className="mt-1 text-sm text-slate-500">Review each request before the reward is released.</p></div>{purchaseRequests.length === 0 ? <FactoryEmptyState icon={PackageOpen} title="Order queue is clear" description="New student reward requests will appear here." /> : <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">{purchaseRequests.map((request: PurchaseRequest) => <div key={request.id} className="flex flex-col gap-3 border-b border-slate-100 p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${request.status === 'pending' ? 'bg-amber-50 text-amber-800' : request.status === 'approved' || request.status === 'fulfilled' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{request.status}</span><span className="text-xs text-slate-400">{dateLabel(request.createdAt)}</span></div><h3 className="mt-2 font-black text-slate-950">{request.gadgetName}</h3><p className="text-sm text-slate-500">Requested by {request.userName} · {request.cost} credits</p></div>{request.status === 'pending' && <div className="flex gap-2"><button disabled={loading} onClick={() => handleProcessOrder(request, 'rejected')} className={factoryButton.danger}><X size={17} /> Reject</button><button disabled={loading} onClick={() => handleProcessOrder(request, 'approved')} className={factoryButton.primary}><Check size={17} /> Approve</button></div>}</div>)}</div>}</section>
            )}

            {editor && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="gamification-editor-title"><div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"><header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">{editor === 'gadget' ? 'Reward catalogue' : 'Class challenge'}</p><h2 id="gamification-editor-title" className="mt-1 text-2xl font-black tracking-tight text-slate-950">{editor === 'gadget' ? (gadgetForm.id ? 'Edit reward' : 'Add reward') : (contestForm.id ? 'Edit contest' : 'Create contest')}</h2></div><button onClick={closeEditor} className="grid min-h-11 min-w-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100" aria-label="Close editor"><X size={21} /></button></header><div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
                {editor === 'gadget' ? <><label className="block text-sm font-bold text-slate-700">Reward name<input autoFocus value={gadgetForm.name || ''} onChange={event => setGadgetForm({ ...gadgetForm, name: event.target.value })} className={fieldClass} placeholder="Mini drone" /></label><label className="block text-sm font-bold text-slate-700">Description<textarea value={gadgetForm.description || ''} onChange={event => setGadgetForm({ ...gadgetForm, description: event.target.value })} className={`${fieldClass} min-h-24 py-3`} placeholder="What the learner receives" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-bold text-slate-700">Credit cost<input type="number" min="0" value={gadgetForm.cost ?? 0} onChange={event => setGadgetForm({ ...gadgetForm, cost: Number(event.target.value) })} className={fieldClass} /></label><label className="block text-sm font-bold text-slate-700">Stock<input type="number" min="0" value={gadgetForm.stock ?? 0} onChange={event => setGadgetForm({ ...gadgetForm, stock: Number(event.target.value) })} className={fieldClass} /></label></div><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-bold text-slate-700">Reward type<select value={gadgetForm.type || 'physical'} onChange={event => setGadgetForm({ ...gadgetForm, type: event.target.value as Gadget['type'] })} className={fieldClass}><option value="physical">Physical item</option><option value="service">Mentor service</option></select></label><label className="block text-sm font-bold text-slate-700">Image URL<input value={gadgetForm.image || ''} onChange={event => setGadgetForm({ ...gadgetForm, image: event.target.value })} className={fieldClass} placeholder="https://…" /></label></div></> : <><label className="block text-sm font-bold text-slate-700">Contest title<input autoFocus value={contestForm.title || ''} onChange={event => setContestForm({ ...contestForm, title: event.target.value })} className={fieldClass} placeholder="Robotics explorer challenge" /></label><label className="block text-sm font-bold text-slate-700">Description<textarea value={contestForm.description || ''} onChange={event => setContestForm({ ...contestForm, description: event.target.value })} className={`${fieldClass} min-h-24 py-3`} placeholder="Explain the goal in student-friendly language" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-bold text-slate-700">Linked reward<select value={contestForm.rewardId || ''} onChange={event => handleRewardSelect(event.target.value)} className={fieldClass}><option value="">Manual reward</option>{gadgets.map((gadget: Gadget) => <option key={gadget.id} value={gadget.id}>{gadget.name} · {gadget.cost} credits</option>)}</select></label><label className="block text-sm font-bold text-slate-700">Reward label<input value={contestForm.rewardText || ''} onChange={event => setContestForm({ ...contestForm, rewardText: event.target.value })} className={fieldClass} placeholder="Win a mini drone" /></label></div><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-bold text-slate-700">Missions required<input type="number" min="0" value={contestForm.targetExploreCount ?? 0} onChange={event => setContestForm({ ...contestForm, targetExploreCount: Number(event.target.value) })} className={fieldClass} /></label><label className="block text-sm font-bold text-slate-700">XP target<input type="number" min="0" value={contestForm.targetXP ?? 0} onChange={event => setContestForm({ ...contestForm, targetXP: Number(event.target.value) })} className={fieldClass} /></label></div><label className="block text-sm font-bold text-slate-700">Banner URL<input value={contestForm.image || ''} onChange={event => setContestForm({ ...contestForm, image: event.target.value })} className={fieldClass} placeholder="Uses the reward image when left empty" /></label><fieldset><legend className="text-sm font-bold text-slate-700">Target grades</legend><p className="mt-1 text-xs text-slate-500">Leave all unselected to make the challenge available to every grade.</p><div className="mt-3 grid max-h-44 gap-2 overflow-y-auto sm:grid-cols-2">{grades.map((grade: any) => { const selected = contestForm.targetGrades?.includes(String(grade.id)); return <button key={`${grade.programName}-${grade.id}`} type="button" onClick={() => toggleGrade(String(grade.id))} className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-bold ${selected ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{grade.name}<span className="block text-xs font-normal text-slate-400">{grade.programName}</span></button>; })}</div></fieldset><label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={contestForm.isActive !== false} onChange={event => setContestForm({ ...contestForm, isActive: event.target.checked })} className="h-5 w-5 rounded border-slate-300 text-blue-600" />Publish this contest now</label></>}
                {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div>}
                </div><footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end"><button onClick={closeEditor} className={factoryButton.secondary}>Cancel</button><button disabled={loading} onClick={editor === 'gadget' ? handleSaveGadget : handleSaveContest} className={factoryButton.primary}>{loading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} Save {editor === 'gadget' ? 'reward' : 'contest'}</button></footer></div></div>}

            {deleteTarget && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4" role="alertdialog" aria-modal="true" aria-labelledby="delete-reward-title"><div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"><div className="grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-red-700"><Trash2 size={21} /></div><h2 id="delete-reward-title" className="mt-4 text-xl font-black text-slate-950">Delete “{deleteTarget.name}”?</h2><p className="mt-2 text-sm leading-6 text-slate-500">This removes the item from the instructor catalogue. Existing student history is not changed.</p>{error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}<div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button onClick={() => { setDeleteTarget(null); setError(null); }} className={factoryButton.secondary}>Keep item</button><button disabled={loading} onClick={confirmDelete} className={factoryButton.danger}>{loading ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={17} />} Delete</button></div></div></div>}
        </div>
    );
};
