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
    UserCheck,
    X
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { db } from '../services/firebase';
import { PickupEntry } from '../types';
import { advancePickup, announcePickup } from '../modules/pickup/services/pickupCommands';
import { isAuthorizedPicker, isCanonicalPickupEntry } from '../modules/pickup/domain/pickupLifecycle';
import {
    AtlasActionButton,
    AtlasCommandHeader,
    AtlasEmptyState,
    AtlasSectionHeader,
    AtlasSignalCard,
    AtlasToolbar
} from '../components/atlas/AtlasSurface';
import './family-journey/education-family-journey-v1.css';

type QueueFilter = 'all' | 'arrived' | 'ready' | 'incoming' | 'released';

interface QueueGroup {
    entry: PickupEntry;
    entries: PickupEntry[];
    duplicateCount: number;
}

const ACTIVE_STATUSES = new Set<PickupEntry['status']>(['waiting', 'on_the_way', 'arrived', 'ready', 'released']);
const TERMINAL_STATUSES = new Set<PickupEntry['status']>(['confirmed', 'dismissed', 'cancelled', 'exception']);

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
            : entry.status === 'ready'
                ? entry.readyAt
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
        case 'ready': return 'Learner ready';
        case 'released': return 'Released';
        case 'confirmed': return 'Pickup confirmed';
        case 'dismissed': return 'Dismissed';
        case 'cancelled': return 'Cancelled';
        case 'exception': return 'Needs staff review';
        default: return status;
    }
};

export const PickupView = () => {
    const showEducationFamilyJourneyV1 = new URLSearchParams(window.location.search).get('ui') !== 'atlas-legacy';
    const { pickupQueue, students } = useAppContext();
    const { currentOrganization, userProfile } = useAuth();
    const { confirm, alert: showAlert } = useConfirm();

    const isGatekeeper = ['super_admin', 'owner', 'admin', 'instructor'].includes(userProfile?.role || '');
    const organizationId = currentOrganization?.id;
    const [isDisplayMode, setIsDisplayMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [pickerSelections, setPickerSelections] = useState<Record<string, string>>({});
    const [queueFilter, setQueueFilter] = useState<QueueFilter>('all');
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ tone: 'success' | 'warning'; message: string } | null>(null);
    const [verificationEntryId, setVerificationEntryId] = useState<string | null>(null);
    const [verificationMethod, setVerificationMethod] = useState<'photo_id' | 'known_person'>('photo_id');
    const [verificationNote, setVerificationNote] = useState('');
    const [verificationConfirmed, setVerificationConfirmed] = useState(false);
    const [displayTime, setDisplayTime] = useState(() => new Date());

    const tenantQueue = useMemo(
        () => organizationId ? pickupQueue.filter(entry => entry.organizationId === organizationId) : [],
        [organizationId, pickupQueue]
    );
    const legacyActive = useMemo(() => tenantQueue.filter(entry =>
        ACTIVE_STATUSES.has(entry.status) && !isCanonicalPickupEntry(entry)
    ), [tenantQueue]);

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
                ready: 0,
                arrived: 1,
                waiting: 2,
                on_the_way: 2,
                released: 3,
                confirmed: 4,
                dismissed: 4,
                cancelled: 4,
                exception: 4
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
        active: queueGroups.filter(group => ['waiting', 'on_the_way', 'arrived', 'ready'].includes(group.entry.status)).length,
        onTheWay: queueGroups.filter(group => ['waiting', 'on_the_way'].includes(group.entry.status)).length,
        arrived: queueGroups.filter(group => group.entry.status === 'arrived').length,
        ready: queueGroups.filter(group => group.entry.status === 'ready').length,
        released: queueGroups.filter(group => group.entry.status === 'released').length
    }), [queueGroups]);

    const filteredGroups = useMemo(() => queueGroups.filter(group => {
        if (queueFilter === 'all') return true;
        if (queueFilter === 'incoming') return ['waiting', 'on_the_way'].includes(group.entry.status);
        return group.entry.status === queueFilter;
    }), [queueFilter, queueGroups]);

    const arrivedGroups = filteredGroups.filter(group => group.entry.status === 'arrived');
    const readyGroups = filteredGroups.filter(group => group.entry.status === 'ready');
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
        const latestAction = queueGroups
            .filter(group => ['arrived', 'ready'].includes(group.entry.status))
            .sort((a, b) => getLifecycleMillis(b.entry) - getLifecycleMillis(a.entry))[0]?.entry;

        if (!latestAction || Date.now() - getLifecycleMillis(latestAction) > 120_000) return;
        const storageKey = `pickup:last-announced:${organizationId}`;
        const announcementId = `${latestAction.id}:${latestAction.status}`;
        if (localStorage.getItem(storageKey) === announcementId) return;

        if ('speechSynthesis' in window) {
            const announcement = new SpeechSynthesisUtterance(latestAction.status === 'ready'
                ? `${latestAction.studentName} is packed and ready for pickup.`
                : `${latestAction.studentName}'s pickup has arrived.`);
            announcement.rate = 1;
            window.speechSynthesis.speak(announcement);
        }
        localStorage.setItem(storageKey, announcementId);
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
        if (entry && !isCanonicalPickupEntry(entry)) {
            await showAlert('Legacy pickup needs reconciliation', 'This older record cannot be advanced under the dated pickup rules. Keep the learner with staff and reconcile the record through the academy\'s reviewed process.', 'warning');
            return false;
        }
        return true;
    };

    const markStudentArrived = async (group: QueueGroup, confirmChange = true) => {
        if (!(await validateMutation(group.entry))) return;
        if (!userProfile?.uid) return;
        if (group.entry.status !== 'on_the_way') {
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
            await advancePickup(db!, group.entry.id, 'on_the_way', 'arrived', userProfile.uid);
            setFeedback({ tone: 'success', message: `${group.entry.studentName} is now waiting at the gate.` });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'The pickup status could not be updated. Check the connection and try again.';
            setFeedback({ tone: 'warning', message });
            await showAlert('Arrival update stopped', message, 'warning');
        } finally {
            setPendingAction(null);
        }
    };

    const addToQueue = async (studentId: string, selectedPickerName?: string) => {
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

        if (!db || !organizationId || !userProfile?.uid) return;
        const pickerOptions = Array.from(new Set([student.parentName, ...(student.authorizedPickups || [])].filter(Boolean) as string[]));
        const pickerName = selectedPickerName?.trim() || '';
        if (!pickerOptions.includes(pickerName)) {
            await showAlert('Picker not authorized', 'Choose the exact name of a listed authorized pickup person.', 'warning');
            return;
        }
        setPendingAction(`add:${studentId}`);
        setFeedback(null);
        let createdEntryId: string | null = null;
        try {
            createdEntryId = await announcePickup(db, student, userProfile.uid, pickerName);
            await advancePickup(db, createdEntryId, 'on_the_way', 'arrived', userProfile.uid);
            setSearchQuery('');
            setFeedback({ tone: 'success', message: `${student.name} was added to the gate queue.` });
        } catch {
            await showAlert('Could not complete arrival', createdEntryId
                ? 'The pickup request was saved, but gate arrival was not confirmed. Refresh the queue before retrying; keep the learner with staff.'
                : 'The pickup request was not saved. Check the connection and current queue before trying again.', 'warning');
        } finally {
            setPendingAction(null);
        }
    };

    const releaseStudent = async (group: QueueGroup) => {
        if (!(await validateMutation(group.entry))) return;
        if (!userProfile?.uid) return;
        if (group.entry.status !== 'ready') {
            await showAlert('Learner is not ready', `${group.entry.studentName} must finish packing and choose “I’m ready” before release.`, 'warning');
            return;
        }

        const picker = group.entry.pickerName || '';
        const student = students.find(item => item.id === group.entry.studentId && item.organizationId === organizationId);
        if (!student || !isAuthorizedPicker(picker, student.parentName || '', student.authorizedPickups)) {
            await showAlert('Picker authorization changed', 'The listed picker is no longer authorized. Keep the learner with staff and escalate this pickup.', 'warning');
            return;
        }
        if (!verificationConfirmed || verificationNote.trim().length < 8) return;
        setPendingAction(`release:${group.entry.studentId}`);
        setFeedback(null);
        try {
            await advancePickup(db!, group.entry.id, 'ready', 'released', userProfile.uid, {
                verificationMethod,
                verificationNote: verificationNote.trim()
            });
            setFeedback({ tone: 'success', message: `${group.entry.studentName} was released to ${picker}.` });
            setVerificationEntryId(null);
            setVerificationNote('');
            setVerificationConfirmed(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'The release was not recorded. Keep the student with staff and try again.';
            setFeedback({ tone: 'warning', message });
            await showAlert('Release stopped', message, 'warning');
        } finally {
            setPendingAction(null);
        }
    };

    const filterOptions: Array<{ id: QueueFilter; label: string; count: number }> = [
        { id: 'all', label: 'All active', count: queueGroups.length },
        { id: 'arrived', label: 'At gate', count: pickupSignals.arrived },
        { id: 'ready', label: 'Learner ready', count: pickupSignals.ready },
        { id: 'incoming', label: 'Incoming', count: pickupSignals.onTheWay },
        { id: 'released', label: 'Released', count: pickupSignals.released }
    ];

    if (!organizationId) {
        return (
            <div className={`pb-24 md:pb-8 ${showEducationFamilyJourneyV1 ? 'edu-v1 edu-pickup-v1' : ''}`} data-testid={showEducationFamilyJourneyV1 ? 'education-pickup-v1' : undefined}>
                <AtlasEmptyState
                    title="Select an organization"
                    description="Pickup operations are tenant-scoped. Select an organization before opening the live queue."
                    icon={ShieldCheck}
                />
            </div>
        );
    }

    return (
        <div className={`space-y-5 pb-24 md:pb-8 ${showEducationFamilyJourneyV1 ? 'edu-v1 edu-pickup-v1' : ''}`} data-testid={showEducationFamilyJourneyV1 ? 'education-pickup-v1' : undefined}>
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
                                <AtlasActionButton icon={Monitor} onClick={() => setIsDisplayMode(true)}>
                                    Lobby display
                                </AtlasActionButton>
                            </>
                        }
                    />

                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
                        <AtlasSignalCard label="Active queue" value={pickupSignals.active} detail="Awaiting safe handoff" icon={Car} tone="teal" onClick={() => setQueueFilter('all')} />
                        <AtlasSignalCard label="Incoming" value={pickupSignals.onTheWay} detail="Approaching the gate" icon={MapPin} tone="blue" onClick={() => setQueueFilter('incoming')} />
                        <AtlasSignalCard label="At the gate" value={pickupSignals.arrived} detail="Learner is packing" icon={UserCheck} tone={pickupSignals.arrived > 0 ? 'amber' : 'slate'} onClick={() => setQueueFilter('arrived')} />
                        <AtlasSignalCard label="Learner ready" value={pickupSignals.ready} detail="Verify and release" icon={ShieldCheck} tone={pickupSignals.ready > 0 ? 'amber' : 'slate'} onClick={() => setQueueFilter('ready')} />
                        <AtlasSignalCard label="Released" value={pickupSignals.released} detail="Awaiting parent confirmation" icon={CheckCircle2} tone="emerald" onClick={() => setQueueFilter('released')} />
                    </div>

                    {legacyActive.length > 0 && <section className="rounded-xl border border-amber-300/35 bg-amber-300/10 p-4 text-amber-50" aria-label="Legacy pickup reconciliation" role="alert">
                        <h2 className="text-sm font-black">{legacyActive.length} older pickup {legacyActive.length === 1 ? 'record needs' : 'records need'} reconciliation</h2>
                        <p className="mt-1 text-xs leading-5 text-amber-100">These records have no validated dated session. Keep the learner with authorized staff, verify the real handoff independently, and reconcile the historical record through the academy’s reviewed process. Do not create a replacement while an older pickup remains open.</p>
                        <ul className="mt-3 space-y-1 text-xs">{legacyActive.map(entry => <li key={entry.id} className="flex flex-wrap gap-x-2"><strong>{entry.studentName}</strong><span>{getStatusLabel(entry.status)}</span><code className="break-all text-amber-200">{entry.id}</code></li>)}</ul>
                    </section>}

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
                                                const pickerOptions = Array.from(new Set([student.parentName, ...(student.authorizedPickups || [])].filter(Boolean) as string[]));
                                                const selectedPicker = pickerSelections[student.id] || pickerOptions[0] || '';
                                                return (
                                                    <div
                                                        key={student.id}
                                                        className="border-b border-white/[0.06] px-3 py-3 last:border-b-0"
                                                    >
                                                      <div className="flex items-center gap-3">
                                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-300/20 bg-teal-400/10 text-xs font-black text-teal-200">
                                                            {student.name.slice(0, 1).toUpperCase()}
                                                        </span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate text-sm font-bold text-white">{student.name}</span>
                                                            <span className="block truncate text-xs text-slate-500">{student.parentName || student.parentPhone || 'Primary contact'}</span>
                                                        </span>
                                                        {isActive && <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-amber-200">{getStatusLabel(currentEntry.status)}</span>}
                                                      </div>
                                                      {!isActive && pickerOptions.length > 0 && <label className="mt-2 block text-xs font-bold text-slate-300" htmlFor={`staff-picker-${student.id}`}>Authorized picker</label>}
                                                      <div className="mt-2 flex items-center gap-2">
                                                        {!isActive && pickerOptions.length > 0 && <select id={`staff-picker-${student.id}`} value={selectedPicker} onChange={event => setPickerSelections(current => ({ ...current, [student.id]: event.target.value }))} className="min-h-10 min-w-0 flex-1 rounded-lg border border-white/20 bg-slate-900 px-2 text-xs text-white focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-300/30">{pickerOptions.map(name => <option key={name} value={name}>{name}</option>)}</select>}
                                                        {!isActive && pickerOptions.length === 0 && <span className="flex-1 text-xs text-amber-200">No authorized picker is listed.</span>}
                                                        <button type="button" onClick={() => void addToQueue(student.id, selectedPicker)} disabled={pendingAction !== null || (!isActive && pickerOptions.length === 0)} className="min-h-10 rounded-lg bg-teal-400 px-3 text-xs font-black text-slate-950 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50">{isActive ? 'Review arrival' : 'Add arrival'}</button>
                                                      </div>
                                                    </div>
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
                                <h2 className="text-sm font-black uppercase tracking-wider text-amber-100">Ready for staff release</h2>
                                <span className="font-mono text-xs text-amber-200">{pickupSignals.ready}</span>
                            </div>
                            <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-1 gap-3 overflow-y-auto p-4 xl:grid-cols-2">
                                {queueGroups.filter(group => group.entry.status === 'ready').map(group => (
                                    <div key={group.entry.id} className="rounded-lg border border-amber-300/20 bg-slate-950 p-4">
                                        <div className="truncate text-2xl font-black text-white">{group.entry.studentName}</div>
                                        <div className="mt-2 flex items-center justify-between gap-3 text-sm text-slate-400">
                                            <span className="truncate">Packed and waiting inside</span>
                                            <span className="shrink-0 font-mono text-amber-200">{formatTime(group.entry)}</span>
                                        </div>
                                    </div>
                                ))}
                                {pickupSignals.ready === 0 && (
                                    <div className="col-span-full flex min-h-44 items-center justify-center text-sm font-bold text-slate-600">No learners marked ready yet.</div>
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
                                title="Parent at the gate"
                                description="The learner is still packing and must choose “I’m ready” before staff release."
                                icon={UserCheck}
                                meta={<span className="rounded-md bg-amber-300/10 px-2 py-0.5 text-[10px] font-bold text-amber-200">{arrivedGroups.length} packing</span>}
                            />
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                                {arrivedGroups.map(group => <article key={group.entry.id} className="rounded-lg border border-amber-300/25 bg-slate-900 p-4">
                                    <div className="text-[10px] font-black uppercase tracking-wider text-amber-200">Waiting for learner</div>
                                    <h3 className="mt-1 truncate text-base font-black text-white">{group.entry.studentName}</h3>
                                    <p className="mt-1 truncate text-xs text-slate-400">{group.entry.pickerName || group.entry.parentName || 'Pickup contact'}</p>
                                    <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-400">Parent arrived at {formatTime(group.entry)}. Release stays locked until the learner finishes tidying and marks ready.</p>
                                </article>)}
                            </div>
                        </section>
                    )}

                    {readyGroups.length > 0 && (
                        <section className="space-y-4">
                            <AtlasSectionHeader
                                title="Learners ready"
                                description="The learner finished packing. Verify the pickup contact before recording departure."
                                icon={ShieldCheck}
                                meta={<span className="rounded-md bg-amber-300/10 px-2 py-0.5 text-[10px] font-bold text-amber-200">{readyGroups.length} action required</span>}
                            />
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {readyGroups.map(group => {
                                    const isPending = pendingAction === `release:${group.entry.studentId}`;
                                    return (
                                        <article key={group.entry.id} className="rounded-lg border border-amber-300/25 bg-slate-900 p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                                        <span className="rounded-md bg-amber-300 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-950">Learner ready</span>
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
                                                verificationEntryId === group.entry.id ? <form className="mt-4 space-y-3 rounded-xl border border-teal-300/30 bg-slate-950/60 p-3" onSubmit={event => { event.preventDefault(); void releaseStudent(group); }}>
                                                    <p className="text-xs font-bold text-teal-200">Match the person in front of you to the authorized picker: {group.entry.pickerName}</p>
                                                    <label htmlFor={`pickup-method-${group.entry.id}`} className="block text-xs font-bold text-slate-200">How was their identity checked?</label>
                                                    <select id={`pickup-method-${group.entry.id}`} value={verificationMethod} onChange={event => setVerificationMethod(event.target.value as 'photo_id' | 'known_person')} className="min-h-11 w-full rounded-lg border border-white/20 bg-slate-900 px-3 text-sm text-white outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-300/30">
                                                        <option value="photo_id">Photo ID</option><option value="known_person">Known person</option>
                                                    </select>
                                                    <label htmlFor={`pickup-note-${group.entry.id}`} className="block text-xs font-bold text-slate-200">Verification note</label>
                                                    <textarea id={`pickup-note-${group.entry.id}`} value={verificationNote} onChange={event => setVerificationNote(event.target.value)} minLength={8} maxLength={500} required rows={2} placeholder="Record what you checked; do not enter an ID number." className="w-full rounded-lg border border-white/20 bg-slate-900 p-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-teal-300 focus:ring-2 focus:ring-teal-300/30" />
                                                    <label className="flex items-start gap-2 text-xs leading-5 text-slate-200"><input type="checkbox" checked={verificationConfirmed} onChange={event => setVerificationConfirmed(event.target.checked)} required className="mt-1 accent-teal-400" /><span>I verified this person against the authorized picker list and am handing over {group.entry.studentName}.</span></label>
                                                    <div className="flex gap-2"><button type="submit" disabled={pendingAction !== null || verificationNote.trim().length < 8 || !verificationConfirmed} className="min-h-11 flex-1 rounded-lg bg-teal-400 px-3 text-xs font-black text-slate-950 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50">{isPending ? 'Recording…' : 'Record verified release'}</button><button type="button" onClick={() => setVerificationEntryId(null)} className="min-h-11 rounded-lg border border-white/20 px-3 text-xs font-bold text-slate-200 focus-visible:ring-2 focus-visible:ring-white">Cancel</button></div>
                                                </form> : <AtlasActionButton icon={CheckCircle2} variant="primary" className="mt-4 w-full" onClick={() => { setVerificationEntryId(group.entry.id); setVerificationMethod('photo_id'); setVerificationNote(''); setVerificationConfirmed(false); }} disabled={pendingAction !== null}>Verify picker</AtlasActionButton>
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
