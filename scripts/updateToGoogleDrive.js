/**
 * Update Database with Google Drive URLs
 * ========================================
 * Reads a CSV mapping file and updates all file_url fields in the database
 * from Supabase Storage URLs to Google Drive URLs.
 *
 * Usage: node scripts/updateToGoogleDrive.js
 * Input: migration_data/google_drive_urls.csv
 *
 * CSV Format:
 *   table_name,record_id,new_url
 *   papers,uuid-here,https://drive.google.com/uc?export=download&id=FILE_ID
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

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env file');
    console.error('   Required: VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Valid table names for safety
const VALID_TABLES = ['papers', 'chapter_notes', 'formula_books'];

// Validate Google Drive URL format
const isValidGoogleDriveUrl = (url) => {
    return (
        url.startsWith('https://drive.google.com/uc?export=download&id=') ||
        url.startsWith('https://drive.google.com/file/d/') ||
        url.startsWith('https://drive.usercontent.google.com/')
    );
};

// Parse CSV (handles quoted fields with commas)
const parseCSV = (content) => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    const header = lines[0].split(',').map(h => h.trim());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple CSV parse (handles basic quoting)
        const values = [];
        let current = '';
        let inQuotes = false;

        for (const char of line) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());

        if (values.length >= 3) {
            const row = {};
            header.forEach((key, idx) => {
                row[key] = values[idx] || '';
            });
            rows.push(row);
        }
    }

    return rows;
};

async function updateToGoogleDrive() {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  🔄 UPDATE URLS TO GOOGLE DRIVE              ║');
    console.log('╚══════════════════════════════════════════════╝\n');

    const migrationDir = path.resolve(__dirname, '../migration_data');
    const csvPath = path.join(migrationDir, 'google_drive_urls.csv');
    const backupPath = path.join(migrationDir, 'backup_urls.json');
    const reportPath = path.join(migrationDir, 'update_report.txt');

    // ─── Check input file exists ─────────────────────────────────
    if (!fs.existsSync(csvPath)) {
        console.error(`❌ CSV file not found: ${csvPath}`);
        console.error('\n📋 To create this file:');
        console.error('   1. Run: node scripts/exportFileUrls.js');
        console.error('   2. Upload all PDFs to Google Drive');
        console.error('   3. Create google_drive_urls.csv with columns: table_name,record_id,new_url');
        process.exit(1);
    }

    // ─── Verify backup exists ────────────────────────────────────
    if (!fs.existsSync(backupPath)) {
        console.warn('⚠️  No backup found! Creating backup first...\n');
        // Create backup on the fly
        const backupData = { papers: [], chapter_notes: [], formula_books: [], backupAt: new Date().toISOString() };

        for (const table of VALID_TABLES) {
            const { data, error } = await supabase.from(table).select('id, file_url');
            if (!error && data) {
                backupData[table] = data;
            }
        }

        fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');
        console.log(`   ✅ Backup created at: ${backupPath}\n`);
    } else {
        console.log('✅ Backup file found — safe to proceed\n');
    }

    // ─── Parse CSV ───────────────────────────────────────────────
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const rows = parseCSV(csvContent);

    if (rows.length === 0) {
        console.error('❌ CSV file is empty or has no data rows');
        process.exit(1);
    }

    console.log(`📊 Found ${rows.length} URL mappings to process\n`);

    // ─── Validate all rows first ─────────────────────────────────
    console.log('🔍 Validating entries...');
    const errors = [];
    const validRows = [];

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const lineNum = i + 2; // +2 for header + 0-index

        // Check table name
        if (!VALID_TABLES.includes(row.table_name)) {
            errors.push(`Line ${lineNum}: Invalid table "${row.table_name}"`);
            continue;
        }

        // Check record ID
        if (!row.record_id || row.record_id.length < 10) {
            errors.push(`Line ${lineNum}: Invalid record_id "${row.record_id}"`);
            continue;
        }

        // Check URL format
        if (!isValidGoogleDriveUrl(row.new_url)) {
            errors.push(`Line ${lineNum}: Invalid Google Drive URL "${row.new_url}"`);
            continue;
        }

        validRows.push(row);
    }

    if (errors.length > 0) {
        console.log(`\n⚠️  Found ${errors.length} validation errors:`);
        errors.forEach(e => console.log(`   ${e}`));
        console.log(`\n   ${validRows.length}/${rows.length} rows are valid`);

        if (validRows.length === 0) {
            console.error('\n❌ No valid rows to process. Fix CSV and retry.');
            process.exit(1);
        }
        console.log('   Continuing with valid rows...\n');
    } else {
        console.log(`   ✅ All ${validRows.length} entries validated\n`);
    }

    // ─── Process updates ─────────────────────────────────────────
    console.log('🔄 Updating database...\n');

    let successCount = 0;
    let failCount = 0;
    const updateResults = [];

    for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        const progress = `[${i + 1}/${validRows.length}]`;

        try {
            // Verify record exists
            const { data: existing, error: fetchError } = await supabase
                .from(row.table_name)
                .select('id, file_url')
                .eq('id', row.record_id)
                .single();

            if (fetchError || !existing) {
                console.log(`   ${progress} ❌ ${row.table_name}/${row.record_id} — Record not found`);
                failCount++;
                updateResults.push({ ...row, status: 'NOT_FOUND' });
                continue;
            }

            // Update the URL
            const { error: updateError } = await supabase
                .from(row.table_name)
                .update({ file_url: row.new_url })
                .eq('id', row.record_id);

            if (updateError) {
                console.log(`   ${progress} ❌ ${row.table_name}/${row.record_id} — ${updateError.message}`);
                failCount++;
                updateResults.push({ ...row, status: 'ERROR', error: updateError.message });
                continue;
            }

            console.log(`   ${progress} ✅ ${row.table_name} — Updated`);
            successCount++;
            updateResults.push({ ...row, status: 'SUCCESS', old_url: existing.file_url });

        } catch (err) {
            console.log(`   ${progress} ❌ ${row.table_name}/${row.record_id} — ${err.message}`);
            failCount++;
            updateResults.push({ ...row, status: 'ERROR', error: err.message });
        }
    }

    // ─── Post-update verification ────────────────────────────────
    console.log('\n🔍 Verifying no Supabase storage URLs remain...');

    let remainingSupabaseUrls = 0;
    for (const table of VALID_TABLES) {
        const { data, error } = await supabase
            .from(table)
            .select('id, file_url')
            .like('file_url', '%supabase.co/storage%');

        if (!error && data) {
            remainingSupabaseUrls += data.length;
            if (data.length > 0) {
                console.log(`   ⚠️  ${table}: ${data.length} records still have Supabase URLs`);
                data.forEach(r => console.log(`      - ${r.id}: ${r.file_url}`));
            }
        }
    }

    if (remainingSupabaseUrls === 0) {
        console.log('   ✅ No Supabase storage URLs remain in database');
    }

    // ─── Generate report ─────────────────────────────────────────
    const reportLines = [
        '═══════════════════════════════════════════════',
        '  GOOGLE DRIVE MIGRATION REPORT',
        `  Date: ${new Date().toISOString()}`,
        '═══════════════════════════════════════════════',
        '',
        `  Total processed:    ${validRows.length}`,
        `  Successful:         ${successCount}`,
        `  Failed:             ${failCount}`,
        `  Validation errors:  ${errors.length}`,
        `  Remaining Supabase: ${remainingSupabaseUrls}`,
        '',
        '───── DETAILS ─────',
        '',
    ];

    updateResults.forEach(r => {
        reportLines.push(`  [${r.status}] ${r.table_name} / ${r.record_id}`);
        reportLines.push(`    New URL: ${r.new_url}`);
        if (r.old_url) reportLines.push(`    Old URL: ${r.old_url}`);
        if (r.error) reportLines.push(`    Error: ${r.error}`);
        reportLines.push('');
    });

    if (errors.length > 0) {
        reportLines.push('───── VALIDATION ERRORS ─────');
        reportLines.push('');
        errors.forEach(e => reportLines.push(`  ${e}`));
    }

    fs.writeFileSync(reportPath, reportLines.join('\n'), 'utf-8');
    console.log(`\n📝 Report saved to: ${reportPath}`);

    // ─── Summary ─────────────────────────────────────────────────
    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║                  📊 SUMMARY                  ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║  Successful:  ${String(successCount).padStart(4)} updates                  ║`);
    console.log(`║  Failed:      ${String(failCount).padStart(4)} updates                  ║`);
    console.log(`║  Remaining:   ${String(remainingSupabaseUrls).padStart(4)} Supabase URLs            ║`);
    console.log('╚══════════════════════════════════════════════╝');

    if (failCount > 0) {
        console.log('\n⚠️  Some updates failed. Check the report for details.');
    }

    if (remainingSupabaseUrls > 0) {
        console.log('\n⚠️  Some records still have Supabase URLs. Add them to the CSV and re-run.');
    }

    console.log('\n📋 NEXT STEPS:');
    console.log('   1. Test downloads in the app');
    console.log('   2. Run: node scripts/verifyMigration.js');
    console.log('   3. Once verified, run: node scripts/cleanupStorage.js\n');
}

updateToGoogleDrive().catch(err => {
    console.error('\n💥 Fatal error:', err);
    process.exit(1);
});
