/**
 * Cleanup Supabase Storage Script
 * ==================================
 * Deletes files from Supabase Storage buckets AFTER verifying
 * all database URLs point to Google Drive.
 *
 * Usage: node scripts/cleanupStorage.js
 *
 * ⚠️  This is DESTRUCTIVE — only run after full verification!
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Supabase client with SERVICE ROLE KEY (required for storage admin)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing VITE_SUPABASE_SERVICE_ROLE_KEY in .env');
    console.error('   Service role key is required for storage operations.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BUCKETS_TO_CLEAN = ['papers', 'chapter-notes'];
// user-notes is handled separately — not cleaned automatically
const SKIP_BUCKETS = ['user-notes'];

// Prompt for confirmation
function askConfirmation(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
        rl.question(question, answer => {
            rl.close();
            resolve(answer.toLowerCase().trim());
        });
    });
}

// List all files in a bucket (recursive)
async function listBucketFiles(bucketName, folderPath = '') {
    const allFiles = [];

    try {
        const { data: files, error } = await supabase.storage
            .from(bucketName)
            .list(folderPath, { limit: 1000 });

        if (error) {
            console.error(`   Error listing ${bucketName}/${folderPath}: ${error.message}`);
            return allFiles;
        }

        if (!files) return allFiles;

        for (const file of files) {
            const fullPath = folderPath ? `${folderPath}/${file.name}` : file.name;

            if (file.id === null || file.metadata === null) {
                // This is a folder, recurse into it
                const nestedFiles = await listBucketFiles(bucketName, fullPath);
                allFiles.push(...nestedFiles);
            } else {
                allFiles.push({
                    name: file.name,
                    path: fullPath,
                    size: file.metadata?.size || 0,
                    mimetype: file.metadata?.mimetype || 'unknown',
                });
            }
        }
    } catch (err) {
        console.error(`   Error listing bucket ${bucketName}: ${err.message}`);
    }

    return allFiles;
}

async function cleanupStorage() {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  🧹 SUPABASE STORAGE CLEANUP                 ║');
    console.log('╚══════════════════════════════════════════════╝\n');

    const outputDir = path.resolve(__dirname, '../migration_data');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // ─── Pre-flight: Verify all URLs are migrated ────────────────
    console.log('🔍 Pre-flight check: Verifying all URLs are migrated...\n');

    let supabaseUrlsRemaining = 0;
    const tables = ['papers', 'chapter_notes', 'formula_books'];

    for (const table of tables) {
        const { data, error } = await supabase
            .from(table)
            .select('id, file_url')
            .like('file_url', '%supabase.co/storage%');

        if (!error && data && data.length > 0) {
            supabaseUrlsRemaining += data.length;
            console.log(`   ❌ ${table}: ${data.length} records still have Supabase Storage URLs`);
            data.slice(0, 3).forEach(r => console.log(`      - ${r.id}`));
        } else {
            console.log(`   ✅ ${table}: All URLs migrated`);
        }
    }

    if (supabaseUrlsRemaining > 0) {
        console.log(`\n❌ ABORT: ${supabaseUrlsRemaining} records still reference Supabase Storage.`);
        console.log('   Run node scripts/updateToGoogleDrive.js first.');
        process.exit(1);
    }

    console.log('\n✅ All database URLs are migrated.\n');

    // ─── Inventory: List files in each bucket ────────────────────
    console.log('📦 Inventorying storage buckets...\n');

    const bucketInventory = {};
    let totalFiles = 0;
    let totalSize = 0;

    for (const bucket of BUCKETS_TO_CLEAN) {
        console.log(`   📂 ${bucket}:`);
        const files = await listBucketFiles(bucket);
        bucketInventory[bucket] = files;

        const bucketSize = files.reduce((sum, f) => sum + f.size, 0);
        totalFiles += files.length;
        totalSize += bucketSize;

        console.log(`      Files: ${files.length}`);
        console.log(`      Size:  ${(bucketSize / 1024 / 1024).toFixed(2)} MB`);
    }

    // Check skipped buckets
    for (const bucket of SKIP_BUCKETS) {
        console.log(`   ⏭️  ${bucket}: (SKIPPED — handle manually)`);
        const files = await listBucketFiles(bucket);
        console.log(`      Files: ${files.length}`);
    }

    console.log(`\n   Total files to delete: ${totalFiles}`);
    console.log(`   Total size to free:   ${(totalSize / 1024 / 1024).toFixed(2)} MB\n`);

    if (totalFiles === 0) {
        console.log('ℹ️  No files to delete. Buckets are already empty.');
        process.exit(0);
    }

    // ─── Save final inventory backup ─────────────────────────────
    const inventoryPath = path.join(outputDir, 'storage_inventory_final.json');
    fs.writeFileSync(inventoryPath, JSON.stringify(bucketInventory, null, 2), 'utf-8');
    console.log(`💾 Inventory saved to: ${inventoryPath}\n`);

    // ─── Confirmation ────────────────────────────────────────────
    console.log('⚠️  WARNING: This will PERMANENTLY DELETE these files from Supabase Storage.');
    console.log('   Make sure all files are uploaded to Google Drive and URLs are updated.\n');

    const answer = await askConfirmation('   Type "DELETE" to proceed, or anything else to cancel: ');

    if (answer !== 'delete') {
        console.log('\n   ❌ Cancelled. No files were deleted.\n');
        process.exit(0);
    }

    // ─── Delete files ────────────────────────────────────────────
    console.log('\n🗑️  Deleting files...\n');

    let deletedCount = 0;
    let deleteErrors = 0;

    for (const bucket of BUCKETS_TO_CLEAN) {
        const files = bucketInventory[bucket];
        if (!files || files.length === 0) continue;

        console.log(`   📂 ${bucket}: Deleting ${files.length} files...`);

        // Delete in batches of 100
        const batchSize = 100;
        for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            const paths = batch.map(f => f.path);

            const { data, error } = await supabase.storage
                .from(bucket)
                .remove(paths);

            if (error) {
                console.log(`      ❌ Batch ${Math.floor(i / batchSize) + 1} failed: ${error.message}`);
                deleteErrors += batch.length;
            } else {
                deletedCount += batch.length;
                console.log(`      ✅ Deleted batch ${Math.floor(i / batchSize) + 1} (${batch.length} files)`);
            }
        }
    }

    // ─── Post-cleanup verification ───────────────────────────────
    console.log('\n🔍 Post-cleanup verification...\n');

    for (const bucket of BUCKETS_TO_CLEAN) {
        const remainingFiles = await listBucketFiles(bucket);
        if (remainingFiles.length === 0) {
            console.log(`   ✅ ${bucket}: Empty`);
        } else {
            console.log(`   ⚠️  ${bucket}: ${remainingFiles.length} files remaining`);
        }
    }

    // ─── Summary ─────────────────────────────────────────────────
    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║                  📊 SUMMARY                  ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║  Deleted:       ${String(deletedCount).padStart(4)} files                  ║`);
    console.log(`║  Errors:        ${String(deleteErrors).padStart(4)} files                  ║`);
    console.log(`║  Space freed:   ~${(totalSize / 1024 / 1024).toFixed(0).padStart(3)} MB                     ║`);
    console.log('╚══════════════════════════════════════════════╝');

    if (deleteErrors > 0) {
        console.log('\n⚠️  Some deletions failed. Re-run to retry.');
    }

    console.log('\n✅ Storage cleanup complete!');
    console.log('   Check your Supabase Dashboard to verify storage usage dropped.\n');
}

cleanupStorage().catch(err => {
    console.error('\n💥 Fatal error:', err);
    process.exit(1);
});
