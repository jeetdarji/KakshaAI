import { supabase } from './supabase';

/**
 * User Stats Service
 * Handles calculation and caching of user performance metrics
 */

/**
 * Calculate average mock score from all mock test attempts
 * @param {string} userId - User ID
 * @returns {Promise<number>} Average score out of 200
 */
export async function calculateAverageMockScore(userId) {
  try {
    // Get all mock test submissions (from submissions table, not user_practice_attempts)
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('score, max_score')
      .eq('user_id', userId);

    if (error) throw error;
    if (!submissions || submissions.length === 0) return 0;

    // Normalize each score to /200 scale then average
    const normalizedScores = submissions
      .filter(s => s.max_score > 0)
      .map(s => (s.score / s.max_score) * 200);

    if (normalizedScores.length === 0) return 0;

    const avgScore = normalizedScores.reduce((sum, s) => sum + s, 0) / normalizedScores.length;
    return Math.round(avgScore);
  } catch (error) {
    console.error('Error calculating average mock score:', error);
    return 0;
  }
}

/**
 * Calculate overall accuracy rate from mock test attempts only
 * @param {string} userId - User ID
 * @returns {Promise<number>} Accuracy rate as percentage
 */
export async function calculateAccuracyRate(userId) {
  try {
    // Get all mock test submissions (from submissions table, not user_practice_attempts)
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('score, max_score')
      .eq('user_id', userId);

    if (error) throw error;
    if (!submissions || submissions.length === 0) return 0;

    // Calculate accuracy based on total score vs max possible score
    // Skip submissions with null/0 max_score to avoid inflating denominator
    const validSubmissions = submissions.filter(s => s.max_score > 0);
    if (validSubmissions.length === 0) return 0;

    const totalScore = validSubmissions.reduce((sum, submission) => sum + (submission.score || 0), 0);
    const totalMaxScore = validSubmissions.reduce((sum, submission) => sum + submission.max_score, 0);

    if (totalMaxScore === 0) return 0;

    const accuracy = (totalScore / totalMaxScore) * 100;
    return Math.round(accuracy * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    console.error('Error calculating accuracy rate:', error);
    return 0;
  }
}

/**
 * Calculate current study streak (consecutive days with activity)
 * @param {string} userId - User ID
 * @returns {Promise<number>} Current streak in days
 */
export async function calculateCurrentStreak(userId) {
  try {
    // Get all activity dates ordered by date descending
    const { data: activities, error } = await supabase
      .from('daily_activity')
      .select('activity_date')
      .eq('user_id', userId)
      .order('activity_date', { ascending: false });

    if (error) throw error;
    if (!activities || activities.length === 0) return 0;

    // Check if there's activity today or yesterday
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const mostRecentActivity = new Date(activities[0].activity_date);
    mostRecentActivity.setHours(0, 0, 0, 0);

    // If most recent activity is not today or yesterday, streak is broken
    if (mostRecentActivity < yesterday) {
      return 0;
    }

    // Count consecutive days
    let streak = 0;
    let expectedDate = new Date(today);

    // If most recent activity is yesterday, start from yesterday
    if (mostRecentActivity.getTime() === yesterday.getTime()) {
      expectedDate = yesterday;
    }

    for (const activity of activities) {
      const activityDate = new Date(activity.activity_date);
      activityDate.setHours(0, 0, 0, 0);

      if (activityDate.getTime() === expectedDate.getTime()) {
        streak++;
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  } catch (error) {
    console.error('Error calculating current streak:', error);
    return 0;
  }
}

/**
 * Calculate total study time from all study sessions
 * @param {string} userId - User ID
 * @returns {Promise<number>} Total study time in hours
 */
export async function calculateTotalStudyTime(userId) {
  try {
    // Get all completed study sessions
    const { data: sessions, error } = await supabase
      .from('study_sessions')
      .select('duration_seconds')
      .eq('user_id', userId)
      .not('duration_seconds', 'is', null);

    if (error) throw error;
    if (!sessions || sessions.length === 0) return 0;

    // Sum all durations
    const totalSeconds = sessions.reduce((sum, session) => sum + (session.duration_seconds || 0), 0);

    // Convert to hours
    const hours = totalSeconds / 3600;
    return Math.round(hours * 10) / 10; // Round to 1 decimal place
  } catch (error) {
    console.error('Error calculating total study time:', error);
    return 0;
  }
}

/**
 * Calculate trend percentage for mock scores (current month vs last month)
 * @param {string} userId - User ID
 * @returns {Promise<number>} Trend percentage (positive or negative)
 */
export async function calculateMockScoreTrend(userId) {
  try {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get current month submissions
    const { data: currentSubmissions, error: currentError } = await supabase
      .from('submissions')
      .select('score, max_score')
      .eq('user_id', userId)
      .gte('created_at', currentMonthStart.toISOString());

    if (currentError) throw currentError;

    // Get last month submissions
    const { data: lastSubmissions, error: lastError } = await supabase
      .from('submissions')
      .select('score, max_score')
      .eq('user_id', userId)
      .gte('created_at', lastMonthStart.toISOString())
      .lte('created_at', lastMonthEnd.toISOString());

    if (lastError) throw lastError;

    // Calculate averages
    const calculateAvg = (submissions) => {
      if (!submissions || submissions.length === 0) return 0;
      const totalScore = submissions.reduce((sum, s) => sum + (s.score || 0), 0);
      return totalScore / submissions.length;
    };

    const currentAvg = calculateAvg(currentSubmissions);
    const lastAvg = calculateAvg(lastSubmissions);

    if (lastAvg === 0) return 0;

    const trend = ((currentAvg - lastAvg) / lastAvg) * 100;
    return Math.round(trend * 10) / 10; // Round to 1 decimal place
  } catch (error) {
    console.error('Error calculating mock score trend:', error);
    return 0;
  }
}

/**
 * Update cached stats in user_stats table
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function updateCachedStats(userId) {
  try {
    // Calculate all stats
    const [avgMockScore, accuracyRate, currentStreak, totalStudyTime] = await Promise.all([
      calculateAverageMockScore(userId),
      calculateAccuracyRate(userId),
      calculateCurrentStreak(userId),
      calculateTotalStudyTime(userId)
    ]);

    // Get total questions and correct answers from chapter practice attempts
    const { data: attempts } = await supabase
      .from('user_practice_attempts')
      .select('score, total_questions')
      .eq('user_id', userId);

    const practiceQuestionsAttempted = attempts?.reduce((sum, a) => sum + (a.total_questions || 0), 0) || 0;
    const practiceCorrectAnswers = attempts?.reduce((sum, a) => sum + (a.score || 0), 0) || 0;

    // Also count questions from mock test submissions
    const { data: mockSubmissions } = await supabase
      .from('submissions')
      .select('id, answers')
      .eq('user_id', userId);

    let mockQuestionsAttempted = 0;
    let mockCorrectAnswers = 0;
    (mockSubmissions || []).forEach(sub => {
      const answers = sub.answers || {};
      const entries = Object.values(answers);
      mockQuestionsAttempted += entries.length;
      mockCorrectAnswers += entries.filter(a => a.isCorrect).length;
    });

    const totalQuestionsAnswered = practiceQuestionsAttempted + mockQuestionsAttempted;
    const totalCorrectAnswers = practiceCorrectAnswers + mockCorrectAnswers;

    // Get total mock tests from submissions table
    const totalMockTests = mockSubmissions?.length || 0;

    // Check if stats record already exists
    const { data: existingStats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const longestStreak = Math.max(
      currentStreak,
      existingStats?.longest_streak_days || 0
    );

    const statsData = {
      total_study_time_seconds: Math.round(totalStudyTime * 3600),
      current_streak_days: currentStreak,
      longest_streak_days: longestStreak,
      avg_mock_score: avgMockScore,
      accuracy_rate: accuracyRate,
      total_questions_attempted: totalQuestionsAnswered,
      total_questions_correct: totalCorrectAnswers,
      total_mock_tests: totalMockTests,
      last_activity_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    };

    if (existingStats) {
      // Update existing record
      const { error } = await supabase
        .from('user_stats')
        .update(statsData)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating user_stats:', error);
      }
    } else {
      // Insert new record
      const { error } = await supabase
        .from('user_stats')
        .insert({
          user_id: userId,
          ...statsData
        });

      if (error) {
        console.error('Error inserting user_stats:', error);
      }
    }
  } catch (error) {
    console.error('Error updating cached stats:', error);
    // Don't rethrow — stats update failure should not crash the dashboard
  }
}

/**
 * Get cached stats from user_stats table
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User stats object
 */
export async function getCachedStats(userId) {
  try {
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching cached stats:', error);
      return null;
    }

    if (!data) {
      // No stats exist yet — try to create initial record
      await updateCachedStats(userId);
      // Fetch again (non-recursive, just one retry)
      const { data: retryData } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      return retryData || null;
    }

    return data;
  } catch (error) {
    console.error('Error getting cached stats:', error);
    return null;
  }
}

/**
 * Get all user stats (cached + trend)
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Complete stats object with trend
 */
export async function getUserStats(userId) {
  try {
    // Get cached stats
    const cachedStats = await getCachedStats(userId);

    // Calculate trend
    const trend = await calculateMockScoreTrend(userId);

    return {
      ...cachedStats,
      avgMockScoreTrend: trend,
      totalStudyTimeHours: cachedStats ? cachedStats.total_study_time_seconds / 3600 : 0
    };
  } catch (error) {
    console.error('Error getting user stats:', error);
    return null;
  }
}

/**
 * Initialize stats for a new user
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function initializeUserStats(userId) {
  try {
    const { error } = await supabase
      .from('user_stats')
      .insert({
        user_id: userId,
        total_study_time_seconds: 0,
        current_streak_days: 0,
        longest_streak_days: 0,
        avg_mock_score: 0,
        accuracy_rate: 0,
        total_questions_attempted: 0,
        total_questions_correct: 0,
        total_mock_tests: 0,
        last_activity_date: new Date().toISOString().split('T')[0]
      });

    if (error && error.code !== '23505') { // Ignore duplicate key error
      throw error;
    }
  } catch (error) {
    console.error('Error initializing user stats:', error);
  }
}
