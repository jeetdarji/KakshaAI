import { supabase } from './supabase';

/**
 * Challenge Generator Service
 * Creates personalized daily challenges based on user performance
 */

const CHALLENGE_TYPES = {
  QUESTION_BLITZ: 'questions',
  VIDEO_MARATHON: 'video',
  PERFECT_PRACTICE: 'perfect_practice',
  REVISION_DAY: 'revision',
  MOCK_TEST: 'mock_test'
};

const SUBJECTS = ['Physics', 'Chemistry', 'Maths'];

/**
 * Identify user's weakest subject based on chapter progress
 * @param {string} userId - User ID
 * @returns {Promise<string>} Weakest subject name
 */
export async function identifyWeakestSubject(userId) {
  try {
    // Get all chapters
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('id, subject');

    if (chaptersError) throw chaptersError;

    // Calculate progress for each subject
    const subjectProgress = {};

    for (const subject of SUBJECTS) {
      const subjectChapters = chapters.filter(c => c.subject === subject);
      const totalChapters = subjectChapters.length;

      if (totalChapters === 0) continue;

      // Get user progress for this subject's chapters
      const { data: progress, error: progressError } = await supabase
        .from('user_chapter_progress')
        .select('*')
        .eq('user_id', userId)
        .in('chapter_id', subjectChapters.map(c => c.id));

      if (progressError) throw progressError;

      // Calculate completion percentage
      const completedChapters = progress?.filter(p => {
        // A chapter is considered complete if all components are done
        const videoProgress = p.video_progress || 0;
        const practiceCompleted = p.practice_completed || false;
        return videoProgress >= 90 && practiceCompleted;
      }).length || 0;

      subjectProgress[subject] = {
        completed: completedChapters,
        total: totalChapters,
        percentage: (completedChapters / totalChapters) * 100
      };
    }

    // Find subject with lowest percentage
    let weakestSubject = SUBJECTS[0];
    let lowestPercentage = 100;

    for (const subject of SUBJECTS) {
      if (subjectProgress[subject] && subjectProgress[subject].percentage < lowestPercentage) {
        lowestPercentage = subjectProgress[subject].percentage;
        weakestSubject = subject;
      }
    }

    return weakestSubject;
  } catch (error) {
    console.error('Error identifying weakest subject:', error);
    // Default to Physics if error
    return 'Physics';
  }
}

/**
 * Check if user took a test yesterday
 * @param {string} userId - User ID
 * @returns {Promise<boolean>}
 */
async function didUserTestYesterday(userId) {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('user_practice_attempts')
      .select('id')
      .eq('user_id', userId)
      .gte('attempted_at', yesterday.toISOString())
      .lt('attempted_at', today.toISOString());

    if (error) throw error;

    return data && data.length > 0;
  } catch (error) {
    console.error('Error checking yesterday tests:', error);
    return false;
  }
}

/**
 * Generate challenge description based on type and subject
 * @param {string} type - Challenge type
 * @param {string} subject - Subject name
 * @param {number} targetCount - Target count
 * @returns {string} Challenge description
 */
function generateChallengeDescription(type, subject, targetCount) {
  const descriptions = {
    [CHALLENGE_TYPES.QUESTION_BLITZ]: [
      `Solve ${targetCount} ${subject} questions today to maintain your streak!`,
      `Challenge yourself with ${targetCount} ${subject} practice questions!`,
      `Master ${subject} by answering ${targetCount} questions today!`
    ],
    [CHALLENGE_TYPES.VIDEO_MARATHON]: [
      `Watch ${targetCount} complete ${subject} videos today!`,
      `Strengthen your ${subject} concepts by watching ${targetCount} videos!`,
      `Learn something new! Watch ${targetCount} ${subject} videos today!`
    ],
    [CHALLENGE_TYPES.PERFECT_PRACTICE]: [
      `Score 80%+ on any ${subject} practice test!`,
      `Prove your mastery! Get 80%+ on a ${subject} test!`,
      `Challenge accepted: Score 80%+ on ${subject} practice!`
    ],
    [CHALLENGE_TYPES.REVISION_DAY]: [
      `Review notes from ${targetCount} ${subject} chapters you've completed!`,
      `Refresh your memory! Revise ${targetCount} ${subject} chapters today!`,
      `Strengthen your foundation by reviewing ${targetCount} ${subject} chapters!`
    ],
    [CHALLENGE_TYPES.MOCK_TEST]: [
      `Complete a full-length mock test today!`,
      `Test your preparation with a complete mock test!`,
      `Challenge yourself with a full mock test today!`
    ]
  };

  const options = descriptions[type] || descriptions[CHALLENGE_TYPES.QUESTION_BLITZ];
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Determine target count based on challenge type
 * @param {string} type - Challenge type
 * @returns {number} Target count
 */
function determineTargetCount(type) {
  const targets = {
    [CHALLENGE_TYPES.QUESTION_BLITZ]: 30,
    [CHALLENGE_TYPES.VIDEO_MARATHON]: 2,
    [CHALLENGE_TYPES.PERFECT_PRACTICE]: 1,
    [CHALLENGE_TYPES.REVISION_DAY]: 3,
    [CHALLENGE_TYPES.MOCK_TEST]: 1
  };

  return targets[type] || 30;
}

/**
 * Determine reward points based on challenge type
 * @param {string} type - Challenge type
 * @returns {number} Reward points
 */
function determineRewardPoints(type) {
  const rewards = {
    [CHALLENGE_TYPES.QUESTION_BLITZ]: 10,
    [CHALLENGE_TYPES.VIDEO_MARATHON]: 15,
    [CHALLENGE_TYPES.PERFECT_PRACTICE]: 20,
    [CHALLENGE_TYPES.REVISION_DAY]: 10,
    [CHALLENGE_TYPES.MOCK_TEST]: 50
  };

  return rewards[type] || 10;
}

/**
 * Generate daily challenge for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Generated challenge
 */
export async function generateDailyChallenge(userId) {
  try {
    // Check if challenge already exists for today
    const today = new Date().toISOString().split('T')[0];

    const { data: existingChallenge } = await supabase
      .from('daily_challenges')
      .select('*')
      .eq('challenge_date', today)
      .single();

    if (existingChallenge) {
      return existingChallenge;
    }

    // Identify weakest subject
    const weakestSubject = await identifyWeakestSubject(userId);

    // Check if user tested yesterday
    const testedYesterday = await didUserTestYesterday(userId);

    // Select challenge type
    let challengeType;
    if (testedYesterday) {
      // If tested yesterday, suggest video or revision
      challengeType = Math.random() < 0.5
        ? CHALLENGE_TYPES.VIDEO_MARATHON
        : CHALLENGE_TYPES.REVISION_DAY;
    } else {
      // If didn't test yesterday, suggest practice questions
      const types = [
        CHALLENGE_TYPES.QUESTION_BLITZ,
        CHALLENGE_TYPES.PERFECT_PRACTICE
      ];
      challengeType = types[Math.floor(Math.random() * types.length)];
    }

    // Occasionally suggest mock test (10% chance)
    if (Math.random() < 0.1) {
      challengeType = CHALLENGE_TYPES.MOCK_TEST;
    }

    // Determine target count and rewards
    const targetCount = determineTargetCount(challengeType);
    const rewardPoints = determineRewardPoints(challengeType);

    // Generate description
    const description = generateChallengeDescription(
      challengeType,
      weakestSubject,
      targetCount
    );

    // Create challenge
    const { data: challenge, error } = await supabase
      .from('daily_challenges')
      .insert({
        challenge_date: today,
        challenge_type: challengeType,
        subject: challengeType === CHALLENGE_TYPES.MOCK_TEST ? 'mixed' : weakestSubject,
        target_count: targetCount,
        description: description,
        reward_points: rewardPoints
      })
      .select()
      .single();

    if (error) {
      console.warn('Could not persist challenge to DB (likely RLS), using client-side fallback:', error.message);
      // Return a client-side-only challenge so the UI still works
      return {
        id: `local-${today}`,
        challenge_date: today,
        challenge_type: challengeType,
        subject: challengeType === CHALLENGE_TYPES.MOCK_TEST ? 'mixed' : weakestSubject,
        target_count: targetCount,
        description: description,
        reward_points: rewardPoints,
        _local: true // flag to know this wasn't persisted
      };
    }

    return challenge;
  } catch (error) {
    console.error('Error generating daily challenge:', error);
    return null;
  }
}

/**
 * Get today's challenge
 * @returns {Promise<Object>} Today's challenge
 */
export async function getTodayChallenge() {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('daily_challenges')
      .select('*')
      .eq('challenge_date', today)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No challenge exists, return null
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error getting today challenge:', error);
    return null;
  }
}

/**
 * Get or create user's challenge progress for today
 * @param {string} userId - User ID
 * @param {string} challengeId - Challenge ID
 * @returns {Promise<Object>} Challenge progress
 */
export async function getChallengeProgress(userId, challengeId) {
  try {
    const { data, error } = await supabase
      .from('user_challenge_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('challenge_id', challengeId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No progress exists, create it
        return await initializeChallengeProgress(userId, challengeId);
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error getting challenge progress:', error);
    return null;
  }
}

/**
 * Initialize challenge progress for a user
 * @param {string} userId - User ID
 * @param {string} challengeId - Challenge ID
 * @returns {Promise<Object>} Initialized progress
 */
async function initializeChallengeProgress(userId, challengeId) {
  try {
    // Get challenge to get target count
    const { data: challenge } = await supabase
      .from('daily_challenges')
      .select('target_count')
      .eq('id', challengeId)
      .single();

    const { data, error } = await supabase
      .from('user_challenge_progress')
      .insert({
        user_id: userId,
        challenge_id: challengeId,
        current_progress: 0,
        target_count: challenge?.target_count || 0,
        completed: false
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error initializing challenge progress:', error);
    return null;
  }
}

/**
 * Update challenge progress
 * @param {string} userId - User ID
 * @param {string} challengeId - Challenge ID
 * @param {number} progress - New progress value
 * @returns {Promise<Object>} Updated progress
 */
export async function updateChallengeProgress(userId, challengeId, progress) {
  try {
    // Get current progress
    const currentProgress = await getChallengeProgress(userId, challengeId);

    if (!currentProgress) {
      throw new Error('Challenge progress not found');
    }

    const newProgress = Math.min(progress, currentProgress.target_count);
    const isCompleted = newProgress >= currentProgress.target_count;

    const updateData = {
      current_progress: newProgress,
      completed: isCompleted,
      updated_at: new Date().toISOString()
    };

    if (isCompleted && !currentProgress.completed) {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('user_challenge_progress')
      .update(updateData)
      .eq('user_id', userId)
      .eq('challenge_id', challengeId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating challenge progress:', error);
    return null;
  }
}

/**
 * Increment challenge progress
 * @param {string} userId - User ID
 * @param {string} challengeId - Challenge ID
 * @param {number} increment - Amount to increment (default 1)
 * @returns {Promise<Object>} Updated progress
 */
export async function incrementChallengeProgress(userId, challengeId, increment = 1) {
  try {
    const currentProgress = await getChallengeProgress(userId, challengeId);

    if (!currentProgress) {
      throw new Error('Challenge progress not found');
    }

    const newProgress = currentProgress.current_progress + increment;
    return await updateChallengeProgress(userId, challengeId, newProgress);
  } catch (error) {
    console.error('Error incrementing challenge progress:', error);
    return null;
  }
}

/**
 * Check if user has completed today's challenge
 * @param {string} userId - User ID
 * @returns {Promise<boolean>}
 */
export async function hasTodayChallengeCompleted(userId) {
  try {
    const challenge = await getTodayChallenge();

    if (!challenge) return false;

    const progress = await getChallengeProgress(userId, challenge.id);

    return progress?.completed || false;
  } catch (error) {
    console.error('Error checking challenge completion:', error);
    return false;
  }
}
