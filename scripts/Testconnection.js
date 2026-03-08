/**
 * Test Supabase Connection
 * 
 * This script tests your connection to Supabase and verifies
 * that your database tables and storage bucket are set up correctly.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Testing Supabase Connection...\n');
console.log('='.repeat(50));

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables!');
    console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    let allTestsPassed = true;

    // Test 1: Database connection
    console.log('\n📊 Test 1: Database Connection');
    try {
        const { data, error } = await supabase
            .from('papers')
            .select('count')
            .limit(1);

        if (error) throw error;
        console.log('✅ Database connection successful');
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        allTestsPassed = false;
    }

    // Test 2: Papers table
    console.log('\n📚 Test 2: Papers Table');
    try {
        const { data, error, count } = await supabase
            .from('papers')
            .select('*', { count: 'exact' })
            .limit(5);

        if (error) throw error;

        console.log(`✅ Papers table accessible`);
        console.log(`   Found ${count || 0} papers in database`);

        if (data && data.length > 0) {
            console.log('\n   Sample papers:');
            data.slice(0, 3).forEach((paper, i) => {
                console.log(`   ${i + 1}. ${paper.title} (${paper.year})`);
            });
        } else {
            console.log('   ⚠️  No papers found - run upload script to add papers');
        }
    } catch (error) {
        console.error('❌ Papers table test failed:', error.message);
        console.log('\n   💡 Make sure you have created the papers table.');
        console.log('   Run the SQL commands from IMPLEMENTATION_GUIDE.md');
        allTestsPassed = false;
    }

    // Test 3: Storage bucket
    console.log('\n📦 Test 3: Storage Bucket');
    try {
        const { data, error } = await supabase.storage
            .from('papers')
            .list('', { limit: 5 });

        if (error) throw error;

        console.log('✅ Storage bucket "papers" is accessible');

        if (data && data.length > 0) {
            console.log(`   Found ${data.length} folders/files in root`);
            data.forEach((item, i) => {
                console.log(`   ${i + 1}. ${item.name} ${item.id ? '(folder)' : ''}`);
            });
        } else {
            console.log('   ℹ️  Bucket is empty - ready for uploads');
        }
    } catch (error) {
        console.error('❌ Storage bucket test failed:', error.message);
        console.log('\n   💡 Make sure you have created the "papers" bucket in Supabase Storage');
        console.log('   and set it to public.');
        allTestsPassed = false;
    }

    // Test 4: Check bucket is public
    console.log('\n🔓 Test 4: Bucket Public Access');
    try {
        const { data: buckets, error } = await supabase.storage.listBuckets();

        if (error) throw error;

        const papersBucket = buckets.find(b => b.name === 'papers');

        if (papersBucket) {
            if (papersBucket.public) {
                console.log('✅ Papers bucket is public - students can access PDFs');
            } else {
                console.log('⚠️  Papers bucket is PRIVATE');
                console.log('   💡 Make it public so students can view PDFs');
                console.log('   Go to: Supabase Dashboard → Storage → papers → Settings → Make Public');
            }
        } else {
            console.log('⚠️  Papers bucket not found');
        }
    } catch (error) {
        console.error('⚠️  Could not check bucket settings:', error.message);
    }

    // Test 5: User progress table (optional)
    console.log('\n👤 Test 5: User Progress Table (Optional)');
    try {
        const { data, error } = await supabase
            .from('user_paper_progress')
            .select('count')
            .limit(1);

        if (error) {
            if (error.message.includes('does not exist')) {
                console.log('ℹ️  User progress table not created yet (optional feature)');
            } else {
                throw error;
            }
        } else {
            console.log('✅ User progress table is set up');
        }
    } catch (error) {
        console.error('⚠️  User progress table check failed:', error.message);
        console.log('   This is optional - only needed if you want to track student progress');
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    if (allTestsPassed) {
        console.log('\n🎉 All critical tests passed!');
        console.log('\n✨ Your Supabase setup is ready to go!');
        console.log('\nNext steps:');
        console.log('1. Add PDF files to the /papers folder');
        console.log('2. Run: node scripts/uploadPapers.js');
        console.log('3. Start your dev server: npm run dev');
    } else {
        console.log('\n⚠️  Some tests failed - please fix the issues above');
        console.log('Refer to IMPLEMENTATION_GUIDE.md for setup instructions');
    }
    console.log('\n' + '='.repeat(50));
}

testConnection().catch(error => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
});