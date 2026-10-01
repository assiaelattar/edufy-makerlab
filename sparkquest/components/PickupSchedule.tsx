import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Loader2, MapPin, QrCode, ShieldCheck, Truck } from 'lucide-react';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { SparkbookDialog } from './SparkbookDialog';

interface PickupScheduleProps {
    isOpen: boolean;
    onClose: () => void;
}

export const PickupSchedule: React.FC<PickupScheduleProps> = ({ isOpen, onClose }) => {
    const { user, userProfile } = useAuth();
    const [pickupTime, setPickupTime] = useState('');
    const [pickupLocation, setPickupLocation] = useState('Main Entrance');
    const [loading, setLoading] = useState(true);
    const [realtimeStatus, setRealtimeStatus] = useState<any>(null);

    useEffect(() => {
        if (!isOpen || !user) return;
        const loadPickupInfo = async () => {
            if (!db) return;
            setLoading(true);
            try {
                const enrollmentsQuery = query(collection(db, 'enrollments'), where('studentId', '==', user.uid));
                const enrollmentsSnap = await getDocs(enrollmentsQuery);
                const enrollments = enrollmentsSnap.docs.map(entry => entry.data());
                const activeEnrollment = enrollments.find(entry => entry.status === 'active') || enrollments[0];
                setPickupTime(activeEnrollment?.pickupTime || activeEnrollment?.schedule?.pickupTime || '3:00 PM');
                setPickupLocation(activeEnrollment?.pickupLocation || 'Main Entrance');
            } catch (error) {
                console.error('Error loading pickup info:', error);
                setPickupTime('3:00 PM');
                setPickupLocation('Main Entrance');
            } finally {
                setLoading(false);
            }
        };
        void loadPickupInfo();
    }, [isOpen, user]);

    useEffect(() => {
        if (!isOpen || !user || !userProfile?.organizationId || !db) return;
        const pickupQuery = query(
            collection(db, 'pickup_queue'),
            where('studentId', '==', userProfile.studentId || user.uid),
            where('organizationId', '==', userProfile.organizationId),
        );
        return onSnapshot(pickupQuery, snapshot => {
            setRealtimeStatus(snapshot.empty ? null : snapshot.docs[0].data());
        }, error => {
            console.warn('Pickup status is unavailable:', error.code || error.message);
            setRealtimeStatus(null);
        });
    }, [isOpen, user, userProfile?.organizationId, userProfile?.studentId]);

    const status = realtimeStatus?.status as string | undefined;
    const statusTitle = status === 'released' ? 'You are cleared to leave' : status === 'arrived' ? 'Your pickup is here' : status === 'on_the_way' ? 'Your pickup is on the way' : 'Your pickup pass';
    const statusCopy = status === 'released'
        ? 'Check out with a MakerLab team member before leaving.'
        : status === 'arrived'
            ? `${realtimeStatus?.pickerName || 'Your parent or guardian'} is waiting at the pickup point.`
            : status === 'on_the_way'
                ? `${realtimeStatus?.pickerName || 'Your parent or guardian'} has started the trip.`
                : 'Keep this pass ready when your workshop is nearly finished.';

    return (
        <SparkbookDialog
            isOpen={isOpen}
            onClose={onClose}
            eyebrow="Field kit · pickup"
            title={statusTitle}
            description={statusCopy}
            icon={status === 'released' ? <CheckCircle2 /> : <Truck />}
            tone={status === 'released' ? 'lime' : 'orange'}
            size="md"
            bodyClassName="sq-pickup-body"
        >
            {loading ? (
                <div className="sq-dialog-state"><Loader2 className="sq-spin" /><strong>Checking today’s pickup plan…</strong></div>
            ) : (
                <>
                    {status && <div className={`sq-pickup-live is-${status}`} role="status"><span><ShieldCheck size={18} /> Live update</span><strong>{statusTitle}</strong><p>{statusCopy}</p></div>}
                    <div className="sq-pickup-facts">
                        <article><span><Clock /></span><div><small>Scheduled time</small><strong>{pickupTime}</strong></div></article>
                        <article><span><MapPin /></span><div><small>Meeting point</small><strong>{pickupLocation}</strong></div></article>
                    </div>
                    <section className="sq-pickup-pass" aria-label="Pickup check-out pass">
                        <div><p>MakerLab checkout</p><h3>Show this pass to your parent or guardian.</h3><span>Staff will confirm the pickup before you leave.</span></div>
                        <div className="sq-pickup-qr" aria-label="Pickup QR placeholder"><QrCode /></div>
                    </section>
                    <ol className="sq-pickup-steps">
                        <li><span>1</span>Pack your project and personal items.</li>
                        <li><span>2</span>Wait at the meeting point shown above.</li>
                        <li><span>3</span>Check out with a MakerLab team member.</li>
                    </ol>
                </>
            )}
        </SparkbookDialog>
    );
};
