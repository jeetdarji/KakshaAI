/**
 * Quick Storage Fix — Audit & delete files to get under 1 GB quota
 * 
 * Your Supabase project is UNHEALTHY because Storage is at 118% (1.179 / 1 GB).
 * This script audits all buckets and lets you delete files to free space.
 * 
 * Usage: node scripts/quickStorageFix.js
 * 
 * After cleanup, run in Supabase SQL Editor:
 *   VACUUM FULL;
 *   SELECT pg_size_pretty(pg_database_size(current_database()));
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(2)} MB`;
    return `${(bytes / 1073741824).toFixed(3)} GB`;
}

async function listAllFiles(bucketName, folderPath = '') {
    const allFiles = [];
    try {
        const { data: files, error } = await supabase.storage
            .from(bucketName)
            .list(folderPath, { limit: 1000 });

        if (error || !files) return allFiles;

        for (const file of files) {
            const fullPath = folderPath ? `${folderPath}/${file.name}` : file.name;
            if (file.id === null || file.metadata === null) {
                const nested = await listAllFiles(bucketName, fullPath);
                allFiles.push(...nested);
            } else {
                allFiles.push({
                    path: fullPath,
                    size: file.metadata?.size || 0,
                    mimetype: file.metadata?.mimetype || 'unknown',
                });
            }
        }
    } catch (e) { /* ignore */ }
    return allFiles;
}

function ask(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
        rl.question(question, answer => { rl.close(); resolve(answer.trim().toLowerCase()); });
    });
}

async function main() {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║  🔧 QUICK STORAGE FIX — Free up Supabase Storage    ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Problem: Storage is at 118% (1.179 / 1 GB). Need to get under 1 GB.');
    console.log('');

    // 1. List all buckets
    const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
    if (bErr) {
        console.log('❌ Cannot connect to Supabase Storage:', bErr.message);
        console.log('');
        console.log('Your project might still be restoring. Try again in a few minutes.');
        console.log('If it persists, go to supabase.com/dashboard and check project status.');
        process.exit(1);
    }

    if (!buckets || buckets.length === 0) {
        console.log('No storage buckets found. The storage usage might be from database bloat.');
        console.log('Run this in Supabase SQL Editor: VACUUM FULL;');
        process.exit(0);
    }

    console.log(`Found ${buckets.length} bucket(s). Auditing...\n`);

    const bucketDetails = [];
    let totalSize = 0;
    let totalFiles = 0;

    for (const bucket of buckets) {
        const files = await listAllFiles(bucket.name);
        const size = files.reduce((sum, f) => sum + f.size, 0);
        totalSize += size;
        totalFiles += files.length;
        bucketDetails.push({ name: bucket.name, public: bucket.public, files, size, count: files.length });

        console.log(`  📂 ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
        console.log(`     ${files.length} files — ${formatSize(size)}`);

        // Show top 5 largest files
        if (files.length > 0) {
            files.sort((a, b) => b.size - a.size);
            files.slice(0, 5).forEach(f => {
                console.log(`       • ${f.path} (${formatSize(f.size)})`);
            });
        }
        console.log('');
    }

    console.log('═══════════════════════════════════════════════');
    console.log(`  TOTAL: ${totalFiles} files, ${formatSize(totalSize)}`);
    console.log(`  Need to free: ~${formatSize(Math.max(0, totalSize - 900 * 1048576))} to be safe`);
    console.log('═══════════════════════════════════════════════\n');

    if (totalFiles === 0) {
        console.log('No files in storage! The 1.179 GB usage is likely from:');
        console.log('  • Database disk (WAL logs, dead tuples after deletes)');
        console.log('');
        console.log('Fix: Run this in Supabase SQL Editor:');
        console.log('  VACUUM FULL;');
        console.log('  REINDEX DATABASE postgres;');
        console.log('');
        console.log('Then wait 1-24 hours for Supabase to recalculate usage.');
        process.exit(0);
    }

    // Offer to delete from each bucket
    for (const bd of bucketDetails) {
        if (bd.count === 0) continue;

        console.log(`\n📂 "${bd.name}" — ${bd.count} files (${formatSize(bd.size)})`);
        const answer = await ask(`   Delete ALL files from "${bd.name}"? (yes/no): `);

        if (answer === 'yes' || answer === 'y') {
            console.log(`   Deleting ${bd.count} files from "${bd.name}"...`);

            // Delete in batches of 100
            let deleted = 0;
            let errors = 0;
            for (let i = 0; i < bd.files.length; i += 100) {
                const batch = bd.files.slice(i, i + 100).map(f => f.path);
                const { error } = await supabase.storage.from(bd.name).remove(batch);
                if (error) {
                    errors += batch.length;
                    console.log(`   ❌ Batch error: ${error.message}`);
                } else {
                    deleted += batch.length;
                }
            }
            console.log(`   ✅ Deleted: ${deleted} files, Errors: ${errors}`);
        } else {
            console.log(`   ⏭️  Skipped "${bd.name}"`);
        }
    }

    // Final verification
    console.log('\n\n🔍 Post-cleanup verification...\n');

    let newTotal = 0;
    for (const bucket of buckets) {
        const files = await listAllFiles(bucket.name);
        const size = files.reduce((sum, f) => sum + f.size, 0);
        newTotal += size;
        console.log(`  📂 ${bucket.name}: ${files.length} files (${formatSize(size)})`);
    }

    console.log(`\n  New total: ${formatSize(newTotal)}`);

    if (newTotal < 900 * 1048576) {
        console.log('  ✅ Storage is now under the 1 GB limit!');
    } else {
        console.log('  ⚠️  Still over limit. Delete more files or check database size.');
    }

    console.log('\n📋 NEXT STEPS:');
    console.log('  1. Go to Supabase SQL Editor and run:');
    console.log('     VACUUM FULL;');
    console.log('  2. Wait 1-24 hours for Supabase to recalculate storage usage');
    console.log('  3. If status stays "Unhealthy", contact Supabase support');
    console.log('');
}

main().catch(err => {
    console.error('Fatal:', err.message);
    process.exit(1);
});
