import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Video, HelpCircle, Check, X, Sparkles, Loader2 } from 'lucide-react';
import { db } from '../../services/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { generateQuizFromVideo } from '../../services/geminiQuizGen';

interface Question {
    q: string;
    options: string[];
    correct: number;
}

interface ArcadeContent {
    id: string;
    title: string;
    category: string;
    thumbnail: string;
    videoUrl: string;
    xpReward: number;
    questions: Question[];
}

export const ArcadeContentManager: React.FC = () => {
    const [contents, setContents] = useState<ArcadeContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [generatingId, setGeneratingId] = useState<string | null>(null);

    // Form State
    const [editItem, setEditItem] = useState<Partial<ArcadeContent>>({
        title: '',
        category: 'General',
        thumbnail: '',
        videoUrl: '',
        xpReward: 10,
        questions: []
    });

    useEffect(() => {
        fetchContent();
    }, []);

    const fetchContent = async () => {
        try {
            if (!db) return;
            const querySnapshot = await getDocs(collection(db, 'arcade_content'));
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ArcadeContent));
            setContents(data);
        } catch (error) {
            console.error("Error fetching content:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!editItem.title || !editItem.videoUrl) {
            alert("Title and Video URL are required");
            return;
        }

        try {
            if (!db) return;
            const collectionRef = collection(db, 'arcade_content');

            // Basic validation for questions
            const validQuestions = editItem.questions?.filter(q => q.q && q.options.length >= 2) || [];

            const payload = {
                title: editItem.title,
                category: editItem.category || 'General',
                thumbnail: editItem.thumbnail || `https://img.youtube.com/vi/${extractYoutubeId(editItem.videoUrl)}/maxresdefault.jpg`,
                videoUrl: convertToEmbedUrl(editItem.videoUrl || ''),
                xpReward: Number(editItem.xpReward) || 10,
                questions: validQuestions
            };

            if (editItem.id) {
                await updateDoc(doc(db, 'arcade_content', editItem.id), payload);
            } else {
                await addDoc(collectionRef, payload);
            }

            setIsEditing(false);
            setEditItem({});
            fetchContent();
        } catch (error) {
            console.error("Error saving content:", error);
            alert("Failed to save");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this content?")) return;
        try {
            if (!db) return;
            await deleteDoc(doc(db, 'arcade_content', id));
            fetchContent();
        } catch (error) {
            console.error("Error deleting content:", error);
        }
    };

    const handleAutoGenerate = async (content: ArcadeContent) => {
        if (!confirm(`Generate a quiz for "${content.title}" using AI? This will overwrite existing questions.`)) return;

        setGeneratingId(content.id);
        try {
            const questions = await generateQuizFromVideo(content.title, "Educational video about " + content.category);

            if (questions && questions.length > 0) {
                if (!db) return;
                await updateDoc(doc(db, 'arcade_content', content.id), {
                    questions: questions
                });

                // Update local state
                setContents(prev => prev.map(c =>
                    c.id === content.id ? { ...c, questions } : c
                ));
                alert(`Success! Generated ${questions.length} questions.`);
            } else {
                alert("AI could not generate questions. Please ensure the title is descriptive.");
            }
        } catch (error) {
            console.error("Generation failed:", error);
            alert("Failed to generate quiz.");
        } finally {
            setGeneratingId(null);
        }
    };

    // Helpers
    const extractYoutubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const convertToEmbedUrl = (url: string) => {
        const id = extractYoutubeId(url);
        return id ? `https://www.youtube.com/embed/${id}` : url;
    };

    const addQuestion = () => {
        setEditItem(prev => ({
            ...prev,
            questions: [...(prev.questions || []), { q: '', options: ['', '', ''], correct: 0 }]
        }));
    };

    const updateQuestion = (index: number, field: string, value: any) => {
        const newQuestions = [...(editItem.questions || [])];
        if (field === 'q') newQuestions[index].q = value;
        if (field === 'correct') newQuestions[index].correct = value;
        setEditItem(prev => ({ ...prev, questions: newQuestions }));
    };

    const updateOption = (qIndex: number, oIndex: number, value: string) => {
        const newQuestions = [...(editItem.questions || [])];
        newQuestions[qIndex].options[oIndex] = value;
        setEditItem(prev => ({ ...prev, questions: newQuestions }));
    };

    // Playlist Import State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [youtubeApiKey, setYoutubeApiKey] = useState('');
    const [importUrl, setImportUrl] = useState('');
    const [xpMultiplier, setXpMultiplier] = useState(10);
    const [isImporting, setIsImporting] = useState(false);
    const [importStatus, setImportStatus] = useState('');

    // Load API key from Firestore on mount
    useEffect(() => {
        const loadApiKey = async () => {
            if (!db) return;
            try {
                const settingsDoc = await getDoc(doc(db, 'settings', 'youtube'));
                if (settingsDoc.exists()) {
                    setYoutubeApiKey(settingsDoc.data().apiKey || '');
                }
            } catch (e) {
                console.error('Error loading YouTube API key:', e);
            }
        };
        loadApiKey();
    }, []);

    // Import Helper (Lazy Load)
    const handleImportPlaylist = async () => {
        if (!importUrl || !youtubeApiKey) {
            alert("Please provide both Playlist URL and API Key");
            return;
        }

        // Save API Key to Firestore
        try {
            if (db) {
                await setDoc(doc(db, 'settings', 'youtube'), {
                    apiKey: youtubeApiKey,
                    updatedAt: new Date().toISOString()
                });
                console.log('✅ YouTube API Key saved to Firestore');
            }
        } catch (e) {
            console.error('Error saving API key:', e);
        }

        setIsImporting(true);
        setImportStatus('Initializing...');

        try {
            // Didynamically import to avoid circular dependency issues if any
            const { fetchYouTubePlaylist, extractPlaylistId, parseDuration } = await import('../../services/youtube');

            const playlistId = extractPlaylistId(importUrl);
            if (!playlistId) throw new Error("Invalid Playlist URL");

            setImportStatus('Fetching Playlist Data...');
            const { playlistTitle, videos } = await fetchYouTubePlaylist(playlistId, youtubeApiKey);

            setImportStatus(`Found ${videos.length} videos. Importing...`);

            if (!db) throw new Error("Database not initialized");
            const collectionRef = collection(db, 'arcade_content');
            let count = 0;

            for (const video of videos) {
                // Calculate XP based on duration
                const durationMinutes = parseDuration(video.duration);
                const xpReward = Math.ceil(durationMinutes * xpMultiplier) || 10;

                // Create Content Payload
                const payload = {
                    title: video.title,
                    category: playlistTitle || 'General', // Use Playlist Title as Category
                    thumbnail: video.thumbnail,
                    videoUrl: `https://www.youtube.com/embed/${video.id}`,
                    xpReward: xpReward,
                    questions: [], // No questions by default
                    importedFromPlaylist: playlistId,
                    createdAt: new Date().toISOString()
                };

                await addDoc(collectionRef, payload);
                count++;
                setImportStatus(`Imported ${count}/${videos.length}: ${video.title}`);
            }

            setImportStatus('Done!');
            setIsImportModalOpen(false);
            setImportUrl('');
            fetchContent();
            alert(`Successfully imported ${count} videos from "${playlistTitle}"!`);

        } catch (error: any) {
            console.error("Import Failed:", error);
            alert(`Import Failed: ${error.message}`);
        } finally {
            setIsImporting(false);
            setImportStatus('');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Video Library</h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold transition-colors border border-slate-600"
                    >
                        <Video size={18} /> Import Playlist
                    </button>
                    <button
                        onClick={() => { setEditItem({}); setIsEditing(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-lg text-white font-bold hover:bg-indigo-500 transition-colors"
                    >
                        <Plus size={18} /> Add New
                    </button>
                </div>
            </div>

            {/* Playlist Import Modal */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white">Import YouTube Playlist</h3>
                            <button onClick={() => setIsImportModalOpen(false)} disabled={isImporting} className="text-slate-400 hover:text-white"><X /></button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs uppercase text-slate-500 font-bold mb-1">YouTube Data API Key</label>
                                <input
                                    type="password"
                                    value={youtubeApiKey}
                                    onChange={e => setYoutubeApiKey(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm"
                                    placeholder="AIzaSy..."
                                />
                                <p className="text-[10px] text-slate-500 mt-1">Required to fetch playlist details.</p>
                            </div>

                            <div>
                                <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Playlist URL</label>
                                <input
                                    value={importUrl}
                                    onChange={e => setImportUrl(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm"
                                    placeholder="https://www.youtube.com/playlist?list=..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs uppercase text-slate-500 font-bold mb-1">Auto-XP (Per Minute)</label>
                                <input
                                    type="number"
                                    value={xpMultiplier}
                                    onChange={e => setXpMultiplier(parseInt(e.target.value))}
                                    className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm"
                                />
                                <p className="text-[10px] text-slate-500 mt-1">Example: 10 mins x 10 = 100 XP Reward.</p>
                            </div>

                            {isImporting && (
                                <div className="p-3 bg-indigo-900/20 border border-indigo-500/30 rounded text-indigo-300 text-xs font-mono">
                                    {importStatus}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => setIsImportModalOpen(false)}
                                disabled={isImporting}
                                className="px-4 py-2 text-slate-400 hover:text-white text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleImportPlaylist}
                                disabled={isImporting || !importUrl || !youtubeApiKey}
                                className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isImporting ? 'Importing...' : 'Start Import'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isEditing ? (
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 animate-in slide-in-from-right">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-lg font-bold text-white">
                            {editItem.id ? 'Edit Content' : 'New Content'}
                        </h4>
                        <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white"><X /></button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-slate-400 text-xs uppercase mb-1">Title</label>
                            <input
                                value={editItem.title || ''}
                                onChange={e => setEditItem({ ...editItem, title: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
                                placeholder="e.g. Intro to Python"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs uppercase mb-1">Category</label>
                            <input
                                value={editItem.category || ''}
                                onChange={e => setEditItem({ ...editItem, category: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
                                placeholder="e.g. Coding"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-slate-400 text-xs uppercase mb-1">YouTube URL</label>
                            <div className="flex gap-2">
                                <input
                                    value={editItem.videoUrl || ''}
                                    onChange={e => setEditItem({ ...editItem, videoUrl: e.target.value })}
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
                                    placeholder="https://www.youtube.com/watch?v=..."
                                />
                                <div className="w-24">
                                    <input
                                        type="number"
                                        value={editItem.xpReward || 10}
                                        onChange={e => setEditItem({ ...editItem, xpReward: parseInt(e.target.value) })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none text-center"
                                        placeholder="XP"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 mb-6">
                        <div className="flex justify-between items-center">
                            <label className="block text-slate-400 text-xs uppercase">Quiz Questions</label>
                            <button onClick={addQuestion} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-bold">
                                <Plus size={14} /> Add Question
                            </button>
                        </div>

                        {editItem.questions?.map((q, qIdx) => (
                            <div key={qIdx} className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
                                <input
                                    value={q.q}
                                    onChange={e => updateQuestion(qIdx, 'q', e.target.value)}
                                    className="w-full bg-transparent border-b border-slate-700 mb-3 px-2 py-1 text-white font-medium focus:border-indigo-500 outline-none"
                                    placeholder={`Question ${qIdx + 1}`}
                                />
                                <div className="space-y-2">
                                    {q.options.map((opt, oIdx) => (
                                        <div key={oIdx} className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name={`correct-${qIdx}`}
                                                checked={q.correct === oIdx}
                                                onChange={() => updateQuestion(qIdx, 'correct', oIdx)}
                                                className="accent-indigo-500"
                                            />
                                            <input
                                                value={opt}
                                                onChange={e => updateOption(qIdx, oIdx, e.target.value)}
                                                className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-300 focus:border-indigo-500 outline-none"
                                                placeholder={`Option ${oIdx + 1}`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleSave}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                        <Save size={18} /> Save Content
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto pr-2">
                    {loading ? (
                        <div className="text-center text-slate-500">Loading library...</div>
                    ) : contents.length === 0 ? (
                        <div className="text-center p-8 border-2 border-dashed border-slate-700 rounded-xl">
                            <Video className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                            <p className="text-slate-500">No content found. Add your first video.</p>
                        </div>
                    ) : (
                        contents.map(content => (
                            <div key={content.id} className="flex gap-4 p-4 bg-slate-800 rounded-xl border border-slate-700 group hover:border-indigo-500/50 transition-colors">
                                <img src={content.thumbnail} alt={content.title} className="w-32 h-20 object-cover rounded-lg bg-black/50" />
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-white">{content.title}</h4>
                                            <span className="text-xs text-indigo-400 font-bold uppercase">{content.category}</span>
                                            <span className="text-xs text-slate-500 ml-2">• {content.xpReward} XP</span>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleAutoGenerate(content)}
                                                disabled={generatingId === content.id}
                                                className="p-2 bg-purple-600/10 hover:bg-purple-600 text-purple-400 hover:text-white rounded-lg transition-colors border border-purple-600/30"
                                                title="Auto-Generate Quiz"
                                            >
                                                {generatingId === content.id ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                            </button>
                                            <button
                                                onClick={() => { setEditItem(content); setIsEditing(true); }}
                                                className="p-2 bg-slate-700 hover:bg-white text-white hover:text-black rounded-lg transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(content.id)}
                                                className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                                        <HelpCircle size={12} /> {content.questions?.length || 0} Questions
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};
