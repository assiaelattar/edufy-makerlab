
export const AVATAR_CATEGORIES = [
    {
        id: 'robots',
        label: 'Engineering Bots',
        baseUrl: 'https://api.dicebear.com/7.x/bottts/svg',
        seeds: ['Sparky', 'Gear', 'Servo', 'Volt', 'Pixel', 'Chip', 'Nano', 'Byte', 'Mega', 'Giga', 'Tera', 'Peta']
    },
    {
        id: 'explorers',
        label: 'Space Explorers',
        baseUrl: 'https://api.dicebear.com/7.x/adventurer/svg',
        seeds: ['Astra', 'Cosmo', 'Nova', 'Orion', 'Luna', 'Mars', 'Jupiter', 'Star', 'Comet', 'Rocket', 'Galaxy', 'Nebula']
    },
    {
        id: 'creatures',
        label: 'Creative Creatures',
        baseUrl: 'https://api.dicebear.com/7.x/fun-emoji/svg',
        seeds: ['Happy', 'Smart', 'Cool', 'Wink', 'Laugh', 'Idea', 'Think', 'Wow', 'Love', 'Star', 'Fire', 'Zap']
    }
];

export const getAvatarUrl = (category: string, seed: string) => {
    const cat = AVATAR_CATEGORIES.find(c => c.id === category);
    if (!cat) return `https://api.dicebear.com/7.x/identicon/svg?seed=${seed}`;
    return `${cat.baseUrl}?seed=${seed}`;
};

export const getRandomAvatar = () => {
    const cat = AVATAR_CATEGORIES[Math.floor(Math.random() * AVATAR_CATEGORIES.length)];
    const seed = cat.seeds[Math.floor(Math.random() * cat.seeds.length)];
    return getAvatarUrl(cat.id, seed);
};
