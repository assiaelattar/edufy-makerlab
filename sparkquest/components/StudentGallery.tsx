import React, { useEffect, useState } from 'react';
import { CalendarDays, Camera, Image as ImageIcon, X } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';

interface Photo {
    id: string;
    url: string;
    caption?: string;
    uploadedAt: any;
    createdAt?: any;
    studentId?: string;
    type?: string;
}

interface StudentGalleryProps {
    isOpen: boolean;
    onClose: () => void;
    previewMode?: boolean;
}

const PREVIEW_PHOTOS: Photo[] = [
    { id: 'gallery-1', url: '/mission-plant-guardian.svg', caption: 'Testing the first moisture sensor circuit.', uploadedAt: new Date('2026-09-26') },
    { id: 'gallery-2', url: '/mission-plant-guardian.svg', caption: 'The enclosure sketch before cutting cardboard.', uploadedAt: new Date('2026-09-24') },
    { id: 'gallery-3', url: '/mission-plant-guardian.svg', caption: 'A working alert light after two wiring fixes.', uploadedAt: new Date('2026-09-22') },
];

const photoDate = (photo: Photo) => {
    const value = photo.createdAt || photo.uploadedAt;
    const date = value?.toDate?.() || (value instanceof Date ? value : new Date(value || Date.now()));
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const StudentGallery: React.FC<StudentGalleryProps> = ({ isOpen, onClose, previewMode = false }) => {
    const { user, userProfile } = useAuth();
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen) return;
        if (previewMode) {
            setPhotos(PREVIEW_PHOTOS);
            setLoading(false);
            setError(null);
            return;
        }
        if (!user) {
            setLoading(false);
            setError('Sign in again to open your evidence wall.');
            return;
        }
        void loadPhotos();
    }, [isOpen, previewMode, user, userProfile?.studentId, userProfile?.organizationId]);

    const loadPhotos = async () => {
        if (!db || !user) return;
        if (!userProfile?.organizationId) {
            setLoading(false);
            setError('Your academy connection is missing. Ask an instructor to repair it before opening the gallery.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const ownerIds = Array.from(new Set([user.uid, userProfile.studentId].filter(Boolean))) as string[];
            const results = await Promise.allSettled(ownerIds.map(ownerId => getDocs(query(
                collection(db, 'gallery_items'),
                where('studentId', '==', ownerId),
                where('organizationId', '==', userProfile.organizationId),
            ))));
            if (results.length > 0 && results.every(result => result.status === 'rejected')) throw results[0].reason;

            const photoMap = new Map<string, Photo>();
            results.forEach(result => {
                if (result.status !== 'fulfilled') return;
                result.value.docs.forEach(photoDoc => {
                    const photo = { id: photoDoc.id, ...photoDoc.data() } as Photo;
                    if (!photo.type || photo.type === 'image') photoMap.set(photo.id, photo);
                });
            });
            const toMillis = (value: any) => value?.toMillis?.() || new Date(value || 0).getTime() || 0;
            setPhotos(Array.from(photoMap.values())
                .sort((a, b) => toMillis(b.createdAt || b.uploadedAt) - toMillis(a.createdAt || a.uploadedAt))
                .slice(0, 50));
        } catch (galleryError) {
            console.error('Error loading gallery:', galleryError);
            setError('Your evidence wall could not load. Check your connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="sq-gallery-overlay" role="dialog" aria-modal="true" aria-labelledby="gallery-title">
            <button className="sq-gallery-backdrop" type="button" onClick={onClose} aria-label="Close evidence wall" />
            <section className="sq-gallery-shell">
                <header className="sq-gallery-header">
                    <div className="sq-gallery-brand">
                        <span aria-hidden="true"><Camera size={24} /></span>
                        <div><p>Sparkbook evidence wall</p><h2 id="gallery-title">Snapshots from the bench.</h2></div>
                    </div>
                    <button type="button" className="sq-gallery-close" onClick={onClose} aria-label="Close evidence wall"><X size={24} /></button>
                </header>

                <div className="sq-gallery-scroll">
                    <section className="sq-gallery-intro">
                        <div><p className="sq-gallery-eyebrow">Build evidence</p><h3>Small moments.<br />Real progress.</h3></div>
                        <p>Photos shared by your instructors become a visual trail of experiments, fixes, and finished work.</p>
                    </section>

                    {loading ? (
                        <div className="sq-gallery-state"><span className="sq-gallery-loader" /><h3>Pinning your latest evidence…</h3></div>
                    ) : error ? (
                        <div className="sq-gallery-state is-error"><ImageIcon size={44} /><h3>Evidence wall unavailable</h3><p>{error}</p><button type="button" onClick={() => void loadPhotos()}>Try again</button></div>
                    ) : photos.length === 0 ? (
                        <div className="sq-gallery-state"><Camera size={48} /><h3>Your first bench photo belongs here.</h3><p>When an instructor shares a build moment, it will appear on this wall.</p></div>
                    ) : (
                        <div className="sq-gallery-grid">
                            {photos.map((photo, index) => (
                                <article key={photo.id} className="sq-gallery-card">
                                    <div className="sq-gallery-photo"><img src={photo.url} alt={photo.caption || 'MakerLab evidence'} loading="lazy" /><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span></div>
                                    <div className="sq-gallery-caption">
                                        <p>{photo.caption || 'A moment from the MakerLab bench.'}</p>
                                        <small><CalendarDays size={14} /> {photoDate(photo)}</small>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};
