/**
 * Fix Notes Paths to Match Actual Files
 * Updates database paths to match your actual PDF naming: 11th_PHY_Vector.pdf
 * 
 * Usage: node scripts/fixNotesPathsForActualFiles.js
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

// Mapping of chapter titles to actual PDF filenames
const fileNameMappings = {
    'Physics': {
        11: {
            'Vectors': '11th_PHY_Vector.pdf',
            'Error Analysis': '11th_PHY_Error analysis.pdf',
            'Motion in a Plane': '11th_PHY_Motion in a plane.pdf',
            'Laws of Motion': '11th_PHY_Laws of motion.pdf',
            'Gravitation': '11th_PHY_Gravitation.pdf',
            'Thermal Properties of Matter': '11th_PHY_Thermal prop of matter.pdf',
            'Sound': '11th_PHY_Sound.pdf',
            'Optics': '11th_PHY_Optics.pdf',
            'Electrostatics': '11th_PHY_Electrostatics.pdf',
            'Semiconductors': '11th_PHY_Semiconductors.pdf',
        },
        12: {
            'Circular Motion': '12th_PHY_Circular Motion.pdf',
            'Gravitation': '12th_PHY_Gravitation.pdf',
            'Rotational Motion': '12th_PHY_Rotational Motion.pdf',
            'Oscillations': '12th_PHY_Oscillations.pdf',
            'Elasticity': '12th_PHY_Elasticity.pdf',
            'Surface Tension': '12th_PHY_Surface Tension.pdf',
            'Wave Motion': '12th_PHY_Wave Motion.pdf',
            'Stationary Waves': '12th_PHY_Stationary Waves.pdf',
            'Wave Theory of Light': '12th_PHY_Wave Theory of Light.pdf',
            'Electrostatics': '12th_PHY_Electrostatics.pdf',
            'Current Electricity': '12th_PHY_Current Electricity.pdf',
            'Magnetism': '12th_PHY_Magnetism.pdf',
            'Electromagnetic Inductions': '12th_PHY_Electromagnetic Inductions.pdf',
            'Electrons and Photons': '12th_PHY_Electrons and Photons.pdf',
            'Semiconductors': '12th_PHY_Semiconductors.pdf',
            'Communication Systems': '12th_PHY_Communication Systems.pdf',
            'Kinetic Theory of Gases': '12th_PHY_Kinetic Theory of Gases.pdf',
        }
    },
    'Chemistry': {
        11: {
            'Some Basic Concepts of Chemistry': '11th_CHEM_Some Basic Concepts of Chemistry.pdf',
            'Structure of Atom': '11th_CHEM_Structure of Atom.pdf',
            'Chemical Bonding': '11th_CHEM_Chemical Bonding.pdf',
            'States of Matter: Gases and Liquids': '11th_CHEM_States of Matter.pdf',
            'Redox Reactions': '11th_CHEM_Redox reaction.pdf',
            'Elements of Groups 1 and 2': '11th_CHEM_Elements of Groups 1 and 2.pdf',
            'Adsorption and Colloids': '11th_CHEM_Adsorption and colloids.pdf',
            'Hydrocarbons': '11th_CHEM_Hydrocarbons.pdf',
            'Basic Principles of Organic Chemistry': '11th_CHEM_Basic Principles of Organic Chemistry.pdf',
            'Chemistry in Everyday Life': '11th_CHEM_Chemistry In Everyday Life.pdf',
        },
        12: {
            'Solid State': '12th_CHEM_Solid State.pdf',
            'Solutions and Colligative Properties': '12th_CHEM_Solutions and Colligative Properties.pdf',
            'Chemical Thermodynamics and Electrochemistry': '12th_CHEM_Chemical Thermodynamics and Electrochemistry.pdf',
            'Chemical Kinetics': '12th_CHEM_Chemical Kinetics.pdf',
            'p-Block Elements': '12th_CHEM_p-Block Elements.pdf',
            'd and f Block Elements': '12th_CHEM_d and f Block Elements.pdf',
            'Coordination Compounds': '12th_CHEM_Coordination Compounds.pdf',
            'Halogen Derivatives, Alcohols, Phenols, and Ethers': '12th_CHEM_Halogen Derivatives, Alcohols, Phenols, and Ethers.pdf',
            'Biomolecules and Polymers': '12th_CHEM_Biomolecules and Polymers.pdf',
            'Chemistry in Everyday Life': '12th_CHEM_Chemistry In Everyday Life.pdf',
        }
    },
    'Maths': {
        11: {
            'Trigonometry II': '11th_MATH_Trigonometry II.pdf',
            'Straight Lines': '11th_MATH_Straight Lines.pdf',
            'Circles': '11th_MATH_Circles.pdf',
            'Probability': '11th_MATH_Probability.pdf',
            'Complex Numbers': '11th_MATH_Complex Numbers.pdf',
            'Permutations and Combinations': '11th_MATH_Permutations and Combinations.pdf',
            'Functions': '11th_MATH_Functions.pdf',
            'Limits': '11th_MATH_Limits.pdf',
            'Continuity': '11th_MATH_Continuity.pdf',
            'Conic Sections': '11th_MATH_Conic Sections.pdf',
        },
        12: {
            'Mathematical Logic': '12th_MATH_Mathematical Logic.pdf',
            'Matrices': '12th_MATH_Matrices.pdf',
            'Trigonometric Functions': '12th_MATH_Trigonometric Functions.pdf',
            'Pair of Straight Lines': '12th_MATH_Pair of Straight Lines.pdf',
            'Circles': '12th_MATH_Circles.pdf',
            'Conics': '12th_MATH_Conics.pdf',
            'Vectors': '12th_MATH_Vectors.pdf',
            'Three-Dimensional Geometry': '12th_MATH_Three-Dimensional Geometry.pdf',
            'Line and Plane': '12th_MATH_Line and Plane.pdf',
            'Linear Programming Problems': '12th_MATH_Linear Programming Problems.pdf',
            'Continuity and Differentiation': '12th_MATH_Continuity and Differentiation.pdf',
            'Application of Derivatives': '12th_MATH_Application of Derivatives.pdf',
            'Integration': '12th_MATH_Integration.pdf',
            'Applications of Definite Integral': '12th_MATH_Applications of Definite Integral.pdf',
        }
    }
};

const main = async () => {
    console.log('🔧 Fixing Notes Paths to Match Actual Files\n');

    try {
        // Fetch all chapters with their notes
        const { data: chapters, error: chaptersError } = await supabase
            .from('chapters')
            .select(`
                id,
                title,
                subject,
                class,
                chapter_notes (
                    id,
                    title,
                    file_path,
                    file_url
                )
            `);

        if (chaptersError) throw chaptersError;

        console.log(`Found ${chapters.length} chapters\n`);

        let updated = 0;
        let notFound = 0;

        for (const chapter of chapters) {
            const { subject, class: classYear, title } = chapter;
            
            // Get the actual filename from mapping
            const filename = fileNameMappings[subject]?.[classYear]?.[title];
            
            if (!filename) {
                console.log(`⚠️ No mapping for: ${subject} ${classYear} - ${title}`);
                notFound++;
                continue;
            }

            // Update each note for this chapter
            if (chapter.chapter_notes && chapter.chapter_notes.length > 0) {
                for (const note of chapter.chapter_notes) {
                    const newPath = `${subject.toLowerCase()}/class-${classYear}/${filename}`;
                    const newUrl = `${supabaseUrl}/storage/v1/object/public/chapter-notes/${newPath}`;

                    const { error: updateError } = await supabase
                        .from('chapter_notes')
                        .update({
                            file_path: newPath,
                            file_url: newUrl
                        })
                        .eq('id', note.id);

                    if (updateError) {
                        console.log(`❌ Failed to update: ${title}`);
                        console.error(updateError);
                    } else {
                        console.log(`✅ ${subject} ${classYear} - ${title}`);
                        console.log(`   → ${filename}`);
                        updated++;
                    }
                }
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('Summary');
        console.log('='.repeat(60));
        console.log(`✅ Updated: ${updated} notes`);
        console.log(`⚠️ Not found: ${notFound} chapters`);
        console.log(`📊 Total chapters: ${chapters.length}\n`);

        console.log('🧪 Next Steps:');
        console.log('1. Go to your app');
        console.log('2. Open any chapter');
        console.log('3. Click Notes tab');
        console.log('4. Click Preview or Download');
        console.log('5. PDF should open! 🎉\n');

    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
};

main();
