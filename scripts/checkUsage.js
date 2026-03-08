/**
 * Check Supabase usage — what's consuming space
 * Usage: node scripts/checkUsage.js
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUsage() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  📊 SUPABASE USAGE CHECK                     ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // ─── 1. Check storage buckets ───────────────────────────────
  console.log('📦 STORAGE BUCKETS:\n');
  
  const { data: buckets, error: bucketsErr } = await supabase.storage.listBuckets();
  if (bucketsErr) {
    console.log('   ❌ Error listing buckets:', bucketsErr.message);
  } else {
    for (const bucket of (buckets || [])) {
      console.log(`   📂 ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
      
      // List all files recursively
      const files = await listAllFiles(bucket.name, '');
      const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
      console.log(`      Files: ${files.length}`);
      console.log(`      Size:  ${formatSize(totalSize)}`);
      
      if (files.length > 0 && files.length <= 20) {
        files.forEach(f => {
          console.log(`      - ${f.path} (${formatSize(f.size)})`);
        });
      } else if (files.length > 20) {
        files.slice(0, 10).forEach(f => {
          console.log(`      - ${f.path} (${formatSize(f.size)})`);
        });
        console.log(`      ... and ${files.length - 10} more`);
      }
    }
  }

  // ─── 2. Check database table row counts ─────────────────────
  console.log('\n📋 DATABASE TABLES:\n');
  
  const tables = [
    'submissions', 'tests', 'sections', 'questions',
    'user_practice_attempts', 'chapters', 'daily_activity',
    'study_sessions', 'user_chapter_progress',
    'papers', 'chapter_notes', 'formula_books',
    'profiles', 'user_stats'
  ];

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`   ${table}: ❌ ${error.message}`);
      } else {
        console.log(`   ${table}: ${count} rows`);
      }
    } catch (e) {
      console.log(`   ${table}: ❌ ${e.message}`);
    }
  }

  // ─── 3. Check for large JSON columns (answers) ──────────────
  console.log('\n📏 LARGE DATA CHECK:\n');
  
  try {
    const { data: subs } = await supabase
      .from('submissions')
      .select('id, answers')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (subs && subs.length > 0) {
      console.log('   Recent submissions answers size:');
      subs.forEach(s => {
        const size = JSON.stringify(s.answers || {}).length;
        const keys = Object.keys(s.answers || {}).length;
        console.log(`     ID ${s.id}: ${keys} answers, ${formatSize(size)}`);
      });
    }
  } catch (e) {
    console.log('   ❌ Error checking submissions:', e.message);
  }

  // ─── 4. Check study_sessions for bloat ──────────────────────
  try {
    const { count: sessionCount } = await supabase
      .from('study_sessions')
      .select('*', { count: 'exact', head: true });
    
    if (sessionCount > 100) {
      console.log(`\n   ⚠️  study_sessions has ${sessionCount} rows — may be bloated`);
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: oldCount } = await supabase
        .from('study_sessions')
        .select('*', { count: 'exact', head: true })
        .lt('session_start', thirtyDaysAgo.toISOString());
      
      console.log(`      Sessions older than 30 days: ${oldCount}`);
    }
  } catch (e) {
    // ignore
  }

  // ─── 5. Check if auth.users is causing bloat ────────────────
  try {
    const { data: authData, error: authErr } = await supabase.auth.admin.listUsers();
    if (!authErr && authData) {
      console.log(`\n   👤 Auth users: ${authData.users?.length || 0}`);
    }
  } catch (e) {
    // ignore — may not have admin access
  }

  // ─── 6. Database size estimate ──────────────────────────────
  console.log('\n📐 DATABASE SIZE (estimated via pg_database_size):');
  try {
    const { data, error } = await supabase.rpc('get_db_size');
    if (!error && data) {
      console.log(`   ${data}`);
    } else {
      console.log('   (RPC not available — check Supabase Dashboard > Database > Database Size)');
    }
  } catch (e) {
    console.log('   (Cannot query DB size directly — check Supabase Dashboard)');
  }

  console.log('\n💡 TIP: Go to Supabase Dashboard → Settings → Usage to see:');
  console.log('   - Database size (500 MB free limit)');
  console.log('   - Storage size (1 GB free limit)');
  console.log('   - Bandwidth (2 GB free limit)');
  console.log('   - Auth users (50k free limit)');
  console.log('   - Edge Functions invocations (500k free limit)\n');
}

async function listAllFiles(bucketName, folderPath) {
  const allFiles = [];
  try {
    const { data: files } = await supabase.storage
      .from(bucketName)
      .list(folderPath, { limit: 1000 });

    if (!files) return allFiles;

    for (const file of files) {
      const fullPath = folderPath ? `${folderPath}/${file.name}` : file.name;
      if (file.id === null || file.metadata === null) {
        const nested = await listAllFiles(bucketName, fullPath);
        allFiles.push(...nested);
      } else {
        allFiles.push({ path: fullPath, size: file.metadata?.size || 0 });
      }
    }
  } catch (e) {
    // ignore
  }
  return allFiles;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

checkUsage().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
