import { supabase } from './supabase';
import { updateCachedStats } from './userStatsService';

/** Return local date as YYYY-MM-DD (avoids UTC shift from toISOString) */
function getLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Activity Tracker Service
 * Monitors and records user activity on the platform
 * Tracks study sessions, page visits, and activity intensity
 */

class ActivityTracker {
  constructor() {
    this.userId = null;
    this.sessionId = null;
    this.sessionStart = null;
    this.lastActivityAt = null;
    this.pagesVisited = [];
    this.pingInterval = null;
    this.idleTimeout = null;
    this.isActive = false;
    this.activityBuffer = {
      videosWatched: 0,
      chaptersCompleted: 0,
      testsTaken: 0,
      questionsAnswered: 0,
      downloadsCount: 0
    };
    this.PING_INTERVAL = 30000; // 30 seconds
    this.IDLE_TIMEOUT = 1800000; // 30 minutes
    this.BATCH_INTERVAL = 30000; // 30 seconds for batching updates
    this.batchIntervalId = null;
    this._boundHandlers = {}; // Store bound event handlers for cleanup
  }

  /**
   * Initialize activity tracker for a user
   * @param {string} userId - User ID
   */
  async initialize(userId) {
    if (!userId) {
      console.error('Cannot initialize activity tracker: userId is required');
      return;
    }

    this.userId = userId;
    await this.startSession();
    this.setupEventListeners();
    this.startPinging();
    this.startBatchUpdates();
  }

  /**
   * Start a new study session
   */
  async startSession() {
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('study_sessions')
        .insert({
          user_id: this.userId,
          session_start: now,
          last_activity_at: now,
          pages_visited: [window.location.pathname]
        })
        .select()
        .single();

      if (error) throw error;

      this.sessionId = data.id;
      this.sessionStart = now;
      this.lastActivityAt = now;
      this.pagesVisited = [window.location.pathname];
      this.isActive = true;
    } catch (error) {
      console.error('Error starting study session:', error);
    }
  }

  /**
   * End the current study session
   */
  async endSession() {
    if (!this.sessionId) return;

    try {
      const now = new Date().toISOString();
      const sessionStart = new Date(this.sessionStart);
      const sessionEnd = new Date(now);
      const durationSeconds = Math.floor((sessionEnd - sessionStart) / 1000);

      // Update session with end time and duration
      const { error } = await supabase
        .from('study_sessions')
        .update({
          session_end: now,
          duration_seconds: durationSeconds,
          pages_visited: this.pagesVisited
        })
        .eq('id', this.sessionId);

      if (error) throw error;

      // Update daily activity
      await this.updateDailyActivity(durationSeconds);

      // Update cached stats
      await updateCachedStats(this.userId);

      // Reset session
      this.sessionId = null;
      this.isActive = false;
    } catch (error) {
      console.error('Error ending study session:', error);
    }
  }

  /**
   * Send activity ping to keep session alive
   */
  async sendActivityPing() {
    if (!this.sessionId || !this.isActive) return;

    try {
      const now = new Date().toISOString();
      
      // Track current page if not already tracked
      const currentPage = window.location.pathname;
      if (!this.pagesVisited.includes(currentPage)) {
        this.pagesVisited.push(currentPage);
      }

      // Update last activity time
      const { error } = await supabase
        .from('study_sessions')
        .update({
          last_activity_at: now,
          pages_visited: this.pagesVisited
        })
        .eq('id', this.sessionId);

      if (error) throw error;

      this.lastActivityAt = now;

      // Reset idle timeout
      this.resetIdleTimeout();
    } catch (error) {
      console.error('Error sending activity ping:', error);
    }
  }

  /**
   * Start periodic activity pings
   */
  startPinging() {
    // Clear existing interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    // Send ping every 30 seconds
    this.pingInterval = setInterval(() => {
      if (this.isActive && document.visibilityState === 'visible') {
        this.sendActivityPing();
      }
    }, this.PING_INTERVAL);
  }

  /**
   * Setup event listeners for tab visibility and page navigation
   */
  setupEventListeners() {
    // Store bound handlers so they can be removed in cleanup
    this._boundHandlers.visibilityChange = () => this.handleVisibilityChange();
    this._boundHandlers.popstate = () => this.trackPageVisit(window.location.pathname);
    this._boundHandlers.beforeunload = () => this.endSession();
    this._boundHandlers.focus = () => {
      if (!this.isActive && this.userId) {
        this.isActive = true;
        this.sendActivityPing();
      }
    };
    this._boundHandlers.blur = () => {
      this.isActive = false;
    };

    document.addEventListener('visibilitychange', this._boundHandlers.visibilityChange);
    window.addEventListener('popstate', this._boundHandlers.popstate);
    window.addEventListener('beforeunload', this._boundHandlers.beforeunload);
    window.addEventListener('focus', this._boundHandlers.focus);
    window.addEventListener('blur', this._boundHandlers.blur);
  }

  /**
   * Handle tab visibility changes
   */
  handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      // Tab became visible - resume session
      this.isActive = true;
      this.sendActivityPing();
      this.resetIdleTimeout();
    } else {
      // Tab became hidden - pause session
      this.isActive = false;
      if (this.idleTimeout) {
        clearTimeout(this.idleTimeout);
      }
    }
  }

  /**
   * Reset idle timeout
   */
  resetIdleTimeout() {
    // Clear existing timeout
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
    }

    // Set new timeout
    this.idleTimeout = setTimeout(() => {
      this.endSession();
    }, this.IDLE_TIMEOUT);
  }

  /**
   * Track page visit
   * @param {string} pagePath - Page path
   */
  trackPageVisit(pagePath) {
    if (!this.pagesVisited.includes(pagePath)) {
      this.pagesVisited.push(pagePath);
    }
  }

  /**
   * Record activity (video watched, test taken, etc.)
   * @param {string} activityType - Type of activity
   * @param {number} count - Count to add (default 1)
   */
  recordActivity(activityType, count = 1) {
    switch (activityType) {
      case 'video':
        this.activityBuffer.videosWatched += count;
        break;
      case 'chapter':
        this.activityBuffer.chaptersCompleted += count;
        break;
      case 'test':
        this.activityBuffer.testsTaken += count;
        break;
      case 'question':
        this.activityBuffer.questionsAnswered += count;
        break;
      case 'download':
        this.activityBuffer.downloadsCount = (this.activityBuffer.downloadsCount || 0) + count;
        break;
      default:
        console.warn('Unknown activity type:', activityType);
    }
  }

  /**
   * Immediately flush activity to database (for important events)
   * This ensures real-time heatmap updates
   */
  async immediateFlush() {
    if (this.hasBufferedActivity()) {
      await this.flushActivityBuffer();
    }
  }

  /**
   * Start batching activity updates
   */
  startBatchUpdates() {
    if (this.batchIntervalId) {
      clearInterval(this.batchIntervalId);
    }
    this.batchIntervalId = setInterval(async () => {
      if (this.hasBufferedActivity()) {
        await this.flushActivityBuffer();
      }
    }, this.BATCH_INTERVAL);
  }

  /**
   * Check if there's buffered activity
   * @returns {boolean}
   */
  hasBufferedActivity() {
    return (
      this.activityBuffer.videosWatched > 0 ||
      this.activityBuffer.chaptersCompleted > 0 ||
      this.activityBuffer.testsTaken > 0 ||
      this.activityBuffer.questionsAnswered > 0 ||
      (this.activityBuffer.downloadsCount || 0) > 0
    );
  }

  /**
   * Flush activity buffer to database
   */
  async flushActivityBuffer() {
    if (!this.userId || !this.hasBufferedActivity()) return;

    try {
      const today = getLocalDateString();

      // Get existing activity for today
      const { data: existing } = await supabase
        .from('daily_activity')
        .select('*')
        .eq('user_id', this.userId)
        .eq('activity_date', today)
        .single();

      const newData = {
        user_id: this.userId,
        activity_date: today,
        videos_watched: (existing?.videos_watched || 0) + this.activityBuffer.videosWatched,
        chapters_completed: (existing?.chapters_completed || 0) + this.activityBuffer.chaptersCompleted,
        tests_taken: (existing?.tests_taken || 0) + this.activityBuffer.testsTaken,
        questions_answered: (existing?.questions_answered || 0) + this.activityBuffer.questionsAnswered,
        downloads_count: (existing?.downloads_count || 0) + (this.activityBuffer.downloadsCount || 0),
        updated_at: new Date().toISOString()
      };

      // Calculate activity intensity
      newData.activity_intensity = this.calculateActivityIntensity(newData);

      // Upsert daily activity
      const { error } = await supabase
        .from('daily_activity')
        .upsert(newData, {
          onConflict: 'user_id,activity_date'
        });

      if (error) throw error;

      // Clear buffer
      this.activityBuffer = {
        videosWatched: 0,
        chaptersCompleted: 0,
        testsTaken: 0,
        questionsAnswered: 0,
        downloadsCount: 0
      };

    } catch (error) {
      console.error('Error flushing activity buffer:', error);
    }
  }

  /**
   * Calculate activity intensity based on activity counts
   * @param {Object} activity - Activity data
   * @returns {string} Intensity level (none, light, medium, high)
   */
  calculateActivityIntensity(activity) {
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
   * Update daily activity with study time
   * @param {number} durationSeconds - Session duration in seconds
   */
  async updateDailyActivity(durationSeconds) {
    try {
      const today = getLocalDateString();

      // Get existing activity
      const { data: existing } = await supabase
        .from('daily_activity')
        .select('*')
        .eq('user_id', this.userId)
        .eq('activity_date', today)
        .single();

      const newStudyTime = (existing?.study_time_seconds || 0) + durationSeconds;

      const updateData = {
        user_id: this.userId,
        activity_date: today,
        study_time_seconds: newStudyTime,
        updated_at: new Date().toISOString()
      };

      // If no existing record, initialize with zeros
      if (!existing) {
        updateData.videos_watched = 0;
        updateData.chapters_completed = 0;
        updateData.tests_taken = 0;
        updateData.questions_answered = 0;
        updateData.activity_intensity = 'light'; // At least they logged in
      } else {
        // Recalculate intensity
        updateData.activity_intensity = this.calculateActivityIntensity({
          ...existing,
          study_time_seconds: newStudyTime
        });
      }

      // Upsert
      const { error } = await supabase
        .from('daily_activity')
        .upsert(updateData, {
          onConflict: 'user_id,activity_date'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating daily activity:', error);
    }
  }

  /**
   * Cleanup - stop all intervals and end session
   */
  cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
      this.idleTimeout = null;
    }
    if (this.batchIntervalId) {
      clearInterval(this.batchIntervalId);
      this.batchIntervalId = null;
    }
    // Remove event listeners
    if (this._boundHandlers.visibilityChange) {
      document.removeEventListener('visibilitychange', this._boundHandlers.visibilityChange);
    }
    if (this._boundHandlers.popstate) {
      window.removeEventListener('popstate', this._boundHandlers.popstate);
    }
    if (this._boundHandlers.beforeunload) {
      window.removeEventListener('beforeunload', this._boundHandlers.beforeunload);
    }
    if (this._boundHandlers.focus) {
      window.removeEventListener('focus', this._boundHandlers.focus);
    }
    if (this._boundHandlers.blur) {
      window.removeEventListener('blur', this._boundHandlers.blur);
    }
    this._boundHandlers = {};
    this.endSession();
  }
}

// Create singleton instance
const activityTracker = new ActivityTracker();

// Export the recordActivity method for external use
export const recordTestCompletion = (questionCount = 0) => {
  activityTracker.recordActivity('test', 1);
  if (questionCount > 0) {
    activityTracker.recordActivity('question', questionCount);
  }
  activityTracker.immediateFlush();
};

export const recordVideoWatched = () => {
  activityTracker.recordActivity('video', 1);
  activityTracker.immediateFlush();
};

export const recordChapterCompleted = () => {
  activityTracker.recordActivity('chapter', 1);
  activityTracker.immediateFlush();
};

export const recordDownload = () => {
  activityTracker.recordActivity('download', 1);
  activityTracker.immediateFlush();
};

export default activityTracker;
