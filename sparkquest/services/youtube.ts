
interface YouTubeVideo {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    channelTitle: string;
    duration: string; // ISO 8601 (PT1H2M)
    categoryId?: string;
}

interface PlaylistImportResult {
    playlistTitle: string;
    videos: YouTubeVideo[];
}

/**
 * Parses ISO 8601 duration (e.g. PT1H2M10S) to total minutes
 */
const parseDuration = (duration: string): number => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;

    const hours = (parseInt(match[1] || '0') || 0);
    const minutes = (parseInt(match[2] || '0') || 0);
    const seconds = (parseInt(match[3] || '0') || 0);

    return (hours * 60) + minutes + (seconds > 30 ? 1 : 0);
};

export const fetchYouTubePlaylist = async (playlistId: string, apiKey: string): Promise<PlaylistImportResult> => {
    try {
        // 1. Get Playlist Details (Title)
        const playlistUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${apiKey}`;
        const playlistResp = await fetch(playlistUrl);
        const playlistData = await playlistResp.json();

        // Check for API Error specifically
        if (playlistData.error) {
            throw new Error(`YouTube API Error: ${playlistData.error.message} (Code: ${playlistData.error.code})`);
        }

        if (!playlistData.items || playlistData.items.length === 0) {
            throw new Error('Playlist not found (or Private)');
        }

        const playlistTitle = playlistData.items[0].snippet.title;

        // 2. Get Playlist Items (Video IDs)
        // Max 50 items for this iteration to avoid pagination complexity for now
        const itemsUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${apiKey}`;
        const itemsResp = await fetch(itemsUrl);
        const itemsData = await itemsResp.json();

        if (!itemsData.items) throw new Error('Failed to fetch playlist items');

        const videoIds = itemsData.items.map((item: any) => item.snippet.resourceId.videoId).join(',');

        // 3. Get Video Details (Duration)
        const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds}&key=${apiKey}`;
        const videosResp = await fetch(videosUrl);
        const videosData = await videosResp.json();

        if (!videosData.items) throw new Error('Failed to fetch video details');

        const videos: YouTubeVideo[] = videosData.items.map((item: any) => ({
            id: item.id,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || '',
            channelTitle: item.snippet.channelTitle,
            duration: item.contentDetails.duration,
            categoryId: item.snippet.categoryId
        }));

        return {
            playlistTitle,
            videos
        };

    } catch (error) {
        console.error("YouTube Import Error:", error);
        throw error;
    }
};

export const extractPlaylistId = (url: string): string | null => {
    if (!url) return null;
    const cleanUrl = url.trim();

    // 1. Check if it's already just an ID (starts with PL or just alphanumeric)
    // Playlist IDs usually start with PL, but can be just alphanumeric
    if (/^PL[a-zA-Z0-9_-]+$/.test(cleanUrl)) return cleanUrl;
    if (/^[a-zA-Z0-9_-]+$/.test(cleanUrl) && cleanUrl.length > 10) return cleanUrl;

    // 2. Regex for URL (list=...)
    const reg = /[?&]list=([^&]+)/i;
    const match = cleanUrl.match(reg);
    return match ? match[1] : null;
};

export { parseDuration };
