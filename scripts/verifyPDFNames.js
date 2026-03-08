/**
 * PDF Filename Verification Script
 * Checks if your chapter PDFs match the expected naming convention
 * 
 * Usage: node scripts/verifyPDFNames.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const toExpectedFilename = (title) => {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/(^_|_$)/g, '') + '.pdf';
};

const main = async () => {
    console.log('🔍 Verifying PDF Filenames\n');
    console.log('Expected naming convention:');
    console.log('  - Lowercase');
    console.log('  - Spaces → Underscores');
    console.log('  - Remove special characters (commas, colons, etc.)');
    console.log('  - Example: "Motion in a Plane" → "motion_in_a_plane.pdf"\n');

    try {
        // Fetch all chapters
        const { data: chapters, error } = await supabase
            .from('chapters')
            .select('id, title, subject, class')
            .order('subject', { ascending: true })
            .order('class', { ascending: true })
            .order('order_index', { ascending: true });

        if (error) throw error;

        console.log(`Found ${chapters.length} chapters\n`);

        // List files in bucket
        const { data: files, error: filesError } = await supabase
            .storage
            .from('chapter-notes')
            .list('', {
                limit: 1000,
                offset: 0,
            });

        if (filesError) {
            console.warn('⚠️ Could not list bucket files:', filesError.message);
            console.log('Showing expected filenames only...\n');
        }

        // Build file map
        const fileMap = new Map();
        if (files) {
            const getAllFiles = async (prefix = '') => {
                const { data } = await supabase.storage.from('chapter-notes').list(prefix);
                if (data) {
                    for (const item of data) {
                        const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
                        if (item.id) {
                            // It's a file
                            fileMap.set(fullPath, true);
                        } else {
                            // It's a folder, recurse
                            await getAllFiles(fullPath);
                        }
                    }
                }
            };
            await getAllFiles();
        }

        // Check each chapter
        const subjects = ['Physics', 'Chemistry', 'Maths'];
        const classes = [11, 12];

        for (const subject of subjects) {
            for (const classYear of classes) {
                const subjectChapters = chapters.filter(
                    c => c.subject === subject && c.class === classYear
                );

                if (subjectChapters.length === 0) continue;

                console.log(`\n${'='.repeat(60)}`);
                console.log(`${subject} - Class ${classYear}`);
                console.log(`${'='.repeat(60)}\n`);

                for (const chapter of subjectChapters) {
                    const expectedFilename = toExpectedFilename(chapter.title);
                    const expectedPath = `${subject.toLowerCase()}/class-${classYear}/${expectedFilename}`;
                    const exists = fileMap.has(expectedPath);

                    console.log(`${exists ? '✅' : '❌'} ${chapter.title}`);
                    console.log(`   Expected: ${expectedPath}`);
                    
                    if (!exists && fileMap.size > 0) {
                        // Try to find similar files
                        const similarFiles = Array.from(fileMap.keys()).filter(f => 
                            f.includes(subject.toLowerCase()) && 
                            f.includes(`class-${classYear}`) &&
                            f.toLowerCase().includes(chapter.title.split(' ')[0].toLowerCase())
                        );
                        
                        if (similarFiles.length > 0) {
                            console.log(`   💡 Similar files found:`);
                            similarFiles.forEach(f => console.log(`      - ${f}`));
                        }
                    }
                    console.log('');
                }
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('Summary');
        console.log('='.repeat(60));
        
        if (fileMap.size === 0) {
            console.log('\n⚠️ Could not access bucket files.');
            console.log('Make sure:');
            console.log('  1. The bucket "chapter-notes" exists');
            console.log('  2. You have the correct permissions');
            console.log('  3. The bucket is public or you\'re using service role key');
        } else {
            const totalExpected = chapters.length;
            const totalFound = Array.from(fileMap.keys()).filter(f => f.endsWith('.pdf')).length;
            
            console.log(`\nTotal chapters: ${totalExpected}`);
            console.log(`Total PDFs in bucket: ${totalFound}`);
            
            if (totalFound < totalExpected) {
                console.log('\n⚠️ Some PDFs are missing. Upload them to the bucket.');
            } else if (totalFound > totalExpected) {
                console.log('\n💡 Extra PDFs found. You may have duplicates or old files.');
            } else {
                console.log('\n✅ All PDFs accounted for!');
            }
        }

        console.log('\n📝 Next Steps:');
        console.log('  1. Upload missing PDFs to Supabase Storage');
        console.log('  2. Ensure filenames match the expected pattern');
        console.log('  3. Run the SQL queries from FIXES_APPLIED.md');
        console.log('  4. Test preview/download in the app\n');

    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
};

main();
