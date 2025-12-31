import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Gamepad2, AlertTriangle, X } from 'lucide-react';
import { db } from '../../services/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';

interface ArcadeGame {
    id: string;
    title: string;
    url: string;
    thumbnail: string;
    costPerMinute: number;
    description: string;
}

export const ArcadeGameManager: React.FC = () => {
    const [games, setGames] = useState<ArcadeGame[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);

    // Form State
    const [editItem, setEditItem] = useState<Partial<ArcadeGame>>({
        title: '',
        url: '',
        thumbnail: '',
        costPerMinute: 1,
        description: ''
    });

    useEffect(() => {
        fetchGames();
    }, []);

    const fetchGames = async () => {
        try {
            if (!db) return;
            const querySnapshot = await getDocs(collection(db, 'arcade_games'));
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ArcadeGame));
            setGames(data);
        } catch (error) {
            console.error("Error fetching games:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!editItem.title || !editItem.url) {
            alert("Title and Game URL are required");
            return;
        }

        try {
            if (!db) return;
            const collectionRef = collection(db, 'arcade_games');
            const payload = {
                title: editItem.title,
                url: editItem.url,
                thumbnail: editItem.thumbnail || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&q=80',
                costPerMinute: Number(editItem.costPerMinute) || 1,
                description: editItem.description || 'Fun game to play.'
            };

            if (editItem.id) {
                await updateDoc(doc(db, 'arcade_games', editItem.id), payload);
            } else {
                await addDoc(collectionRef, payload);
            }

            setIsEditing(false);
            setEditItem({});
            fetchGames();
        } catch (error) {
            console.error("Error saving game:", error);
            alert("Failed to save");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this game?")) return;
        try {
            if (!db) return;
            await deleteDoc(doc(db, 'arcade_games', id));
            fetchGames();
        } catch (error) {
            console.error("Error deleting game:", error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Arcade Games</h3>
                <button
                    onClick={() => { setEditItem({}); setIsEditing(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg text-white font-bold hover:bg-purple-500 transition-colors"
                >
                    <Plus size={18} /> Add Game
                </button>
            </div>

            {isEditing ? (
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 animate-in slide-in-from-right">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-lg font-bold text-white">
                            {editItem.id ? 'Edit Game' : 'New Game'}
                        </h4>
                        <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white"><X /></button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="col-span-2">
                            <label className="block text-slate-400 text-xs uppercase mb-1">Title</label>
                            <input
                                value={editItem.title || ''}
                                onChange={e => setEditItem({ ...editItem, title: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                                placeholder="e.g. Roblox"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-slate-400 text-xs uppercase mb-1">Game URL (https://...)</label>
                            <input
                                value={editItem.url || ''}
                                onChange={e => setEditItem({ ...editItem, url: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                                placeholder="https://www.roblox.com"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs uppercase mb-1">Cost Per Minute (Credits)</label>
                            <input
                                type="number"
                                value={editItem.costPerMinute || 1}
                                onChange={e => setEditItem({ ...editItem, costPerMinute: parseInt(e.target.value) })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs uppercase mb-1">Thumbnail URL</label>
                            <input
                                value={editItem.thumbnail || ''}
                                onChange={e => setEditItem({ ...editItem, thumbnail: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                                placeholder="https://..."
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-slate-400 text-xs uppercase mb-1">Description</label>
                            <textarea
                                value={editItem.description || ''}
                                onChange={e => setEditItem({ ...editItem, description: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none h-24"
                                placeholder="Short description..."
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                        <Save size={18} /> Save Game
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto pr-2">
                    {loading ? (
                        <div className="text-center text-slate-500">Loading games...</div>
                    ) : games.length === 0 ? (
                        <div className="text-center p-8 border-2 border-dashed border-slate-700 rounded-xl">
                            <Gamepad2 className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                            <p className="text-slate-500">No games found. Add your first game.</p>
                        </div>
                    ) : (
                        games.map(game => (
                            <div key={game.id} className="flex gap-4 p-4 bg-slate-800 rounded-xl border border-slate-700 group hover:border-purple-500/50 transition-colors">
                                <img src={game.thumbnail} alt={game.title} className="w-20 h-20 object-cover rounded-lg bg-black/50" />
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-white">{game.title}</h4>
                                            <span className="text-xs text-yellow-400 font-bold uppercase">{game.costPerMinute} Credits/min</span>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => { setEditItem(game); setIsEditing(true); }}
                                                className="p-2 bg-slate-700 hover:bg-white text-white hover:text-black rounded-lg transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(game.id)}
                                                className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">{game.description}</p>
                                    <p className="text-xs text-slate-600 font-mono mt-1 truncate max-w-[300px]">{game.url}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};
