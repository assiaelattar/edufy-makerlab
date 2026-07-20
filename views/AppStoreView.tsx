import React, { useMemo, useState } from 'react';
import {
    Boxes,
    CheckCircle2,
    ExternalLink,
    LockKeyhole,
    PackageCheck,
    Search,
    Sparkles,
    Star,
    Store,
    Unplug
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { useModuleContext } from '../context/ModuleContext';
import type { AtlasEntitlement } from '../services/entitlementService';
import {
    AtlasActionButton,
    AtlasCommandHeader,
    AtlasEmptyState,
    AtlasSignalCard,
    AtlasToolbar
} from '../components/atlas/AtlasSurface';

type CatalogKind = 'all' | 'module' | 'app';

const accessLabel = (entitlement: AtlasEntitlement) => {
    if (entitlement.source === 'plan') return 'In your plan';
    if (entitlement.source === 'add_on') return 'Add-on';
    if (entitlement.source === 'free') return 'Free';
    if (entitlement.source === 'platform') return 'Core';
    return 'Upgrade';
};

export const AppStoreView = () => {
    const { navigateTo } = useAppContext();
    const { currentOrganization, userProfile } = useAuth();
    const { confirm, alert: showAlert } = useConfirm();
    const {
        currentPlan,
        entitlements,
        activateItem,
        deactivateItem,
        requestAddOn
    } = useModuleContext();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedKind, setSelectedKind] = useState<CatalogKind>('all');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [workingId, setWorkingId] = useState<string | null>(null);
    const [requestedIds, setRequestedIds] = useState<string[]>([]);

    const canManage = ['owner', 'admin', 'super_admin'].includes(userProfile?.role || '');
    const publishedEntitlements = entitlements.filter(entry => entry.item.isPublished);
    const categories = useMemo(() => [
        'all',
        ...Array.from(new Set(publishedEntitlements.map(entry => entry.item.category)))
    ], [publishedEntitlements]);

    const filteredItems = publishedEntitlements.filter(entitlement => {
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch = !query || [entitlement.item.name, entitlement.item.description, entitlement.item.category]
            .some(value => value.toLowerCase().includes(query));
        const matchesKind = selectedKind === 'all' || entitlement.item.kind === selectedKind;
        const matchesCategory = selectedCategory === 'all' || entitlement.item.category === selectedCategory;
        return matchesSearch && matchesKind && matchesCategory;
    });

    const activeCount = publishedEntitlements.filter(entry => entry.active).length;
    const includedCount = publishedEntitlements.filter(entry => entry.entitled).length;
    const paidCount = publishedEntitlements.filter(entry => entry.item.billing === 'paid').length;

    const openItem = (entitlement: AtlasEntitlement) => {
        if (entitlement.item.kind === 'module' && entitlement.item.module) {
            navigateTo(entitlement.item.module.id);
            return;
        }
        navigateTo('saas-app', { appId: entitlement.item.id });
    };

    const handleActivate = async (entitlement: AtlasEntitlement) => {
        setWorkingId(entitlement.item.id);
        try {
            const activated = await activateItem(entitlement.item.id);
            if (!activated) {
                showAlert('Activation unavailable', 'This item is not available for self-service activation.', 'warning');
                return;
            }
            showAlert('Added to workspace', `${entitlement.item.name} is now available from your Atlas navigation.`, 'success');
        } catch (error) {
            console.error(error);
            showAlert('Activation failed', 'The workspace could not be updated. Check your connection and try again.', 'danger');
        } finally {
            setWorkingId(null);
        }
    };

    const handleDeactivate = async (entitlement: AtlasEntitlement) => {
        const approved = await confirm({
            title: `Remove ${entitlement.item.name} from the workspace?`,
            message: 'Existing records stay available. The module will disappear from team navigation until it is activated again.',
            confirmText: 'Remove from workspace',
            cancelText: 'Keep active',
            variant: 'danger'
        });
        if (!approved) return;

        setWorkingId(entitlement.item.id);
        try {
            const removed = await deactivateItem(entitlement.item.id);
            if (removed) showAlert('Removed from workspace', `${entitlement.item.name} is no longer in the active navigation.`, 'success');
        } catch (error) {
            console.error(error);
            showAlert('Removal failed', 'The workspace could not be updated. Try again.', 'danger');
        } finally {
            setWorkingId(null);
        }
    };

    const handleRequest = async (entitlement: AtlasEntitlement) => {
        setWorkingId(entitlement.item.id);
        try {
            await requestAddOn(entitlement.item.id);
            setRequestedIds(previous => previous.includes(entitlement.item.id) ? previous : [...previous, entitlement.item.id]);
            showAlert('Add-on requested', `The Atlas team can now review ${entitlement.item.name} for this workspace.`, 'success');
        } catch (error) {
            console.error(error);
            showAlert('Request not sent', 'The add-on request could not be saved. Try again.', 'danger');
        } finally {
            setWorkingId(null);
        }
    };

    return (
        <div className="flex min-h-full flex-col gap-5 pb-24 md:pb-8">
            <AtlasCommandHeader
                eyebrow="Workspace catalog"
                title="Modules & apps"
                description="Build a focused Atlas workspace from the capabilities included in your plan."
                icon={Store}
                badges={
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-bold text-slate-300">
                        {currentPlan?.name || currentOrganization?.subscription?.planId || 'Custom plan'}
                    </span>
                }
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <AtlasSignalCard label="Catalog" value={publishedEntitlements.length} detail="Available capabilities" icon={Boxes} tone="teal" />
                <AtlasSignalCard label="Entitled" value={includedCount} detail="Included or granted" icon={PackageCheck} tone="emerald" />
                <AtlasSignalCard label="Active" value={activeCount} detail="Shown to your team" icon={CheckCircle2} tone="blue" />
                <AtlasSignalCard label="Paid add-ons" value={paidCount} detail="Optional capabilities" icon={Star} tone="amber" />
            </div>

            <AtlasToolbar
                leading={
                    <div className="relative min-w-0 flex-1 sm:min-w-72">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                            type="search"
                            aria-label="Search modules and apps"
                            placeholder="Search modules and apps"
                            value={searchQuery}
                            onChange={event => setSearchQuery(event.target.value)}
                            className="h-10 w-full rounded-lg border border-white/10 bg-slate-900 pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10"
                        />
                    </div>
                }
            >
                <div className="flex gap-1 rounded-lg bg-slate-900/70 p-1">
                    {(['all', 'module', 'app'] as CatalogKind[]).map(kind => (
                        <button key={kind} type="button" onClick={() => setSelectedKind(kind)} className={`h-8 rounded-md px-3 text-xs font-bold capitalize transition-colors ${selectedKind === kind ? 'bg-teal-400 text-slate-950' : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'}`}>{kind === 'all' ? 'All' : `${kind}s`}</button>
                    ))}
                </div>
                <select aria-label="Filter catalog category" value={selectedCategory} onChange={event => setSelectedCategory(event.target.value)} className="h-10 rounded-lg border border-white/10 bg-slate-900 px-3 text-xs font-bold capitalize text-slate-300 outline-none focus:border-teal-400/60">
                    {categories.map(category => <option key={category} value={category}>{category === 'all' ? 'All categories' : category}</option>)}
                </select>
            </AtlasToolbar>

            {filteredItems.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {filteredItems.map(entitlement => {
                        const item = entitlement.item;
                        const Icon = item.module?.icon || item.app?.icon || Sparkles;
                        const isWorking = workingId === item.id;
                        const requested = requestedIds.includes(item.id);
                        const priceLabel = item.priceMonthly > 0 ? `${item.priceMonthly} ${item.currency}/mo` : 'Custom price';

                        return (
                            <article key={`${item.kind}-${item.id}`} className="flex min-h-[248px] flex-col rounded-lg border border-white/10 bg-slate-900/65 p-4 transition-colors hover:border-teal-300/30">
                                <div className="flex items-start gap-3">
                                    <span className="atlas-accent-well flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border"><Icon size={19} /></span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="text-[9px] font-bold uppercase text-slate-600">{item.kind}</span>
                                            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${entitlement.entitled ? 'bg-teal-300/10 text-teal-200' : 'bg-amber-300/10 text-amber-200'}`}>{accessLabel(entitlement)}</span>
                                            {entitlement.active && <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-300"><CheckCircle2 size={10} /> Active</span>}
                                        </div>
                                        <h2 className="atlas-text-strong mt-1 text-sm font-black">{item.name}</h2>
                                        <p className="atlas-text-subtle mt-1 line-clamp-2 text-xs leading-5">{item.description}</p>
                                    </div>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-1.5 text-[10px] text-slate-500">
                                    <span className="rounded-md border border-white/[0.07] px-2 py-1 capitalize">{item.category}</span>
                                    {item.dependencies.slice(0, 2).map(dependency => <span key={dependency} className="rounded-md border border-white/[0.07] px-2 py-1">Needs {dependency}</span>)}
                                </div>

                                <div className="mt-auto flex items-end justify-between gap-3 border-t border-white/[0.07] pt-4">
                                    <div>
                                        <p className="text-[9px] font-bold uppercase text-slate-600">Access</p>
                                        <p className={`mt-0.5 text-xs font-black ${entitlement.locked ? 'text-amber-200' : 'text-slate-300'}`}>{entitlement.locked ? priceLabel : accessLabel(entitlement)}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {entitlement.active ? (
                                            <>
                                                <AtlasActionButton icon={ExternalLink} variant="primary" onClick={() => openItem(entitlement)}>Open</AtlasActionButton>
                                                {item.canSelfActivate && <button type="button" aria-label={`Remove ${item.name}`} title={`Remove ${item.name}`} disabled={isWorking || !canManage} onClick={() => handleDeactivate(entitlement)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-slate-500 hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"><Unplug size={15} /></button>}
                                            </>
                                        ) : entitlement.entitled ? (
                                            <AtlasActionButton icon={PackageCheck} variant="primary" disabled={isWorking || !canManage || !item.canSelfActivate} onClick={() => handleActivate(entitlement)}>{isWorking ? 'Adding...' : 'Add'}</AtlasActionButton>
                                        ) : (
                                            <AtlasActionButton icon={LockKeyhole} disabled={isWorking || requested || !canManage} onClick={() => handleRequest(entitlement)}>{requested ? 'Requested' : 'Request add-on'}</AtlasActionButton>
                                        )}
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            ) : (
                <AtlasEmptyState title="No catalog items match" description="Adjust the search or filters to see other capabilities." icon={Search} action={<AtlasActionButton onClick={() => { setSearchQuery(''); setSelectedKind('all'); setSelectedCategory('all'); }}>Clear filters</AtlasActionButton>} />
            )}
        </div>
    );
};
