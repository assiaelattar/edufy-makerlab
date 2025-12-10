import { StationType } from '../types';

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const SEARCH_ENGINE_ID = import.meta.env.VITE_GOOGLE_SEARCH_ENGINE_ID;

const STATION_KEYWORDS: Record<StationType, string> = {
    'robotics': 'futuristic robot technology engineering',
    'coding': 'computer programming code matrix cyberpunk',
    'game_design': 'video game level design pixel art arcade',
    'multimedia': 'video production camera film studio creative',
    'branding': 'graphic design branding logo creative minimal',
    'engineering': 'mechanical engineering blueprints gears construction',
    'general': 'innovation creativity stem education maker'
};

/**
 * Searches for a relevant project image using Google Custom Search API.
 * @param title Project title
 * @param station Project station type
 * @param apiKey Optional API Key (overrides env)
 * @param searchEngineId Optional Search Engine ID (overrides env)
 * @returns URL of the first image result or null if failed
 */
export const searchProjectImage = async (title: string, station: StationType, apiKey?: string, searchEngineId?: string): Promise<string | null> => {
    const key = apiKey || GOOGLE_API_KEY;
    const cx = searchEngineId || SEARCH_ENGINE_ID;

    if (!key || !cx) {
        console.warn("Google API Key or Search Engine ID is missing.");
        return null;
    }

    const themeKeywords = STATION_KEYWORDS[station] || STATION_KEYWORDS.general;
    const query = `"${title}" ${themeKeywords} wallpaper high quality`;
    const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&cx=${cx}&key=${key}&searchType=image&num=1&safe=active&imgSize=large`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
            return data.items[0].link;
        } else {
            console.warn("No images found for query:", query);
            return null;
        }
    } catch (error) {
        console.error("Error searching for project image:", error);
        return null;
    }
};
