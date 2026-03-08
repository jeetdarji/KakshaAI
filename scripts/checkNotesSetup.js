/**
 * Check Notes Setup
 * Diagnoses why notes preview/download isn't working
 *
 * Usage: node scripts/checkNotesSetup.js
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey =
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const toKebabCase = (str) => {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

const main = async () => {
  console.log("📝 Checking Notes Setup\n");

  try {
    // 1. Check if bucket exists and is public
    console.log("1️⃣ Checking bucket...");
    const { data: buckets, error: bucketsError } =
      await supabase.storage.listBuckets();

    if (bucketsError) {
      console.log("❌ Cannot access storage:", bucketsError.message);
      return;
    }

    const chapterNotesBucket = buckets.find((b) => b.name === "chapter-notes");

    if (!chapterNotesBucket) {
      console.log('❌ Bucket "chapter-notes" does not exist!');
      console.log("\n📋 To fix:");
      console.log("   1. Go to Supabase Dashboard → Storage");
      console.log('   2. Create a new bucket named "chapter-notes"');
      console.log("   3. Make it PUBLIC\n");
      return;
    }

    console.log(`✅ Bucket exists: ${chapterNotesBucket.name}`);
    console.log(
      `   Public: ${chapterNotesBucket.public ? "✅ Yes" : "❌ No - MAKE IT PUBLIC!"}\n`,
    );

    // 2. Check files in bucket
    console.log("2️⃣ Checking files in bucket...");

    const listAllFiles = async (prefix = "") => {
      const files = [];
      const { data, error } = await supabase.storage
        .from("chapter-notes")
        .list(prefix, { limit: 1000 });

      if (error) {
        console.log(`⚠️ Cannot list files in ${prefix}:`, error.message);
        return files;
      }

      for (const item of data) {
        const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
        if (item.id) {
          // It's a file
          files.push(fullPath);
        } else {
          // It's a folder
          const subFiles = await listAllFiles(fullPath);
          files.push(...subFiles);
        }
      }

      return files;
    };

    const allFiles = await listAllFiles();
    console.log(`   Found ${allFiles.length} files in bucket\n`);

    if (allFiles.length === 0) {
      console.log("❌ No files in bucket!");
      console.log("\n📋 To fix:");
      console.log("   1. Upload your PDF files to the bucket");
      console.log("   2. Use this structure:");
      console.log("      chapter-notes/");
      console.log("        physics/");
      console.log("          class-11/");
      console.log("            vectors.pdf");
      console.log("            error-analysis.pdf");
      console.log("          class-12/");
      console.log("            circular-motion.pdf");
      console.log("        chemistry/");
      console.log("          class-11/");
      console.log("          class-12/");
      console.log("        maths/");
      console.log("          class-11/");
      console.log("          class-12/\n");
      return;
    }

    // Show sample files
    console.log("   Sample files:");
    allFiles.slice(0, 10).forEach((f) => console.log(`   - ${f}`));
    if (allFiles.length > 10) {
      console.log(`   ... and ${allFiles.length - 10} more\n`);
    } else {
      console.log("");
    }

    // 3. Check database notes
    console.log("3️⃣ Checking database notes...");
    const { data: notes, error: notesError } = await supabase
      .from("chapter_notes")
      .select(
        `
                id,
                title,
                file_path,
                file_url,
                chapters (
                    title,
                    subject,
                    class
                )
            `,
      )
      .limit(5);

    if (notesError) {
      console.log("❌ Cannot query notes:", notesError.message);
      return;
    }

    console.log(`   Found ${notes.length} notes in database\n`);

    if (notes.length === 0) {
      console.log("❌ No notes in database!");
      console.log("\n📋 To fix:");
      console.log(
        "   Run: node scripts/populateStudyHubData.js --notes-only\n",
      );
      return;
    }

    // 4. Check if URLs are correct
    console.log("4️⃣ Checking note URLs...\n");

    for (const note of notes) {
      const chapter = note.chapters;
      console.log(`📄 ${chapter.title} (${chapter.subject} ${chapter.class})`);
      console.log(`   Title: ${note.title}`);
      console.log(`   Path: ${note.file_path}`);
      console.log(`   URL: ${note.file_url}`);

      // Check if file exists in bucket
      const fileExists = allFiles.some(
        (f) =>
          note.file_path &&
          f.toLowerCase().includes(note.file_path.toLowerCase()),
      );

      if (fileExists) {
        console.log(`   Status: ✅ File exists in bucket`);
      } else {
        console.log(`   Status: ❌ File NOT found in bucket`);

        // Suggest correct path
        const expectedPath = `${chapter.subject.toLowerCase()}/class-${chapter.class}/${toKebabCase(chapter.title)}.pdf`;
        console.log(`   Expected: ${expectedPath}`);

        // Find similar files
        const similar = allFiles.filter(
          (f) =>
            f.includes(chapter.subject.toLowerCase()) &&
            f.includes(`class-${chapter.class}`),
        );

        if (similar.length > 0) {
          console.log(`   Similar files found:`);
          similar.forEach((f) => console.log(`     - ${f}`));
        }
      }
      console.log("");
    }

    // 5. Test a URL
    console.log("5️⃣ Testing URL access...");
    if (notes.length > 0 && notes[0].file_url) {
      const testUrl = notes[0].file_url;
      console.log(`   Testing: ${testUrl}`);

      try {
        const response = await fetch(testUrl, { method: "HEAD" });
        if (response.ok) {
          console.log(`   ✅ URL is accessible (${response.status})`);
        } else {
          console.log(`   ❌ URL returned error: ${response.status}`);
          if (response.status === 404) {
            console.log(`   → File doesn't exist at this URL`);
          } else if (response.status === 403) {
            console.log(`   → Access denied - bucket might not be public`);
          }
        }
      } catch (err) {
        console.log(`   ❌ Cannot access URL: ${err.message}`);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("Summary & Next Steps");
    console.log("=".repeat(60) + "\n");

    if (!chapterNotesBucket.public) {
      console.log("❗ CRITICAL: Make bucket public");
      console.log(
        "   Go to: Supabase Dashboard → Storage → chapter-notes → Settings",
      );
      console.log("   Set: Public = ON\n");
    }

    if (allFiles.length === 0) {
      console.log("❗ CRITICAL: Upload PDF files to bucket");
      console.log("   Use the folder structure shown above\n");
    }

    console.log("📋 Run these SQL queries to fix file paths:");
    console.log("   See FIXES_APPLIED.md for complete SQL\n");

    console.log("🧪 After fixing, test in browser:");
    console.log("   1. Go to a chapter page");
    console.log("   2. Click Notes tab");
    console.log("   3. Click Preview or Download");
    console.log("   4. PDF should open in new tab\n");
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
};

main();
