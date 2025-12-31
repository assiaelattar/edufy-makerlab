import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Filter, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

interface Photo {
    id: string;
    url: string;
    caption?: string;
    uploadedAt: any;
    studentId?: string;
    type?: string;
}

interface StudentGalleryProps {
    isOpen: boolean;
    onClose: () => void;
}

export const StudentGallery: React.FC<StudentGalleryProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && user) {
            loadPhotos();
        }
    }, [isOpen, user]);

    const loadPhotos = async () => {
        if (!db || !user) return;
        setLoading(true);
        try {
            // Load from gallery_items collection (ERP data)
            // Simplified query: Sort only (avoids Composite Index requirement)
            const photosQuery = query(
                collection(db, 'gallery_items'),
                orderBy('createdAt', 'desc'),
                limit(50)
            );
            const photosSnap = await getDocs(photosQuery);

            // Client-side filtering
            const photosData = photosSnap.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Photo))
                .filter(p => p.type === 'image'); // Filter by type manually

            // Filter to show only this student's photos OR public photos (null/empty studentId)
            const studentPhotos = photosData.filter(p =>
                !p.studentId || p.studentId === user.uid || p.studentId === 'all'
            );

            setPhotos(studentPhotos);
        } catch (err) {
            console.error('Error loading gallery:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-7xl h-[90vh] bg-slate-900/95 backdrop-blur-xl border border-pink-500/30 shadow-[0_0_50px_rgba(236,72,153,0.3)] rounded-3xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-700/50 bg-gradient-to-r from-pink-950/50 to-slate-900 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-pink-950/50 rounded-2xl border border-pink-500/20">
                            <ImageIcon className="w-8 h-8 text-pink-400" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white">Memory Gallery</h2>
                            <p className="text-sm text-slate-400">Your daily life at MakerLab</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Gallery Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : photos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <ImageIcon className="w-24 h-24 text-slate-700 mb-4" />
                            <h3 className="text-2xl font-bold text-slate-400 mb-2">No Photos Yet</h3>
                            <p className="text-slate-500">Your instructors will share photos of your MakerLab adventures here!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {photos.map(photo => (
                                <div
                                    key={photo.id}
                                    className="group aspect-square bg-slate-800/50 rounded-xl border border-slate-700 hover:border-pink-500/50 transition-all overflow-hidden cursor-pointer hover:shadow-[0_0_30px_-5px_rgba(236,72,153,0.3)] relative"
                                >
                                    <img src={photo.url} alt={photo.caption || 'Memory'} className="w-full h-full object-cover" />
                                    {photo.caption && (
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                                            <p className="text-white font-bold text-center text-sm">{photo.caption}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
