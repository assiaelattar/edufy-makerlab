import React, { useEffect, useMemo, useState } from 'react';
import { Box, CheckSquare, Copy, Cpu, ExternalLink, Hammer, Library, PackageCheck, Pencil, Plus, RotateCcw, Search, Trash2, User, Wrench, X } from 'lucide-react';
import { addDoc, collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { useNotifications } from '../context/NotificationContext';
import { Modal } from '../components/Modal';
import { db } from '../services/firebase';
import { Asset, ToolLink } from '../types';
import { EducationActionMenu, EducationButton, EducationDetailPanel, EducationField, EducationIcon, EducationNotice, EducationRegister, EducationState, EducationStatusPill, EducationTabs, EducationToolbar } from '../components/education-ui/EducationPrimitives';
import '../components/education-ui/education-system-v1.css';
import '../components/education-ui/education-system-v1-modules.css';
import './resources/education-toolkit-v1.css';

type ToolkitTab = 'digital' | 'inventory';
type SortOption = 'name' | 'category' | 'newest' | 'status';
type Feedback = { type: 'success' | 'error' | 'info'; message: string };

const TOOL_CATEGORIES: Array<ToolLink['category']> = ['robotics', 'coding', 'design', 'engineering', 'multimedia', 'other'];
const ASSET_CATEGORIES: Array<Asset['category']> = ['robotics', 'computer', 'tools', 'other'];
const ASSET_STATUSES: Array<Asset['status']> = ['available', 'in_use', 'maintenance', 'lost'];

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
    const { toolLinks, assets, students, loading, workspaceError } = useAppContext();
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
    const [detail, setDetail] = useState<{ kind: ToolkitTab; id: string } | null>(null);

    useEffect(() => {
        if (detail) document.getElementById('toolkit-detail')?.focus();
    }, [detail]);

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
        setFeedback(null);
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
        setFeedback(null);
        setAssetForm(asset
            ? { name: asset.name, category: asset.category, status: asset.status, serialNumber: asset.serialNumber || '', notes: asset.notes || '' }
            : { name: '', category: 'robotics', status: 'available', serialNumber: '', notes: '' });
        setIsAssetModalOpen(true);
    };

    const openCreateModal = () => {
        if (activeTab === 'digital') openToolModal();
        else openAssetModal();
    };

    const openCheckoutModal = (asset: Asset) => {
        setFeedback(null);
        setSelectedAsset(asset);
        setAssignStudentId('');
        setIsCheckoutModalOpen(true);
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
        setDetail(null);
        setCategoryFilter('all');
        setStatusFilter('all');
        setSearchQuery('');
        if (tab === 'digital' && sortBy === 'status') setSortBy('name');
    };

    const closeDetail = () => {
        const opener = detail && Array.from(document.querySelectorAll<HTMLButtonElement>('[data-toolkit-detail-id]'))
            .find(button => button.dataset.toolkitDetailId === `${detail.kind}:${detail.id}`);
        setDetail(null);
        opener?.focus();
    };

    const detailTool = detail?.kind === 'digital' ? ownedToolLinks.find(tool => tool.id === detail.id) : undefined;
    const detailAsset = detail?.kind === 'inventory' ? ownedAssets.find(asset => asset.id === detail.id) : undefined;
    const assetTone = (status: Asset['status']) => status === 'available' ? 'success' : status === 'in_use' ? 'info' : status === 'maintenance' ? 'warning' : 'danger';

    return (
        <div className="edu-toolkit-v1 edu-school-ops-v1" data-edu-system="1" data-testid="education-toolkit-v1">
            <header className="edu-toolkit-v1__hero">
                <div className="edu-toolkit-v1__hero-icon"><Hammer size={27} aria-hidden="true" /></div>
                <div className="edu-toolkit-v1__hero-copy">
                    <span className="edu-toolkit-v1__eyebrow">Organization resources</span>
                    <h1>Toolkit</h1>
                    <p>Keep trusted links and school equipment ready for daily use.</p>
                </div>
                {canManage && orgId && !loading && !workspaceError && <EducationButton variant="primary" icon={Plus} onClick={openCreateModal}>Add {activeTab === 'digital' ? 'resource' : 'item'}</EducationButton>}
            </header>

            {!orgId && <EducationState kind="restricted" title="Choose an organization" description="Select an organization to view its resources and inventory." />}
            {orgId && loading && <EducationState kind="loading" title="Loading the toolkit" description="Gathering this organization's resources and inventory." />}
            {orgId && workspaceError && <EducationState kind="error" title="Toolkit data is unavailable" description={workspaceError}><EducationButton onClick={() => window.location.reload()}>Retry loading</EducationButton></EducationState>}
            {feedback && <div className="edu-toolkit-v1__feedback"><EducationNotice status={feedback.type === 'error' ? 'danger' : feedback.type === 'success' ? 'success' : 'info'}>{feedback.message}</EducationNotice><EducationButton variant="quiet" onClick={() => setFeedback(null)}>Dismiss</EducationButton></div>}

            {orgId && !loading && !workspaceError && <>
                <div className="edu-toolkit-v1__summary" aria-label="Toolkit summary">
                    <div><EducationIcon icon={Library} accent="purple" /><span><strong>{ownedToolLinks.length}</strong><small>Digital resources</small></span></div>
                    <div><EducationIcon icon={Cpu} accent="blue" /><span><strong>{ownedAssets.length}</strong><small>Hardware items</small></span></div>
                    <div><EducationIcon icon={PackageCheck} accent="green" /><span><strong>{availableAssets}</strong><small>Ready to use</small></span></div>
                    <div><EducationIcon icon={attentionAssets ? Wrench : User} accent={attentionAssets ? 'orange' : 'yellow'} /><span><strong>{attentionAssets || assignedAssets}</strong><small>{attentionAssets ? 'Need attention' : 'Checked out'}</small></span></div>
                </div>

                <EducationTabs
                    label="Toolkit sections"
                    value={activeTab}
                    onChange={id => switchTab(id as ToolkitTab)}
                    items={[{ id: 'digital', label: 'Digital resources', icon: ExternalLink, count: ownedToolLinks.length }, { id: 'inventory', label: 'Hardware inventory', icon: Box, count: ownedAssets.length, status: attentionAssets ? 'attention' : undefined }]}
                    idPrefix="toolkit"
                />

                <EducationToolbar label="Find toolkit items">
                    <label className="edu-toolkit-v1__search"><Search size={17} aria-hidden="true" /><span className="sr-only">Search {activeTab === 'digital' ? 'resources' : 'inventory'}</span><input type="search" placeholder={activeTab === 'digital' ? 'Search names, links, or notes' : 'Search item, serial, or student'} value={searchQuery} onChange={event => setSearchQuery(event.target.value)} /></label>
                    <label className="edu-toolkit-v1__sort"><span>Sort</span><select value={sortBy} onChange={event => setSortBy(event.target.value as SortOption)}><option value="name">Name</option><option value="category">Category</option><option value="newest">Newest</option>{activeTab === 'inventory' && <option value="status">Status</option>}</select></label>
                </EducationToolbar>
                <div className="edu-toolkit-v1__filters" role="group" aria-label="Category filters">
                    <button type="button" aria-pressed={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')}>All categories</button>
                    {(activeTab === 'digital' ? TOOL_CATEGORIES : ASSET_CATEGORIES).map(category => <button type="button" key={category} aria-pressed={categoryFilter === category} onClick={() => setCategoryFilter(category)}>{category}</button>)}
                    {activeTab === 'inventory' && <label><span>Status</span><select aria-label="Filter inventory by status" value={statusFilter} onChange={event => setStatusFilter(event.target.value as 'all' | Asset['status'])}><option value="all">All statuses</option>{ASSET_STATUSES.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label>}
                    {hasActiveFilters && <EducationButton variant="quiet" onClick={clearFilters}>Clear filters</EducationButton>}
                </div>

                {detailTool && <EducationDetailPanel id="toolkit-detail" tabIndex={-1} label={`Resource details for ${detailTool.title}`} className="edu-toolkit-v1__detail">
                    <div className="edu-toolkit-v1__detail-head"><EducationIcon icon={ExternalLink} accent="purple" /><div><span>Digital resource</span><h2>{detailTool.title}</h2></div><EducationButton variant="quiet" icon={X} onClick={closeDetail}>Close details</EducationButton></div>
                    <EducationStatusPill status="info">{detailTool.category}</EducationStatusPill>
                    <p>{detailTool.description || 'No operational notes have been added.'}</p>
                    <p className="edu-toolkit-v1__url">{detailTool.url}</p>
                    <div className="edu-toolkit-v1__detail-actions"><EducationButton icon={Copy} disabled={!normalizeResourceUrl(detailTool.url)} onClick={() => handleCopyUrl(detailTool)}>Copy link</EducationButton>{normalizeResourceUrl(detailTool.url) && <a className="edu-ds-button edu-toolkit-v1__link-button" href={normalizeResourceUrl(detailTool.url)!} target="_blank" rel="noopener noreferrer">Open resource <ExternalLink size={15} aria-hidden="true" /></a>}{canManage && <EducationButton icon={Pencil} onClick={() => openToolModal(detailTool)}>Edit resource</EducationButton>}</div>
                </EducationDetailPanel>}

                {detailAsset && <EducationDetailPanel id="toolkit-detail" tabIndex={-1} label={`Inventory details for ${detailAsset.name}`} className="edu-toolkit-v1__detail">
                    <div className="edu-toolkit-v1__detail-head"><EducationIcon icon={Cpu} accent="blue" /><div><span>Hardware item</span><h2>{detailAsset.name}</h2></div><EducationButton variant="quiet" icon={X} onClick={closeDetail}>Close details</EducationButton></div>
                    <EducationStatusPill status={assetTone(detailAsset.status)}>{statusLabel(detailAsset.status)}</EducationStatusPill>
                    <dl><div><dt>Category</dt><dd>{detailAsset.category}</dd></div><div><dt>Serial / inventory ID</dt><dd>{detailAsset.serialNumber || 'Not recorded'}</dd></div>{detailAsset.status === 'in_use' && <div><dt>Assigned to</dt><dd>{detailAsset.assignedToName || 'Unknown student'}</dd></div>}</dl>
                    <p>{detailAsset.notes || 'No condition or handling notes have been added.'}</p>
                    {canManage && <div className="edu-toolkit-v1__detail-actions">{detailAsset.status === 'available' && <EducationButton variant="primary" icon={CheckSquare} onClick={() => openCheckoutModal(detailAsset)}>Check out</EducationButton>}{detailAsset.status === 'in_use' && <EducationButton icon={RotateCcw} disabled={busyId === detailAsset.id} onClick={() => handleCheckIn(detailAsset)}>{busyId === detailAsset.id ? 'Returning…' : 'Return item'}</EducationButton>}<EducationButton icon={Pencil} onClick={() => openAssetModal(detailAsset)}>Edit item</EducationButton></div>}
                </EducationDetailPanel>}

                {activeTab === 'digital' ? <div role="tabpanel" id="toolkit-panel-digital" aria-labelledby="toolkit-digital">
                    <EducationRegister title="Digital resources" description="Approved provider links for the school team. External access stays with each provider." icon={Library} actions={<span>{filteredTools.length} shown</span>}>
                        {filteredTools.length === 0 ? <EducationState title={ownedToolLinks.length ? 'No matching resources' : 'Build the resource directory'} description={ownedToolLinks.length ? 'Try another search or clear the current filters.' : 'Add the software, references, and provider links your team uses.'}>{hasActiveFilters ? <EducationButton onClick={clearFilters}>Clear filters</EducationButton> : canManage && <EducationButton variant="primary" icon={Plus} onClick={() => openToolModal()}>Add resource</EducationButton>}</EducationState> :
                            <div className="edu-toolkit-v1__resource-grid">{filteredTools.map(tool => { const safeUrl = normalizeResourceUrl(tool.url); return <article key={tool.id} className="edu-toolkit-v1__resource">
                                <div className="edu-toolkit-v1__card-top"><EducationIcon icon={ExternalLink} accent="purple" /><EducationStatusPill status="info">{tool.category}</EducationStatusPill></div>
                                <h3>{tool.title}</h3><p>{tool.description || 'No operational notes have been added.'}</p>
                                {!safeUrl && <EducationNotice status="danger">The saved URL needs correction before this resource can open.</EducationNotice>}
                                <div className="edu-toolkit-v1__card-actions"><EducationButton data-toolkit-detail-id={`digital:${tool.id}`} onClick={() => setDetail({ kind: 'digital', id: tool.id })}>View details</EducationButton>{safeUrl && <a href={safeUrl} target="_blank" rel="noopener noreferrer" className="edu-ds-button edu-toolkit-v1__link-button">Open <ExternalLink size={15} aria-hidden="true" /></a>}{canManage && <EducationActionMenu label={`Actions for ${tool.title}`}><button type="button" onClick={() => openToolModal(tool)}>Edit resource</button><button type="button" onClick={() => handleCopyUrl(tool)} disabled={!safeUrl}>Copy link</button><button type="button" onClick={() => handleDeleteTool(tool)} disabled={busyId === tool.id}>Delete resource</button></EducationActionMenu>}</div>
                            </article>; })}</div>}
                    </EducationRegister>
                </div> : <div role="tabpanel" id="toolkit-panel-inventory" aria-labelledby="toolkit-inventory">
                    <EducationRegister title="Hardware inventory" description="Availability and custody for equipment assigned to learners." icon={Box} actions={<span>{filteredAssets.length} shown</span>}>
                        {filteredAssets.length === 0 ? <EducationState title={ownedAssets.length ? 'No matching items' : 'Start the hardware register'} description={ownedAssets.length ? 'Try another search or clear the current filters.' : 'Add equipment to track availability and student responsibility.'}>{hasActiveFilters ? <EducationButton onClick={clearFilters}>Clear filters</EducationButton> : canManage && <EducationButton variant="primary" icon={Plus} onClick={() => openAssetModal()}>Add item</EducationButton>}</EducationState> :
                            <div className="edu-toolkit-v1__inventory-list">{filteredAssets.map(asset => <article key={asset.id} className="edu-toolkit-v1__inventory-row">
                                <EducationIcon icon={Cpu} accent="blue" /><div className="edu-toolkit-v1__item-main"><h3>{asset.name}</h3><p>{asset.serialNumber || 'No serial recorded'} · {asset.category}{asset.status === 'in_use' && ` · Assigned to ${asset.assignedToName || 'unknown student'}`}</p></div>
                                <EducationStatusPill status={assetTone(asset.status)}>{statusLabel(asset.status)}</EducationStatusPill>
                                <div className="edu-toolkit-v1__row-actions"><EducationButton data-toolkit-detail-id={`inventory:${asset.id}`} onClick={() => setDetail({ kind: 'inventory', id: asset.id })}>View details</EducationButton>{canManage && asset.status === 'available' && <EducationButton variant="primary" icon={CheckSquare} onClick={() => openCheckoutModal(asset)}>Check out</EducationButton>}{canManage && asset.status === 'in_use' && <EducationButton icon={RotateCcw} disabled={busyId === asset.id} onClick={() => handleCheckIn(asset)}>{busyId === asset.id ? 'Returning…' : 'Return item'}</EducationButton>}{canManage && <EducationActionMenu label={`Actions for ${asset.name}`}><button type="button" onClick={() => openAssetModal(asset)}>Edit item</button><button type="button" onClick={() => handleDeleteAsset(asset)} disabled={busyId === asset.id || asset.status === 'in_use'}>Delete item</button></EducationActionMenu>}</div>
                            </article>)}</div>}
                    </EducationRegister>
                </div>}
                {!canManage && <EducationNotice status="info">Your role can view this toolkit. An organization manager can add, assign, edit, or remove items.</EducationNotice>}
            </>}

            <Modal isOpen={isToolModalOpen} onClose={() => { if (!isSaving) setIsToolModalOpen(false); }} title={editingTool ? 'Edit resource' : 'Add resource'} designSystem={true}>
                <form onSubmit={handleSaveTool} className="edu-toolkit-v1__form">
                    <p>Keep the link recognizable so the team can find and trust it later.</p>
                    {feedback?.type === 'error' && <EducationNotice status="danger">{feedback.message}</EducationNotice>}
                    <EducationField label="Resource name"><input required minLength={2} maxLength={80} value={toolForm.title || ''} onChange={event => setToolForm({ ...toolForm, title: event.target.value })} placeholder="e.g. Arduino IDE" /></EducationField>
                    <EducationField label="External URL" hint="Only http and https links are accepted. Provider access is managed outside Edufy."><input type="url" inputMode="url" required value={toolForm.url || ''} onChange={event => setToolForm({ ...toolForm, url: event.target.value })} placeholder="https://provider.example.com" /></EducationField>
                    <EducationField label="Category"><select value={toolForm.category} onChange={event => setToolForm({ ...toolForm, category: event.target.value as ToolLink['category'] })}>{TOOL_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}</select></EducationField>
                    <EducationField label="Operational notes" hint={`${(toolForm.description || '').length}/240 characters`}><textarea maxLength={240} value={toolForm.description || ''} onChange={event => setToolForm({ ...toolForm, description: event.target.value })} placeholder="Who uses it, when, and any access notes" /></EducationField>
                    <div className="edu-toolkit-v1__form-actions"><EducationButton onClick={() => setIsToolModalOpen(false)} disabled={isSaving}>Cancel</EducationButton><EducationButton type="submit" variant="primary" disabled={isSaving}>{isSaving ? 'Saving…' : editingTool ? 'Save changes' : 'Add resource'}</EducationButton></div>
                </form>
            </Modal>
            <Modal isOpen={isAssetModalOpen} onClose={() => { if (!isSaving) setIsAssetModalOpen(false); }} title={editingAsset ? 'Edit inventory item' : 'Add inventory item'} designSystem={true}>
                <form onSubmit={handleSaveAsset} className="edu-toolkit-v1__form">
                    <p>Record the item and its condition before it enters the checkout queue.</p>
                    {feedback?.type === 'error' && <EducationNotice status="danger">{feedback.message}</EducationNotice>}
                    <EducationField label="Item name"><input required minLength={2} maxLength={100} value={assetForm.name || ''} onChange={event => setAssetForm({ ...assetForm, name: event.target.value })} placeholder="e.g. Robotics kit 05" /></EducationField>
                    <div className="edu-toolkit-v1__form-grid"><EducationField label="Category"><select value={assetForm.category} onChange={event => setAssetForm({ ...assetForm, category: event.target.value as Asset['category'] })}>{ASSET_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}</select></EducationField><EducationField label="Status" hint={editingAsset?.status === 'in_use' ? 'Return this item before changing its status.' : undefined}><select disabled={editingAsset?.status === 'in_use'} value={assetForm.status} onChange={event => setAssetForm({ ...assetForm, status: event.target.value as Asset['status'] })}>{ASSET_STATUSES.filter(status => status !== 'in_use' || editingAsset?.status === 'in_use').map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></EducationField></div>
                    <EducationField label="Serial / inventory ID" hint="Recommended for duplicate control."><input maxLength={80} value={assetForm.serialNumber || ''} onChange={event => setAssetForm({ ...assetForm, serialNumber: event.target.value })} placeholder="Unique inventory reference" /></EducationField>
                    <EducationField label="Condition and handling notes" hint={`${(assetForm.notes || '').length}/500 characters`}><textarea maxLength={500} value={assetForm.notes || ''} onChange={event => setAssetForm({ ...assetForm, notes: event.target.value })} placeholder="Condition, location, accessories, or handling requirements" /></EducationField>
                    <div className="edu-toolkit-v1__form-actions"><EducationButton onClick={() => setIsAssetModalOpen(false)} disabled={isSaving}>Cancel</EducationButton><EducationButton type="submit" variant="primary" disabled={isSaving}>{isSaving ? 'Saving…' : editingAsset ? 'Save changes' : 'Add to inventory'}</EducationButton></div>
                </form>
            </Modal>
            <Modal isOpen={isCheckoutModalOpen} onClose={() => { if (!isSaving) setIsCheckoutModalOpen(false); }} title={`Check out: ${selectedAsset?.name || 'item'}`} designSystem={true}>
                <form onSubmit={handleCheckout} className="edu-toolkit-v1__form">
                    <p>Assign this item to an active student. It remains in their custody until an authorized return is recorded.</p>
                    {feedback?.type === 'error' && <EducationNotice status="danger">{feedback.message}</EducationNotice>}
                    <EducationField label="Student" hint={eligibleStudents.length ? undefined : 'No active students are available in this organization.'}><select required value={assignStudentId} onChange={event => setAssignStudentId(event.target.value)}><option value="">Choose student</option>{eligibleStudents.map(student => <option key={student.id} value={student.id}>{student.name}</option>)}</select></EducationField>
                    <div className="edu-toolkit-v1__form-actions"><EducationButton onClick={() => setIsCheckoutModalOpen(false)} disabled={isSaving}>Cancel</EducationButton><EducationButton type="submit" variant="primary" disabled={!assignStudentId || isSaving}>{isSaving ? 'Assigning…' : 'Assign item'}</EducationButton></div>
                </form>
            </Modal>
        </div>
    );
};
