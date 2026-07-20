import React, { useEffect, useMemo, useState } from 'react';
import {
    Activity,
    BadgeCheck,
    Boxes,
    Building2,
    Check,
    ChevronDown,
    ChevronUp,
    CircleDollarSign,
    CreditCard,
    Edit3,
    EyeOff,
    KeyRound,
    LayoutDashboard,
    Loader2,
    LogIn,
    Package,
    Plus,
    Save,
    Search,
    Shield,
    ShieldCheck,
    Sparkles,
    Trash2,
    UserPlus,
    Users,
    X
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { useConfirm } from '../context/ConfirmContext';
import { db } from '../services/firebase';
import {
    mergeCatalogPolicies,
    type AtlasCatalogItem
} from '../services/entitlementService';
import { AtlasCatalogPolicy, Organization, SubscriptionPlan } from '../types';
import {
    AtlasActionButton,
    AtlasCommandHeader,
    AtlasEmptyState,
    AtlasSectionHeader,
    AtlasSignalCard,
    AtlasToolbar
} from '../components/atlas/AtlasSurface';

type AdminTab = 'dashboard' | 'tenants' | 'catalog' | 'plans';
type CatalogDrafts = Record<string, string>;

const tabs: Array<{ id: AdminTab; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'tenants', label: 'Tenants', icon: Building2 },
    { id: 'catalog', label: 'Catalog', icon: Boxes },
    { id: 'plans', label: 'Plans', icon: CreditCard }
];

const emptyPlan = (): Partial<SubscriptionPlan> => ({
    name: '',
    description: '',
    currency: 'MAD',
    priceMonthly: 0,
    priceYearly: 0,
    trialDays: 14,
    features: [],
    includedModules: [],
    limits: { students: 100, storage: 5 },
    status: 'active'
});

const planIncludesCatalogItem = (plan: SubscriptionPlan | undefined, item: AtlasCatalogItem) => {
    const included = plan?.includedModules || [];
    if (included.includes(item.id)) return true;
    return item.kind === 'module' && item.module?.appId === 'edufy-core' && included.includes('erp');
};

const formatMoney = (value: number, currency = 'MAD') =>
    new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(value || 0) + ` ${currency}`;

export const SaasAdminView: React.FC = () => {
    const { isSuperAdmin, isPlatformBootstrapAdmin, createSecondaryUser, switchOrganization, currentOrganization, userProfile } = useAuth();
    const { navigateTo } = useAppContext();
    const { confirm, alert: showAlert } = useConfirm();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [catalogPolicies, setCatalogPolicies] = useState<AtlasCatalogPolicy[]>([]);
    const [catalogPriceDrafts, setCatalogPriceDrafts] = useState<CatalogDrafts>({});
    const [catalogSaving, setCatalogSaving] = useState<string | null>(null);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [tenantSearch, setTenantSearch] = useState('');
    const [planDraft, setPlanDraft] = useState<Partial<SubscriptionPlan>>(emptyPlan());
    const [planFeatures, setPlanFeatures] = useState('');
    const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
    const [savingPlan, setSavingPlan] = useState(false);
    const [newOrgName, setNewOrgName] = useState('');
    const [newOrgSlug, setNewOrgSlug] = useState('');
    const [tenantAdminEmail, setTenantAdminEmail] = useState('');
    const [tenantAdminPass, setTenantAdminPass] = useState('');
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [modules, setModules] = useState<Record<string, boolean>>({});
    const [creating, setCreating] = useState(false);
    const [expandedOrg, setExpandedOrg] = useState<string | null>(null);
    const [updatingEntitlement, setUpdatingEntitlement] = useState<string | null>(null);
    const [platformAdminName, setPlatformAdminName] = useState('');
    const [platformAdminEmail, setPlatformAdminEmail] = useState('');
    const [platformAdminPass, setPlatformAdminPass] = useState('');
    const [creatingPlatformAdmin, setCreatingPlatformAdmin] = useState(false);

    const catalog = useMemo(() => mergeCatalogPolicies(catalogPolicies), [catalogPolicies]);
    const tenantOrganizations = useMemo(() => organizations.filter(organization => organization.id !== 'atlas-platform'), [organizations]);

    useEffect(() => {
        if (userProfile?.role === 'super_admin' && currentOrganization?.id && currentOrganization.id !== 'atlas-platform') {
            switchOrganization('atlas-platform').catch(error => console.warn('Unable to restore the Atlas platform workspace.', error));
        }
    }, [currentOrganization?.id, userProfile?.role]);

    const fetchData = async () => {
        if (!db) return;
        try {
            const [orgsSnap, plansSnap, catalogSnap] = await Promise.all([
                getDocs(collection(db, 'organizations')),
                getDocs(collection(db, 'subscriptionPlans')),
                getDocs(collection(db, 'moduleCatalog'))
            ]);
            setOrganizations(orgsSnap.docs.map(item => ({ id: item.id, ...item.data() } as Organization)));
            setPlans(plansSnap.docs.map(item => ({ id: item.id, ...item.data() } as SubscriptionPlan)));
            setCatalogPolicies(catalogSnap.docs.map(item => ({ id: item.id, ...item.data() } as AtlasCatalogPolicy)));
        } catch (error) {
            console.error('Error fetching SaaS data:', error);
            showAlert('Platform data unavailable', 'Tenants, plans, or catalog policy could not be loaded. Check the connection and try again.', 'danger');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        setCatalogPriceDrafts(previous => {
            const next = { ...previous };
            catalog.forEach(item => {
                if (next[item.id] === undefined) next[item.id] = String(item.priceMonthly || 0);
            });
            return next;
        });
    }, [catalog]);

    const mrr = tenantOrganizations.reduce((total, org) => {
        if (org.subscription?.status !== 'active') return total;
        const plan = plans.find(item => item.id === org.subscription?.planId);
        const amount = org.subscription.customPrice ?? plan?.priceMonthly ?? 0;
        return total + (org.subscription.interval === 'year' ? amount / 12 : amount);
    }, 0);
    const activeTenants = tenantOrganizations.filter(org => org.status === 'active').length;
    const trialTenants = tenantOrganizations.filter(org => org.subscription?.status === 'trial').length;
    const publishedCatalogCount = catalog.filter(item => item.isPublished).length;

    const filteredOrganizations = useMemo(() => {
        const query = tenantSearch.trim().toLowerCase();
        if (!query) return tenantOrganizations;
        return tenantOrganizations.filter(org => org.name.toLowerCase().includes(query) || org.slug?.toLowerCase().includes(query));
    }, [tenantOrganizations, tenantSearch]);

    const filteredCatalog = useMemo(() => {
        const query = catalogSearch.trim().toLowerCase();
        if (!query) return catalog;
        return catalog.filter(item => [item.name, item.description, item.category, item.kind].some(value => value.toLowerCase().includes(query)));
    }, [catalog, catalogSearch]);

    const openCreatePlan = () => {
        setEditingPlanId(null);
        setPlanDraft(emptyPlan());
        setPlanFeatures('');
        setShowPlanModal(true);
    };

    const openEditPlan = (plan: SubscriptionPlan) => {
        setEditingPlanId(plan.id);
        setPlanDraft({ ...plan, includedModules: [...(plan.includedModules || [])], limits: { ...plan.limits } });
        setPlanFeatures((plan.features || []).join('\n'));
        setShowPlanModal(true);
    };

    const handleSavePlan = async () => {
        if (!planDraft.name?.trim() || !db) return;
        setSavingPlan(true);
        try {
            const planRef = editingPlanId
                ? doc(db, 'subscriptionPlans', editingPlanId)
                : doc(collection(db, 'subscriptionPlans'));
            const payload = {
                name: planDraft.name.trim(),
                description: planDraft.description?.trim() || '',
                currency: planDraft.currency || 'MAD',
                priceMonthly: Number(planDraft.priceMonthly) || 0,
                priceYearly: Number(planDraft.priceYearly) || 0,
                trialDays: Math.max(0, Number(planDraft.trialDays) || 0),
                features: planFeatures.split(/[\n,]+/).map(feature => feature.trim()).filter(Boolean),
                includedModules: planDraft.includedModules || [],
                limits: {
                    students: Math.max(0, Number(planDraft.limits?.students) || 0),
                    storage: Math.max(0, Number(planDraft.limits?.storage) || 0)
                },
                status: planDraft.status || 'active',
                updatedAt: serverTimestamp()
            };
            await setDoc(planRef, payload, { merge: true });
            setShowPlanModal(false);
            await fetchData();
            showAlert(editingPlanId ? 'Plan updated' : 'Plan created', `${payload.name} is ready for tenant assignment.`, 'success');
        } catch (error: any) {
            showAlert('Plan not saved', error.message || 'The subscription plan could not be saved.', 'danger');
        } finally {
            setSavingPlan(false);
        }
    };

    const handleDeletePlan = async (id: string) => {
        if (!db) return;
        const plan = plans.find(item => item.id === id);
        const shouldDelete = await confirm({
            title: `Delete ${plan?.name || 'this subscription plan'}?`,
            message: 'Existing tenant subscriptions keep their current data, but the plan can no longer be assigned.',
            confirmText: 'Delete plan',
            cancelText: 'Cancel',
            variant: 'danger'
        });
        if (!shouldDelete) return;
        try {
            await deleteDoc(doc(db, 'subscriptionPlans', id));
            await fetchData();
            showAlert('Plan deleted', `${plan?.name || 'The plan'} was removed.`, 'success');
        } catch (error: any) {
            showAlert('Plan not deleted', error.message || 'The plan could not be removed.', 'danger');
        }
    };

    const updateCatalogPolicy = async (item: AtlasCatalogItem, patch: Partial<AtlasCatalogPolicy>) => {
        if (!db) return;
        const previousPolicies = catalogPolicies;
        const current: AtlasCatalogPolicy = {
            id: item.id,
            kind: item.kind,
            billing: item.billing,
            isPublished: item.isPublished,
            canSelfActivate: item.canSelfActivate,
            priceMonthly: item.priceMonthly,
            currency: 'MAD'
        };
        const next = { ...current, ...patch };
        setCatalogPolicies(previous => [...previous.filter(policy => policy.id !== item.id), next]);
        setCatalogSaving(item.id);
        try {
            await setDoc(doc(db, 'moduleCatalog', item.id), { ...next, updatedAt: serverTimestamp() }, { merge: true });
        } catch (error: any) {
            setCatalogPolicies(previousPolicies);
            setCatalogPriceDrafts(previous => ({ ...previous, [item.id]: String(item.priceMonthly || 0) }));
            showAlert('Catalog change not saved', error.message || `${item.name} could not be updated.`, 'danger');
        } finally {
            setCatalogSaving(currentSaving => currentSaving === item.id ? null : currentSaving);
        }
    };

    const handleCreateOrg = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!newOrgName || !tenantAdminEmail || !tenantAdminPass || !db) return;
        setCreating(true);
        try {
            const slug = newOrgSlug || newOrgName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const selectedPlan = plans.find(plan => plan.id === selectedPlanId);
            const finalModules = { ...modules };
            selectedPlan?.includedModules.forEach(moduleId => { finalModules[moduleId] = true; });
            const nextBilling = new Date();
            const subscriptionStatus: 'active' | 'trial' = selectedPlan?.trialDays ? 'trial' : 'active';
            if (selectedPlan?.trialDays) nextBilling.setDate(nextBilling.getDate() + selectedPlan.trialDays);
            else nextBilling.setMonth(nextBilling.getMonth() + 1);

            const orgRef = doc(collection(db, 'organizations'));
            await setDoc(orgRef, {
                id: orgRef.id,
                name: newOrgName.trim(),
                slug,
                status: 'active',
                createdAt: serverTimestamp(),
                ownerUid: '',
                modules: finalModules,
                installedApps: [],
                subscription: selectedPlan ? {
                    planId: selectedPlan.id,
                    status: subscriptionStatus,
                    startDate: serverTimestamp(),
                    nextBillingDate: nextBilling,
                    interval: 'month',
                    customPrice: selectedPlan.priceMonthly,
                    addOns: []
                } : undefined,
                limits: selectedPlan?.limits
            });

            const uid = await createSecondaryUser(tenantAdminEmail, tenantAdminPass);
            await setDoc(doc(db, 'users', uid), {
                uid,
                email: tenantAdminEmail,
                name: `Admin ${newOrgName.trim()}`,
                role: 'admin',
                organizationId: orgRef.id,
                status: 'active',
                createdAt: serverTimestamp()
            });
            await updateDoc(orgRef, { ownerUid: uid });

            setShowCreateModal(false);
            setNewOrgName('');
            setNewOrgSlug('');
            setTenantAdminEmail('');
            setTenantAdminPass('');
            setSelectedPlanId('');
            setModules({});
            await fetchData();
            showAlert('Tenant provisioned', `${newOrgName} is active and ready for its academy team.`, 'success');
        } catch (error: any) {
            showAlert('Tenant not provisioned', error.message || 'The organization could not be created.', 'danger');
        } finally {
            setCreating(false);
        }
    };

    const toggleModule = async (orgId: string, moduleId: string, currentValue: boolean) => {
        if (!db) return;
        const org = organizations.find(item => item.id === orgId);
        if (!org) return;
        const updatedModules = { ...org.modules, [moduleId]: !currentValue };
        setUpdatingEntitlement(`${orgId}:${moduleId}:active`);
        try {
            await updateDoc(doc(db, 'organizations', orgId), { modules: updatedModules });
            setOrganizations(previous => previous.map(item => item.id === orgId ? { ...item, modules: updatedModules } : item));
        } catch (error: any) {
            showAlert('Module state unchanged', error.message || 'The module activation could not be updated.', 'danger');
        } finally {
            setUpdatingEntitlement(null);
        }
    };

    const togglePaidAddOn = async (org: Organization, itemId: string) => {
        if (!db || !org.subscription) return;
        const currentAddOns = org.subscription.addOns || [];
        const isGranted = currentAddOns.includes(itemId);
        const nextAddOns = isGranted ? currentAddOns.filter(id => id !== itemId) : [...currentAddOns, itemId];
        setUpdatingEntitlement(`${org.id}:${itemId}:grant`);
        try {
            await updateDoc(doc(db, 'organizations', org.id), { 'subscription.addOns': nextAddOns });
            setOrganizations(previous => previous.map(candidate => candidate.id === org.id
                ? { ...candidate, subscription: { ...candidate.subscription!, addOns: nextAddOns } }
                : candidate));
            showAlert(isGranted ? 'Add-on revoked' : 'Add-on granted', `${catalog.find(item => item.id === itemId)?.name || itemId} access was updated for ${org.name}.`, 'success');
        } catch (error: any) {
            showAlert('Add-on unchanged', error.message || 'The paid add-on grant could not be updated.', 'danger');
        } finally {
            setUpdatingEntitlement(null);
        }
    };

    const handleCreatePlatformAdmin = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!db || !platformAdminName.trim() || !platformAdminEmail.trim() || platformAdminPass.length < 6) return;
        const password = platformAdminPass;
        setPlatformAdminPass('');
        setCreatingPlatformAdmin(true);
        try {
            const uid = await createSecondaryUser(platformAdminEmail.trim(), password);
            await setDoc(doc(db, 'organizations', 'atlas-platform'), {
                id: 'atlas-platform',
                name: 'Atlas Platform',
                slug: 'atlas-platform',
                ownerUid: uid,
                status: 'active',
                modules: { dashboard: true, settings: true },
                updatedAt: serverTimestamp(),
                createdAt: serverTimestamp()
            }, { merge: true });
            await setDoc(doc(db, 'users', uid), {
                uid,
                email: platformAdminEmail.trim(),
                name: platformAdminName.trim(),
                role: 'super_admin',
                organizationId: 'atlas-platform',
                status: 'active',
                createdAt: serverTimestamp()
            });
            await setDoc(doc(db, 'platformSettings', 'core'), {
                bootstrapComplete: true,
                ownerUid: uid,
                ownerEmail: platformAdminEmail.trim(),
                updatedAt: serverTimestamp()
            }, { merge: true });
            setShowAdminModal(false);
            setPlatformAdminName('');
            setPlatformAdminEmail('');
            showAlert(
                isPlatformBootstrapAdmin ? 'Atlas founder account created' : 'Platform admin created',
                isPlatformBootstrapAdmin
                    ? 'MakerLab is now a regular tenant. Sign out and use the new founder account to enter the Atlas control plane.'
                    : 'The platform account is active. Share access details through your secure internal channel.',
                'success'
            );
        } catch (error: any) {
            showAlert('Platform admin not created', error.message || 'The account could not be created.', 'danger');
        } finally {
            setCreatingPlatformAdmin(false);
        }
    };

    const openTenantWorkspace = async (organization: Organization) => {
        try {
            const switched = await switchOrganization(organization.id);
            if (!switched) throw new Error('The workspace could not be selected.');
            navigateTo('dashboard');
        } catch (error: any) {
            showAlert('Workspace unavailable', error.message || `${organization.name} could not be opened.`, 'danger');
        }
    };

    if (!isSuperAdmin) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <AtlasEmptyState title="Super admin access required" description="This control plane is restricted to platform administrators." icon={Shield} />
            </div>
        );
    }

    const inputClass = 'h-10 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10';
    const labelClass = 'mb-1.5 block text-[11px] font-bold text-slate-400';
    const toggleClass = (enabled: boolean) => `relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 ${enabled ? 'bg-teal-500' : 'bg-white/10'}`;

    return (
        <div className="flex min-h-full flex-col gap-5 pb-24 text-white md:pb-8">
            <AtlasCommandHeader
                eyebrow="Atlas platform"
                title="SaaS control plane"
                description="Shape the product catalog, package plans, and grant precise access across every academy."
                icon={Shield}
                badges={<span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[10px] font-bold text-amber-200">Super admin</span>}
                actions={<>
                    <AtlasActionButton icon={UserPlus} onClick={() => setShowAdminModal(true)}>{isPlatformBootstrapAdmin ? 'Create founder account' : 'Platform admin'}</AtlasActionButton>
                    <AtlasActionButton icon={Plus} variant="primary" onClick={() => setShowCreateModal(true)}>New tenant</AtlasActionButton>
                </>}
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <AtlasSignalCard label="Monthly revenue" value={formatMoney(mrr)} detail="Active recurring revenue" icon={CircleDollarSign} tone="emerald" />
                <AtlasSignalCard label="Active tenants" value={activeTenants} detail={`${tenantOrganizations.length} customer organizations`} icon={Building2} tone="teal" />
                <AtlasSignalCard label="Published catalog" value={publishedCatalogCount} detail={`${catalog.length} modules and apps`} icon={Boxes} tone="blue" />
                <AtlasSignalCard label="Trials" value={trialTenants} detail="Currently evaluating" icon={Activity} tone="amber" />
            </div>

            <nav aria-label="Platform sections" className="flex gap-1 overflow-x-auto rounded-lg border border-white/10 bg-slate-950/55 p-1">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 ${activeTab === tab.id ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'}`}>
                            <Icon size={15} /> {tab.label}
                        </button>
                    );
                })}
            </nav>

            {loading ? (
                <div className="flex min-h-64 items-center justify-center text-slate-500"><Loader2 className="animate-spin" size={22} /></div>
            ) : activeTab === 'dashboard' ? (
                <div className="space-y-5">
                    <AtlasSectionHeader title="Platform pulse" description="Commercial health and tenant distribution at a glance." icon={Activity} />
                    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                        <div className="overflow-hidden rounded-lg border border-white/10 bg-slate-900/70">
                            <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-white/10 px-4 py-3 text-[10px] font-bold uppercase text-slate-500"><span>Tenant</span><span>Plan</span><span>Status</span></div>
                            {tenantOrganizations.slice(0, 6).map(org => (
                                <div key={org.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-white/[0.06] px-4 py-3 last:border-0">
                                    <div className="min-w-0"><div className="truncate text-sm font-bold text-white">{org.name}</div><div className="truncate font-mono text-[10px] text-slate-600">{org.slug}</div></div>
                                    <span className="text-xs text-slate-400">{plans.find(plan => plan.id === org.subscription?.planId)?.name || 'Custom'}</span>
                                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${org.subscription?.status === 'trial' ? 'bg-amber-300/10 text-amber-200' : 'bg-emerald-400/10 text-emerald-300'}`}>{org.subscription?.status || org.status}</span>
                                </div>
                            ))}
                            {tenantOrganizations.length === 0 && <AtlasEmptyState title="No tenants yet" description="Provision the first academy to begin operating the platform." icon={Building2} />}
                        </div>
                        <div className="rounded-lg border border-white/10 bg-slate-900/70 p-5">
                            <AtlasSectionHeader title="Plan distribution" description="Organizations assigned to each offer." icon={Package} />
                            <div className="mt-4 space-y-3">
                                {plans.map(plan => {
                                    const count = tenantOrganizations.filter(org => org.subscription?.planId === plan.id).length;
                                    const share = tenantOrganizations.length ? Math.round((count / tenantOrganizations.length) * 100) : 0;
                                    return <div key={plan.id}><div className="mb-1 flex items-center justify-between text-xs"><span className="font-bold text-slate-300">{plan.name}</span><span className="font-mono text-slate-500">{count} / {share}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-teal-400" style={{ width: `${share}%` }} /></div></div>;
                                })}
                                {plans.length === 0 && <p className="text-xs text-slate-500">Create a plan to begin tracking distribution.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'catalog' ? (
                <div className="space-y-5">
                    <AtlasSectionHeader title="Product catalog" description="One commercial policy for every Atlas module and connected app." icon={Boxes} />
                    <AtlasToolbar leading={<div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input type="search" aria-label="Search product catalog" value={catalogSearch} onChange={event => setCatalogSearch(event.target.value)} placeholder="Search modules, apps, or categories" className={`${inputClass} pl-10`} /></div>}><span className="text-xs font-bold text-slate-500">{filteredCatalog.length} items</span></AtlasToolbar>
                    <div className="overflow-hidden rounded-lg border border-white/10 bg-slate-900/65">
                        <div className="hidden grid-cols-[minmax(220px,1.6fr)_120px_132px_108px_116px] gap-4 border-b border-white/10 px-4 py-3 text-[10px] font-bold uppercase text-slate-500 lg:grid">
                            <span>Product</span><span>Billing</span><span>Monthly price</span><span>Published</span><span>Self-activate</span>
                        </div>
                        {filteredCatalog.map(item => {
                            const saving = catalogSaving === item.id;
                            return (
                                <div key={item.id} className="grid gap-4 border-b border-white/[0.07] p-4 last:border-0 lg:grid-cols-[minmax(220px,1.6fr)_120px_132px_108px_116px] lg:items-center">
                                    <div className="flex min-w-0 gap-3">
                                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${item.kind === 'app' ? 'border-amber-300/20 bg-amber-300/10 text-amber-200' : 'border-teal-300/20 bg-teal-300/10 text-teal-200'}`}>{item.kind === 'app' ? <Sparkles size={17} /> : <Package size={17} />}</div>
                                        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-bold text-white">{item.name}</h3><span className="rounded border border-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500">{item.kind}</span>{saving && <Loader2 size={12} className="animate-spin text-teal-300" />}</div><p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">{item.description}</p></div>
                                    </div>
                                    <label><span className="mb-1 block text-[10px] font-bold uppercase text-slate-600 lg:hidden">Billing</span><select value={item.billing} onChange={event => updateCatalogPolicy(item, { billing: event.target.value as AtlasCatalogPolicy['billing'] })} className={`${inputClass} h-9 text-xs`}><option value="included">Included</option><option value="free">Free</option><option value="paid">Paid add-on</option></select></label>
                                    <label><span className="mb-1 block text-[10px] font-bold uppercase text-slate-600 lg:hidden">Monthly MAD</span><div className="relative"><input type="number" min="0" disabled={item.billing !== 'paid'} value={catalogPriceDrafts[item.id] ?? '0'} onChange={event => setCatalogPriceDrafts(previous => ({ ...previous, [item.id]: event.target.value }))} onBlur={() => updateCatalogPolicy(item, { priceMonthly: Math.max(0, Number(catalogPriceDrafts[item.id]) || 0), currency: 'MAD' })} className={`${inputClass} h-9 pr-12 text-xs disabled:cursor-not-allowed disabled:opacity-40`} /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-600">MAD</span></div></label>
                                    <div className="flex items-center justify-between lg:justify-start"><span className="text-[10px] font-bold uppercase text-slate-600 lg:hidden">Published</span><button type="button" role="switch" aria-checked={item.isPublished} aria-label={`${item.isPublished ? 'Unpublish' : 'Publish'} ${item.name}`} onClick={() => updateCatalogPolicy(item, { isPublished: !item.isPublished })} className={toggleClass(item.isPublished)}><span className={`absolute left-1 top-1 h-3 w-3 rounded-full bg-white transition-transform ${item.isPublished ? 'translate-x-4' : ''}`} /></button></div>
                                    <div className="flex items-center justify-between lg:justify-start"><span className="text-[10px] font-bold uppercase text-slate-600 lg:hidden">Self-activation</span><button type="button" role="switch" aria-checked={item.canSelfActivate} aria-label={`Toggle self-activation for ${item.name}`} onClick={() => updateCatalogPolicy(item, { canSelfActivate: !item.canSelfActivate })} className={toggleClass(item.canSelfActivate)}><span className={`absolute left-1 top-1 h-3 w-3 rounded-full bg-white transition-transform ${item.canSelfActivate ? 'translate-x-4' : ''}`} /></button></div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : activeTab === 'plans' ? (
                <div className="space-y-5">
                    <AtlasSectionHeader title="Subscription plans" description="Package catalog access, pricing, trials, and operating limits." icon={CreditCard} actions={<AtlasActionButton icon={Plus} onClick={openCreatePlan}>Create plan</AtlasActionButton>} />
                    {plans.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {plans.map(plan => (
                            <article key={plan.id} className="group flex min-h-72 flex-col rounded-lg border border-white/10 bg-slate-900/70 p-5 transition-colors hover:border-teal-300/30">
                                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><h3 className="truncate text-base font-black text-white">{plan.name}</h3>{plan.status === 'archived' && <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-bold text-slate-500">Archived</span>}</div><p className="mt-1 min-h-10 text-xs leading-5 text-slate-500">{plan.description || 'No plan description yet.'}</p></div><div className="flex shrink-0 gap-1"><button type="button" onClick={() => openEditPlan(plan)} aria-label={`Edit ${plan.name}`} title={`Edit ${plan.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-teal-500/10 hover:text-teal-200"><Edit3 size={15} /></button><button type="button" onClick={() => handleDeletePlan(plan.id)} aria-label={`Delete ${plan.name}`} title={`Delete ${plan.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-red-500/10 hover:text-red-300"><Trash2 size={15} /></button></div></div>
                                <div className="mt-5 flex items-end gap-1"><span className="font-mono text-3xl font-black text-white">{formatMoney(plan.priceMonthly, plan.currency)}</span><span className="pb-1 text-xs text-slate-500">/month</span></div>
                                <div className="my-4 grid grid-cols-3 gap-2 border-y border-white/10 py-3 text-center"><div><p className="font-mono text-sm font-bold text-white">{plan.includedModules?.length || 0}</p><p className="text-[9px] font-bold uppercase text-slate-600">Products</p></div><div><p className="font-mono text-sm font-bold text-white">{plan.limits?.students || 0}</p><p className="text-[9px] font-bold uppercase text-slate-600">Students</p></div><div><p className="font-mono text-sm font-bold text-white">{plan.trialDays || 0}d</p><p className="text-[9px] font-bold uppercase text-slate-600">Trial</p></div></div>
                                <div className="space-y-2">{plan.features?.slice(0, 3).map((feature, index) => <div key={index} className="flex gap-2 text-xs text-slate-400"><Check size={14} className="shrink-0 text-teal-300" />{feature}</div>)}</div>
                            </article>
                        ))}
                    </div> : <AtlasEmptyState title="No subscription plans" description="Create a plan before provisioning priced tenants." icon={CreditCard} action={<AtlasActionButton icon={Plus} variant="primary" onClick={openCreatePlan}>Create plan</AtlasActionButton>} />}
                </div>
            ) : (
                <div className="space-y-5">
                    <AtlasSectionHeader title="Tenant entitlements" description="See what each plan includes and manage paid add-on grants separately." icon={Building2} />
                    <AtlasToolbar leading={<div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input type="search" aria-label="Search tenants" value={tenantSearch} onChange={event => setTenantSearch(event.target.value)} placeholder="Search tenant or slug" className={`${inputClass} pl-10`} /></div>}><span className="text-xs font-bold text-slate-500">{filteredOrganizations.length} shown</span></AtlasToolbar>
                    {filteredOrganizations.length ? <div className="space-y-3">
                        {filteredOrganizations.map(org => {
                            const plan = plans.find(item => item.id === org.subscription?.planId);
                            const addOns = org.subscription?.addOns || [];
                            const planCount = catalog.filter(item => item.isPublished && (item.billing === 'included' || planIncludesCatalogItem(plan, item))).length;
                            return (
                                <article key={org.id} className="overflow-hidden rounded-lg border border-white/10 bg-slate-900/70 transition-colors hover:border-teal-300/25">
                                    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-400/10 text-teal-300"><Building2 size={19} /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-black text-white">{org.name}</h3><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${org.status === 'active' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-red-400/10 text-red-300'}`}>{org.status}</span></div><p className="mt-1 truncate font-mono text-[10px] text-slate-600">{org.slug}</p></div></div>
                                        <div className="flex flex-wrap items-center gap-2 sm:justify-end"><span className="rounded-md border border-white/10 bg-slate-950/50 px-2.5 py-1.5 text-[10px] font-bold text-slate-400">{plan?.name || 'Custom plan'}</span><span className="rounded-md border border-teal-300/15 bg-teal-300/[0.06] px-2.5 py-1.5 text-[10px] font-bold text-teal-200">{planCount} included</span><span className="rounded-md border border-amber-300/15 bg-amber-300/[0.06] px-2.5 py-1.5 text-[10px] font-bold text-amber-200">{addOns.length} add-ons</span>{org.id !== 'atlas-platform' && <button type="button" onClick={() => openTenantWorkspace(org)} className="flex h-9 items-center gap-2 rounded-lg border border-teal-300/20 bg-teal-300/[0.06] px-3 text-xs font-bold text-teal-200 transition-colors hover:bg-teal-300/10"><LogIn size={14} /> Open workspace</button>}<button type="button" onClick={() => setExpandedOrg(expandedOrg === org.id ? null : org.id)} className="flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-bold text-slate-300 transition-colors hover:bg-white/[0.04] hover:text-white">Manage access {expandedOrg === org.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button></div>
                                    </div>
                                    <AnimatePresence initial={false}>{expandedOrg === org.id && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-t border-white/10">
                                            <div className="grid gap-2 p-3 sm:p-4 lg:grid-cols-2">
                                                {catalog.map(item => {
                                                    const includedByPlan = planIncludesCatalogItem(plan, item);
                                                    const includedByPlatform = item.billing === 'included';
                                                    const isFree = item.billing === 'free';
                                                    const isAddOn = addOns.includes(item.id);
                                                    const entitled = item.isPublished && (includedByPlan || includedByPlatform || isFree || isAddOn);
                                                    const active = item.kind === 'module' ? Boolean(org.modules?.[item.id]) : Boolean(org.installedApps?.includes(item.id));
                                                    const grantBusy = updatingEntitlement === `${org.id}:${item.id}:grant`;
                                                    const activeBusy = updatingEntitlement === `${org.id}:${item.id}:active`;
                                                    const sourceLabel = includedByPlan ? 'In plan' : includedByPlatform ? 'Platform' : isFree ? 'Free' : isAddOn ? 'Paid add-on' : item.isPublished ? 'Not granted' : 'Unpublished';
                                                    return (
                                                        <div key={item.id} className={`flex min-w-0 items-center gap-3 rounded-lg border p-3 ${entitled ? 'border-white/10 bg-slate-950/45' : 'border-white/[0.06] bg-slate-950/20 opacity-75'}`}>
                                                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${entitled ? 'bg-teal-300/10 text-teal-200' : 'bg-white/[0.04] text-slate-600'}`}>{item.kind === 'app' ? <Sparkles size={14} /> : <Package size={14} />}</div>
                                                            <div className="min-w-0 flex-1"><div className="flex min-w-0 items-center gap-2"><p className="truncate text-xs font-bold text-slate-200">{item.name}</p><span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${isAddOn ? 'bg-amber-300/10 text-amber-200' : entitled ? 'bg-teal-300/10 text-teal-200' : 'bg-white/[0.05] text-slate-600'}`}>{sourceLabel}</span></div><p className="mt-1 text-[10px] text-slate-600">{item.kind === 'module' ? (active ? 'Active in navigation' : entitled ? 'Available, not active' : 'Locked') : (active ? 'Installed' : entitled ? 'Available to install' : 'Locked')}</p></div>
                                                            <div className="flex shrink-0 items-center gap-2">
                                                                {item.billing === 'paid' && !includedByPlan && !includedByPlatform && <button type="button" disabled={!item.isPublished || grantBusy || !org.subscription} onClick={() => togglePaidAddOn(org, item.id)} className={`h-8 rounded-md border px-2 text-[10px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${isAddOn ? 'border-red-300/20 text-red-200 hover:bg-red-300/10' : 'border-amber-300/20 text-amber-200 hover:bg-amber-300/10'}`}>{grantBusy ? <Loader2 size={12} className="animate-spin" /> : isAddOn ? 'Revoke' : 'Grant'}</button>}
                                                                {item.kind === 'module' && entitled && <button type="button" role="switch" aria-checked={active} disabled={activeBusy} aria-label={`Toggle ${item.name} for ${org.name}`} onClick={() => toggleModule(org.id, item.id, active)} className={toggleClass(active)}><span className={`absolute left-1 top-1 h-3 w-3 rounded-full bg-white transition-transform ${active ? 'translate-x-4' : ''}`} /></button>}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}</AnimatePresence>
                                </article>
                            );
                        })}
                    </div> : <AtlasEmptyState title="No tenants match" description="Clear the search or provision a new academy." icon={Search} />}
                </div>
            )}

            <AnimatePresence>
                {showPlanModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-sm sm:p-4" onMouseDown={event => { if (event.target === event.currentTarget) setShowPlanModal(false); }}>
                        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-white/10 bg-slate-900 shadow-2xl">
                            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-900/95 p-5 backdrop-blur"><div><h2 className="text-lg font-black">{editingPlanId ? 'Edit subscription plan' : 'Create subscription plan'}</h2><p className="mt-1 text-xs text-slate-500">Package a clear offer from the live Atlas catalog.</p></div><button type="button" aria-label="Close" onClick={() => setShowPlanModal(false)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-white/[0.05] hover:text-white"><X size={18} /></button></div>
                            <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(340px,1.1fr)]">
                                <div className="space-y-4">
                                    <div><label className={labelClass}>Plan name</label><input placeholder="Growth" className={inputClass} value={planDraft.name || ''} onChange={event => setPlanDraft({ ...planDraft, name: event.target.value })} /></div>
                                    <div><label className={labelClass}>Description</label><textarea rows={3} className={`${inputClass} h-auto py-3`} placeholder="Built for growing academies with multiple programs." value={planDraft.description || ''} onChange={event => setPlanDraft({ ...planDraft, description: event.target.value })} /></div>
                                    <div className="grid grid-cols-3 gap-3"><div><label className={labelClass}>Currency</label><select className={inputClass} value={planDraft.currency || 'MAD'} onChange={event => setPlanDraft({ ...planDraft, currency: event.target.value })}><option value="MAD">MAD</option><option value="EUR">EUR</option><option value="USD">USD</option></select></div><div><label className={labelClass}>Monthly</label><input type="number" min="0" className={inputClass} value={planDraft.priceMonthly || 0} onChange={event => setPlanDraft({ ...planDraft, priceMonthly: Number(event.target.value) })} /></div><div><label className={labelClass}>Yearly</label><input type="number" min="0" className={inputClass} value={planDraft.priceYearly || 0} onChange={event => setPlanDraft({ ...planDraft, priceYearly: Number(event.target.value) })} /></div></div>
                                    <div className="grid grid-cols-3 gap-3"><div><label className={labelClass}>Trial days</label><input type="number" min="0" className={inputClass} value={planDraft.trialDays || 0} onChange={event => setPlanDraft({ ...planDraft, trialDays: Number(event.target.value) })} /></div><div><label className={labelClass}>Students</label><input type="number" min="0" className={inputClass} value={planDraft.limits?.students || 0} onChange={event => setPlanDraft({ ...planDraft, limits: { students: Number(event.target.value), storage: planDraft.limits?.storage || 0 } })} /></div><div><label className={labelClass}>Storage GB</label><input type="number" min="0" className={inputClass} value={planDraft.limits?.storage || 0} onChange={event => setPlanDraft({ ...planDraft, limits: { students: planDraft.limits?.students || 0, storage: Number(event.target.value) } })} /></div></div>
                                    <div><label className={labelClass}>Customer-facing features</label><textarea rows={5} className={`${inputClass} h-auto py-3`} placeholder={'Unlimited programs\nFinance workspace\nPriority support'} value={planFeatures} onChange={event => setPlanFeatures(event.target.value)} /><p className="mt-1.5 text-[10px] text-slate-600">Enter one feature per line, or separate with commas.</p></div>
                                </div>
                                <section className="min-w-0"><div className="mb-3 flex items-end justify-between gap-3"><div><h3 className="text-sm font-black text-white">Included products</h3><p className="mt-1 text-[11px] text-slate-500">Select from the unified module and app catalog.</p></div><span className="text-[10px] font-bold text-teal-200">{planDraft.includedModules?.length || 0} selected</span></div><div className="grid max-h-[520px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">{catalog.map(item => { const selected = planDraft.includedModules?.includes(item.id) || false; return <label key={item.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${selected ? 'border-teal-300/40 bg-teal-300/[0.08]' : 'border-white/10 bg-slate-950/35 hover:border-white/20'}`}><input type="checkbox" checked={selected} onChange={() => setPlanDraft(previous => ({ ...previous, includedModules: selected ? (previous.includedModules || []).filter(id => id !== item.id) : [...(previous.includedModules || []), item.id] }))} className="mt-0.5 h-4 w-4 rounded border-white/20 bg-slate-950 accent-teal-500" /><span className="min-w-0"><span className="flex items-center gap-2"><span className="truncate text-xs font-bold text-slate-200">{item.name}</span>{!item.isPublished && <EyeOff size={11} className="shrink-0 text-slate-600" />}</span><span className="mt-1 block text-[10px] capitalize text-slate-600">{item.kind} / {item.billing}</span></span></label>; })}</div></section>
                            </div>
                            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-white/10 bg-slate-900/95 p-4 backdrop-blur"><AtlasActionButton onClick={() => setShowPlanModal(false)}>Cancel</AtlasActionButton><AtlasActionButton icon={savingPlan ? Loader2 : Save} variant="primary" disabled={savingPlan || !planDraft.name?.trim()} className={savingPlan ? '[&_svg]:animate-spin' : ''} onClick={handleSavePlan}>{savingPlan ? 'Saving...' : editingPlanId ? 'Save changes' : 'Create plan'}</AtlasActionButton></div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showAdminModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) setShowAdminModal(false); }}>
                        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="w-full max-w-md rounded-xl border border-white/10 bg-slate-900 shadow-2xl">
                            <div className="flex items-start justify-between border-b border-white/10 p-5"><div className="flex gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-300/20 bg-amber-300/10 text-amber-200"><ShieldCheck size={19} /></div><div><h2 className="text-base font-black">{isPlatformBootstrapAdmin ? 'Create Atlas founder account' : 'Create platform admin'}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{isPlatformBootstrapAdmin ? 'This separates Atlas ownership from the MakerLab tenant permanently.' : 'Grant full access to the Atlas control plane.'}</p></div></div><button type="button" aria-label="Close" onClick={() => setShowAdminModal(false)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-white/[0.05] hover:text-white"><X size={18} /></button></div>
                            <form onSubmit={handleCreatePlatformAdmin} className="space-y-4 p-5"><div><label className={labelClass}>Full name</label><input required value={platformAdminName} onChange={event => setPlatformAdminName(event.target.value)} className={inputClass} placeholder="Platform owner" /></div><div><label className={labelClass}>Work email</label><input required type="email" value={platformAdminEmail} onChange={event => setPlatformAdminEmail(event.target.value)} className={inputClass} placeholder="founder@edufy.com" /></div><div><label className={labelClass}>Temporary password</label><div className="relative"><KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" /><input required minLength={6} type="password" value={platformAdminPass} onChange={event => setPlatformAdminPass(event.target.value)} className={`${inputClass} pl-10`} placeholder="At least 6 characters" /></div><p className="mt-1.5 text-[10px] leading-4 text-slate-600">The password is cleared from this screen as soon as creation starts.</p></div><div className="flex flex-col-reverse gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-end"><AtlasActionButton onClick={() => setShowAdminModal(false)}>Cancel</AtlasActionButton><AtlasActionButton type="submit" icon={creatingPlatformAdmin ? Loader2 : UserPlus} variant="primary" disabled={creatingPlatformAdmin} className={creatingPlatformAdmin ? '[&_svg]:animate-spin' : ''}>{creatingPlatformAdmin ? 'Creating...' : isPlatformBootstrapAdmin ? 'Create founder account' : 'Create admin'}</AtlasActionButton></div></form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) setShowCreateModal(false); }}>
                        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-white/10 bg-slate-900 shadow-2xl">
                            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-900/95 p-5 backdrop-blur"><div><h2 className="text-lg font-black">Provision tenant</h2><p className="mt-1 text-xs text-slate-500">Create the academy, owner account, subscription, and initial access.</p></div><button type="button" aria-label="Close" onClick={() => setShowCreateModal(false)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-white/[0.05] hover:text-white"><X size={18} /></button></div>
                            <form onSubmit={handleCreateOrg} className="space-y-6 p-5">
                                <div className="grid gap-4 sm:grid-cols-2"><div><label className={labelClass}>Academy name</label><input required value={newOrgName} onChange={event => setNewOrgName(event.target.value)} className={inputClass} placeholder="Future Tech School" /></div><div><label className={labelClass}>Workspace slug</label><input value={newOrgSlug} onChange={event => setNewOrgSlug(event.target.value)} className={inputClass} placeholder="future-tech" /></div><div><label className={labelClass}>Admin email</label><input required type="email" value={tenantAdminEmail} onChange={event => setTenantAdminEmail(event.target.value)} className={inputClass} placeholder="admin@school.com" /></div><div><label className={labelClass}>Temporary password</label><input required minLength={6} value={tenantAdminPass} onChange={event => setTenantAdminPass(event.target.value)} className={inputClass} placeholder="At least 6 characters" type="password" /></div></div>
                                <section><AtlasSectionHeader title="Subscription" description="Select the starting offer for this tenant." icon={CreditCard} /><div className="mt-3 grid gap-3 sm:grid-cols-3">{plans.map(plan => <button key={plan.id} type="button" onClick={() => setSelectedPlanId(plan.id)} className={`rounded-lg border p-3 text-left transition-colors ${selectedPlanId === plan.id ? 'border-teal-300/50 bg-teal-400/10' : 'border-white/10 bg-slate-950/40 hover:border-white/20'}`}><span className="text-xs font-black text-white">{plan.name}</span><span className="mt-2 block font-mono text-lg font-black text-teal-200">{formatMoney(plan.priceMonthly, plan.currency)}<span className="text-[10px] font-normal text-slate-500">/mo</span></span></button>)}</div></section>
                                <section><AtlasSectionHeader title="Starting modules" description="Enable any published module that should be active on day one." icon={Package} /><div className="mt-3 grid gap-2 rounded-lg border border-white/10 bg-slate-950/35 p-3 sm:grid-cols-2 lg:grid-cols-3">{catalog.filter(item => item.kind === 'module' && item.isPublished).map(item => { const plan = plans.find(candidate => candidate.id === selectedPlanId); const included = planIncludesCatalogItem(plan, item) || item.billing === 'included'; const checked = included || Boolean(modules[item.id]); return <label key={item.id} className={`flex min-h-9 items-center gap-2 rounded-md px-2 text-xs ${included ? 'cursor-default text-teal-200' : 'cursor-pointer text-slate-300 hover:bg-white/[0.04]'}`}><input type="checkbox" disabled={included} checked={checked} onChange={event => setModules({ ...modules, [item.id]: event.target.checked })} className="h-4 w-4 rounded border-white/20 bg-slate-950 accent-teal-500" /><span className="truncate">{item.name}</span>{included && <BadgeCheck size={13} className="ml-auto shrink-0" />}</label>; })}</div></section>
                                <div className="flex flex-col-reverse gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-end"><AtlasActionButton onClick={() => setShowCreateModal(false)}>Cancel</AtlasActionButton><AtlasActionButton type="submit" icon={creating ? Loader2 : Plus} variant="primary" disabled={creating} className={creating ? '[&_svg]:animate-spin' : ''}>{creating ? 'Provisioning...' : 'Provision tenant'}</AtlasActionButton></div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
