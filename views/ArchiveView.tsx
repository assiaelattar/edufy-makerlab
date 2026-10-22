import React, { useEffect, useMemo, useState } from 'react';
import './resources/education-archive-v1.css';
import '../components/education-ui/education-system-v1.css';
import '../components/education-ui/education-system-v1-modules.css';
import {
    Archive,
    ArchiveRestore,
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
import { AtlasCommandHeader, AtlasSignalCard } from '../components/atlas/AtlasSurface';
import { EducationActionMenu, EducationBadge, EducationButton, EducationDetailPanel, EducationField, EducationNotice, EducationSectionHeader, EducationState, EducationStatusPill, EducationToolbar } from '../components/education-ui/EducationPrimitives';
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
class ArchiveFieldError extends Error {
    constructor(public field: keyof LinkFormState, message: string) { super(message); }
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
const formatRecordDate = (value: unknown) => {
    const timestamp = getTimestampMillis(value);
    return timestamp ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(timestamp) : 'Not recorded';
};

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
    const [formErrorField, setFormErrorField] = useState<keyof LinkFormState | null>(null);
    const [operationError, setOperationError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [mutatingId, setMutatingId] = useState<string | null>(null);
    const [copyingId, setCopyingId] = useState<string | null>(null);
    const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);

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
    const selectedLink = filteredLinks.find(link => link.id === selectedLinkId) || null;
    useEffect(() => {
        if (!selectedLinkId || !selectedLink) return;
        const frame = requestAnimationFrame(() => document.getElementById('archive-detail')?.scrollIntoView({ block: 'nearest' }));
        return () => cancelAnimationFrame(frame);
    }, [selectedLinkId, selectedLink]);

    const resetModal = () => {
        setIsModalOpen(false);
        setEditingLink(null);
        setLinkForm(EMPTY_FORM);
        setFormError('');
        setFormErrorField(null);
    };

    const openAddModal = () => {
        setEditingLink(null);
        setLinkForm(EMPTY_FORM);
        setFormError('');
        setFormErrorField(null);
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
        setFormErrorField(null);
        setOperationError('');
        setIsModalOpen(true);
    };

    const validateForm = () => {
        const title = linkForm.title.trim().replace(/\s+/g, ' ');
        const description = linkForm.description.trim();
        if (title.length < 2) throw new ArchiveFieldError('title', 'Use a title with at least 2 characters.');
        if (title.length > 120) throw new ArchiveFieldError('title', 'Keep the title under 120 characters.');
        if (description.length > 500) throw new ArchiveFieldError('description', 'Keep the description under 500 characters.');
        if (!CATEGORY_IDS.has(linkForm.category)) throw new ArchiveFieldError('category', 'Choose a valid resource category.');
        let normalized: ReturnType<typeof normalizeResourceUrl>;
        try { normalized = normalizeResourceUrl(linkForm.url); }
        catch (error) { throw new ArchiveFieldError('url', getErrorMessage(error, 'Enter a valid resource URL.')); }
        const duplicate = tenantLinks.find(link => link.id !== editingLink?.id && normalizeExistingUrl(link) === normalized.normalizedUrl);
        if (duplicate) throw new ArchiveFieldError('url', `This URL is already saved as "${duplicate.title}".`);
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
        setFormErrorField(null);
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
            setFormErrorField(error instanceof ArchiveFieldError ? error.field : null);
            if (error instanceof ArchiveFieldError) requestAnimationFrame(() => document.getElementById(`archive-${error.field}`)?.focus());
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
        setSelectedLinkId(null);
    };

    if (!canView) {
        return (
            <div className="edu-v1 edu-school-ops-v1 edu-archive-v1 pb-24 md:pb-8" data-edu-system="1">
                <EducationState kind="restricted" title="Archive access is restricted" description="Your current role does not include access to organization resources." />
            </div>
        );
    }

    return (
        <div className="edu-v1 edu-school-ops-v1 edu-archive-v1 flex h-full flex-col space-y-5 pb-24 md:pb-8" data-edu-system="1" data-testid="education-archive-v1">
            <AtlasCommandHeader
                eyebrow="Organization knowledge"
                title="Resource Archive"
                description="Maintain the trusted links and working references used across the organization."
                icon={Archive}
                badges={<EducationBadge status={canManage ? 'success' : 'neutral'}>{canManage ? 'Managed library' : 'Read only'}</EducationBadge>}
                actions={canManage && organizationId ? <EducationButton variant="primary" icon={Plus} onClick={openAddModal}>Add resource</EducationButton> : undefined}
            />

            {!organizationId ? (
                <EducationState kind="restricted" title="No organization selected" description="Select an organization to load its resource archive." />
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                        <AtlasSignalCard label="Active" value={activeCount} detail="Ready for the team" icon={CheckCircle2} tone="emerald" onClick={() => setStatusFilter('active')} />
                        <AtlasSignalCard label="Archived" value={archivedCount} detail="Retained references" icon={ArchiveRestore} tone="amber" onClick={() => setStatusFilter('archived')} />
                        <AtlasSignalCard label="Categories" value={usedCategoryCount} detail="Resource types in use" icon={Library} tone="blue" />
                        <AtlasSignalCard label="Current view" value={filteredLinks.length} detail={hasFilters ? 'Matching filters' : 'Active resources'} icon={Search} tone="slate" />
                    </div>

                    {operationError && <div className="edu-archive-error"><EducationNotice status="danger">{operationError}</EducationNotice><EducationButton variant="quiet" onClick={() => setOperationError('')} aria-label="Dismiss message" icon={X}>Dismiss</EducationButton></div>}

                    <EducationToolbar label="Find and filter archive resources">
                        <div className="edu-archive-toolbar">
                            <EducationField label="Search resources">
                                <input id="archive-search" type="search" placeholder="Title, URL, description or owner" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} />
                            </EducationField>
                            <EducationField label="Status">
                                <select id="archive-status" value={statusFilter} onChange={event => { setStatusFilter(event.target.value as StatusFilter); setSelectedLinkId(null); }}>
                                    <option value="active">Active</option>
                                    <option value="archived">Archived</option>
                                    <option value="all">All statuses</option>
                                </select>
                            </EducationField>
                            <EducationField label="Sort by">
                                <select id="archive-sort" value={sortOption} onChange={event => setSortOption(event.target.value as SortOption)}>
                                    <option value="updated_desc">Recently updated</option>
                                    <option value="created_desc">Recently added</option>
                                    <option value="title_asc">Title A-Z</option>
                                    <option value="title_desc">Title Z-A</option>
                                </select>
                            </EducationField>
                        </div>
                        <div className="edu-archive-categories" role="group" aria-label="Resource categories">
                            {CATEGORY_OPTIONS.map(category => (
                                <button
                                    key={category.id}
                                    type="button"
                                    onClick={() => { setSelectedCategory(category.id); setSelectedLinkId(null); }}
                                    aria-pressed={selectedCategory === category.id}
                                    className="edu-archive-category"
                                >
                                    <category.icon size={14} />
                                    {category.label}
                                </button>
                            ))}
                        </div>
                    </EducationToolbar>

                    <section className="space-y-4" aria-labelledby="archive-results-title">
                        <EducationSectionHeader
                            eyebrow="Resource library"
                            title={statusFilter === 'archived' ? 'Archived resources' : statusFilter === 'all' ? 'All resources' : 'Active resources'}
                            description={canManage ? 'Keep references current, or archive links that are no longer in daily use.' : 'Open or copy trusted organization resources.'}
                            action={hasFilters ? <EducationButton icon={RotateCcw} variant="quiet" onClick={clearFilters}>Reset filters</EducationButton> : <EducationBadge status="info">{filteredLinks.length} shown</EducationBadge>}
                        />
                        <span id="archive-results-title" className="sr-only">Archive search results</span>

                        {loading ? (
                            <EducationState kind="loading" title="Loading resources" description="Gathering this organization's saved references." />
                        ) : filteredLinks.length === 0 ? (
                            <EducationState
                                title={tenantLinks.length === 0 ? 'Start the organization archive' : 'No resources match this view'}
                                description={tenantLinks.length === 0 ? 'Add the first trusted link for your team.' : 'Adjust the filters or search to return to available resources.'}
                            >{tenantLinks.length === 0 && canManage ? <EducationButton variant="primary" icon={Plus} onClick={openAddModal}>Add first resource</EducationButton> : hasFilters ? <EducationButton icon={RotateCcw} onClick={clearFilters}>Reset filters</EducationButton> : null}</EducationState>
                        ) : (
                            <div className="edu-archive-results">
                            <div className="edu-archive-grid">
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
                                        <article key={link.id} aria-label={link.title} className="edu-archive-card" data-selected={selectedLink?.id === link.id || undefined}>
                                            <div className="edu-archive-card__heading">
                                                <span className="edu-archive-card__icon" data-edu-accent={isArchived ? 'orange' : 'blue'}><CategoryIcon size={20} aria-hidden="true" /></span>
                                                <div><h3 title={link.title}>{link.title}</h3><span>{category?.label || 'Other'}</span></div>
                                                <EducationStatusPill status={isArchived ? 'warning' : 'success'}>{isArchived ? 'Archived' : 'Active'}</EducationStatusPill>
                                            </div>
                                            <p className="edu-archive-card__description">{link.description || 'No description provided.'}</p>
                                            <p className="edu-archive-card__host"><Globe2 size={16} aria-hidden="true" />{hostname}</p>
                                            <div className="edu-archive-card__actions">
                                                <EducationButton onClick={() => setSelectedLinkId(current => current === link.id ? null : link.id)} aria-expanded={selectedLink?.id === link.id} aria-controls={selectedLink?.id === link.id ? 'archive-detail' : undefined}>{selectedLink?.id === link.id ? 'Hide details' : 'View details'}</EducationButton>
                                                <EducationButton icon={ExternalLink} variant="primary" onClick={() => handleOpenLink(link)}>Open</EducationButton>
                                                <EducationActionMenu label="More actions">
                                                    <button type="button" onClick={() => handleCopyLink(link)} disabled={copyingId === link.id}><Clipboard size={16} />Copy link</button>
                                                    {canManage && <button type="button" onClick={() => handleEditLink(link)} disabled={isMutating}><Pencil size={16} />Edit</button>}
                                                    {canManage && <button type="button" onClick={() => handleStatusChange(link)} disabled={isMutating}>{isMutating ? <Loader2 size={16} className="animate-spin" /> : isArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}{isArchived ? 'Restore' : 'Archive'}</button>}
                                                    {canManage && <button type="button" className="edu-archive-danger" onClick={() => handleDeleteLink(link)} disabled={isMutating}><Trash2 size={16} />Delete</button>}
                                                </EducationActionMenu>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                            {selectedLink && <EducationDetailPanel id="archive-detail" label={`Details for ${selectedLink.title}`} className="edu-archive-detail">
                                <div className="edu-archive-detail__heading"><div><span className="edu-v1-kicker">Resource details</span><h3>{selectedLink.title}</h3></div><EducationStatusPill status={getRecordStatus(selectedLink) === 'archived' ? 'warning' : 'success'}>{getRecordStatus(selectedLink) === 'archived' ? 'Archived' : 'Active'}</EducationStatusPill></div>
                                <p>{selectedLink.description || 'No description provided.'}</p>
                                <dl><div><dt>Category</dt><dd>{CATEGORY_OPTIONS.find(category => category.id === selectedLink.category)?.label || 'Other'}</dd></div><div><dt>Added</dt><dd>{formatRecordDate(selectedLink.createdAt)}</dd></div><div><dt>Last updated</dt><dd>{formatRecordDate(selectedLink.updatedAt || selectedLink.createdAt)}</dd></div><div><dt>Saved by</dt><dd>{selectedLink.createdBy || 'Not recorded'}</dd></div></dl>
                                <div className="edu-archive-detail__link"><span>Resource URL</span><code>{selectedLink.url}</code></div>
                                <div className="edu-archive-detail__actions"><EducationButton icon={ExternalLink} variant="primary" onClick={() => handleOpenLink(selectedLink)}>Open resource</EducationButton><EducationButton icon={Clipboard} onClick={() => handleCopyLink(selectedLink)} disabled={copyingId === selectedLink.id}>Copy link</EducationButton>{canManage && <EducationButton icon={Pencil} onClick={() => handleEditLink(selectedLink)}>Edit details</EducationButton>}<EducationButton variant="quiet" onClick={() => setSelectedLinkId(null)}>Close details</EducationButton></div>
                            </EducationDetailPanel>}
                            </div>
                        )}
                    </section>
                </>
            )}

            <Modal isOpen={isModalOpen} onClose={() => { if (!isSaving) resetModal(); }} title={editingLink ? 'Edit resource' : 'Add resource'} designSystem={true}>
                <form onSubmit={handleSaveLink} className="edu-archive-form" noValidate>
                    {formError && !formErrorField && <EducationNotice status="danger">{formError}</EducationNotice>}
                    <EducationField label="Title" hint={`${linkForm.title.length}/120 characters`} error={formErrorField === 'title' ? formError : undefined}>
                        <input id="archive-title" type="text" required maxLength={120} autoFocus value={linkForm.title} onChange={event => setLinkForm(current => ({ ...current, title: event.target.value }))} placeholder="Resource name" />
                    </EducationField>
                    <EducationField label="URL" hint="Use a complete http:// or https:// address." error={formErrorField === 'url' ? formError : undefined}>
                        <input id="archive-url" type="url" required inputMode="url" value={linkForm.url} onChange={event => setLinkForm(current => ({ ...current, url: event.target.value }))} placeholder="https://example.com/resource" />
                    </EducationField>
                    <EducationField label="Category" error={formErrorField === 'category' ? formError : undefined}>
                        <select id="archive-category" value={linkForm.category} onChange={event => setLinkForm(current => ({ ...current, category: event.target.value as ArchiveCategory }))}>
                            {CATEGORY_OPTIONS.filter(category => category.id !== 'all').map(category => <option key={category.id} value={category.id}>{category.label}</option>)}
                        </select>
                    </EducationField>
                    <EducationField label="Description" hint={`${linkForm.description.length}/500 characters`} error={formErrorField === 'description' ? formError : undefined}>
                        <textarea id="archive-description" maxLength={500} value={linkForm.description} onChange={event => setLinkForm(current => ({ ...current, description: event.target.value }))} placeholder="Owner, purpose, or usage context" />
                    </EducationField>
                    <div className="edu-archive-form__actions">
                        <EducationButton type="button" onClick={resetModal} disabled={isSaving}>Cancel</EducationButton>
                        <EducationButton type="submit" variant="primary" icon={isSaving ? Loader2 : editingLink ? Pencil : Plus} disabled={isSaving} aria-busy={isSaving}>
                            {isSaving ? 'Saving...' : editingLink ? 'Save changes' : 'Add resource'}
                        </EducationButton>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
