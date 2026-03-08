/**
 * Study Hub Data Population Script
 * Populates the Supabase database with chapters, videos, notes, and MCQs
 * 
 * Usage: 
 *   npm run populate          # Populate all data
 *   npm run populate:chapters # Only chapters
 *   npm run populate:videos   # Only videos
 *   npm run populate:notes    # Only notes
 *   npm run populate:mcqs     # Only MCQs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Supabase client with SERVICE ROLE KEY (bypasses RLS for admin operations)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// Prefer service role key for admin operations, fallback to anon key
const supabaseKey = supabaseServiceKey || supabaseAnonKey;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env file');
    console.error('   Required: VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

if (!supabaseServiceKey) {
    console.warn('⚠️ Using anon key - RLS policies may block inserts!');
    console.warn('   Add VITE_SUPABASE_SERVICE_ROLE_KEY for full admin access.\n');
} else {
    console.log('🔑 Using service role key (RLS bypassed)\n');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============ YOUTUBE UTILITIES ============

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

const getYouTubeThumbnail = (videoId) => {
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
};

// ============ CHAPTER DATA ============

const chaptersData = {
    'Physics': {
        11: [
            { title: 'Vectors', video_url: 'https://youtu.be/rLmVC53EwVo?si=xjtHHiOy6ZfOYmns' },
            { title: 'Error Analysis', video_url: 'https://youtu.be/tx76BJIqOd4?si=izMjqWv-vrIBA-yT' },
            { title: 'Motion in a Plane', video_url: 'https://youtu.be/V_D4SG_nU3o?si=X1DtUTgl60brXzjH' },
            { title: 'Laws of Motion', video_url: 'https://www.youtube.com/live/aPwqkZCBouU?si=cQyLGAzxkr4lZAz6' },
            { title: 'Gravitation', video_url: 'https://youtu.be/1_ZFWFFoPu8?si=9tjf3t-HEkcbd_LY' },
            { title: 'Thermal Properties of Matter', video_url: 'https://youtu.be/sV95Rh7Nvis?si=tv0OuqCIRDcIzh_O' },
            { title: 'Sound', video_url: 'https://youtu.be/LH-0UfpguJg?si=bvLJDv8Xj80T5NC0' },
            { title: 'Optics', video_url: 'https://youtu.be/ovfNP_TqolM?si=Is7bLBgfOcXuYG_G' },
            { title: 'Electrostatics', video_url: 'https://www.youtube.com/live/McVkTgpSa6Y?si=0a1Mpe7hSCxwaWlz' },
            { title: 'Semiconductors', video_url: 'https://youtu.be/6hqHDF8kUqY?si=XRSy1MReHYG1-jiY' },
        ],
        12: [
            { title: 'Circular Motion', video_url: 'https://youtu.be/YX5Vu0NEzp0?si=0WxKk0VtKk6iL9-q' },
            { title: 'Gravitation', video_url: 'https://youtu.be/1_ZFWFFoPu8?si=4WEmoWHPNGfxyXaC' },
            { title: 'Rotational Motion', video_url: 'https://youtu.be/YX5Vu0NEzp0?si=MVhfZK33yg2yjTlQ' },
            { title: 'Oscillations', video_url: 'https://youtu.be/EH5Q4DhvwVI?si=XfgJp6yWLXRNfMEh' },
            { title: 'Elasticity', video_url: 'https://www.youtube.com/live/Tu6L_h7cBFo?si=SZQj3NDCxJcfXhFL' },
            { title: 'Surface Tension', video_url: 'https://www.youtube.com/live/srJPN_cZ7Es?si=22an-pVrSxwjLWlN' },
            { title: 'Wave Motion', video_url: 'https://youtu.be/2MW5loYbNps?si=TgxFQU_4pYBZf6Ib' },
            { title: 'Stationary Waves', video_url: 'https://youtu.be/2MW5loYbNps?si=PWlnmdVchY8fzx14' },
            { title: 'Wave Theory of Light', video_url: 'https://youtu.be/yY6ChKn7thM?si=22AKYK71oqawr49w' },
            { title: 'Electrostatics', video_url: 'https://youtu.be/tYOSHrnogyw?si=Is5VVqtvk4VaUoy1' },
            { title: 'Current Electricity', video_url: 'https://youtu.be/6zkQLycxlwI?si=kJd5d-NIieyA4x9c' },
            { title: 'Magnetism', video_url: 'https://youtu.be/j7BaaZ1iHy4?si=qYaKgGQZSFZpf9YP' },
            { title: 'Electromagnetic Inductions', video_url: 'https://youtu.be/73KrbNtGwv0?si=gk4Zz4GyYOEU0Vh6' },
            { title: 'Electrons and Photons', video_url: 'https://youtu.be/EwlWssWqb0c?si=OG_zO5dn42Yj10Y6' },
            { title: 'Semiconductors', video_url: 'https://youtu.be/xR07lQ3Xpcs?si=Y_4qDxfgnj461dD3' },
            { title: 'Communication Systems', video_url: 'https://youtu.be/HutkdebvLZw?si=qIZSPu2BUMzNzAyA' },
            { title: 'Kinetic Theory of Gases', video_url: 'https://youtu.be/XTYX9rSKufc?si=SxIgkCrDzcLv96ly' },
        ],
    },
    'Chemistry': {
        11: [
            { title: 'Some Basic Concepts of Chemistry', video_url: 'https://youtu.be/1AAdCJC4IzQ?si=RdcRAZfCA1i_G_44' },
            { title: 'Structure of Atom', video_url: 'https://youtu.be/yR2bLgqFp5I?si=pN5NvcY1q3XwX7ns' },
            { title: 'Chemical Bonding', video_url: 'https://youtu.be/kT8eBjfOQRk?si=MnASERXaZm8LM98m' },
            { title: 'States of Matter: Gases and Liquids', video_url: 'https://youtu.be/CbKJ3HoVQd0?si=8IUF9rVz-Xeqhz4X' },
            { title: 'Redox Reactions', video_url: 'https://youtu.be/KLlXmCFWklQ?si=4FGOg6dOrjULwQvR' },
            { title: 'Elements of Groups 1 and 2', video_url: 'https://youtu.be/n-wXJDlRGIo?si=mYkjEhDXLmokq5St' },
            { title: 'Adsorption and Colloids', video_url: 'https://youtu.be/Ae8H4TRv8xU?si=qEh0V-X9kTDWIhLE' },
            { title: 'Hydrocarbons', video_url: 'https://youtu.be/O-n2wv1bVn8?si=J6_GOaEYgyE548W8' },
            { title: 'Basic Principles of Organic Chemistry', video_url: 'https://youtu.be/xAI7Tj6N9Fw?si=cwIiJnlshodAUzjI' },
            { title: 'Chemistry in Everyday Life', video_url: 'https://youtu.be/RE0h7DF8kqE?si=faRR9mT0EKS9KQ1n' },
        ],
        12: [
            { title: 'Solid State', video_url: 'https://www.youtube.com/live/IbxtdBhNsbA?si=7tty6DYKqSG2tvEO' },
            { title: 'Solutions and Colligative Properties', video_url: 'https://www.youtube.com/live/rYsMpcjioV4?si=zqJJAnQCveXDvVUJ' },
            { title: 'Chemical Thermodynamics and Electrochemistry', video_url: 'https://youtu.be/ZXcAJI91bHQ?si=EvySgEl8L2uZDMNy' },
            { title: 'Chemical Kinetics', video_url: 'https://youtu.be/uZ2A7JEh04A?si=73ly6D7nlSPoqJ-w' },
            { title: 'p-Block Elements', video_url: 'https://www.youtube.com/live/dHc-lZXI63A?si=MaclWf-MqBDpRPc9' },
            { title: 'd and f Block Elements', video_url: 'https://www.youtube.com/live/jkvPgY1GPIU?si=GFLDfrccXgxTNsdP' },
            { title: 'Coordination Compounds', video_url: 'https://youtu.be/XCKkabM_808?si=AHm9Fdx_IO4oLtyS' },
            { title: 'Halogen Derivatives, Alcohols, Phenols, and Ethers', video_url: 'https://youtu.be/DVoX00uBMV0?si=QZvlrDUVHXHbM4Rr' },
            { title: 'Biomolecules and Polymers', video_url: 'https://www.youtube.com/live/XvhUDq3tBJk?si=Ng9Gu_Wo3zfd5dSC' },
            { title: 'Chemistry in Everyday Life', video_url: 'https://youtu.be/xcR_hM0_aYA?si=2RUW8K0HLaVE8Zmw' },
        ],
    },
    'Maths': {
        11: [
            { title: 'Trigonometry II', video_url: 'https://youtu.be/dLsOv3GXKCk?si=Y8rSB8Y96ahEp3Ep' },
            { title: 'Straight Lines', video_url: 'https://youtu.be/lRrHW6hfAiA?si=fzY-sgsCuLSIAF3Q' },
            { title: 'Circles', video_url: 'https://youtu.be/FzomHVwCN5w?si=lAW3IBzS5ymukej8' },
            { title: 'Probability', video_url: 'https://youtu.be/5Ok1AkHBsnw?si=vhBvJgcYXRaZJFVY' },
            { title: 'Complex Numbers', video_url: 'https://youtu.be/7tu6_GH5qAw?si=P6bDMpK-UnLwldGU' },
            { title: 'Permutations and Combinations', video_url: 'https://youtu.be/Y1X_zLptX_E?si=BHMdqOvO7cR0HKlc' },
            { title: 'Functions', video_url: 'https://youtu.be/4VXUlNRlT3c?si=SJ_cNK9ME-bfbb-E' },
            { title: 'Limits', video_url: 'https://youtu.be/CHWhaAlo_ms?si=jI7InuQ5k6mt1l_I' },
            { title: 'Continuity', video_url: 'https://www.youtube.com/live/81v0t4OG6Wc?si=bYICcyaryfzii5Ua' },
            { title: 'Conic Sections', video_url: 'https://youtu.be/5w2tWzcsiy4?si=bflBLlagnvMRwVWD' },
        ],
        12: [
            { title: 'Mathematical Logic', video_url: 'https://www.youtube.com/live/bocxRzjowMY?si=VRPALvuBTPoVBiyi' },
            { title: 'Matrices', video_url: 'https://youtu.be/RN8mxVm_vl4?si=dvjqLm5fSIIbbTDz' },
            { title: 'Trigonometric Functions', video_url: 'https://youtu.be/pKvvCiuKc_Y?si=iNlW8T7HFKtYr_3o' },
            { title: 'Pair of Straight Lines', video_url: 'https://www.youtube.com/live/7R3h-KuRe9c?si=ucM5wIzbaXVLjl-e' },
            { title: 'Circles', video_url: 'https://www.youtube.com/live/6JA8YchdQaQ?si=5IVRvMLcUMStuEHx' },
            { title: 'Conics', video_url: 'https://youtu.be/-SdrIW0dJbw?si=B8mWq_Q0J0fV03FW' },
            { title: 'Vectors', video_url: 'https://youtu.be/lmX293yO-O4?si=ZSDYAlcJm-j5OLRz' },
            { title: 'Three-Dimensional Geometry', video_url: 'https://youtu.be/91D__gQVr5M?si=kSubsnnVp2ATCkV9' },
            { title: 'Line and Plane', video_url: 'https://youtu.be/Dgm3o778qE4?si=DLFd2476huwgjd_X' },
            { title: 'Linear Programming Problems', video_url: 'https://youtu.be/5vGG5xqyRso?si=tgNVIszo8I6PIMfG' },
            { title: 'Continuity and Differentiation', video_url: 'https://youtu.be/FQ4Rj__AnkU?si=-ytFFVExow_nQgv5' },
            { title: 'Application of Derivatives', video_url: 'https://youtu.be/hbmPI4WqtM0?si=OGR7g4wl3VEl4EFf' },
            { title: 'Integration', video_url: 'https://youtu.be/RKvZAozl9Sk?si=l9OaBjigStO87LXn' },
            { title: 'Applications of Definite Integral', video_url: 'https://youtu.be/g9rlNzb46SA?si=sdLe81xEnwVrYhRn' },
        ],
    },
};

// ============ HELPER FUNCTIONS ============

const toKebabCase = (str) => {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
};

const getStoragePath = (subject, classYear, chapterTitle) => {
    const subjectLower = subject.toLowerCase();
    const fileName = `${toKebabCase(chapterTitle)}.pdf`;
    return `chapter-notes/${subjectLower}-${classYear}/${fileName}`;
};

const getStoragePublicUrl = (filePath) => {
    return `${supabaseUrl}/storage/v1/object/public/${filePath}`;
};

// ============ POPULATE CHAPTERS ============

const populateChapters = async () => {
    console.log('\n📚 Populating chapters table...\n');

    const chaptersToInsert = [];
    let orderIndex = 0;

    for (const subject of Object.keys(chaptersData)) {
        for (const classYear of Object.keys(chaptersData[subject])) {
            const chapters = chaptersData[subject][classYear];

            for (const chapter of chapters) {
                const videoId = getYouTubeVideoId(chapter.video_url);

                chaptersToInsert.push({
                    title: chapter.title,
                    subject: subject,
                    class: parseInt(classYear),
                    order_index: orderIndex++,
                    total_topics: 10,
                    thumbnail_url: getYouTubeThumbnail(videoId),
                    description: `Complete ${chapter.title} chapter for MHT-CET preparation.`,
                });
            }
        }
    }

    console.log(`   Inserting ${chaptersToInsert.length} chapters...`);

    // Simple insert (no upsert)
    const { data, error } = await supabase
        .from('chapters')
        .insert(chaptersToInsert)
        .select();

    if (error) {
        console.error('❌ Error inserting chapters:', error.message);
        console.log('   Hint: If duplicates exist, you may need to clear the table first.');
        return [];
    }

    console.log(`✅ Inserted ${data.length} chapters`);
    return data;
};

// ============ POPULATE VIDEOS ============

const populateVideos = async (chapters) => {
    console.log('\n🎬 Populating chapter_videos table...\n');

    if (!chapters || chapters.length === 0) {
        const { data } = await supabase.from('chapters').select('*');
        chapters = data || [];
    }

    if (chapters.length === 0) {
        console.warn('⚠️ No chapters found in database. Please run populate:chapters first.');
        return [];
    }

    const videosToInsert = [];

    for (const subject of Object.keys(chaptersData)) {
        for (const classYear of Object.keys(chaptersData[subject])) {
            const chaptersList = chaptersData[subject][classYear];

            for (const chapterData of chaptersList) {
                const chapter = chapters.find(
                    c => c.title === chapterData.title &&
                        c.subject === subject &&
                        c.class === parseInt(classYear)
                );

                if (!chapter) {
                    console.warn(`⚠️ Chapter not found: ${chapterData.title}`);
                    continue;
                }

                const videoId = getYouTubeVideoId(chapterData.video_url);

                videosToInsert.push({
                    chapter_id: chapter.id,
                    title: `${chapterData.title} - Complete Lecture`,
                    youtube_url: chapterData.video_url,  // ✅ Changed from video_url
                    video_id: videoId,
                    thumbnail_url: getYouTubeThumbnail(videoId),
                    duration_seconds: 3600,  // ✅ Changed from duration: '60:00'
                    order_index: 0,
                });
            }
        }
    }

    console.log(`   Inserting ${videosToInsert.length} videos...`);

    const { data, error } = await supabase
        .from('chapter_videos')
        .insert(videosToInsert)
        .select();

    if (error) {
        console.error('❌ Error inserting videos:', error.message);
        return [];
    }

    console.log(`✅ Inserted ${data.length} videos`);
    return data;
};

// ============ POPULATE NOTES ============

const populateNotes = async (chapters) => {
    console.log('\n📝 Populating chapter_notes table...\n');

    if (!chapters || chapters.length === 0) {
        const { data } = await supabase.from('chapters').select('*');
        chapters = data || [];
    }

    if (chapters.length === 0) {
        console.warn('⚠️ No chapters found in database.');
        return [];
    }

    const notesToInsert = [];

    for (const chapter of chapters) {
        const storagePath = getStoragePath(chapter.subject, chapter.class, chapter.title);

        notesToInsert.push({
            chapter_id: chapter.id,
            title: `${chapter.title} - Complete Notes`,
            file_path: storagePath,
            file_url: getStoragePublicUrl(storagePath),
            file_size: '2.5 MB',
            page_count: 20,
            note_type: 'typed',
        });
    }

    console.log(`   Inserting ${notesToInsert.length} notes...`);

    const { data, error } = await supabase
        .from('chapter_notes')
        .insert(notesToInsert)
        .select();

    if (error) {
        console.error('❌ Error inserting notes:', error.message);
        return [];
    }

    console.log(`✅ Inserted ${data.length} notes`);
    return data;
};

// ============ POPULATE MCQs ============

const populateMCQs = async (chapters) => {
    console.log('\n❓ Populating practice_questions table...\n');

    if (!chapters || chapters.length === 0) {
        const { data } = await supabase.from('chapters').select('*');
        chapters = data || [];
    }

    if (chapters.length === 0) {
        console.warn('⚠️ No chapters found in database.');
        return 0;
    }

    const mcqFiles = [
        { file: 'Physics11-mcq-data.json', subject: 'Physics', class: 11 },
        { file: 'Physics12-mcq-data.json', subject: 'Physics', class: 12 },
        { file: 'Chemistry11-mcq-data.json', subject: 'Chemistry', class: 11 },
        { file: 'Chemistry12-mcq-data.json', subject: 'Chemistry', class: 12 },
        { file: 'Maths11-mcq-data.json', subject: 'Maths', class: 11 },
        { file: 'Maths12-mcq-data.json', subject: 'Maths', class: 12 },
    ];

    let totalInserted = 0;

    for (const mcqFile of mcqFiles) {
        const filePath = path.resolve(__dirname, mcqFile.file);

        if (!fs.existsSync(filePath)) {
            console.warn(`⚠️ MCQ file not found: ${mcqFile.file}`);
            continue;
        }

        console.log(`📖 Reading ${mcqFile.file}...`);

        try {
            const fileContent = fs.readFileSync(filePath, 'utf-8');

            // Handle empty files
            if (!fileContent.trim()) {
                console.warn(`⚠️ MCQ file is empty: ${mcqFile.file}`);
                continue;
            }

            const mcqData = JSON.parse(fileContent);

            const subjectChapters = chapters.filter(
                c => c.subject === mcqFile.subject && c.class === mcqFile.class
            ).sort((a, b) => a.order_index - b.order_index);

            if (subjectChapters.length === 0) {
                console.warn(`⚠️ No chapters found for ${mcqFile.subject} ${mcqFile.class}`);
                continue;
            }

            let questionsToInsert = [];

            if (Array.isArray(mcqData)) {
                // Flat array - distribute across chapters
                const questionsPerChapter = 10;
                for (let i = 0; i < subjectChapters.length; i++) {
                    const chapter = subjectChapters[i];
                    const startIdx = i * questionsPerChapter;
                    const chapterQuestions = mcqData.slice(startIdx, startIdx + questionsPerChapter);

                    for (let j = 0; j < chapterQuestions.length; j++) {
                        const q = chapterQuestions[j];
                        questionsToInsert.push({
                            chapter_id: chapter.id,
                            question_text: q.question,
                            option_a: q.options?.a || q.options?.A || '',
                            option_b: q.options?.b || q.options?.B || '',
                            option_c: q.options?.c || q.options?.C || '',
                            option_d: q.options?.d || q.options?.D || '',
                            correct_answer: (q.answer || '').toLowerCase(),
                            order_index: j,
                        });
                    }
                }
            } else if (typeof mcqData === 'object') {
                // Object with chapter names as keys
                for (const chapterName of Object.keys(mcqData)) {
                    // Find matching chapter (flexible matching)
                    const chapter = subjectChapters.find(c => {
                        const cTitle = c.title.toLowerCase();
                        const mcqTitle = chapterName.toLowerCase();
                        return cTitle === mcqTitle ||
                            cTitle.includes(mcqTitle) ||
                            mcqTitle.includes(cTitle);
                    });

                    if (!chapter) {
                        console.warn(`   ⚠️ Chapter not matched: "${chapterName}"`);
                        continue;
                    }

                    const questions = mcqData[chapterName];
                    console.log(`   Processing ${questions.length} questions for "${chapter.title}"`);

                    for (let j = 0; j < questions.length; j++) {
                        const q = questions[j];
                        questionsToInsert.push({
                            chapter_id: chapter.id,
                            question_text: q.question,
                            option_a: q.options?.a || q.options?.A || '',
                            option_b: q.options?.b || q.options?.B || '',
                            option_c: q.options?.c || q.options?.C || '',
                            option_d: q.options?.d || q.options?.D || '',
                            correct_answer: (q.answer || '').toLowerCase(),
                            order_index: j,
                        });
                    }
                }
            }

            if (questionsToInsert.length > 0) {
                // Insert in batches of 50
                const batchSize = 50;
                for (let i = 0; i < questionsToInsert.length; i += batchSize) {
                    const batch = questionsToInsert.slice(i, i + batchSize);

                    const { data, error } = await supabase
                        .from('practice_questions')
                        .insert(batch)
                        .select();

                    if (error) {
                        console.error(`   ❌ Error inserting MCQs batch:`, error.message);
                    } else {
                        totalInserted += data.length;
                    }
                }

                console.log(`   ✅ Inserted ${questionsToInsert.length} questions from ${mcqFile.file}`);
            }

        } catch (err) {
            console.error(`❌ Error processing ${mcqFile.file}:`, err.message);
        }
    }

    console.log(`\n✅ Total MCQs inserted: ${totalInserted}`);
    return totalInserted;
};

// ============ MAIN FUNCTION ============

const main = async () => {
    console.log('🚀 Study Hub Data Population Script');
    console.log('=====================================\n');

    const args = process.argv.slice(2);

    const chaptersOnly = args.includes('--chapters-only');
    const videosOnly = args.includes('--videos-only');
    const notesOnly = args.includes('--notes-only');
    const mcqsOnly = args.includes('--mcqs-only');
    const runAll = !chaptersOnly && !videosOnly && !notesOnly && !mcqsOnly;

    let chapters = [];

    try {
        // Step 1: Populate chapters
        if (runAll || chaptersOnly) {
            chapters = await populateChapters();
        }

        // Step 2: Populate videos
        if (runAll || videosOnly) {
            await populateVideos(chapters);
        }

        // Step 3: Populate notes
        if (runAll || notesOnly) {
            await populateNotes(chapters);
        }

        // Step 4: Populate MCQs
        if (runAll || mcqsOnly) {
            await populateMCQs(chapters);
        }

        console.log('\n=====================================');
        console.log('✅ Data population complete!');
        console.log('=====================================\n');

        // Summary
        const { count: chapterCount } = await supabase.from('chapters').select('*', { count: 'exact', head: true });
        const { count: videoCount } = await supabase.from('chapter_videos').select('*', { count: 'exact', head: true });
        const { count: noteCount } = await supabase.from('chapter_notes').select('*', { count: 'exact', head: true });
        const { count: questionCount } = await supabase.from('practice_questions').select('*', { count: 'exact', head: true });

        console.log('📊 Database Summary:');
        console.log(`   📚 Chapters: ${chapterCount || 0}`);
        console.log(`   🎬 Videos: ${videoCount || 0}`);
        console.log(`   📝 Notes: ${noteCount || 0}`);
        console.log(`   ❓ Questions: ${questionCount || 0}`);
        console.log('');

    } catch (err) {
        console.error('❌ Fatal error:', err);
        process.exit(1);
    }
};

main();
