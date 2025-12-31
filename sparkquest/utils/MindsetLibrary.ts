
export interface MindsetTip {
    id: string;
    text: string;
    author?: string;
    category: 'engineering' | 'creativity' | 'resilience' | 'collaboration';
}

export const MINDSET_LIBRARY: MindsetTip[] = [
    // Engineering Mindset
    { id: 'e1', text: "Engineers don't fail, they just find 10,000 ways that won't work.", author: "Thomas Edison", category: 'engineering' },
    { id: 'e2', text: "The best way to predict the future is to invent it.", author: "Alan Kay", category: 'engineering' },
    { id: 'e3', text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci", category: 'engineering' },
    { id: 'e4', text: "Measure twice, cut once.", category: 'engineering' },

    // Creativity
    { id: 'c1', text: "Creativity is intelligence having fun.", author: "Albert Einstein", category: 'creativity' },
    { id: 'c2', text: "Every artist was first an amateur.", author: "Ralph Waldo Emerson", category: 'creativity' },
    { id: 'c3', text: "You can't use up creativity. The more you use, the more you have.", author: "Maya Angelou", category: 'creativity' },

    // Resilience / Growth
    { id: 'r1', text: "Mistakes are proof that you are trying.", category: 'resilience' },
    { id: 'r2', text: "It always seems impossible until it's done.", author: "Nelson Mandela", category: 'resilience' },
    { id: 'r3', text: "Fall seven times, stand up eight.", author: "Japanese Proverb", category: 'resilience' },
    { id: 'r4', text: "I have not failed. I've just found 10,000 ways that won't work.", author: "Thomas Edison", category: 'resilience' },

    // Collaboration
    { id: 'col1', text: "Alone we can do so little; together we can do so much.", author: "Helen Keller", category: 'collaboration' },
    { id: 'col2', text: "Talent wins games, but teamwork and intelligence win championships.", author: "Michael Jordan", category: 'collaboration' },
];

export const getRandomMindset = (): MindsetTip => {
    return MINDSET_LIBRARY[Math.floor(Math.random() * MINDSET_LIBRARY.length)];
};

export const getProjectIcon = (title: string): string => {
    const lower = title.toLowerCase();
    if (lower.includes('robot') || lower.includes('bot') || lower.includes('mech')) return '🤖';
    if (lower.includes('space') || lower.includes('mars') || lower.includes('moon')) return '🚀';
    if (lower.includes('car') || lower.includes('vehicle') || lower.includes('racer')) return '🏎️';
    if (lower.includes('game') || lower.includes('play')) return '🎮';
    if (lower.includes('art') || lower.includes('design') || lower.includes('draw')) return '🎨';
    if (lower.includes('music') || lower.includes('sound')) return '🎵';
    if (lower.includes('code') || lower.includes('app') || lower.includes('web')) return '💻';
    if (lower.includes('plant') || lower.includes('garden') || lower.includes('bio')) return '🌱';
    if (lower.includes('water') || lower.includes('sea') || lower.includes('ocean')) return '🌊';
    if (lower.includes('light') || lower.includes('lamp')) return '💡';
    return '⚡'; // Default Spark
};
