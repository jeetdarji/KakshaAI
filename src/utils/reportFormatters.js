/**
 * reportFormatters.js
 * Helper functions for formatting data in analytics PDF reports.
 */

/**
 * Format a decimal or number as a percentage string.
 * @param {number} value - e.g. 0.85 or 85
 * @param {boolean} isDecimal - if true, multiplies by 100
 * @returns {string} e.g. "85%"
 */
export const formatPercentage = (value, isDecimal = false) => {
  if (value == null || isNaN(value)) return 'N/A';
  const pct = isDecimal ? value * 100 : value;
  return `${Math.round(pct * 10) / 10}%`;
};

/**
 * Format score as "correct/total".
 * @param {number} correct
 * @param {number} total
 * @returns {string} e.g. "142/200"
 */
export const formatScore = (correct, total) => {
  if (correct == null || total == null) return 'N/A';
  return `${correct}/${total}`;
};

/**
 * Format seconds into a human readable string.
 * @param {number} seconds
 * @returns {string} e.g. "2h 30m"
 */
export const formatTime = (seconds) => {
  if (seconds == null || isNaN(seconds) || seconds < 0) return 'N/A';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);

  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
};

/**
 * Format a date into a readable string.
 * @param {Date|string} date
 * @returns {string} e.g. "Feb 19, 2026"
 */
export const formatDate = (date) => {
  if (!date) return 'N/A';
  try {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'N/A';
  }
};

/**
 * Format a date with time.
 * @param {Date|string} date
 * @returns {string} e.g. "Feb 19, 2026 at 3:45 PM"
 */
export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  try {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'N/A';
  }
};

/**
 * Get a performance badge string based on percentage.
 * @param {number} percentage - 0-100
 * @returns {string}
 */
export const getPerformanceBadge = (percentage) => {
  if (percentage == null || isNaN(percentage)) return 'No Data';
  if (percentage >= 90) return 'Outstanding';
  if (percentage >= 80) return 'Excellent';
  if (percentage >= 70) return 'Good';
  if (percentage >= 60) return 'Average';
  if (percentage >= 50) return 'Needs Improvement';
  return 'Needs Attention';
};

/**
 * Generate text insights from analytics data.
 * @param {object} data - The full analyticsData object
 * @returns {string[]} Array of insight strings
 */
export const generateInsights = (data) => {
  const insights = [];
  if (!data) return insights;

  const { kpi, subjectPerformance, weeklyActivity } = data;

  // KPI insights
  if (kpi?.totalTests != null) {
    if (kpi.totalTests >= 20) {
      insights.push(`You've completed ${kpi.totalTests} tests — great consistency!`);
    } else if (kpi.totalTests >= 5) {
      insights.push(`${kpi.totalTests} tests completed. Keep practicing to strengthen your skills.`);
    } else {
      insights.push(`You've taken ${kpi.totalTests} test(s) so far. More practice will give better predictions.`);
    }
  }

  if (kpi?.percentileRank != null) {
    if (kpi.percentileRank >= 90) {
      insights.push(`Top ${(100 - kpi.percentileRank).toFixed(1)}% — you're among the best performers!`);
    } else if (kpi.percentileRank >= 70) {
      insights.push(`You're in the ${kpi.percentileRank.toFixed(0)}th percentile — strong performance.`);
    }
  }

  if (kpi?.overallImprovement != null) {
    if (kpi.overallImprovement > 0) {
      insights.push(`Your scores have improved by ${kpi.overallImprovement.toFixed(1)}% — keep up the momentum!`);
    } else if (kpi.overallImprovement < 0) {
      insights.push(`Scores dipped by ${Math.abs(kpi.overallImprovement).toFixed(1)}% recently. Review weak topics.`);
    }
  }

  // Subject balance
  if (subjectPerformance?.length >= 2) {
    const sorted = [...subjectPerformance].sort((a, b) => b.percentage - a.percentage);
    const gap = sorted[0].percentage - sorted[sorted.length - 1].percentage;
    if (gap > 15) {
      insights.push(`There's a ${gap.toFixed(0)}% gap between your strongest and weakest subjects — focus on balance.`);
    } else {
      insights.push('Your subject performance is well balanced — great work!');
    }
  }

  // Weekly activity
  if (weeklyActivity?.length > 0) {
    const avgAccuracy = weeklyActivity.reduce((s, d) => s + (d.accuracy || 0), 0) / weeklyActivity.length;
    insights.push(`Average weekly accuracy: ${avgAccuracy.toFixed(1)}%.`);
  }

  return insights;
};

/**
 * Create actionable recommendations from weak topics.
 * @param {object[]} weakTopics - Array of weakest topic objects
 * @returns {string[]}
 */
export const createRecommendations = (weakTopics) => {
  if (!weakTopics?.length) return ['Keep practicing across all topics to identify areas for improvement.'];

  return weakTopics.slice(0, 5).map((t) => {
    const accuracy = t.accuracy ?? 0;
    if (accuracy < 40) {
      return `${t.topic}: Revisit fundamentals and attempt easy-level questions first.${t.improvementTip ? ` Tip: ${t.improvementTip}` : ''}`;
    }
    if (accuracy < 60) {
      return `${t.topic}: Practice more medium-difficulty questions and review mistakes.${t.improvementTip ? ` Tip: ${t.improvementTip}` : ''}`;
    }
    return `${t.topic}: Fine-tune with advanced problems to push past ${accuracy}%.${t.improvementTip ? ` Tip: ${t.improvementTip}` : ''}`;
  });
};

/**
 * Get a color hex for a subject.
 * @param {string} subject
 * @returns {string}
 */
export const getSubjectColor = (subject) => {
  const colors = {
    physics: '#3b82f6',
    chemistry: '#10b981',
    mathematics: '#f97316',
    maths: '#f97316',
    biology: '#a855f7',
  };
  return colors[(subject || '').toLowerCase()] || '#6b7280';
};
