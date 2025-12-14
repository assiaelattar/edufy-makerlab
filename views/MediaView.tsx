
import React, { useState } from 'react';
import { Camera, Plus, Upload, Trash2, Image as ImageIcon, X, Database } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { GalleryItem } from '../types';
import { compressImage } from '../utils/helpers';
import { MOCK_GALLERY } from '../utils/mockData';

export const MediaView = () => {
    const { galleryItems, students } = useAppContext();
    const { can, userProfile, user } = useAuth();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [uploadUrl, setUploadUrl] = useState('');
    const [caption, setCaption] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [preview, setPreview] = useState<string | null>(null);
    const [isSeeding, setIsSeeding] = useState(false);
    const [filterStudentId, setFilterStudentId] = useState<string>('All');

    // --- DERIVED PERMISSIONS & FILTERING ---
    const isParent = userProfile?.role === 'parent';
    const isStudent = userProfile?.role === 'student';

    // Find the linked student for Parent/Student
    const linkedStudent = React.useMemo(() => {
        if (!user || (!isParent && !isStudent)) return null;
        if (isStudent) {
            // Find student doc where loginInfo.uid matches user.uid
            // OR if the system uses ID sync, checks s.id.
            // Based on previous files, we check loginInfo.uid
            return students.find(s => s.loginInfo?.uid === user.uid);
        }
        if (isParent) {
            return students.find(s => s.parentLoginInfo?.uid === user.uid);
        }
        return null;
    }, [user, students, isParent, isStudent]);

    // Force filter for restricted users
    const effectiveFilter = (isParent || isStudent) ? (linkedStudent?.id || 'none') : filterStudentId;

    const filteredItems = galleryItems.filter(item => {
        if (effectiveFilter === 'All') return true;
        if (effectiveFilter === 'none') return false; // User has no linked student
        // Show item if it matches studentId OR if it has NO studentId (public gallery)
        // User asked "visible to parents... individual student image uploads".
        // Use stricter privacy? "visible to parents". Implies private.
        // But maybe "Academy Gallery" is public?
        // Let's functionality: 
        // If tagged with studentId X, only X and Admin/Instructor see it.
        // If NOT tagged, everyone sees it.
        if (item.studentId) {
            return item.studentId === effectiveFilter || can('media.manage');
        }
        return true;
    });

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const compressed = await compressImage(file);
            setUploadUrl(compressed);
            setPreview(compressed);
        } catch (err) {
            console.error("Compression failed", err);
            alert("Failed to process image. Please try again.");
        }
    };

    const handleSaveMedia = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !uploadUrl) return;

        const student = students.find(s => s.id === selectedStudentId);

        await addDoc(collection(db, 'gallery_items'), {
            url: uploadUrl,
            caption,
            type: 'image',
            studentId: selectedStudentId || null,
            studentName: student?.name || null,
            createdAt: serverTimestamp()
        });

        setIsModalOpen(false);
        setUploadUrl('');
        setCaption('');
        setSelectedStudentId('');
        setPreview(null);
    };

    const handleDelete = async (id: string) => {
        if (!db || !confirm("Delete this photo?")) return;
        await deleteDoc(doc(db, 'gallery_items', id));
    };

    const handleSeedGallery = async () => {
        if (!db) return;
        setIsSeeding(true);
        try {
            for (const item of MOCK_GALLERY) {
                await addDoc(collection(db, 'gallery_items'), {
                    ...item,
                    createdAt: serverTimestamp()
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSeeding(false);
        }
    };

    return (
        <div className="space-y-8 pb-24 md:pb-8 h-full flex flex-col animate-in fade-in slide-in-from-right-4">
            {/* Header */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold text-[#2D2B6B] flex items-center gap-3"><Camera className="text-cyan-500" size={28} /> {linkedStudent ? `${linkedStudent.name.split(' ')[0]}'s Gallery` : 'Academy Gallery'}</h2>
                    <p className="text-slate-500 text-sm mt-1">
                        {linkedStudent ? "Photos and memories from class." : "Memories and highlights from our makers."}
                    </p>
                </div>
                <div className="flex gap-3">
                    {/* Admin Filter */}
                    {can('media.manage') && (
                        <select
                            value={filterStudentId}
                            onChange={(e) => setFilterStudentId(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-600 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:border-[#2D2B6B]"
                        >
                            <option value="All">All Makers</option>
                            {students.filter(s => s.status === 'active').sort((a, b) => a.name.localeCompare(b.name)).map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    )}

                    {can('media.manage') && (
                        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-400 hover:to-pink-500 text-white px-6 py-3 rounded-xl transition-colors shadow-lg shadow-pink-500/30 text-sm font-bold">
                            <Plus size={18} /> Upload Photo
                        </button>
                    )}
                </div>
            </div>

            {/* Gallery Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 overflow-y-auto pb-4">
                {filteredItems.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-slate-400 flex flex-col items-center bg-white rounded-[2.5rem] border border-slate-100 border-dashed">
                        <ImageIcon size={48} className="mb-4 opacity-20" />
                        <p className="mb-6 font-medium">No photos found.</p>
                        {can('media.manage') && galleryItems.length === 0 && (
                            <button
                                onClick={handleSeedGallery}
                                disabled={isSeeding}
                                className="flex items-center gap-2 px-6 py-3 bg-[#2D2B6B] hover:bg-indigo-800 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-indigo-900/20"
                            >
                                <Database size={16} /> {isSeeding ? 'Loading...' : 'Load Sample Gallery'}
                            </button>
                        )}
                    </div>
                ) : (
                    filteredItems.map(item => (
                        <div key={item.id} className="group relative bg-white rounded-[2rem] overflow-hidden aspect-square border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all shadow-sm">
                            <img src={item.url} alt={item.caption || 'Gallery Item'} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#2D2B6B]/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                {item.studentName && <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider mb-1">{item.studentName}</span>}
                                <p className="text-white text-sm font-bold line-clamp-2">{item.caption}</p>

                                <div className="flex gap-2 mt-2 justify-end">
                                    <a
                                        href={item.url}
                                        download={`gallery-${item.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-white/20 hover:bg-white text-white hover:text-[#2D2B6B] p-2 rounded-full transition-colors backdrop-blur-sm"
                                        title="Download"
                                    >
                                        <Upload className="rotate-180" size={16} />
                                    </a>
                                    {can('media.manage') && (
                                        <button onClick={() => handleDelete(item.id)} className="bg-red-500/80 hover:bg-red-500 text-white p-2 rounded-full transition-colors backdrop-blur-sm">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Upload Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Upload to Gallery">
                <form onSubmit={handleSaveMedia} className="space-y-4">
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center hover:bg-slate-50 transition-colors relative bg-white">
                        {preview ? (
                            <div className="relative w-full h-48">
                                <img src={preview} className="w-full h-full object-contain rounded-lg" />
                                <button type="button" onClick={() => { setPreview(null); setUploadUrl(''); }} className="absolute top-2 right-2 bg-white text-red-500 p-2 rounded-full hover:bg-red-500 hover:text-white shadow-lg"><X size={16} /></button>
                            </div>
                        ) : (
                            <>
                                <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                <Upload className="w-12 h-12 text-slate-300 mb-3" />
                                <p className="text-sm text-slate-500 font-medium">Click to upload or drag & drop</p>
                                <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 10MB</p>
                            </>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Tag Student (Optional)</label>
                        <select
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[#2D2B6B] focus:border-[#2D2B6B] outline-none"
                            value={selectedStudentId}
                            onChange={(e) => setSelectedStudentId(e.target.value)}
                        >
                            <option value="">-- General / Public --</option>
                            {students.filter(s => s.status === 'active').sort((a, b) => a.name.localeCompare(b.name)).map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-slate-400 mt-1">Photos tagged to a student will be visible in their private gallery.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Caption</label>
                        <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[#2D2B6B] focus:border-[#2D2B6B] outline-none" value={caption} onChange={e => setCaption(e.target.value)} placeholder="e.g. Summer Camp 2024" />
                    </div>

                    <button type="submit" disabled={!uploadUrl} className="w-full py-3 bg-[#2D2B6B] hover:bg-indigo-800 text-white rounded-xl font-bold disabled:opacity-50 shadow-lg shadow-indigo-900/20">Add to Gallery</button>
                </form>
            </Modal>
        </div>
    );
};
