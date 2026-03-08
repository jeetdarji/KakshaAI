import { supabase } from './supabase';
import { getUserStats, updateCachedStats } from './userStatsService';
import { getAllSubjectsProgress, getFirstIncompleteChapter, getWeakestSubject } from './subjectProgressService';
import { getTodayChallenge, getChallengeProgress, generateDailyChallenge } from './challengeGenerator';

/**
 * Dashboard Helper Library
 * Combines all dashboard services for easy access
 */

/**
 * Get all dashboard data for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Complete dashboard data
 */
export async function getDashboardData(userId) {
  try {
    // Fetch all data in parallel for better performance
    const [
      userStats,
      subjectProgress,
      recentTests,
      todayChallenge,
      dailyActivity
    ] = await Promise.all([
      getUserStats(userId),
      getAllSubjectsProgress(userId),
      getRecentTests(userId, 5),
      getTodaysChallengeWithProgress(userId),
      getDailyActivityData(userId)
    ]);

    return {
      stats: userStats,
      subjectProgress,
      recentTests,
      dailyChallenge: todayChallenge,
      activityData: dailyActivity,
      loading: false,
      error: null
    };
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    return {
      stats: null,
      subjectProgress: [],
      recentTests: [],
      dailyChallenge: null,
      activityData: [],
      loading: false,
      error: error.message
    };
  }
}

/**
 * Get recent test attempts (both chapter practice and mock tests)
 * @param {string} userId - User ID
 * @param {number} limit - Number of tests to fetch (default 5)
 * @returns {Promise<Array>} Array of test attempts
 */
export async function getRecentTests(userId, limit = 5) {
  try {
    // Fetch both practice attempts and mock test submissions in parallel
    const [practiceResult, mockResult] = await Promise.all([
      supabase
        .from('user_practice_attempts')
        .select(`
          *,
          chapters (
            id,
            title,
            subject
          )
        `)
        .eq('user_id', userId)
        .order('attempted_at', { ascending: false })
        .limit(limit),
      supabase
        .from('submissions')
        .select(`
          id,
          score,
          max_score,
          answers,
          created_at,
          test_id,
          tests (
            id,
            title
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)
    ]);

    // Format practice attempts
    // Practice: score = number of correct answers, total_questions = total questions
    const practiceTests = (practiceResult.data || []).map(attempt => ({
      id: attempt.id,
      chapterId: attempt.chapter_id,
      chapterTitle: attempt.chapters?.title || 'Unknown Test',
      subject: attempt.chapters?.subject || 'Mixed',
      score: attempt.score || 0,
      totalQuestions: attempt.total_questions || 0,
      correctCount: attempt.score || 0,
      // Display marks: correct/total
      displayScore: `${attempt.score || 0}/${attempt.total_questions || 0}`,
      percentage: attempt.total_questions > 0 ? Math.round((attempt.score / attempt.total_questions) * 100) : 0,
      attemptedAt: attempt.attempted_at,
      answers: attempt.answers,
      type: 'practice'
    }));

    // Format mock test submissions
    // Mock: score = actual marks obtained, max_score = total marks possible
    const mockTests = (mockResult.data || []).map(sub => {
      const correctCount = sub.answers ? Object.values(sub.answers).filter(a => a.isCorrect).length : 0;
      const totalQuestions = sub.max_score ? Math.round(sub.max_score / 2) : Object.keys(sub.answers || {}).length;
      return {
        id: sub.id,
        chapterId: null,
        chapterTitle: sub.tests?.title || 'Mock Test',
        subject: 'Mock Test',
        score: sub.score || 0,
        maxScore: sub.max_score || 0,
        totalQuestions,
        correctCount,
        // Display marks: score/max_score
        displayScore: `${sub.score || 0}/${sub.max_score || 0}`,
        percentage: sub.max_score > 0 ? Math.round((sub.score / sub.max_score) * 100) : 0,
        attemptedAt: sub.created_at,
        answers: sub.answers,
        type: 'mock',
        testId: sub.test_id
      };
    });

    // Merge, sort by date descending, take top 'limit'
    const allTests = [...practiceTests, ...mockTests]
      .sort((a, b) => new Date(b.attemptedAt) - new Date(a.attemptedAt))
      .slice(0, limit);

    return allTests;
  } catch (error) {
    console.error('Error getting recent tests:', error);
    return [];
  }
}

/**
 * Get today's challenge with user progress
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Challenge with progress
 */
export async function getTodaysChallengeWithProgress(userId) {
  try {
    // Get or generate today's challenge
    let challenge = await getTodayChallenge();

    if (!challenge) {
      // Generate new challenge
      challenge = await generateDailyChallenge(userId);
    }

    if (!challenge) return null;

    // Get user's progress for this challenge
    const progress = await getChallengeProgress(userId, challenge.id);

    return {
      ...challenge,
      userProgress: progress
    };
  } catch (error) {
    console.error('Error getting today challenge with progress:', error);
    return null;
  }
}

/**
 * Get daily activity data for heatmap
 * @param {string} userId - User ID
 * @param {Date} startDate - Start date (optional, defaults to 1 year ago)
 * @param {Date} endDate - End date (optional, defaults to today)
 * @returns {Promise<Array>} Array of daily activity records
 */
export async function getDailyActivityData(userId, startDate = null, endDate = null) {
  try {
    // If no start date, default to 1 year ago
    if (!startDate) {
      startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    if (!endDate) {
      endDate = new Date();
    }

    const { data, error } = await supabase
      .from('daily_activity')
      .select('*')
      .eq('user_id', userId)
      .gte('activity_date', startDate.toISOString().split('T')[0])
      .lte('activity_date', endDate.toISOString().split('T')[0])
      .order('activity_date', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting daily activity data:', error);
    return [];
  }
}

/**
 * Get navigation target for "Practice Now" button
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Navigation target with path and chapter info
 */
export async function getPracticeNowTarget(userId) {
  try {
    // Get weakest subject
    const weakestSubject = await getWeakestSubject(userId);

    // Get first incomplete chapter in that subject
    const chapter = await getFirstIncompleteChapter(userId, weakestSubject);

    if (!chapter) {
      // No incomplete chapters, navigate to study hub
      return {
        path: '/study-hub',
        chapter: null,
        subject: weakestSubject
      };
    }

    return {
      path: `/chapter/${chapter.id}`,
      chapter: chapter,
      subject: weakestSubject
    };
  } catch (error) {
    console.error('Error getting practice now target:', error);
    return {
      path: '/study-hub',
      chapter: null,
      subject: null
    };
  }
}

/**
 * Format relative date (e.g., "Today", "Yesterday", "2 days ago")
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted relative date
 */
export function formatRelativeDate(date) {
  const now = new Date();
  const targetDate = new Date(date);

  // Reset time to midnight for accurate day comparison
  now.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = now - targetDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }

  // Format as date
  return targetDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: targetDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

/**
 * Format study time (seconds to human readable)
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
export function formatStudyTime(seconds) {
  if (!seconds || seconds === 0) return '0h';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

/**
 * Calculate activity intensity for a given day
 * @param {Object} activity - Daily activity object
 * @returns {string} Intensity level (none, light, medium, high)
 */
export function calculateActivityIntensity(activity) {
  if (!activity) return 'none';

  const score =
    (activity.videos_watched * 2) +
    (activity.tests_taken * 3) +
    (activity.questions_answered * 0.1) +
    (activity.chapters_completed * 5) +
    ((activity.downloads_count || 0) * 1);

  if (score === 0) return 'none';
  if (score < 5) return 'light';
  if (score < 15) return 'medium';
  return 'high';
}

/**
 * Get heatmap data for a full calendar year
 * @param {string} userId - User ID
 * @param {number} year - Year to fetch (defaults to current year)
 * @returns {Promise<Array>} Array of heatmap cells with date and intensity
 */
export async function getHeatmapData(userId, year = null) {
  try {
    const selectedYear = year || new Date().getFullYear();
    const startDate = new Date(selectedYear, 0, 1); // Jan 1
    const today = new Date();
    const endDate = selectedYear === today.getFullYear()
      ? today
      : new Date(selectedYear, 11, 31); // Dec 31

    // Fetch activity data for the selected year
    const activityData = await getDailyActivityData(userId, startDate, endDate);

    // Create a map of dates to activity
    const activityMap = {};
    activityData.forEach(activity => {
      activityMap[activity.activity_date] = activity;
    });

    // Generate array of all dates from Jan 1 to endDate
    const heatmapData = [];
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const activity = activityMap[dateStr];

      heatmapData.push({
        date: dateStr,
        intensity: activity ? (activity.activity_intensity || 'none') : 'none',
        videosWatched: activity?.videos_watched || 0,
        testsTaken: activity?.tests_taken || 0,
        questionsAnswered: activity?.questions_answered || 0,
        chaptersCompleted: activity?.chapters_completed || 0,
        downloadsCount: activity?.downloads_count || 0,
        studyTime: activity?.study_time_seconds || 0
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return heatmapData;
  } catch (error) {
    console.error('Error getting heatmap data:', error);
    return [];
  }
}

/**
 * Refresh all dashboard data (force recalculation)
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function refreshDashboardData(userId) {
  try {
    // Update cached stats
    await updateCachedStats(userId);

    // Fetch fresh data
    return await getDashboardData(userId);
  } catch (error) {
    console.error('Error refreshing dashboard data:', error);
    throw error;
  }
}
