import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, Clock3, Gamepad2, GraduationCap, Play, Plus, Rocket, Search, Star, Ticket, X, Zap } from 'lucide-react';
import { collection, doc, getDocs, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useSession } from '../../context/SessionContext';
import { db } from '../../services/firebase';
import { AddPlatformModal } from './AddPlatformModal';
import { GameCard } from './GameCard';
import { PlatformBrowser } from './PlatformBrowser';
import { VideoQuiz } from './VideoQuiz';

interface ArcadeViewProps {
    isOpen: boolean;
    onClose: () => void;
    previewMode?: boolean;
}

const PREVIEW_CONTENT = [
    { id: 'arcade-circuits', title: 'Why circuits need a complete loop', category: 'Electronics', xpReward: 30, duration: '6 min', videoUrl: 'https://www.youtube.com/watch?v=Q5akxaR7gOY', description: 'Trace the path of electricity, then answer a short bench quiz.' },
    { id: 'arcade-prototypes', title: 'Prototype before you polish', category: 'Design', xpReward: 25, duration: '5 min', videoUrl: 'https://www.youtube.com/watch?v=Q5akxaR7gOY', description: 'See why rough models make ideas stronger.' },
    { id: 'arcade-sensors', title: 'How a moisture sensor reads soil', category: 'Coding', xpReward: 40, duration: '8 min', videoUrl: 'https://www.youtube.com/watch?v=Q5akxaR7gOY', description: 'Connect a physical signal to a useful decision.' },
];

const PREVIEW_GAMES = [
    { id: 'game-logic-grid', title: 'Logic grid', description: 'Solve short sequencing puzzles.', category: 'Coding', costPerMinute: 2, url: '#', thumbnail: '' },
    { id: 'game-bridge', title: 'Bridge builder', description: 'Balance shape, span, and material.', category: 'Engineering', costPerMinute: 3, url: '#', thumbnail: '' },
    { id: 'game-circuit', title: 'Circuit sprint', description: 'Complete the loop before time runs out.', category: 'Electronics', costPerMinute: 2, url: '#', thumbnail: '' },
];

const PREVIEW_PLATFORMS = [
    { id: 'platform-tinkercad', name: 'Tinkercad', description: 'Build 3D models and simulate circuits.', category: 'Design & circuits', status: 'active', featured: true, logo: '' },
    { id: 'platform-scratch', name: 'Scratch', description: 'Code interactive stories, games, and animations.', category: 'Creative coding', status: 'active', logo: '' },
    { id: 'platform-onshape', name: 'Onshape', description: 'Turn precise sketches into engineered parts.', category: 'CAD', status: 'active', logo: '' },
];

export const ArcadeView: React.FC<ArcadeViewProps> = ({ isOpen, onClose, previewMode = false }) => {
    const { user, userProfile, updateCredits } = useAuth();
    const { startSession } = useSession();
    const [mode, setMode] = useState<'EARN' | 'PLAY' | 'LEARN'>('EARN');
    const [searchTerm, setSearchTerm] = useState('');
    const [earnContent, setEarnContent] = useState<any[]>([]);
    const [playGames, setPlayGames] = useState<any[]>([]);
    const [platforms, setPlatforms] = useState<any[]>([]);
    const [completedContent, setCompletedContent] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVideo, setSelectedVideo] = useState<any>(null);
    const [selectedGame, setSelectedGame] = useState<any>(null);
    const [selectedPlatform, setSelectedPlatform] = useState<any>(null);
    const [showAddPlatform, setShowAddPlatform] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [previewCredits, setPreviewCredits] = useState(84);
    const credits = previewMode ? previewCredits : (userProfile?.arcadeCredits || 0);

    useEffect(() => {
        if (!isOpen) return;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            if (selectedVideo) setSelectedVideo(null);
            else if (selectedGame) setSelectedGame(null);
            else if (selectedPlatform) setSelectedPlatform(null);
            else onClose();
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [isOpen, onClose, selectedGame, selectedPlatform, selectedVideo]);

    useEffect(() => {
        if (!isOpen) return;
        if (previewMode) {
            setEarnContent(PREVIEW_CONTENT);
            setPlayGames(PREVIEW_GAMES);
            setPlatforms(PREVIEW_PLATFORMS);
            setCompletedContent(['arcade-prototypes']);
            setLoading(false);
            return;
        }
        setLoading(true);
        if (!db) {
            setLoading(false);
            return;
        }
        const contentUnsub = onSnapshot(collection(db, 'arcade_content'), snap => setEarnContent(snap.docs.map(item => ({ id: item.id, ...item.data() }))));
        const gamesUnsub = onSnapshot(collection(db, 'arcade_games'), snap => {
            setPlayGames(snap.docs.map(item => ({ id: item.id, ...item.data() })));
            setLoading(false);
        });
        if (user?.uid) void getDocs(collection(db, `users/${user.uid}/arcade_progress`)).then(snap => setCompletedContent(snap.docs.map(item => item.id)));
        return () => { contentUnsub(); gamesUnsub(); };
    }, [isOpen, previewMode, user?.uid]);

    useEffect(() => {
        if (!isOpen || previewMode || !db) return;
        return onSnapshot(collection(db, 'arcade_platforms'), snap => setPlatforms(snap.docs.map(item => ({ id: item.id, ...item.data() })).filter((platform: any) => platform.status === 'active')));
    }, [isOpen, previewMode]);

    const handleEarnComplete = async (reward: number) => {
        if (!selectedVideo) return;
        if (previewMode) {
            setCompletedContent(previous => Array.from(new Set([...previous, selectedVideo.id])));
            setPreviewCredits(value => value + reward);
            setSelectedVideo(null);
            setNotice(`${reward} arcade credits added in this preview.`);
            return;
        }
        if (!user?.uid || !db) return;
        setCompletedContent(previous => Array.from(new Set([...previous, selectedVideo.id])));
        try {
            await setDoc(doc(db, `users/${user.uid}/arcade_progress`, selectedVideo.id), { completedAt: serverTimestamp(), xpEarned: reward, contentId: selectedVideo.id });
            await updateCredits(reward);
            setSelectedVideo(null);
            setNotice(`${reward} arcade credits added.`);
        } catch (saveError) {
            console.error('Error saving arcade progress', saveError);
            setNotice('Progress could not be saved. Check your connection and try again.');
        }
    };

    const handlePlayGame = async (game: any, minutes: number) => {
        const cost = game.costPerMinute * minutes;
        if (credits < cost) {
            setSelectedGame(null);
            setNotice(`You need ${cost - credits} more arcade credits for that session.`);
            return;
        }
        if (previewMode) {
            setPreviewCredits(value => value - cost);
            setSelectedGame(null);
            setNotice(`${minutes} preview minutes reserved for ${game.title}.`);
            return;
        }
        await updateCredits(-cost);
        onClose();
        startSession(game.url, minutes, game.title);
    };

    const visibleItems = useMemo(() => {
        const queryText = searchTerm.trim().toLowerCase();
        const source = mode === 'EARN' ? earnContent : mode === 'PLAY' ? playGames : platforms;
        if (!queryText) return source;
        return source.filter(item => `${item.title || item.name} ${item.category || ''} ${item.description || ''}`.toLowerCase().includes(queryText));
    }, [earnContent, mode, platforms, playGames, searchTerm]);

    if (!isOpen) return null;

    const tabCopy = {
        EARN: { eyebrow: 'Watch & solve', title: 'Earn your next play ticket.', body: 'Short lessons and quick quizzes turn useful ideas into arcade credits.' },
        PLAY: { eyebrow: 'Timed play', title: 'Spend credits with a plan.', body: 'Choose a game and a time window. The session ends when your ticket runs out.' },
        LEARN: { eyebrow: 'Tool launchpad', title: 'Keep building elsewhere.', body: 'Open the learning platforms connected to your MakerLab workbench.' },
    }[mode];

    return (
        <div className="sq-arcade-overlay" role="dialog" aria-modal="true" aria-labelledby="arcade-title">
            <button className="sq-arcade-backdrop" type="button" onClick={onClose} aria-label="Close play lab" />
            <section className="sq-arcade-shell">
                <header className="sq-arcade-header">
                    <div className="sq-arcade-brand"><span aria-hidden="true"><Gamepad2 size={24} /></span><div><p>Sparkbook play lab</p><h2 id="arcade-title">Learn first. Play on purpose.</h2></div></div>
                    <div className="sq-arcade-balance"><Ticket size={18} /><span><small>Arcade credits</small><strong>{credits}</strong></span></div>
                    <button type="button" className="sq-arcade-close" onClick={onClose} aria-label="Close play lab"><X size={24} /></button>
                </header>

                <div className="sq-arcade-tabs" role="tablist" aria-label="Play lab sections">
                    <button type="button" role="tab" aria-selected={mode === 'EARN'} onClick={() => setMode('EARN')}><GraduationCap size={18} /><span><strong>Earn</strong><small>Watch & solve</small></span></button>
                    <button type="button" role="tab" aria-selected={mode === 'PLAY'} onClick={() => setMode('PLAY')}><Gamepad2 size={18} /><span><strong>Play</strong><small>Timed games</small></span></button>
                    <button type="button" role="tab" aria-selected={mode === 'LEARN'} onClick={() => setMode('LEARN')}><BookOpen size={18} /><span><strong>Launchpad</strong><small>Learning tools</small></span></button>
                </div>

                {notice && <div className="sq-arcade-notice" role="status"><Check size={16} /> {notice}<button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message"><X size={14} /></button></div>}

                <div className="sq-arcade-scroll">
                    <section className={`sq-arcade-intro is-${mode.toLowerCase()}`}><div><p>{tabCopy.eyebrow}</p><h3>{tabCopy.title}</h3><span>{tabCopy.body}</span></div><label><Search size={18} /><input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Find a topic, game, or tool" /></label></section>

                    {loading ? <div className="sq-arcade-state"><span className="sq-arcade-loader" /><h3>Setting up the play lab…</h3></div> : visibleItems.length === 0 ? <div className="sq-arcade-state"><Gamepad2 size={44} /><h3>No matches on this shelf.</h3><p>Try a different word or clear the search.</p></div> : (
                        <div className="sq-arcade-grid">
                            {mode === 'EARN' && visibleItems.map((content: any, index) => {
                                const complete = completedContent.includes(content.id);
                                return <article key={content.id} className={`sq-arcade-card is-lesson ${complete ? 'is-complete' : ''}`}><div className="sq-arcade-card-art"><span>{String(index + 1).padStart(2, '0')}</span><GraduationCap size={44} /></div><div className="sq-arcade-card-copy"><p>{content.category || 'Maker lesson'}</p><h4>{content.title}</h4><span>{content.description || 'Watch, think, and answer a short bench quiz.'}</span><div><small><Clock3 size={14} /> {content.duration || 'Quick lesson'}</small><small><Zap size={14} /> +{content.xpReward || 0}</small></div><button type="button" onClick={() => setSelectedVideo(content)}>{complete ? <><Check size={17} /> Review lesson</> : <><Play size={17} /> Start lesson</>}</button></div></article>;
                            })}
                            {mode === 'PLAY' && visibleItems.map((game: any, index) => <article key={game.id} className="sq-arcade-card is-game"><div className="sq-arcade-card-art"><span>{String(index + 1).padStart(2, '0')}</span><Gamepad2 size={44} /></div><div className="sq-arcade-card-copy"><p>{game.category || 'Maker game'}</p><h4>{game.title}</h4><span>{game.description || 'A focused game session for your break.'}</span><div><small><Ticket size={14} /> {game.costPerMinute || 0}/min</small><small><Star size={14} /> Timed</small></div><button type="button" onClick={() => setSelectedGame(game)}><Play size={17} /> Choose play time</button></div></article>)}
                            {mode === 'LEARN' && visibleItems.map((platform: any, index) => <article key={platform.id} className="sq-arcade-card is-platform"><div className="sq-arcade-card-art"><span>{String(index + 1).padStart(2, '0')}</span>{platform.logo ? <img src={platform.logo} alt="" /> : <Rocket size={44} />}</div><div className="sq-arcade-card-copy"><p>{platform.category || 'Learning tool'}</p><h4>{platform.name}</h4><span>{platform.description || 'Open this tool from your MakerLab launchpad.'}</span><button type="button" onClick={() => previewMode ? setNotice(`${platform.name} would open from an authenticated learner session.`) : setSelectedPlatform(platform)}><Rocket size={17} /> Open tool</button></div></article>)}
                        </div>
                    )}

                    {mode === 'LEARN' && (userProfile?.role === 'admin' || userProfile?.role === 'instructor') && <button type="button" className="sq-arcade-add-platform" onClick={() => setShowAddPlatform(true)}><Plus size={18} /> Add learning platform</button>}
                </div>

                {selectedVideo && <div className="sq-arcade-nested"><div><VideoQuiz video={selectedVideo} onClose={() => setSelectedVideo(null)} onComplete={handleEarnComplete} isCompleted={completedContent.includes(selectedVideo.id)} /></div></div>}
                {selectedGame && <GameCard game={selectedGame} userCredits={credits} onClose={() => setSelectedGame(null)} onPlay={handlePlayGame} />}
                <PlatformBrowser platform={selectedPlatform} isOpen={!!selectedPlatform} onClose={() => setSelectedPlatform(null)} />
                <AddPlatformModal isOpen={showAddPlatform} onClose={() => setShowAddPlatform(false)} />
            </section>
        </div>
    );
};
