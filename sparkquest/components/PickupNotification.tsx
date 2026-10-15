import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, PackageCheck, Truck, X } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { isCanonicalPickupEntry, pickupSessionDate, previousPickupDate, selectOpenPickup } from '../domain/pickupLifecycle';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { PickupSchedule, type StudentPickupEntry } from './PickupSchedule';

const OPEN_PICKUP_EVENT = 'sparkquest:open-student-pickup';

export const openStudentPickup = () => window.dispatchEvent(new Event(OPEN_PICKUP_EVENT));

type PickupNotice = { entry: StudentPickupEntry; pickerChanged: boolean };

/** The learner has one live pickup listener, shared by alerts and the detail view. */
export const PickupNotification: React.FC = () => {
    const { user, userProfile } = useAuth();
    const [pickup, setPickup] = useState<StudentPickupEntry | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusError, setStatusError] = useState<string | null>(null);
    const [notice, setNotice] = useState<PickupNotice | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const previous = useRef<{ id: string; status: string; pickerName: string } | null>(null);

    useEffect(() => {
        const open = () => { setIsOpen(true); setNotice(null); };
        window.addEventListener(OPEN_PICKUP_EVENT, open);
        return () => window.removeEventListener(OPEN_PICKUP_EVENT, open);
    }, []);

    useEffect(() => {
        previous.current = null;
        setNotice(null);
        setPickup(null);
        if (!user || userProfile?.role !== 'student' || !userProfile.organizationId || !db) return;
        const studentId = userProfile.studentId || user.uid;
        const organizationId = userProfile.organizationId;
        const today = pickupSessionDate();
        setLoading(true);
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
            const selected = selectOpenPickup(records, organizationId, studentId, today);
            setPickup(selected);
            setLoading(false);
            setStatusError(null);
            if (selected) {
                const prior = previous.current;
                const pickerChanged = Boolean(prior && prior.id === selected.id && prior.pickerName !== (selected.pickerName || ''));
                if (!prior || prior.id !== selected.id || prior.status !== selected.status || pickerChanged) {
                    setNotice({ entry: selected, pickerChanged });
                }
                previous.current = { id: selected.id, status: selected.status, pickerName: selected.pickerName || '' };
            } else {
                previous.current = null;
            }
        }, error => {
            console.warn('Pickup notifications are unavailable:', error.code || error.message);
            setPickup(null);
            setLoading(false);
            setStatusError('Live pickup status is unavailable. Stay with a MakerLab team member.');
        });
    }, [user, userProfile?.organizationId, userProfile?.role, userProfile?.studentId]);

    useEffect(() => {
        if (!notice) return;
        const timer = window.setTimeout(() => setNotice(null), ['arrived', 'cancelled', 'exception'].includes(notice.entry.status) ? 18000 : 12000);
        return () => window.clearTimeout(timer);
    }, [notice]);

    if (userProfile?.role !== 'student') return null;

    const status = notice?.entry.status;
    const copy = notice?.pickerChanged
        ? { title: 'Pickup person changed', detail: 'Open pickup to see who your family selected. Stay with the team.', icon: <AlertTriangle /> }
        : status === 'on_the_way'
            ? { title: 'Pickup is on the way', detail: `${notice?.entry.pickerName || 'Your authorized pickup person'} has started the trip.`, icon: <Truck /> }
            : status === 'arrived'
                ? { title: 'Your pickup is here', detail: 'Stay inside. Pack your things while the team checks the handoff.', icon: <Clock3 /> }
                : status === 'ready'
                    ? { title: 'The team knows you are packed', detail: 'Wait inside for staff to verify the pickup person.', icon: <PackageCheck /> }
                    : status === 'cancelled'
                        ? { title: 'Pickup was cancelled', detail: 'Stay with the MakerLab team until a new pickup is arranged.', icon: <AlertTriangle /> }
                        : status === 'exception'
                            ? { title: 'Wait for a team member', detail: 'There is an extra safety check before anyone leaves.', icon: <AlertTriangle /> }
                            : status === 'released'
                                ? { title: 'Staff cleared your departure', detail: 'Leave only with the pickup person the team verified.', icon: <CheckCircle2 /> }
                                : { title: 'Pickup complete', detail: 'Your authorized pickup person confirmed the handoff.', icon: <CheckCircle2 /> };

    return <>
        <PickupSchedule isOpen={isOpen} onClose={() => setIsOpen(false)} pickupEntry={pickup} pickupStatusLoading={loading} pickupStatusError={statusError} />
        {notice && <aside className={`sq-pickup-toast is-${notice.entry.status}`} role={['arrived', 'cancelled', 'exception'].includes(notice.entry.status) ? 'alert' : 'status'}>
            <button type="button" className="sq-pickup-toast-open" onClick={() => { setIsOpen(true); setNotice(null); }} aria-label={`${copy.title}. Open pickup details`}>
                <span>{copy.icon}</span><span><small>Live pickup update</small><strong>{copy.title}</strong><p>{copy.detail}</p></span>
            </button>
            <button type="button" className="sq-pickup-toast-close" onClick={() => setNotice(null)} aria-label="Dismiss pickup update"><X size={16} /></button>
        </aside>}
    </>;
};
