import React, { useEffect, useMemo, useState } from 'react';
import {
    Car,
    CheckCircle2,
    Clock,
    Loader2,
    LogOut,
    MapPin,
    Monitor,
    Search,
    ShieldCheck,
    Trash2,
    UserCheck,
    X
} from 'lucide-react';
import {
    addDoc,
    collection,
    doc,
    runTransaction,
    serverTimestamp,
} from 'firebase/firestore';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { db } from '../services/firebase';
import { PickupEntry } from '../types';
import {
    AtlasActionButton,
    AtlasCommandHeader,
    AtlasEmptyState,
    AtlasSectionHeader,
    AtlasSignalCard,
    AtlasToolbar
} from '../components/atlas/AtlasSurface';

type QueueFilter = 'all' | 'arrived' | 'incoming' | 'released';

interface QueueGroup {
    entry: PickupEntry;
    entries: PickupEntry[];
    duplicateCount: number;
}

const ACTIVE_STATUSES = new Set<PickupEntry['status']>(['waiting', 'on_the_way', 'arrived', 'released']);
const TERMINAL_STATUSES = new Set<PickupEntry['status']>(['confirmed', 'dismissed']);
const MAX_STATUS_TRANSACTION_RECORDS = 400;
const HISTORY_DELETE_CHUNK_SIZE = 100;

class PickupSafetyError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PickupSafetyError';
    }
}

const getTimestampMillis = (value: unknown): number => {
    if (!value || typeof value !== 'object') return 0;
    const timestamp = value as { toMillis?: () => number; seconds?: number };
    if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
    return typeof timestamp.seconds === 'number' ? timestamp.seconds * 1000 : 0;
};

const getLifecycleMillis = (entry: PickupEntry): number => {
    const statusTimestamp = entry.status === 'confirmed'
        ? entry.confirmedAt
        : entry.status === 'released'
            ? entry.releasedAt
            : entry.status === 'arrived'
                ? entry.arrivedAt
                : entry.notifiedAt;

    return getTimestampMillis(statusTimestamp) || getTimestampMillis(entry.createdAt);
};

const formatTime = (entry: PickupEntry): string => {
    const timestamp = getLifecycleMillis(entry);
    if (!timestamp) return 'Syncing';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getStatusLabel = (status: PickupEntry['status']): string => {
    switch (status) {
        case 'waiting': return 'Waiting for arrival';
        case 'on_the_way': return 'On the way';
        case 'arrived': return 'At the gate';
        case 'released': return 'Released';
        case 'confirmed': return 'Pickup confirmed';
        case 'dismissed': return 'Dismissed';
        default: return status;
    }
};

export const PickupView = () => {
    const { pickupQueue, students } = useAppContext();
    const { can, currentOrganization, userProfile } = useAuth();
    const { confirm, alert: showAlert } = useConfirm();

    const isGatekeeper = can('attendance.manage');
    const organizationId = currentOrganization?.id;
    const [isDisplayMode, setIsDisplayMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [queueFilter, setQueueFilter] = useState<QueueFilter>('all');
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ tone: 'success' | 'warning'; message: string } | null>(null);
    const [displayTime, setDisplayTime] = useState(() => new Date());

    const tenantQueue = useMemo(
        () => organizationId ? pickupQueue.filter(entry => entry.organizationId === organizationId) : [],
        [organizationId, pickupQueue]
    );

    const groupsByStudent = useMemo(() => {
        const grouped = new Map<string, PickupEntry[]>();
        tenantQueue.forEach(entry => {
            const entries = grouped.get(entry.studentId) || [];
            entries.push(entry);
            grouped.set(entry.studentId, entries);
        });
        return grouped;
    }, [tenantQueue]);

    const latestByStudent = useMemo(() => {
        const latest = new Map<string, PickupEntry>();
        groupsByStudent.forEach((entries, studentId) => {
            const ordered = [...entries].sort((a, b) => getLifecycleMillis(b) - getLifecycleMillis(a));
            if (ordered[0]) latest.set(studentId, ordered[0]);
        });
        return latest;
    }, [groupsByStudent]);

    const queueGroups = useMemo<QueueGroup[]>(() => {
        const groups: QueueGroup[] = [];
        groupsByStudent.forEach(entries => {
            const ordered = [...entries].sort((a, b) => getLifecycleMillis(b) - getLifecycleMillis(a));
            const latest = ordered[0];
            if (!latest || TERMINAL_STATUSES.has(latest.status)) return;

            groups.push({
                entry: latest,
                entries: ordered,
                duplicateCount: Math.max(0, ordered.filter(item => ACTIVE_STATUSES.has(item.status)).length - 1)
            });
        });

        return groups.sort((a, b) => {
            const priority: Record<PickupEntry['status'], number> = {
                arrived: 0,
                waiting: 1,
                on_the_way: 1,
                released: 2,
                confirmed: 3,
                dismissed: 3
            };
            const statusDifference = priority[a.entry.status] - priority[b.entry.status];
            if (statusDifference !== 0) return statusDifference;
            return a.entry.status === 'released'
                ? getLifecycleMillis(b.entry) - getLifecycleMillis(a.entry)
                : getLifecycleMillis(a.entry) - getLifecycleMillis(b.entry);
        });
    }, [groupsByStudent]);

    const searchResults = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();
        if (!normalizedQuery || !organizationId) return [];

        return students
            .filter(student => student.organizationId === organizationId && student.status === 'active')
            .filter(student => [student.name, student.parentName, student.parentPhone, student.email]
                .some(value => value?.toLowerCase().includes(normalizedQuery)))
            .slice(0, 7)
            .map(student => ({ student, currentEntry: latestByStudent.get(student.id) }));
    }, [latestByStudent, organizationId, searchQuery, students]);

    const pickupSignals = useMemo(() => ({
        active: queueGroups.filter(group => ['waiting', 'on_the_way', 'arrived'].includes(group.entry.status)).length,
        onTheWay: queueGroups.filter(group => ['waiting', 'on_the_way'].includes(group.entry.status)).length,
        arrived: queueGroups.filter(group => group.entry.status === 'arrived').length,
        released: queueGroups.filter(group => group.entry.status === 'released').length
    }), [queueGroups]);

    const filteredGroups = useMemo(() => queueGroups.filter(group => {
        if (queueFilter === 'all') return true;
        if (queueFilter === 'incoming') return ['waiting', 'on_the_way'].includes(group.entry.status);
        return group.entry.status === queueFilter;
    }), [queueFilter, queueGroups]);

    const arrivedGroups = filteredGroups.filter(group => group.entry.status === 'arrived');
    const incomingGroups = filteredGroups.filter(group => ['waiting', 'on_the_way'].includes(group.entry.status));
    const releasedGroups = filteredGroups.filter(group => group.entry.status === 'released');

    useEffect(() => {
        if (!isDisplayMode) return;
        const timer = window.setInterval(() => setDisplayTime(new Date()), 30_000);
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsDisplayMode(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.clearInterval(timer);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isDisplayMode]);

    useEffect(() => {
        if (!isGatekeeper || !organizationId || document.visibilityState !== 'visible') return;
        const latestArrival = queueGroups
            .filter(group => group.entry.status === 'arrived')
            .sort((a, b) => getLifecycleMillis(b.entry) - getLifecycleMillis(a.entry))[0]?.entry;

        if (!latestArrival || Date.now() - getLifecycleMillis(latestArrival) > 120_000) return;
        const storageKey = `pickup:last-announced:${organizationId}`;
        if (localStorage.getItem(storageKey) === latestArrival.id) return;

        if ('speechSynthesis' in window) {
            const announcement = new SpeechSynthesisUtterance(`${latestArrival.studentName}'s pickup has arrived.`);
            announcement.rate = 1;
            window.speechSynthesis.speak(announcement);
        }
        localStorage.setItem(storageKey, latestArrival.id);
    }, [isGatekeeper, organizationId, queueGroups]);

    const validateMutation = async (entry?: PickupEntry): Promise<boolean> => {
        if (!db) {
            await showAlert('Pickup service unavailable', 'The database connection is unavailable. No pickup record was changed.', 'warning');
            return false;
        }
        if (!isGatekeeper) {
            await showAlert('Permission required', 'Only authorized pickup staff can change queue and release statuses.', 'warning');
            return false;
        }
        if (!organizationId || (entry && entry.organizationId !== organizationId)) {
            await showAlert('Organization mismatch', 'This pickup record does not belong to the active organization. No change was made.', 'warning');
            return false;
        }
        return true;
    };

    const updateEntriesSafely = async (
        entries: PickupEntry[],
        eligibleStatuses: ReadonlySet<PickupEntry['status']>,
        data: Record<string, unknown>
    ) => {
        const firestore = db;
        if (!firestore || !organizationId) throw new Error('Pickup service unavailable');
        const uniqueEntries = Array.from(new Map(entries.map(entry => [entry.id, entry])).values());
        if (uniqueEntries.length === 0) throw new PickupSafetyError('No eligible pickup records were found. No status was changed.');
        if (uniqueEntries.length > MAX_STATUS_TRANSACTION_RECORDS) {
            throw new PickupSafetyError('This pickup has too many duplicate records for one safe update. No status was changed.');
        }
        if (uniqueEntries.some(entry => entry.organizationId !== organizationId)) {
            throw new PickupSafetyError('A pickup record belongs to another organization. No status was changed.');
        }

        await runTransaction(firestore, async transaction => {
            const references = uniqueEntries.map(entry => doc(firestore, 'pickup_queue', entry.id));
            const snapshots = await Promise.all(references.map(reference => transaction.get(reference)));

            snapshots.forEach((snapshot, index) => {
                const expectedEntry = uniqueEntries[index];
                if (!snapshot.exists()) {
                    throw new PickupSafetyError('The pickup queue changed while this action was open. No status was changed.');
                }

                const currentEntry = snapshot.data() as Partial<PickupEntry>;
                if (currentEntry.organizationId !== organizationId || currentEntry.studentId !== expectedEntry.studentId) {
                    throw new PickupSafetyError('A pickup record failed its organization safety check. No status was changed.');
                }
                if (!currentEntry.status || !eligibleStatuses.has(currentEntry.status)) {
                    throw new PickupSafetyError('The pickup lifecycle changed before confirmation. No status was changed.');
                }
            });

            references.forEach(reference => transaction.update(reference, data));
        });
    };

    const deleteReleasedEntriesSafely = async (entries: PickupEntry[]) => {
        const firestore = db;
        if (!firestore || !organizationId) throw new Error('Pickup service unavailable');
        const uniqueEntries = Array.from(new Map(entries.map(entry => [entry.id, entry])).values());
        let deleted = 0;
        let skipped = 0;

        for (let index = 0; index < uniqueEntries.length; index += HISTORY_DELETE_CHUNK_SIZE) {
            const chunk = uniqueEntries.slice(index, index + HISTORY_DELETE_CHUNK_SIZE);
            const chunkResult = await runTransaction(firestore, async transaction => {
                const references = chunk.map(entry => doc(firestore, 'pickup_queue', entry.id));
                const snapshots = await Promise.all(references.map(reference => transaction.get(reference)));
                let chunkDeleted = 0;
                let chunkSkipped = 0;

                snapshots.forEach((snapshot, entryIndex) => {
                    const expectedEntry = chunk[entryIndex];
                    if (!snapshot.exists()) {
                        chunkSkipped += 1;
                        return;
                    }

                    const currentEntry = snapshot.data() as Partial<PickupEntry>;
                    const isExactTenantReleasedRecord =
                        expectedEntry.organizationId === organizationId &&
                        currentEntry.organizationId === organizationId &&
                        currentEntry.studentId === expectedEntry.studentId &&
                        currentEntry.status === 'released';

                    if (!isExactTenantReleasedRecord) {
                        chunkSkipped += 1;
                        return;
                    }

                    transaction.delete(references[entryIndex]);
                    chunkDeleted += 1;
                });

                return { deleted: chunkDeleted, skipped: chunkSkipped };
            });
            deleted += chunkResult.deleted;
            skipped += chunkResult.skipped;
        }

        return { deleted, skipped };
    };

    const markStudentArrived = async (group: QueueGroup, confirmChange = true) => {
        if (!(await validateMutation(group.entry))) return;
        const candidates = group.entries.filter(entry => ['waiting', 'on_the_way'].includes(entry.status));
        if (candidates.length === 0) {
            setFeedback({ tone: 'warning', message: `${group.entry.studentName} is already marked ${getStatusLabel(group.entry.status).toLowerCase()}.` });
            return;
        }

        if (confirmChange) {
            const approved = await confirm({
                title: 'Confirm parent arrival',
                message: `Mark ${group.entry.studentName}'s pickup as physically present at the gate?`,
                confirmText: 'Mark arrived',
                cancelText: 'Keep incoming',
                variant: 'info'
            });
            if (!approved) return;
        }

        setPendingAction(`arrive:${group.entry.studentId}`);
        setFeedback(null);
        try {
            await updateEntriesSafely(
                candidates,
                new Set<PickupEntry['status']>(['waiting', 'on_the_way']),
                { status: 'arrived', arrivedAt: serverTimestamp() }
            );
            setFeedback({ tone: 'success', message: `${group.entry.studentName} is now waiting at the gate.` });
        } catch (error) {
            const message = error instanceof PickupSafetyError
                ? error.message
                : 'The pickup status could not be updated. Check the connection and try again.';
            setFeedback({ tone: 'warning', message });
            await showAlert('Arrival update stopped', message, 'warning');
        } finally {
            setPendingAction(null);
        }
    };

    const addToQueue = async (studentId: string) => {
        const student = students.find(item => item.id === studentId);
        if (!student || !(await validateMutation())) return;
        if (student.organizationId !== organizationId) {
            await showAlert('Organization mismatch', 'This student is outside the active organization and cannot be added.', 'warning');
            return;
        }

        const currentEntry = latestByStudent.get(studentId);
        if (currentEntry && ACTIVE_STATUSES.has(currentEntry.status)) {
            const group: QueueGroup = {
                entry: currentEntry,
                entries: groupsByStudent.get(studentId) || [currentEntry],
                duplicateCount: 0
            };
            if (['waiting', 'on_the_way'].includes(currentEntry.status)) {
                const approved = await confirm({
                    title: 'Pickup already active',
                    message: `${student.name} is already ${getStatusLabel(currentEntry.status).toLowerCase()}. Mark the pickup as arrived instead of creating a duplicate?`,
                    confirmText: 'Mark arrived',
                    cancelText: 'Keep current status',
                    variant: 'info'
                });
                if (approved) await markStudentArrived(group, false);
            } else {
                setFeedback({
                    tone: 'warning',
                    message: currentEntry.status === 'released'
                        ? `${student.name} is already released and is awaiting parent confirmation.`
                        : `${student.name} is already waiting at the gate.`
                });
            }
            setSearchQuery('');
            return;
        }

        if (!db || !organizationId) return;
        setPendingAction(`add:${studentId}`);
        setFeedback(null);
        try {
            await addDoc(collection(db, 'pickup_queue'), {
                organizationId,
                studentId,
                studentName: student.name,
                parentName: student.parentName || 'Primary contact',
                pickerName: student.parentName || 'Primary contact',
                status: 'arrived',
                arrivedAt: serverTimestamp(),
                createdAt: serverTimestamp()
            });
            setSearchQuery('');
            setFeedback({ tone: 'success', message: `${student.name} was added to the gate queue.` });
        } catch {
            await showAlert('Could not add pickup', 'The arrival was not saved. Check the connection before trying again.', 'warning');
        } finally {
            setPendingAction(null);
        }
    };

    const releaseStudent = async (group: QueueGroup) => {
        if (!(await validateMutation(group.entry))) return;
        if (group.entry.status !== 'arrived') {
            await showAlert('Arrival required', `${group.entry.studentName} must be marked at the gate before release.`, 'warning');
            return;
        }

        const picker = group.entry.pickerName || group.entry.parentName || 'the listed pickup contact';
        const approved = await confirm({
            title: `Release ${group.entry.studentName}?`,
            message: `Confirm that staff have verified ${picker} and are deliberately releasing ${group.entry.studentName}. This action is visible to the parent.`,
            confirmText: 'Confirm release',
            cancelText: 'Keep waiting',
            variant: 'warning'
        });
        if (!approved) return;

        const activeEntries = group.entries.filter(entry => ['waiting', 'on_the_way', 'arrived'].includes(entry.status));
        setPendingAction(`release:${group.entry.studentId}`);
        setFeedback(null);
        try {
            await updateEntriesSafely(
                activeEntries,
                new Set<PickupEntry['status']>(['waiting', 'on_the_way', 'arrived']),
                {
                    status: 'released',
                    releasedAt: serverTimestamp(),
                    releasedByUserId: userProfile?.uid || null,
                    releasedByName: userProfile?.name || userProfile?.email || 'Authorized staff'
                }
            );
            setFeedback({ tone: 'success', message: `${group.entry.studentName} was released to ${picker}.` });
        } catch (error) {
            const message = error instanceof PickupSafetyError
                ? error.message
                : 'The release was not recorded. Keep the student with staff and try again.';
            setFeedback({ tone: 'warning', message });
            await showAlert('Release stopped', message, 'warning');
        } finally {
            setPendingAction(null);
        }
    };

    const removeReleasedStudent = async (group: QueueGroup) => {
        if (!(await validateMutation(group.entry))) return;
        const releasedEntries = group.entries.filter(entry => entry.status === 'released');
        const approved = await confirm({
            title: 'Remove released entry?',
            message: `Remove ${group.entry.studentName} from the visible pickup history? This does not confirm receipt for the parent.`,
            confirmText: 'Remove history',
            cancelText: 'Keep visible',
            variant: 'danger'
        });
        if (!approved) return;

        setPendingAction(`remove:${group.entry.studentId}`);
        try {
            const result = await deleteReleasedEntriesSafely(releasedEntries);
            setFeedback(result.skipped > 0
                ? { tone: 'warning', message: `${result.deleted} released record${result.deleted === 1 ? '' : 's'} removed; ${result.skipped} changed or unsafe record${result.skipped === 1 ? ' was' : 's were'} kept.` }
                : { tone: 'success', message: `${group.entry.studentName} was removed from pickup history.` });
        } catch {
            await showAlert('History update failed', 'The released entry could not be removed. Try again.', 'warning');
        } finally {
            setPendingAction(null);
        }
    };

    const clearReleasedEntries = async () => {
        const releasedEntries = tenantQueue.filter(entry => entry.status === 'released');
        if (releasedEntries.length === 0 || !(await validateMutation(releasedEntries[0]))) return;
        const approved = await confirm({
            title: 'Clear released history?',
            message: `Remove ${releasedEntries.length} released ${releasedEntries.length === 1 ? 'record' : 'records'} from the pickup desk? Parent-confirmed records are not affected.`,
            confirmText: 'Clear released records',
            cancelText: 'Keep history',
            variant: 'danger'
        });
        if (!approved) return;

        setPendingAction('clear-history');
        setFeedback(null);
        try {
            const result = await deleteReleasedEntriesSafely(releasedEntries);
            setFeedback(result.skipped > 0
                ? { tone: 'warning', message: `${result.deleted} released record${result.deleted === 1 ? '' : 's'} cleared; ${result.skipped} changed or unsafe record${result.skipped === 1 ? ' was' : 's were'} kept.` }
                : { tone: 'success', message: 'Released pickup history was cleared.' });
        } catch {
            await showAlert('History update failed', 'Released records could not be cleared. Try again.', 'warning');
        } finally {
            setPendingAction(null);
        }
    };

    const filterOptions: Array<{ id: QueueFilter; label: string; count: number }> = [
        { id: 'all', label: 'All active', count: queueGroups.length },
        { id: 'arrived', label: 'At gate', count: pickupSignals.arrived },
        { id: 'incoming', label: 'Incoming', count: pickupSignals.onTheWay },
        { id: 'released', label: 'Released', count: pickupSignals.released }
    ];

    if (!organizationId) {
        return (
            <div className="pb-24 md:pb-8">
                <AtlasEmptyState
                    title="Select an organization"
                    description="Pickup operations are tenant-scoped. Select an organization before opening the live queue."
                    icon={ShieldCheck}
                />
            </div>
        );
    }

    return (
        <div className="space-y-5 pb-24 md:pb-8">
            {!isDisplayMode && (
                <>
                    <AtlasCommandHeader
                        eyebrow="Live operations"
                        title="Pickup Desk"
                        description="Move each pickup safely from approaching, to gate arrival, to verified release."
                        icon={Car}
                        badges={
                            <span className="flex items-center gap-1.5 rounded-md border border-teal-300/20 bg-teal-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-teal-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-teal-300" /> Live queue
                            </span>
                        }
                        actions={
                            <>
                                {isGatekeeper && pickupSignals.released > 0 && (
                                    <AtlasActionButton
                                        icon={Trash2}
                                        onClick={clearReleasedEntries}
                                        disabled={pendingAction !== null}
                                    >
                                        Clear released
                                    </AtlasActionButton>
                                )}
                                <AtlasActionButton icon={Monitor} onClick={() => setIsDisplayMode(true)}>
                                    Lobby display
                                </AtlasActionButton>
                            </>
                        }
                    />

                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                        <AtlasSignalCard label="Active queue" value={pickupSignals.active} detail="Awaiting safe handoff" icon={Car} tone="teal" onClick={() => setQueueFilter('all')} />
                        <AtlasSignalCard label="Incoming" value={pickupSignals.onTheWay} detail="Approaching the gate" icon={MapPin} tone="blue" onClick={() => setQueueFilter('incoming')} />
                        <AtlasSignalCard label="At the gate" value={pickupSignals.arrived} detail="Release action required" icon={UserCheck} tone={pickupSignals.arrived > 0 ? 'amber' : 'slate'} onClick={() => setQueueFilter('arrived')} />
                        <AtlasSignalCard label="Released" value={pickupSignals.released} detail="Awaiting parent confirmation" icon={CheckCircle2} tone="emerald" onClick={() => setQueueFilter('released')} />
                    </div>

                    <div className="relative z-20">
                        <AtlasToolbar
                            leading={isGatekeeper ? (
                                <div className="relative w-full max-w-md">
                                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input
                                        value={searchQuery}
                                        onChange={event => setSearchQuery(event.target.value)}
                                        placeholder="Find student, parent, phone, or email"
                                        className="min-h-10 w-full rounded-lg border border-white/10 bg-slate-900 pl-9 pr-9 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-teal-400/50 focus:ring-2 focus:ring-teal-400/20"
                                        aria-label="Search students to add to pickup"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-white/[0.06] hover:text-white"
                                            aria-label="Clear student search"
                                        >
                                            <X size={15} />
                                        </button>
                                    )}
                                    {searchQuery.trim() && (
                                        <div className="absolute inset-x-0 top-[calc(100%+8px)] overflow-hidden rounded-lg border border-white/10 bg-slate-950 shadow-2xl">
                                            {searchResults.map(({ student, currentEntry }) => {
                                                const isActive = currentEntry && ACTIVE_STATUSES.has(currentEntry.status);
                                                return (
                                                    <button
                                                        key={student.id}
                                                        type="button"
                                                        onClick={() => addToQueue(student.id)}
                                                        disabled={pendingAction !== null}
                                                        className="flex min-h-14 w-full items-center gap-3 border-b border-white/[0.06] px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-white/[0.05] disabled:cursor-wait disabled:opacity-60"
                                                    >
                                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-300/20 bg-teal-400/10 text-xs font-black text-teal-200">
                                                            {student.name.slice(0, 1).toUpperCase()}
                                                        </span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate text-sm font-bold text-white">{student.name}</span>
                                                            <span className="block truncate text-xs text-slate-500">{student.parentName || student.parentPhone || 'Primary contact'}</span>
                                                        </span>
                                                        <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-amber-200' : 'text-teal-300'}`}>
                                                            {isActive ? getStatusLabel(currentEntry.status) : 'Add arrival'}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                            {searchResults.length === 0 && (
                                                <div className="px-4 py-5 text-center text-xs text-slate-500">No active student matches this search.</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <ShieldCheck size={15} /> Read-only pickup visibility
                                </div>
                            )}
                        >
                            <div className="flex w-full flex-wrap gap-1.5 lg:justify-end">
                                {filterOptions.map(option => (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => setQueueFilter(option.id)}
                                        className={`min-h-9 rounded-lg border px-3 text-xs font-bold transition-colors ${queueFilter === option.id
                                            ? 'border-teal-300/30 bg-teal-400/10 text-teal-200'
                                            : 'border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-white'
                                            }`}
                                    >
                                        {option.label} <span className="ml-1 tabular-nums opacity-70">{option.count}</span>
                                    </button>
                                ))}
                            </div>
                        </AtlasToolbar>
                    </div>

                    {feedback && (
                        <div
                            role="status"
                            className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${feedback.tone === 'success'
                                ? 'border-teal-300/25 bg-teal-400/[0.07] text-teal-100'
                                : 'border-amber-300/25 bg-amber-300/[0.07] text-amber-100'
                                }`}
                        >
                            <span>{feedback.message}</span>
                            <button type="button" onClick={() => setFeedback(null)} className="shrink-0 opacity-70 hover:opacity-100" aria-label="Dismiss message">
                                <X size={16} />
                            </button>
                        </div>
                    )}
                </>
            )}

            {isDisplayMode ? (
                <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950 p-4 sm:p-6">
                    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-teal-400 text-slate-950">
                                <Car size={23} />
                            </span>
                            <div className="min-w-0">
                                <h1 className="truncate text-xl font-black text-white sm:text-2xl">Pickup Status</h1>
                                <p className="text-xs text-slate-400">Live gate updates</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <time className="font-mono text-xl font-black tabular-nums text-amber-200 sm:text-2xl">
                                {displayTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </time>
                            <AtlasActionButton icon={LogOut} onClick={() => setIsDisplayMode(false)}>Exit</AtlasActionButton>
                        </div>
                    </header>

                    <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 pt-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
                        <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-amber-300/25 bg-slate-900/70">
                            <div className="flex items-center justify-between border-b border-amber-300/20 bg-amber-300/[0.08] px-4 py-3">
                                <h2 className="text-sm font-black uppercase tracking-wider text-amber-100">Ready for pickup</h2>
                                <span className="font-mono text-xs text-amber-200">{pickupSignals.released}</span>
                            </div>
                            <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-1 gap-3 overflow-y-auto p-4 xl:grid-cols-2">
                                {queueGroups.filter(group => group.entry.status === 'released').map(group => (
                                    <div key={group.entry.id} className="rounded-lg border border-amber-300/20 bg-slate-950 p-4">
                                        <div className="truncate text-2xl font-black text-white">{group.entry.studentName}</div>
                                        <div className="mt-2 flex items-center justify-between gap-3 text-sm text-slate-400">
                                            <span className="truncate">Proceed to pickup point</span>
                                            <span className="shrink-0 font-mono text-amber-200">{formatTime(group.entry)}</span>
                                        </div>
                                    </div>
                                ))}
                                {pickupSignals.released === 0 && (
                                    <div className="col-span-full flex min-h-44 items-center justify-center text-sm font-bold text-slate-600">No students released yet.</div>
                                )}
                            </div>
                        </section>

                        <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-teal-300/20 bg-slate-900/70">
                            <div className="flex items-center justify-between border-b border-teal-300/20 bg-teal-400/[0.07] px-4 py-3">
                                <h2 className="text-sm font-black uppercase tracking-wider text-teal-100">Parents at gate</h2>
                                <span className="font-mono text-xs text-teal-200">{pickupSignals.arrived}</span>
                            </div>
                            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                                {queueGroups.filter(group => group.entry.status === 'arrived').map(group => (
                                    <div key={group.entry.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-950 px-3 py-3">
                                        <span className="min-w-0 truncate text-lg font-bold text-white">{group.entry.studentName}</span>
                                        <span className="shrink-0 font-mono text-xs text-teal-200">{formatTime(group.entry)}</span>
                                    </div>
                                ))}
                                {pickupSignals.arrived === 0 && (
                                    <div className="flex min-h-36 items-center justify-center text-center text-sm text-slate-600">No parents waiting at the gate.</div>
                                )}
                            </div>
                        </section>
                    </main>
                </div>
            ) : filteredGroups.length === 0 ? (
                <AtlasEmptyState
                    title={queueGroups.length === 0 ? 'Pickup queue is clear' : 'No pickups match this view'}
                    description={queueGroups.length === 0
                        ? 'Incoming parent notifications and staff-added arrivals will appear here.'
                        : 'Choose another status filter to continue scanning the live queue.'}
                    icon={Clock}
                    action={queueGroups.length > 0 ? <AtlasActionButton onClick={() => setQueueFilter('all')}>Show all active</AtlasActionButton> : undefined}
                />
            ) : (
                <div className="space-y-7">
                    {arrivedGroups.length > 0 && (
                        <section className="space-y-4">
                            <AtlasSectionHeader
                                title="At the gate"
                                description="Verify the pickup contact before recording release."
                                icon={UserCheck}
                                meta={<span className="rounded-md bg-amber-300/10 px-2 py-0.5 text-[10px] font-bold text-amber-200">{arrivedGroups.length} action required</span>}
                            />
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {arrivedGroups.map(group => {
                                    const isPending = pendingAction === `release:${group.entry.studentId}`;
                                    return (
                                        <article key={group.entry.id} className="rounded-lg border border-amber-300/25 bg-slate-900 p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                                        <span className="rounded-md bg-amber-300 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-950">At gate</span>
                                                        <span className="font-mono text-xs text-amber-200">{formatTime(group.entry)}</span>
                                                        {group.duplicateCount > 0 && <span className="text-[10px] font-bold text-slate-500">{group.duplicateCount + 1} records linked</span>}
                                                    </div>
                                                    <h3 className="truncate text-xl font-black text-white">{group.entry.studentName}</h3>
                                                    <p className="mt-1 flex items-center gap-2 truncate text-sm text-slate-400">
                                                        <UserCheck size={14} className="shrink-0" />
                                                        {group.entry.pickerName || group.entry.parentName || 'Pickup contact not listed'}
                                                    </p>
                                                </div>
                                            </div>
                                            {isGatekeeper ? (
                                                <AtlasActionButton
                                                    icon={isPending ? Loader2 : CheckCircle2}
                                                    variant="primary"
                                                    className="mt-4 w-full"
                                                    onClick={() => releaseStudent(group)}
                                                    disabled={pendingAction !== null}
                                                >
                                                    {isPending ? 'Recording release' : 'Verify and release'}
                                                </AtlasActionButton>
                                            ) : (
                                                <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-500">Authorized pickup staff must complete release.</div>
                                            )}
                                        </article>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {incomingGroups.length > 0 && (
                        <section className="space-y-4">
                            <AtlasSectionHeader title="Incoming" description="Parents approaching or waiting to confirm physical arrival." icon={Car} />
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                                {incomingGroups.map(group => {
                                    const isPending = pendingAction === `arrive:${group.entry.studentId}`;
                                    return (
                                        <article key={group.entry.id} className="rounded-lg border border-sky-300/20 bg-slate-900/70 p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="text-[10px] font-black uppercase tracking-wider text-sky-200">{getStatusLabel(group.entry.status)}</div>
                                                    <h3 className="mt-1 truncate text-base font-black text-white">{group.entry.studentName}</h3>
                                                    <p className="mt-1 truncate text-xs text-slate-500">{group.entry.pickerName || group.entry.parentName || 'Pickup contact'}</p>
                                                    <p className="mt-2 font-mono text-[11px] text-slate-500">Notified {formatTime(group.entry)}</p>
                                                </div>
                                                {isGatekeeper && (
                                                    <button
                                                        type="button"
                                                        onClick={() => markStudentArrived(group)}
                                                        disabled={pendingAction !== null}
                                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-teal-300/25 bg-teal-400/10 text-teal-200 transition-colors hover:bg-teal-400/20 disabled:opacity-50"
                                                        title="Confirm physical arrival"
                                                        aria-label={`Mark ${group.entry.studentName} as arrived`}
                                                    >
                                                        {isPending ? <Loader2 size={17} className="animate-spin" /> : <MapPin size={17} />}
                                                    </button>
                                                )}
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {releasedGroups.length > 0 && (
                        <section className="space-y-4 border-t border-white/10 pt-6">
                            <AtlasSectionHeader
                                title="Released"
                                description="Students released by staff and awaiting parent receipt confirmation."
                                icon={LogOut}
                            />
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {releasedGroups.map(group => (
                                    <article key={group.entry.id} className="flex min-w-0 items-center gap-3 rounded-lg border border-white/10 bg-slate-900/45 p-3">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-teal-300/20 bg-teal-400/10 text-teal-200">
                                            <CheckCircle2 size={17} />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-sm font-bold text-slate-200">{group.entry.studentName}</div>
                                            <div className="mt-0.5 font-mono text-[10px] text-slate-500">Released {formatTime(group.entry)}</div>
                                        </div>
                                        {isGatekeeper && (
                                            <button
                                                type="button"
                                                onClick={() => removeReleasedStudent(group)}
                                                disabled={pendingAction !== null}
                                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                                                aria-label={`Remove ${group.entry.studentName} from released history`}
                                                title="Remove from visible history"
                                            >
                                                {pendingAction === `remove:${group.entry.studentId}` ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                            </button>
                                        )}
                                    </article>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
};
