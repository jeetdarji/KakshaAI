/**
 * Rollback Migration Script
 * ===========================
 * Restores original Supabase Storage URLs from the backup file
 * in case Google Drive migration has issues.
 *
 * Usage: node scripts/rollbackMigration.js
 * Input: migration_data/backup_urls.json
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

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function askConfirmation(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
        rl.question(question, answer => {
            rl.close();
            resolve(answer.toLowerCase().trim());
        });
    });
}

async function rollbackMigration() {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  ⏪ ROLLBACK MIGRATION                       ║');
    console.log('╚══════════════════════════════════════════════╝\n');

    const backupPath = path.resolve(__dirname, '../migration_data/backup_urls.json');

    // Check backup exists
    if (!fs.existsSync(backupPath)) {
        console.error('❌ Backup file not found:', backupPath);
        console.error('   Cannot rollback without backup_urls.json');
        process.exit(1);
    }

    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    console.log(`📁 Backup loaded (created: ${backupData.exportedAt || backupData.backupAt || 'unknown'})\n`);

    // Count records to restore
    const tables = [
        { name: 'papers', data: backupData.papers || [] },
        { name: 'chapter_notes', data: backupData.chapter_notes || [] },
        { name: 'formula_books', data: backupData.formula_books || [] },
    ];

    let totalRecords = 0;
    for (const table of tables) {
        const count = table.data.filter(r => r.file_url).length;
        console.log(`   ${table.name}: ${count} records to restore`);
        totalRecords += count;
    }

    if (totalRecords === 0) {
        console.log('\n⚠️  No records with file_url found in backup. Nothing to rollback.');
        process.exit(0);
    }

    // Confirm
    console.log(`\n⚠️  This will restore ${totalRecords} records to their original Supabase Storage URLs.`);
    const answer = await askConfirmation('   Type "ROLLBACK" to proceed: ');

    if (answer !== 'rollback') {
        console.log('\n   ❌ Cancelled.\n');
        process.exit(0);
    }

    // Process rollback
    console.log('\n🔄 Rolling back...\n');

    let successCount = 0;
    let failCount = 0;

    for (const table of tables) {
        if (table.data.length === 0) continue;

        console.log(`   📋 ${table.name}:`);

        for (const record of table.data) {
            if (!record.file_url || !record.id) continue;

            try {
                const { error } = await supabase
                    .from(table.name)
                    .update({ file_url: record.file_url })
                    .eq('id', record.id);

                if (error) {
                    console.log(`      ❌ ${record.id}: ${error.message}`);
                    failCount++;
                } else {
                    successCount++;
                }
            } catch (err) {
                console.log(`      ❌ ${record.id}: ${err.message}`);
                failCount++;
            }
        }

        console.log(`      ✅ Processed ${table.data.length} records`);
    }

    // Summary
    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║                  📊 ROLLBACK SUMMARY          ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║  Restored:    ${String(successCount).padStart(4)} records                  ║`);
    console.log(`║  Failed:      ${String(failCount).padStart(4)} records                  ║`);
    console.log('╚══════════════════════════════════════════════╝');

    if (failCount > 0) {
        console.log('\n⚠️  Some rollbacks failed. Check errors above.');
    } else {
        console.log('\n✅ Rollback complete! All URLs restored to original Supabase Storage URLs.');
    }

    console.log('\n📋 NEXT STEPS:');
    console.log('   1. Test downloads in the app');
    console.log('   2. Verify all files are still accessible on Supabase Storage');
    console.log('   3. Investigate what went wrong with the migration\n');
}

rollbackMigration().catch(err => {
    console.error('\n💥 Fatal error:', err);
    process.exit(1);
});
