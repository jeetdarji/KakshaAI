/**
 * Sync Script - Keep Database and Storage in Sync
 * 
 * This script:
 * 1. Lists all PDFs in Supabase Storage
 * 2. Checks if they exist in the database
 * 3. Adds missing entries
 * 4. Optionally removes orphaned database entries
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET_NAME = 'papers';

/**
 * Parse metadata from filename
 */
function parseFilename(filename) {
    try {
        const nameWithoutExt = filename.replace('.pdf', '');
        const parts = nameWithoutExt.split('_');

        if (parts.length < 3) return null;

        const year = parseInt(parts[0]);
        const examType = parts[1];
        const subject = parts[2];
        const shift = parts[3] || 'All';

        if (isNaN(year)) return null;

        return {
            year,
            examType,
            subject,
            shift,
            title: `${examType} ${year} - ${subject} ${shift}`,
        };
    } catch (error) {
        return null;
    }
}

/**
 * Get file size from storage
 */
function formatSize(bytes) {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * List all files in storage recursively
 */
async function listAllFiles(folder = '', allFiles = []) {
    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(folder, { limit: 1000 });

    if (error) throw error;

    for (const item of data) {
        if (item.id) {
            // It's a folder, recurse
            const subPath = folder ? `${folder}/${item.name}` : item.name;
            await listAllFiles(subPath, allFiles);
        } else {
            // It's a file
            const filePath = folder ? `${folder}/${item.name}` : item.name;
            if (item.name.endsWith('.pdf')) {
                allFiles.push({
                    name: item.name,
                    path: filePath,
                    size: item.metadata?.size,
                });
            }
        }
    }

    return allFiles;
}

/**
 * Sync storage with database
 */
async function syncPapers() {
    console.log('🔄 Starting Sync Process\n');
    console.log('='.repeat(50));

    try {
        // Step 1: Get all files from storage
        console.log('\n📦 Step 1: Scanning storage...');
        const storageFiles = await listAllFiles();
        console.log(`   Found ${storageFiles.length} PDF files in storage`);

        // Step 2: Get all papers from database
        console.log('\n💾 Step 2: Checking database...');
        const { data: dbPapers, error: dbError } = await supabase
            .from('papers')
            .select('file_path');

        if (dbError) throw dbError;

        const dbPaths = new Set(dbPapers.map(p => p.file_path));
        console.log(`   Found ${dbPapers.length} papers in database`);

        // Step 3: Find missing entries
        console.log('\n🔍 Step 3: Finding missing entries...');
        const missingInDb = storageFiles.filter(file => !dbPaths.has(file.path));

        if (missingInDb.length === 0) {
            console.log('   ✅ All storage files are in database - nothing to sync');
        } else {
            console.log(`   Found ${missingInDb.length} files missing from database`);

            // Step 4: Add missing entries
            console.log('\n➕ Step 4: Adding missing entries...');

            let added = 0;
            let failed = 0;

            for (const file of missingInDb) {
                const metadata = parseFilename(file.name);

                if (!metadata) {
                    console.log(`   ⚠️  Skipping ${file.name} - invalid format`);
                    failed++;
                    continue;
                }

                try {
                    const { data: urlData } = supabase.storage
                        .from(BUCKET_NAME)
                        .getPublicUrl(file.path);

                    const { error: insertError } = await supabase
                        .from('papers')
                        .insert([{
                            title: metadata.title,
                            year: metadata.year,
                            subject: metadata.subject,
                            exam_type: metadata.examType,
                            shift: metadata.shift,
                            file_path: file.path,
                            file_size: formatSize(file.size),
                            file_url: urlData.publicUrl,
                        }]);

                    if (insertError) throw insertError;

                    console.log(`   ✅ Added: ${metadata.title}`);
                    added++;
                } catch (error) {
                    console.error(`   ❌ Failed to add ${file.name}:`, error.message);
                    failed++;
                }
            }

            console.log(`\n   Summary: ${added} added, ${failed} failed`);
        }

        // Step 5: Check for orphaned database entries
        console.log('\n🧹 Step 5: Checking for orphaned database entries...');
        const storagePaths = new Set(storageFiles.map(f => f.path));
        const orphaned = dbPapers.filter(p => !storagePaths.has(p.file_path));

        if (orphaned.length === 0) {
            console.log('   ✅ No orphaned entries found');
        } else {
            console.log(`   ⚠️  Found ${orphaned.length} orphaned database entries`);
            console.log('   These entries exist in database but files are missing from storage:');
            orphaned.slice(0, 5).forEach((p, i) => {
                console.log(`   ${i + 1}. ${p.file_path}`);
            });

            if (orphaned.length > 5) {
                console.log(`   ... and ${orphaned.length - 5} more`);
            }

            console.log('\n   💡 To clean up orphaned entries, you can manually delete them from database');
            console.log('   or re-upload the missing files to storage');
        }

        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('\n✨ Sync Complete!\n');
        console.log(`📊 Statistics:`);
        console.log(`   Storage files: ${storageFiles.length}`);
        console.log(`   Database entries: ${dbPapers.length}`);
        console.log(`   Missing in DB: ${missingInDb.length}`);
        console.log(`   Orphaned in DB: ${orphaned.length}`);

    } catch (error) {
        console.error('\n❌ Sync failed:', error.message);
        process.exit(1);
    }

    console.log('\n' + '='.repeat(50));
}

// Run sync
syncPapers().catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
});