
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AVATAR_CATEGORIES, getAvatarUrl } from '../utils/avatars';
import { Check, RefreshCw } from 'lucide-react';

interface AvatarSelectorProps {
    currentAvatarUrl?: string;
    onSelect: (url: string) => void;
}

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({ currentAvatarUrl, onSelect }) => {
    const [activeCategory, setActiveCategory] = useState(AVATAR_CATEGORIES[0].id);
    const [selectedUrl, setSelectedUrl] = useState(currentAvatarUrl || '');

    const handleSelect = (url: string) => {
        setSelectedUrl(url);
        onSelect(url);
    };

    return (
        <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800">
            <h3 className="text-xl font-black text-white mb-6 text-center">Choose Your Hero Look 🦸‍♂️</h3>

            {/* Category Tabs */}
            <div className="flex justify-center gap-2 mb-8 flex-wrap">
                {AVATAR_CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${activeCategory === cat.id
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 scale-105'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Avatar Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar p-2">
                {AVATAR_CATEGORIES.find(c => c.id === activeCategory)?.seeds.map(seed => {
                    const url = getAvatarUrl(activeCategory, seed);
                    const isSelected = selectedUrl === url;

                    return (
                        <motion.button
                            key={seed}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleSelect(url)}
                            className={`aspect-square rounded-2xl p-2 relative transition-all ${isSelected
                                ? 'bg-indigo-600 ring-4 ring-indigo-400/30 shadow-xl'
                                : 'bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 hover:border-slate-500'
                                }`}
                        >
                            <img
                                src={url}
                                alt={seed}
                                className="w-full h-full object-contain drop-shadow-md"
                                loading="lazy"
                            />
                            {isSelected && (
                                <div className="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full p-1 shadow-lg border border-slate-900">
                                    <Check size={12} strokeWidth={4} />
                                </div>
                            )}
                        </motion.button>
                    );
                })}
            </div>

            <div className="mt-6 text-center text-slate-500 text-xs">
                Select an avatar that represents your creative power!
            </div>
        </div>
    );
};
