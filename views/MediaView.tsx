
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
    const { galleryItems } = useAppContext();
    const { can } = useAuth();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [uploadUrl, setUploadUrl] = useState('');
    const [caption, setCaption] = useState('');
    const [preview, setPreview] = useState<string | null>(null);
    const [isSeeding, setIsSeeding] = useState(false);

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

        await addDoc(collection(db, 'gallery_items'), {
            url: uploadUrl,
            caption,
            type: 'image', // simplified for now
            createdAt: serverTimestamp()
        });

        setIsModalOpen(false);
        setUploadUrl('');
        setCaption('');
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
                    <h2 className="text-2xl font-bold text-[#2D2B6B] flex items-center gap-3"><Camera className="text-cyan-500" size={28} /> Academy Gallery</h2>
                    <p className="text-slate-500 text-sm mt-1">Memories and highlights from our makers.</p>
                </div>
                {can('media.manage') && (
                    <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-400 hover:to-pink-500 text-white px-6 py-3 rounded-xl transition-colors shadow-lg shadow-pink-500/30 text-sm font-bold">
                        <Plus size={18} /> Upload Photo
                    </button>
                )}
            </div>

            {/* Gallery Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 overflow-y-auto pb-4">
                {galleryItems.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-slate-400 flex flex-col items-center bg-white rounded-[2.5rem] border border-slate-100 border-dashed">
                        <ImageIcon size={48} className="mb-4 opacity-20" />
                        <p className="mb-6 font-medium">No photos uploaded yet.</p>
                        {can('media.manage') && (
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
                    galleryItems.map(item => (
                        <div key={item.id} className="group relative bg-white rounded-[2rem] overflow-hidden aspect-square border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all shadow-sm">
                            <img src={item.url} alt={item.caption || 'Gallery Item'} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#2D2B6B]/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                <p className="text-white text-sm font-bold line-clamp-2">{item.caption}</p>
                            </div>
                            {can('media.manage') && (
                                <button onClick={() => handleDelete(item.id)} className="absolute top-3 right-3 bg-white/90 text-red-500 p-2 rounded-full hover:bg-red-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100 shadow-lg">
                                    <Trash2 size={16} />
                                </button>
                            )}
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
                        <label className="block text-xs font-bold text-slate-500 mb-1">Caption</label>
                        <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[#2D2B6B] focus:border-[#2D2B6B] outline-none" value={caption} onChange={e => setCaption(e.target.value)} placeholder="e.g. Summer Camp 2024" />
                    </div>

                    <button type="submit" disabled={!uploadUrl} className="w-full py-3 bg-[#2D2B6B] hover:bg-indigo-800 text-white rounded-xl font-bold disabled:opacity-50 shadow-lg shadow-indigo-900/20">Add to Gallery</button>
                </form>
            </Modal>
        </div>
    );
};
