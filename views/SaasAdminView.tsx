import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, getDocs, addDoc, serverTimestamp, setDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Organization, SubscriptionPlan } from '../types';
import { Building2, Plus, Users, Shield, Check, X, Settings, Activity, ChevronDown, ChevronUp, CreditCard, LayoutDashboard, DollarSign, Package, Trash2, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MODULES } from '../services/moduleRegistry';

export const SaasAdminView: React.FC = () => {
    const { isSuperAdmin, createSecondaryUser } = useAuth();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

    // UI State
    const [activeTab, setActiveTab] = useState<'dashboard' | 'tenants' | 'plans'>('dashboard');
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPlanModal, setShowPlanModal] = useState(false);

    // Edit/Create States
    const [newPlan, setNewPlan] = useState<Partial<SubscriptionPlan>>({
        name: '',
        priceMonthly: 0,
        priceYearly: 0,
        features: [],
        includedModules: ['erp'],
        limits: { students: 100, storage: 5 }
    });

    // Form State
    const [newOrgName, setNewOrgName] = useState('');
    const [newOrgSlug, setNewOrgSlug] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPass, setAdminPass] = useState('');
    const [selectedPlanId, setSelectedPlanId] = useState<string>('');

    // Granular Module State (Overrides)
    const [modules, setModules] = useState<Record<string, boolean>>({ erp: true, makerPro: false, sparkQuest: false });

    const [creating, setCreating] = useState(false);
    const [expandedOrg, setExpandedOrg] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        if (!db) return;
        try {
            const orgsSnap = await getDocs(collection(db, 'organizations'));
            const orgs = orgsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Organization));
            setOrganizations(orgs);

            const plansSnap = await getDocs(collection(db, 'subscriptionPlans'));
            const fetchedPlans = plansSnap.docs.map(d => ({ id: d.id, ...d.data() } as SubscriptionPlan));
            setPlans(fetchedPlans);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- REVENUE LOGIC ---
    const calculateMRR = () => {
        return organizations.reduce((total, org) => {
            if (org.subscription?.interval === 'month') return total + (org.subscription.customPrice || 0);
            if (org.subscription?.interval === 'year') return total + ((org.subscription.customPrice || 0) / 12);
            // Fallback to Plan Price if no custom price
            const plan = plans.find(p => p.id === org.subscription?.planId);
            if (plan && org.subscription?.status === 'active') {
                return total + plan.priceMonthly;
            }
            return total;
        }, 0);
    };

    const handleCreatePlan = async () => {
        if (!newPlan.name) return;
        try {
            await addDoc(collection(db, 'subscriptionPlans'), newPlan);
            alert("Plan Created!");
            setShowPlanModal(false);
            fetchData();
        } catch (e: any) { alert(e.message) }
    };

    const handleDeletePlan = async (id: string) => {
        if (!confirm("Delete this plan?")) return;
        await deleteDoc(doc(db, 'subscriptionPlans', id));
        fetchData();
    };

    const handleCreateOrg = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newOrgName || !adminEmail || !adminPass) return;

        setCreating(true);
        try {
            const orgId = newOrgSlug || newOrgName.toLowerCase().replace(/\s+/g, '-');
            const selectedPlan = plans.find(p => p.id === selectedPlanId);

            // Merge Plan Modules with Toggles
            const finalModules = { ...modules };
            if (selectedPlan) {
                selectedPlan.includedModules.forEach(m => finalModules[m] = true);
            }

            // Calculate Trial / Billing Dates
            const now = new Date();
            let status: 'active' | 'trial' = 'active';
            let nextBilling = new Date(); // Default now

            if (selectedPlan?.trialDays && selectedPlan.trialDays > 0) {
                status = 'trial';
                // Add trial days to current date
                nextBilling.setDate(now.getDate() + selectedPlan.trialDays);
            } else {
                // No trial, billing starts now (or +1 month if we were doing real billing logic)
                // For simple "next billing date" display, usually it's +1 interval
                if (selectedPlan) {
                    selectedPlan.priceYearly ?
                        nextBilling.setFullYear(now.getFullYear() + 1) :
                        nextBilling.setMonth(now.getMonth() + 1);
                }
            }

            const orgRef = await addDoc(collection(db, 'organizations'), {
                name: newOrgName,
                slug: orgId,
                status: 'active', // System status
                createdAt: serverTimestamp(),
                ownerUid: '',
                modules: finalModules,
                subscription: selectedPlan ? {
                    planId: selectedPlan.id,
                    status: status,
                    startDate: serverTimestamp(),
                    nextBillingDate: nextBilling as any, // Simple Date obj works with Firestore usually, but safer to wrap if needed.
                    // We'll stick to Date for client-side math, Firestore SDK handles it.
                    interval: 'month',
                    customPrice: selectedPlan.priceMonthly
                } : undefined,
                limits: selectedPlan?.limits
            });

            // Create Admin
            const uid = await createSecondaryUser(adminEmail, adminPass);

            // User Profile
            await setDoc(doc(db, 'users', uid), {
                uid,
                email: adminEmail,
                name: `Admin ${newOrgName}`,
                role: 'admin',
                organizationId: orgRef.id,
                status: 'active',
                createdAt: serverTimestamp(),
                loginInfo: {
                    email: adminEmail,
                    username: adminEmail.split('@')[0],
                    uid
                }
            });

            await updateDoc(orgRef, { ownerUid: uid });
            await updateDoc(doc(db, 'organizations', orgRef.id), { id: orgRef.id });

            alert(`Tenant Created! Status: ${status.toUpperCase()} ${status === 'trial' ? `(Ends ${nextBilling.toLocaleDateString()})` : ''}`);
            setShowCreateModal(false);
            setNewOrgName('');
            setAdminEmail('');
            setAdminPass('');
            fetchData();

        } catch (error: any) {
            alert('Error creating organization: ' + error.message);
        } finally {
            setCreating(false);
        }
    };

    const toggleModule = async (orgId: string, modKey: string, currentVal: boolean) => {
        try {
            const org = organizations.find(o => o.id === orgId);
            if (!org) return;
            const updatedModules = { ...org.modules, [modKey]: !currentVal };
            await updateDoc(doc(db, 'organizations', orgId), { modules: updatedModules });
            setOrganizations(prev => prev.map(o => o.id === orgId ? { ...o, modules: updatedModules } : o));
        } catch (e) { console.error(e); alert("Update failed"); }
    };

    if (!isSuperAdmin) {
        return (
            <div className="flex items-center justify-center h-full text-white/50">
                <Shield className="w-12 h-12 mb-4 text-red-500" />
                <h2 className="text-xl">Access Denied: Super Admin Only</h2>
            </div>
        );
    }

    return (
        <div className="p-8 text-white min-h-screen">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                        SaaS Commander
                    </h1>
                    <p className="text-white/60">Manage Revenue, Plans, and Tenants</p>
                </div>

                <div className="flex gap-4">
                    <div className="bg-black/30 px-4 py-2 rounded-lg border border-white/10 flex items-center gap-3">
                        <DollarSign className="text-green-400 w-5 h-5" />
                        <div>
                            <p className="text-xs text-white/50">Est. MRR</p>
                            <p className="text-lg font-mono font-bold">${calculateMRR().toFixed(2)}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-all">
                        <Plus className="w-5 h-5" /> New Tenant
                    </button>
                </div>
            </div>

            {/* TABS */}
            <div className="flex gap-6 border-b border-white/10 mb-8">
                <button onClick={() => setActiveTab('dashboard')} className={`pb-4 px-2 font-medium transition-all ${activeTab === 'dashboard' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-white/40 hover:text-white'}`}>Dashboard</button>
                <button onClick={() => setActiveTab('tenants')} className={`pb-4 px-2 font-medium transition-all ${activeTab === 'tenants' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-white/40 hover:text-white'}`}>Tenants & Modules</button>
                <button onClick={() => setActiveTab('plans')} className={`pb-4 px-2 font-medium transition-all ${activeTab === 'plans' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-white/40 hover:text-white'}`}>Subscription Plans</button>
            </div>

            {/* === DASHBOARD TAB === */}
            {activeTab === 'dashboard' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                        <h3 className="text-white/50 text-sm uppercase mb-2">Total Active Tenants</h3>
                        <p className="text-4xl font-bold">{organizations.length}</p>
                    </div>
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                        <h3 className="text-white/50 text-sm uppercase mb-2">Avg. Revenue / Tenant</h3>
                        <p className="text-4xl font-bold text-green-400">${organizations.length ? (calculateMRR() / organizations.length).toFixed(0) : 0}</p>
                    </div>
                </div>
            )}

            {/* === PLANS TAB === */}
            {activeTab === 'plans' && (
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <button onClick={() => setShowPlanModal(true)} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold">
                            <Plus className="w-4 h-4" /> Create Plan
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {plans.map(plan => (
                            <div key={plan.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 relative group hover:border-blue-500/50 transition-all">
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleDeletePlan(plan.id)} className="p-2 hover:bg-red-500/20 rounded-full text-red-400"><Trash2 className="w-4 h-4" /></button>
                                </div>
                                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                                <p className="text-white/50 text-sm mb-4 h-10">{plan.description}</p>
                                <div className="flex items-end gap-1 mb-6">
                                    <span className="text-3xl font-bold">${plan.priceMonthly}</span>
                                    <span className="text-sm text-white/50 mb-1">/mo</span>
                                </div>
                                <div className="space-y-2 mb-6 border-t border-white/5 pt-4">
                                    {plan.features?.map((f, i) => <div key={i} className="flex gap-2 text-sm text-white/70"><Check className="w-4 h-4 text-green-400" /> {f}</div>)}
                                </div>
                                <div className="text-xs text-white/40">
                                    Includes: {plan.includedModules.join(', ')}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* === TENANTS TAB (Previous View) === */}
            {activeTab === 'tenants' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {organizations.map(org => (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={org.id}
                            className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl hover:border-purple-500/30 transition-all flex flex-col">

                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-purple-500/20 rounded-xl">
                                        <Building2 className="w-6 h-6 text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{org.name}</h3>
                                        <p className="text-xs text-white/40 uppercase tracking-widest">{org.slug}</p>
                                    </div>
                                </div>
                                <div className={`px-2 py-1 rounded text-xs font-bold ${org.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {org.status}
                                </div>
                            </div>

                            {/* Subs Info */}
                            {org.subscription && (
                                <div className="mb-4 bg-blue-500/10 p-3 rounded-lg flex justify-between items-center">
                                    <span className="text-xs text-blue-300 uppercase font-bold tracking-wider">
                                        {plans.find(p => p.id === org.subscription?.planId)?.name || 'Custom Plan'}
                                    </span>
                                    <span className="font-mono font-bold text-sm">${org.subscription.customPrice || org.subscription.priceMonthly}/mo</span>
                                </div>
                            )}

                            <div className="space-y-4 mb-6 grow">
                                <div className="flex items-center gap-2 text-sm text-white/60">
                                    <Users className="w-4 h-4" />
                                    <span>Admin: <span className="text-white/80 font-mono text-xs">{org.ownerUid?.slice(0, 8)}...</span></span>
                                </div>
                            </div>

                            {/* MODULE TOGGLES */}
                            <div className="bg-black/20 rounded-xl p-4">
                                <div
                                    className="flex items-center justify-between cursor-pointer"
                                    onClick={() => setExpandedOrg(expandedOrg === org.id ? null : org.id)}
                                >
                                    <h4 className="text-xs font-bold text-white/40 uppercase flex items-center gap-2">
                                        <Activity className="w-3 h-3" />
                                        Enabled Modules ({Object.values(org.modules || {}).filter(Boolean).length})
                                    </h4>
                                    {expandedOrg === org.id ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                                </div>

                                {/* Always show Core Apps */}
                                <div className="mt-3 space-y-2 border-b border-white/5 pb-3">
                                    {['erp', 'makerPro', 'sparkQuest'].map(appKey => (
                                        <div key={appKey} className="flex justify-between items-center text-sm">
                                            <span className="capitalize font-bold text-white/80">{appKey.replace(/([A-Z])/g, ' $1').trim()}</span>
                                            <button
                                                onClick={() => toggleModule(org.id, appKey, (org.modules as any)[appKey])}
                                                className={`w-9 h-5 rounded-full relative transition-colors ${(org.modules as any)[appKey] ? 'bg-purple-500' : 'bg-white/10'}`}>
                                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all ${(org.modules as any)[appKey] ? 'translate-x-4' : 'translate-x-0'}`} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* Collapsible Granular List */}
                                <AnimatePresence>
                                    {expandedOrg === org.id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-3">
                                                {MODULES
                                                    .filter(m => !['erp', 'makerPro', 'sparkQuest'].includes(m.id)) // Exclude aggregates if they exist in registry (they don't, but safety)
                                                    .map(mod => (
                                                        <div key={mod.id} className="flex justify-between items-center text-xs">
                                                            <span className="text-white/60 truncate pr-2" title={mod.label}>{mod.label}</span>
                                                            <button
                                                                onClick={() => toggleModule(org.id, mod.id, (org.modules as any)[mod.id])}
                                                                className={`shrink-0 w-7 h-4 rounded-full relative transition-colors ${(org.modules as any)[mod.id] ? 'bg-blue-500' : 'bg-white/10'}`}>
                                                                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-all ${(org.modules as any)[mod.id] ? 'translate-x-3' : 'translate-x-0'}`} />
                                                            </button>
                                                        </div>
                                                    ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* CREATE PLAN MODAL */}
            <AnimatePresence>
                {showPlanModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                        <div className="bg-[#1a1a1a] p-8 rounded-2xl w-full max-w-lg border border-white/10">
                            <h2 className="text-xl font-bold mb-4">Create Subscription Plan</h2>
                            <div className="space-y-4">
                                <input placeholder="Plan Name (e.g. Starter)" className="w-full bg-white/5 p-3 rounded" value={newPlan.name} onChange={e => setNewPlan({ ...newPlan, name: e.target.value })} />
                                <div className="flex gap-4">
                                    <input type="number" placeholder="Monthly Price" className="w-1/2 bg-white/5 p-3 rounded" value={newPlan.priceMonthly} onChange={e => setNewPlan({ ...newPlan, priceMonthly: Number(e.target.value) })} />
                                    <input type="number" placeholder="Yearly Price" className="w-1/2 bg-white/5 p-3 rounded" value={newPlan.priceYearly} onChange={e => setNewPlan({ ...newPlan, priceYearly: Number(e.target.value) })} />
                                </div>
                                <textarea placeholder="Description" className="w-full bg-white/5 p-3 rounded" value={newPlan.description} onChange={e => setNewPlan({ ...newPlan, description: e.target.value })} />
                                <button onClick={handleCreatePlan} className="w-full bg-green-600 p-3 rounded font-bold">Save Plan</button>
                                <button onClick={() => setShowPlanModal(false)} className="w-full text-white/50 p-2">Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>

            {/* CREATE ORG MODAL */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh]">

                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold">New Tenant Provisioning</h2>
                                <button onClick={() => setShowCreateModal(false)}><X className="w-6 h-6 text-white/50 hover:text-white" /></button>
                            </div>

                            <form onSubmit={handleCreateOrg} className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm text-white/60 mb-1">Academy Name</label>
                                            <input value={newOrgName} onChange={e => setNewOrgName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 focus:border-purple-500 outline-none" placeholder="e.g. Future Tech School" />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-white/60 mb-1">Slug (ID)</label>
                                            <input value={newOrgSlug} onChange={e => setNewOrgSlug(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 focus:border-purple-500 outline-none" placeholder="future-tech" />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm text-white/60 mb-1">Admin Email</label>
                                            <input value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 focus:border-purple-500 outline-none" placeholder="admin@school.com" />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-white/60 mb-1">Initial Password</label>
                                            <input value={adminPass} onChange={e => setAdminPass(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 focus:border-purple-500 outline-none" placeholder="******" type="password" />
                                        </div>
                                    </div>
                                </div>

                                {/* SELECT PLAN */}
                                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                                    <label className="block text-xs font-bold text-white/40 uppercase mb-4">Subscription Plan</label>
                                    <div className="grid grid-cols-3 gap-4">
                                        {plans.map(p => (
                                            <div
                                                key={p.id}
                                                onClick={() => setSelectedPlanId(p.id)}
                                                className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedPlanId === p.id ? 'bg-purple-500/20 border-purple-500' : 'bg-black/20 border-white/5 hover:bg-white/5'}`}>
                                                <h4 className="font-bold">{p.name}</h4>
                                                <p className="text-xl font-mono">${p.priceMonthly}<span className="text-xs text-white/50">/mo</span></p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-white/5 rounded-xl p-6">
                                    <label className="block text-xs font-bold text-white/40 uppercase mb-4">Module Access Control (Custom Overrides)</label>

                                    {/* CORE APPS */}
                                    <div className="flex gap-6 mb-6 pb-6 border-b border-white/10">
                                        {['erp', 'makerPro', 'sparkQuest'].map(appKey => (
                                            <label key={appKey} className="flex items-center gap-2 cursor-pointer bg-black/20 px-3 py-2 rounded-lg border border-white/5 hover:border-white/20 transition-all">
                                                <input
                                                    type="checkbox"
                                                    checked={!!modules[appKey]}
                                                    onChange={e => setModules({ ...modules, [appKey]: e.target.checked })}
                                                    className="accent-purple-500 w-4 h-4"
                                                />
                                                <span className="font-bold capitalize">{appKey.replace(/([A-Z])/g, ' $1').trim()}</span>
                                            </label>
                                        ))}
                                    </div>

                                    {/* GRANULAR MODULES */}
                                    <div className="grid grid-cols-3 gap-4">
                                        {MODULES.map(mod => (
                                            <label key={mod.id} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-2 rounded transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={!!modules[mod.id]}
                                                    onChange={e => setModules({ ...modules, [mod.id]: e.target.checked })}
                                                    className="accent-blue-500 w-3 h-3"
                                                />
                                                <span className="text-sm text-white/80">{mod.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    disabled={creating}
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 p-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-50">
                                    {creating ? 'Provisioning Tenant...' : 'Provision Tenant'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
