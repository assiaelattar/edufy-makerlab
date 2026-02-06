import React, { useState } from 'react';
import { useTheme, THEMES, AVATARS, EFFECTS, StoreItem } from '../context/ThemeContext';
import { X, ShoppingBag, Check, Lock, Palette, User, Sparkles, Loader2 } from 'lucide-react';
import { useFactoryData } from '../hooks/useFactoryData';
import { Gadget } from '../types';

interface SparkStoreProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SparkStore: React.FC<SparkStoreProps> = ({ isOpen, onClose }) => {
    const {
        coins,
        activeTheme, unlockedThemes, buyTheme, equipTheme,
        activeAvatar, unlockedAvatars, buyAvatar, equipAvatar,
        activeEffect, unlockedEffects, buyEffect, equipEffect
    } = useTheme();

    const { gadgets, actions, purchaseRequests } = useFactoryData();
    const [activeTab, setActiveTab] = useState<'themes' | 'avatars' | 'effects' | 'gadgets'>('themes');
    const [buyingGadget, setBuyingGadget] = useState<string | null>(null);

    // Initial Seed Data (if DB is empty)
    const MOCK_GADGETS: Gadget[] = [
        { id: 'microbit', name: 'Micro:bit V2', description: 'Tiny computer for learning coding.', cost: 1500, image: 'https://images.unsplash.com/photo-1629739884942-8678d130dd7d?w=400', stock: 10, type: 'physical', category: 'electronics' },
        { id: 'drone', name: 'DJI Tello Drone', description: 'Programmable educational drone.', cost: 5000, image: 'https://images.unsplash.com/photo-1506461883276-594a12b11cf3?w=400', stock: 5, type: 'physical', category: 'robotics' },
        { id: 'dc_motor', name: 'DC Motor Kit', description: 'Pack of 5 motors for robotics.', cost: 400, image: 'https://images.unsplash.com/photo-1563714272133-7cb7bd642817?w=400', stock: 20, type: 'physical', category: 'electronics' },
        { id: '3d_print', name: '3D Print (2h max)', description: 'Print your own 3D model.', cost: 800, image: 'https://images.unsplash.com/photo-1631541909061-71e349d1f203?w=400', stock: 99, type: 'service', category: 'service' },
        { id: 'laser_cut', name: 'Laser Cut (40x40)', description: 'Precision cutting service.', cost: 1000, image: 'https://images.unsplash.com/photo-1616422201314-a95782787c88?w=400', stock: 99, type: 'service', category: 'service' }
    ];

    const displayGadgets = gadgets.length > 0 ? gadgets : MOCK_GADGETS;

    const handleBuyGadget = async (gadget: Gadget) => {
        if (coins < gadget.cost) return;
        setBuyingGadget(gadget.id);
        // Assuming 'Guest' or 'Student' name if Auth context is simple here. 
        // Ideally pass real user data.
        await actions.buyGadget('current-user', 'Student', gadget);
        setTimeout(() => setBuyingGadget(null), 1000);
        // Note: Logic to deduct coins should happen here or via backend listener
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose}></div>
            <div className="relative w-full max-w-5xl h-[80vh] bg-slate-900 rounded-[2.5rem] border border-slate-700 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">

                {/* Header */}
                <div className="px-10 py-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg transform rotate-3">
                            <ShoppingBag className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Spark Store</h2>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Spend Your Hard-Earned XP</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="bg-slate-800 px-6 py-3 rounded-full border border-yellow-500/30 flex items-center gap-3 shadow-inner">
                            <span className="text-2xl">🪙</span>
                            <span className="text-xl font-black text-yellow-400 tracking-wider">{coins}</span>
                        </div>
                        <button onClick={onClose} className="p-3 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
                            <X size={32} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">

                    {/* Tabs */}
                    <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
                        <button onClick={() => setActiveTab('themes')} className={`px-6 py-3 rounded-xl font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${activeTab === 'themes' ? 'bg-white text-slate-900 shadow-lg scale-105' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                            <Palette size={20} /> Themes
                        </button>
                        <button onClick={() => setActiveTab('avatars')} className={`px-6 py-3 rounded-xl font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${activeTab === 'avatars' ? 'bg-white text-slate-900 shadow-lg scale-105' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                            <User size={20} /> Avatars
                        </button>
                        <button onClick={() => setActiveTab('effects')} className={`px-6 py-3 rounded-xl font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${activeTab === 'effects' ? 'bg-white text-slate-900 shadow-lg scale-105' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                            <Sparkles size={20} /> Effects
                        </button>
                        <button onClick={() => setActiveTab('gadgets')} className={`px-6 py-3 rounded-xl font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${activeTab === 'gadgets' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 scale-105' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                            <ShoppingBag size={20} /> Gadgets
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* THEMES TAB */}
                        {activeTab === 'themes' && THEMES.map(theme => {
                            const isUnlocked = unlockedThemes.includes(theme.id);
                            const isActive = activeTheme === theme.id;
                            const canAfford = coins >= theme.price;

                            return (
                                <div key={theme.id} className={`group relative bg-slate-800 rounded-3xl overflow-hidden border-2 transition-all duration-300 ${isActive ? 'border-green-500 shadow-lg' : isUnlocked ? 'border-slate-700' : 'border-slate-700 opacity-80'}`}>
                                    <div className={`h-32 ${theme.bgGradient} flex items-center justify-center`}>
                                        <div className="px-4 py-2 bg-black/50 backdrop-blur-md rounded-lg text-white font-bold">{theme.name}</div>
                                    </div>
                                    <div className="p-6">
                                        <div className="flex justify-between mb-4">
                                            <div className="text-yellow-400 font-bold">{theme.price} 🪙</div>
                                        </div>
                                        {isUnlocked ? (
                                            <button onClick={() => equipTheme(theme.id)} disabled={isActive} className="w-full py-3 bg-slate-700 rounded-xl text-white font-bold">{isActive ? 'Equipped' : 'Equip'}</button>
                                        ) : (
                                            <button onClick={() => buyTheme(theme.id)} disabled={!canAfford} className={`w-full py-3 rounded-xl font-bold ${canAfford ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-500'}`}>Purchase</button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* AVATARS TAB */}
                        {activeTab === 'avatars' && AVATARS.map(item => {
                            const isUnlocked = unlockedAvatars.includes(item.id);
                            const isActive = activeAvatar === item.id;
                            const canAfford = coins >= item.price;
                            return (
                                <div key={item.id} className="bg-slate-800 rounded-3xl overflow-hidden p-6 border border-slate-700">
                                    <img src={item.preview} className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-slate-700" />
                                    <h4 className="text-center text-white font-bold mb-2">{item.name}</h4>
                                    <div className="text-center text-yellow-400 font-bold mb-4">{item.price} 🪙</div>
                                    {isUnlocked ? (
                                        <button onClick={() => equipAvatar(item.id)} disabled={isActive} className="w-full py-3 bg-slate-700 rounded-xl text-white font-bold">{isActive ? 'Equipped' : 'Equip'}</button>
                                    ) : (
                                        <button onClick={() => buyAvatar(item.id)} disabled={!canAfford} className={`w-full py-3 rounded-xl font-bold ${canAfford ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-500'}`}>Purchase</button>
                                    )}
                                </div>
                            )
                        })}

                        {/* EFFECTS TAB */}
                        {activeTab === 'effects' && EFFECTS.map(item => {
                            const isUnlocked = unlockedEffects.includes(item.id);
                            const isActive = activeEffect === item.id;
                            const canAfford = coins >= item.price;
                            return (
                                <div key={item.id} className="bg-slate-800 rounded-3xl overflow-hidden p-6 border border-slate-700">
                                    <div className="text-6xl text-center mb-4">{item.preview}</div>
                                    <h4 className="text-center text-white font-bold mb-2">{item.name}</h4>
                                    <div className="text-center text-yellow-400 font-bold mb-4">{item.price} 🪙</div>
                                    {isUnlocked ? (
                                        <button onClick={() => equipEffect(item.id)} disabled={isActive} className="w-full py-3 bg-slate-700 rounded-xl text-white font-bold">{isActive ? 'Active' : 'Equip'}</button>
                                    ) : (
                                        <button onClick={() => buyEffect(item.id)} disabled={!canAfford} className={`w-full py-3 rounded-xl font-bold ${canAfford ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-500'}`}>Purchase</button>
                                    )}
                                </div>
                            )
                        })}

                        {/* GADGETS TAB */}
                        {activeTab === 'gadgets' && displayGadgets.map(gadget => {
                            const canAfford = coins >= gadget.cost;
                            const isOrdering = buyingGadget === gadget.id;

                            // Check if already ordered (pending)
                            const existingOrder = purchaseRequests.find(r => r.gadgetId === gadget.id && r.status === 'pending');

                            return (
                                <div key={gadget.id} className="group relative bg-slate-800 rounded-3xl overflow-hidden border border-slate-700 hover:border-indigo-500 transition-all hover:shadow-2xl hover:-translate-y-1">
                                    <div className="h-48 bg-slate-900 relative">
                                        <img src={gadget.image} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                                        <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black uppercase text-white border border-slate-700">
                                            {gadget.category || 'Gadget'}
                                        </div>
                                    </div>

                                    <div className="p-6">
                                        <h4 className="text-xl font-black text-white mb-1 leading-tight">{gadget.name}</h4>
                                        <p className="text-slate-400 text-sm mb-4 line-clamp-2 h-10">{gadget.description}</p>

                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">🪙</span>
                                                <span className={`text-xl font-black ${canAfford ? 'text-yellow-400' : 'text-red-400'}`}>
                                                    {gadget.cost}
                                                </span>
                                            </div>
                                            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
                                                {gadget.stock > 0 ? `${gadget.stock} in Stock` : 'Out of Stock'}
                                            </div>
                                        </div>

                                        {existingOrder ? (
                                            <button disabled className="w-full py-3 rounded-xl font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/50 flex items-center justify-center gap-2">
                                                <Loader2 size={16} className="animate-spin" /> Order Pending
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleBuyGadget(gadget)}
                                                disabled={!canAfford || gadget.stock === 0 || isOrdering}
                                                className={`w-full py-4 rounded-xl font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 
                                                    ${!canAfford
                                                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-95'
                                                    }`}
                                            >
                                                {isOrdering ? 'Ordering...' : 'Order Now'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
