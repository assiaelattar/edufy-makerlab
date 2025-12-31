
import React, { useState } from 'react';
import { X, Save, Upload, Link as LinkIcon, Palette, Tag } from 'lucide-react';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface AddPlatformModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AddPlatformModal: React.FC<AddPlatformModalProps> = ({ isOpen, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        url: '',
        description: '',
        category: 'Learning',
        logo: '',
        color: '#6366f1',
        featured: false
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!db) throw new Error("Database not initialized");

            await addDoc(collection(db, 'arcade_platforms'), {
                ...formData,
                status: 'active',
                createdAt: serverTimestamp()
            });

            // Reset and close
            setFormData({
                name: '',
                url: '',
                description: '',
                category: 'Learning',
                logo: '',
                color: '#6366f1',
                featured: false
            });
            onClose();
            alert("Platform added successfully!");
        } catch (error) {
            console.error("Error adding platform:", error);
            alert("Failed to add platform. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-slate-950">
                    <h2 className="text-xl font-bold text-white">Add New Platform</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Platform Name</label>
                        <input
                            required
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Khan Academy"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-indigo-500 outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                <LinkIcon size={14} /> URL
                            </label>
                            <input
                                required
                                type="url"
                                value={formData.url}
                                onChange={e => setFormData({ ...formData, url: e.target.value })}
                                placeholder="https://..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                <Tag size={14} /> Category
                            </label>
                            <select
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-indigo-500 outline-none"
                            >
                                <option>Learning</option>
                                <option>Coding</option>
                                <option>Science</option>
                                <option>Math</option>
                                <option>Creativity</option>
                                <option>Other</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Description</label>
                        <textarea
                            required
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Short description..."
                            rows={3}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-indigo-500 outline-none resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                <Upload size={14} /> Logo URL
                            </label>
                            <input
                                type="url"
                                value={formData.logo}
                                onChange={e => setFormData({ ...formData, logo: e.target.value })}
                                placeholder="https://... (Optional)"
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                <Palette size={14} /> Color
                            </label>
                            <input
                                type="color"
                                value={formData.color}
                                onChange={e => setFormData({ ...formData, color: e.target.value })}
                                className="w-full h-[42px] bg-slate-950 border border-slate-800 rounded-lg p-1 cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <input
                            type="checkbox"
                            id="featured"
                            checked={formData.featured}
                            onChange={e => setFormData({ ...formData, featured: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 max-w-[1.2rem]"
                        />
                        <label htmlFor="featured" className="text-sm text-slate-300 select-none">
                            Mark as Featured Platform
                        </label>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-400 hover:text-white font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Saving...' : (
                                <>
                                    <Save size={18} />
                                    Add Platform
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
