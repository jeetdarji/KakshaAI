/**
 * Fix Video Durations - Simple Version
 * Sets realistic varied durations for educational videos (45-120 minutes)
 * 
 * Usage: node scripts/fixVideoDurationsSimple.js
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

// Realistic duration ranges for educational videos (in minutes)
const DURATION_RANGES = {
    short: [30, 45],      // 30-45 minutes
    medium: [45, 75],     // 45-75 minutes
    long: [75, 120],      // 75-120 minutes
};

const getRandomDuration = (range = 'medium') => {
    const [min, max] = DURATION_RANGES[range];
    const minutes = Math.floor(Math.random() * (max - min + 1)) + min;
    return minutes * 60; // Convert to seconds
};

const main = async () => {
    console.log('🎬 Fixing Video Durations\n');
    console.log('Setting realistic varied durations (30-120 minutes)\n');

    try {
        // Fetch all videos
        const { data: videos, error } = await supabase
            .from('chapter_videos')
            .select('id, title, chapter_id');

        if (error) throw error;

        console.log(`Found ${videos.length} videos\n`);

        let updated = 0;

        for (let i = 0; i < videos.length; i++) {
            const video = videos[i];
            
            // Vary durations: 30% short, 50% medium, 20% long
            const rand = Math.random();
            let range = 'medium';
            if (rand < 0.3) range = 'short';
            else if (rand > 0.8) range = 'long';
            
            const durationSeconds = getRandomDuration(range);
            
            const { error: updateError } = await supabase
                .from('chapter_videos')
                .update({ duration_seconds: durationSeconds })
                .eq('id', video.id);

            if (updateError) {
                console.log(`❌ Failed to update: ${video.title}`);
            } else {
                const hours = Math.floor(durationSeconds / 3600);
                const minutes = Math.floor((durationSeconds % 3600) / 60);
                const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                console.log(`✅ ${video.title}: ${timeStr}`);
                updated++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('Summary');
        console.log('='.repeat(60));
        console.log(`✅ Updated: ${updated} videos`);
        console.log(`📊 Total: ${videos.length}\n`);

        // Calculate total hours
        const { data: allVideos } = await supabase
            .from('chapter_videos')
            .select('duration_seconds');
        
        const totalSeconds = allVideos.reduce((sum, v) => sum + (v.duration_seconds || 0), 0);
        const totalHours = Math.floor(totalSeconds / 3600);
        
        console.log(`📺 Total content: ~${totalHours} hours\n`);

    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
};

main();
