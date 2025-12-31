import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeId = 'default' | 'cyberpunk' | 'retro' | 'nature' | 'royal' | 'hacker' | 'minecraft' | 'roblox';

interface Theme {
    id: ThemeId;
    name: string;
    description: string;
    price: number;
    bgGradient: string; // CSS class or gradient string
    accentColor: string;
    font?: string;
}

export interface StoreItem {
    id: string;
    name: string;
    description?: string;
    price: number;
    preview: string; // URL or CSS
    type: 'avatar' | 'effect';
}

export const AVATARS: StoreItem[] = [
    { id: 'robot_1', name: 'Mecha Bot', price: 100, preview: 'https://api.dicebear.com/7.x/bottts/svg?seed=Felix', type: 'avatar' },
    { id: 'robot_2', name: 'Cyber Droid', price: 200, preview: 'https://api.dicebear.com/7.x/bottts/svg?seed=Aneka', type: 'avatar' },
    { id: 'adventurer', name: 'Space Explorer', price: 500, preview: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', type: 'avatar' },
    { id: 'wizard', name: 'Techno Wizard', price: 1000, preview: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Wizard', type: 'avatar' },
];

export const EFFECTS: StoreItem[] = [
    { id: 'confetti', name: 'Victory Confetti', price: 100, preview: '🎉', type: 'effect' },
    { id: 'fireworks', name: 'Code Fireworks', price: 300, preview: '🎆', type: 'effect' },
    { id: 'matrix', name: 'Matrix Rain', price: 500, preview: '💻', type: 'effect' },
];

export const THEMES: Theme[] = [
    {
        id: 'default',
        name: 'Galactic Standard',
        description: 'The standard issue interface for all cadets.',
        price: 0,
        bgGradient: 'bg-slate-900',
        accentColor: 'indigo'
    },
    {
        id: 'cyberpunk',
        name: 'Neon City',
        description: 'High-tech, low-life. Maximum cyber vibes.',
        price: 500,
        bgGradient: 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900',
        accentColor: 'cyan'
    },
    {
        id: 'retro',
        name: '8-Bit Arcade',
        description: 'Old school cool. Press start to play.',
        price: 300,
        bgGradient: 'bg-slate-950', // Would add pixel grid pattern in CSS
        accentColor: 'green',
        font: 'font-mono'
    },
    {
        id: 'royal',
        name: 'Imperial Gold',
        description: 'Luxury interface for distinguished achievers.',
        price: 1000,
        bgGradient: 'bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900/20',
        accentColor: 'amber'
    },
    {
        id: 'nature',
        name: 'Zen Garden',
        description: 'Peaceful and organic. Flow like water.',
        price: 200,
        bgGradient: 'bg-gradient-to-br from-emerald-950 to-teal-900',
        accentColor: 'emerald'
    },
    {
        id: 'hacker',
        name: 'The Mainframe',
        description: 'Access granted. Matrix protocols active.',
        price: 666,
        bgGradient: 'bg-black text-green-500 font-mono', // Special handling might be needed for text color
        accentColor: 'green',
        font: 'font-mono'
    },
    {
        id: 'minecraft',
        name: 'Block World',
        description: 'Build your dreams, one block at a time.',
        price: 400,
        bgGradient: 'bg-gradient-to-b from-sky-400 to-green-600',
        accentColor: 'green'
    },
    {
        id: 'roblox',
        name: 'Blox Verse',
        description: 'OOF! The ultimate playground style.',
        price: 350,
        bgGradient: 'bg-gradient-to-br from-red-600 via-slate-800 to-blue-600',
        accentColor: 'red'
    }
];

interface ThemeContextType {
    activeTheme: ThemeId;
    unlockedThemes: ThemeId[];
    activeAvatar: string;
    unlockedAvatars: string[];
    activeEffect: string;
    unlockedEffects: string[];

    equipAvatar: (id: string) => void;
    buyAvatar: (id: string) => boolean;
    equipEffect: (id: string) => void;
    buyEffect: (id: string) => boolean;

    coins: number;
    equipTheme: (id: ThemeId) => void;
    buyTheme: (id: ThemeId) => boolean;
    addCoins: (amount: number) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Persist to LocalStorage for MVP
    const [activeTheme, setActiveTheme] = useState<ThemeId>(() => {
        return (localStorage.getItem('spark_active_theme') as ThemeId) || 'default';
    });

    const [unlockedThemes, setUnlockedThemes] = useState<ThemeId[]>(() => {
        const stored = localStorage.getItem('spark_unlocked_themes');
        return stored ? JSON.parse(stored) : ['default'];
    });

    const [coins, setCoins] = useState<number>(() => {
        const stored = localStorage.getItem('spark_coins');
        return stored ? parseInt(stored) : 1000; // Start with 1000 coins for fun
    });

    // Avatars State
    const [activeAvatar, setActiveAvatar] = useState<string>(() => localStorage.getItem('spark_active_avatar') || 'default');
    const [unlockedAvatars, setUnlockedAvatars] = useState<string[]>(() => {
        const stored = localStorage.getItem('spark_unlocked_avatars');
        return stored ? JSON.parse(stored) : ['default'];
    });

    // Effects State
    const [activeEffect, setActiveEffect] = useState<string>(() => localStorage.getItem('spark_active_effect') || 'default');
    const [unlockedEffects, setUnlockedEffects] = useState<string[]>(() => {
        const stored = localStorage.getItem('spark_unlocked_effects');
        return stored ? JSON.parse(stored) : ['default'];
    });

    useEffect(() => {
        localStorage.setItem('spark_active_theme', activeTheme);
        localStorage.setItem('spark_unlocked_themes', JSON.stringify(unlockedThemes));
        localStorage.setItem('spark_coins', coins.toString());

        localStorage.setItem('spark_active_avatar', activeAvatar);
        localStorage.setItem('spark_unlocked_avatars', JSON.stringify(unlockedAvatars));
        localStorage.setItem('spark_active_effect', activeEffect);
        localStorage.setItem('spark_unlocked_effects', JSON.stringify(unlockedEffects));
    }, [activeTheme, unlockedThemes, coins, activeAvatar, unlockedAvatars, activeEffect, unlockedEffects]);

    const equipTheme = (id: ThemeId) => {
        if (unlockedThemes.includes(id)) {
            setActiveTheme(id);
        }
    };

    const buyTheme = (id: ThemeId) => {
        const theme = THEMES.find(t => t.id === id);
        if (!theme) return false;
        if (unlockedThemes.includes(id)) return true; // Already owned

        if (coins >= theme.price) {
            setCoins(prev => prev - theme.price);
            setUnlockedThemes(prev => [...prev, id]);
            return true;
        }
        return false;
    };

    const addCoins = (amount: number) => {
        setCoins(prev => prev + amount);
    };

    const equipAvatar = (id: string) => {
        if (unlockedAvatars.includes(id) || id === 'default') setActiveAvatar(id);
    };

    const buyAvatar = (id: string) => {
        const item = AVATARS.find(a => a.id === id);
        if (!item) return false;
        if (unlockedAvatars.includes(id)) return true;
        if (coins >= item.price) {
            setCoins(prev => prev - item.price);
            setUnlockedAvatars(prev => [...prev, id]);
            return true;
        }
        return false;
    };

    const equipEffect = (id: string) => {
        if (unlockedEffects.includes(id) || id === 'default') setActiveEffect(id);
    };

    const buyEffect = (id: string) => {
        const item = EFFECTS.find(e => e.id === id);
        if (!item) return false;
        if (unlockedEffects.includes(id)) return true;
        if (coins >= item.price) {
            setCoins(prev => prev - item.price);
            setUnlockedEffects(prev => [...prev, id]);
            return true;
        }
        return false;
    };

    return (
        <ThemeContext.Provider value={{
            activeTheme, unlockedThemes,
            activeAvatar, unlockedAvatars,
            activeEffect, unlockedEffects,
            coins,
            equipTheme, buyTheme,
            equipAvatar, buyAvatar,
            equipEffect, buyEffect,
            addCoins
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
