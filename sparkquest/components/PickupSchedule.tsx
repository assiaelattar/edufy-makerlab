import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Loader2, MapPin, PackageCheck, ShieldCheck, Truck, UserCheck } from 'lucide-react';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import {
    isCanonicalPickupEntry,
    pickupSessionDate,
    previousPickupDate,
    selectOpenPickup,
    type PickupStatus,
} from '../domain/pickupLifecycle';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { markStudentReady } from '../services/studentPickupCommands';
import { PickupPrivateNotes } from './PickupPrivateNotes';
import { SparkbookDialog } from './SparkbookDialog';

interface PickupScheduleProps {
    isOpen: boolean;
    onClose: () => void;
}

interface StudentPickupEntry {
    id: string;
    organizationId: string;
    studentId: string;
    pickerName?: string;
    sessionDate?: string;
    sessionId?: string;
    status: PickupStatus | 'waiting';
}

const progressSteps = [
    { status: 'on_the_way', label: 'On the way', icon: Truck },
    { status: 'arrived', label: 'At MakerLab', icon: MapPin },
    { status: 'ready', label: 'Ready signal (optional)', icon: PackageCheck },
    { status: 'released', label: 'Staff release', icon: ShieldCheck },
    { status: 'confirmed', label: 'Pickup complete', icon: CheckCircle2 },
] as const;

const statusPosition = (status?: string) => progressSteps.findIndex(step => step.status === status);

export const PickupSchedule: React.FC<PickupScheduleProps> = ({ isOpen, onClose }) => {
    const { user, userProfile } = useAuth();
    const studentId = userProfile?.studentId || user?.uid || '';
    const organizationId = userProfile?.organizationId || '';
    const [pickupTime, setPickupTime] = useState('');
    const [pickupLocation, setPickupLocation] = useState('Main Entrance');
    const [loadingPlan, setLoadingPlan] = useState(true);
    const [loadingStatus, setLoadingStatus] = useState(true);
    const [readError, setReadError] = useState<string | null>(null);
    const [pickup, setPickup] = useState<StudentPickupEntry | null>(null);
    const [readyPending, setReadyPending] = useState(false);
    const [readyError, setReadyError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || !studentId || !organizationId || !db) return;
        let active = true;
        const loadPickupInfo = async () => {
            setLoadingPlan(true);
            try {
                const enrollmentsQuery = query(
                    collection(db, 'enrollments'),
                    where('studentId', '==', studentId),
                    where('organizationId', '==', organizationId),
                );
                const enrollmentsSnap = await getDocs(enrollmentsQuery);
                const enrollments = enrollmentsSnap.docs.map(entry => entry.data());
                const activeEnrollment = enrollments.find(entry => entry.status === 'active') || enrollments[0];
                if (!active) return;
                setPickupTime(activeEnrollment?.pickupTime || activeEnrollment?.schedule?.pickupTime || '3:00 PM');
                setPickupLocation(activeEnrollment?.pickupLocation || 'Main Entrance');
            } catch (error) {
                console.error('Error loading pickup info:', error);
                if (active) {
                    setPickupTime('3:00 PM');
                    setPickupLocation('Main Entrance');
                }
            } finally {
                if (active) setLoadingPlan(false);
            }
        };
        void loadPickupInfo();
        return () => { active = false; };
    }, [isOpen, organizationId, studentId]);

    useEffect(() => {
        if (!isOpen || !studentId || !organizationId || !db) return;
        const today = pickupSessionDate();
        setLoadingStatus(true);
        setReadError(null);
        const pickupQuery = query(
            collection(db, 'pickup_queue'),
            where('organizationId', '==', organizationId),
            where('studentId', '==', studentId),
            where('sessionDate', 'in', [today, previousPickupDate(today)]),
        );
        return onSnapshot(pickupQuery, snapshot => {
            const records = snapshot.docs
                .map(entry => ({ id: entry.id, ...entry.data() } as StudentPickupEntry))
                .filter(isCanonicalPickupEntry);
            setPickup(selectOpenPickup(records, organizationId, studentId, today));
            setLoadingStatus(false);
            setReadError(null);
        }, error => {
            console.warn('Pickup status is unavailable:', error.code || error.message);
            setPickup(null);
            setLoadingStatus(false);
            setReadError('Live pickup status is unavailable. Stay with a MakerLab team member.');
        });
    }, [isOpen, organizationId, studentId]);

    const presentation = useMemo(() => {
        switch (pickup?.status) {
            case 'on_the_way': return { title: 'Your pickup is on the way', copy: `${pickup.pickerName || 'Your authorized pickup person'} has started the trip.`, tone: 'orange' as const };
            case 'arrived': return { title: 'Your pickup is at MakerLab', copy: `${pickup.pickerName || 'Your authorized pickup person'} is waiting. You may tell the team when you are packed, but staff can complete pickup even if you forget.`, tone: 'orange' as const };
            case 'ready': return { title: 'You are ready to leave', copy: 'The team and your family can see that you packed your project and personal items.', tone: 'lime' as const };
            case 'released': return { title: 'Staff cleared your departure', copy: `A MakerLab team member verified ${pickup.pickerName || 'your authorized pickup person'}. Leave only with that person.`, tone: 'lime' as const };
            case 'confirmed': return { title: 'Pickup complete', copy: 'Your authorized pickup person confirmed the handoff.', tone: 'lime' as const };
            case 'cancelled': return { title: 'Pickup was cancelled', copy: 'Stay with the MakerLab team until a new pickup is arranged.', tone: 'orange' as const };
            case 'exception': return { title: 'Wait for a team member', copy: 'The pickup needs an additional safety check before anyone leaves.', tone: 'orange' as const };
            default: return { title: 'No active pickup yet', copy: 'When your family starts pickup, the live handoff will appear here.', tone: 'orange' as const };
        }
    }, [pickup]);

    const position = statusPosition(pickup?.status);
    const waitingForTeam = pickup?.status === 'arrived' || pickup?.status === 'ready' || pickup?.status === 'exception';

    const confirmReady = async () => {
        if (!db || !user?.uid || !pickup || pickup.status !== 'arrived') return;
        setReadyPending(true);
        setReadyError(null);
        try {
            await markStudentReady(db, organizationId, studentId, pickup.id, user.uid);
        } catch (error) {
            setReadyError(error instanceof Error ? error.message : 'Your ready status could not be saved. Ask a team member for help.');
        } finally {
            setReadyPending(false);
        }
    };

    return (
        <SparkbookDialog
            isOpen={isOpen}
            onClose={onClose}
            eyebrow="Field kit · pickup"
            title={presentation.title}
            description={presentation.copy}
            icon={pickup?.status === 'released' || pickup?.status === 'confirmed' ? <CheckCircle2 /> : <Truck />}
            tone={presentation.tone}
            size="md"
            bodyClassName="sq-pickup-body"
        >
            {loadingPlan || loadingStatus ? (
                <div className="sq-dialog-state"><Loader2 className="sq-spin" /><strong>Checking today’s pickup plan…</strong></div>
            ) : (
                <>
                    {readError && <div className="sq-pickup-live is-exception" role="alert"><span><AlertCircle size={18} /> Connection problem</span><strong>Stay with the MakerLab team</strong><p>{readError}</p></div>}
                    {!readError && <div className={`sq-pickup-live is-${pickup?.status || 'waiting'}`} role="status">
                        <span>{pickup ? <><ShieldCheck size={18} /> Live pickup</> : <><Clock size={18} /> Waiting for family</>}</span>
                        <strong>{presentation.title}</strong>
                        <p>{presentation.copy}</p>
                    </div>}

                    <div className="sq-pickup-facts">
                        <article><span><Clock /></span><div><small>Scheduled time</small><strong>{pickupTime}</strong></div></article>
                        <article><span><MapPin /></span><div><small>Meeting point</small><strong>{pickupLocation}</strong></div></article>
                        {pickup?.pickerName && <article className="sq-pickup-picker"><span><UserCheck /></span><div><small>Authorized pickup</small><strong>{pickup.pickerName}</strong></div></article>}
                    </div>

                    {pickup && !['cancelled', 'exception'].includes(pickup.status) && <ol className="sq-student-pickup-progress" aria-label="Live pickup progress">
                        {progressSteps.map((step, index) => {
                            const Icon = step.icon;
                            return <li key={step.status} className={position >= index ? 'is-complete' : ''}><span><Icon size={15} /></span><small>{step.label}</small></li>;
                        })}
                    </ol>}

                    {pickup?.status === 'arrived' && <section className="sq-pickup-ready-action">
                        <PackageCheck size={25} />
                        <div><strong>Optional: tell the team when you are packed.</strong><p>Check your project, tools, jacket and personal items. Pickup will not be blocked if you forget this button.</p></div>
                        <button type="button" onClick={() => void confirmReady()} disabled={readyPending}>{readyPending ? <Loader2 className="sq-spin" size={17} /> : <CheckCircle2 size={17} />} I packed everything — I’m ready</button>
                    </section>}
                    {readyError && <div className="sq-pickup-live is-exception" role="alert"><span><AlertCircle size={18} /> Ready status not saved</span><p>{readyError}</p></div>}

                    <section className={`sq-pickup-guidance${waitingForTeam ? ' is-attention' : ''}`}>
                        <ShieldCheck size={24} />
                        <div><strong>{pickup?.status === 'released' ? 'Leave only with the verified person.' : 'A team member completes every handoff.'}</strong><p>Never leave the academy because of a message or screen alone. Wait for a MakerLab team member to call you and complete the physical handoff.</p></div>
                    </section>

                    <ol className="sq-pickup-steps">
                        <li><span>1</span>Pack your project and personal items.</li>
                        <li><span>2</span>If you want, tap “I’m ready” after your space is tidy.</li>
                        <li><span>3</span>Wait inside at the meeting point shown above.</li>
                        <li><span>4</span>Leave only after a MakerLab team member verifies the pickup person.</li>
                    </ol>

                    {pickup && user?.uid && <PickupPrivateNotes
                        entryId={pickup.id}
                        organizationId={organizationId}
                        studentId={studentId}
                        currentUid={user.uid}
                        role="student"
                        closed={['confirmed', 'cancelled', 'exception'].includes(pickup.status)}
                    />}
                </>
            )}
        </SparkbookDialog>
    );
};
