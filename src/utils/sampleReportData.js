/**
 * sampleReportData.js
 *
 * Generates sample/fake analytics data for testing the PDF report generator
 * without requiring actual user data.
 *
 * Usage:
 *   import { generateSampleData, sampleUserData } from './sampleReportData';
 *   const data = generateSampleData();
 *   await generateAnalyticsReport(data, sampleUserData);
 */

export const sampleUserData = {
  email: 'demo.student@example.com',
  user_metadata: { full_name: 'Demo Student' },
};

export function generateSampleData() {
  // Last 7 days for weekly activity
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date();

  const weeklyActivity = weekDays.map((dayName, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d.toISOString().slice(0, 10),
      dayName,
      questionsAttempted: 20 + Math.floor(Math.random() * 40),
      accuracy: 60 + Math.floor(Math.random() * 30),
      studyTime: 1800 + Math.floor(Math.random() * 5400),
    };
  });

  // Last 30 data points for score trends
  const scoreTrends = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (29 - i));
    return {
      date: d.toISOString().slice(0, 10),
      physics: 65 + Math.floor(Math.random() * 25),
      chemistry: 60 + Math.floor(Math.random() * 25),
      mathematics: 55 + Math.floor(Math.random() * 30),
    };
  });

  return {
    kpi: {
      totalTests: 25,
      percentileRank: 92.5,
      overallImprovement: 15.3,
      bestScoringTopic: { name: 'Physics', accuracy: 85 },
    },

    subjectPerformance: [
      { subject: 'Physics', percentage: 82, totalQuestions: 245, correctAnswers: 201, color: '#3b82f6' },
      { subject: 'Chemistry', percentage: 76, totalQuestions: 230, correctAnswers: 175, color: '#10b981' },
      { subject: 'Mathematics', percentage: 71, totalQuestions: 220, correctAnswers: 156, color: '#f97316' },
    ],

    weeklyActivity,
    scoreTrends,

    topicAnalysis: {
      strongest: [
        { topic: 'Mechanics', accuracy: 92, correct: 46, total: 50, testCount: 8, questionsAttempted: 50 },
        { topic: 'Organic Chemistry', accuracy: 88, correct: 44, total: 50, testCount: 7, questionsAttempted: 50 },
        { topic: 'Trigonometry', accuracy: 85, correct: 34, total: 40, testCount: 6, questionsAttempted: 40 },
        { topic: 'Electrostatics', accuracy: 83, correct: 33, total: 40, testCount: 5, questionsAttempted: 40 },
        { topic: 'Chemical Bonding', accuracy: 80, correct: 32, total: 40, testCount: 5, questionsAttempted: 40 },
      ],
      weakest: [
        { topic: 'Calculus', accuracy: 48, correct: 24, total: 50, testCount: 6, improvementTip: 'Practice integration by parts daily.' },
        { topic: 'Thermodynamics', accuracy: 52, correct: 26, total: 50, testCount: 5, improvementTip: 'Review laws of thermodynamics concepts.' },
        { topic: 'Coordination Chemistry', accuracy: 55, correct: 22, total: 40, testCount: 4, improvementTip: 'Focus on IUPAC naming and isomerism.' },
        { topic: 'Probability', accuracy: 58, correct: 29, total: 50, testCount: 5, improvementTip: 'Work on Bayes theorem problems.' },
        { topic: 'Waves & Optics', accuracy: 60, correct: 24, total: 40, testCount: 4, improvementTip: 'Revise wave equation derivations.' },
      ],
    },

    timeDistribution: [
      { subject: 'Physics', seconds: 7200, hours: 2, minutes: 0, percentage: 35, color: '#3b82f6' },
      { subject: 'Chemistry', seconds: 5400, hours: 1, minutes: 30, percentage: 30, color: '#10b981' },
      { subject: 'Mathematics', seconds: 6300, hours: 1, minutes: 45, percentage: 35, color: '#f97316' },
    ],

    prediction: {
      predictions: {
        easy: { score: 185, percentile: 98.5 },
        moderate: { score: 165, percentile: 95.2 },
        hard: { score: 148, percentile: 90.1 },
      },
      confidenceLevel: 'High',
      dataPoints: {
        mockTestsCompleted: 16,
        totalStudyHours: 120,
        questionsAttempted: 1500,
      },
      disclaimer: 'Predictions are estimates based on current performance data and may vary based on actual exam difficulty, preparation changes, and other factors.',
    },

    difficultyPerformance: {
      easy: { label: 'Easy', accuracy: 91, count: 320 },
      medium: { label: 'Medium', accuracy: 76, count: 280 },
      hard: { label: 'Hard', accuracy: 58, count: 195 },
    },

    timeManagement: {
      overall: 65,
      physics: 60,
      chemistry: 62,
      mathematics: 75,
    },

    scoreDistribution: [85, 78, 92, 88, 76, 82, 90, 73, 86, 79, 91, 84, 77, 88, 93, 80, 85, 74, 87, 81, 89, 83, 76, 90, 86],

    goals: {
      dailyGoal: 50,
      dailyProgress: 32,
      weeklyGoal: 350,
      weeklyProgress: 245,
    },

    errorPatterns: {
      categories: [
        { name: 'Mathematics', errorRate: 29, incorrectCount: 64, totalAttempts: 220 },
        { name: 'Chemistry', errorRate: 24, incorrectCount: 55, totalAttempts: 230 },
        { name: 'Physics', errorRate: 18, incorrectCount: 44, totalAttempts: 245 },
      ],
    },

    comparative: {
      userPercentile: 92.5,
      totalUsers: 150,
    },
  };
}

export default generateSampleData;
