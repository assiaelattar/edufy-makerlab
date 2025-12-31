import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, Bell, Users, Megaphone, Info, AlertCircle, Calendar } from 'lucide-react';
import { db } from '../../services/firebase';
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, doc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { Announcement } from '../../types';
import { useAuth } from '../../context/AuthContext';

export function AnnouncementsManager() {
    const { user } = useAuth();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [audience, setAudience] = useState<'all' | 'students' | 'instructors'>('all');
    const [type, setType] = useState<'info' | 'alert' | 'promo' | 'event'>('info');

    const fetchAnnouncements = async () => {
        if (!db) return;
        try {
            const q = query(collection(db, 'announcements'), orderBy('date', 'desc'));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
            setAnnouncements(data);
        } catch (error) {
            console.error("Error fetching announcements:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !user) return;

        try {
            await addDoc(collection(db, 'announcements'), {
                title,
                content,
                audience,
                type,
                authorId: user.uid,
                date: serverTimestamp(),
                reads: []
            });
            setIsModalOpen(false);
            resetForm();
            fetchAnnouncements();
        } catch (error) {
            console.error("Error creating announcement:", error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!db || !window.confirm("Are you sure you want to delete this announcement?")) return;
        try {
            await deleteDoc(doc(db, 'announcements', id));
            setAnnouncements(prev => prev.filter(a => a.id !== id));
        } catch (error) {
            console.error("Error deleting announcement:", error);
        }
    };

    const resetForm = () => {
        setTitle('');
        setContent('');
        setAudience('all');
        setType('info');
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'alert': return <AlertCircle className="text-red-500" />;
            case 'promo': return <Megaphone className="text-purple-500" />;
            case 'event': return <Calendar className="text-brand-500" />;
            default: return <Info className="text-blue-500" />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'alert': return 'bg-red-50 border-red-100 text-red-700';
            case 'promo': return 'bg-purple-50 border-purple-100 text-purple-700';
            case 'event': return 'bg-brand-50 border-brand-100 text-brand-700';
            default: return 'bg-blue-50 border-blue-100 text-blue-700';
        }
    };

    if (loading) return <div className="p-12 text-center text-slate-500">Loading announcements...</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-8 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Announcements</h1>
                    <p className="text-slate-500">Manage updates, alerts, and promotions for your community.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition shadow-lg shadow-brand-500/20"
                >
                    <Plus size={20} /> New Announcement
                </button>
            </div>

            <div className="grid gap-4">
                {announcements.map((announcement) => (
                    <motion.div
                        key={announcement.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow group"
                    >
                        <div className={`p-4 rounded-xl ${getTypeColor(announcement.type)}`}>
                            {getTypeIcon(announcement.type)}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">{announcement.title}</h3>
                                    <div className="flex items-center gap-3 text-xs font-medium text-slate-500 mt-1 uppercase tracking-wider">
                                        <span className="flex items-center gap-1"><Users size={12} /> {announcement.audience}</span>
                                        <span>•</span>
                                        <span>{announcement.date ? new Date((announcement.date as any).seconds * 1000).toLocaleDateString() : 'Just now'}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(announcement.id)}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                            <p className="text-slate-600 mt-3 leading-relaxed">{announcement.content}</p>
                        </div>
                    </motion.div>
                ))}

                {announcements.length === 0 && (
                    <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                            <Bell size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">No announcements yet</h3>
                        <p className="text-slate-500">Create your first announcement to reach your students.</p>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-slate-900">New Announcement</h3>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-lg transition">X</button>
                            </div>

                            <form onSubmit={handleCreate} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Title</label>
                                    <input
                                        required
                                        type="text"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 outline-none"
                                        placeholder="e.g. New Robotics Workshop!"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Type</label>
                                        <select
                                            value={type}
                                            onChange={(e: any) => setType(e.target.value)}
                                            className="w-full p-3 border border-slate-200 rounded-xl outline-none"
                                        >
                                            <option value="info">Information</option>
                                            <option value="alert">Alert/Important</option>
                                            <option value="promo">Promotion</option>
                                            <option value="event">Event</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Audience</label>
                                        <select
                                            value={audience}
                                            onChange={(e: any) => setAudience(e.target.value)}
                                            className="w-full p-3 border border-slate-200 rounded-xl outline-none"
                                        >
                                            <option value="all">Everyone</option>
                                            <option value="students">Students Only</option>
                                            <option value="instructors">Instructors Only</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Content</label>
                                    <textarea
                                        required
                                        value={content}
                                        onChange={e => setContent(e.target.value)}
                                        className="w-full p-3 border border-slate-200 rounded-xl h-32 focus:ring-2 focus:ring-brand-500/20 outline-none resize-none"
                                        placeholder="Write your announcement here..."
                                    />
                                </div>

                                <div className="pt-4 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition shadow-lg shadow-brand-500/20"
                                    >
                                        Post Announcement
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
