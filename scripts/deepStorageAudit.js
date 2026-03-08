/**
 * Deep storage audit — find every file across all buckets
 * Usage: node scripts/deepStorageAudit.js
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function listAllFilesDeep(bucketName, folderPath = '', depth = 0) {
  const allFiles = [];
  const indent = '  '.repeat(depth + 2);

  try {
    const { data: files, error } = await supabase.storage
      .from(bucketName)
      .list(folderPath, { limit: 1000, offset: 0 });

    if (error) {
      console.log(`${indent}❌ Error: ${error.message}`);
      return allFiles;
    }

    if (!files || files.length === 0) return allFiles;

    for (const file of files) {
      const fullPath = folderPath ? `${folderPath}/${file.name}` : file.name;

      if (file.id === null || file.metadata === null) {
        // Folder — recurse
        const nested = await listAllFilesDeep(bucketName, fullPath, depth + 1);
        allFiles.push(...nested);
      } else {
        allFiles.push({
          path: fullPath,
          size: file.metadata?.size || 0,
          created: file.created_at,
          mimetype: file.metadata?.mimetype || 'unknown'
        });
      }
    }
  } catch (e) {
    console.log(`${indent}❌ ${e.message}`);
  }

  return allFiles;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(2)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  🔍 DEEP STORAGE AUDIT                            ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  // List ALL buckets
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  if (bErr) {
    console.log('❌ Cannot list buckets:', bErr.message);
    return;
  }

  console.log(`Found ${buckets.length} bucket(s):\n`);

  let grandTotal = 0;
  let grandFileCount = 0;

  for (const bucket of buckets) {
    console.log(`📂 "${bucket.name}" (${bucket.public ? 'public' : 'private'}, created: ${bucket.created_at})`);
    
    const files = await listAllFilesDeep(bucket.name);
    const bucketSize = files.reduce((sum, f) => sum + f.size, 0);
    grandTotal += bucketSize;
    grandFileCount += files.length;

    console.log(`   Files: ${files.length} | Size: ${formatSize(bucketSize)}`);

    if (files.length > 0) {
      // Sort by size desc
      files.sort((a, b) => b.size - a.size);
      const showCount = Math.min(files.length, 15);
      files.slice(0, showCount).forEach(f => {
        console.log(`   - ${f.path} (${formatSize(f.size)}) [${f.mimetype}]`);
      });
      if (files.length > showCount) {
        console.log(`   ... and ${files.length - showCount} more files`);
      }
    }
    console.log();
  }

  console.log('═══════════════════════════════════════════════');
  console.log(`TOTAL: ${grandFileCount} files, ${formatSize(grandTotal)}\n`);

  if (grandTotal < 50 * 1048576) {
    console.log('💡 Your actual storage usage is very low (<50 MB).');
    console.log('   If Supabase dashboard still shows high usage, this is likely because:');
    console.log('');
    console.log('   1. STORAGE USAGE CACHE: Supabase recalculates storage usage periodically.');
    console.log('      After bulk deletes, it can take 24-72 hours to update.');
    console.log('');
    console.log('   2. DATABASE SIZE: On Supabase free tier, "Storage" on the billing page');
    console.log('      sometimes includes DATABASE disk usage (not just file storage).');
    console.log('      Check Settings → Database → Database Size separately.');
    console.log('');
    console.log('   3. WAL LOGS: PostgreSQL Write-Ahead Logs can temporarily bloat disk.');
    console.log('      Running VACUUM can help. You can do this from SQL Editor:');
    console.log('      → VACUUM FULL;');
    console.log('');
    console.log('   4. CONTACT SUPPORT: If the dashboard doesn\'t update after 48 hrs,');
    console.log('      contact Supabase support (support@supabase.io) and ask them to');
    console.log('      recalculate your project\'s storage usage.');
    console.log('');
    console.log('   RECOMMENDED ACTIONS:');
    console.log('   a) Go to Supabase Dashboard → SQL Editor → Run: VACUUM FULL;');
    console.log('   b) Go to Settings → Usage and note which SPECIFIC metric is over limit');
    console.log('   c) If it persists after 48 hrs, contact Supabase support');
  }

  // Check if there are empty buckets that can be deleted
  for (const bucket of buckets) {
    const files = await listAllFilesDeep(bucket.name);
    if (files.length === 0 && bucket.name !== 'user-notes') {
      console.log(`\n🗑️  Bucket "${bucket.name}" is empty and can be deleted.`);
      console.log(`   Run this in Supabase SQL Editor or Dashboard:`);
      console.log(`   DELETE FROM storage.buckets WHERE name = '${bucket.name}';`);
    }
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
