import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Supabase
const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

// ================================================================
// CONFIGURATION - Add/Remove tests here
// ================================================================
const TESTS_CONFIG = [
    {
        number: 1,
        title: 'MHT-CET Full Mock Test #1',
        description: 'Complete Syllabus - Foundation Level',
        difficulty: 'Medium',
        jsonFile: 'questions_data_test1.json'
    },
    {
        number: 2,
        title: 'MHT-CET Full Mock Test #2',
        description: 'Complete Syllabus - Intermediate Level',
        difficulty: 'Medium',
        jsonFile: 'questions_data_test2.json'
    },
    {
        number: 3,
        title: 'MHT-CET Full Mock Test #3',
        description: 'Complete Syllabus - Advanced Topics',
        difficulty: 'Hard',
        jsonFile: 'questions_data_test3.json'
    },
    {
        number: 4,
        title: 'MHT-CET Full Mock Test #4',
        description: 'Complete Syllabus - Speed & Accuracy',
        difficulty: 'Hard',
        jsonFile: 'questions_data_test4.json'
    },
    {
        number: 5,
        title: 'MHT-CET Full Mock Test #5',
        description: 'Complete Syllabus - Final Preparation',
        difficulty: 'Hard',
        jsonFile: 'questions_data_test5.json'
    },
    {
        number: 6,
        title: 'MHT-CET Full Mock Test #6',
        description: 'Complete Syllabus - Revision Test',
        difficulty: 'Medium',
        jsonFile: 'questions_data_test6.json'
    }
];

// ================================================================
// HELPER FUNCTIONS
// ================================================================

function loadQuestionData(filename) {
    try {
        const filePath = join(__dirname, filename);
        const data = JSON.parse(readFileSync(filePath, 'utf-8'));
        return data;
    } catch (error) {
        console.error(`❌ Failed to load ${filename}:`, error.message);
        return null;
    }
}

function countQuestions(questionsData) {
    return (
        (questionsData.physics?.length || 0) +
        (questionsData.chemistry?.length || 0) +
        (questionsData.mathematics?.length || 0)
    );
}

async function createTest(config) {
    const { data: test, error } = await supabase
        .from('tests')
        .insert({
            title: config.title,
            description: config.description,
            total_marks: 200,
            difficulty: config.difficulty,
            duration_mins: 180,
            is_active: true
        })
        .select()
        .single();

    if (error) throw error;
    return test;
}

async function createSections(testId) {
    // Section 1: Physics & Chemistry
    const { data: section1, error: s1Error } = await supabase
        .from('sections')
        .insert({
            test_id: testId,
            name: 'Physics & Chemistry',
            order_index: 1,
            duration_mins: 90
        })
        .select()
        .single();

    if (s1Error) throw s1Error;

    // Section 2: Mathematics
    const { data: section2, error: s2Error } = await supabase
        .from('sections')
        .insert({
            test_id: testId,
            name: 'Mathematics',
            order_index: 2,
            duration_mins: 90
        })
        .select()
        .single();

    if (s2Error) throw s2Error;

    return { section1, section2 };
}

function prepareQuestions(questionsData, section1Id, section2Id) {
    const allQuestions = [];

    // Helper function to process questions
    const processQuestions = (questions, sectionId, subjectName) => {
        if (!questions || questions.length === 0) return;

        for (const q of questions) {
            const optionsArray = [
                q.option_a,
                q.option_b,
                q.option_c,
                q.option_d
            ];

            const marks = q.marks || (subjectName === 'Mathematics' ? 2 : 1);

            allQuestions.push({
                section_id: sectionId,
                subject: q.subject || subjectName,
                question_text: q.question_text,
                options: optionsArray,
                correct_option: q.correct_option,
                marks: marks
            });
        }
    };

    // Process Physics (Section 1)
    processQuestions(questionsData.physics, section1Id, 'Physics');

    // Process Chemistry (Section 1)
    processQuestions(questionsData.chemistry, section1Id, 'Chemistry');

    // Process Mathematics (Section 2)
    processQuestions(questionsData.mathematics, section2Id, 'Mathematics');

    return allQuestions;
}

async function insertQuestions(questions, testNumber) {
    const batchSize = 50;
    let insertedCount = 0;

    for (let i = 0; i < questions.length; i += batchSize) {
        const batch = questions.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(questions.length / batchSize);

        const { error } = await supabase
            .from('questions')
            .insert(batch);

        if (error) {
            console.error(`❌ Test #${testNumber} - Batch ${batchNumber} failed:`, error);
            throw error;
        }

        insertedCount += batch.length;
        console.log(`     ✅ Batch ${batchNumber}/${totalBatches} inserted (${batch.length} questions)`);
    }

    return insertedCount;
}

// ================================================================
// MAIN SEED FUNCTION
// ================================================================

async function seedAllTests() {
    console.log('🚀 Starting Multi-Test Database Seed...\n');
    console.log('='.repeat(70));

    const results = {
        successful: [],
        failed: [],
        totalQuestions: 0
    };

    // Process each test
    for (const config of TESTS_CONFIG) {
        try {
            console.log(`\n📝 Processing Test #${config.number}: ${config.title}`);
            console.log('-'.repeat(70));

            // Step 1: Load question data
            console.log(`   📂 Loading ${config.jsonFile}...`);
            const questionsData = loadQuestionData(config.jsonFile);

            if (!questionsData) {
                console.log(`   ⚠️  Skipping - file not found or invalid JSON\n`);
                results.failed.push({
                    number: config.number,
                    reason: 'File not found or invalid JSON'
                });
                continue;
            }

            const totalQuestions = countQuestions(questionsData);
            console.log(`   ✅ Loaded ${totalQuestions} questions`);
            console.log(`      • Physics: ${questionsData.physics?.length || 0}`);
            console.log(`      • Chemistry: ${questionsData.chemistry?.length || 0}`);
            console.log(`      • Mathematics: ${questionsData.mathematics?.length || 0}`);

            if (totalQuestions === 0) {
                console.log(`   ⚠️  Skipping - no questions found\n`);
                results.failed.push({
                    number: config.number,
                    reason: 'No questions in file'
                });
                continue;
            }

            // Step 2: Create test
            console.log(`\n   🎯 Creating test in database...`);
            const test = await createTest(config);
            console.log(`   ✅ Test created (ID: ${test.id})`);

            // Step 3: Create sections
            console.log(`\n   📑 Creating sections...`);
            const { section1, section2 } = await createSections(test.id);
            console.log(`   ✅ Section 1: Physics & Chemistry (ID: ${section1.id})`);
            console.log(`   ✅ Section 2: Mathematics (ID: ${section2.id})`);

            // Step 4: Prepare questions
            console.log(`\n   🔧 Preparing questions for insertion...`);
            const questions = prepareQuestions(questionsData, section1.id, section2.id);
            console.log(`   ✅ ${questions.length} questions prepared`);

            // Step 5: Insert questions
            console.log(`\n   💾 Inserting questions into database...`);
            const insertedCount = await insertQuestions(questions, config.number);
            console.log(`   ✅ ${insertedCount} questions inserted successfully`);

            // Record success
            results.successful.push({
                number: config.number,
                testId: test.id,
                title: config.title,
                questions: insertedCount
            });
            results.totalQuestions += insertedCount;

            console.log(`\n   ✅ Test #${config.number} completed successfully!`);

        } catch (error) {
            console.error(`\n   ❌ Test #${config.number} FAILED:`, error.message);
            results.failed.push({
                number: config.number,
                reason: error.message
            });
        }
    }

    // ================================================================
    // FINAL SUMMARY
    // ================================================================
    console.log('\n' + '='.repeat(70));
    console.log('📊 SEED SUMMARY');
    console.log('='.repeat(70));

    if (results.successful.length > 0) {
        console.log(`\n✅ Successfully seeded ${results.successful.length} test(s):\n`);
        results.successful.forEach(test => {
            console.log(`   📌 Test #${test.number}: ${test.title}`);
            console.log(`      • Test ID: ${test.testId}`);
            console.log(`      • Questions: ${test.questions}`);
        });
        console.log(`\n   📊 Total Questions Inserted: ${results.totalQuestions}`);
    }

    if (results.failed.length > 0) {
        console.log(`\n❌ Failed to seed ${results.failed.length} test(s):\n`);
        results.failed.forEach(test => {
            console.log(`   📌 Test #${test.number}: ${test.reason}`);
        });
    }

    console.log('\n' + '='.repeat(70));

    if (results.failed.length === 0) {
        console.log('✅ ALL TESTS SEEDED SUCCESSFULLY! 🎉');
    } else if (results.successful.length > 0) {
        console.log('⚠️  PARTIAL SUCCESS - Some tests failed');
    } else {
        console.log('❌ ALL TESTS FAILED');
        process.exit(1);
    }

    console.log('='.repeat(70) + '\n');
}

// ================================================================
// RUN THE SEED
// ================================================================

seedAllTests().catch(error => {
    console.error('\n❌ CRITICAL ERROR:', error);
    process.exit(1);
});