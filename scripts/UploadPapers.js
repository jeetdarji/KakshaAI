/**
 * Upload Past Year Papers to Supabase - UPDATED VERSION
 * 
 * This script handles your actual PDF naming convention:
 * MHT-CET-2025-April-19-PCM-Shift-1-Question-Paper-With-Answer-...
 * MHT-CET-2023-9th-May-Morning-Shift
 * MHT-CET-2022-Question-Paper-1-with-Answer-Key
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const PAPERS_FOLDER = path.join(__dirname, '../papers');
const BUCKET_NAME = 'papers';

/**
 * Parse metadata from your actual filename format
 * Examples:
 * - MHT-CET-2025-April-19-PCM-Shift-1-Question-Paper-With-Answer-...
 * - MHT-CET-2023-9th-May-Morning-Shift
 * - MHT-CET-2022-Question-Paper-1-with-Answer-Key
 */
function parseFilename(filename) {
    try {
        const nameWithoutExt = filename.replace('.pdf', '');
        const parts = nameWithoutExt.split('-');

        // Extract exam type (usually first 2-3 parts)
        let examType = 'MHT-CET'; // Default
        if (parts[0] && parts[1]) {
            examType = `${parts[0]}-${parts[1]}`;
        }

        // Extract year (look for 4-digit number)
        let year = null;
        let yearIndex = -1;
        for (let i = 0; i < parts.length; i++) {
            const num = parseInt(parts[i]);
            if (!isNaN(num) && num >= 2018 && num <= 2030) {
                year = num;
                yearIndex = i;
                break;
            }
        }

        if (!year) {
            console.warn(`⚠️  Could not find valid year in: ${filename}`);
            return null;
        }

        // Determine subject based on filename
        let subject = 'All';
        const filenameLower = nameWithoutExt.toLowerCase();

        if (filenameLower.includes('pcm')) {
            subject = 'PCM'; // Physics, Chemistry, Maths
        } else if (filenameLower.includes('pcb')) {
            subject = 'PCB'; // Physics, Chemistry, Biology
        } else if (filenameLower.includes('physics')) {
            subject = 'Physics';
        } else if (filenameLower.includes('chemistry')) {
            subject = 'Chemistry';
        } else if (filenameLower.includes('maths') || filenameLower.includes('mathematics')) {
            subject = 'Maths';
        } else if (filenameLower.includes('biology')) {
            subject = 'Biology';
        }

        // Determine shift
        let shift = 'All';
        if (filenameLower.includes('shift-1') || filenameLower.includes('shift1')) {
            shift = 'Shift 1';
        } else if (filenameLower.includes('shift-2') || filenameLower.includes('shift2')) {
            shift = 'Shift 2';
        } else if (filenameLower.includes('morning')) {
            shift = 'Morning';
        } else if (filenameLower.includes('evening')) {
            shift = 'Evening';
        }

        // Extract date if available (e.g., April-19, 9th-May)
        let date = '';
        const monthIndex = parts.findIndex(p =>
            ['january', 'february', 'march', 'april', 'may', 'june',
                'july', 'august', 'september', 'october', 'november', 'december']
                .includes(p.toLowerCase())
        );

        if (monthIndex > 0 && monthIndex < parts.length - 1) {
            const day = parts[monthIndex - 1];
            const month = parts[monthIndex];
            date = `${day} ${month}`;
        }

        // Build title
        let title = `${examType} ${year}`;
        if (date) title += ` - ${date}`;
        if (subject !== 'All') title += ` - ${subject}`;
        if (shift !== 'All') title += ` - ${shift}`;

        // Check if it's a question paper with answers
        const hasAnswers = filenameLower.includes('answer') || filenameLower.includes('key');

        return {
            year,
            examType,
            subject,
            shift,
            date,
            hasAnswers,
            title,
            originalFilename: filename,
        };
    } catch (error) {
        console.error(`❌ Error parsing filename ${filename}:`, error.message);
        return null;
    }
}

/**
 * Get file size in human-readable format
 */
function getFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Upload a single PDF to Supabase
 */
async function uploadPaper(filepath, filename) {
    console.log(`\n📄 Processing: ${filename}`);

    const metadata = parseFilename(filename);
    if (!metadata) {
        console.log(`⏭️  Skipping ${filename} - could not parse`);
        return { success: false, error: 'Could not parse filename' };
    }

    try {
        const fileBuffer = fs.readFileSync(filepath);
        const stats = fs.statSync(filepath);
        const fileSize = getFileSize(stats.size);

        console.log(`   📅 Year: ${metadata.year}`);
        console.log(`   📚 Exam: ${metadata.examType}`);
        console.log(`   📖 Subject: ${metadata.subject}`);
        console.log(`   ⏰ Shift: ${metadata.shift}`);
        if (metadata.date) console.log(`   📆 Date: ${metadata.date}`);
        if (metadata.hasAnswers) console.log(`   ✅ Has Answers`);
        console.log(`   💾 Size: ${fileSize}`);

        // Create storage path: year/exam/filename
        const storagePath = `${metadata.year}/${metadata.examType}/${filename}`;

        // Check if already exists
        const { data: existingFiles } = await supabase.storage
            .from(BUCKET_NAME)
            .list(`${metadata.year}/${metadata.examType}`);

        const fileExists = existingFiles?.some(f => f.name === filename);

        if (fileExists) {
            console.log(`   ℹ️  File already exists in storage`);
        } else {
            console.log(`   ⬆️  Uploading to storage...`);
            const { error: uploadError } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(storagePath, fileBuffer, {
                    contentType: 'application/pdf',
                    upsert: true,
                });

            if (uploadError) {
                throw new Error(`Storage upload failed: ${uploadError.message}`);
            }
            console.log(`   ✅ Uploaded to storage`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(storagePath);

        const publicUrl = urlData.publicUrl;

        // Check if record exists
        const { data: existingRecord } = await supabase
            .from('papers')
            .select('id')
            .eq('file_path', storagePath)
            .single();

        if (existingRecord) {
            console.log(`   ℹ️  Database record exists (ID: ${existingRecord.id})`);
            return { success: true, exists: true, id: existingRecord.id };
        }

        // Insert into database
        console.log(`   💾 Creating database record...`);
        const { data: dbData, error: dbError } = await supabase
            .from('papers')
            .insert([{
                title: metadata.title,
                year: metadata.year,
                subject: metadata.subject,
                exam_type: metadata.examType,
                shift: metadata.shift,
                file_path: storagePath,
                file_size: fileSize,
                file_url: publicUrl,
                has_answers: metadata.hasAnswers,
                exam_date: metadata.date || null,
            }])
            .select()
            .single();

        if (dbError) {
            throw new Error(`Database insert failed: ${dbError.message}`);
        }

        console.log(`   ✅ Successfully uploaded! (ID: ${dbData.id})`);

        return {
            success: true,
            exists: false,
            id: dbData.id,
            data: dbData,
        };
    } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Main upload function
 */
async function uploadAllPapers() {
    console.log('🚀 Starting Past Papers Upload Process\n');
    console.log('='.repeat(60));

    if (!fs.existsSync(PAPERS_FOLDER)) {
        console.error(`❌ Papers folder not found: ${PAPERS_FOLDER}`);
        console.log('\n💡 Creating papers folder...');
        fs.mkdirSync(PAPERS_FOLDER, { recursive: true });
        console.log(`✅ Created folder: ${PAPERS_FOLDER}`);
        console.log('\n📝 Please add your PDF files to this folder');
        console.log('   Your current naming format is supported:');
        console.log('   - MHT-CET-2025-April-19-PCM-Shift-1-Question-Paper-...');
        console.log('   - MHT-CET-2023-9th-May-Morning-Shift');
        console.log('   - MHT-CET-2022-Question-Paper-1-with-Answer-Key');
        return;
    }

    const files = fs.readdirSync(PAPERS_FOLDER).filter(file => file.endsWith('.pdf'));

    if (files.length === 0) {
        console.log(`⚠️  No PDF files found in ${PAPERS_FOLDER}`);
        return;
    }

    console.log(`\n📚 Found ${files.length} PDF file(s)\n`);
    console.log('='.repeat(60));

    const results = {
        success: 0,
        failed: 0,
        exists: 0,
        errors: [],
    };

    for (const filename of files) {
        const filepath = path.join(PAPERS_FOLDER, filename);
        const result = await uploadPaper(filepath, filename);

        if (result.success) {
            if (result.exists) {
                results.exists++;
            } else {
                results.success++;
            }
        } else {
            results.failed++;
            results.errors.push({ filename, error: result.error });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 UPLOAD SUMMARY\n');
    console.log(`✅ Successfully uploaded: ${results.success}`);
    console.log(`ℹ️  Already exists: ${results.exists}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📁 Total processed: ${files.length}`);

    if (results.errors.length > 0) {
        console.log('\n❌ Errors:');
        results.errors.forEach(({ filename, error }) => {
            console.log(`   - ${filename}: ${error}`);
        });
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✨ Upload process completed!');

    if (results.success > 0) {
        console.log('\n🎉 Your papers are now available in the app!');
        console.log('   Visit: /study-hub/past-papers');
    }
}

uploadAllPapers().catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
});