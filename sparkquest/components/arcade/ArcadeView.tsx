import React, { useState, useEffect } from 'react';
import { Gamepad2, GraduationCap, X, Play, Clock, Search, Star, AlignLeft, Check, Trophy, BookOpen, Rocket, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSession } from '../../context/SessionContext';
import { VideoQuiz } from './VideoQuiz';
import { GameCard } from './GameCard';
import { PlatformBrowser } from './PlatformBrowser';
import { AddPlatformModal } from './AddPlatformModal';
import { db } from '../../services/firebase';
import { collection, onSnapshot, getDocs, setDoc, doc, serverTimestamp } from 'firebase/firestore';

interface ArcadeViewProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ArcadeView: React.FC<ArcadeViewProps> = ({ isOpen, onClose }) => {
    const { user, userProfile, updateCredits } = useAuth();
    const { startSession } = useSession();
    const [mode, setMode] = useState<'EARN' | 'PLAY' | 'LEARN'>('EARN');
    const [searchTerm, setSearchTerm] = useState('');

    // Real credits from profile
    const credits = userProfile?.arcadeCredits || 0;

    // Data
    const [earnContent, setEarnContent] = useState<any[]>([]);
    const [playGames, setPlayGames] = useState<any[]>([]);
    const [platforms, setPlatforms] = useState<any[]>([]);
    const [completedContent, setCompletedContent] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    // Active
    const [selectedVideo, setSelectedVideo] = useState<any>(null);
    const [selectedGame, setSelectedGame] = useState<any>(null);
    const [selectedPlatform, setSelectedPlatform] = useState<any>(null);
    const [showAddPlatform, setShowAddPlatform] = useState(false);

    // Derived: Categories
    const categories = Array.from(new Set(earnContent.map(c => c.category || 'General')));

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);

        if (!db) { setLoading(false); return; }

        const contentUnsub = onSnapshot(collection(db, 'arcade_content'), (snap) => {
            setEarnContent(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const gamesUnsub = onSnapshot(collection(db, 'arcade_games'), (snap) => {
            setPlayGames(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });

        // Load Completed Progress
        const fetchProgress = async () => {
            if (user?.uid) {
                if (!db) return;
                const progRef = collection(db, `users/${user.uid}/arcade_progress`);
                const snap = await getDocs(progRef);
                setCompletedContent(snap.docs.map(d => d.id));
            }
        };
        fetchProgress();

        return () => {
            contentUnsub();
            gamesUnsub();
        };
    }, [isOpen, user?.uid]);

    // Load platforms
    useEffect(() => {
        if (!isOpen || !db) return;
        const platformsUnsub = onSnapshot(collection(db, 'arcade_platforms'), (snap) => {
            setPlatforms(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((p: any) => p.status === 'active'));
        });
        return () => platformsUnsub();
    }, [isOpen]);

    const handleEarnComplete = async (reward: number) => {
        if (!selectedVideo || !user?.uid) return;
        if (!db) return;

        // Optimistic update for UI
        setCompletedContent(prev => [...prev, selectedVideo.id]);

        try {
            // Persist
            await setDoc(doc(db, `users/${user.uid}/arcade_progress`, selectedVideo.id), {
                completedAt: serverTimestamp(),
                xpEarned: reward,
                contentId: selectedVideo.id
            });

            await updateCredits(reward);
            setSelectedVideo(null);
            alert(`🎉 You earned ${reward} Credits!`);
        } catch (e) {
            console.error("Error saving progress", e);
        }
    };

    const handlePlayGame = async (game: any, minutes: number) => {
        const cost = game.costPerMinute * minutes;
        if (credits < cost) {
            alert("Not enough credits!");
            return;
        }
        await updateCredits(-cost);
        onClose();
        startSession(game.url, minutes, game.title);
    };

    // Filter Logic
    const filteredContent = earnContent.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Featured Content (First one or Random)
    const featuredContent = earnContent.length > 0 ? earnContent[0] : null;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-7xl h-[90vh] bg-slate-950 border border-slate-800 rounded-[32px] overflow-hidden flex flex-col shadow-2xl">

                {/* Header */}
                <div className="h-20 bg-slate-950/50 flex items-center justify-between px-8 border-b border-white/5 z-10 backdrop-blur-sm sticky top-0">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">
                            <Gamepad2 className="text-white" size={24} />
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight">ARCADE</h2>
                    </div>

                    {/* Search Bar */}
                    <div className="flex-1 max-w-md mx-8 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-indigo-400 transition-colors" size={20} />
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search games, videos, topics..."
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-full py-3 pl-12 pr-6 text-white placeholder-slate-500 focus:bg-slate-900 focus:border-indigo-500/50 outline-none transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3 bg-slate-900/50 rounded-full pl-2 pr-5 py-1.5 border border-yellow-500/20">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg">
                                <Trophy size={16} className="text-white fill-white/20" />
                            </div>
                            <div className="flex flex-col leading-none">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Credits</span>
                                <span className="text-lg font-black text-white">{credits}</span>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-3 bg-slate-900 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-all">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Sub-Nav */}
                <div className="flex bg-slate-950 border-b border-white/5 z-10 sticky top-20">
                    <button onClick={() => setMode('EARN')} className={`flex-1 py-4 font-bold text-sm uppercase tracking-widest flex justify-center gap-3 transition-colors ${mode === 'EARN' ? 'text-indigo-400 bg-indigo-500/5 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-white hover:bg-slate-900'}`}>
                        <Play size={18} /> Watch & Earn
                    </button>
                    <button onClick={() => setMode('PLAY')} className={`flex-1 py-4 font-bold text-sm uppercase tracking-widest flex justify-center gap-3 transition-colors ${mode === 'PLAY' ? 'text-purple-400 bg-purple-500/5 border-b-2 border-purple-500' : 'text-slate-500 hover:text-white hover:bg-slate-900'}`}>
                        <Gamepad2 size={18} /> Play Games
                    </button>
                    <button onClick={() => setMode('LEARN')} className={`flex-1 py-4 font-bold text-sm uppercase tracking-widest flex justify-center gap-3 transition-colors ${mode === 'LEARN' ? 'text-emerald-400 bg-emerald-500/5 border-b-2 border-emerald-500' : 'text-slate-500 hover:text-white hover:bg-slate-900'}`}>
                        <BookOpen size={18} /> Learn More
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto bg-[#0a0a0a] relative scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                    {selectedVideo && (
                        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl p-8 flex items-center justify-center">
                            <div className="w-full max-w-5xl h-[85vh]">
                                <VideoQuiz
                                    video={selectedVideo}
                                    onClose={() => setSelectedVideo(null)}
                                    onComplete={handleEarnComplete}
                                    isCompleted={completedContent.includes(selectedVideo.id)}
                                />
                            </div>
                        </div>
                    )}

                    {selectedGame && (
                        <GameCard
                            game={selectedGame}
                            userCredits={credits}
                            onClose={() => setSelectedGame(null)}
                            onPlay={handlePlayGame}
                        />
                    )}

                    <PlatformBrowser
                        platform={selectedPlatform}
                        isOpen={!!selectedPlatform}
                        onClose={() => setSelectedPlatform(null)}
                    />

                    <AddPlatformModal
                        isOpen={showAddPlatform}
                        onClose={() => setShowAddPlatform(false)}
                    />

                    {mode === 'EARN' ? (
                        <div className="pb-20">
                            {/* Hero Section (Only if no search) */}
                            {!searchTerm && featuredContent && (
                                <div className="relative h-[400px] w-full group overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent z-10" />
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent z-10" />
                                    <img src={`https://img.youtube.com/vi/${featuredContent.videoUrl.split('/').pop()}/maxresdefault.jpg`} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-[20s]" />

                                    <div className="absolute bottom-0 left-0 p-12 z-20 max-w-2xl">
                                        <span className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg mb-4 inline-block shadow-lg shadow-indigo-500/30">Featured</span>
                                        <h1 className="text-5xl font-black text-white mb-4 leading-tight">{featuredContent.title}</h1>
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="flex items-center gap-2 text-green-400 font-bold bg-green-950/30 border border-green-500/20 px-3 py-1.5 rounded-lg">
                                                <Star size={16} className="fill-green-400" /> +{featuredContent.xpReward} XP
                                            </div>
                                            <span className="text-slate-400 text-sm font-medium">• {featuredContent.category}</span>
                                        </div>
                                        <button
                                            onClick={() => setSelectedVideo(featuredContent)}
                                            className="px-8 py-4 bg-white text-black rounded-xl font-bold flex items-center gap-3 hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.2)]"
                                        >
                                            <Play className="fill-black" /> Watch Now
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Category Rows */}
                            <div className="px-12 space-y-12 mt-8">
                                {categories.map(category => {
                                    // If searching, only show if category has matches
                                    const categoryContent = filteredContent.filter(c => c.category === category);
                                    if (categoryContent.length === 0) return null;

                                    return (
                                        <div key={category}>
                                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                                <AlignLeft className="text-indigo-500" size={20} />
                                                {category}
                                                <span className="text-slate-600 text-sm font-medium bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">{categoryContent.length}</span>
                                            </h3>

                                            <div className="flex gap-6 overflow-x-auto pb-8 snap-x no-scrollbar mask-linear">
                                                {categoryContent.map(content => {
                                                    const isCompleted = completedContent.includes(content.id);
                                                    return (
                                                        <div
                                                            key={content.id}
                                                            onClick={() => setSelectedVideo(content)}
                                                            className={`flex-none w-[300px] group cursor-pointer snap-start relative rounded-2xl overflow-hidden border transition-all hover:scale-105 hover:z-20 hover:shadow-2xl hover:shadow-indigo-500/20 ${isCompleted ? 'border-green-500/30 opacity-70 hover:opacity-100' : 'border-slate-800 hover:border-indigo-500'}`}
                                                        >
                                                            <div className="aspect-video relative">
                                                                <img src={content.thumbnail} className="w-full h-full object-cover" />
                                                                <div className={`absolute inset-0 transition-opacity flex items-center justify-center ${isCompleted ? 'bg-black/60 opacity-100' : 'bg-black/20 opacity-0 group-hover:opacity-100'}`}>
                                                                    {isCompleted ? (
                                                                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                                                                            <Check className="text-white" size={24} />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                                                                            <Play className="text-black fill-black ml-1" size={24} />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {!isCompleted && (
                                                                    <div className="absolute top-3 right-3 bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg">
                                                                        +{content.xpReward} XP
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="p-4 bg-slate-900 h-[100px]">
                                                                <h4 className="font-bold text-white text-sm line-clamp-2 mb-2 group-hover:text-indigo-400 transition-colors">{content.title}</h4>
                                                                <div className="flex items-center gap-2">
                                                                    {isCompleted ? (
                                                                        <span className="text-xs font-bold text-green-400 flex items-center gap-1"><Check size={12} /> Completed</span>
                                                                    ) : (
                                                                        <span className="text-xs text-slate-500">Not watched</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {searchTerm && filteredContent.length === 0 && (
                                <div className="text-center py-20">
                                    <div className="text-6xl mb-4">👻</div>
                                    <h3 className="text-xl font-bold text-white">No results found</h3>
                                    <p className="text-slate-500">Try searching for something else.</p>
                                </div>
                            )}

                        </div>
                    ) : mode === 'PLAY' ? (
                        // GAMES TAB (Grid is fine for games as there are fewer)
                        <div className="p-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {playGames.map(game => (
                                <div key={game.id} className="group relative bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 hover:border-purple-500 transition-all hover:scale-[1.02] shadow-xl hover:shadow-purple-500/20">
                                    <div className="aspect-[4/3] relative">
                                        <img src={game.thumbnail} alt={game.title} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-90" />
                                        <div className="absolute bottom-4 left-4 right-4">
                                            <h3 className="text-xl font-black text-white mb-1">{game.title}</h3>
                                            <div className="flex items-center gap-2 text-purple-400 text-xs font-bold bg-purple-500/10 w-fit px-2 py-1 rounded border border-purple-500/20">
                                                <Clock size={12} /> {game.costPerMinute} Credits/min
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-5">
                                        <p className="text-slate-400 text-sm mb-5 line-clamp-2">{game.description}</p>
                                        <button
                                            onClick={() => setSelectedGame(game)}
                                            className="w-full py-3 bg-white text-black hover:bg-purple-500 hover:text-white rounded-xl font-bold transition-all shadow-lg"
                                        >
                                            Play Now
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="pb-20">
                            {/* Featured Platform (if any) */}
                            {platforms.find((p: any) => p.featured) && (
                                <div className="relative h-[350px] w-full group overflow-hidden mb-12">
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent z-10" />
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent z-10" />
                                    {platforms.find((p: any) => p.featured).logo && (
                                        <img src={platforms.find((p: any) => p.featured).logo} className="absolute right-12 top-1/2 -translate-y-1/2 h-32 w-32 opacity-20 blur-sm" />
                                    )}

                                    <div className="absolute bottom-0 left-0 p-12 z-20 max-w-2xl">
                                        <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg mb-4 inline-block shadow-lg shadow-emerald-500/30">Featured Platform</span>
                                        <h1 className="text-5xl font-black text-white mb-4 leading-tight">{platforms.find((p: any) => p.featured).name}</h1>
                                        <p className="text-slate-300 text-lg mb-6">{platforms.find((p: any) => p.featured).description}</p>
                                        <button
                                            onClick={() => setSelectedPlatform(platforms.find((p: any) => p.featured))}
                                            className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center gap-3 transition-all shadow-[0_0_40px_rgba(16,185,129,0.3)]"
                                        >
                                            <Rocket /> Launch Platform
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* All Platforms Grid */}
                            <div className="px-12">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-black text-white">All Learning Platforms</h2>
                                    {(userProfile?.role === 'admin' || userProfile?.role === 'instructor') && (
                                        <button
                                            onClick={() => setShowAddPlatform(true)}
                                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold flex items-center gap-2 transition-colors border border-slate-700 hover:border-slate-600"
                                        >
                                            <Plus size={18} />
                                            Add Platform
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {platforms.map((platform: any) => (
                                        <button
                                            key={platform.id}
                                            onClick={() => setSelectedPlatform(platform)}
                                            className="group bg-slate-900 rounded-2xl p-6 border border-slate-800 hover:border-emerald-500 transition-all hover:scale-[1.02] shadow-xl hover:shadow-emerald-500/20 text-left"
                                        >
                                            {platform.logo && (
                                                <img src={platform.logo} alt={platform.name} className="h-16 w-16 rounded-xl mb-4 object-contain bg-white p-2" />
                                            )}
                                            <h3 className="text-xl font-black text-white mb-2">{platform.name}</h3>
                                            <p className="text-slate-400 text-sm mb-4 line-clamp-2">{platform.description}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded border border-emerald-500/20">
                                                    {platform.category || 'Learning'}
                                                </span>
                                                <Rocket size={14} className="text-emerald-400 ml-auto group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
