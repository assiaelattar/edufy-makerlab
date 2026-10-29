import React, { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
    Car,
    CheckCircle2,
    ChevronRight,
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
import { isAuthorizedPicker, isCanonicalPickupEntry, pickupSessionDate } from '../modules/pickup/domain/pickupLifecycle';
import { projectDailyPickupRoster, selectPresentPickupRoster, isPickupLobbyActive } from '../modules/pickup/domain/dailyPickupRoster';
import {
    AtlasActionButton,
    AtlasCommandHeader,
    AtlasEmptyState,
    AtlasSectionHeader,
    AtlasSignalCard,
    AtlasToolbar
} from '../components/atlas/AtlasSurface';
import './family-journey/education-family-journey-v1.css';
import './pickup/education-pickup-playful.css';
import { ParentO11Y } from '../sparkquest/components/ParentO11Y';
import { EducationButton, EducationField, EducationNotice, EducationState } from '../components/education-ui/EducationPrimitives';

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

const getRosterStatusLabel = (status?: PickupEntry['status']): string => status ? getStatusLabel(status) : 'Scheduled today';
const getLobbyStatusLabel = (status?: PickupEntry['status']): string => {
    if (status === 'released') return 'With parent · confirm receipt';
    if (status === 'confirmed') return 'Pickup complete';
    if (status === 'arrived' || status === 'ready') return 'At the gate';
    if (status === 'on_the_way' || status === 'waiting') return 'Pickup on the way';
    if (status === 'exception') return 'Team is checking';
    return 'At workshop';
};

const getRosterStatusClass = (status?: PickupEntry['status']): string => {
    if (status === 'confirmed') return 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200';
    if (status === 'released') return 'border-teal-300/25 bg-teal-300/10 text-teal-200';
    if (status === 'arrived' || status === 'ready') return 'border-amber-300/25 bg-amber-300/10 text-amber-200';
    if (status === 'on_the_way' || status === 'waiting') return 'border-sky-300/25 bg-sky-300/10 text-sky-200';
    if (status === 'cancelled' || status === 'exception') return 'border-rose-300/25 bg-rose-300/10 text-rose-200';
    return 'border-white/10 bg-white/[0.04] text-slate-300';
};

export const PickupView = () => {
    const showEducationFamilyJourneyV1 = new URLSearchParams(window.location.search).get('ui') !== 'atlas-legacy';
    const { pickupQueue, students, enrollments, programs, attendanceRecords, attendanceLoading, attendanceError, viewParams } = useAppContext();
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
    const lobbyOpenButtonRef = useRef<HTMLButtonElement>(null);
    const lobbyExitButtonRef = useRef<HTMLButtonElement>(null);
    const mobileFiltersRef = useRef<HTMLDetailsElement>(null);
    const verificationOpenerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    useEffect(() => {
        const timer = window.setInterval(() => setDisplayTime(new Date()), 30_000);
        return () => clearInterval(timer);
    }, []);
    useEffect(() => {
        const open = () => { if (!pendingAction && !verificationEntryId) setIsDisplayMode(true); };
        window.addEventListener('edufy:open-pickup-lobby', open);
        return () => window.removeEventListener('edufy:open-pickup-lobby', open);
    }, [pendingAction, verificationEntryId]);
    useEffect(() => { if (viewParams?.openLobby) setIsDisplayMode(true); }, [viewParams]);
    const todaySessionDate = pickupSessionDate();
    const todayWeekday = format(new Date(), 'EEEE');

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

    const todayEntryByStudent = useMemo(() => {
        const latest = new Map<string, PickupEntry>();
        tenantQueue
            .filter(entry => entry.sessionDate === todaySessionDate && isCanonicalPickupEntry(entry))
            .forEach(entry => {
                const current = latest.get(entry.studentId);
                if (!current || getLifecycleMillis(entry) >= getLifecycleMillis(current)) latest.set(entry.studentId, entry);
            });
        return latest;
    }, [tenantQueue, todaySessionDate]);

    const dailyRoster = useMemo(() => organizationId ? projectDailyPickupRoster({
        organizationId,
        sessionDate: todaySessionDate,
        weekday: todayWeekday,
        enrollments,
        students,
        programs,
    }) : [], [enrollments, organizationId, programs, students, todaySessionDate, todayWeekday]);

    const dailyRosterRows = useMemo(() => dailyRoster.map(item => ({
        ...item,
        entry: todayEntryByStudent.get(item.studentId),
    })), [dailyRoster, todayEntryByStudent]);
    const lobbyRows = useMemo(() => selectPresentPickupRoster(
        dailyRoster, attendanceRecords, organizationId || '', todaySessionDate
    ).map(item => ({ ...item, entry: todayEntryByStudent.get(item.studentId) }))
        .filter(item => isPickupLobbyActive(item.entry?.status))
        .sort((a, b) => {
            const rank = (status?: PickupEntry['status']) => status === 'arrived' || status === 'ready' ? 0
                : status === 'released' ? 1 : status === 'on_the_way' || status === 'waiting' ? 2
                    : !status ? 3 : 4;
            return rank(a.entry?.status) - rank(b.entry?.status) || a.studentName.localeCompare(b.studentName);
        }), [attendanceRecords, dailyRoster, organizationId, todayEntryByStudent, todaySessionDate]);
    const lobbyAtGate = lobbyRows.filter(row => row.entry?.status === 'arrived' || row.entry?.status === 'ready').length;
    const lobbyAwaitingReceipt = lobbyRows.filter(row => row.entry?.status === 'released').length;

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
    const handoffGroups = [...readyGroups, ...arrivedGroups];

    useEffect(() => {
        if (!isDisplayMode) return;
        lobbyExitButtonRef.current?.focus();
        const timer = window.setInterval(() => setDisplayTime(new Date()), 30_000);
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsDisplayMode(false);
            if (event.key === 'Tab') {
                event.preventDefault();
                lobbyExitButtonRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.clearInterval(timer);
            window.removeEventListener('keydown', handleKeyDown);
            lobbyOpenButtonRef.current?.focus();
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
            if (currentEntry.status === 'waiting') {
                setFeedback({ tone: 'warning', message: `${student.name} has an older waiting pickup record. Keep the learner with staff and reconcile that record before starting a new handoff.` });
            } else if (currentEntry.status === 'on_the_way') {
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
        if (!['arrived', 'ready'].includes(group.entry.status)) {
            await showAlert('Parent has not arrived', `${group.entry.studentName} can be released only after the authorized pickup person is physically at the gate.`, 'warning');
            return;
        }

        const picker = group.entry.pickerName || '';
        const student = students.find(item => item.id === group.entry.studentId && item.organizationId === organizationId);
        if (!student || !isAuthorizedPicker(picker, student.parentName || '', student.authorizedPickups)) {
            await showAlert('Picker authorization changed', 'The listed picker is no longer authorized. Keep the learner with staff and escalate this pickup.', 'warning');
            return;
        }
        if (!verificationConfirmed || verificationNote.trim().length > 500) return;
        setPendingAction(`release:${group.entry.studentId}`);
        setFeedback(null);
        try {
            await advancePickup(db!, group.entry.id, group.entry.status as 'arrived' | 'ready', 'released', userProfile.uid, {
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
        { id: 'all', label: 'All pickups', count: queueGroups.length },
        { id: 'arrived', label: 'At gate', count: pickupSignals.arrived },
        { id: 'ready', label: 'Learner ready', count: pickupSignals.ready },
        { id: 'incoming', label: 'Incoming', count: pickupSignals.onTheWay },
        { id: 'released', label: 'Released', count: pickupSignals.released }
    ];
    const renderFilterButton = (option: typeof filterOptions[number]) => <button
        key={option.id}
        data-queue-filter={option.id}
        type="button"
        onClick={() => { setQueueFilter(option.id); if (mobileFiltersRef.current) mobileFiltersRef.current.open = false; }}
        aria-pressed={queueFilter === option.id}
    >{option.label} <span className="ml-1 tabular-nums opacity-70">{option.count}</span></button>;

    const renderHandoffCard = (group: QueueGroup) => {
        const isPending = pendingAction === `release:${group.entry.studentId}`;
        const learnerReady = group.entry.status === 'ready';
        return (
            <article key={group.entry.id} data-status={group.entry.status} className="edu-pickup-v1__handoff rounded-lg border border-amber-300/25 bg-slate-900 p-4">
                <div className="edu-pickup-playful__learner flex items-start justify-between gap-3">
                    {showEducationFamilyJourneyV1 && <span className="edu-pickup-playful__avatar" aria-hidden="true">{group.entry.studentName.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('')}</span>}
                    <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span data-status={group.entry.status} className={`edu-pickup-v1__status rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${learnerReady ? 'bg-amber-300 text-slate-950' : 'border border-teal-300/25 bg-teal-300/10 text-teal-200'}`}>{learnerReady ? 'Learner ready' : 'Parent at gate'}</span>
                            <span className="font-mono text-xs text-amber-200">{formatTime(group.entry)}</span>
                            {group.duplicateCount > 0 && <span className="text-[10px] font-bold text-slate-500">{group.duplicateCount + 1} records linked</span>}
                        </div>
                        <h3 className="truncate text-xl font-black text-white">{group.entry.studentName}</h3>
                        <p className="mt-1 flex items-center gap-2 truncate text-sm text-slate-400"><UserCheck size={14} className="shrink-0" />{group.entry.pickerName || group.entry.parentName || 'Pickup contact not listed'}</p>
                    </div>
                </div>
                {isGatekeeper ? (
                    verificationEntryId === group.entry.id ? <form aria-label={`Verify pickup for ${group.entry.studentName}`} className="mt-4 space-y-3 rounded-xl border border-teal-300/30 bg-slate-950/60 p-3" onSubmit={event => { event.preventDefault(); void releaseStudent(group); }}>
                        <p className="text-xs font-bold text-teal-200">Match the person in front of you to the authorized picker: {group.entry.pickerName}</p>
                        <EducationField label="How was their identity checked?"><select autoFocus id={`pickup-method-${group.entry.id}`} value={verificationMethod} onChange={event => setVerificationMethod(event.target.value as 'photo_id' | 'known_person')}><option value="photo_id">Photo ID</option><option value="known_person">Known person</option></select></EducationField>
                        <EducationField label="Verification note (optional)" hint="Only if useful. Do not enter an ID number."><textarea id={`pickup-note-${group.entry.id}`} value={verificationNote} onChange={event => setVerificationNote(event.target.value)} maxLength={500} rows={2} placeholder="Record what you checked" /></EducationField>
                        <label className="flex items-start gap-2 text-xs leading-5 text-slate-200"><input type="checkbox" checked={verificationConfirmed} onChange={event => setVerificationConfirmed(event.target.checked)} required className="mt-1 accent-teal-400" /><span>I verified this person against the authorized picker list and am handing over {group.entry.studentName}.</span></label>
                        <div className="edu-pickup__form-actions"><EducationButton type="submit" variant="primary" disabled={pendingAction !== null || verificationNote.trim().length > 500 || !verificationConfirmed}>{isPending ? 'Recording…' : 'Record verified release'}</EducationButton><EducationButton onClick={() => { setVerificationEntryId(null); requestAnimationFrame(() => verificationOpenerRefs.current[group.entry.id]?.focus()); }}>Cancel</EducationButton></div>
                    </form> : <button ref={node => { verificationOpenerRefs.current[group.entry.id] = node; }} type="button" aria-label={`Verify picker and release ${group.entry.studentName}`} className="edu-ds-button edu-pickup-pulse__verify mt-4 w-full" data-edu-variant="primary" onClick={() => { setVerificationEntryId(group.entry.id); setVerificationMethod('photo_id'); setVerificationNote(''); setVerificationConfirmed(false); }} disabled={pendingAction !== null}><CheckCircle2 size={16} /> Verify picker and release</button>
                ) : <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-500">Authorized pickup staff must complete release.</div>}
            </article>
        );
    };

    if (!organizationId) {
        return (
            <div className={`pb-24 md:pb-8 ${showEducationFamilyJourneyV1 ? 'edu-v1 edu-pickup-pulse edu-pickup-playful' : ''}`} data-edu-system={showEducationFamilyJourneyV1 ? '1' : undefined} data-testid={showEducationFamilyJourneyV1 ? 'education-pickup-v1' : undefined}>
                {showEducationFamilyJourneyV1 ? <EducationState kind="restricted" title="Select an organization" description="Pickup operations are tenant-scoped. Select an organization before opening the live queue." /> : <AtlasEmptyState
                    title="Select an organization"
                    description="Pickup operations are tenant-scoped. Select an organization before opening the live queue."
                    icon={ShieldCheck}
                />}
            </div>
        );
    }

    return (
        <div className={`space-y-5 pb-24 md:pb-8 ${showEducationFamilyJourneyV1 ? 'edu-v1 edu-pickup-pulse edu-pickup-playful' : ''}`} data-edu-system={showEducationFamilyJourneyV1 ? '1' : undefined} data-testid={showEducationFamilyJourneyV1 ? 'education-pickup-v1' : undefined}>
            {!isDisplayMode && (
                <>
                    {showEducationFamilyJourneyV1 ? <section className="edu-pickup-v1__command" aria-labelledby="pickup-command-title">
                        <div className="edu-pickup-playful__welcome"><span className="edu-pickup-v1__eyebrow"><Car size={17} /> School day / Pickup</span><h1 id="pickup-command-title">Home time,<br />handled with care.</h1><p>{format(new Date(), 'EEEE, d MMMM')} · {dailyRosterRows.length} learners scheduled today</p><button ref={lobbyOpenButtonRef} type="button" className="edu-ds-button" onClick={() => setIsDisplayMode(true)}><Monitor size={17} /> Open lobby display</button></div>
                        <div className="edu-pickup-playful__guide"><span className="edu-pickup-playful__bubble">One safe handoff<br />at a time.</span><ParentO11Y cue={0} mood="welcome" /><span className="edu-pickup-playful__guide-label"><ShieldCheck size={16} /> In good hands</span></div>
                    </section> : <AtlasCommandHeader
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
                    />}

                    {legacyActive.length > 0 && <section className="edu-pickup-v1__legacy rounded-xl border border-amber-300/35 bg-amber-300/10 p-4 text-amber-50" aria-label="Legacy pickup reconciliation" role="alert">
                        <h2 className="text-sm font-black">{legacyActive.length} older pickup {legacyActive.length === 1 ? 'record needs' : 'records need'} reconciliation</h2>
                        <p className="mt-1 text-xs leading-5 text-amber-100">These records have no validated dated session. Keep the learner with authorized staff, verify the real handoff independently, and reconcile the historical record through the academy’s reviewed process. Do not create a replacement while an older pickup remains open.</p>
                        <ul className="mt-3 space-y-1 text-xs">{legacyActive.map(entry => <li key={entry.id} className="flex flex-wrap gap-x-2"><strong>{entry.studentName}</strong><span>{getStatusLabel(entry.status)}</span><code className="break-all text-amber-200">{entry.id}</code></li>)}</ul>
                    </section>}

                    {showEducationFamilyJourneyV1 ? <div className="edu-pickup-pulse__brief" aria-label="Pickup summary">
                        <div data-tone="orange"><span className="edu-pickup-playful__stat-icon"><UserCheck size={23} /></span><span><strong>{pickupSignals.arrived + pickupSignals.ready}</strong><small>At the gate</small></span></div>
                        <div data-tone="blue"><span className="edu-pickup-playful__stat-icon"><Car size={23} /></span><span><strong>{pickupSignals.onTheWay}</strong><small>On the way</small></span></div>
                        <div data-tone="green"><span className="edu-pickup-playful__stat-icon"><CheckCircle2 size={23} /></span><span><strong>{pickupSignals.released}</strong><small>Released · awaiting receipt</small></span></div>
                    </div> : <>
                    <div className="edu-pickup-v1__signals grid grid-cols-2 gap-3 xl:grid-cols-5">
                        <AtlasSignalCard label="At the gate" value={pickupSignals.arrived} detail="Verify and release" icon={UserCheck} tone={pickupSignals.arrived > 0 ? 'amber' : 'slate'} onClick={() => setQueueFilter('arrived')} />
                        <AtlasSignalCard label="Incoming" value={pickupSignals.onTheWay} detail="Approaching the gate" icon={MapPin} tone="blue" onClick={() => setQueueFilter('incoming')} />
                        <AtlasSignalCard label="Scheduled today" value={dailyRosterRows.length} detail="From workshop enrollments" icon={Clock} tone="teal" />
                        <AtlasSignalCard label="Ready signal" value={pickupSignals.ready} detail="Optional learner update" icon={ShieldCheck} tone={pickupSignals.ready > 0 ? 'amber' : 'slate'} onClick={() => setQueueFilter('ready')} />
                        <AtlasSignalCard label="Released" value={pickupSignals.released} detail="Awaiting parent confirmation" icon={CheckCircle2} tone="emerald" onClick={() => setQueueFilter('released')} />
                    </div>

                    </>}

                    {showEducationFamilyJourneyV1 && <div className="edu-pickup-playful__queue-heading"><h2>Pickup desk</h2><a href="#pickup-daily-roster">Today’s learners <ChevronRight size={16} /></a></div>}
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
                                                        <button type="button" onClick={() => void addToQueue(student.id, selectedPicker)} disabled={pendingAction !== null || (!isActive && pickerOptions.length === 0)} className="min-h-10 rounded-lg bg-teal-400 px-3 text-xs font-black text-slate-950 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50">{currentEntry?.status === 'waiting' ? 'Staff review' : isActive ? 'Review arrival' : 'Add arrival'}</button>
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
                            <div className="edu-pickup__desktop-filters">{filterOptions.map(renderFilterButton)}</div>
                            <details ref={mobileFiltersRef} className="edu-pickup__mobile-filters"><summary>Filter pickups <span>{filterOptions.find(option => option.id === queueFilter)?.label} · {filteredGroups.length}</span></summary><div>{filterOptions.map(renderFilterButton)}</div></details>
                        </AtlasToolbar>
                    </div>

                    {feedback && (
                        <EducationNotice status={feedback.tone === 'success' ? 'success' : 'warning'}>
                            <span>{feedback.message}</span>
                            <button type="button" onClick={() => setFeedback(null)} className="edu-pickup__dismiss" aria-label="Dismiss message">
                                <X size={16} />
                            </button>
                        </EducationNotice>
                    )}


                </>
            )}

            {isDisplayMode ? (
                <div className="edu-pickup-pulse__lobby fixed inset-0 z-[100] flex flex-col bg-slate-950 p-4 sm:p-6" role="dialog" aria-modal="true" aria-label="Pickup lobby display">
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
                            <button ref={lobbyExitButtonRef} type="button" className="edu-ds-button" onClick={() => setIsDisplayMode(false)}><LogOut size={16} /> Exit lobby</button>
                        </div>
                    </header>

                    <main className="min-h-0 flex-1 pt-4">
                        <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-teal-300/20 bg-slate-900/70">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-300/20 bg-teal-400/[0.07] px-4 py-3">
                                <div><h2 className="text-sm font-black uppercase tracking-wider text-teal-100">Present today</h2><p className="mt-1 text-xs text-slate-400">Live pickup stages for learners marked present or late.</p></div>
                                <div className="flex flex-wrap gap-2 text-xs font-bold text-teal-100"><span className="rounded-full bg-teal-300/15 px-3 py-1">{lobbyRows.length} active</span><span className="rounded-full bg-amber-300/15 px-3 py-1 text-amber-100">{lobbyAtGate} at gate</span><span className="rounded-full bg-blue-300/15 px-3 py-1 text-blue-100">{lobbyAwaitingReceipt} awaiting receipt</span></div>
                            </div>
                            <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-1 gap-3 overflow-y-auto p-4 md:grid-cols-2 xl:grid-cols-3">
                                {lobbyRows.map(row => (
                                    <article key={row.studentId} className="rounded-xl border border-white/10 bg-slate-950 p-4" data-pickup-stage={row.entry?.status || 'workshop'}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0"><h3 className="truncate text-xl font-black text-white">{row.studentName}</h3><p className="mt-1 truncate text-xs text-slate-400">{row.slots.map(slot => [slot.time, slot.programName, slot.groupName].filter(Boolean).join(' · ')).join(' / ')}</p></div>
                                            <span data-status={row.entry?.status || 'scheduled'} className={`edu-pickup-v1__status shrink-0 rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${getRosterStatusClass(row.entry?.status)}`}>{getLobbyStatusLabel(row.entry?.status)}</span>
                                        </div>
                                        {row.entry && <p className="mt-3 text-right font-mono text-xs text-slate-400">Updated {formatTime(row.entry)}</p>}
                                    </article>
                                ))}
                                {lobbyRows.length === 0 && <div className="col-span-full flex min-h-48 items-center justify-center text-center text-sm font-bold text-slate-400">{attendanceLoading ? 'Loading today’s attendance…' : attendanceError ? 'Attendance is unavailable. Ask the team to check the desk.' : 'No learners have been marked present yet.'}</div>}
                            </div>
                        </section>
                    </main>
                </div>
            ) : filteredGroups.length === 0 ? (
                showEducationFamilyJourneyV1 ? <EducationState title={queueGroups.length === 0 ? 'Pickup queue is clear' : 'No pickups match this view'} description={queueGroups.length === 0 ? 'Incoming parent notifications and staff-added arrivals will appear here.' : 'Choose another status filter to continue scanning the live queue.'}>{queueGroups.length > 0 && <EducationButton onClick={() => setQueueFilter('all')}>Show all pickups</EducationButton>}</EducationState> : <AtlasEmptyState
                    title={queueGroups.length === 0 ? 'Pickup queue is clear' : 'No pickups match this view'}
                    description={queueGroups.length === 0
                        ? 'Incoming parent notifications and staff-added arrivals will appear here.'
                        : 'Choose another status filter to continue scanning the live queue.'}
                    icon={Clock}
                    action={queueGroups.length > 0 ? <AtlasActionButton onClick={() => setQueueFilter('all')}>Show all pickups</AtlasActionButton> : undefined}
                />
            ) : (
                <div id="pickup-live-queue" className="edu-pickup-v1__live space-y-7">
                    {handoffGroups.length > 0 && (
                        <section className="space-y-4">
                            <AtlasSectionHeader
                                title="At the gate"
                                description="Verify the authorized person before release. Learner-ready status is optional."
                                icon={ShieldCheck}
                                meta={<span className="edu-pickup-playful__attention rounded-md bg-amber-300/10 px-2 py-0.5 text-[10px] font-bold text-amber-200">{handoffGroups.length} action required</span>}
                            />
                            <div className="edu-pickup-pulse__register grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {handoffGroups.map(renderHandoffCard)}
                            </div>
                        </section>
                    )}

                    {incomingGroups.length > 0 && (
                        <section className="space-y-4">
                            <AtlasSectionHeader title="Incoming" description="Parents approaching or waiting to confirm physical arrival." icon={Car} />
                            <div className="edu-pickup-pulse__incoming-list grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                                {incomingGroups.map(group => {
                                    const isPending = pendingAction === `arrive:${group.entry.studentId}`;
                                    return (
                                        <article key={group.entry.id} className="edu-pickup-v1__incoming rounded-lg border border-sky-300/20 bg-slate-900/70 p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="text-[10px] font-black uppercase tracking-wider text-sky-200">{getStatusLabel(group.entry.status)}</div>
                                                    <h3 className="mt-1 truncate text-base font-black text-white">{group.entry.studentName}</h3>
                                                    <p className="mt-1 truncate text-xs text-slate-500">{group.entry.pickerName || group.entry.parentName || 'Pickup contact'}</p>
                                                    <p className="mt-2 font-mono text-[11px] text-slate-500">Notified {formatTime(group.entry)}</p>
                                                </div>
                                                {isGatekeeper && group.entry.status === 'on_the_way' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => markStudentArrived(group)}
                                                        disabled={pendingAction !== null}
                                                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-teal-300/25 bg-teal-400/10 text-teal-200 transition-colors hover:bg-teal-400/20 disabled:opacity-50"
                                                        title="Confirm physical arrival"
                                                        aria-label={`Mark ${group.entry.studentName} as arrived`}
                                                    >
                                                        {isPending ? <Loader2 size={17} className="animate-spin" /> : <MapPin size={17} />}{showEducationFamilyJourneyV1 && <span className="edu-pickup-pulse__arrival-label">Mark arrived</span>}
                                                    </button>
                                                )}
                                                {group.entry.status === 'waiting' && <span className="text-[11px] text-slate-500">Older record · staff review</span>}
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
                                    <article key={group.entry.id} className="edu-pickup-v1__released flex min-w-0 items-center gap-3 rounded-lg border border-white/10 bg-slate-900/45 p-3">
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
            {!isDisplayMode && (
                    <section id="pickup-daily-roster" className="space-y-4" aria-label="Today’s workshop pickup list">
                        <AtlasSectionHeader
                            title="Today’s workshop pickup list"
                            description="Scheduled learners remain on this list throughout pickup."
                            icon={Clock}
                            meta={<span className="rounded-md bg-teal-300/10 px-2 py-0.5 text-[10px] font-bold text-teal-200">{dailyRosterRows.length} scheduled</span>}
                        />
                        {dailyRosterRows.length > 0 ? <div className="edu-pickup-pulse__daily-list grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {dailyRosterRows.map(row => {
                                const pickerOptions = Array.from(new Set([row.student.parentName, ...(row.student.authorizedPickups || [])].filter(Boolean) as string[]));
                                const selectedPicker = pickerSelections[row.studentId] || pickerOptions[0] || '';
                                const canRecordArrival = !row.entry || row.entry.status === 'on_the_way';
                                const hasPickupAccount = Boolean(row.student.parentLoginInfo?.uid);
                                return <article key={row.studentId} className="edu-pickup-v1__roster-card rounded-xl border border-white/10 bg-slate-900/70 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h3 className="truncate text-base font-black text-white">{row.studentName}</h3>
                                            <p className="mt-1 text-xs leading-5 text-slate-400">{row.slots.map(slot => [slot.time, slot.programName, slot.groupName].filter(Boolean).join(' · ')).join(' / ')}</p>
                                        </div>
                                        <span data-status={row.entry?.status || 'scheduled'} className={`edu-pickup-v1__status shrink-0 rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${getRosterStatusClass(row.entry?.status)}`}>{getRosterStatusLabel(row.entry?.status)}</span>
                                    </div>
                                    {row.entry?.pickerName && <p className="mt-3 truncate text-xs text-slate-400">Pickup person: <strong className="text-slate-200">{row.entry.pickerName}</strong></p>}
                                    {isGatekeeper && canRecordArrival && <div className="mt-3 flex items-center gap-2">
                                        {pickerOptions.length > 0 ? <select aria-label={`Authorized picker for ${row.studentName}`} value={selectedPicker} onChange={event => setPickerSelections(current => ({ ...current, [row.studentId]: event.target.value }))} className="min-h-10 min-w-0 flex-1 rounded-lg border border-white/20 bg-slate-950 px-2 text-xs text-white focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-300/30">{pickerOptions.map(name => <option key={name} value={name}>{name}</option>)}</select> : <span className="flex-1 text-xs text-amber-200">No authorized picker listed.</span>}
                                        <button type="button" onClick={() => void addToQueue(row.studentId, selectedPicker)} disabled={pendingAction !== null || pickerOptions.length === 0 || !hasPickupAccount} className="min-h-10 rounded-lg bg-teal-400 px-3 text-xs font-black text-slate-950 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50">{row.entry ? 'Mark arrived' : 'Parent is here'}</button>
                                    </div>}
                                    {isGatekeeper && canRecordArrival && !hasPickupAccount && <p className="mt-2 text-[11px] text-amber-200">Link the family account before staff can start a pickup record. The learner stays visible on today’s list.</p>}
                                </article>;
                            })}
                        </div> : <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-8 text-center text-sm text-slate-500">No active workshop enrollment is scheduled for {todayWeekday}.</div>}
                    </section>
            )}
            {showEducationFamilyJourneyV1 && !isDisplayMode && <p className="edu-pickup-playful__credit">011Y by <a href="https://rive.app/marketplace/26076-48718-011y/" target="_blank" rel="noopener noreferrer">Pat Grivet</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a></p>}
        </div>
    );
};
