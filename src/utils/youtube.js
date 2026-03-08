/**
 * YouTube Utility Functions
 * Extract video IDs and generate thumbnail URLs from YouTube links
 */

/**
 * Extract video ID from various YouTube URL formats
 * Supports: youtu.be, youtube.com/watch, youtube.com/live
 * @param {string} url - YouTube URL
 * @returns {string|null} - Video ID or null if not found
 */
export const getYouTubeVideoId = (url) => {
    if (!url) return null;

    const patterns = [
        /youtu\.be\/([a-zA-Z0-9_-]+)/,           // youtu.be/VIDEO_ID
        /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/, // youtube.com/watch?v=VIDEO_ID
        /youtube\.com\/live\/([a-zA-Z0-9_-]+)/,   // youtube.com/live/VIDEO_ID
        /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,  // youtube.com/embed/VIDEO_ID
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }

    return null;
};

/**
 * Get YouTube thumbnail URL from video ID
 * @param {string} videoId - YouTube video ID
 * @param {string} quality - Thumbnail quality (maxresdefault, hqdefault, mqdefault, sddefault, default)
 * @returns {string} - Thumbnail URL
 */
export const getYouTubeThumbnail = (videoId, quality = 'hqdefault') => {
    if (!videoId) return null;
    // Using hqdefault as default since maxresdefault may not exist for all videos
    return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
};

/**
 * Get YouTube embed URL for iframe
 * @param {string} videoId - YouTube video ID
 * @returns {string} - Embed URL
 */
export const getYouTubeEmbedUrl = (videoId) => {
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}`;
};

/**
 * Extract video ID and get thumbnail from URL
 * @param {string} url - YouTube URL
 * @param {string} quality - Thumbnail quality
 * @returns {object} - { videoId, thumbnailUrl, embedUrl }
 */
export const parseYouTubeUrl = (url, quality = 'hqdefault') => {
    const videoId = getYouTubeVideoId(url);
    return {
        videoId,
        thumbnailUrl: getYouTubeThumbnail(videoId, quality),
        embedUrl: getYouTubeEmbedUrl(videoId),
    };
};

/**
 * Format duration in seconds to readable format
 * @param {number} seconds - Duration in seconds
 * @returns {string} - Formatted duration (MM:SS or H:MM:SS)
 */
export const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Parse ISO 8601 duration format (PT1H30M45S) to seconds
 * @param {string} duration - ISO 8601 duration string
 * @returns {number} - Duration in seconds
 */
export const parseISO8601Duration = (duration) => {
    if (!duration) return 0;
    
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);
    
    return hours * 3600 + minutes * 60 + seconds;
};

/**
 * Fetch video duration from YouTube (using oEmbed - no API key needed)
 * Note: oEmbed doesn't provide duration, so this is a fallback
 * For accurate durations, use YouTube Data API v3
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<number|null>} - Duration in seconds or null
 */
export const getYouTubeDuration = async (videoId) => {
    if (!videoId) return null;
    
    try {
        // Note: This requires YouTube Data API v3 key
        // For now, return null and handle on backend or use iframe API
        console.warn('YouTube duration fetch requires API key. Use iframe API or backend.');
        return null;
    } catch (err) {
        console.error('Error fetching YouTube duration:', err);
        return null;
    }
};

/**
 * Get video duration using YouTube iframe API (client-side)
 * This should be called after the video player is loaded
 * @param {object} player - YouTube player instance
 * @returns {number} - Duration in seconds
 */
export const getPlayerDuration = (player) => {
    try {
        if (player && typeof player.getDuration === 'function') {
            return Math.floor(player.getDuration());
        }
        return 0;
    } catch (err) {
        console.error('Error getting player duration:', err);
        return 0;
    }
};

export default {
    getYouTubeVideoId,
    getYouTubeThumbnail,
    getYouTubeEmbedUrl,
    parseYouTubeUrl,
    formatDuration,
    parseISO8601Duration,
    getYouTubeDuration,
    getPlayerDuration,
};
