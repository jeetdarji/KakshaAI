import { supabase } from './supabase';

/**
 * Subject Progress Service
 * Calculates completion progress for each subject (Physics, Chemistry, Maths)
 * 
 * Uses the same data model as studyHub.js:
 * - Videos: counted from user_video_progress (completed = true)
 * - Practice/Notes/Formula: boolean flags from user_chapter_progress
 */

const SUBJECTS = ['Physics', 'Chemistry', 'Maths'];

/**
 * Calculate chapter progress dynamically by querying actual data
 * Weight: 40% video + 40% practice + 10% notes + 10% formula
 * (matches studyHub.js calculateChapterProgress)
 * 
 * @param {string} userId - User ID
 * @param {string} chapterId - Chapter ID
 * @returns {Promise<number>} Progress percentage (0-100)
 */
async function calculateChapterProgressFromDB(userId, chapterId) {
  try {
    // Count total videos for this chapter
    const { count: totalVideos } = await supabase
      .from('chapter_videos')
      .select('*', { count: 'exact', head: true })
      .eq('chapter_id', chapterId);

    // Get video IDs for this chapter
    const { data: videoIds } = await supabase
      .from('chapter_videos')
      .select('id')
      .eq('chapter_id', chapterId);

    const videoIdList = videoIds?.map(v => v.id) || [];

    // Count completed videos by this user
    let videosWatched = 0;
    if (videoIdList.length > 0) {
      const { data: watchedVideos } = await supabase
        .from('user_video_progress')
        .select('video_id')
        .eq('user_id', userId)
        .eq('completed', true)
        .in('video_id', videoIdList);
      videosWatched = watchedVideos?.length || 0;
    }

    // Get boolean flags from user_chapter_progress
    const { data: progressData } = await supabase
      .from('user_chapter_progress')
      .select('practice_completed, notes_downloaded, formula_viewed')
      .eq('user_id', userId)
      .eq('chapter_id', chapterId)
      .maybeSingle();

    const practiceCompleted = progressData?.practice_completed || false;
    const notesDownloaded = progressData?.notes_downloaded || false;
    const formulaViewed = progressData?.formula_viewed || false;

    // Calculate weighted progress (same weights as studyHub.js)
    const videoProgress = totalVideos > 0 ? (videosWatched / totalVideos) * 40 : 0;
    const practiceProgress = practiceCompleted ? 40 : 0;
    const notesProgress = notesDownloaded ? 10 : 0;
    const formulaProgress = formulaViewed ? 10 : 0;

    return Math.round(videoProgress + practiceProgress + notesProgress + formulaProgress);
  } catch (err) {
    console.error('Error calculating chapter progress from DB:', err);
    return 0;
  }
}

/**
 * Calculate subject progress for a specific subject
 * @param {string} userId - User ID
 * @param {string} subject - Subject name (Physics, Chemistry, Maths)
 * @returns {Promise<Object>} Subject progress object
 */
export async function calculateSubjectProgress(userId, subject) {
  try {
    // Get all chapters for this subject
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('id, title, subject')
      .eq('subject', subject)
      .order('id');

    if (chaptersError) throw chaptersError;

    const totalChapters = chapters?.length || 0;

    if (totalChapters === 0) {
      return {
        subject,
        completedChapters: 0,
        totalChapters: 0,
        percentage: 0,
        avgProgress: 0
      };
    }


    // Calculate progress for each chapter using dynamic DB queries
    const chapterProgressMap = {};
    let totalProgress = 0;
    let completedCount = 0;

    // Use Promise.all for parallel fetching
    const progressResults = await Promise.all(
      chapters.map(chapter => calculateChapterProgressFromDB(userId, chapter.id))
    );

    for (let i = 0; i < chapters.length; i++) {
      const chapterProgress = progressResults[i];
      chapterProgressMap[chapters[i].id] = chapterProgress;
      totalProgress += chapterProgress;

      // Consider chapter completed if progress >= 80%
      // (all videos watched = 40% + practice completed = 40% = 80%)
      if (chapterProgress >= 80) {
        completedCount++;
      }
    }

    // Calculate average progress across all chapters
    const avgProgress = totalChapters > 0 ? totalProgress / totalChapters : 0;

    return {
      subject,
      completedChapters: completedCount,
      totalChapters,
      percentage: Math.round(avgProgress),
      avgProgress: Math.round(avgProgress * 10) / 10, // Round to 1 decimal
      chapterProgress: chapterProgressMap
    };
  } catch (error) {
    console.error(`Error calculating ${subject} progress:`, error);
    return {
      subject,
      completedChapters: 0,
      totalChapters: 0,
      percentage: 0,
      avgProgress: 0
    };
  }
}

/**
 * Get progress for all subjects
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of subject progress objects
 */
export async function getAllSubjectsProgress(userId) {
  try {
    const progressPromises = SUBJECTS.map(subject =>
      calculateSubjectProgress(userId, subject)
    );

    const results = await Promise.all(progressPromises);
    return results;
  } catch (error) {
    console.error('Error getting all subjects progress:', error);
    return SUBJECTS.map(subject => ({
      subject,
      completedChapters: 0,
      totalChapters: 0,
      percentage: 0,
      avgProgress: 0
    }));
  }
}

/**
 * Get weakest subject (lowest progress percentage)
 * @param {string} userId - User ID
 * @returns {Promise<string>} Weakest subject name
 */
export async function getWeakestSubject(userId) {
  try {
    const allProgress = await getAllSubjectsProgress(userId);

    // Find subject with lowest percentage
    let weakest = allProgress[0];

    for (const progress of allProgress) {
      if (progress.percentage < weakest.percentage) {
        weakest = progress;
      }
    }

    return weakest.subject;
  } catch (error) {
    console.error('Error getting weakest subject:', error);
    return 'Physics'; // Default
  }
}

/**
 * Get strongest subject (highest progress percentage)
 * @param {string} userId - User ID
 * @returns {Promise<string>} Strongest subject name
 */
export async function getStrongestSubject(userId) {
  try {
    const allProgress = await getAllSubjectsProgress(userId);

    // Find subject with highest percentage
    let strongest = allProgress[0];

    for (const progress of allProgress) {
      if (progress.percentage > strongest.percentage) {
        strongest = progress;
      }
    }

    return strongest.subject;
  } catch (error) {
    console.error('Error getting strongest subject:', error);
    return 'Physics'; // Default
  }
}

/**
 * Get first incomplete chapter in a subject
 * @param {string} userId - User ID
 * @param {string} subject - Subject name
 * @returns {Promise<Object|null>} First incomplete chapter or null
 */
export async function getFirstIncompleteChapter(userId, subject) {
  try {
    // Get all chapters for this subject
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('*')
      .eq('subject', subject)
      .order('id');

    if (chaptersError) throw chaptersError;
    if (!chapters || chapters.length === 0) return null;

    // Find first incomplete chapter
    for (const chapter of chapters) {
      const chapterProgress = await calculateChapterProgressFromDB(userId, chapter.id);

      if (chapterProgress < 100) {
        return {
          ...chapter,
          progress: chapterProgress
        };
      }
    }

    // All chapters complete, return first chapter
    return {
      ...chapters[0],
      progress: 100
    };
  } catch (error) {
    console.error('Error getting first incomplete chapter:', error);
    return null;
  }
}

/**
 * Get overall progress across all subjects
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Overall progress statistics
 */
export async function getOverallProgress(userId) {
  try {
    const allProgress = await getAllSubjectsProgress(userId);

    const totalChapters = allProgress.reduce((sum, p) => sum + p.totalChapters, 0);
    const completedChapters = allProgress.reduce((sum, p) => sum + p.completedChapters, 0);
    const avgPercentage = allProgress.reduce((sum, p) => sum + p.percentage, 0) / allProgress.length;

    return {
      totalChapters,
      completedChapters,
      percentage: Math.round(avgPercentage),
      subjects: allProgress
    };
  } catch (error) {
    console.error('Error getting overall progress:', error);
    return {
      totalChapters: 0,
      completedChapters: 0,
      percentage: 0,
      subjects: []
    };
  }
}

/**
 * Get subject color for UI display
 * @param {string} subject - Subject name
 * @returns {string} Tailwind color class
 */
export function getSubjectColor(subject) {
  const colors = {
    'Physics': 'blue',
    'Chemistry': 'green',
    'Maths': 'purple'
  };

  return colors[subject] || 'gray';
}

/**
 * Get subject icon emoji
 * @param {string} subject - Subject name
 * @returns {string} Emoji icon
 */
export function getSubjectIcon(subject) {
  const icons = {
    'Physics': '⚛️',
    'Chemistry': '🧪',
    'Maths': '📐'
  };

  return icons[subject] || '📚';
}
