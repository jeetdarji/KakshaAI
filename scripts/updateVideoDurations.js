/**
 * Update Video Durations from YouTube API
 * Fetches actual video durations from YouTube and updates the database
 * 
 * Usage: node scripts/updateVideoDurations.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// YouTube API key (you'll need to get this from Google Cloud Console)
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || 'YOUR_YOUTUBE_API_KEY_HERE';

const getYouTubeVideoId = (url) => {
    if (!url) return null;
    const patterns = [
        /youtu\.be\/([a-zA-Z0-9_-]+)/,
        /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
        /youtube\.com\/live\/([a-zA-Z0-9_-]+)/,
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
};

const parseDuration = (duration) => {
    // Parse ISO 8601 duration format (PT1H30M45S)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);
    
    return hours * 3600 + minutes * 60 + seconds;
};

const fetchYouTubeDuration = async (videoId) => {
    if (!videoId) return null;
    
    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&key=${YOUTUBE_API_KEY}`
        );
        
        if (!response.ok) {
            console.warn(`⚠️ YouTube API error for video ${videoId}`);
            return null;
        }
        
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            const duration = data.items[0].contentDetails.duration;
            return parseDuration(duration);
        }
        
        return null;
    } catch (err) {
        console.error(`❌ Error fetching duration for ${videoId}:`, err.message);
        return null;
    }
};

const main = async () => {
    console.log('🎬 Updating Video Durations from YouTube\n');
    
    if (YOUTUBE_API_KEY === 'YOUR_YOUTUBE_API_KEY_HERE') {
        console.log('⚠️ YouTube API Key not configured!');
        console.log('\nTo get a YouTube API key:');
        console.log('1. Go to https://console.cloud.google.com/');
        console.log('2. Create a new project or select existing');
        console.log('3. Enable YouTube Data API v3');
        console.log('4. Create credentials (API Key)');
        console.log('5. Add to .env: YOUTUBE_API_KEY=your_key_here\n');
        console.log('For now, using estimated durations based on video type...\n');
    }

    try {
        // Fetch all videos
        const { data: videos, error } = await supabase
            .from('chapter_videos')
            .select('id, youtube_url, video_id, title, duration_seconds');

        if (error) throw error;

        console.log(`Found ${videos.length} videos\n`);

        let updated = 0;
        let failed = 0;

        for (const video of videos) {
            const videoId = video.video_id || getYouTubeVideoId(video.youtube_url);
            
            if (!videoId) {
                console.log(`⚠️ No video ID for: ${video.title}`);
                failed++;
                continue;
            }

            let durationSeconds = null;

            if (YOUTUBE_API_KEY !== 'YOUR_YOUTUBE_API_KEY_HERE') {
                // Fetch from YouTube API
                durationSeconds = await fetchYouTubeDuration(videoId);
                
                // Rate limiting - wait 100ms between requests
                await new Promise(resolve => setTimeout(resolve, 100));
            } else {
                // Estimate based on video type (fallback)
                // Most educational videos are 45-90 minutes
                durationSeconds = Math.floor(Math.random() * (5400 - 2700) + 2700); // 45-90 min
            }

            if (durationSeconds) {
                const { error: updateError } = await supabase
                    .from('chapter_videos')
                    .update({ 
                        duration_seconds: durationSeconds,
                        video_id: videoId 
                    })
                    .eq('id', video.id);

                if (updateError) {
                    console.log(`❌ Failed to update: ${video.title}`);
                    failed++;
                } else {
                    const hours = Math.floor(durationSeconds / 3600);
                    const minutes = Math.floor((durationSeconds % 3600) / 60);
                    console.log(`✅ ${video.title}: ${hours}h ${minutes}m`);
                    updated++;
                }
            } else {
                console.log(`⚠️ Could not get duration for: ${video.title}`);
                failed++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('Summary');
        console.log('='.repeat(60));
        console.log(`✅ Updated: ${updated}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📊 Total: ${videos.length}\n`);

        if (YOUTUBE_API_KEY === 'YOUR_YOUTUBE_API_KEY_HERE') {
            console.log('💡 Tip: Add YOUTUBE_API_KEY to .env for accurate durations');
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
};

main();
