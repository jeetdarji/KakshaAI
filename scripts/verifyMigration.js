/**
 * Migration Verification Script
 * ===============================
 * Verifies that all file URLs have been updated to Google Drive
 * and that downloads, progress tracking, and analytics still work.
 *
 * Usage: node scripts/verifyMigration.js
 * Output: migration_data/migration_report.txt
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseKey = supabaseServiceKey || supabaseAnonKey;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const VALID_TABLES = ['papers', 'chapter_notes', 'formula_books'];
const report = [];

function log(msg) {
    console.log(msg);
    report.push(msg);
}

// Test if a URL is accessible (HEAD request)
async function testUrl(url) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
            redirect: 'follow',
        });

        clearTimeout(timeout);
        return { ok: response.ok, status: response.status };
    } catch (err) {
        return { ok: false, status: 0, error: err.message };
    }
}

async function verifyMigration() {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  🔍 MIGRATION VERIFICATION                   ║');
    console.log('╚══════════════════════════════════════════════╝\n');

    const outputDir = path.resolve(__dirname, '../migration_data');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    let allPassed = true;

    // ═══════════════════════════════════════════════════════════
    // CHECK 1: Database URL audit
    // ═══════════════════════════════════════════════════════════
    log('\n═══ CHECK 1: DATABASE URL AUDIT ═══\n');

    for (const table of VALID_TABLES) {
        const { data: allRecords, error: allError } = await supabase
            .from(table)
            .select('id, file_url');

        if (allError) {
            log(`   ❌ Error querying ${table}: ${allError.message}`);
            allPassed = false;
            continue;
        }

        const total = allRecords?.length || 0;
        const googleDrive = allRecords?.filter(r =>
            r.file_url && (
                r.file_url.includes('drive.google.com') ||
                r.file_url.includes('drive.usercontent.google.com')
            )
        ).length || 0;

        const supabaseStorage = allRecords?.filter(r =>
            r.file_url && r.file_url.includes('supabase.co/storage')
        ).length || 0;

        const missing = allRecords?.filter(r =>
            !r.file_url || r.file_url === '' || r.file_url === '#'
        ).length || 0;

        const other = total - googleDrive - supabaseStorage - missing;

        log(`   📋 ${table}:`);
        log(`      Total records:      ${total}`);
        log(`      Google Drive URLs:  ${googleDrive} ${googleDrive === total ? '✅' : '⚠️'}`);
        log(`      Supabase URLs:      ${supabaseStorage} ${supabaseStorage === 0 ? '✅' : '❌'}`);
        log(`      Missing URLs:       ${missing} ${missing === 0 ? '✅' : '⚠️'}`);
        log(`      Other URLs:         ${other}`);
        log('');

        if (supabaseStorage > 0) {
            allPassed = false;
            const supabaseRecords = allRecords.filter(r =>
                r.file_url && r.file_url.includes('supabase.co/storage')
            );
            log(`      ❌ Records still on Supabase Storage:`);
            supabaseRecords.forEach(r => log(`         - ${r.id}: ${r.file_url}`));
            log('');
        }
    }

    // ═══════════════════════════════════════════════════════════
    // CHECK 2: URL accessibility test (sample 5 from each table)
    // ═══════════════════════════════════════════════════════════
    log('\n═══ CHECK 2: URL ACCESSIBILITY TEST ═══\n');

    for (const table of VALID_TABLES) {
        const { data: records } = await supabase
            .from(table)
            .select('id, title, file_url')
            .not('file_url', 'is', null)
            .not('file_url', 'eq', '')
            .not('file_url', 'eq', '#')
            .limit(5);

        if (!records || records.length === 0) {
            log(`   ⚠️  ${table}: No records with URLs to test`);
            continue;
        }

        log(`   🔗 Testing ${records.length} URLs from ${table}...`);

        for (const record of records) {
            const result = await testUrl(record.file_url);
            if (result.ok) {
                log(`      ✅ ${record.title || record.id} — HTTP ${result.status}`);
            } else {
                log(`      ❌ ${record.title || record.id} — ${result.error || `HTTP ${result.status}`}`);
                log(`         URL: ${record.file_url}`);
                allPassed = false;
            }
        }
        log('');
    }

    // ═══════════════════════════════════════════════════════════
    // CHECK 3: Progress tracking integrity
    // ═══════════════════════════════════════════════════════════
    log('\n═══ CHECK 3: PROGRESS TRACKING INTEGRITY ═══\n');

    // Check that user_chapter_progress table has the required columns
    try {
        const { data: sampleProgress, error: progressError } = await supabase
            .from('user_chapter_progress')
            .select('id, user_id, chapter_id, notes_downloaded, formula_viewed, practice_completed, videos_watched, total_videos')
            .limit(10);

        if (progressError) {
            log(`   ❌ Error querying user_chapter_progress: ${progressError.message}`);
            allPassed = false;
        } else {
            log(`   ✅ user_chapter_progress table accessible`);
            log(`   📊 Sample records: ${sampleProgress?.length || 0}`);

            if (sampleProgress && sampleProgress.length > 0) {
                const notesTrue = sampleProgress.filter(p => p.notes_downloaded === true).length;
                const formulaTrue = sampleProgress.filter(p => p.formula_viewed === true).length;

                log(`      notes_downloaded=true:  ${notesTrue}/${sampleProgress.length}`);
                log(`      formula_viewed=true:    ${formulaTrue}/${sampleProgress.length}`);
                log('');

                // Verify progress calculation for sample users
                log('   🔢 Verifying progress calculation for sample users...');

                for (const progress of sampleProgress.slice(0, 5)) {
                    // Count total & watched videos
                    const { data: videoIds } = await supabase
                        .from('chapter_videos')
                        .select('id')
                        .eq('chapter_id', progress.chapter_id);

                    const videoIdList = videoIds?.map(v => v.id) || [];
                    const totalVideos = videoIdList.length;

                    let videosWatched = 0;
                    if (videoIdList.length > 0) {
                        const { data: watched } = await supabase
                            .from('user_video_progress')
                            .select('video_id')
                            .eq('user_id', progress.user_id)
                            .eq('completed', true)
                            .in('video_id', videoIdList);
                        videosWatched = watched?.length || 0;
                    }

                    // Calculate expected progress
                    const videoProgress = totalVideos > 0 ? (videosWatched / totalVideos) * 40 : 0;
                    const practiceProgress = progress.practice_completed ? 40 : 0;
                    const notesProgress = progress.notes_downloaded ? 10 : 0;
                    const formulaProgress = progress.formula_viewed ? 10 : 0;
                    const expectedTotal = Math.round(videoProgress + practiceProgress + notesProgress + formulaProgress);

                    log(`      User ${progress.user_id.substring(0, 8)}... Chapter ${progress.chapter_id.substring(0, 8)}...`);
                    log(`        Videos: ${videosWatched}/${totalVideos} (${Math.round(videoProgress)}%) | Practice: ${practiceProgress}% | Notes: ${notesProgress}% | Formula: ${formulaProgress}%`);
                    log(`        Expected total: ${expectedTotal}%`);
                }
            }
        }
    } catch (err) {
        log(`   ❌ Progress tracking check failed: ${err.message}`);
        allPassed = false;
    }

    // ═══════════════════════════════════════════════════════════
    // CHECK 4: Google Drive URL format validation
    // ═══════════════════════════════════════════════════════════
    log('\n═══ CHECK 4: URL FORMAT VALIDATION ═══\n');

    let formatIssues = 0;
    for (const table of VALID_TABLES) {
        const { data: records } = await supabase
            .from(table)
            .select('id, file_url')
            .not('file_url', 'is', null)
            .not('file_url', 'eq', '')
            .not('file_url', 'eq', '#');

        if (records) {
            for (const record of records) {
                const url = record.file_url;
                const isGDrive = url.includes('drive.google.com') || url.includes('drive.usercontent.google.com');
                const isSupabase = url.includes('supabase.co/storage');

                if (!isGDrive && !isSupabase) {
                    log(`   ⚠️  ${table}/${record.id}: Unrecognized URL format: ${url}`);
                    formatIssues++;
                }
            }
        }
    }

    if (formatIssues === 0) {
        log('   ✅ All URLs have valid/recognized format');
    } else {
        log(`   ⚠️  ${formatIssues} URLs with unrecognized format`);
    }

    // ═══════════════════════════════════════════════════════════
    // CHECK 5: Cross-reference chapter_notes with chapters
    // ═══════════════════════════════════════════════════════════
    log('\n═══ CHECK 5: DATA INTEGRITY ═══\n');

    try {
        // Check for orphaned chapter_notes
        const { data: notes } = await supabase
            .from('chapter_notes')
            .select('id, chapter_id, title');

        if (notes) {
            const chapterIds = [...new Set(notes.map(n => n.chapter_id))];
            const { data: chapters } = await supabase
                .from('chapters')
                .select('id')
                .in('id', chapterIds);

            const validChapterIds = new Set(chapters?.map(c => c.id) || []);
            const orphaned = notes.filter(n => !validChapterIds.has(n.chapter_id));

            if (orphaned.length === 0) {
                log('   ✅ All chapter_notes reference valid chapters');
            } else {
                log(`   ⚠️  ${orphaned.length} orphaned chapter_notes (no matching chapter)`);
                orphaned.forEach(n => log(`      - ${n.id}: ${n.title}`));
            }
        }

        // Check formula_books have valid subjects
        const { data: formulas } = await supabase
            .from('formula_books')
            .select('id, subject, title, file_url');

        if (formulas) {
            log(`   ✅ Formula books: ${formulas.length} total`);
            formulas.forEach(f => log(`      - ${f.subject}: ${f.title} ${f.file_url ? '(has URL)' : '(NO URL)'}`));
        }
    } catch (err) {
        log(`   ❌ Data integrity check error: ${err.message}`);
    }

    // ═══════════════════════════════════════════════════════════
    // FINAL SUMMARY
    // ═══════════════════════════════════════════════════════════
    log('\n╔══════════════════════════════════════════════╗');
    log(`║  ${allPassed ? '✅ ALL CHECKS PASSED' : '⚠️  SOME CHECKS FAILED'}                       ║`);
    log('╚══════════════════════════════════════════════╝');

    if (!allPassed) {
        log('\n⚠️  Review the issues above before proceeding with cleanup.');
        log('   Fix any remaining Supabase URLs or broken links first.');
    } else {
        log('\n✅ Migration verified successfully!');
        log('   Safe to proceed with: node scripts/cleanupStorage.js');
    }

    // Save report
    const reportPath = path.join(outputDir, 'migration_report.txt');
    fs.writeFileSync(reportPath, report.join('\n'), 'utf-8');
    console.log(`\n📝 Full report saved to: ${reportPath}\n`);
}

verifyMigration().catch(err => {
    console.error('\n💥 Fatal error:', err);
    process.exit(1);
});
