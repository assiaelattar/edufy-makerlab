import { StationType } from '../types';

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

// Station-specific visual themes
// Style: Soft 3D, Claymorphism, Clean, Minimalist, Isomectric, Trending on ArtStation
const BASE_STYLE = "minimalist 3d icon, clay render, soft lighting, vibrant colors, high quality, trending on artstation, no text, clean background";

const STATION_THEMES: Record<StationType, string> = {
    'robotics': 'cute futuristic robot component, electronic circuit board',
    'coding': 'holographic computer screen, code brackets, glowing binary streams',
    'game_design': 'retro arcade joystick, pixel art heart, game controller',
    'multimedia': 'cinema camera, film reel, spotlight, microphone',
    'branding': 'pantone color swatches, fountain pen, vector shapes, lightbulb',
    'engineering': 'gears, blueprints, wrench, mechanical parts',
    'general': 'lightbulb, rocket ship, beaker, pencil, creativity'
};

/**
 * Generates a project thumbnail.
 * Updated to enforce a consistent "Premium 3D" style via Pollinations.ai
 */
export const generateProjectImage = async (title: string, station: StationType, description?: string, apiKey?: string): Promise<{ success: boolean; url?: string; error?: string }> => {

    // We construct a specific prompt ensuring the style is dominant
    // We mix the Title (unique subject) + Station Theme (visual anchor) + Base Style (cohesion)

    const theme = STATION_THEMES[station] || STATION_THEMES.general;
    const safeTitle = title.replace(/[^a-zA-Z0-9 ]/g, ''); // Clean title

    // Prompt Engineering
    // Subject: "A [Title] represented as [Theme]"
    const prompt = `cute 3d isometric render of ${safeTitle} mixed with ${theme}, ${BASE_STYLE}`;

    // URL Construction
    const encodedPrompt = encodeURIComponent(prompt);

    // We use a deterministic seed based on the title length + first char to ensure same title = same image (caching effect)
    // or just random. Let's vary it slightly.
    const seed = Math.floor(Math.random() * 10000);

    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&seed=${seed}&width=1024&height=1024&model=flux`;

    // We can just return this URL directly as success, 
    // since Pollinations generates on the fly.
    // However, to be nice, we verify it works or just return it.

    return Promise.resolve({ success: true, url });
};
