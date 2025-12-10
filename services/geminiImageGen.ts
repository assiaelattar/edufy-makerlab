import { StationType } from '../types';

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

const STATION_PROMPTS: Record<StationType, string> = {
    'robotics': 'A futuristic robot workshop with high-tech parts and blueprints, 3d render, cute style, vibrant colors',
    'coding': 'A digital matrix landscape with glowing code blocks and computer screens, cyberpunk style, vibrant',
    'game_design': 'A video game level design editor interface with pixel art elements, arcade style, colorful',
    'multimedia': 'A creative film studio with cameras, lights, and editing screens, cinematic lighting, 3d render',
    'branding': 'A modern graphic design studio workspace with color palettes and vector shapes, minimal aesthetic',
    'engineering': 'A mechanical engineering workbench with gears, tools, and inventions, steampunk influence, detailed',
    'general': 'A magical maker laboratory with floating tools and sparks of creativity, pixar style, 3d render'
};

/**
 * Generates a project thumbnail using Google's Gemini/Imagen API.
 * @param title Project title
 * @param station Project station type
 * @param apiKey Optional API Key (overrides env)
 * @returns Object containing success status, url (if success), and error message (if failed)
 */
export const generateProjectImage = async (title: string, station: StationType, apiKey?: string): Promise<{ success: boolean; url?: string; error?: string }> => {
    const key = apiKey || GOOGLE_API_KEY;

    if (!key) {
        console.warn("Google API Key is missing.");
        return { success: false, error: "API Key is missing. Please check Settings > API Integrations." };
    }

    if (!key.startsWith('AIza')) {
        console.warn("Invalid API Key format.");
        return { success: false, error: "Invalid API Key format. It should start with 'AIza'." };
    }

    const basePrompt = STATION_PROMPTS[station] || STATION_PROMPTS.general;
    const fullPrompt = `Create a thumbnail image for a student project titled "${title}". Theme: ${basePrompt}. High quality, colorful, suitable for kids education app.`;

    try {
        // Attempting to use the Gemini 1.5 Flash endpoint
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `[IMAGE GENERATION REQUEST] ${fullPrompt} \n\n(Note: If you cannot generate images directly, please describe the image in detail)`
                    }]
                }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Gemini API Error:", data);
            return { success: false, error: data.error?.message || `API Error: ${response.statusText}` };
        }

        if (data.candidates && data.candidates[0].content) {
            const text = data.candidates[0].content.parts[0].text;

            // Check for markdown image
            const imgMatch = text.match(/!\[.*?\]\((.*?)\)/);
            if (imgMatch) return { success: true, url: imgMatch[1] };

            // Fallback to Pollinations.ai
            const enhancedPrompt = encodeURIComponent(text.slice(0, 100));
            const pollinationUrl = `https://image.pollinations.ai/prompt/${enhancedPrompt}?nologo=true`;
            return { success: true, url: pollinationUrl };
        }

        return { success: false, error: "No content generated. The model might be overloaded." };

    } catch (error: any) {
        console.error("Error generating project image:", error);
        return { success: false, error: error.message || "Network error occurred." };
    }
};
