import React, { useEffect, useMemo, useState } from 'react';
import {
    ArrowRight,
    Check,
    Clock3,
    PackageCheck,
    Palette,
    ShoppingBag,
    Sparkles,
    User,
    X,
    Zap,
} from 'lucide-react';
import { useTheme, THEMES, AVATARS, EFFECTS, ThemeId } from '../context/ThemeContext';
import { useFactoryData } from '../hooks/useFactoryData';
import { Gadget } from '../types';

type StoreTab = 'gadgets' | 'themes' | 'avatars' | 'effects';

interface SparkStoreProps {
    isOpen: boolean;
    onClose: () => void;
    previewMode?: boolean;
    defaultTab?: StoreTab;
}

const DEMO_GADGETS: Gadget[] = [
    { id: 'microbit', name: 'Micro:bit V2', description: 'A pocket-sized controller for your next coded invention.', cost: 1500, image: '', stock: 10, type: 'physical', category: 'electronics' },
    { id: 'drone', name: 'Tello maker drone', description: 'Program a real flight path and test your piloting logic.', cost: 5000, image: '', stock: 5, type: 'physical', category: 'robotics' },
    { id: 'motor-kit', name: 'Motion kit', description: 'Five motors, wheels, and connectors for moving prototypes.', cost: 400, image: '', stock: 20, type: 'physical', category: 'electronics' },
    { id: '3d-print', name: 'Two-hour 3D print', description: 'Turn one approved model into a physical prototype.', cost: 800, image: '', stock: 99, type: 'service', category: 'service' },
    { id: 'laser-cut', name: 'Laser-cut session', description: 'Cut one 40 × 40 cm sheet with mentor support.', cost: 1000, image: '', stock: 99, type: 'service', category: 'service' },
];

const gadgetEmoji = (gadget: Gadget) => {
    if (gadget.category === 'robotics') return '🚁';
    if (gadget.category === 'electronics') return gadget.id.includes('motor') ? '⚙️' : '🔌';
    if (gadget.type === 'service') return gadget.id.includes('laser') ? '✂️' : '🧊';
    return '🧰';
};

export const SparkStore: React.FC<SparkStoreProps> = ({ isOpen, onClose, previewMode = false, defaultTab = 'gadgets' }) => {
    const {
        coins,
        activeTheme, unlockedThemes, buyTheme, equipTheme,
        activeAvatar, unlockedAvatars, buyAvatar, equipAvatar,
        activeEffect, unlockedEffects, buyEffect, equipEffect,
    } = useTheme();
    const { gadgets, actions, purchaseRequests } = useFactoryData();
    const [activeTab, setActiveTab] = useState<StoreTab>(defaultTab);
    const [buyingGadget, setBuyingGadget] = useState<string | null>(null);
    const [previewRequests, setPreviewRequests] = useState<string[]>([]);
    const [previewOwned, setPreviewOwned] = useState<string[]>([]);
    const [previewEquipped, setPreviewEquipped] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [isOpen, onClose]);

    const displayCoins = previewMode ? 1680 : coins;
    const displayGadgets = gadgets.length > 0 ? gadgets : DEMO_GADGETS;
    const nextGoal = useMemo(
        () => displayGadgets.find(gadget => gadget.cost > displayCoins) || displayGadgets[0],
        [displayCoins, displayGadgets],
    );
    const goalProgress = nextGoal ? Math.min(100, Math.round((displayCoins / Math.max(nextGoal.cost, 1)) * 100)) : 100;

    const handleBuyGadget = async (gadget: Gadget) => {
        if (displayCoins < gadget.cost || gadget.stock === 0) return;
        if (previewMode) {
            setPreviewRequests(current => current.includes(gadget.id) ? current : [...current, gadget.id]);
            return;
        }

        setBuyingGadget(gadget.id);
        try {
            await actions.buyGadget('current-user', 'Student', gadget);
        } finally {
            setBuyingGadget(null);
        }
    };

    const handleCollectible = (id: string, owned: boolean, purchase: () => boolean, equip: () => void) => {
        if (previewMode) {
            if (!owned) setPreviewOwned(current => current.includes(id) ? current : [...current, id]);
            setPreviewEquipped(id);
            return;
        }
        if (owned) equip();
        else if (purchase()) equip();
    };

    if (!isOpen) return null;

    const tabs: Array<{ id: StoreTab; label: string; icon: React.ElementType }> = [
        { id: 'gadgets', label: 'Maker rewards', icon: ShoppingBag },
        { id: 'themes', label: 'Desk themes', icon: Palette },
        { id: 'avatars', label: 'Avatars', icon: User },
        { id: 'effects', label: 'Celebrations', icon: Sparkles },
    ];

    return (
        <div className="sq-store-overlay" role="dialog" aria-modal="true" aria-labelledby="spark-store-title">
            <button className="sq-store-backdrop" type="button" onClick={onClose} aria-label="Close Spark Exchange" />
            <section className="sq-store-shell">
                <header className="sq-store-header">
                    <div className="sq-store-brand">
                        <span className="sq-store-brand-mark" aria-hidden="true"><ShoppingBag size={25} /></span>
                        <div>
                            <p>Rewards earned by making</p>
                            <h2 id="spark-store-title">Spark Exchange</h2>
                        </div>
                    </div>
                    <div className="sq-store-header-actions">
                        <div className="sq-store-balance" aria-label={`${displayCoins} Sparks available`}>
                            <Zap size={19} fill="currentColor" aria-hidden="true" />
                            <span>{displayCoins.toLocaleString()}</span>
                            <small>Sparks</small>
                        </div>
                        <button className="sq-store-close" type="button" onClick={onClose} aria-label="Close Spark Exchange"><X size={24} /></button>
                    </div>
                </header>

                <div className="sq-store-scroll">
                    <section className="sq-store-hero" aria-labelledby="spark-goal-title">
                        <div className="sq-store-hero-copy">
                            <p className="sq-store-eyebrow">Your next build reward</p>
                            <h3 id="spark-goal-title">Make progress. Choose what it unlocks.</h3>
                            <p>Every approved task adds Sparks. Spend them on tools, studio time, or a little more personality for your workspace.</p>
                        </div>
                        {nextGoal && (
                            <div className="sq-store-goal-ticket">
                                <div className="sq-store-goal-icon" aria-hidden="true">{gadgetEmoji(nextGoal)}</div>
                                <div className="sq-store-goal-copy">
                                    <span>Next target</span>
                                    <strong>{nextGoal.name}</strong>
                                    <div className="sq-store-goal-meter"><span style={{ width: `${goalProgress}%` }} /></div>
                                    <small>{Math.max(0, nextGoal.cost - displayCoins).toLocaleString()} Sparks to go</small>
                                </div>
                            </div>
                        )}
                    </section>

                    <nav className="sq-store-tabs" aria-label="Reward categories">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button key={tab.id} type="button" className={activeTab === tab.id ? 'is-active' : ''} onClick={() => setActiveTab(tab.id)} aria-pressed={activeTab === tab.id}>
                                    <Icon size={18} aria-hidden="true" /> {tab.label}
                                </button>
                            );
                        })}
                    </nav>

                    <section className="sq-store-catalogue" aria-live="polite">
                        <div className="sq-store-section-head">
                            <div>
                                <p>{activeTab === 'gadgets' ? 'Claim counter' : 'Workspace collection'}</p>
                                <h3>{tabs.find(tab => tab.id === activeTab)?.label}</h3>
                            </div>
                            <span>{activeTab === 'gadgets' ? `${displayGadgets.length} rewards` : 'Equip anytime'}</span>
                        </div>

                        <div className="sq-store-grid">
                            {activeTab === 'gadgets' && displayGadgets.map(gadget => {
                                const canAfford = displayCoins >= gadget.cost;
                                const existingOrder = purchaseRequests.find(request => request.gadgetId === gadget.id && request.status === 'pending');
                                const isRequested = Boolean(existingOrder) || previewRequests.includes(gadget.id);
                                const isOrdering = buyingGadget === gadget.id;
                                return (
                                    <article key={gadget.id} className={`sq-reward-ticket ${canAfford ? 'is-ready' : 'is-locked'}`}>
                                        <div className="sq-reward-visual">
                                            {gadget.image ? <img src={gadget.image} alt="" loading="lazy" /> : <span aria-hidden="true">{gadgetEmoji(gadget)}</span>}
                                            <small>{gadget.type === 'service' ? 'Studio service' : gadget.category || 'Maker gear'}</small>
                                        </div>
                                        <div className="sq-reward-copy">
                                            <div className="sq-reward-price"><Zap size={16} fill="currentColor" /> {gadget.cost.toLocaleString()}</div>
                                            <h4>{gadget.name}</h4>
                                            <p>{gadget.description}</p>
                                            <div className="sq-reward-meta">
                                                <span><PackageCheck size={15} /> {gadget.stock > 0 ? `${gadget.stock} available` : 'Out of stock'}</span>
                                                <span>{canAfford ? 'Ready to claim' : `${(gadget.cost - displayCoins).toLocaleString()} more`}</span>
                                            </div>
                                            <button type="button" onClick={() => void handleBuyGadget(gadget)} disabled={!canAfford || gadget.stock === 0 || isOrdering || isRequested}>
                                                {isRequested ? <><Clock3 size={17} /> Request pending</> : isOrdering ? 'Sending request…' : canAfford ? <>Request reward <ArrowRight size={17} /></> : 'Keep building'}
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}

                            {activeTab === 'themes' && THEMES.map(theme => {
                                const isOwned = unlockedThemes.includes(theme.id) || previewOwned.includes(theme.id);
                                const isActive = activeTheme === theme.id || previewEquipped === theme.id;
                                const canAfford = displayCoins >= theme.price;
                                return (
                                    <article key={theme.id} className={`sq-collectible-card ${isActive ? 'is-equipped' : ''}`}>
                                        <div className={`sq-theme-swatch ${theme.bgGradient}`}><span>{theme.name}</span></div>
                                        <div className="sq-collectible-copy">
                                            <span className="sq-collectible-price"><Zap size={15} fill="currentColor" /> {theme.price}</span>
                                            <h4>{theme.name}</h4>
                                            <p>{theme.description}</p>
                                            <button type="button" disabled={!isOwned && !canAfford} onClick={() => handleCollectible(theme.id, isOwned, () => buyTheme(theme.id as ThemeId), () => equipTheme(theme.id as ThemeId))}>
                                                {isActive ? <><Check size={16} /> Equipped</> : isOwned ? 'Equip theme' : canAfford ? 'Unlock theme' : 'Keep building'}
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}

                            {activeTab === 'avatars' && AVATARS.map(item => {
                                const isOwned = unlockedAvatars.includes(item.id) || previewOwned.includes(item.id);
                                const isActive = activeAvatar === item.id || previewEquipped === item.id;
                                const canAfford = displayCoins >= item.price;
                                return (
                                    <article key={item.id} className={`sq-collectible-card is-avatar ${isActive ? 'is-equipped' : ''}`}>
                                        <div className="sq-avatar-swatch"><img src={item.preview} alt="" loading="lazy" /></div>
                                        <div className="sq-collectible-copy">
                                            <span className="sq-collectible-price"><Zap size={15} fill="currentColor" /> {item.price}</span>
                                            <h4>{item.name}</h4>
                                            <p>Choose how you show up across your maker workspace.</p>
                                            <button type="button" disabled={!isOwned && !canAfford} onClick={() => handleCollectible(item.id, isOwned, () => buyAvatar(item.id), () => equipAvatar(item.id))}>
                                                {isActive ? <><Check size={16} /> Equipped</> : isOwned ? 'Use avatar' : canAfford ? 'Unlock avatar' : 'Keep building'}
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}

                            {activeTab === 'effects' && EFFECTS.map(item => {
                                const isOwned = unlockedEffects.includes(item.id) || previewOwned.includes(item.id);
                                const isActive = activeEffect === item.id || previewEquipped === item.id;
                                const canAfford = displayCoins >= item.price;
                                return (
                                    <article key={item.id} className={`sq-collectible-card is-effect ${isActive ? 'is-equipped' : ''}`}>
                                        <div className="sq-effect-swatch" aria-hidden="true">{item.preview}</div>
                                        <div className="sq-collectible-copy">
                                            <span className="sq-collectible-price"><Zap size={15} fill="currentColor" /> {item.price}</span>
                                            <h4>{item.name}</h4>
                                            <p>A small celebration when your work reaches the finish line.</p>
                                            <button type="button" disabled={!isOwned && !canAfford} onClick={() => handleCollectible(item.id, isOwned, () => buyEffect(item.id), () => equipEffect(item.id))}>
                                                {isActive ? <><Check size={16} /> Active</> : isOwned ? 'Use effect' : canAfford ? 'Unlock effect' : 'Keep building'}
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                </div>
            </section>
        </div>
    );
};
