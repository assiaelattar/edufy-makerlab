import React, { useMemo, useState } from 'react';
import {
    AlertCircle,
    ArrowUpDown,
    Box,
    CheckCircle2,
    CheckSquare,
    Copy,
    Cpu,
    ExternalLink,
    Hammer,
    Library,
    PackageCheck,
    Pencil,
    Plus,
    RotateCcw,
    Search,
    Trash2,
    User,
    Wrench
} from 'lucide-react';
import { addDoc, collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { useNotifications } from '../context/NotificationContext';
import { Modal } from '../components/Modal';
import { db } from '../services/firebase';
import { Asset, ToolLink } from '../types';
import { AtlasActionButton, AtlasCommandHeader, AtlasEmptyState, AtlasSectionHeader, AtlasSignalCard, AtlasToolbar } from '../components/atlas/AtlasSurface';

type ToolkitTab = 'digital' | 'inventory';
type SortOption = 'name' | 'category' | 'newest' | 'status';
type Feedback = { type: 'success' | 'error' | 'info'; message: string };

const TOOL_CATEGORIES: Array<ToolLink['category']> = ['robotics', 'coding', 'design', 'engineering', 'multimedia', 'other'];
const ASSET_CATEGORIES: Array<Asset['category']> = ['robotics', 'computer', 'tools', 'other'];
const ASSET_STATUSES: Array<Asset['status']> = ['available', 'in_use', 'maintenance', 'lost'];

const fieldClassName = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10 disabled:cursor-not-allowed disabled:opacity-60';

const normalizeText = (value?: string) => (value || '').trim().replace(/\s+/g, ' ');

const normalizeResourceUrl = (value?: string) => {
    const raw = (value || '').trim();
    if (!raw) return null;

    try {
        const parsed = new URL(raw);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
        parsed.hash = '';
        return parsed.toString();
    } catch {
        return null;
    }
};

const getTimestampValue = (value: unknown) => {
    if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as { toMillis: () => number }).toMillis === 'function') {
        return (value as { toMillis: () => number }).toMillis();
    }
    return 0;
};

const statusLabel = (status: Asset['status']) => ({
    available: 'Available',
    in_use: 'Checked out',
    maintenance: 'Maintenance',
    lost: 'Lost'
}[status]);

export const ToolkitView = () => {
    const { toolLinks, assets, students } = useAppContext();
    const { currentOrganization, can } = useAuth();
    const { confirm } = useConfirm();
    const { addToast } = useNotifications();
    const orgId = currentOrganization?.id || '';
    const canManage = can('toolkit.manage');

    const [activeTab, setActiveTab] = useState<ToolkitTab>('digital');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState<'all' | Asset['status']>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('name');
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    const [isToolModalOpen, setIsToolModalOpen] = useState(false);
    const [editingTool, setEditingTool] = useState<ToolLink | null>(null);
    const [toolForm, setToolForm] = useState<Partial<ToolLink>>({ title: '', url: '', category: 'other', description: '' });

    const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [assetForm, setAssetForm] = useState<Partial<Asset>>({ name: '', category: 'robotics', status: 'available', serialNumber: '', notes: '' });
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [assignStudentId, setAssignStudentId] = useState('');

    const ownedToolLinks = useMemo(
        () => toolLinks.filter(tool => Boolean(orgId) && tool.organizationId === orgId),
        [orgId, toolLinks]
    );
    const ownedAssets = useMemo(
        () => assets.filter(asset => Boolean(orgId) && asset.organizationId === orgId),
        [assets, orgId]
    );
    const eligibleStudents = useMemo(
        () => students
            .filter(student => student.organizationId === orgId && student.status === 'active')
            .sort((a, b) => a.name.localeCompare(b.name)),
        [orgId, students]
    );

    const filteredTools = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return ownedToolLinks
            .filter(tool => {
                const matchesCategory = categoryFilter === 'all' || tool.category === categoryFilter;
                const haystack = `${tool.title || ''} ${tool.description || ''} ${tool.url || ''}`.toLowerCase();
                return matchesCategory && (!query || haystack.includes(query));
            })
            .sort((a, b) => {
                if (sortBy === 'newest') return getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt);
                if (sortBy === 'category') return a.category.localeCompare(b.category) || a.title.localeCompare(b.title);
                return a.title.localeCompare(b.title);
            });
    }, [categoryFilter, ownedToolLinks, searchQuery, sortBy]);

    const filteredAssets = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return ownedAssets
            .filter(asset => {
                const matchesCategory = categoryFilter === 'all' || asset.category === categoryFilter;
                const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
                const haystack = `${asset.name || ''} ${asset.serialNumber || ''} ${asset.notes || ''} ${asset.assignedToName || ''}`.toLowerCase();
                return matchesCategory && matchesStatus && (!query || haystack.includes(query));
            })
            .sort((a, b) => {
                if (sortBy === 'newest') return getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt);
                if (sortBy === 'category') return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
                if (sortBy === 'status') return a.status.localeCompare(b.status) || a.name.localeCompare(b.name);
                return a.name.localeCompare(b.name);
            });
    }, [categoryFilter, ownedAssets, searchQuery, sortBy, statusFilter]);

    const availableAssets = ownedAssets.filter(asset => asset.status === 'available').length;
    const assignedAssets = ownedAssets.filter(asset => asset.status === 'in_use').length;
    const attentionAssets = ownedAssets.filter(asset => asset.status === 'maintenance' || asset.status === 'lost').length;
    const hasActiveFilters = Boolean(searchQuery.trim()) || categoryFilter !== 'all' || (activeTab === 'inventory' && statusFilter !== 'all');

    const clearFilters = () => {
        setSearchQuery('');
        setCategoryFilter('all');
        setStatusFilter('all');
        setSortBy('name');
    };

    const reportFailure = (action: string, error: unknown) => {
        const message = error instanceof Error ? error.message : `Could not ${action}.`;
        setFeedback({ type: 'error', message });
        addToast('Toolkit action failed', message, 'error');
    };

    const requireManageAccess = () => {
        if (!db || !orgId) {
            setFeedback({ type: 'error', message: 'Select an organization and reconnect before changing the toolkit.' });
            return null;
        }
        if (!canManage) {
            setFeedback({ type: 'error', message: 'You do not have permission to manage organization resources.' });
            return null;
        }
        return db;
    };

    const openToolModal = (tool?: ToolLink) => {
        if (!canManage) return;
        if (tool && tool.organizationId !== orgId) {
            setFeedback({ type: 'error', message: 'This resource belongs to another organization.' });
            return;
        }
        setEditingTool(tool || null);
        setToolForm(tool
            ? { title: tool.title, url: tool.url, category: tool.category, description: tool.description || '' }
            : { title: '', url: '', category: 'other', description: '' });
        setIsToolModalOpen(true);
    };

    const openAssetModal = (asset?: Asset) => {
        if (!canManage) return;
        if (asset && asset.organizationId !== orgId) {
            setFeedback({ type: 'error', message: 'This inventory item belongs to another organization.' });
            return;
        }
        setEditingAsset(asset || null);
        setAssetForm(asset
            ? { name: asset.name, category: asset.category, status: asset.status, serialNumber: asset.serialNumber || '', notes: asset.notes || '' }
            : { name: '', category: 'robotics', status: 'available', serialNumber: '', notes: '' });
        setIsAssetModalOpen(true);
    };

    const openCreateModal = () => {
        if (activeTab === 'digital') openToolModal();
        else openAssetModal();
    };

    const handleSaveTool = async (event: React.FormEvent) => {
        event.preventDefault();
        const firestore = requireManageAccess();
        if (!firestore) return;

        const title = normalizeText(toolForm.title);
        const description = normalizeText(toolForm.description);
        const url = normalizeResourceUrl(toolForm.url);
        const category = toolForm.category;

        if (title.length < 2 || title.length > 80) {
            setFeedback({ type: 'error', message: 'Resource names must contain 2 to 80 characters.' });
            return;
        }
        if (!url) {
            setFeedback({ type: 'error', message: 'Enter a valid http or https resource URL.' });
            return;
        }
        if (!category || !TOOL_CATEGORIES.includes(category)) {
            setFeedback({ type: 'error', message: 'Choose a valid resource category.' });
            return;
        }
        if (description.length > 240) {
            setFeedback({ type: 'error', message: 'Descriptions cannot exceed 240 characters.' });
            return;
        }

        const duplicate = ownedToolLinks.find(tool => tool.id !== editingTool?.id && normalizeResourceUrl(tool.url) === url);
        if (duplicate) {
            setFeedback({ type: 'error', message: `This URL is already saved as "${duplicate.title}".` });
            return;
        }

        setIsSaving(true);
        setFeedback(null);
        try {
            if (editingTool) {
                if (editingTool.organizationId !== orgId) throw new Error('This resource belongs to another organization.');
                await runTransaction(firestore, async transaction => {
                    const resourceRef = doc(firestore, 'tool_links', editingTool.id);
                    const snapshot = await transaction.get(resourceRef);
                    if (!snapshot.exists() || snapshot.data().organizationId !== orgId) throw new Error('Resource access changed. Refresh and try again.');
                    transaction.update(resourceRef, { title, url, category, description, updatedAt: serverTimestamp() });
                });
            } else {
                await addDoc(collection(firestore, 'tool_links'), {
                    organizationId: orgId,
                    title,
                    url,
                    category,
                    description,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            }
            const message = editingTool ? 'Resource details were updated.' : 'Resource was added to the organization toolkit.';
            setFeedback({ type: 'success', message });
            addToast(editingTool ? 'Resource updated' : 'Resource added', message, 'success');
            setIsToolModalOpen(false);
            setEditingTool(null);
        } catch (error) {
            reportFailure(editingTool ? 'update the resource' : 'add the resource', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAsset = async (event: React.FormEvent) => {
        event.preventDefault();
        const firestore = requireManageAccess();
        if (!firestore) return;

        const name = normalizeText(assetForm.name);
        const serialNumber = normalizeText(assetForm.serialNumber);
        const notes = normalizeText(assetForm.notes);
        const category = assetForm.category;
        const status = assetForm.status;

        if (name.length < 2 || name.length > 100) {
            setFeedback({ type: 'error', message: 'Item names must contain 2 to 100 characters.' });
            return;
        }
        if (!category || !ASSET_CATEGORIES.includes(category)) {
            setFeedback({ type: 'error', message: 'Choose a valid inventory category.' });
            return;
        }
        if (!status || !ASSET_STATUSES.includes(status)) {
            setFeedback({ type: 'error', message: 'Choose a valid inventory status.' });
            return;
        }
        if (serialNumber.length > 80 || notes.length > 500) {
            setFeedback({ type: 'error', message: 'Serial numbers are limited to 80 characters and notes to 500.' });
            return;
        }

        const normalizedSerial = serialNumber.toLowerCase();
        const normalizedName = name.toLowerCase();
        const duplicate = ownedAssets.find(asset => {
            if (asset.id === editingAsset?.id) return false;
            if (normalizedSerial) return normalizeText(asset.serialNumber).toLowerCase() === normalizedSerial;
            return !normalizeText(asset.serialNumber) && normalizeText(asset.name).toLowerCase() === normalizedName;
        });
        if (duplicate) {
            setFeedback({ type: 'error', message: `This item matches "${duplicate.name}". Add a unique serial or inventory ID.` });
            return;
        }

        setIsSaving(true);
        setFeedback(null);
        try {
            if (editingAsset) {
                if (editingAsset.organizationId !== orgId) throw new Error('This item belongs to another organization.');
                await runTransaction(firestore, async transaction => {
                    const assetRef = doc(firestore, 'assets', editingAsset.id);
                    const snapshot = await transaction.get(assetRef);
                    if (!snapshot.exists() || snapshot.data().organizationId !== orgId) throw new Error('Inventory access changed. Refresh and try again.');
                    if (snapshot.data().status === 'in_use' && status !== 'in_use') throw new Error('Return the item before changing its lifecycle status.');
                    transaction.update(assetRef, { name, serialNumber, category, status, notes, updatedAt: serverTimestamp() });
                });
            } else {
                await addDoc(collection(firestore, 'assets'), {
                    organizationId: orgId,
                    name,
                    serialNumber,
                    category,
                    status,
                    notes,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            }
            const message = editingAsset ? 'Inventory details were updated.' : 'Item was added to the hardware register.';
            setFeedback({ type: 'success', message });
            addToast(editingAsset ? 'Item updated' : 'Item added', message, 'success');
            setIsAssetModalOpen(false);
            setEditingAsset(null);
        } catch (error) {
            reportFailure(editingAsset ? 'update the item' : 'add the item', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCheckout = async (event: React.FormEvent) => {
        event.preventDefault();
        const firestore = requireManageAccess();
        if (!firestore || !selectedAsset || !assignStudentId) return;
        if (selectedAsset.organizationId !== orgId) {
            setFeedback({ type: 'error', message: 'This item belongs to another organization.' });
            return;
        }

        const student = eligibleStudents.find(candidate => candidate.id === assignStudentId);
        if (!student || student.organizationId !== orgId) {
            setFeedback({ type: 'error', message: 'Choose an active student from this organization.' });
            return;
        }

        setIsSaving(true);
        try {
            await runTransaction(firestore, async transaction => {
                const assetRef = doc(firestore, 'assets', selectedAsset.id);
                const snapshot = await transaction.get(assetRef);
                if (!snapshot.exists() || snapshot.data().organizationId !== orgId) throw new Error('Inventory access changed. Refresh and try again.');
                if (snapshot.data().status !== 'available') throw new Error('This item is no longer available for checkout.');
                transaction.update(assetRef, {
                    status: 'in_use',
                    assignedTo: student.id,
                    assignedToName: student.name,
                    checkedOutAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            });
            const message = `${selectedAsset.name} is now assigned to ${student.name}.`;
            setFeedback({ type: 'success', message });
            addToast('Checkout recorded', message, 'success');
            setIsCheckoutModalOpen(false);
            setSelectedAsset(null);
            setAssignStudentId('');
        } catch (error) {
            reportFailure('check out the item', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCheckIn = async (asset: Asset) => {
        const firestore = requireManageAccess();
        if (!firestore || asset.organizationId !== orgId) return;
        const confirmed = await confirm({
            title: 'Return item?',
            message: `${asset.name} will be marked available and unassigned from ${asset.assignedToName || 'the current student'}.`,
            confirmText: 'Return item',
            variant: 'warning'
        });
        if (!confirmed) return;

        setBusyId(asset.id);
        try {
            await runTransaction(firestore, async transaction => {
                const assetRef = doc(firestore, 'assets', asset.id);
                const snapshot = await transaction.get(assetRef);
                if (!snapshot.exists() || snapshot.data().organizationId !== orgId) throw new Error('Inventory access changed. Refresh and try again.');
                if (snapshot.data().status !== 'in_use') throw new Error('This item is no longer checked out.');
                transaction.update(assetRef, {
                    status: 'available',
                    assignedTo: null,
                    assignedToName: null,
                    returnedAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            });
            const message = `${asset.name} is available again.`;
            setFeedback({ type: 'success', message });
            addToast('Return recorded', message, 'success');
        } catch (error) {
            reportFailure('return the item', error);
        } finally {
            setBusyId(null);
        }
    };

    const handleDeleteTool = async (tool: ToolLink) => {
        const firestore = requireManageAccess();
        if (!firestore || tool.organizationId !== orgId) return;
        const confirmed = await confirm({
            title: 'Delete resource?',
            message: `"${tool.title}" will be removed from the shared toolkit.`,
            confirmText: 'Delete resource',
            variant: 'danger'
        });
        if (!confirmed) return;

        setBusyId(tool.id);
        try {
            await runTransaction(firestore, async transaction => {
                const resourceRef = doc(firestore, 'tool_links', tool.id);
                const snapshot = await transaction.get(resourceRef);
                if (!snapshot.exists() || snapshot.data().organizationId !== orgId) throw new Error('Resource access changed. Refresh and try again.');
                transaction.delete(resourceRef);
            });
            setFeedback({ type: 'success', message: `${tool.title} was removed.` });
            addToast('Resource deleted', `${tool.title} was removed from the toolkit.`, 'success');
        } catch (error) {
            reportFailure('delete the resource', error);
        } finally {
            setBusyId(null);
        }
    };

    const handleDeleteAsset = async (asset: Asset) => {
        const firestore = requireManageAccess();
        if (!firestore || asset.organizationId !== orgId) return;
        if (asset.status === 'in_use') {
            setFeedback({ type: 'error', message: 'Return this item before deleting it from inventory.' });
            return;
        }
        const confirmed = await confirm({
            title: 'Delete inventory item?',
            message: `"${asset.name}" will be permanently removed from the hardware register.`,
            confirmText: 'Delete item',
            variant: 'danger'
        });
        if (!confirmed) return;

        setBusyId(asset.id);
        try {
            await runTransaction(firestore, async transaction => {
                const assetRef = doc(firestore, 'assets', asset.id);
                const snapshot = await transaction.get(assetRef);
                if (!snapshot.exists() || snapshot.data().organizationId !== orgId) throw new Error('Inventory access changed. Refresh and try again.');
                if (snapshot.data().status === 'in_use') throw new Error('Return this item before deleting it from inventory.');
                transaction.delete(assetRef);
            });
            setFeedback({ type: 'success', message: `${asset.name} was removed from inventory.` });
            addToast('Item deleted', `${asset.name} was removed from inventory.`, 'success');
        } catch (error) {
            reportFailure('delete the item', error);
        } finally {
            setBusyId(null);
        }
    };

    const handleCopyUrl = async (tool: ToolLink) => {
        const url = normalizeResourceUrl(tool.url);
        if (!url) {
            setFeedback({ type: 'error', message: `${tool.title} has an invalid URL. Edit it before sharing.` });
            return;
        }
        if (!navigator.clipboard?.writeText) {
            setFeedback({ type: 'error', message: 'Clipboard access is unavailable in this browser.' });
            return;
        }
        try {
            await navigator.clipboard.writeText(url);
            setFeedback({ type: 'success', message: `${tool.title} link copied.` });
            addToast('Link copied', 'The external resource URL is ready to paste.', 'success');
        } catch (error) {
            reportFailure('copy the link', error);
        }
    };

    const switchTab = (tab: ToolkitTab) => {
        setActiveTab(tab);
        setCategoryFilter('all');
        setStatusFilter('all');
        setSearchQuery('');
        if (tab === 'digital' && sortBy === 'status') setSortBy('name');
    };

    return (
        <div className="flex h-full flex-col space-y-5 pb-24 md:pb-8">
            <AtlasCommandHeader
                eyebrow="Organization resources"
                title="Toolkit"
                description="Keep trusted external resources and accountable equipment ready for daily operations."
                icon={Hammer}
                badges={<span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-bold uppercase text-slate-300">{activeTab === 'digital' ? 'Resource directory' : 'Inventory register'}</span>}
                actions={canManage ? <AtlasActionButton variant="primary" icon={Plus} onClick={openCreateModal}>Add {activeTab === 'digital' ? 'resource' : 'item'}</AtlasActionButton> : undefined}
            />

            {!orgId && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-300/20 bg-amber-300/[0.06] p-3 text-sm text-amber-100" role="alert">
                    <AlertCircle className="mt-0.5 shrink-0" size={17} /> Select an organization to load and manage its toolkit.
                </div>
            )}

            {feedback && (
                <div className={`flex items-start justify-between gap-3 rounded-lg border p-3 text-sm ${feedback.type === 'error' ? 'border-red-400/20 bg-red-500/[0.06] text-red-100' : feedback.type === 'success' ? 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-100' : 'border-sky-400/20 bg-sky-400/[0.06] text-sky-100'}`} role={feedback.type === 'error' ? 'alert' : 'status'} aria-live="polite">
                    <div className="flex items-start gap-2">
                        {feedback.type === 'error' ? <AlertCircle className="mt-0.5 shrink-0" size={16} /> : <CheckCircle2 className="mt-0.5 shrink-0" size={16} />}
                        <span>{feedback.message}</span>
                    </div>
                    <button type="button" onClick={() => setFeedback(null)} className="shrink-0 text-xs font-bold opacity-70 hover:opacity-100" aria-label="Dismiss message">Dismiss</button>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <AtlasSignalCard label="Digital resources" value={ownedToolLinks.length} detail="Validated external links" icon={Library} tone="teal" />
                <AtlasSignalCard label="Hardware assets" value={ownedAssets.length} detail="Organization inventory" icon={Cpu} tone="blue" />
                <AtlasSignalCard label="Ready to use" value={availableAssets} detail="Available for checkout" icon={PackageCheck} tone="emerald" />
                <AtlasSignalCard label={attentionAssets ? 'Needs attention' : 'Checked out'} value={attentionAssets || assignedAssets} detail={attentionAssets ? 'Maintenance or missing' : `${assignedAssets} assigned`} icon={attentionAssets ? Wrench : User} tone={attentionAssets ? 'amber' : 'slate'} />
            </div>

            <AtlasToolbar
                leading={
                    <div className="flex h-10 rounded-lg border border-white/10 bg-slate-950 p-1" role="tablist" aria-label="Toolkit sections">
                        <button type="button" role="tab" aria-selected={activeTab === 'digital'} onClick={() => switchTab('digital')} className={`flex items-center gap-2 rounded-md px-3 text-xs font-bold transition-colors ${activeTab === 'digital' ? 'bg-teal-400/15 text-teal-200' : 'text-slate-500 hover:text-white'}`}>
                            <ExternalLink size={15} /> Resources
                        </button>
                        <button type="button" role="tab" aria-selected={activeTab === 'inventory'} onClick={() => switchTab('inventory')} className={`flex items-center gap-2 rounded-md px-3 text-xs font-bold transition-colors ${activeTab === 'inventory' ? 'bg-teal-400/15 text-teal-200' : 'text-slate-500 hover:text-white'}`}>
                            <Box size={15} /> Hardware
                        </button>
                    </div>
                }
                trailing={
                    <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-[minmax(14rem,1fr)_10rem]">
                        <label className="relative block">
                            <span className="sr-only">Search {activeTab === 'digital' ? 'resources' : 'inventory'}</span>
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input type="search" placeholder={activeTab === 'digital' ? 'Search name, URL, details' : 'Search item, serial, assignee'} value={searchQuery} onChange={event => setSearchQuery(event.target.value)} className="h-10 w-full rounded-lg border border-white/10 bg-slate-950 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-teal-400/50 focus:ring-2 focus:ring-teal-400/10" />
                        </label>
                        <label className="relative block">
                            <span className="sr-only">Sort results</span>
                            <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                            <select value={sortBy} onChange={event => setSortBy(event.target.value as SortOption)} className="h-10 w-full appearance-none rounded-lg border border-white/10 bg-slate-950 pl-8 pr-3 text-xs font-bold text-slate-300 outline-none focus:border-teal-400/50">
                                <option value="name">Name</option>
                                <option value="category">Category</option>
                                <option value="newest">Newest</option>
                                {activeTab === 'inventory' && <option value="status">Status</option>}
                            </select>
                        </label>
                    </div>
                }
            >
                <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
                    <button type="button" onClick={() => setCategoryFilter('all')} aria-pressed={categoryFilter === 'all'} className={`h-8 shrink-0 rounded-lg border px-3 text-[10px] font-bold uppercase transition-colors ${categoryFilter === 'all' ? 'border-teal-300/30 bg-teal-400/10 text-teal-200' : 'border-white/10 bg-slate-950 text-slate-500 hover:border-white/20 hover:text-white'}`}>All categories</button>
                    {(activeTab === 'digital' ? TOOL_CATEGORIES : ASSET_CATEGORIES).map(category => (
                        <button type="button" key={category} onClick={() => setCategoryFilter(category)} aria-pressed={categoryFilter === category} className={`h-8 shrink-0 rounded-lg border px-3 text-[10px] font-bold uppercase transition-colors ${categoryFilter === category ? 'border-teal-300/30 bg-teal-400/10 text-teal-200' : 'border-white/10 bg-slate-950 text-slate-500 hover:border-white/20 hover:text-white'}`}>
                            {category}
                        </button>
                    ))}
                    {activeTab === 'inventory' && (
                        <select aria-label="Filter inventory by status" value={statusFilter} onChange={event => setStatusFilter(event.target.value as 'all' | Asset['status'])} className="h-8 shrink-0 rounded-lg border border-white/10 bg-slate-950 px-3 text-[10px] font-bold uppercase text-slate-300 outline-none focus:border-teal-400/50">
                            <option value="all">All statuses</option>
                            {ASSET_STATUSES.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}
                        </select>
                    )}
                    {hasActiveFilters && <button type="button" onClick={clearFilters} className="h-8 shrink-0 px-2 text-xs font-bold text-slate-400 hover:text-white">Clear</button>}
                </div>
            </AtlasToolbar>

            {activeTab === 'digital' ? (
                <section className="space-y-4" role="tabpanel">
                    <AtlasSectionHeader title="Digital resources" description="External providers open in a new tab; availability and access remain controlled by each provider." icon={ExternalLink} meta={<span className="rounded-md bg-white/[0.05] px-2 py-1 text-[10px] font-bold text-slate-400">{filteredTools.length} shown</span>} />
                    {filteredTools.length === 0 ? (
                        <AtlasEmptyState
                            title={ownedToolLinks.length === 0 ? 'Build the resource directory' : 'No resources match this view'}
                            description={ownedToolLinks.length === 0 ? 'Add approved software, references, and provider links used by your organization.' : 'Clear the current filters or search for another resource.'}
                            icon={Library}
                            action={hasActiveFilters ? <AtlasActionButton onClick={clearFilters}>Clear filters</AtlasActionButton> : canManage ? <AtlasActionButton icon={Plus} variant="primary" onClick={() => openToolModal()}>Add resource</AtlasActionButton> : undefined}
                        />
                    ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                            {filteredTools.map(tool => {
                                const safeUrl = normalizeResourceUrl(tool.url);
                                return (
                                    <article key={tool.id} className="group flex min-h-52 flex-col rounded-lg border border-white/10 bg-slate-900/80 p-4 transition-colors hover:border-teal-300/30">
                                        <div className="mb-3 flex items-start justify-between gap-3">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-400/10 text-sm font-black text-teal-200">{tool.title.charAt(0).toUpperCase()}</div>
                                                <div className="min-w-0"><h3 className="truncate text-sm font-black text-white">{tool.title}</h3><span className="text-[10px] font-bold uppercase text-slate-500">{tool.category}</span></div>
                                            </div>
                                            {canManage && (
                                                <div className="flex shrink-0 gap-1">
                                                    <button type="button" onClick={() => openToolModal(tool)} disabled={busyId === tool.id} className="rounded-lg p-2 text-slate-500 hover:bg-white/[0.06] hover:text-white disabled:opacity-50" aria-label={`Edit ${tool.title}`} title="Edit resource"><Pencil size={15} /></button>
                                                    <button type="button" onClick={() => handleDeleteTool(tool)} disabled={busyId === tool.id} className="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50" aria-label={`Delete ${tool.title}`} title="Delete resource"><Trash2 size={15} /></button>
                                                </div>
                                            )}
                                        </div>
                                        <p className="line-clamp-3 flex-1 text-xs leading-5 text-slate-400">{tool.description || 'No operational notes have been added.'}</p>
                                        <div className="mt-4 grid grid-cols-[2.5rem_1fr] gap-2">
                                            <button type="button" onClick={() => handleCopyUrl(tool)} disabled={!safeUrl} className="flex h-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Copy ${tool.title} URL`} title={safeUrl ? 'Copy URL' : 'Invalid URL'}><Copy size={15} /></button>
                                            {safeUrl ? (
                                                <a href={safeUrl} target="_blank" rel="noopener noreferrer" className="flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] text-xs font-bold text-slate-200 transition-colors hover:border-teal-300/30 hover:bg-teal-400/10 hover:text-teal-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60">Open resource <ExternalLink size={14} /></a>
                                            ) : (
                                                <button type="button" disabled className="h-10 rounded-lg border border-red-400/20 bg-red-500/[0.05] text-xs font-bold text-red-200">Invalid URL</button>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
            ) : (
                <section className="space-y-4" role="tabpanel">
                    <AtlasSectionHeader title="Hardware inventory" description="Track availability, exceptions, assignments, and returns with an explicit custody record." icon={Box} meta={<span className="rounded-md bg-white/[0.05] px-2 py-1 text-[10px] font-bold text-slate-400">{filteredAssets.length} shown</span>} />
                    {filteredAssets.length === 0 ? (
                        <AtlasEmptyState
                            title={ownedAssets.length === 0 ? 'Start the hardware register' : 'No inventory matches this view'}
                            description={ownedAssets.length === 0 ? 'Add organization equipment to track availability and student responsibility.' : 'Clear the current filters or search for another item.'}
                            icon={Box}
                            action={hasActiveFilters ? <AtlasActionButton onClick={clearFilters}>Clear filters</AtlasActionButton> : canManage ? <AtlasActionButton icon={Plus} variant="primary" onClick={() => openAssetModal()}>Add item</AtlasActionButton> : undefined}
                        />
                    ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                            {filteredAssets.map(asset => {
                                const isAvailable = asset.status === 'available';
                                const isInUse = asset.status === 'in_use';
                                const statusStyle = isAvailable
                                    ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                                    : isInUse
                                        ? 'border-amber-300/20 bg-amber-300/10 text-amber-200'
                                        : 'border-red-400/20 bg-red-500/10 text-red-200';
                                return (
                                    <article key={asset.id} className="group flex min-h-60 flex-col rounded-lg border border-white/10 bg-slate-900/80 p-4 transition-colors hover:border-teal-300/30">
                                        <div className="mb-3 flex items-start justify-between gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-sky-400/20 bg-sky-400/10 text-sky-300"><Cpu size={20} /></div>
                                            <div className="flex items-center gap-1">
                                                <span className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase ${statusStyle}`}>{statusLabel(asset.status)}</span>
                                                {canManage && <button type="button" onClick={() => openAssetModal(asset)} disabled={busyId === asset.id} className="rounded-lg p-2 text-slate-500 hover:bg-white/[0.06] hover:text-white disabled:opacity-50" aria-label={`Edit ${asset.name}`} title="Edit item"><Pencil size={15} /></button>}
                                                {canManage && <button type="button" onClick={() => handleDeleteAsset(asset)} disabled={busyId === asset.id || isInUse} className="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-35" aria-label={`Delete ${asset.name}`} title={isInUse ? 'Return item before deleting' : 'Delete item'}><Trash2 size={15} /></button>}
                                            </div>
                                        </div>
                                        <h3 className="text-sm font-black text-white">{asset.name}</h3>
                                        <p className="mt-1 font-mono text-[10px] text-slate-500">ID: {asset.serialNumber || 'Not assigned'}</p>
                                        <div className="my-4 flex-1">
                                            {isInUse ? (
                                                <div className="flex items-center gap-3 rounded-lg border border-amber-300/15 bg-amber-300/[0.05] p-3">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-xs font-black text-white">{asset.assignedToName?.charAt(0) || '?'}</div>
                                                    <div className="min-w-0"><div className="text-[10px] font-bold uppercase text-amber-200">Assigned to</div><div className="truncate text-xs font-bold text-white">{asset.assignedToName || 'Unknown student'}</div></div>
                                                </div>
                                            ) : (
                                                <p className="line-clamp-3 text-xs leading-5 text-slate-500">{asset.notes || (isAvailable ? 'Ready for checkout.' : 'Review the item notes and lifecycle status before use.')}</p>
                                            )}
                                        </div>
                                        {canManage ? (
                                            isAvailable ? <AtlasActionButton variant="primary" icon={CheckSquare} className="w-full" disabled={busyId === asset.id} onClick={() => { setSelectedAsset(asset); setAssignStudentId(''); setIsCheckoutModalOpen(true); }}>Check out</AtlasActionButton>
                                                : isInUse ? <AtlasActionButton icon={RotateCcw} className="w-full" disabled={busyId === asset.id} onClick={() => handleCheckIn(asset)}>{busyId === asset.id ? 'Returning...' : 'Return item'}</AtlasActionButton>
                                                    : <AtlasActionButton icon={Pencil} className="w-full" onClick={() => openAssetModal(asset)}>Review status</AtlasActionButton>
                                        ) : (
                                            <div className={`rounded-lg py-2 text-center text-xs font-bold ${isAvailable ? 'bg-emerald-400/10 text-emerald-300' : 'bg-white/[0.04] text-slate-400'}`}>{isAvailable ? 'Available' : statusLabel(asset.status)}</div>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
            )}

            <Modal isOpen={isToolModalOpen} onClose={() => { if (!isSaving) setIsToolModalOpen(false); }} title={editingTool ? 'Edit Resource' : 'Add Resource'}>
                <form onSubmit={handleSaveTool} className="space-y-4">
                    <div><label htmlFor="tool-title" className="mb-1 block text-xs font-bold text-slate-400">Resource name</label><input id="tool-title" required maxLength={80} className={fieldClassName} value={toolForm.title || ''} onChange={event => setToolForm({ ...toolForm, title: event.target.value })} placeholder="e.g. Arduino IDE" /></div>
                    <div><label htmlFor="tool-url" className="mb-1 block text-xs font-bold text-slate-400">External URL</label><input id="tool-url" type="url" inputMode="url" required className={fieldClassName} value={toolForm.url || ''} onChange={event => setToolForm({ ...toolForm, url: event.target.value })} placeholder="https://provider.example.com" /><p className="mt-1 text-[11px] leading-4 text-slate-500">Only http and https links are accepted. Provider accounts and availability are managed outside Edufy.</p></div>
                    <div><label htmlFor="tool-category" className="mb-1 block text-xs font-bold text-slate-400">Category</label><select id="tool-category" className={`${fieldClassName} capitalize`} value={toolForm.category} onChange={event => setToolForm({ ...toolForm, category: event.target.value as ToolLink['category'] })}>{TOOL_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}</select></div>
                    <div><label htmlFor="tool-description" className="mb-1 block text-xs font-bold text-slate-400">Operational notes</label><textarea id="tool-description" maxLength={240} className={`${fieldClassName} min-h-24 resize-y`} value={toolForm.description || ''} onChange={event => setToolForm({ ...toolForm, description: event.target.value })} placeholder="Who uses it, when, and any access notes" /><div className="mt-1 text-right text-[10px] text-slate-600">{(toolForm.description || '').length}/240</div></div>
                    <AtlasActionButton type="submit" variant="primary" className="w-full" disabled={isSaving}>{isSaving ? 'Saving...' : editingTool ? 'Save changes' : 'Add resource'}</AtlasActionButton>
                </form>
            </Modal>

            <Modal isOpen={isAssetModalOpen} onClose={() => { if (!isSaving) setIsAssetModalOpen(false); }} title={editingAsset ? 'Edit Inventory Item' : 'Add Inventory Item'}>
                <form onSubmit={handleSaveAsset} className="space-y-4">
                    <div><label htmlFor="asset-name" className="mb-1 block text-xs font-bold text-slate-400">Item name</label><input id="asset-name" required maxLength={100} className={fieldClassName} value={assetForm.name || ''} onChange={event => setAssetForm({ ...assetForm, name: event.target.value })} placeholder="e.g. Robotics kit 05" /></div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div><label htmlFor="asset-category" className="mb-1 block text-xs font-bold text-slate-400">Category</label><select id="asset-category" className={`${fieldClassName} capitalize`} value={assetForm.category} onChange={event => setAssetForm({ ...assetForm, category: event.target.value as Asset['category'] })}>{ASSET_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}</select></div>
                        <div><label htmlFor="asset-status" className="mb-1 block text-xs font-bold text-slate-400">Status</label><select id="asset-status" disabled={editingAsset?.status === 'in_use'} className={`${fieldClassName} capitalize`} value={assetForm.status} onChange={event => setAssetForm({ ...assetForm, status: event.target.value as Asset['status'] })}>{ASSET_STATUSES.filter(status => status !== 'in_use' || editingAsset?.status === 'in_use').map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select>{editingAsset?.status === 'in_use' && <p className="mt-1 text-[10px] text-amber-200">Return this item before changing its status.</p>}</div>
                    </div>
                    <div><label htmlFor="asset-serial" className="mb-1 block text-xs font-bold text-slate-400">Serial / inventory ID</label><input id="asset-serial" maxLength={80} className={fieldClassName} value={assetForm.serialNumber || ''} onChange={event => setAssetForm({ ...assetForm, serialNumber: event.target.value })} placeholder="Recommended for duplicate control" /></div>
                    <div><label htmlFor="asset-notes" className="mb-1 block text-xs font-bold text-slate-400">Notes</label><textarea id="asset-notes" maxLength={500} className={`${fieldClassName} min-h-24 resize-y`} value={assetForm.notes || ''} onChange={event => setAssetForm({ ...assetForm, notes: event.target.value })} placeholder="Condition, location, accessories, or handling requirements" /><div className="mt-1 text-right text-[10px] text-slate-600">{(assetForm.notes || '').length}/500</div></div>
                    <AtlasActionButton type="submit" variant="primary" className="w-full" disabled={isSaving}>{isSaving ? 'Saving...' : editingAsset ? 'Save changes' : 'Add to inventory'}</AtlasActionButton>
                </form>
            </Modal>

            <Modal isOpen={isCheckoutModalOpen} onClose={() => { if (!isSaving) setIsCheckoutModalOpen(false); }} title={`Check Out: ${selectedAsset?.name || 'Item'}`}>
                <form onSubmit={handleCheckout} className="space-y-4">
                    <p className="text-sm leading-5 text-slate-500">Assign this item to an active student. The register will retain custody until an authorized return is recorded.</p>
                    <div><label htmlFor="checkout-student" className="mb-1 block text-xs font-bold text-slate-400">Student</label><select id="checkout-student" required className={fieldClassName} value={assignStudentId} onChange={event => setAssignStudentId(event.target.value)}><option value="">Choose student</option>{eligibleStudents.map(student => <option key={student.id} value={student.id}>{student.name}</option>)}</select>{eligibleStudents.length === 0 && <p className="mt-1 text-[11px] text-amber-200">No active students are available in this organization.</p>}</div>
                    <AtlasActionButton type="submit" variant="primary" className="w-full" disabled={!assignStudentId || isSaving}>{isSaving ? 'Assigning...' : 'Assign item'}</AtlasActionButton>
                </form>
            </Modal>
        </div>
    );
};
