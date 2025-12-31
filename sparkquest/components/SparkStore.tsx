import React from 'react';
import { useTheme, THEMES, AVATARS, EFFECTS, StoreItem } from '../context/ThemeContext';
import { X, ShoppingBag, Check, Lock, Palette, User, Sparkles } from 'lucide-react';
import { useState } from 'react';

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

    const [activeTab, setActiveTab] = useState<'themes' | 'avatars' | 'effects'>('themes');

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
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Customize Your HUD</p>
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

                    {/* Featured Section (Placeholder for future) */}
                    <div className="mb-12">
                        <div className="h-64 rounded-3xl bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 p-1">
                            <div className="w-full h-full bg-slate-900 rounded-[1.3rem] relative overflow-hidden flex items-center">
                                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80')] bg-cover opacity-20 hover:scale-105 transition-transform duration-700"></div>
                                <div className="relative z-10 px-12 max-w-xl">
                                    <span className="inline-block px-4 py-1 rounded-full bg-red-500 text-white text-xs font-black uppercase mb-4">Featured Item</span>
                                    <h3 className="text-5xl font-black text-white mb-4 uppercase leading-none">Cyberpunk Protocol</h3>
                                    <p className="text-slate-300 text-lg mb-8 font-medium">Jack into the matrix with the ultimate neon overhaul.</p>
                                    <button
                                        onClick={() => {
                                            const id = 'cyberpunk';
                                            if (unlockedThemes.includes(id)) {
                                                equipTheme(id);
                                            } else {
                                                buyTheme(id);
                                            }
                                        }}
                                        className="px-8 py-4 bg-white text-black font-black uppercase rounded-xl hover:scale-105 transition-transform shadow-xl"
                                    >
                                        {unlockedThemes.includes('cyberpunk') ? (activeTheme === 'cyberpunk' ? 'Equipped' : 'Equip Now') : 'Unlock (500 🪙)'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs / Filters */}
                    <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
                        <button
                            onClick={() => setActiveTab('themes')}
                            className={`px-6 py-3 rounded-xl font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${activeTab === 'themes' ? 'bg-white text-slate-900 shadow-lg scale-105' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                        >
                            <Palette size={20} /> Themes
                        </button>
                        <button
                            onClick={() => setActiveTab('avatars')}
                            className={`px-6 py-3 rounded-xl font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${activeTab === 'avatars' ? 'bg-white text-slate-900 shadow-lg scale-105' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                        >
                            <User size={20} /> Avatars
                        </button>
                        <button
                            onClick={() => setActiveTab('effects')}
                            className={`px-6 py-3 rounded-xl font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${activeTab === 'effects' ? 'bg-white text-slate-900 shadow-lg scale-105' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                        >
                            <Sparkles size={20} /> Effects
                        </button>
                    </div>


                    {/* Section Title removed as Tabs handle it */}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {activeTab === 'themes' && THEMES.map(theme => {
                            const isUnlocked = unlockedThemes.includes(theme.id);
                            const isActive = activeTheme === theme.id;
                            const canAfford = coins >= theme.price;

                            return (
                                <div key={theme.id} className={`group relative bg-slate-800 rounded-3xl overflow-hidden border-2 transition-all duration-300
                                    ${isActive ? 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)] ring-2 ring-green-500/20' :
                                        isUnlocked ? 'border-slate-700 hover:border-blue-400' :
                                            'border-slate-700 opacity-80 hover:opacity-100 hover:border-slate-500'}
                                `}>
                                    {/* Preview Area */}
                                    <div className={`h-32 ${theme.bgGradient} relative flex items-center justify-center overflow-hidden`}>
                                        <div className="absolute inset-0 bg-black/20"></div>
                                        <div className={`px-6 py-2 rounded-xl bg-slate-900/80 backdrop-blur-md text-white font-black text-lg shadow-lg transform group-hover:scale-110 transition-transform ${theme.font || ''}`}>
                                            Preview UI
                                        </div>
                                        {isActive && (
                                            <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-black uppercase shadow-lg flex items-center gap-1">
                                                <Check size={12} strokeWidth={4} /> Active
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="text-xl font-black text-white">{theme.name}</h4>
                                            {!isUnlocked && (
                                                <div className="flex items-center gap-1 text-yellow-400 font-bold bg-slate-900 px-3 py-1 rounded-lg">
                                                    <span>{theme.price}</span> 🪙
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-slate-400 text-sm font-medium h-10 leading-snug">{theme.description}</p>

                                        <div className="mt-6">
                                            {isUnlocked ? (
                                                <button
                                                    onClick={() => equipTheme(theme.id)}
                                                    disabled={isActive}
                                                    className={`w-full py-3 rounded-xl font-black uppercase tracking-wider transition-all
                                                        ${isActive
                                                            ? 'bg-slate-700 text-slate-500 cursor-default'
                                                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 active:scale-95'}
                                                    `}
                                                >
                                                    {isActive ? 'Current Theme' : 'Equip'}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => buyTheme(theme.id)}
                                                    disabled={!canAfford}
                                                    className={`w-full py-3 rounded-xl font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2
                                                        ${canAfford
                                                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-95'
                                                            : 'bg-slate-700 text-slate-500 cursor-not-allowed'}
                                                    `}
                                                >
                                                    {canAfford ? 'Purchase' : 'Not enough coins'} {!canAfford && <Lock size={14} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {activeTab === 'avatars' && AVATARS.map(item => {
                            const isUnlocked = unlockedAvatars.includes(item.id);
                            const isActive = activeAvatar === item.id;
                            const canAfford = coins >= item.price;

                            return (
                                <div key={item.id} className={`group relative bg-slate-800 rounded-3xl overflow-hidden border-2 transition-all duration-300
                                    ${isActive ? 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)] ring-2 ring-green-500/20' :
                                        isUnlocked ? 'border-slate-700 hover:border-blue-400' :
                                            'border-slate-700 opacity-80 hover:opacity-100 hover:border-slate-500'}`}>

                                    <div className="h-48 bg-slate-900 relative flex items-center justify-center overflow-hidden p-6">
                                        <img src={item.preview} className="w-32 h-32 rounded-full border-4 border-slate-700 shadow-xl group-hover:scale-110 transition-transform bg-slate-800" />
                                        {isActive && (
                                            <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-black uppercase shadow-lg flex items-center gap-1">
                                                <Check size={12} strokeWidth={4} /> Active
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="text-xl font-black text-white">{item.name}</h4>
                                            {!isUnlocked && <div className="text-yellow-400 font-bold bg-slate-900 px-3 py-1 rounded-lg">{item.price} 🪙</div>}
                                        </div>

                                        <div className="mt-4">
                                            {isUnlocked ? (
                                                <button onClick={() => equipAvatar(item.id)} disabled={isActive} className={`w-full py-3 rounded-xl font-black uppercase tracking-wider transition-all ${isActive ? 'bg-slate-700 text-slate-500 cursor-default' : 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95'}`}>
                                                    {isActive ? 'Equipped' : 'Equip'}
                                                </button>
                                            ) : (
                                                <button onClick={() => buyAvatar(item.id)} disabled={!canAfford} className={`w-full py-3 rounded-xl font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${canAfford ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg active:scale-95' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}>
                                                    {canAfford ? 'Purchase' : 'Locked'} {!canAfford && <Lock size={14} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {activeTab === 'effects' && EFFECTS.map(item => {
                            const isUnlocked = unlockedEffects.includes(item.id);
                            const isActive = activeEffect === item.id;
                            const canAfford = coins >= item.price;

                            return (
                                <div key={item.id} className={`group relative bg-slate-800 rounded-3xl overflow-hidden border-2 transition-all duration-300
                                    ${isActive ? 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)] ring-2 ring-green-500/20' :
                                        isUnlocked ? 'border-slate-700 hover:border-pink-400' :
                                            'border-slate-700 opacity-80 hover:opacity-100 hover:border-slate-500'}`}>

                                    <div className="h-48 bg-slate-900 relative flex items-center justify-center overflow-hidden">
                                        <div className="text-8xl animate-bounce">{item.preview}</div>
                                        {isActive && (
                                            <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-black uppercase shadow-lg flex items-center gap-1">
                                                <Check size={12} strokeWidth={4} /> Active
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="text-xl font-black text-white">{item.name}</h4>
                                            {!isUnlocked && <div className="text-yellow-400 font-bold bg-slate-900 px-3 py-1 rounded-lg">{item.price} 🪙</div>}
                                        </div>

                                        <div className="mt-4">
                                            {isUnlocked ? (
                                                <button onClick={() => equipEffect(item.id)} disabled={isActive} className={`w-full py-3 rounded-xl font-black uppercase tracking-wider transition-all ${isActive ? 'bg-slate-700 text-slate-500 cursor-default' : 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95'}`}>
                                                    {isActive ? 'Active' : 'Enable'}
                                                </button>
                                            ) : (
                                                <button onClick={() => buyEffect(item.id)} disabled={!canAfford} className={`w-full py-3 rounded-xl font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${canAfford ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg active:scale-95' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}>
                                                    {canAfford ? 'Purchase' : 'Locked'} {!canAfford && <Lock size={14} />}
                                                </button>
                                            )}
                                        </div>
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
