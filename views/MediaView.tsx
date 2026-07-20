import React, { useEffect, useMemo, useState } from 'react';
import {
    ArrowLeft,
    ArrowRight,
    Camera,
    Check,
    CheckCircle2,
    Copy,
    Eye,
    EyeOff,
    Folder,
    Image as ImageIcon,
    Loader2,
    Pencil,
    Plus,
    Search,
    Send,
    ShieldCheck,
    Trash2,
    Upload,
    UserRound,
    X
} from 'lucide-react';
import { addDoc, collection, doc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { Modal } from '../components/Modal';
import {
    AtlasActionButton,
    AtlasCommandHeader,
    AtlasEmptyState,
    AtlasSectionHeader,
    AtlasSignalCard,
    AtlasToolbar
} from '../components/atlas/AtlasSurface';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { db } from '../services/firebase';
import { GalleryItem } from '../types';
import { compressImage } from '../utils/helpers';

type MediaVisibility = 'families' | 'staff';
type SortMode = 'newest' | 'oldest' | 'caption';
type AssociationFilter = 'all' | 'tagged' | 'general';
type SourceMode = 'file' | 'url';
type SavePhase = 'idle' | 'preparing' | 'saving';

type MediaRecord = GalleryItem & {
    album?: string;
    visibility?: MediaVisibility;
    uploadedBy?: string | null;
    updatedAt?: unknown;
};

const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_DOCUMENT_IMAGE_BYTES = 850 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const getTimestampMs = (value: unknown) => {
    if (!value) return 0;
    if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
        return (value as { toDate: () => Date }).toDate().getTime();
    }
    const parsed = new Date(value as string | number | Date).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
};

const getDataUrlBytes = (value: string) => {
    if (!value.startsWith('data:')) return 0;
    const encoded = value.split(',')[1] || '';
    return Math.ceil((encoded.length * 3) / 4);
};

const normalizeText = (value: string, maxLength: number) => value.trim().replace(/\s+/g, ' ').slice(0, maxLength);

const validateRemoteImageUrl = async (value: string) => {
    let parsed: URL;
    try {
        parsed = new URL(value);
    } catch {
        throw new Error('Enter a complete HTTPS image URL.');
    }
    if (parsed.protocol !== 'https:') throw new Error('Only HTTPS image URLs are accepted.');

    await new Promise<void>((resolve, reject) => {
        const image = new Image();
        const timeout = window.setTimeout(() => reject(new Error('The image host did not respond in time.')), 8000);
        image.onload = () => {
            window.clearTimeout(timeout);
            resolve();
        };
        image.onerror = () => {
            window.clearTimeout(timeout);
            reject(new Error('The URL does not expose a browser-readable image.'));
        };
        image.src = parsed.toString();
    });

    return parsed.toString();
};

export const MediaView = () => {
    const { galleryItems, students, enrollments } = useAppContext();
    const { can, userProfile, user, currentOrganization } = useAuth();
    const { confirm, alert: showAlert } = useConfirm();

    const organizationId = currentOrganization?.id || '';
    const canManage = can('media.manage');
    const isParent = userProfile?.role === 'parent';
    const isStudent = userProfile?.role === 'student';

    const [viewMode, setViewMode] = useState<'gallery' | 'capture'>('gallery');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchQuery, setSearchQuery] = useState('');
    const [albumFilter, setAlbumFilter] = useState('all');
    const [visibilityFilter, setVisibilityFilter] = useState<'all' | MediaVisibility>('all');
    const [associationFilter, setAssociationFilter] = useState<AssociationFilter>('all');
    const [sortMode, setSortMode] = useState<SortMode>('newest');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkAlbum, setBulkAlbum] = useState('');
    const [isBulkSaving, setIsBulkSaving] = useState(false);

    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [sourceMode, setSourceMode] = useState<SourceMode>('file');
    const [uploadUrl, setUploadUrl] = useState('');
    const [remoteUrl, setRemoteUrl] = useState('');
    const [caption, setCaption] = useState('');
    const [album, setAlbum] = useState('');
    const [visibility, setVisibility] = useState<MediaVisibility>('families');
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [uploadError, setUploadError] = useState('');
    const [savePhase, setSavePhase] = useState<SavePhase>('idle');

    const [editingItem, setEditingItem] = useState<MediaRecord | null>(null);
    const [editCaption, setEditCaption] = useState('');
    const [editAlbum, setEditAlbum] = useState('');
    const [editVisibility, setEditVisibility] = useState<MediaVisibility>('families');
    const [editStudentId, setEditStudentId] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    const [capturingStudent, setCapturingStudent] = useState<{ id: string; name: string } | null>(null);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [capturePreview, setCapturePreview] = useState<string | null>(null);
    const [captureError, setCaptureError] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const tenantItems = useMemo(
        () => (galleryItems as MediaRecord[]).filter(item => item.organizationId === organizationId),
        [galleryItems, organizationId]
    );

    const tenantStudents = useMemo(
        () => students.filter(student => student.organizationId === organizationId),
        [students, organizationId]
    );

    const linkedStudent = useMemo(() => {
        if (!user || (!isParent && !isStudent)) return null;
        if (isStudent) return tenantStudents.find(student => student.loginInfo?.uid === user.uid) || null;
        return tenantStudents.find(student => student.parentLoginInfo?.uid === user.uid) || null;
    }, [isParent, isStudent, tenantStudents, user]);

    const albums = useMemo(
        () => Array.from(new Set(tenantItems.map(item => normalizeText(item.album || '', 60)).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
        [tenantItems]
    );

    const visibleItems = useMemo(() => {
        let items = tenantItems;
        if (isParent || isStudent) {
            if (!linkedStudent) return [];
            items = items.filter(item => item.studentId === linkedStudent.id && (item.visibility || 'families') === 'families');
        }

        const query = searchQuery.trim().toLowerCase();
        if (query) {
            items = items.filter(item => [item.caption, item.studentName, item.album]
                .some(value => value?.toLowerCase().includes(query)));
        }
        if (albumFilter !== 'all') items = items.filter(item => (item.album || '') === albumFilter);
        if (visibilityFilter !== 'all') items = items.filter(item => (item.visibility || 'families') === visibilityFilter);
        if (associationFilter === 'tagged') items = items.filter(item => Boolean(item.studentId));
        if (associationFilter === 'general') items = items.filter(item => !item.studentId);

        return [...items].sort((a, b) => {
            if (sortMode === 'caption') return (a.caption || '').localeCompare(b.caption || '');
            const difference = getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt);
            return sortMode === 'newest' ? difference : -difference;
        });
    }, [albumFilter, associationFilter, isParent, isStudent, linkedStudent, searchQuery, sortMode, tenantItems, visibilityFilter]);

    const selectedItems = useMemo(
        () => tenantItems.filter(item => selectedIds.has(item.id)),
        [selectedIds, tenantItems]
    );

    useEffect(() => {
        setSelectedIds(new Set());
    }, [albumFilter, associationFilter, organizationId, searchQuery, sortMode, visibilityFilter]);

    const dayOfWeek = useMemo(() => {
        const date = new Date(`${selectedDate}T12:00:00`);
        return date.toLocaleDateString('en-US', { weekday: 'long' });
    }, [selectedDate]);

    const scheduledStudents = useMemo(() => {
        return enrollments
            .filter(enrollment => enrollment.organizationId === organizationId && enrollment.status === 'active')
            .flatMap(enrollment => {
                const student = tenantStudents.find(candidate => candidate.id === enrollment.studentId);
                if (!student || student.status !== 'active') return [];
                const slots: Array<typeof enrollment & { displayTime: string; displayGroup: string }> = [];
                if (enrollment.groupTime?.includes(dayOfWeek)) {
                    slots.push({ ...enrollment, displayTime: enrollment.groupTime.replace(dayOfWeek, '').trim(), displayGroup: enrollment.groupName || '' });
                }
                if (enrollment.secondGroupTime?.includes(dayOfWeek)) {
                    slots.push({ ...enrollment, displayTime: enrollment.secondGroupTime.replace(dayOfWeek, '').trim(), displayGroup: enrollment.secondGroupName || '' });
                }
                return slots;
            });
    }, [dayOfWeek, enrollments, organizationId, tenantStudents]);

    const studentsByTime = useMemo(() => {
        const groups = new Map<string, typeof scheduledStudents>();
        scheduledStudents.forEach(student => groups.set(student.displayTime, [...(groups.get(student.displayTime) || []), student]));
        return Array.from(groups.entries())
            .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
            .map(([time, groupedStudents]) => ({ time, students: groupedStudents }));
    }, [scheduledStudents]);

    const getStudentPhotosForDate = (studentId: string) => tenantItems.filter(item => {
        if (item.studentId !== studentId) return false;
        const timestamp = getTimestampMs(item.createdAt);
        if (!timestamp) return false;
        return new Date(timestamp).toISOString().split('T')[0] === selectedDate;
    });

    const capturedStudentIds = useMemo(() => new Set(
        tenantItems
            .filter(item => {
                const timestamp = getTimestampMs(item.createdAt);
                return timestamp && new Date(timestamp).toISOString().split('T')[0] === selectedDate;
            })
            .map(item => item.studentId)
            .filter(Boolean)
    ), [selectedDate, tenantItems]);

    const captureStats = {
        total: new Set(scheduledStudents.map(student => student.studentId)).size,
        captured: new Set(scheduledStudents.map(student => student.studentId).filter(id => capturedStudentIds.has(id))).size
    };

    const requireManager = () => {
        if (!db || !organizationId || !canManage) {
            void showAlert('Action unavailable', 'Media management requires an active organization and the media management permission.', 'warning');
            return false;
        }
        return true;
    };

    const validateFile = (file: File) => {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return 'Use a JPG, PNG, or WebP image.';
        if (file.size > MAX_FILE_BYTES) return 'Choose an image smaller than 12 MB.';
        return '';
    };

    const resetUploadForm = () => {
        setSourceMode('file');
        setUploadUrl('');
        setRemoteUrl('');
        setCaption('');
        setAlbum('');
        setVisibility('families');
        setSelectedStudentId('');
        setUploadError('');
        setSavePhase('idle');
    };

    const closeUploadModal = () => {
        if (savePhase !== 'idle') return;
        setIsUploadModalOpen(false);
        resetUploadForm();
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        const validationError = validateFile(file);
        if (validationError) {
            setUploadError(validationError);
            return;
        }

        setUploadError('');
        setSavePhase('preparing');
        try {
            const compressed = await compressImage(file);
            if (getDataUrlBytes(compressed) > MAX_DOCUMENT_IMAGE_BYTES) {
                throw new Error('The optimized image is still too large. Crop it or use a smaller source image.');
            }
            setUploadUrl(compressed);
        } catch (error) {
            setUploadError(error instanceof Error ? error.message : 'The image could not be prepared.');
            setUploadUrl('');
        } finally {
            setSavePhase('idle');
        }
    };

    const handleSaveMedia = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!requireManager() || !db) return;

        setUploadError('');
        setSavePhase('saving');
        try {
            const student = selectedStudentId ? tenantStudents.find(candidate => candidate.id === selectedStudentId) : undefined;
            if (selectedStudentId && !student) throw new Error('The selected student does not belong to this organization.');
            const sourceUrl = sourceMode === 'url' ? await validateRemoteImageUrl(remoteUrl.trim()) : uploadUrl;
            if (!sourceUrl) throw new Error('Choose an image before saving.');

            await addDoc(collection(db, 'gallery_items'), {
                organizationId,
                url: sourceUrl,
                caption: normalizeText(caption, 160),
                album: normalizeText(album, 60),
                visibility,
                type: 'image',
                studentId: student?.id || null,
                studentName: student?.name || null,
                uploadedBy: user?.uid || null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            setIsUploadModalOpen(false);
            resetUploadForm();
            await showAlert('Photo saved', visibility === 'families' ? 'The photo is available to the linked family.' : 'The photo is visible to staff only.', 'success');
        } catch (error) {
            setUploadError(error instanceof Error ? error.message : 'The photo could not be saved.');
        } finally {
            setSavePhase('idle');
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(current => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectVisible = () => {
        setSelectedIds(current => {
            const allVisibleSelected = visibleItems.length > 0 && visibleItems.every(item => current.has(item.id));
            const next = new Set(current);
            visibleItems.forEach(item => allVisibleSelected ? next.delete(item.id) : next.add(item.id));
            return next;
        });
    };

    const updateSelectedMetadata = async (updates: { album?: string; visibility?: MediaVisibility }) => {
        if (!requireManager() || !db || selectedItems.length === 0) return;
        if (selectedItems.length > 450) {
            await showAlert('Selection too large', 'Update up to 450 photos at a time.', 'warning');
            return;
        }
        setIsBulkSaving(true);
        try {
            const batch = writeBatch(db);
            selectedItems.forEach(item => {
                if (item.organizationId !== organizationId) throw new Error('The selection contains media from another organization.');
                batch.update(doc(db, 'gallery_items', item.id), { ...updates, updatedAt: serverTimestamp() });
            });
            await batch.commit();
            if (updates.album !== undefined) setBulkAlbum('');
            await showAlert('Library updated', `${selectedItems.length} photo${selectedItems.length === 1 ? '' : 's'} updated.`, 'success');
        } catch (error) {
            await showAlert('Update failed', error instanceof Error ? error.message : 'The selected photos could not be updated.', 'danger');
        } finally {
            setIsBulkSaving(false);
        }
    };

    const handleDeleteItems = async (items: MediaRecord[]) => {
        if (!requireManager() || !db || items.length === 0) return;
        const ownedItems = items.filter(item => item.organizationId === organizationId);
        if (ownedItems.length !== items.length) {
            await showAlert('Delete blocked', 'One or more photos are not owned by this organization.', 'danger');
            return;
        }
        if (ownedItems.length > 450) {
            await showAlert('Selection too large', 'Delete up to 450 photos at a time.', 'warning');
            return;
        }
        const accepted = await confirm({
            title: ownedItems.length === 1 ? 'Delete photo?' : `Delete ${ownedItems.length} photos?`,
            message: 'Gallery records will be permanently removed. Remote source files are controlled by their host and are not deleted.',
            confirmText: ownedItems.length === 1 ? 'Delete photo' : 'Delete photos',
            cancelText: 'Cancel',
            variant: 'danger'
        });
        if (!accepted) return;

        setIsBulkSaving(true);
        try {
            const batch = writeBatch(db);
            ownedItems.forEach(item => batch.delete(doc(db, 'gallery_items', item.id)));
            await batch.commit();
            setSelectedIds(current => {
                const next = new Set(current);
                ownedItems.forEach(item => next.delete(item.id));
                return next;
            });
            if (editingItem && ownedItems.some(item => item.id === editingItem.id)) setEditingItem(null);
        } catch {
            await showAlert('Delete failed', 'The gallery records could not be deleted. Check your connection and permissions.', 'danger');
        } finally {
            setIsBulkSaving(false);
        }
    };

    const openEditor = (item: MediaRecord) => {
        if (item.organizationId !== organizationId) return;
        setEditingItem(item);
        setEditCaption(item.caption || '');
        setEditAlbum(item.album || '');
        setEditVisibility(item.visibility || 'families');
        setEditStudentId(item.studentId || '');
    };

    const handleUpdateItem = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!requireManager() || !db || !editingItem || editingItem.organizationId !== organizationId) return;
        const student = editStudentId ? tenantStudents.find(candidate => candidate.id === editStudentId) : undefined;
        if (editStudentId && !student) {
            await showAlert('Update blocked', 'The selected student does not belong to this organization.', 'danger');
            return;
        }

        setIsEditing(true);
        try {
            await updateDoc(doc(db, 'gallery_items', editingItem.id), {
                caption: normalizeText(editCaption, 160),
                album: normalizeText(editAlbum, 60),
                visibility: editVisibility,
                studentId: student?.id || null,
                studentName: student?.name || null,
                updatedAt: serverTimestamp()
            });
            setEditingItem(null);
        } catch {
            await showAlert('Update failed', 'The photo details could not be saved.', 'danger');
        } finally {
            setIsEditing(false);
        }
    };

    const handleShare = async (item: MediaRecord) => {
        if (item.organizationId !== organizationId) return;
        if ((item.visibility || 'families') === 'staff') {
            await showAlert('Staff-only media', 'Change this photo to family-visible before sharing its source outside the staff library.', 'warning');
            return;
        }
        try {
            if (navigator.share && !item.url.startsWith('data:')) {
                await navigator.share({ title: item.caption || 'Gallery photo', url: item.url });
                return;
            }
            if (!navigator.clipboard) throw new Error('Clipboard access is unavailable.');
            await navigator.clipboard.writeText(item.url);
            await showAlert('Source copied', 'The image source was copied. Delivery and continued availability depend on the destination and image host.', 'success');
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            await showAlert('Share unavailable', 'The browser could not open sharing or copy the image source.', 'warning');
        }
    };

    const handleCaptureFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        const validationError = validateFile(file);
        if (validationError) {
            setCaptureError(validationError);
            return;
        }
        if (capturePreview) URL.revokeObjectURL(capturePreview);
        setPendingFile(file);
        setCapturePreview(URL.createObjectURL(file));
        setCaptureError('');
    };

    const resetCapture = () => {
        if (capturePreview) URL.revokeObjectURL(capturePreview);
        setPendingFile(null);
        setCapturePreview(null);
        setCaptureError('');
    };

    const closeCapture = () => {
        if (isUploading) return;
        resetCapture();
        setCapturingStudent(null);
    };

    const handleConfirmCapture = async () => {
        if (!requireManager() || !db || !pendingFile || !capturingStudent) return;
        const student = tenantStudents.find(candidate => candidate.id === capturingStudent.id);
        if (!student) {
            await showAlert('Capture blocked', 'This student is no longer active in the current organization.', 'danger');
            return;
        }

        setIsUploading(true);
        setCaptureError('');
        try {
            const compressed = await compressImage(pendingFile);
            if (getDataUrlBytes(compressed) > MAX_DOCUMENT_IMAGE_BYTES) throw new Error('The optimized image is too large. Try a smaller photo.');
            await addDoc(collection(db, 'gallery_items'), {
                organizationId,
                url: compressed,
                caption: `Session capture - ${selectedDate}`,
                album: `Sessions ${selectedDate.slice(0, 7)}`,
                visibility: 'families',
                type: 'image',
                studentId: student.id,
                studentName: student.name,
                uploadedBy: user?.uid || null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            resetCapture();
        } catch (error) {
            setCaptureError(error instanceof Error ? error.message : 'The photo could not be saved.');
        } finally {
            setIsUploading(false);
        }
    };

    const shiftDate = (days: number) => {
        const date = new Date(`${selectedDate}T12:00:00`);
        date.setDate(date.getDate() + days);
        setSelectedDate(date.toISOString().split('T')[0]);
    };

    const clearFilters = () => {
        setSearchQuery('');
        setAlbumFilter('all');
        setVisibilityFilter('all');
        setAssociationFilter('all');
        setSortMode('newest');
    };

    const staffOnlyCount = tenantItems.filter(item => (item.visibility || 'families') === 'staff').length;
    const hasFilters = Boolean(searchQuery || albumFilter !== 'all' || visibilityFilter !== 'all' || associationFilter !== 'all' || sortMode !== 'newest');
    const inputClass = 'h-10 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-teal-400/50 focus:ring-2 focus:ring-teal-400/10';

    return (
        <div className="space-y-5 pb-24 md:pb-8">
            <AtlasCommandHeader
                eyebrow="Organization media"
                title={viewMode === 'capture' ? 'Capture Route' : linkedStudent ? `${linkedStudent.name.split(' ')[0]}'s Gallery` : 'Media Library'}
                description={viewMode === 'capture'
                    ? 'Move through the session roster and publish each capture to the correct family.'
                    : 'Search, organize, protect, and share the organization\'s visual records.'}
                icon={Camera}
                badges={<span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-bold uppercase text-slate-300">{linkedStudent ? 'Personal view' : 'Tenant protected'}</span>}
                actions={canManage ? <>
                    <div className="flex h-10 rounded-lg border border-white/10 bg-slate-950 p-1" role="tablist" aria-label="Media workspace">
                        <button type="button" role="tab" aria-selected={viewMode === 'gallery'} onClick={() => setViewMode('gallery')} className={`flex items-center gap-2 rounded-md px-3 text-xs font-bold ${viewMode === 'gallery' ? 'bg-teal-400/15 text-teal-200' : 'text-slate-500 hover:text-white'}`}><ImageIcon size={15} /> Library</button>
                        <button type="button" role="tab" aria-selected={viewMode === 'capture'} onClick={() => setViewMode('capture')} className={`flex items-center gap-2 rounded-md px-3 text-xs font-bold ${viewMode === 'capture' ? 'bg-teal-400/15 text-teal-200' : 'text-slate-500 hover:text-white'}`}><Camera size={15} /> Capture</button>
                    </div>
                    {viewMode === 'gallery' && <AtlasActionButton variant="primary" icon={Plus} onClick={() => setIsUploadModalOpen(true)}>Add media</AtlasActionButton>}
                </> : undefined}
            />

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <AtlasSignalCard label="Media records" value={tenantItems.length} detail="Owned by this organization" icon={ImageIcon} tone="teal" />
                <AtlasSignalCard label="Albums" value={albums.length} detail="Named collections" icon={Folder} tone="blue" />
                <AtlasSignalCard label="Staff only" value={staffOnlyCount} detail="Hidden from family views" icon={EyeOff} tone={staffOnlyCount ? 'amber' : 'slate'} />
                <AtlasSignalCard label="Capture progress" value={`${captureStats.captured}/${captureStats.total}`} detail={`${dayOfWeek} roster`} icon={CheckCircle2} tone={captureStats.total > 0 && captureStats.captured === captureStats.total ? 'emerald' : 'slate'} />
            </div>

            {viewMode === 'gallery' ? (
                <div className="space-y-4">
                    <AtlasToolbar
                        leading={<>
                            <div className="relative min-w-52 flex-1 sm:max-w-xs">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                <input aria-label="Search media" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search caption, student, album" className={`${inputClass} pl-9`} />
                            </div>
                            <select aria-label="Filter by album" value={albumFilter} onChange={event => setAlbumFilter(event.target.value)} className="h-10 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-teal-400/50">
                                <option value="all">All albums</option>
                                {albums.map(name => <option key={name} value={name}>{name}</option>)}
                            </select>
                            {canManage && <select aria-label="Filter by privacy" value={visibilityFilter} onChange={event => setVisibilityFilter(event.target.value as 'all' | MediaVisibility)} className="h-10 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-teal-400/50">
                                <option value="all">All privacy</option>
                                <option value="families">Family visible</option>
                                <option value="staff">Staff only</option>
                            </select>}
                            <select aria-label="Filter by student association" value={associationFilter} onChange={event => setAssociationFilter(event.target.value as AssociationFilter)} className="h-10 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-teal-400/50">
                                <option value="all">All media</option>
                                <option value="tagged">Student tagged</option>
                                <option value="general">General media</option>
                            </select>
                        </>}
                        trailing={<>
                            <select aria-label="Sort media" value={sortMode} onChange={event => setSortMode(event.target.value as SortMode)} className="h-10 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-slate-200 outline-none focus:border-teal-400/50">
                                <option value="newest">Newest first</option>
                                <option value="oldest">Oldest first</option>
                                <option value="caption">Caption A-Z</option>
                            </select>
                            {hasFilters && <AtlasActionButton variant="quiet" icon={X} onClick={clearFilters}>Clear</AtlasActionButton>}
                        </>}
                    >
                        <span className="text-xs text-slate-500">{visibleItems.length} of {tenantItems.length} records</span>
                    </AtlasToolbar>

                    {canManage && visibleItems.length > 0 && (
                        <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-slate-900/70 p-3 xl:flex-row xl:items-center">
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={selectVisible} className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/[0.05]" aria-label={visibleItems.every(item => selectedIds.has(item.id)) ? 'Clear visible selection' : 'Select visible media'} title="Select visible media">
                                    {visibleItems.every(item => selectedIds.has(item.id)) ? <CheckCircle2 size={17} className="text-teal-300" /> : <Check size={17} />}
                                </button>
                                <span className="min-w-28 text-sm font-bold text-white">{selectedItems.length} selected</span>
                            </div>
                            {selectedItems.length > 0 && <>
                                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                                    <input list="media-albums" value={bulkAlbum} onChange={event => setBulkAlbum(event.target.value)} placeholder="Move to album" maxLength={60} className="h-10 min-w-44 flex-1 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-teal-400/50 sm:max-w-xs" />
                                    <datalist id="media-albums">{albums.map(name => <option key={name} value={name} />)}</datalist>
                                    <AtlasActionButton icon={Folder} disabled={isBulkSaving || !bulkAlbum.trim()} onClick={() => void updateSelectedMetadata({ album: normalizeText(bulkAlbum, 60) })}>Assign album</AtlasActionButton>
                                    <AtlasActionButton icon={Eye} disabled={isBulkSaving} onClick={() => void updateSelectedMetadata({ visibility: 'families' })}>Family visible</AtlasActionButton>
                                    <AtlasActionButton icon={EyeOff} disabled={isBulkSaving} onClick={() => void updateSelectedMetadata({ visibility: 'staff' })}>Staff only</AtlasActionButton>
                                </div>
                                <AtlasActionButton variant="danger" icon={Trash2} disabled={isBulkSaving} onClick={() => void handleDeleteItems(selectedItems)}>Delete</AtlasActionButton>
                            </>}
                        </div>
                    )}

                    <AtlasSectionHeader title="Library" description="Privacy is enforced in Edufy views; remote image hosts retain control of externally linked files." icon={ImageIcon} meta={<span className="rounded-md bg-white/[0.05] px-2 py-1 text-[10px] font-bold text-slate-400">{visibleItems.length} shown</span>} />

                    {visibleItems.length === 0 ? (
                        <AtlasEmptyState
                            title={tenantItems.length === 0 ? 'Start the media library' : 'No media matches this view'}
                            description={tenantItems.length === 0 ? 'Add the first organization photo and choose who may see it.' : 'Clear filters or try a broader search.'}
                            icon={ImageIcon}
                            action={canManage ? <AtlasActionButton variant="primary" icon={tenantItems.length === 0 ? Plus : X} onClick={tenantItems.length === 0 ? () => setIsUploadModalOpen(true) : clearFilters}>{tenantItems.length === 0 ? 'Add first photo' : 'Clear filters'}</AtlasActionButton> : undefined}
                        />
                    ) : (
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                            {visibleItems.map(item => {
                                const selected = selectedIds.has(item.id);
                                const itemVisibility = item.visibility || 'families';
                                return (
                                    <article key={item.id} className={`group relative overflow-hidden rounded-lg border bg-slate-900 transition-colors ${selected ? 'border-teal-300/70 ring-2 ring-teal-400/15' : 'border-white/10 hover:border-white/20'}`}>
                                        <div className="relative aspect-square overflow-hidden bg-slate-950">
                                            <button type="button" onClick={() => canManage ? toggleSelection(item.id) : openEditor(item)} className="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-400" aria-label={canManage ? `${selected ? 'Deselect' : 'Select'} ${item.caption || 'photo'}` : `View ${item.caption || 'photo'}`}>
                                                <img src={item.url} loading="lazy" alt={item.caption || `${item.studentName || 'Organization'} photo`} className="h-full w-full object-cover opacity-90 transition-[opacity,transform] duration-200 group-hover:scale-[1.02] group-hover:opacity-100" />
                                            </button>
                                            {canManage && <button type="button" onClick={() => toggleSelection(item.id)} className={`absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-md border shadow-lg ${selected ? 'border-teal-200 bg-teal-400 text-slate-950' : 'border-white/20 bg-slate-950/85 text-white'}`} aria-label={selected ? 'Deselect photo' : 'Select photo'}>{selected ? <Check size={15} /> : null}</button>}
                                            <span className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md border shadow-lg ${itemVisibility === 'staff' ? 'border-amber-300/30 bg-amber-300/15 text-amber-200' : 'border-emerald-300/30 bg-emerald-300/15 text-emerald-200'}`} title={itemVisibility === 'staff' ? 'Staff only' : 'Family visible'}>{itemVisibility === 'staff' ? <EyeOff size={14} /> : <Eye size={14} />}</span>
                                        </div>
                                        <div className="space-y-2 p-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-bold text-white" title={item.caption || 'Untitled photo'}>{item.caption || 'Untitled photo'}</p>
                                                <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-500"><UserRound size={12} className="shrink-0" />{item.studentName || 'General media'}</p>
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="min-w-0 truncate rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-bold text-slate-400">{item.album || 'Unfiled'}</span>
                                                <div className="flex shrink-0 items-center gap-1">
                                                    <button type="button" onClick={() => void handleShare(item)} disabled={itemVisibility === 'staff'} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 disabled:cursor-not-allowed disabled:opacity-35" aria-label={itemVisibility === 'staff' ? `${item.caption || 'Photo'} is staff only` : `Share ${item.caption || 'photo'}`} title={itemVisibility === 'staff' ? 'Change privacy before sharing' : 'Share source'}><Send size={14} /></button>
                                                    {canManage && <button type="button" onClick={() => openEditor(item)} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400" aria-label={`Edit ${item.caption || 'photo'}`} title="Edit details"><Pencil size={14} /></button>}
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : canManage ? (
                <div className="mx-auto w-full max-w-4xl space-y-5">
                    <AtlasSectionHeader title="Session capture route" description="The roster is derived from active enrollments for the selected day." icon={Camera} meta={<span className="rounded-md bg-white/[0.05] px-2 py-1 text-[10px] font-bold text-slate-400">{captureStats.captured}/{captureStats.total} captured</span>} />
                    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/80 p-3">
                        <button type="button" onClick={() => shiftDate(-1)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/[0.05]" aria-label="Previous day"><ArrowLeft size={18} /></button>
                        <div className="text-center">
                            <p className="text-[10px] font-bold uppercase text-slate-500">{dayOfWeek}</p>
                            <input type="date" value={selectedDate} onChange={event => setSelectedDate(event.target.value)} className="bg-transparent text-center text-lg font-black text-white outline-none focus-visible:ring-2 focus-visible:ring-teal-400" />
                        </div>
                        <button type="button" onClick={() => shiftDate(1)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/[0.05]" aria-label="Next day"><ArrowRight size={18} /></button>
                    </div>

                    {scheduledStudents.length === 0 ? <AtlasEmptyState title="No students scheduled" description="Choose another date or review active enrollment schedules." icon={Camera} /> : (
                        <div className="space-y-5">
                            {studentsByTime.map(slot => <section key={slot.time} className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <span className="rounded-md border border-teal-300/20 bg-teal-400/10 px-3 py-1.5 font-mono text-xs font-bold text-teal-200">{slot.time || 'Time not set'}</span>
                                    <div className="h-px flex-1 bg-white/10" />
                                    <span className="text-xs text-slate-500">{slot.students.length} students</span>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {slot.students.map(student => {
                                        const photos = getStudentPhotosForDate(student.studentId);
                                        return <button type="button" key={`${student.id}-${slot.time}`} onClick={() => { setCapturingStudent({ id: student.studentId, name: student.studentName }); resetCapture(); }} className="flex min-h-20 items-center gap-3 rounded-lg border border-white/10 bg-slate-900 p-3 text-left hover:border-teal-300/30 hover:bg-slate-900/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
                                            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border text-sm font-black ${photos.length ? 'border-emerald-300/25 bg-emerald-400/10 text-emerald-200' : 'border-white/10 bg-slate-950 text-slate-400'}`}>{photos.length ? photos.length : (student.studentName || '?').split(' ').map(part => part[0]).join('').slice(0, 2)}</span>
                                            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-white">{student.studentName}</span><span className="mt-1 block truncate text-xs text-slate-500">{student.displayGroup || student.programName}</span></span>
                                            <Camera size={17} className="shrink-0 text-teal-300" />
                                        </button>;
                                    })}
                                </div>
                            </section>)}
                        </div>
                    )}
                </div>
            ) : <AtlasEmptyState title="Capture access required" description="Ask an administrator for media management permission." icon={ShieldCheck} />}

            <Modal isOpen={isUploadModalOpen} onClose={closeUploadModal} title="Add media">
                <form onSubmit={handleSaveMedia} className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-slate-950 p-1" role="tablist" aria-label="Image source">
                        <button type="button" role="tab" aria-selected={sourceMode === 'file'} onClick={() => { setSourceMode('file'); setUploadError(''); }} className={`flex h-10 items-center justify-center gap-2 rounded-md text-sm font-bold ${sourceMode === 'file' ? 'bg-white/[0.08] text-white' : 'text-slate-500'}`}><Upload size={15} /> File</button>
                        <button type="button" role="tab" aria-selected={sourceMode === 'url'} onClick={() => { setSourceMode('url'); setUploadError(''); }} className={`flex h-10 items-center justify-center gap-2 rounded-md text-sm font-bold ${sourceMode === 'url' ? 'bg-white/[0.08] text-white' : 'text-slate-500'}`}><Copy size={15} /> Image URL</button>
                    </div>

                    {sourceMode === 'file' ? <div className="relative flex min-h-48 items-center justify-center overflow-hidden rounded-lg border border-dashed border-white/15 bg-slate-950">
                        {uploadUrl ? <><img src={uploadUrl} alt="Selected upload preview" className="max-h-64 w-full object-contain" /><button type="button" onClick={() => setUploadUrl('')} className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-slate-950 text-slate-300" aria-label="Remove selected image"><X size={16} /></button></> : <label className="flex h-full min-h-48 w-full cursor-pointer flex-col items-center justify-center p-6 text-center focus-within:ring-2 focus-within:ring-inset focus-within:ring-teal-400">
                            {savePhase === 'preparing' ? <Loader2 size={28} className="mb-3 animate-spin text-teal-300" /> : <Upload size={28} className="mb-3 text-slate-500" />}
                            <span className="text-sm font-bold text-white">{savePhase === 'preparing' ? 'Optimizing image...' : 'Choose JPG, PNG, or WebP'}</span>
                            <span className="mt-1 text-xs text-slate-500">Maximum 12 MB. Files are optimized in your browser.</span>
                            <input type="file" accept={ALLOWED_IMAGE_TYPES.join(',')} onChange={handleFileUpload} disabled={savePhase !== 'idle'} className="sr-only" />
                        </label>}
                    </div> : <div className="space-y-2">
                        <label htmlFor="media-url" className="text-xs font-bold text-slate-400">HTTPS image URL</label>
                        <input id="media-url" type="url" value={remoteUrl} onChange={event => setRemoteUrl(event.target.value)} placeholder="https://..." className={inputClass} />
                        <p className="text-xs leading-5 text-slate-500">Edufy links to the remote image. Availability, access, and deletion remain controlled by its host.</p>
                    </div>}

                    {uploadError && <div role="alert" className="rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{uploadError}</div>}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-1"><span className="text-xs font-bold text-slate-400">Student</span><select value={selectedStudentId} onChange={event => setSelectedStudentId(event.target.value)} className={inputClass}><option value="">General media</option>{tenantStudents.filter(student => student.status === 'active').sort((a, b) => a.name.localeCompare(b.name)).map(student => <option key={student.id} value={student.id}>{student.name}</option>)}</select></label>
                        <label className="space-y-1"><span className="text-xs font-bold text-slate-400">Privacy</span><select value={visibility} onChange={event => setVisibility(event.target.value as MediaVisibility)} className={inputClass}><option value="families">Linked family can view</option><option value="staff">Staff only</option></select></label>
                    </div>
                    <label className="block space-y-1"><span className="text-xs font-bold text-slate-400">Album</span><input list="upload-media-albums" value={album} onChange={event => setAlbum(event.target.value)} maxLength={60} placeholder="Example: Spring showcase" className={inputClass} /><datalist id="upload-media-albums">{albums.map(name => <option key={name} value={name} />)}</datalist></label>
                    <label className="block space-y-1"><span className="text-xs font-bold text-slate-400">Caption</span><input value={caption} onChange={event => setCaption(event.target.value)} maxLength={160} placeholder="Describe the moment" className={inputClass} /><span className="block text-right text-[10px] text-slate-600">{caption.length}/160</span></label>
                    <div className="flex justify-end gap-2 border-t border-white/10 pt-4"><AtlasActionButton onClick={closeUploadModal} disabled={savePhase !== 'idle'}>Cancel</AtlasActionButton><AtlasActionButton type="submit" variant="primary" icon={savePhase === 'saving' ? Loader2 : Upload} disabled={savePhase !== 'idle' || (sourceMode === 'file' ? !uploadUrl : !remoteUrl.trim())} className={savePhase === 'saving' ? '[&_svg]:animate-spin' : ''}>{savePhase === 'saving' ? 'Saving...' : 'Save media'}</AtlasActionButton></div>
                </form>
            </Modal>

            <Modal isOpen={Boolean(editingItem)} onClose={() => !isEditing && setEditingItem(null)} title="Media details">
                {editingItem && <form onSubmit={handleUpdateItem} className="space-y-4">
                    <img src={editingItem.url} alt={editingItem.caption || 'Media preview'} className="max-h-64 w-full rounded-lg border border-white/10 bg-slate-950 object-contain" />
                    <label className="block space-y-1"><span className="text-xs font-bold text-slate-400">Caption</span><input value={editCaption} onChange={event => setEditCaption(event.target.value)} maxLength={160} disabled={!canManage} className={`${inputClass} disabled:opacity-70`} /></label>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-1"><span className="text-xs font-bold text-slate-400">Album</span><input list="edit-media-albums" value={editAlbum} onChange={event => setEditAlbum(event.target.value)} maxLength={60} disabled={!canManage} className={`${inputClass} disabled:opacity-70`} /><datalist id="edit-media-albums">{albums.map(name => <option key={name} value={name} />)}</datalist></label>
                        <label className="space-y-1"><span className="text-xs font-bold text-slate-400">Privacy</span><select value={editVisibility} onChange={event => setEditVisibility(event.target.value as MediaVisibility)} disabled={!canManage} className={`${inputClass} disabled:opacity-70`}><option value="families">Linked family can view</option><option value="staff">Staff only</option></select></label>
                    </div>
                    <label className="block space-y-1"><span className="text-xs font-bold text-slate-400">Student</span><select value={editStudentId} onChange={event => setEditStudentId(event.target.value)} disabled={!canManage} className={`${inputClass} disabled:opacity-70`}><option value="">General media</option>{tenantStudents.filter(student => student.status === 'active').sort((a, b) => a.name.localeCompare(b.name)).map(student => <option key={student.id} value={student.id}>{student.name}</option>)}</select></label>
                    <div className="flex flex-col-reverse gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-between">
                        {canManage ? <AtlasActionButton variant="danger" icon={Trash2} disabled={isEditing} onClick={() => void handleDeleteItems([editingItem])}>Delete</AtlasActionButton> : <AtlasActionButton icon={ImageIcon} onClick={() => window.open(editingItem.url, '_blank', 'noopener,noreferrer')}>Open image</AtlasActionButton>}
                        <div className="flex gap-2"><AtlasActionButton onClick={() => setEditingItem(null)} disabled={isEditing}>{canManage ? 'Cancel' : 'Close'}</AtlasActionButton>{canManage && <AtlasActionButton type="submit" variant="primary" icon={isEditing ? Loader2 : Check} disabled={isEditing} className={isEditing ? '[&_svg]:animate-spin' : ''}>{isEditing ? 'Saving...' : 'Save changes'}</AtlasActionButton>}</div>
                    </div>
                </form>}
            </Modal>

            <Modal isOpen={Boolean(capturingStudent)} onClose={closeCapture} title={capturingStudent ? `Capture for ${capturingStudent.name}` : 'Capture'}>
                {capturingStudent && <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950 p-3"><span className="text-sm font-bold text-white">{getStudentPhotosForDate(capturingStudent.id).length} photos today</span><span className="text-xs text-slate-500">Family visible</span></div>
                    <div className="relative flex min-h-72 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black">
                        {capturePreview ? <img src={capturePreview} alt="Capture preview" className="max-h-[55vh] w-full object-contain" /> : <label className="flex min-h-72 w-full cursor-pointer flex-col items-center justify-center p-8 text-center focus-within:ring-2 focus-within:ring-inset focus-within:ring-teal-400"><Camera size={36} className="mb-3 text-teal-300" /><span className="text-sm font-bold text-white">Choose or take a photo</span><span className="mt-1 text-xs text-slate-500">JPG, PNG, or WebP up to 12 MB</span><input type="file" accept={ALLOWED_IMAGE_TYPES.join(',')} capture="environment" onChange={handleCaptureFile} className="sr-only" /></label>}
                    </div>
                    {captureError && <div role="alert" className="rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{captureError}</div>}
                    <div className="flex justify-end gap-2 border-t border-white/10 pt-4"><AtlasActionButton onClick={capturePreview ? resetCapture : closeCapture} disabled={isUploading}>{capturePreview ? 'Retake' : 'Cancel'}</AtlasActionButton><AtlasActionButton variant="primary" icon={isUploading ? Loader2 : Send} onClick={() => void handleConfirmCapture()} disabled={!pendingFile || isUploading} className={isUploading ? '[&_svg]:animate-spin' : ''}>{isUploading ? 'Saving...' : 'Save to family gallery'}</AtlasActionButton></div>
                </div>}
            </Modal>
        </div>
    );
};
