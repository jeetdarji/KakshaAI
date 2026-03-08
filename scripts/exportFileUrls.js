/**
 * Export File URLs Script
 * ========================
 * Exports all file URLs and metadata from Supabase database tables
 * (papers, chapter_notes, formula_books) to a CSV file for migration.
 *
 * Usage: node scripts/exportFileUrls.js
 * Output: migration_data/file_urls_export.csv
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
    console.error('❌ Missing Supabase credentials in .env file');
    console.error('   Required: VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY)');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Escape CSV value (handle commas, quotes, newlines)
const escapeCSV = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

async function exportFileUrls() {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║   📦 FILE URL EXPORT - Google Drive Migration ║');
    console.log('╚══════════════════════════════════════════════╝\n');

    const outputDir = path.resolve(__dirname, '../migration_data');
    const csvPath = path.join(outputDir, 'file_urls_export.csv');
    const backupPath = path.join(outputDir, 'backup_urls.json');

    // Create migration_data directory
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log('📁 Created migration_data/ directory\n');
    }

    let totalRecords = 0;
    const allRecords = [];
    const backupData = { papers: [], chapter_notes: [], formula_books: [], exportedAt: new Date().toISOString() };

    // ─── 1. Export Papers ─────────────────────────────────────────
    console.log('📄 Fetching papers...');
    try {
        const { data: papers, error } = await supabase
            .from('papers')
            .select('id, title, year, subject, exam_type, file_url, has_answers')
            .order('year', { ascending: false });

        if (error) throw error;

        const paperCount = papers?.length || 0;
        console.log(`   Found ${paperCount} papers`);

        if (papers) {
            for (const paper of papers) {
                allRecords.push({
                    table_name: 'papers',
                    record_id: paper.id,
                    title: paper.title,
                    old_url: paper.file_url || '',
                    metadata: `${paper.subject}|${paper.year}|${paper.exam_type}|has_answers:${paper.has_answers}`,
                });
            }
            backupData.papers = papers;
            totalRecords += paperCount;
        }
    } catch (err) {
        console.error('   ❌ Error fetching papers:', err.message);
    }

    // ─── 2. Export Chapter Notes ──────────────────────────────────
    console.log('📝 Fetching chapter_notes...');
    try {
        const { data: notes, error } = await supabase
            .from('chapter_notes')
            .select(`
                id, title, file_url, page_count, note_type,
                chapter_id,
                chapters ( title, subject, class )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const noteCount = notes?.length || 0;
        console.log(`   Found ${noteCount} chapter notes`);

        if (notes) {
            for (const note of notes) {
                const chapterName = note.chapters?.title || 'Unknown';
                const subject = note.chapters?.subject || 'Unknown';
                const classYear = note.chapters?.class || '';
                allRecords.push({
                    table_name: 'chapter_notes',
                    record_id: note.id,
                    title: note.title,
                    old_url: note.file_url || '',
                    metadata: `${subject}|${chapterName}|Class ${classYear}|${note.note_type || 'notes'}|pages:${note.page_count || '?'}`,
                });
            }
            backupData.chapter_notes = notes;
            totalRecords += noteCount;
        }
    } catch (err) {
        console.error('   ❌ Error fetching chapter_notes:', err.message);
    }

    // ─── 3. Export Formula Books ──────────────────────────────────
    console.log('📐 Fetching formula_books...');
    try {
        const { data: formulas, error } = await supabase
            .from('formula_books')
            .select('id, subject, title, file_url, page_count')
            .order('subject', { ascending: true });

        if (error) throw error;

        const formulaCount = formulas?.length || 0;
        console.log(`   Found ${formulaCount} formula books`);

        if (formulas) {
            for (const formula of formulas) {
                allRecords.push({
                    table_name: 'formula_books',
                    record_id: formula.id,
                    title: formula.title,
                    old_url: formula.file_url || '',
                    metadata: `${formula.subject}|pages:${formula.page_count || '?'}`,
                });
            }
            backupData.formula_books = formulas;
            totalRecords += formulaCount;
        }
    } catch (err) {
        console.error('   ❌ Error fetching formula_books:', err.message);
    }

    // ─── Write CSV ───────────────────────────────────────────────
    console.log(`\n📊 Writing CSV with ${totalRecords} records...`);

    const csvHeader = 'table_name,record_id,title,old_url,metadata\n';
    const csvRows = allRecords.map(r =>
        [r.table_name, r.record_id, escapeCSV(r.title), escapeCSV(r.old_url), escapeCSV(r.metadata)].join(',')
    ).join('\n');

    fs.writeFileSync(csvPath, csvHeader + csvRows, 'utf-8');
    console.log(`   ✅ CSV saved to: ${csvPath}`);

    // ─── Write JSON Backup ───────────────────────────────────────
    console.log('💾 Writing JSON backup...');
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');
    console.log(`   ✅ Backup saved to: ${backupPath}`);

    // ─── Summary ─────────────────────────────────────────────────
    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║                  📊 SUMMARY                  ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║  Papers:        ${String(backupData.papers.length).padStart(4)} files                  ║`);
    console.log(`║  Chapter Notes: ${String(backupData.chapter_notes.length).padStart(4)} files                  ║`);
    console.log(`║  Formula Books: ${String(backupData.formula_books.length).padStart(4)} files                  ║`);
    console.log(`║  ────────────────────────────────            ║`);
    console.log(`║  Total:         ${String(totalRecords).padStart(4)} files                  ║`);
    console.log('╚══════════════════════════════════════════════╝');
    console.log('\n📋 NEXT STEPS:');
    console.log('   1. Upload PDFs to Google Drive folder');
    console.log('   2. Get shareable links for each file');
    console.log('   3. Create migration_data/google_drive_urls.csv with mappings');
    console.log('   4. Run: node scripts/updateToGoogleDrive.js\n');
}

exportFileUrls().catch(err => {
    console.error('\n💥 Fatal error:', err);
    process.exit(1);
});
