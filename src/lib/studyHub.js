/**
 * Study Hub Helper Functions
 * Supabase queries for Study Hub feature
 */

import { supabase } from './supabase';

// ============ CHAPTERS ============

/**
 * Fetch all chapters, optionally filtered by subject and class
 * @param {object} options - { subject, classYear, userId }
 * @returns {Promise<Array>} - Array of chapters with progress
 */
export const fetchChapters = async ({ subject, classYear, userId } = {}) => {
    try {
        let query = supabase
            .from('chapters')
            .select('*')
            .order('order_index', { ascending: true });

        if (subject && subject !== 'all') {
            query = query.eq('subject', subject);
        }

        if (classYear) {
            query = query.eq('class', classYear);
        }

        const { data: chapters, error } = await query;

        if (error) throw error;

        // If userId provided, calculate real progress for each chapter
        if (userId && chapters?.length > 0) {
            const chaptersWithProgress = await Promise.all(
                chapters.map(async (chapter) => {
                    const progress = await calculateChapterProgress(userId, chapter.id);
                    return {
                        ...chapter,
                        progress: progress.progress,
                        videosWatched: progress.videosWatched,
                        totalVideos: progress.totalVideos,
                        practiceCompleted: progress.practiceCompleted,
                        notesDownloaded: progress.notesDownloaded,
                        formulaViewed: progress.formulaViewed,
                        completedTopics: progress.completedTopics,
                        totalTopics: progress.totalTopics,
                    };
                })
            );
            return chaptersWithProgress;
        }

        return chapters?.map(chapter => ({
            ...chapter,
            progress: 0,
            videosWatched: 0,
            totalVideos: 0,
            practiceCompleted: false,
            notesDownloaded: false,
            formulaViewed: false,
            completedTopics: 0,
            totalTopics: 10,
        })) || [];

    } catch (err) {
        console.error('Error fetching chapters:', err);
        return [];
    }
};

/**
 * Fetch a single chapter by ID
 * @param {string} chapterId - Chapter ID
 * @returns {Promise<object|null>} - Chapter object
 */
export const fetchChapterById = async (chapterId) => {
    try {
        const { data, error } = await supabase
            .from('chapters')
            .select('*')
            .eq('id', chapterId)
            .single();

        if (error) throw error;
        return data;
    } catch (err) {
        console.error('Error fetching chapter:', err);
        return null;
    }
};

// ============ VIDEOS ============

/**
 * Fetch videos for a chapter
 * @param {string} chapterId - Chapter ID
 * @param {string} userId - Optional user ID for progress
 * @returns {Promise<Array>} - Array of videos with progress
 */
export const fetchChapterVideos = async (chapterId, userId) => {
    try {
        const { data: videos, error } = await supabase
            .from('chapter_videos')
            .select('*')
            .eq('chapter_id', chapterId)
            .order('order_index', { ascending: true });

        if (error) throw error;

        // Fetch video progress if user logged in
        if (userId && videos?.length > 0) {
            const { data: progressData } = await supabase
                .from('user_video_progress')
                .select('video_id, progress_percentage, completed')
                .eq('user_id', userId)
                .in('video_id', videos.map(v => v.id));

            const progressMap = {};
            progressData?.forEach(p => {
                progressMap[p.video_id] = p;
            });

            return videos.map(video => ({
                ...video,
                watchedPercent: progressMap[video.id]?.progress_percentage || 0,
                completed: progressMap[video.id]?.completed || false,
                status: progressMap[video.id]?.completed
                    ? 'watched'
                    : progressMap[video.id]?.progress_percentage > 0
                        ? 'in-progress'
                        : 'not-started',
            }));
        }

        return videos?.map(video => ({
            ...video,
            watchedPercent: 0,
            completed: false,
            status: 'not-started',
        })) || [];

    } catch (err) {
        console.error('Error fetching videos:', err);
        return [];
    }
};

/**
 * Update video watch progress
 * @param {string} userId - User ID
 * @param {string} videoId - Video ID
 * @param {number} percentage - Watch percentage (0-100)
 * @returns {Promise<boolean>} - Success status
 */
export const updateVideoProgress = async (userId, videoId, percentage) => {
    try {
        const completed = percentage >= 90; // Mark complete at 90%

        // Get video duration to calculate watched_seconds
        const { data: video } = await supabase
            .from('chapter_videos')
            .select('duration_seconds')
            .eq('id', videoId)
            .single();

        const totalSeconds = video?.duration_seconds || 0;
        const watchedSeconds = Math.floor((percentage / 100) * totalSeconds);

        const { error } = await supabase
            .from('user_video_progress')
            .upsert({
                user_id: userId,
                video_id: videoId,
                watched_seconds: watchedSeconds,
                total_seconds: totalSeconds,
                last_position_seconds: watchedSeconds,
                progress_percentage: percentage,
                completed,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,video_id',
            });

        if (error) throw error;

        // Update chapter progress
        await recalculateChapterProgress(userId, videoId);

        return true;
    } catch (err) {
        console.error('Error updating video progress:', err);
        return false;
    }
};

// ============ NOTES ============

/**
 * Fetch notes for a chapter
 * @param {string} chapterId - Chapter ID
 * @returns {Promise<Array>} - Array of notes
 */
export const fetchChapterNotes = async (chapterId) => {
    try {
        const { data, error } = await supabase
            .from('chapter_notes')
            .select('*')
            .eq('chapter_id', chapterId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching chapter notes:', err);
        return [];
    }
};

// ============ PRACTICE QUESTIONS ============

/**
 * Fetch practice questions for a chapter
 * @param {string} chapterId - Chapter ID
 * @returns {Promise<Array>} - Array of questions
 */
export const fetchPracticeQuestions = async (chapterId) => {
    try {
        const { data, error } = await supabase
            .from('practice_questions')
            .select('*')
            .eq('chapter_id', chapterId)
            .order('order_index', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching practice questions:', err);
        return [];
    }
};

/**
 * Submit practice quiz attempt
 * @param {string} userId - User ID
 * @param {string} chapterId - Chapter ID
 * @param {object} answers - { questionId: selectedOption }
 * @param {number} score - Score percentage
 * @param {number} correctCount - Number of correct answers
 * @param {number} totalQuestions - Total questions
 * @returns {Promise<object|null>} - Attempt record
 */
export const submitPracticeAttempt = async (userId, chapterId, answers, score, correctCount, totalQuestions) => {
    try {
        const { data, error } = await supabase
            .from('user_practice_attempts')
            .insert({
                user_id: userId,
                chapter_id: chapterId,
                answers,
                score,
                correct_count: correctCount,
                total_questions: totalQuestions,
                completed_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) throw error;

        // Update chapter progress to mark practice as completed
        await updateChapterPracticeComplete(userId, chapterId);

        return data;
    } catch (err) {
        console.error('Error submitting practice attempt:', err);
        return null;
    }
};

/**
 * Get user's practice attempts for a chapter
 * @param {string} userId - User ID
 * @param {string} chapterId - Chapter ID
 * @param {number} limit - Optional limit for number of attempts to return
 * @returns {Promise<Array>} - Array of attempts
 */
export const getPracticeAttempts = async (userId, chapterId, limit = null) => {
    try {
        let query = supabase
            .from('user_practice_attempts')
            .select('*')
            .eq('user_id', userId)
            .eq('chapter_id', chapterId)
            .order('attempted_at', { ascending: false });
        
        if (limit) {
            query = query.limit(limit);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching practice attempts:', err);
        return [];
    }
};

// ============ PROGRESS HELPERS ============

/**
 * Calculate chapter progress dynamically based on user actions
 * Progress breakdown:
 * - Videos: 40% (watched videos / total videos * 40)
 * - Practice: 40% (completed practice test)
 * - Notes: 10% (downloaded notes)
 * - Formula: 10% (viewed formula sheet)
 * 
 * @param {string} userId - User ID
 * @param {string} chapterId - Chapter ID
 * @returns {Promise<object>} - Progress object with breakdown
 */
export const calculateChapterProgress = async (userId, chapterId) => {
    try {
        // Count total videos for chapter
        const { count: totalVideos } = await supabase
            .from('chapter_videos')
            .select('*', { count: 'exact', head: true })
            .eq('chapter_id', chapterId);

        // Count watched videos
        const { data: videoIds } = await supabase
            .from('chapter_videos')
            .select('id')
            .eq('chapter_id', chapterId);

        const videoIdList = videoIds?.map(v => v.id) || [];

        const { data: watchedVideos } = await supabase
            .from('user_video_progress')
            .select('video_id')
            .eq('user_id', userId)
            .eq('completed', true)
            .in('video_id', videoIdList);

        const videosWatched = watchedVideos?.length || 0;

        // Get current progress record using YOUR actual columns
        const { data: progressData, error: progressError } = await supabase
            .from('user_chapter_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('chapter_id', chapterId)
            .maybeSingle();

        // Use YOUR actual column names
        const practiceCompleted = progressData?.practice_completed || false;
        const notesDownloaded = progressData?.notes_downloaded || false;
        const formulaViewed = progressData?.formula_viewed || false;

        // Calculate progress components
        const videoProgress = totalVideos > 0 ? (videosWatched / totalVideos) * 40 : 0;
        const practiceProgress = practiceCompleted ? 40 : 0;
        const notesProgress = notesDownloaded ? 10 : 0;
        const formulaProgress = formulaViewed ? 10 : 0;

        const totalProgress = Math.round(videoProgress + practiceProgress + notesProgress + formulaProgress);

        // Calculate completed topics (out of 10)
        const completedTopics = Math.floor((totalProgress / 100) * 10);

        return {
            progress: totalProgress,
            videosWatched,
            totalVideos: totalVideos || 0,
            practiceCompleted,
            notesDownloaded,
            formulaViewed,
            completedTopics,
            totalTopics: 10,
            breakdown: {
                video: Math.round(videoProgress),
                practice: practiceProgress,
                notes: notesProgress,
                formula: formulaProgress,
            }
        };
    } catch (err) {
        console.error('Error calculating chapter progress:', err);
        return {
            progress: 0,
            videosWatched: 0,
            totalVideos: 0,
            practiceCompleted: false,
            notesDownloaded: false,
            formulaViewed: false,
            completedTopics: 0,
            totalTopics: 10,
            breakdown: { video: 0, practice: 0, notes: 0, formula: 0 }
        };
    }
};

/**
 * Mark video as watched and update chapter progress
 * @param {string} userId - User ID
 * @param {string} videoId - Video ID
 * @param {string} chapterId - Chapter ID
 * @returns {Promise<object>} - Updated progress
 */
/**
 * Mark video as watched and update chapter progress
 * @param {string} userId - User ID
 * @param {string} videoId - Video ID
 * @param {string} chapterId - Chapter ID
 * @returns {Promise<object>} - Updated progress
 */
export const markVideoAsWatched = async (userId, videoId, chapterId) => {
    try {
        // Get video duration
        const { data: video } = await supabase
            .from('chapter_videos')
            .select('duration_seconds')
            .eq('id', videoId)
            .single();

        const totalSeconds = video?.duration_seconds || 0;

        // Mark video as watched (100% completion)
        const { error: videoError } = await supabase
            .from('user_video_progress')
            .upsert({
                user_id: userId,
                video_id: videoId,
                watched_seconds: totalSeconds,
                total_seconds: totalSeconds,
                last_position_seconds: totalSeconds,
                progress_percentage: 100,
                completed: true,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,video_id',
            });

        if (videoError) {
            console.error('Error marking video as watched:', videoError);
            throw videoError;
        }

        // Recalculate progress
        const progress = await calculateChapterProgress(userId, chapterId);

        // Update chapter progress using YOUR actual column names
        const { error: progressError } = await supabase
            .from('user_chapter_progress')
            .upsert({
                user_id: userId,
                chapter_id: chapterId,
                videos_watched: progress.videosWatched,
                total_videos: progress.totalVideos,
                completed_topics: progress.completedTopics,
                total_topics: 10,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,chapter_id',
            });

        if (progressError) {
            console.error('Error updating chapter progress:', progressError);
        }

        return progress;
    } catch (err) {
        console.error('Error marking video as watched:', err);
        return null;
    }
};

/**
 * Mark notes as downloaded and update chapter progress
 * @param {string} userId - User ID
 * @param {string} chapterId - Chapter ID
 * @returns {Promise<object>} - Updated progress
 */
export const markNotesDownloaded = async (userId, chapterId) => {
    try {
        // Get current progress
        const progress = await calculateChapterProgress(userId, chapterId);

        // Update with notes downloaded flag using YOUR actual columns
        const { error } = await supabase
            .from('user_chapter_progress')
            .upsert({
                user_id: userId,
                chapter_id: chapterId,
                videos_watched: progress.videosWatched,
                total_videos: progress.totalVideos,
                notes_downloaded: true, // Mark as downloaded
                formula_viewed: progress.formulaViewed,
                practice_completed: progress.practiceCompleted,
                completed_topics: Math.floor(((progress.breakdown.video + progress.breakdown.practice + 10 + progress.breakdown.formula) / 100) * 10),
                total_topics: 10,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,chapter_id',
            });

        if (error) {
            console.error('Error marking notes as downloaded:', error);
            throw error;
        }

        // Recalculate with new flag
        return await calculateChapterProgress(userId, chapterId);
    } catch (err) {
        console.error('Error marking notes as downloaded:', err);
        return null;
    }
};

/**
 * Mark formula sheet as viewed and update chapter progress
 * @param {string} userId - User ID
 * @param {string} chapterId - Chapter ID
 * @returns {Promise<object>} - Updated progress
 */
export const markFormulaViewed = async (userId, chapterId) => {
    try {
        // Get current progress
        const progress = await calculateChapterProgress(userId, chapterId);

        // Update with formula viewed flag using YOUR actual columns
        const { error } = await supabase
            .from('user_chapter_progress')
            .upsert({
                user_id: userId,
                chapter_id: chapterId,
                videos_watched: progress.videosWatched,
                total_videos: progress.totalVideos,
                notes_downloaded: progress.notesDownloaded,
                formula_viewed: true, // Mark as viewed
                practice_completed: progress.practiceCompleted,
                completed_topics: Math.floor(((progress.breakdown.video + progress.breakdown.practice + progress.breakdown.notes + 10) / 100) * 10),
                total_topics: 10,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,chapter_id',
            });

        if (error) {
            console.error('Error marking formula as viewed:', error);
            throw error;
        }

        // Recalculate with new flag
        return await calculateChapterProgress(userId, chapterId);
    } catch (err) {
        console.error('Error marking formula as viewed:', err);
        return null;
    }
};

/**
 * Save practice attempt and update chapter progress
 * @param {string} userId - User ID
 * @param {string} chapterId - Chapter ID
 * @param {number} score - Score percentage
 * @param {number} totalQuestions - Total questions
 * @param {object} answers - User's answers
 * @returns {Promise<object>} - Attempt record and updated progress
 */
export const savePracticeAttempt = async (userId, chapterId, score, totalQuestions, answers) => {
    try {
        const correctCount = Math.round((score / 100) * totalQuestions);

        // Save attempt to user_practice_attempts table
        const { data: attempt, error: attemptError } = await supabase
            .from('user_practice_attempts')
            .insert({
                user_id: userId,
                chapter_id: chapterId,
                answers,
                score,
                correct_count: correctCount,
                total_questions: totalQuestions,
                attempted_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (attemptError) {
            console.error('Error saving practice attempt:', attemptError);
            throw attemptError;
        }

        // Get existing progress to check current best_test_score
        const { data: existingProgress } = await supabase
            .from('user_chapter_progress')
            .select('best_test_score')
            .eq('user_id', userId)
            .eq('chapter_id', chapterId)
            .maybeSingle();

        const currentBestScore = existingProgress?.best_test_score || 0;
        const newBestScore = Math.max(currentBestScore, score);

        // Get current progress for other fields
        const progress = await calculateChapterProgress(userId, chapterId);

        // Update with practice completed flag and best_test_score
        const { error: progressError } = await supabase
            .from('user_chapter_progress')
            .upsert({
                user_id: userId,
                chapter_id: chapterId,
                videos_watched: progress.videosWatched,
                total_videos: progress.totalVideos,
                notes_downloaded: progress.notesDownloaded,
                formula_viewed: progress.formulaViewed,
                practice_completed: true, // Mark as completed
                practice_attempted: true,
                practice_score: score, // Most recent score
                best_test_score: newBestScore, // Highest score ever achieved
                completed_topics: Math.floor(((progress.breakdown.video + 40 + progress.breakdown.notes + progress.breakdown.formula) / 100) * 10),
                total_topics: 10,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,chapter_id',
            });

        if (progressError) {
            console.error('Error updating chapter progress:', progressError);
            throw progressError;
        }

        // Recalculate with new flag
        const updatedProgress = await calculateChapterProgress(userId, chapterId);

        return {
            attempt,
            progress: updatedProgress,
            bestScore: newBestScore,
        };
    } catch (err) {
        console.error('Error saving practice attempt:', err);
        return null;
    }
};

/**
 * Get user progress for a chapter
 * @param {string} userId - User ID
 * @param {string} chapterId - Chapter ID
 * @returns {Promise<object|null>} - Progress object
 */
export const getUserChapterProgress = async (userId, chapterId) => {
    try {
        const { data, error } = await supabase
            .from('user_chapter_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('chapter_id', chapterId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    } catch (err) {
        console.error('Error fetching chapter progress:', err);
        return null;
    }
};

/**
 * Recalculate and update chapter progress based on videos watched
 * @param {string} userId - User ID
 * @param {string} videoId - Video ID that was just updated
 */
const recalculateChapterProgress = async (userId, videoId) => {
    try {
        // Get the chapter for this video
        const { data: video } = await supabase
            .from('chapter_videos')
            .select('chapter_id')
            .eq('id', videoId)
            .single();

        if (!video) return;

        const chapterId = video.chapter_id;

        // Count total videos for chapter
        const { count: totalVideos } = await supabase
            .from('chapter_videos')
            .select('*', { count: 'exact', head: true })
            .eq('chapter_id', chapterId);

        // Count watched videos
        const { data: videoIdsList } = await supabase
            .from('chapter_videos')
            .select('id')
            .eq('chapter_id', chapterId);

        const videoIds = videoIdsList?.map(v => v.id) || [];

        const { data: watchedVideos } = await supabase
            .from('user_video_progress')
            .select('video_id')
            .eq('user_id', userId)
            .eq('completed', true)
            .in('video_id', videoIds);

        const videosWatched = watchedVideos?.length || 0;

        // Calculate completed topics (out of 10)
        const progress = totalVideos > 0 ? (videosWatched / totalVideos) * 100 : 0;
        const completedTopics = Math.floor((progress / 100) * 10);

        // Update using YOUR actual column names
        const { error } = await supabase
            .from('user_chapter_progress')
            .upsert({
                user_id: userId,
                chapter_id: chapterId,
                videos_watched: videosWatched,
                total_videos: totalVideos || 0,
                completed_topics: completedTopics,
                total_topics: 10,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,chapter_id',
            });

        if (error) {
            console.error('Error updating chapter progress:', error);
        }

    } catch (err) {
        console.error('Error recalculating chapter progress:', err);
    }
};

/**
 * Update chapter progress when practice is completed
 * @param {string} userId - User ID
 * @param {string} chapterId - Chapter ID
 */
const updateChapterPracticeComplete = async (userId, chapterId) => {
    try {
        // Get current progress
        const { data: currentProgress } = await supabase
            .from('user_chapter_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('chapter_id', chapterId)
            .single();

        const videosWatched = currentProgress?.videos_watched || 0;

        // Count total videos
        const { count: totalVideos } = await supabase
            .from('chapter_videos')
            .select('*', { count: 'exact', head: true })
            .eq('chapter_id', chapterId);

        // Calculate new progress
        const videoProgress = totalVideos > 0 ? (videosWatched / totalVideos) * 50 : 0;
        const progressPercentage = Math.round(videoProgress + 50); // +50 for practice

        // Upsert progress
        await supabase
            .from('user_chapter_progress')
            .upsert({
                user_id: userId,
                chapter_id: chapterId,
                progress_percentage: progressPercentage,
                videos_watched: videosWatched,
                practice_completed: true,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,chapter_id',
            });

    } catch (err) {
        console.error('Error updating practice complete:', err);
    }
};

// ============ FORMULA BOOKS ============

/**
 * Fetch formula book for a subject
 * @param {string} subject - Subject name (Physics, Chemistry, Maths)
 * @returns {Promise<object|null>} - Formula book object
 */
export const fetchFormulaBook = async (subject) => {
    try {
        const { data, error } = await supabase
            .from('formula_books')
            .select('*')
            .eq('subject', subject)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    } catch (err) {
        console.error('Error fetching formula book:', err);
        return null;
    }
};

export default {
    fetchChapters,
    fetchChapterById,
    fetchChapterVideos,
    fetchChapterNotes,
    fetchPracticeQuestions,
    updateVideoProgress,
    submitPracticeAttempt,
    getPracticeAttempts,
    getUserChapterProgress,
    fetchFormulaBook,
    calculateChapterProgress,
    markVideoAsWatched,
    markNotesDownloaded,
    markFormulaViewed,
    savePracticeAttempt,
};
