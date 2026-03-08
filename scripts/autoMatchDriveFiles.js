/**
 * Auto-Match Google Drive Files to Database Records
 * ===================================================
 * Lists files from Google Drive folders and matches them to
 * database records by filename to generate google_drive_urls.csv
 *
 * Usage: node scripts/autoMatchDriveFiles.js
 * Output: migration_data/google_drive_urls.csv
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

// ─── Configuration ───────────────────────────────────────────
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

const DRIVE_FOLDERS = {
    papers: '16H5BU8da3sQOZIU15mB06WHveb4GFX3q',
    chapter_notes: '1vfXnjXKj5ITtIiSC1Sg7g_7TDj3QfR7Q',
    formula_books: '1o4oMD4nW1cmHHLWoC-yvENO5nYvTmQQZ',
};

// Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Google Drive API: list files in a folder ────────────────
async function listDriveFiles(folderId, allFiles = []) {
    let pageToken = '';
    let page = 1;

    while (true) {
        const params = new URLSearchParams({
            q: `'${folderId}' in parents and trashed=false`,
            key: GOOGLE_API_KEY,
            fields: 'nextPageToken,files(id,name,mimeType,size)',
            pageSize: '1000',
        });
        if (pageToken) params.set('pageToken', pageToken);

        const url = `https://www.googleapis.com/drive/v3/files?${params}`;
        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Drive API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();

        if (data.files) {
            for (const file of data.files) {
                if (file.mimeType === 'application/vnd.google-apps.folder') {
                    // Recurse into sub-folders
                    console.log(`      📂 Found sub-folder: ${file.name}`);
                    await listDriveFiles(file.id, allFiles);
                } else {
                    allFiles.push({
                        id: file.id,
                        name: file.name,
                        mimeType: file.mimeType,
                        size: file.size,
                    });
                }
            }
        }

        if (data.nextPageToken) {
            pageToken = data.nextPageToken;
            page++;
        } else {
            break;
        }
    }

    return allFiles;
}

// ─── Normalize filename for matching ─────────────────────────
function normalizeFilename(name) {
    return name
        .replace(/\.pdf$/i, '')
        .replace(/[_\-\s]+/g, ' ')
        .trim()
        .toLowerCase();
}

// Extract filename from Supabase URL
function extractFilenameFromUrl(url) {
    if (!url) return '';
    try {
        const decoded = decodeURIComponent(url);
        const parts = decoded.split('/');
        return parts[parts.length - 1];
    } catch {
        return '';
    }
}

// ─── Main ────────────────────────────────────────────────────
async function autoMatch() {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  🔗 AUTO-MATCH DRIVE FILES TO DATABASE       ║');
    console.log('╚══════════════════════════════════════════════╝\n');

    const outputDir = path.resolve(__dirname, '../migration_data');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // ─── Step 1: List all Drive files ────────────────────────────
    console.log('📂 Listing Google Drive files...\n');

    const driveFiles = {};
    for (const [category, folderId] of Object.entries(DRIVE_FOLDERS)) {
        console.log(`   📁 ${category} (folder: ${folderId.substring(0, 10)}...):`);
        try {
            const files = await listDriveFiles(folderId);
            driveFiles[category] = files;
            console.log(`      ✅ Found ${files.length} files`);
            files.forEach(f => console.log(`         - ${f.name}`));
        } catch (err) {
            console.error(`      ❌ Error: ${err.message}`);
            driveFiles[category] = [];
        }
        console.log('');
    }

    // ─── Step 2: Fetch database records ──────────────────────────
    console.log('📊 Fetching database records...\n');

    const dbRecords = {};

    // Papers
    const { data: papers } = await supabase.from('papers').select('id, title, file_url');
    dbRecords.papers = papers || [];
    console.log(`   Papers: ${dbRecords.papers.length} records`);

    // Chapter Notes
    const { data: notes } = await supabase.from('chapter_notes').select('id, title, file_url, chapter_id');
    dbRecords.chapter_notes = notes || [];
    console.log(`   Chapter Notes: ${dbRecords.chapter_notes.length} records`);

    // Formula Books
    const { data: formulas } = await supabase.from('formula_books').select('id, title, subject, file_url');
    dbRecords.formula_books = formulas || [];
    console.log(`   Formula Books: ${dbRecords.formula_books.length} records\n`);

    // ─── Step 3: Match files ─────────────────────────────────────
    console.log('🔍 Matching files...\n');

    const mappings = [];
    const unmatched = { db: [], drive: [] };

    for (const [category, records] of Object.entries(dbRecords)) {
        const categoryDriveFiles = driveFiles[category] || [];
        console.log(`   ── ${category} ──`);

        // Build lookup map from Drive files by normalized name
        const driveNameMap = new Map();
        for (const df of categoryDriveFiles) {
            const normName = normalizeFilename(df.name);
            driveNameMap.set(normName, df);
        }

        // Track which Drive files got matched
        const matchedDriveIds = new Set();

        for (const record of records) {
            const supabaseFilename = extractFilenameFromUrl(record.file_url);
            const normSupabaseName = normalizeFilename(supabaseFilename);

            // Try exact normalized match
            let match = driveNameMap.get(normSupabaseName);

            // If no exact match, try fuzzy matching
            if (!match) {
                // Try matching without prefix patterns like "11th_CHEM_"
                const simpleName = normSupabaseName
                    .replace(/^(11th|12th)\s*(phy|chem|math)\s*/i, '')
                    .trim();

                for (const [driveNorm, driveFile] of driveNameMap) {
                    if (matchedDriveIds.has(driveFile.id)) continue;

                    const driveSimple = driveNorm
                        .replace(/^(11th|12th)\s*(phy|chem|math)\s*/i, '')
                        .trim();

                    if (simpleName && driveSimple && simpleName === driveSimple) {
                        match = driveFile;
                        break;
                    }
                }
            }

            // Still no match? Try partial matching
            if (!match) {
                for (const [driveNorm, driveFile] of driveNameMap) {
                    if (matchedDriveIds.has(driveFile.id)) continue;

                    if (normSupabaseName.includes(driveNorm) || driveNorm.includes(normSupabaseName)) {
                        match = driveFile;
                        break;
                    }
                }
            }

            // Even more fuzzy: match by significant words
            if (!match) {
                const supabaseWords = normSupabaseName.split(' ').filter(w => w.length > 2);
                let bestMatch = null;
                let bestScore = 0;

                for (const [driveNorm, driveFile] of driveNameMap) {
                    if (matchedDriveIds.has(driveFile.id)) continue;

                    const driveWords = driveNorm.split(' ').filter(w => w.length > 2);
                    const commonWords = supabaseWords.filter(w => driveWords.includes(w));
                    const score = commonWords.length / Math.max(supabaseWords.length, driveWords.length);

                    if (score > bestScore && score >= 0.5) {
                        bestScore = score;
                        bestMatch = driveFile;
                    }
                }

                if (bestMatch) {
                    match = bestMatch;
                }
            }

            if (match) {
                matchedDriveIds.add(match.id);
                const driveUrl = `https://drive.google.com/uc?export=download&id=${match.id}`;
                mappings.push({
                    table_name: category,
                    record_id: record.id,
                    new_url: driveUrl,
                    db_title: record.title,
                    drive_name: match.name,
                });
                console.log(`      ✅ ${supabaseFilename}`);
                console.log(`         → ${match.name} (${match.id})`);
            } else {
                unmatched.db.push({ table: category, id: record.id, title: record.title, filename: supabaseFilename });
                console.log(`      ❌ NO MATCH: ${supabaseFilename} (${record.title})`);
            }
        }

        // Find unmatched Drive files
        for (const df of categoryDriveFiles) {
            if (!matchedDriveIds.has(df.id)) {
                unmatched.drive.push({ category, name: df.name, id: df.id });
            }
        }

        console.log('');
    }

    // ─── Step 4: Write CSV ───────────────────────────────────────
    console.log('📝 Writing google_drive_urls.csv...\n');

    const csvPath = path.join(outputDir, 'google_drive_urls.csv');
    const csvHeader = 'table_name,record_id,new_url\n';
    const csvRows = mappings.map(m =>
        `${m.table_name},${m.record_id},${m.new_url}`
    ).join('\n');

    fs.writeFileSync(csvPath, csvHeader + csvRows, 'utf-8');
    console.log(`   ✅ Saved to: ${csvPath}`);

    // Also save detailed mapping for reference
    const detailedPath = path.join(outputDir, 'match_details.json');
    fs.writeFileSync(detailedPath, JSON.stringify({ mappings, unmatched }, null, 2), 'utf-8');
    console.log(`   ✅ Detailed match info: ${detailedPath}\n`);

    // ─── Summary ─────────────────────────────────────────────────
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║                  📊 SUMMARY                  ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║  Matched:         ${String(mappings.length).padStart(4)} files                  ║`);
    console.log(`║  Unmatched (DB):  ${String(unmatched.db.length).padStart(4)} records                ║`);
    console.log(`║  Unmatched (GD):  ${String(unmatched.drive.length).padStart(4)} Drive files            ║`);
    console.log('╚══════════════════════════════════════════════╝');

    if (unmatched.db.length > 0) {
        console.log('\n⚠️  UNMATCHED DATABASE RECORDS (need manual mapping):');
        unmatched.db.forEach(u => {
            console.log(`   - [${u.table}] ${u.title} → File: ${u.filename}`);
        });
    }

    if (unmatched.drive.length > 0) {
        console.log('\n⚠️  UNMATCHED GOOGLE DRIVE FILES (no DB record):');
        unmatched.drive.forEach(u => {
            console.log(`   - [${u.category}] ${u.name} (ID: ${u.id})`);
        });
    }

    if (unmatched.db.length === 0 && unmatched.drive.length === 0) {
        console.log('\n🎉 Perfect match! All files mapped successfully.');
    }

    console.log('\n📋 NEXT STEP: node scripts/updateToGoogleDrive.js\n');
}

autoMatch().catch(err => {
    console.error('\n💥 Fatal error:', err);
    process.exit(1);
});
