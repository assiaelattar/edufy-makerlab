import React, { useMemo, useState } from 'react';
import {
    Archive,
    ArchiveRestore,
    ArrowDownAZ,
    CheckCircle2,
    Clipboard,
    ExternalLink,
    FileText,
    FolderOpen,
    Globe2,
    Library,
    Link as LinkIcon,
    Loader2,
    Pencil,
    Plus,
    RotateCcw,
    Search,
    ShieldAlert,
    Trash2,
    X
} from 'lucide-react';
import {
    addDoc,
    collection,
    doc,
    runTransaction,
    serverTimestamp
} from 'firebase/firestore';
import { AtlasActionButton, AtlasCommandHeader, AtlasEmptyState, AtlasSectionHeader, AtlasSignalCard, AtlasToolbar } from '../components/atlas/AtlasSurface';
import { Modal } from '../components/Modal';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { useNotifications } from '../context/NotificationContext';
import { db } from '../services/firebase';
import { ArchiveLink } from '../types';

type ArchiveCategory = ArchiveLink['category'];
type ArchiveStatus = 'active' | 'archived';
type StatusFilter = 'active' | 'archived' | 'all';
type SortOption = 'updated_desc' | 'created_desc' | 'title_asc' | 'title_desc';

type ArchiveRecord = ArchiveLink & {
    status?: ArchiveStatus;
    normalizedUrl?: string;
    updatedAt?: unknown;
    updatedBy?: string;
};

interface LinkFormState {
    title: string;
    url: string;
    category: ArchiveCategory;
    description: string;
}

const EMPTY_FORM: LinkFormState = {
    title: '',
    url: '',
    category: 'other',
    description: ''
};

const CATEGORY_OPTIONS: Array<{ id: 'all' | ArchiveCategory; label: string; icon: typeof LinkIcon }> = [
    { id: 'all', label: 'All', icon: FolderOpen },
    { id: 'gemini_gems', label: 'AI resources', icon: LinkIcon },
    { id: 'websites', label: 'Websites', icon: Globe2 },
    { id: 'sheets', label: 'Sheets', icon: FileText },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'other', label: 'Other', icon: LinkIcon }
];

const CATEGORY_IDS = new Set<ArchiveCategory>(['gemini_gems', 'websites', 'sheets', 'documents', 'other']);

const getRecordStatus = (link: ArchiveRecord): ArchiveStatus => link.status === 'archived' ? 'archived' : 'active';

const getTimestampMillis = (value: unknown): number => {
    if (!value) return 0;
    if (typeof value === 'object' && value !== null && 'toMillis' in value && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
        return (value as { toMillis: () => number }).toMillis();
    }
    if (value instanceof Date) return value.getTime();
    const parsed = new Date(String(value)).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
};

const getErrorMessage = (error: unknown, fallback: string) => error instanceof Error && error.message ? error.message : fallback;

const normalizeResourceUrl = (value: string) => {
    const input = value.trim();
    if (!input) throw new Error('Enter a resource URL.');

    let parsed: URL;
    try {
        parsed = new URL(input);
    } catch {
        throw new Error('Enter a complete URL beginning with http:// or https://.');
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new Error('Only http:// and https:// links are supported.');
    }

    parsed.hash = '';
    parsed.hostname = parsed.hostname.toLowerCase();
    const normalizedUrl = parsed.toString().replace(/\/$/, '');
    return {
        url: normalizedUrl,
        normalizedUrl: normalizedUrl.toLowerCase(),
        hostname: parsed.hostname.replace(/^www\./, '')
    };
};

const normalizeExistingUrl = (link: ArchiveRecord) => {
    if (link.normalizedUrl) return link.normalizedUrl.toLowerCase();
    try {
        return normalizeResourceUrl(link.url).normalizedUrl;
    } catch {
        return link.url.trim().toLowerCase();
    }
};

export const ArchiveView = () => {
    const { archiveLinks = [], loading } = useAppContext();
    const { userProfile, currentOrganization, can } = useAuth();
    const { confirm } = useConfirm();
    const { addToast } = useNotifications();

    const organizationId = currentOrganization?.id || '';
    const canManage = can('toolkit.manage');
    const canView = canManage || can('toolkit.view');

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<'all' | ArchiveCategory>('all');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
    const [sortOption, setSortOption] = useState<SortOption>('updated_desc');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLink, setEditingLink] = useState<ArchiveRecord | null>(null);
    const [linkForm, setLinkForm] = useState<LinkFormState>(EMPTY_FORM);
    const [formError, setFormError] = useState('');
    const [operationError, setOperationError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [mutatingId, setMutatingId] = useState<string | null>(null);
    const [copyingId, setCopyingId] = useState<string | null>(null);

    const tenantLinks = useMemo(
        () => (archiveLinks as ArchiveRecord[]).filter(link => Boolean(organizationId) && link.organizationId === organizationId),
        [archiveLinks, organizationId]
    );

    const activeCount = useMemo(() => tenantLinks.filter(link => getRecordStatus(link) === 'active').length, [tenantLinks]);
    const archivedCount = tenantLinks.length - activeCount;
    const usedCategoryCount = useMemo(() => new Set(tenantLinks.map(link => link.category)).size, [tenantLinks]);

    const filteredLinks = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        return tenantLinks
            .filter(link => {
                const statusMatches = statusFilter === 'all' || getRecordStatus(link) === statusFilter;
                const categoryMatches = selectedCategory === 'all' || link.category === selectedCategory;
                const searchMatches = !normalizedSearch || [link.title, link.description, link.url, link.createdBy]
                    .some(value => String(value || '').toLowerCase().includes(normalizedSearch));
                return statusMatches && categoryMatches && searchMatches;
            })
            .sort((left, right) => {
                if (sortOption === 'title_asc') return left.title.localeCompare(right.title);
                if (sortOption === 'title_desc') return right.title.localeCompare(left.title);
                if (sortOption === 'created_desc') return getTimestampMillis(right.createdAt) - getTimestampMillis(left.createdAt);
                const rightUpdated = getTimestampMillis(right.updatedAt) || getTimestampMillis(right.createdAt);
                const leftUpdated = getTimestampMillis(left.updatedAt) || getTimestampMillis(left.createdAt);
                return rightUpdated - leftUpdated;
            });
    }, [searchTerm, selectedCategory, sortOption, statusFilter, tenantLinks]);

    const hasFilters = Boolean(searchTerm.trim()) || selectedCategory !== 'all' || statusFilter !== 'active' || sortOption !== 'updated_desc';

    const resetModal = () => {
        setIsModalOpen(false);
        setEditingLink(null);
        setLinkForm(EMPTY_FORM);
        setFormError('');
    };

    const openAddModal = () => {
        setEditingLink(null);
        setLinkForm(EMPTY_FORM);
        setFormError('');
        setOperationError('');
        setIsModalOpen(true);
    };

    const handleEditLink = (link: ArchiveRecord) => {
        if (!canManage || link.organizationId !== organizationId) {
            setOperationError('You do not have permission to edit this resource.');
            return;
        }
        setEditingLink(link);
        setLinkForm({
            title: link.title,
            url: link.url,
            category: link.category,
            description: link.description || ''
        });
        setFormError('');
        setOperationError('');
        setIsModalOpen(true);
    };

    const validateForm = () => {
        const title = linkForm.title.trim().replace(/\s+/g, ' ');
        const description = linkForm.description.trim();
        if (title.length < 2) throw new Error('Use a title with at least 2 characters.');
        if (title.length > 120) throw new Error('Keep the title under 120 characters.');
        if (description.length > 500) throw new Error('Keep the description under 500 characters.');
        if (!CATEGORY_IDS.has(linkForm.category)) throw new Error('Choose a valid resource category.');
        const normalized = normalizeResourceUrl(linkForm.url);
        const duplicate = tenantLinks.find(link => link.id !== editingLink?.id && normalizeExistingUrl(link) === normalized.normalizedUrl);
        if (duplicate) throw new Error(`This URL is already saved as "${duplicate.title}".`);
        return { title, description, ...normalized };
    };

    const assertWriteAccess = () => {
        if (!db) throw new Error('The archive service is unavailable. Try again when the connection is restored.');
        if (!organizationId) throw new Error('Select an organization before changing its archive.');
        if (!userProfile || !canManage) throw new Error('You do not have permission to manage organization resources.');
        return db;
    };

    const handleSaveLink = async (event: React.FormEvent) => {
        event.preventDefault();
        setFormError('');
        setOperationError('');
        setIsSaving(true);

        try {
            const firestore = assertWriteAccess();
            const normalized = validateForm();
            const actorId = userProfile?.uid || userProfile?.email || 'unknown';
            const payload = {
                title: normalized.title,
                url: normalized.url,
                normalizedUrl: normalized.normalizedUrl,
                category: linkForm.category,
                description: normalized.description,
                updatedAt: serverTimestamp(),
                updatedBy: actorId
            };

            if (editingLink) {
                await runTransaction(firestore, async transaction => {
                    const reference = doc(firestore, 'archive_links', editingLink.id);
                    const snapshot = await transaction.get(reference);
                    if (!snapshot.exists()) throw new Error('This resource no longer exists. Refresh the archive and try again.');
                    if (snapshot.data().organizationId !== organizationId) throw new Error('This resource belongs to another organization and cannot be changed.');
                    transaction.update(reference, payload);
                });
                addToast('Resource updated', `${normalized.title} is current in the organization archive.`, 'success');
            } else {
                await addDoc(collection(firestore, 'archive_links'), {
                    ...payload,
                    organizationId,
                    status: 'active' satisfies ArchiveStatus,
                    createdBy: actorId,
                    createdAt: serverTimestamp()
                });
                addToast('Resource added', `${normalized.title} is now available to the organization.`, 'success');
            }

            resetModal();
        } catch (error) {
            setFormError(getErrorMessage(error, 'The resource could not be saved.'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteLink = async (link: ArchiveRecord) => {
        if (!canManage || link.organizationId !== organizationId) {
            setOperationError('You do not have permission to delete this resource.');
            return;
        }
        const confirmed = await confirm({
            title: 'Delete resource?',
            message: `"${link.title}" will be permanently removed from the organization archive.`,
            confirmText: 'Delete resource',
            variant: 'danger'
        });
        if (!confirmed) return;

        setOperationError('');
        setMutatingId(link.id);
        try {
            const firestore = assertWriteAccess();
            await runTransaction(firestore, async transaction => {
                const reference = doc(firestore, 'archive_links', link.id);
                const snapshot = await transaction.get(reference);
                if (!snapshot.exists()) throw new Error('This resource was already removed.');
                if (snapshot.data().organizationId !== organizationId) throw new Error('This resource belongs to another organization and cannot be deleted.');
                transaction.delete(reference);
            });
            addToast('Resource deleted', `${link.title} was removed from the archive.`, 'success');
        } catch (error) {
            const message = getErrorMessage(error, 'The resource could not be deleted.');
            setOperationError(message);
            addToast('Delete failed', message, 'error');
        } finally {
            setMutatingId(null);
        }
    };

    const handleStatusChange = async (link: ArchiveRecord) => {
        if (!canManage || link.organizationId !== organizationId) {
            setOperationError('You do not have permission to change this resource status.');
            return;
        }
        const currentStatus = getRecordStatus(link);
        const nextStatus: ArchiveStatus = currentStatus === 'active' ? 'archived' : 'active';
        if (nextStatus === 'archived') {
            const confirmed = await confirm({
                title: 'Archive resource?',
                message: `"${link.title}" will leave the active library but remain available in Archived.`,
                confirmText: 'Archive resource',
                variant: 'warning'
            });
            if (!confirmed) return;
        }

        setOperationError('');
        setMutatingId(link.id);
        try {
            const firestore = assertWriteAccess();
            const actorId = userProfile?.uid || userProfile?.email || 'unknown';
            await runTransaction(firestore, async transaction => {
                const reference = doc(firestore, 'archive_links', link.id);
                const snapshot = await transaction.get(reference);
                if (!snapshot.exists()) throw new Error('This resource no longer exists. Refresh the archive and try again.');
                if (snapshot.data().organizationId !== organizationId) throw new Error('This resource belongs to another organization and cannot be changed.');
                transaction.update(reference, {
                    status: nextStatus,
                    updatedAt: serverTimestamp(),
                    updatedBy: actorId
                });
            });
            addToast(
                nextStatus === 'active' ? 'Resource restored' : 'Resource archived',
                nextStatus === 'active' ? `${link.title} is back in the active library.` : `${link.title} moved to Archived.`,
                'success'
            );
        } catch (error) {
            const message = getErrorMessage(error, 'The resource status could not be changed.');
            setOperationError(message);
            addToast('Status update failed', message, 'error');
        } finally {
            setMutatingId(null);
        }
    };

    const handleCopyLink = async (link: ArchiveRecord) => {
        setOperationError('');
        setCopyingId(link.id);
        try {
            const normalized = normalizeResourceUrl(link.url);
            if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is not available in this browser.');
            await navigator.clipboard.writeText(normalized.url);
            addToast('Link copied', `${link.title} is ready to paste.`, 'success');
        } catch (error) {
            const message = getErrorMessage(error, 'The link could not be copied.');
            setOperationError(message);
            addToast('Copy failed', message, 'error');
        } finally {
            setCopyingId(null);
        }
    };

    const handleOpenLink = (link: ArchiveRecord) => {
        setOperationError('');
        try {
            const normalized = normalizeResourceUrl(link.url);
            const openedWindow = window.open('', '_blank');
            if (!openedWindow) {
                setOperationError('The browser blocked the new tab. Allow pop-ups for Edufy, then open the resource again.');
                return;
            }
            openedWindow.opener = null;
            openedWindow.location.replace(normalized.url);
        } catch (error) {
            const message = getErrorMessage(error, 'This resource has an invalid URL.');
            setOperationError(message);
            addToast('Unable to open resource', message, 'error');
        }
    };

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedCategory('all');
        setStatusFilter('active');
        setSortOption('updated_desc');
    };

    if (!canView) {
        return (
            <div className="pb-24 md:pb-8">
                <AtlasEmptyState
                    icon={ShieldAlert}
                    title="Archive access is restricted"
                    description="Your current role does not include access to organization resources."
                />
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col space-y-5 pb-24 md:pb-8">
            <AtlasCommandHeader
                eyebrow="Organization knowledge"
                title="Resource Archive"
                description="Maintain the trusted links and working references used across the organization."
                icon={Archive}
                badges={<span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-bold uppercase text-slate-300">{canManage ? 'Managed library' : 'Read only'}</span>}
                actions={canManage ? <AtlasActionButton variant="primary" icon={Plus} onClick={openAddModal}>Add resource</AtlasActionButton> : undefined}
            />

            {!organizationId ? (
                <AtlasEmptyState
                    icon={ShieldAlert}
                    title="No organization selected"
                    description="Select an organization to load its resource archive."
                />
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                        <AtlasSignalCard label="Active" value={activeCount} detail="Ready for the team" icon={CheckCircle2} tone="emerald" onClick={() => setStatusFilter('active')} />
                        <AtlasSignalCard label="Archived" value={archivedCount} detail="Retained references" icon={ArchiveRestore} tone="amber" onClick={() => setStatusFilter('archived')} />
                        <AtlasSignalCard label="Categories" value={usedCategoryCount} detail="Resource types in use" icon={Library} tone="blue" />
                        <AtlasSignalCard label="Current view" value={filteredLinks.length} detail={hasFilters ? 'Matching filters' : 'Active resources'} icon={Search} tone="slate" />
                    </div>

                    {operationError && (
                        <div role="alert" className="flex items-start justify-between gap-3 rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                            <div className="flex min-w-0 items-start gap-2">
                                <ShieldAlert className="mt-0.5 shrink-0 text-red-300" size={17} />
                                <span>{operationError}</span>
                            </div>
                            <button type="button" onClick={() => setOperationError('')} className="shrink-0 rounded-md p-1 text-red-200 hover:bg-red-400/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300" aria-label="Dismiss message">
                                <X size={15} />
                            </button>
                        </div>
                    )}

                    <AtlasToolbar
                        leading={
                            <div className="relative w-full lg:max-w-sm">
                                <label htmlFor="archive-search" className="sr-only">Search resources</label>
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
                                <input
                                    id="archive-search"
                                    type="search"
                                    placeholder="Search title, URL, description..."
                                    className="h-10 w-full rounded-lg border border-white/10 bg-slate-950 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-teal-400/50 focus:ring-2 focus:ring-teal-400/10"
                                    value={searchTerm}
                                    onChange={event => setSearchTerm(event.target.value)}
                                />
                            </div>
                        }
                        trailing={
                            <div className="flex w-full gap-2 sm:w-auto">
                                <label htmlFor="archive-status" className="sr-only">Filter by status</label>
                                <select id="archive-status" value={statusFilter} onChange={event => setStatusFilter(event.target.value as StatusFilter)} className="h-10 min-w-28 flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 text-xs font-bold text-slate-200 outline-none focus:border-teal-400/50 focus:ring-2 focus:ring-teal-400/10 sm:flex-none">
                                    <option value="active">Active</option>
                                    <option value="archived">Archived</option>
                                    <option value="all">All statuses</option>
                                </select>
                                <label htmlFor="archive-sort" className="sr-only">Sort resources</label>
                                <select id="archive-sort" value={sortOption} onChange={event => setSortOption(event.target.value as SortOption)} className="h-10 min-w-36 flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 text-xs font-bold text-slate-200 outline-none focus:border-teal-400/50 focus:ring-2 focus:ring-teal-400/10 sm:flex-none">
                                    <option value="updated_desc">Recently updated</option>
                                    <option value="created_desc">Recently added</option>
                                    <option value="title_asc">Title A-Z</option>
                                    <option value="title_desc">Title Z-A</option>
                                </select>
                            </div>
                        }
                    >
                        <div className="flex w-full gap-2 overflow-x-auto pb-1 lg:pb-0" aria-label="Resource categories">
                            {CATEGORY_OPTIONS.map(category => (
                                <button
                                    key={category.id}
                                    type="button"
                                    onClick={() => setSelectedCategory(category.id)}
                                    aria-pressed={selectedCategory === category.id}
                                    className={`flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 ${selectedCategory === category.id ? 'border-teal-300/30 bg-teal-400/10 text-teal-200' : 'border-white/10 bg-slate-950 text-slate-400 hover:border-white/20 hover:text-white'}`}
                                >
                                    <category.icon size={14} />
                                    {category.label}
                                </button>
                            ))}
                        </div>
                    </AtlasToolbar>

                    <section className="space-y-4" aria-labelledby="archive-results-title">
                        <AtlasSectionHeader
                            title={statusFilter === 'archived' ? 'Archived resources' : statusFilter === 'all' ? 'All resources' : 'Active resources'}
                            description={canManage ? 'Keep references current, or archive links that are no longer in daily use.' : 'Open or copy trusted organization resources.'}
                            icon={FolderOpen}
                            meta={<span className="rounded-md bg-white/[0.05] px-2 py-1 text-[10px] font-bold text-slate-400">{filteredLinks.length} shown</span>}
                            actions={hasFilters ? <AtlasActionButton icon={RotateCcw} variant="quiet" onClick={clearFilters}>Reset filters</AtlasActionButton> : undefined}
                        />
                        <span id="archive-results-title" className="sr-only">Archive search results</span>

                        {loading ? (
                            <div className="flex min-h-48 items-center justify-center rounded-lg border border-white/10 bg-slate-950/50 text-sm text-slate-400" role="status">
                                <Loader2 className="mr-2 animate-spin text-teal-300" size={18} /> Loading organization resources
                            </div>
                        ) : filteredLinks.length === 0 ? (
                            <AtlasEmptyState
                                title={tenantLinks.length === 0 ? 'Start the organization archive' : 'No resources match this view'}
                                description={tenantLinks.length === 0 ? 'Add the first trusted link for your team.' : 'Adjust the filters or search to return to available resources.'}
                                icon={Archive}
                                action={tenantLinks.length === 0 && canManage ? <AtlasActionButton variant="primary" icon={Plus} onClick={openAddModal}>Add first resource</AtlasActionButton> : hasFilters ? <AtlasActionButton icon={RotateCcw} onClick={clearFilters}>Reset filters</AtlasActionButton> : undefined}
                            />
                        ) : (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {filteredLinks.map(link => {
                                    const category = CATEGORY_OPTIONS.find(option => option.id === link.category);
                                    const CategoryIcon = category?.icon || LinkIcon;
                                    const isArchived = getRecordStatus(link) === 'archived';
                                    const isMutating = mutatingId === link.id;
                                    let hostname = link.url;
                                    try {
                                        hostname = normalizeResourceUrl(link.url).hostname;
                                    } catch {
                                        hostname = 'Invalid URL';
                                    }

                                    return (
                                        <article key={link.id} className="group flex min-h-56 flex-col rounded-lg border border-white/10 bg-slate-900/80 p-4 transition-colors hover:border-teal-300/30">
                                            <div className="mb-3 flex items-start justify-between gap-3">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${isArchived ? 'border-amber-300/20 bg-amber-300/10 text-amber-200' : 'border-teal-400/20 bg-teal-400/10 text-teal-300'}`}>
                                                        <CategoryIcon size={18} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="truncate text-sm font-black text-white" title={link.title}>{link.title}</h3>
                                                        <div className="mt-1 flex min-w-0 items-center gap-2 text-[10px] font-bold uppercase text-slate-500">
                                                            <span>{category?.label || 'Other'}</span>
                                                            <span aria-hidden="true">/</span>
                                                            <span className={isArchived ? 'text-amber-200' : 'text-emerald-300'}>{isArchived ? 'Archived' : 'Active'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {canManage && (
                                                    <div className="flex shrink-0 gap-1 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                                                        <button type="button" onClick={() => handleEditLink(link)} disabled={isMutating} className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 disabled:opacity-40" aria-label={`Edit ${link.title}`} title="Edit resource"><Pencil size={14} /></button>
                                                        <button type="button" onClick={() => handleStatusChange(link)} disabled={isMutating} className="rounded-lg p-2 text-slate-400 hover:bg-amber-300/10 hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 disabled:opacity-40" aria-label={`${isArchived ? 'Restore' : 'Archive'} ${link.title}`} title={isArchived ? 'Restore resource' : 'Archive resource'}>{isMutating ? <Loader2 className="animate-spin" size={14} /> : isArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}</button>
                                                        <button type="button" onClick={() => handleDeleteLink(link)} disabled={isMutating} className="rounded-lg p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 disabled:opacity-40" aria-label={`Delete ${link.title}`} title="Delete resource"><Trash2 size={14} /></button>
                                                    </div>
                                                )}
                                            </div>

                                            <p className="mb-4 line-clamp-3 flex-1 text-xs leading-5 text-slate-400">{link.description || 'No description provided.'}</p>
                                            <div className="mb-3 flex min-w-0 items-center gap-2 rounded-md bg-slate-950/70 px-3 py-2 text-xs text-slate-500" title={link.url}>
                                                <Globe2 className="shrink-0" size={13} />
                                                <span className="truncate">{hostname}</span>
                                            </div>
                                            <div className="grid grid-cols-[1fr_40px] gap-2">
                                                <button type="button" onClick={() => handleOpenLink(link)} className="flex h-10 min-w-0 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-bold text-slate-200 transition-colors hover:border-teal-300/30 hover:bg-teal-400/10 hover:text-teal-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60">
                                                    <ExternalLink size={14} /> Open resource
                                                </button>
                                                <button type="button" onClick={() => handleCopyLink(link)} disabled={copyingId === link.id} className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 transition-colors hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 disabled:opacity-50" aria-label={`Copy link for ${link.title}`} title="Copy link">
                                                    {copyingId === link.id ? <Loader2 className="animate-spin" size={14} /> : <Clipboard size={14} />}
                                                </button>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </>
            )}

            <Modal isOpen={isModalOpen} onClose={() => { if (!isSaving) resetModal(); }} title={editingLink ? 'Edit resource' : 'Add resource'}>
                <form onSubmit={handleSaveLink} className="space-y-4" noValidate>
                    {formError && <div id="archive-form-error" role="alert" className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-100">{formError}</div>}
                    <div>
                        <label htmlFor="archive-title" className="mb-1 block text-xs font-bold text-slate-400">Title</label>
                        <input id="archive-title" type="text" required maxLength={120} autoFocus className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-white outline-none focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10" value={linkForm.title} onChange={event => setLinkForm(current => ({ ...current, title: event.target.value }))} placeholder="Resource name" aria-describedby={formError ? 'archive-form-error' : undefined} />
                        <div className="mt-1 text-right text-[10px] text-slate-600">{linkForm.title.length}/120</div>
                    </div>
                    <div>
                        <label htmlFor="archive-url" className="mb-1 block text-xs font-bold text-slate-400">URL</label>
                        <input id="archive-url" type="url" required inputMode="url" className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-white outline-none focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10" value={linkForm.url} onChange={event => setLinkForm(current => ({ ...current, url: event.target.value }))} placeholder="https://example.com/resource" aria-describedby={formError ? 'archive-form-error' : undefined} />
                    </div>
                    <div>
                        <label htmlFor="archive-category" className="mb-1 block text-xs font-bold text-slate-400">Category</label>
                        <select id="archive-category" className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-white outline-none focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10" value={linkForm.category} onChange={event => setLinkForm(current => ({ ...current, category: event.target.value as ArchiveCategory }))}>
                            {CATEGORY_OPTIONS.filter(category => category.id !== 'all').map(category => <option key={category.id} value={category.id}>{category.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <div className="mb-1 flex items-center justify-between gap-3">
                            <label htmlFor="archive-description" className="text-xs font-bold text-slate-400">Description</label>
                            <span className="text-[10px] text-slate-600">{linkForm.description.length}/500</span>
                        </div>
                        <textarea id="archive-description" maxLength={500} className="h-24 w-full resize-y rounded-lg border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10" value={linkForm.description} onChange={event => setLinkForm(current => ({ ...current, description: event.target.value }))} placeholder="Owner, purpose, or usage context" />
                    </div>
                    <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                        <AtlasActionButton type="button" variant="secondary" onClick={resetModal} disabled={isSaving}>Cancel</AtlasActionButton>
                        <AtlasActionButton type="submit" variant="primary" icon={isSaving ? Loader2 : editingLink ? Pencil : Plus} disabled={isSaving} className={isSaving ? '[&_svg]:animate-spin' : ''}>
                            {isSaving ? 'Saving...' : editingLink ? 'Save changes' : 'Add resource'}
                        </AtlasActionButton>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
