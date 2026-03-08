/**
 * Import Cutoff Data from XLSX files into Supabase
 * 
 * Usage:
 *   node importCutoffs.js                  # Import all files
 *   node importCutoffs.js --dry-run        # Preview without inserting
 *   node importCutoffs.js --clear          # Delete all existing data first
 *   node importCutoffs.js --clear --dry-run # Preview clear + import
 * 
 * Prerequisites:
 *   1. Run database/cutoff_schema.sql in Supabase SQL Editor first
 *   2. npm install xlsx @supabase/supabase-js dotenv (in scripts/ directory)
 *   3. .env file in project root with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 */

import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load env from project root
dotenv.config({ path: path.join(rootDir, '.env') });

// Also try .env.local
if (!process.env.VITE_SUPABASE_URL) {
    dotenv.config({ path: path.join(rootDir, '.env.local') });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// CLI flags
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const CLEAR = args.includes('--clear');
const BATCH_SIZE = 500;

// XLSX files directory
const csvDir = path.join(rootDir, 'Cutoff_Csvs');

/**
 * Parse filename to extract year and CAP round
 * Example: "2025_ENGG_CAP1_CutOff.csv.xlsx" → { year: 2025, capRound: 1 }
 */
function parseFilename(filename) {
    const match = filename.match(/(\d{4})_ENGG_CAP(\d)_/);
    if (!match) return null;
    return { year: parseInt(match[1]), capRound: parseInt(match[2]) };
}

/**
 * Read an XLSX file and return rows as objects
 */
function readXLSX(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert to JSON (header row becomes keys)
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
    return rows;
}

/**
 * Map a raw XLSX row to our database schema
 */
function mapRow(row, year, capRound) {
    return {
        year: year,
        cap_round: capRound,
        college_code: row['College Code'] ?? 0,
        college_name: row['College Name'] ?? '',
        course_code: row['Course Code'] ?? 0,
        course_name: row['Course Name'] ?? '',
        status: row['Status'] ?? null,
        level: row['Level'] ?? null,
        stage: row['Stage'] ?? null,
        category: row['Caste/Category'] ?? row['Category'] ?? '',
        cutoff_rank: row['Cutoff Rank'] != null ? parseInt(row['Cutoff Rank']) : null,
        cutoff_percentile: row['Cutoff Percentile'] != null ? parseFloat(row['Cutoff Percentile']) : null,
    };
}

/**
 * Sleep helper
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Insert rows in batches with retry logic
 */
async function batchInsert(rows, filename) {
    let inserted = 0;
    const total = rows.length;
    const MAX_RETRIES = 5;
    const RETRY_DELAY = 3000; // 3 seconds

    for (let i = 0; i < total; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        
        if (!DRY_RUN) {
            let success = false;
            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                const { error } = await supabase.from('cutoffs').insert(batch);
                if (!error) {
                    success = true;
                    break;
                }

                // If it's a network error and we have retries left, wait and retry
                const isNetworkError = error.message?.includes('fetch failed') ||
                    error.message?.includes('ECONNRESET') ||
                    error.message?.includes('ENOTFOUND') ||
                    error.message?.includes('ETIMEDOUT') ||
                    error.message?.includes('socket hang up');

                if (isNetworkError && attempt < MAX_RETRIES) {
                    const delay = RETRY_DELAY * attempt;
                    console.log(`\n  ⚠️  Batch ${batchNum} failed (${error.message}). Retry ${attempt}/${MAX_RETRIES} in ${delay / 1000}s...`);
                    await sleep(delay);
                    continue;
                }

                // Non-network error or exhausted retries
                console.error(`\n  ❌ Error at batch ${batchNum}: ${error.message}`);
                if (error.details) console.error(`     Details: ${error.details}`);
                break;
            }

            if (!success) continue;
        }
        
        inserted += batch.length;
        const pct = ((inserted / total) * 100).toFixed(0);
        process.stdout.write(`\r  📦 ${filename}: ${inserted.toLocaleString()}/${total.toLocaleString()} rows (${pct}%)`);
    }
    
    console.log(''); // newline after progress
    return inserted;
}

/**
 * Main import function
 */
async function main() {
    console.log('🎓 Kaksha AI — Cutoff Data Import');
    console.log('═'.repeat(50));
    
    if (DRY_RUN) console.log('🔍 DRY RUN MODE — No data will be inserted\n');
    
    // Step 1: Clear existing data if requested
    if (CLEAR) {
        console.log('🗑️  Clearing existing cutoff data...');
        if (!DRY_RUN) {
            const { error } = await supabase.from('cutoffs').delete().neq('id', 0);
            if (error) {
                console.error(`❌ Failed to clear data: ${error.message}`);
                process.exit(1);
            }
        }
        console.log('✅ Existing data cleared\n');
    }

    // Step 2: Find all XLSX files
    const files = fs.readdirSync(csvDir)
        .filter(f => f.endsWith('.xlsx'))
        .sort();
    
    if (files.length === 0) {
        console.error(`❌ No .xlsx files found in ${csvDir}`);
        process.exit(1);
    }

    console.log(`📂 Found ${files.length} files in Cutoff_Csvs/\n`);

    // Step 3: Process each file
    let grandTotal = 0;
    const summary = [];

    for (const file of files) {
        const parsed = parseFilename(file);
        if (!parsed) {
            console.log(`⚠️  Skipping ${file} (can't parse year/round from filename)`);
            continue;
        }

        const { year, capRound } = parsed;
        const filePath = path.join(csvDir, file);
        
        console.log(`📄 Processing: ${file} (Year: ${year}, CAP Round: ${capRound})`);
        
        // Read XLSX
        const rawRows = readXLSX(filePath);
        console.log(`   Read ${rawRows.length.toLocaleString()} rows from file`);
        
        // Map rows to database schema
        const mappedRows = rawRows
            .map(row => mapRow(row, year, capRound))
            .filter(row => row.college_name && row.category); // Skip empty rows
        
        console.log(`   Mapped ${mappedRows.length.toLocaleString()} valid rows`);
        
        // Insert
        const inserted = await batchInsert(mappedRows, file);
        grandTotal += inserted;
        
        summary.push({
            file,
            year,
            capRound,
            rawRows: rawRows.length,
            inserted
        });
    }

    // Step 4: Summary
    console.log('\n' + '═'.repeat(50));
    console.log('📊 IMPORT SUMMARY');
    console.log('═'.repeat(50));
    
    for (const s of summary) {
        console.log(`  ${s.year} CAP ${s.capRound}: ${s.inserted.toLocaleString()} rows`);
    }
    
    console.log(`\n  TOTAL: ${grandTotal.toLocaleString()} rows ${DRY_RUN ? '(dry run)' : 'imported'}`);

    // Step 5: Verify (if not dry run)
    if (!DRY_RUN) {
        console.log('\n🔍 Verifying...');
        
        const { count, error } = await supabase
            .from('cutoffs')
            .select('*', { count: 'exact', head: true });
        
        if (error) {
            console.error(`❌ Verification failed: ${error.message}`);
        } else {
            console.log(`✅ Database contains ${count?.toLocaleString()} total cutoff records`);
        }
        
        // Quick sample query
        const { data: sample } = await supabase
            .from('cutoffs')
            .select('college_name, course_name, cutoff_rank, cutoff_percentile, year, cap_round')
            .ilike('college_name', '%COEP%')
            .ilike('course_name', '%Computer%')
            .eq('category', 'GOPENS')
            .order('year', { ascending: false })
            .limit(3);
        
        if (sample && sample.length > 0) {
            console.log('\n📋 Sample: COEP Computer Engineering (GOPENS)');
            sample.forEach(s => {
                console.log(`   ${s.year} R${s.cap_round}: Rank ${s.cutoff_rank?.toLocaleString()}, Percentile ${s.cutoff_percentile}`);
            });
        }
    }

    console.log('\n✨ Done!');
}

main().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
});
