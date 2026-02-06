import React, { useState } from 'react';
import { Archive, Plus, ExternalLink, Trash2, Search, Pencil, Link as LinkIcon, FolderOpen } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { ArchiveLink } from '../types';

export const ArchiveView = () => {
    const { archiveLinks = [] } = useAppContext();
    const { userProfile } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingLink, setEditingLink] = useState<ArchiveLink | null>(null);
    const [linkForm, setLinkForm] = useState({
        title: '',
        url: '',
        category: 'other' as 'gemini_gems' | 'websites' | 'sheets' | 'documents' | 'other',
        description: ''
    });

    const categories = [
        { id: 'all', label: 'All Links', icon: FolderOpen },
        { id: 'gemini_gems', label: 'Gemini Gems', icon: LinkIcon },
        { id: 'websites', label: 'Websites', icon: ExternalLink },
        { id: 'sheets', label: 'Sheets', icon: LinkIcon },
        { id: 'documents', label: 'Documents', icon: LinkIcon },
        { id: 'other', label: 'Other', icon: LinkIcon }
    ];

    const handleSaveLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !userProfile) return;

        try {
            if (editingLink) {
                await updateDoc(doc(db, 'archive_links', editingLink.id), {
                    ...linkForm,
                    updatedAt: serverTimestamp()
                });
            } else {
                await addDoc(collection(db, 'archive_links'), {
                    ...linkForm,
                    createdBy: userProfile.uid || userProfile.email,
                    createdAt: serverTimestamp()
                });
            }
            setIsAddModalOpen(false);
            setEditingLink(null);
            setLinkForm({ title: '', url: '', category: 'other', description: '' });
        } catch (err) {
            console.error('Error saving link:', err);
        }
    };

    const handleDeleteLink = async (id: string) => {
        if (!db || !confirm('Delete this link?')) return;
        await deleteDoc(doc(db, 'archive_links', id));
    };

    const handleEditLink = (link: ArchiveLink) => {
        setEditingLink(link);
        setLinkForm({
            title: link.title,
            url: link.url,
            category: link.category,
            description: link.description || ''
        });
        setIsAddModalOpen(true);
    };

    const filteredLinks = archiveLinks.filter(link => {
        const matchesSearch = searchTerm === '' ||
            link.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            link.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || link.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-6 pb-24 md:pb-8 h-full flex flex-col animate-in fade-in slide-in-from-right-4">
            {/* Header */}
            <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Archive className="w-6 h-6 text-purple-500" /> Archive & Resources
                    </h2>
                    <p className="text-slate-500 text-sm">Store and organize useful links and resources</p>
                </div>
                <button
                    onClick={() => {
                        setEditingLink(null);
                        setLinkForm({ title: '', url: '', category: 'other', description: '' });
                        setIsAddModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-lg shadow-purple-900/20"
                >
                    <Plus size={18} /> Add Link
                </button>
            </div>

            {/* Filters */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search links..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:border-purple-500 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Category Filter */}
                    <div className="flex gap-2 flex-wrap">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${selectedCategory === cat.id
                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20'
                                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-purple-500/50'
                                    }`}
                            >
                                <cat.icon size={14} />
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Links Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLinks.length === 0 ? (
                    <div className="col-span-full bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
                        <Archive className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                        <p className="text-slate-500">No links found. Click "Add Link" to get started.</p>
                    </div>
                ) : (
                    filteredLinks.map(link => {
                        const categoryInfo = categories.find(c => c.id === link.category);
                        const CategoryIcon = categoryInfo?.icon || LinkIcon;

                        return (
                            <div
                                key={link.id}
                                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-purple-500/50 transition-all group"
                            >
                                <div className="p-4">
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <div className="p-2 bg-purple-950/30 rounded-lg border border-purple-900/30 shrink-0">
                                                <CategoryIcon size={16} className="text-purple-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-white text-sm truncate">{link.title}</h3>
                                                <span className="text-[10px] text-slate-500 uppercase font-bold">{categoryInfo?.label}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEditLink(link)}
                                                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                                                title="Edit"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteLink(link.id)}
                                                className="p-1.5 bg-slate-800 hover:bg-red-950/30 rounded text-slate-400 hover:text-red-400 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {link.description && (
                                        <p className="text-xs text-slate-400 mb-3 line-clamp-2">{link.description}</p>
                                    )}

                                    <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors truncate"
                                    >
                                        <ExternalLink size={12} />
                                        <span className="truncate">{link.url}</span>
                                    </a>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Add/Edit Modal */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={editingLink ? 'Edit Link' : 'Add New Link'}>
                <form onSubmit={handleSaveLink} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Title</label>
                        <input
                            type="text"
                            required
                            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-purple-500 outline-none"
                            value={linkForm.title}
                            onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })}
                            placeholder="e.g., Gemini AI Playground"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">URL</label>
                        <input
                            type="url"
                            required
                            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-purple-500 outline-none"
                            value={linkForm.url}
                            onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                            placeholder="https://..."
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
                        <select
                            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-purple-500 outline-none"
                            value={linkForm.category}
                            onChange={(e) => setLinkForm({ ...linkForm, category: e.target.value as any })}
                        >
                            <option value="gemini_gems">Gemini Gems</option>
                            <option value="websites">Websites</option>
                            <option value="sheets">Sheets</option>
                            <option value="documents">Documents</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Description (Optional)</label>
                        <textarea
                            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-purple-500 outline-none h-20 resize-none"
                            value={linkForm.description}
                            onChange={(e) => setLinkForm({ ...linkForm, description: e.target.value })}
                            placeholder="Brief description of this resource..."
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold mt-2 transition-colors shadow-lg shadow-purple-900/20"
                    >
                        {editingLink ? 'Update Link' : 'Add Link'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};
