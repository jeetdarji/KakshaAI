import { supabase } from './supabase';

/**
 * Analytics Service — v4 (Bug-Fixed & Optimized)
 *
 * DATA SOURCE RULES:
 *   1. Total tests completed       → mock test only (submissions)
 *   2. Rank percentile             → mock test only
 *   3. Overall improvement         → mock test only (linear regression)
 *   4. Best scoring topic          → mock test only
 *   5. Subject performance         → mock + chapter-wise quiz
 *   6. Weekly activity             → mock + chapter-wise (with exam type on hover)
 *   7. Score trends                → mock test only (score out of 200, single line)
 *   8. Strongest/Areas improvement → mock + chapter-wise quiz
 *   9. Time distribution           → mock + chapter-wise
 *  10. Performance by difficulty   → mock test only (radar chart)
 *  11. Time management             → mock only (avg secs per question per subject)
 *  12. Score distribution          → mock test only
 *  13. Study goals                 → mock + chapter-wise (only solved questions)
 *  14. Error rate                  → mock test only (by subject)
 *
 * BUG FIXES:
 *  - Weekly activity: accuracy now uses correct/attempted (not score/maxScore)
 *  - No double-counting of questions (daily_activity used only for study time)
 *  - Study goals: counts only actually answered questions
 *  - Time distribution: includes practice time, proportional mock time
 *  - Improvement rate: linear regression instead of half-split
 *  - Error patterns: uses subject names, not section names
 *
 * DB tables used:
 *   submissions             — mock test results
 *   sections                — test sections
 *   questions               — individual questions (with subject field)
 *   tests                   — test metadata
 *   user_practice_attempts  — chapter quiz results
 *   chapters                — chapter metadata (title, subject)
 *   daily_activity          — daily aggregates (study_time_seconds only)
 */

// ============================================================================
// HELPER: Fetch all submissions with enriched question/section data (called ONCE)
// ============================================================================

async function getEnrichedSubmissions(userId) {
  const { data: submissions, error: subError } = await supabase
    .from('submissions')
    .select('id, user_id, test_id, score, max_score, answers, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (subError) {
    console.error('Error fetching submissions:', subError);
    return { submissions: [], questionsMap: {}, sectionsMap: {}, testsMap: {} };
  }

  if (!submissions || submissions.length === 0) {
    return { submissions: [], questionsMap: {}, sectionsMap: {}, testsMap: {} };
  }

  const testIds = [...new Set(submissions.map(s => s.test_id))];

  const [testsResult, sectionsResult] = await Promise.all([
    supabase.from('tests').select('id, title, duration_mins, total_marks').in('id', testIds),
    supabase.from('sections').select('id, test_id, name, duration_mins, order_index').in('test_id', testIds)
  ]);

  const testsMap = {};
  (testsResult.data || []).forEach(t => { testsMap[t.id] = t; });

  const sectionsMap = {};
  (sectionsResult.data || []).forEach(s => { sectionsMap[s.id] = s; });

  const sectionIds = Object.keys(sectionsMap);
  let questionsMap = {};

  if (sectionIds.length > 0) {
    const { data: questions, error: qError } = await supabase
      .from('questions')
      .select('id, section_id, marks, correct_option, subject')
      .in('section_id', sectionIds);

    if (qError) console.error('Error fetching questions:', qError);
    (questions || []).forEach(q => { questionsMap[q.id] = q; });
  }

  return { submissions, questionsMap, sectionsMap, testsMap };
}

/**
 * Map a section name to a subject (fallback only).
 */
function sectionToSubject(sectionName) {
  if (!sectionName) return 'Other';
  const n = sectionName.toLowerCase();
  if (n === 'chemistry' || (n.includes('chem') && !n.includes('physics'))) return 'Chemistry';
  if (n.includes('physics') || n.includes('phy')) return 'Physics';
  if (n.includes('math') || n.includes('maths')) return 'Mathematics';
  return 'Other';
}

/**
 * Get subject for a question — prefers question.subject over section name mapping.
 */
function getQuestionSubject(question, section) {
  if (question?.subject) {
    const s = question.subject;
    if (s === 'Physics' || s === 'Chemistry' || s === 'Mathematics') return s;
  }
  return sectionToSubject(section?.name);
}

/**
 * Normalize subject names from DB (e.g. "Maths" → "Mathematics").
 */
function normalizeSubject(raw) {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower === 'maths' || lower === 'math' || lower.includes('mathematics')) return 'Mathematics';
  if (lower.includes('physics') || lower === 'phy') return 'Physics';
  if (lower.includes('chemistry') || lower === 'chem') return 'Chemistry';
  return raw;
}

/**
 * Convert time range string to a cutoff Date.
 */
function getDateCutoff(timeRange) {
  const now = new Date();
  switch (timeRange) {
    case '7d': now.setDate(now.getDate() - 7); break;
    case '30d': now.setDate(now.getDate() - 30); break;
    case '90d': now.setDate(now.getDate() - 90); break;
    case '1y': now.setFullYear(now.getFullYear() - 1); break;
    default: now.setDate(now.getDate() - 30); break;
  }
  return now;
}

/**
 * Convert time range string to number of days.
 */
function timeRangeToDays(timeRange) {
  switch (timeRange) {
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    case '1y': return 365;
    default: return 30;
  }
}

/**
 * Count actually answered questions and correct answers from a submission's answers object.
 * Only counts entries where the user provided an answer.
 */
function countAnsweredFromSubmission(answers) {
  const entries = Object.values(answers || {});
  const attempted = entries.filter(a => a.answer !== null && a.answer !== undefined).length;
  const correct = entries.filter(a => a.isCorrect).length;
  return { attempted, correct };
}

// ============================================================================
// KPI METRICS — mock test only
// ============================================================================

export async function getKPIMetrics(userId, enriched) {
  try {
    const { submissions, questionsMap, sectionsMap } = enriched;

    // Total tests = mock tests only
    const totalTests = submissions.length;

    // Overall improvement using linear regression on mock test scores
    const overallImprovement = calculateImprovementRate(submissions);

    // Best scoring topic from mock submissions
    const subjectScores = {};
    submissions.forEach(sub => {
      const answers = sub.answers || {};
      Object.entries(answers).forEach(([qId, ans]) => {
        const question = questionsMap[qId];
        if (!question) return;
        const section = sectionsMap[question.section_id];
        if (!section) return;
        const subject = getQuestionSubject(question, section);
        if (!subjectScores[subject]) subjectScores[subject] = { correct: 0, total: 0 };
        subjectScores[subject].total++;
        if (ans.isCorrect) subjectScores[subject].correct++;
      });
    });

    let bestScoringTopic = { name: 'N/A', accuracy: 0 };
    Object.entries(subjectScores).forEach(([name, stats]) => {
      if (stats.total > 0) {
        const accuracy = Math.round((stats.correct / stats.total) * 100);
        if (accuracy > bestScoringTopic.accuracy) {
          bestScoringTopic = { name, accuracy };
        }
      }
    });

    const percentileRank = await calculatePercentileRank(userId);

    return {
      totalTests,
      percentileRank,
      overallImprovement: overallImprovement || 0,
      bestScoringTopic
    };
  } catch (error) {
    console.error('Error fetching KPI metrics:', error);
    return {
      totalTests: 0,
      percentileRank: 0,
      overallImprovement: 0,
      bestScoringTopic: { name: 'N/A', accuracy: 0 }
    };
  }
}

// ============================================================================
// SUBJECT PERFORMANCE — mock + chapter-wise quiz
// ============================================================================

export async function getSubjectPerformance(userId, enriched, dateCutoff = null) {
  try {
    const { submissions, questionsMap, sectionsMap } = enriched;

    const subjectMap = {
      Physics: { subject: 'Physics', color: '#3b82f6', totalQuestions: 0, correctAnswers: 0 },
      Chemistry: { subject: 'Chemistry', color: '#10b981', totalQuestions: 0, correctAnswers: 0 },
      Mathematics: { subject: 'Mathematics', color: '#f97316', totalQuestions: 0, correctAnswers: 0 }
    };

    // Mock test data — count only actually answered questions
    submissions.forEach(sub => {
      const answers = sub.answers || {};
      Object.entries(answers).forEach(([qId, ans]) => {
        const question = questionsMap[qId];
        if (!question) return;
        const section = sectionsMap[question.section_id];
        if (!section) return;
        const subject = getQuestionSubject(question, section);
        if (subjectMap[subject]) {
          subjectMap[subject].totalQuestions++;
          if (ans.isCorrect) subjectMap[subject].correctAnswers++;
        }
      });
    });

    // Practice / chapter-wise quiz data
    let practiceQ1 = supabase
      .from('user_practice_attempts')
      .select('score, total_questions, answers, chapters!inner(subject)')
      .eq('user_id', userId);
    if (dateCutoff) practiceQ1 = practiceQ1.gte('attempted_at', dateCutoff);
    const { data: practiceData } = await practiceQ1;

    (practiceData || []).forEach(attempt => {
      const subject = normalizeSubject(attempt.chapters?.subject);
      if (subject && subjectMap[subject]) {
        const answeredCount = Object.keys(attempt.answers || {}).length || attempt.total_questions || 0;
        subjectMap[subject].totalQuestions += answeredCount;
        subjectMap[subject].correctAnswers += attempt.score || 0;
      }
    });

    return Object.values(subjectMap).map(subj => ({
      ...subj,
      percentage: subj.totalQuestions > 0
        ? Math.round((subj.correctAnswers / subj.totalQuestions) * 100)
        : 0
    }));
  } catch (error) {
    console.error('Error fetching subject performance:', error);
    return [];
  }
}

// ============================================================================
// WEEKLY ACTIVITY — mock + chapter-wise quiz, with exam type info
// Uses submissions + practice_attempts directly. NO double-counting.
// daily_activity used only for study time.
// Accuracy = correct / attempted (not score / maxScore).
// ============================================================================

export async function getWeeklyActivity(userId, enriched, numDays = 7) {
  try {
    const { submissions } = enriched;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - numDays);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    // Study time only from daily_activity
    const { data: activityData } = await supabase
      .from('daily_activity')
      .select('activity_date, study_time_seconds')
      .eq('user_id', userId)
      .gte('activity_date', cutoffDateStr);

    // Practice attempts within selected time range
    const { data: practiceAttempts } = await supabase
      .from('user_practice_attempts')
      .select('score, total_questions, answers, attempted_at, chapters!inner(title, subject)')
      .eq('user_id', userId)
      .gte('attempted_at', cutoffDate.toISOString());

    // Build per-day data
    const perDayData = {};

    // Mock test submissions within selected time range
    const recentSubmissions = submissions.filter(s =>
      new Date(s.created_at) >= cutoffDate
    );

    recentSubmissions.forEach(sub => {
      const date = sub.created_at.split('T')[0];
      if (!perDayData[date]) {
        perDayData[date] = { correct: 0, attempted: 0, mockTests: 0, quizzes: 0, examDetails: [] };
      }
      const { attempted, correct } = countAnsweredFromSubmission(sub.answers);
      perDayData[date].correct += correct;
      perDayData[date].attempted += attempted;
      perDayData[date].mockTests++;
      perDayData[date].examDetails.push({
        type: 'Mock Test',
        questions: attempted,
        correct
      });
    });

    // Practice / chapter-wise quiz attempts (last 7 days)
    (practiceAttempts || []).forEach(pa => {
      const date = pa.attempted_at?.split('T')[0];
      if (!date) return;
      if (!perDayData[date]) {
        perDayData[date] = { correct: 0, attempted: 0, mockTests: 0, quizzes: 0, examDetails: [] };
      }
      const attemptedCount = Object.keys(pa.answers || {}).length || pa.total_questions || 0;
      const correctCount = pa.score || 0;
      perDayData[date].correct += correctCount;
      perDayData[date].attempted += attemptedCount;
      perDayData[date].quizzes++;
      perDayData[date].examDetails.push({
        type: 'Chapter Quiz',
        chapter: pa.chapters?.title || 'Quiz',
        questions: attemptedCount,
        correct: correctCount
      });
    });

    // Study time map
    const studyTimeMap = {};
    (activityData || []).forEach(a => {
      studyTimeMap[a.activity_date] = a.study_time_seconds || 0;
    });

    // Fill days based on selected time range
    const result = [];
    for (let i = 0; i < numDays; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (numDays - 1 - i));
      const dateStr = date.toISOString().split('T')[0];
      const dayData = perDayData[dateStr];

      result.push({
        date: dateStr,
        dayName: numDays <= 7
          ? date.toLocaleDateString('en-US', { weekday: 'short' })
          : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        questionsAttempted: dayData?.attempted || 0,
        accuracy: dayData && dayData.attempted > 0
          ? Math.round((dayData.correct / dayData.attempted) * 100)
          : 0,
        studyTime: studyTimeMap[dateStr] || 0,
        mockTests: dayData?.mockTests || 0,
        quizzes: dayData?.quizzes || 0,
        examDetails: dayData?.examDetails || []
      });
    }

    return result;
  } catch (error) {
    console.error('Error fetching weekly activity:', error);
    return [];
  }
}

// ============================================================================
// SCORE TRENDS — mock test only, total score out of 200, single line
// ============================================================================

export async function getScoreTrends(userId, enriched, days = 30) {
  try {
    const { submissions, testsMap } = enriched;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    const recentSubmissions = submissions.filter(s =>
      new Date(s.created_at) >= daysAgo
    );

    if (recentSubmissions.length === 0) return [];

    return recentSubmissions.map(sub => {
      const testTitle = testsMap[sub.test_id]?.title || 'Mock Test';
      const totalMarks = testsMap[sub.test_id]?.total_marks || sub.max_score || 200;
      // Normalize to score out of 200
      const scoreOutOf200 = totalMarks > 0
        ? Math.round((sub.score / totalMarks) * 200)
        : 0;

      return {
        date: sub.created_at.split('T')[0],
        score: scoreOutOf200,
        rawScore: sub.score,
        maxScore: totalMarks,
        testName: testTitle
      };
    });
  } catch (error) {
    console.error('Error fetching score trends:', error);
    return [];
  }
}

// ============================================================================
// TOPIC ANALYSIS — mock + chapter-wise quiz, per-subject breakdown
// ============================================================================

export async function getTopicAnalysis(userId, enriched, dateCutoff = null) {
  try {
    const { submissions, questionsMap, sectionsMap } = enriched;

    const subjectStats = {};

    // Mock test data — count only answered questions
    submissions.forEach(sub => {
      const answers = sub.answers || {};
      Object.entries(answers).forEach(([qId, ans]) => {
        const question = questionsMap[qId];
        if (!question) return;
        const section = sectionsMap[question.section_id];
        if (!section) return;
        const subject = getQuestionSubject(question, section);

        if (!subjectStats[subject]) {
          subjectStats[subject] = { topic: subject, correct: 0, total: 0, testCount: 0 };
        }
        subjectStats[subject].total++;
        if (ans.isCorrect) subjectStats[subject].correct++;
      });
    });

    // Count mock tests per subject
    submissions.forEach(sub => {
      const answers = sub.answers || {};
      const seenSubjects = new Set();
      Object.keys(answers).forEach(qId => {
        const question = questionsMap[qId];
        if (!question) return;
        const section = sectionsMap[question.section_id];
        if (!section) return;
        const subject = getQuestionSubject(question, section);
        if (!seenSubjects.has(subject) && subjectStats[subject]) {
          seenSubjects.add(subject);
          subjectStats[subject].testCount++;
        }
      });
    });

    // Practice / chapter-wise quiz data
    let practiceQ2 = supabase
      .from('user_practice_attempts')
      .select('score, total_questions, answers, chapters!inner(subject)')
      .eq('user_id', userId);
    if (dateCutoff) practiceQ2 = practiceQ2.gte('attempted_at', dateCutoff);
    const { data: practiceData } = await practiceQ2;

    (practiceData || []).forEach(attempt => {
      const subject = normalizeSubject(attempt.chapters?.subject);
      if (!subject) return;
      if (!subjectStats[subject]) {
        subjectStats[subject] = { topic: subject, correct: 0, total: 0, testCount: 0 };
      }
      const attemptedCount = Object.keys(attempt.answers || {}).length || attempt.total_questions || 0;
      subjectStats[subject].total += attemptedCount;
      subjectStats[subject].correct += attempt.score || 0;
      subjectStats[subject].testCount++;
    });

    if (Object.keys(subjectStats).length === 0) {
      return { strongest: [], weakest: [] };
    }

    const subjects = Object.values(subjectStats)
      .filter(s => s.total > 0)
      .map(s => ({
        topic: s.topic,
        accuracy: Math.round((s.correct / s.total) * 100),
        correct: s.correct,
        total: s.total,
        testCount: s.testCount,
        questionsAttempted: s.total
      }))
      .sort((a, b) => b.accuracy - a.accuracy);

    const weakest = subjects.length > 0
      ? [...subjects].sort((a, b) => a.accuracy - b.accuracy).map(s => ({
        ...s,
        improvementTip: generateImprovementTip(s.topic, s.accuracy, s.total, s.correct)
      }))
      : [];

    return { strongest: subjects, weakest };
  } catch (error) {
    console.error('Error fetching topic analysis:', error);
    return { strongest: [], weakest: [] };
  }
}

function generateImprovementTip(subject, accuracy, totalQuestions, correctAnswers) {
  const wrongAnswers = totalQuestions - correctAnswers;

  if (accuracy < 30) {
    return `You got ${wrongAnswers} out of ${totalQuestions} ${subject} questions wrong. Focus on building core concepts and formulas in ${subject}.`;
  } else if (accuracy < 50) {
    return `Your ${subject} accuracy is ${accuracy}%. Revise key chapters and practice more MCQs to cross the 50% mark.`;
  } else if (accuracy < 70) {
    return `Good progress in ${subject}! Practice harder problems and timed tests to push from ${accuracy}% to 70%+.`;
  } else {
    return `Strong in ${subject} at ${accuracy}%! Focus on speed and solving tricky problems to maximize marks.`;
  }
}

// ============================================================================
// TIME DISTRIBUTION — mock + chapter-wise quiz
// Mock: proportional time based on answered questions per section
// Practice: stored time or estimate (60s per question)
// ============================================================================

export async function getTimeDistribution(userId, enriched, dateCutoff = null) {
  try {
    const { submissions, questionsMap, sectionsMap } = enriched;

    const subjectTime = {
      Physics: { seconds: 0, questions: 0 },
      Chemistry: { seconds: 0, questions: 0 },
      Mathematics: { seconds: 0, questions: 0 }
    };

    // Mock test time — proportional to answered questions per subject
    submissions.forEach(sub => {
      const answers = sub.answers || {};
      const sectionSubjectCounts = {};

      Object.keys(answers).forEach(qId => {
        const question = questionsMap[qId];
        if (!question) return;
        const section = sectionsMap[question.section_id];
        if (!section) return;
        const subject = getQuestionSubject(question, section);

        if (!sectionSubjectCounts[question.section_id]) {
          sectionSubjectCounts[question.section_id] = {};
        }
        if (!sectionSubjectCounts[question.section_id][subject]) {
          sectionSubjectCounts[question.section_id][subject] = 0;
        }
        sectionSubjectCounts[question.section_id][subject]++;
      });

      Object.entries(sectionSubjectCounts).forEach(([sectionId, subjectCounts]) => {
        const section = sectionsMap[sectionId];
        if (!section) return;

        const totalSectionQuestions = Object.values(questionsMap).filter(
          q => String(q.section_id) === String(sectionId)
        ).length;
        if (totalSectionQuestions === 0) return;

        Object.entries(subjectCounts).forEach(([subject, count]) => {
          if (subjectTime[subject]) {
            // Time proportional to answered questions vs total in section
            const estimatedSeconds = ((section.duration_mins || 0) * 60) * (count / totalSectionQuestions);
            subjectTime[subject].seconds += estimatedSeconds;
            subjectTime[subject].questions += count;
          }
        });
      });
    });

    // Practice / chapter-wise quiz time
    let practiceQ3 = supabase
      .from('user_practice_attempts')
      .select('score, total_questions, time_taken_seconds, answers, chapters!inner(subject)')
      .eq('user_id', userId);
    if (dateCutoff) practiceQ3 = practiceQ3.gte('attempted_at', dateCutoff);
    const { data: practiceData } = await practiceQ3;

    (practiceData || []).forEach(attempt => {
      const subject = normalizeSubject(attempt.chapters?.subject);
      if (!subject || !subjectTime[subject]) return;

      const attemptedCount = Object.keys(attempt.answers || {}).length || attempt.total_questions || 0;
      const timeTaken = attempt.time_taken_seconds > 0
        ? attempt.time_taken_seconds
        : attemptedCount * 60; // Estimate 60s per question if no timer data

      subjectTime[subject].seconds += timeTaken;
      subjectTime[subject].questions += attemptedCount;
    });

    const totalSeconds = Object.values(subjectTime).reduce((sum, s) => sum + s.seconds, 0);

    return [
      { subject: 'Physics', color: '#3b82f6', seconds: subjectTime.Physics.seconds },
      { subject: 'Chemistry', color: '#10b981', seconds: subjectTime.Chemistry.seconds },
      { subject: 'Mathematics', color: '#f97316', seconds: subjectTime.Mathematics.seconds }
    ].map(d => ({
      ...d,
      hours: Math.floor(d.seconds / 3600),
      minutes: Math.floor((d.seconds % 3600) / 60),
      percentage: totalSeconds > 0 ? Math.round((d.seconds / totalSeconds) * 100) : 0
    }));
  } catch (error) {
    console.error('Error fetching time distribution:', error);
    return [];
  }
}

// ============================================================================
// PERFORMANCE BY DIFFICULTY — mock test only, multi-dimensional radar data
// Analyzes: per-subject accuracy, speed, completion rate, consistency
// ============================================================================

export async function getQuestionDifficultyAnalysis(userId, enriched) {
  try {
    const { submissions, questionsMap, sectionsMap } = enriched;

    const subjectPerf = {
      Physics: { correct: 0, total: 0, attempted: 0, testCount: 0 },
      Chemistry: { correct: 0, total: 0, attempted: 0, testCount: 0 },
      Mathematics: { correct: 0, total: 0, attempted: 0, testCount: 0 }
    };

    // Per-test accuracy for consistency calculation
    const subjectTestAccuracies = { Physics: [], Chemistry: [], Mathematics: [] };

    submissions.forEach(sub => {
      const answers = sub.answers || {};
      const testSubjectStats = {
        Physics: { c: 0, t: 0, a: 0 },
        Chemistry: { c: 0, t: 0, a: 0 },
        Mathematics: { c: 0, t: 0, a: 0 }
      };

      // Count answered questions per subject
      Object.entries(answers).forEach(([qId, ans]) => {
        const question = questionsMap[qId];
        if (!question) return;
        const section = sectionsMap[question.section_id];
        if (!section) return;
        const subject = getQuestionSubject(question, section);
        if (testSubjectStats[subject]) {
          testSubjectStats[subject].a++;
          if (ans.isCorrect) testSubjectStats[subject].c++;
        }
      });

      // Count total questions per subject in the test (from all sections of this test)
      Object.values(sectionsMap).forEach(sec => {
        if (sec.test_id === sub.test_id) {
          const sectionQuestions = Object.values(questionsMap).filter(q => q.section_id === sec.id);
          sectionQuestions.forEach(q => {
            const subject = getQuestionSubject(q, sec);
            if (testSubjectStats[subject]) {
              testSubjectStats[subject].t++;
            }
          });
        }
      });

      Object.entries(testSubjectStats).forEach(([subject, stats]) => {
        if (stats.t > 0) {
          subjectPerf[subject].correct += stats.c;
          subjectPerf[subject].total += stats.t;
          subjectPerf[subject].attempted += stats.a;
          subjectPerf[subject].testCount++;
          subjectTestAccuracies[subject].push(
            stats.a > 0 ? (stats.c / stats.a) * 100 : 0
          );
        }
      });
    });

    // Consistency: 100 - standard deviation of accuracy across tests
    const calcConsistency = (accuracies) => {
      if (accuracies.length < 2) return accuracies.length === 1 ? 80 : 0;
      const mean = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
      const variance = accuracies.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / accuracies.length;
      const stdDev = Math.sqrt(variance);
      return Math.max(0, Math.min(100, Math.round(100 - stdDev)));
    };

    // Speed score: how efficiently the allotted time is used
    const TARGET_TIME = 90;
    const calcSpeedScore = (subject) => {
      if (subjectPerf[subject].total === 0 || submissions.length === 0) return 0;
      let totalSectionTime = 0;
      let totalSubjectQuestions = 0;

      submissions.forEach(sub => {
        Object.values(sectionsMap).forEach(sec => {
          if (sec.test_id === sub.test_id) {
            const sectionQuestions = Object.values(questionsMap).filter(q => q.section_id === sec.id);
            const subjectQsInSection = sectionQuestions.filter(
              q => getQuestionSubject(q, sec) === subject
            ).length;
            if (subjectQsInSection > 0) {
              totalSectionTime += (sec.duration_mins || 0) * 60 * (subjectQsInSection / sectionQuestions.length);
              totalSubjectQuestions += subjectQsInSection;
            }
          }
        });
      });

      const avgTime = totalSubjectQuestions > 0 ? totalSectionTime / totalSubjectQuestions : TARGET_TIME;
      return Math.max(0, Math.min(100, Math.round((TARGET_TIME / Math.max(avgTime, 1)) * 100)));
    };

    // Build radar chart data
    const radarData = [
      {
        metric: 'Physics',
        value: subjectPerf.Physics.attempted > 0
          ? Math.round((subjectPerf.Physics.correct / subjectPerf.Physics.attempted) * 100) : 0,
        fullMark: 100
      },
      {
        metric: 'Chemistry',
        value: subjectPerf.Chemistry.attempted > 0
          ? Math.round((subjectPerf.Chemistry.correct / subjectPerf.Chemistry.attempted) * 100) : 0,
        fullMark: 100
      },
      {
        metric: 'Mathematics',
        value: subjectPerf.Mathematics.attempted > 0
          ? Math.round((subjectPerf.Mathematics.correct / subjectPerf.Mathematics.attempted) * 100) : 0,
        fullMark: 100
      },
      {
        metric: 'Speed',
        value: Math.round(
          (calcSpeedScore('Physics') + calcSpeedScore('Chemistry') + calcSpeedScore('Mathematics')) / 3
        ),
        fullMark: 100
      },
      {
        metric: 'Completion',
        value: (subjectPerf.Physics.total + subjectPerf.Chemistry.total + subjectPerf.Mathematics.total) > 0
          ? Math.round(
            ((subjectPerf.Physics.attempted + subjectPerf.Chemistry.attempted + subjectPerf.Mathematics.attempted) /
              (subjectPerf.Physics.total + subjectPerf.Chemistry.total + subjectPerf.Mathematics.total)) * 100
          ) : 0,
        fullMark: 100
      },
      {
        metric: 'Consistency',
        value: Math.round(
          (calcConsistency(subjectTestAccuracies.Physics) +
            calcConsistency(subjectTestAccuracies.Chemistry) +
            calcConsistency(subjectTestAccuracies.Mathematics)) / 3
        ),
        fullMark: 100
      }
    ];

    // Subject details for stat cards
    const subjects = Object.entries(subjectPerf).map(([name, stats]) => ({
      subject: name,
      accuracy: stats.attempted > 0 ? Math.round((stats.correct / stats.attempted) * 100) : 0,
      correct: stats.correct,
      attempted: stats.attempted,
      total: stats.total,
      completionRate: stats.total > 0 ? Math.round((stats.attempted / stats.total) * 100) : 0,
      consistency: calcConsistency(subjectTestAccuracies[name])
    }));

    return { radarData, subjects };
  } catch (error) {
    console.error('Error fetching difficulty analysis:', error);
    return { radarData: [], subjects: [] };
  }
}

// ============================================================================
// TIME MANAGEMENT — mock only, avg seconds per question per subject
// ============================================================================

export async function getTimeManagementMetrics(userId, enriched) {
  try {
    const { submissions, questionsMap, sectionsMap } = enriched;

    const subjectTime = {
      Physics: { totalSeconds: 0, totalQuestions: 0 },
      Chemistry: { totalSeconds: 0, totalQuestions: 0 },
      Mathematics: { totalSeconds: 0, totalQuestions: 0 }
    };

    submissions.forEach(sub => {
      const answers = sub.answers || {};
      const answeredQIds = Object.keys(answers);
      if (answeredQIds.length === 0) return;

      const sectionSubjectCounts = {};
      answeredQIds.forEach(qId => {
        const question = questionsMap[qId];
        if (!question) return;
        const subject = getQuestionSubject(question, sectionsMap[question.section_id]);
        if (!sectionSubjectCounts[question.section_id]) sectionSubjectCounts[question.section_id] = {};
        if (!sectionSubjectCounts[question.section_id][subject]) sectionSubjectCounts[question.section_id][subject] = 0;
        sectionSubjectCounts[question.section_id][subject]++;
      });

      Object.entries(sectionSubjectCounts).forEach(([sectionId, subjectCounts]) => {
        const section = sectionsMap[sectionId];
        if (!section) return;

        const totalSectionQuestions = Object.values(questionsMap).filter(
          q => String(q.section_id) === String(sectionId)
        ).length;

        if (totalSectionQuestions > 0) {
          const sectionDurationSeconds = (section.duration_mins || 0) * 60;
          Object.entries(subjectCounts).forEach(([subject, subjectCount]) => {
            if (subjectTime[subject]) {
              const subjectFraction = subjectCount / totalSectionQuestions;
              subjectTime[subject].totalSeconds += sectionDurationSeconds * subjectFraction;
              subjectTime[subject].totalQuestions += subjectCount;
            }
          });
        }
      });
    });

    const calcAvg = (stats) => {
      if (stats.totalQuestions === 0) return 0;
      return Math.round(stats.totalSeconds / stats.totalQuestions);
    };

    const physics = calcAvg(subjectTime.Physics);
    const chemistry = calcAvg(subjectTime.Chemistry);
    const mathematics = calcAvg(subjectTime.Mathematics);

    const totalQ = subjectTime.Physics.totalQuestions + subjectTime.Chemistry.totalQuestions + subjectTime.Mathematics.totalQuestions;
    const totalS = subjectTime.Physics.totalSeconds + subjectTime.Chemistry.totalSeconds + subjectTime.Mathematics.totalSeconds;
    const overall = totalQ > 0 ? Math.round(totalS / totalQ) : 0;

    return { overall, physics, chemistry, mathematics };
  } catch (error) {
    console.error('Error fetching time management metrics:', error);
    return { overall: 0, physics: 0, chemistry: 0, mathematics: 0 };
  }
}

// ============================================================================
// SCORE DISTRIBUTION — mock test only
// ============================================================================

export async function getAccuracyDistribution(userId, enriched) {
  try {
    const { submissions } = enriched;
    const accuracies = [];

    // Mock test only — no practice data
    submissions.forEach(sub => {
      if (sub.max_score > 0) {
        accuracies.push((sub.score / sub.max_score) * 100);
      }
    });

    return accuracies;
  } catch (error) {
    console.error('Error fetching accuracy distribution:', error);
    return [];
  }
}

// ============================================================================
// STUDY GOALS — mock + chapter-wise quiz, only actually solved questions
// Counts from submissions + practice_attempts directly (no daily_activity)
// ============================================================================

export async function getStudyGoalsProgress(userId, enriched) {
  try {
    const { submissions } = enriched;
    const today = new Date().toISOString().split('T')[0];
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];

    // Mock test questions actually answered today/this week
    const todayMockQuestions = submissions
      .filter(s => s.created_at?.split('T')[0] === today)
      .reduce((sum, s) => {
        const { attempted } = countAnsweredFromSubmission(s.answers);
        return sum + attempted;
      }, 0);

    const weekMockQuestions = submissions
      .filter(s => s.created_at?.split('T')[0] >= weekStartStr)
      .reduce((sum, s) => {
        const { attempted } = countAnsweredFromSubmission(s.answers);
        return sum + attempted;
      }, 0);

    // Practice / quiz questions answered today
    const { data: todayPractice } = await supabase
      .from('user_practice_attempts')
      .select('score, total_questions, answers')
      .eq('user_id', userId)
      .gte('attempted_at', today + 'T00:00:00')
      .lte('attempted_at', today + 'T23:59:59');

    // Practice / quiz questions answered this week
    const { data: weekPractice } = await supabase
      .from('user_practice_attempts')
      .select('score, total_questions, answers')
      .eq('user_id', userId)
      .gte('attempted_at', weekStartStr + 'T00:00:00');

    const todayPracticeQuestions = (todayPractice || []).reduce((sum, pa) => {
      return sum + (Object.keys(pa.answers || {}).length || pa.total_questions || 0);
    }, 0);

    const weekPracticeQuestions = (weekPractice || []).reduce((sum, pa) => {
      return sum + (Object.keys(pa.answers || {}).length || pa.total_questions || 0);
    }, 0);

    return {
      dailyGoal: 50,
      dailyProgress: todayMockQuestions + todayPracticeQuestions,
      weeklyGoal: 350,
      weeklyProgress: weekMockQuestions + weekPracticeQuestions
    };
  } catch (error) {
    console.error('Error fetching study goals:', error);
    return { dailyGoal: 50, dailyProgress: 0, weeklyGoal: 350, weeklyProgress: 0 };
  }
}

// ============================================================================
// ERROR PATTERN ANALYSIS — mock test only, by subject name
// ============================================================================

export async function getErrorPatternAnalysis(userId, enriched) {
  try {
    const { submissions, questionsMap, sectionsMap } = enriched;

    const subjectErrors = {};

    submissions.forEach(sub => {
      const answers = sub.answers || {};
      const subjectsInTest = new Set();

      Object.entries(answers).forEach(([qId, ans]) => {
        const question = questionsMap[qId];
        if (!question) return;
        const section = sectionsMap[question.section_id];
        if (!section) return;
        const subject = getQuestionSubject(question, section);

        if (!subjectErrors[subject]) {
          subjectErrors[subject] = { name: subject, totalQuestions: 0, incorrectCount: 0, totalAttempts: 0 };
        }
        subjectErrors[subject].totalQuestions++;
        if (!ans.isCorrect) subjectErrors[subject].incorrectCount++;
        subjectsInTest.add(subject);
      });

      // Count test appearances per subject
      subjectsInTest.forEach(subject => {
        if (subjectErrors[subject]) subjectErrors[subject].totalAttempts++;
      });
    });

    const categories = Object.values(subjectErrors)
      .map(cat => ({
        name: cat.name,
        errorRate: cat.totalQuestions > 0 ? (cat.incorrectCount / cat.totalQuestions) * 100 : 0,
        incorrectCount: cat.incorrectCount,
        totalAttempts: cat.totalAttempts,
        totalQuestions: cat.totalQuestions
      }))
      .filter(cat => cat.totalAttempts >= 1)
      .sort((a, b) => b.errorRate - a.errorRate);

    return { categories };
  } catch (error) {
    console.error('Error fetching error patterns:', error);
    return { categories: [] };
  }
}

// ============================================================================
// PERCENTILE RANK — mock test scores
// ============================================================================

export async function calculatePercentileRank(userId) {
  try {
    const { data: allSubmissions, error } = await supabase
      .from('submissions')
      .select('user_id, score, max_score');

    if (error) throw error;
    if (!allSubmissions || allSubmissions.length === 0) return 0;

    const userScores = {};
    allSubmissions.forEach(sub => {
      if (!userScores[sub.user_id]) userScores[sub.user_id] = { correct: 0, total: 0 };
      userScores[sub.user_id].correct += sub.score || 0;
      userScores[sub.user_id].total += sub.max_score || 0;
    });

    const userAvgScores = Object.entries(userScores).map(([uid, stats]) => ({
      userId: uid,
      avgAccuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
    }));

    const totalUsers = userAvgScores.length;
    if (totalUsers <= 1) return 100;

    const currentUserScore = userAvgScores.find(u => u.userId === userId)?.avgAccuracy || 0;
    const usersBelow = userAvgScores.filter(u => u.avgAccuracy < currentUserScore).length;

    return Math.round((usersBelow / (totalUsers - 1)) * 100);
  } catch (error) {
    console.error('Error calculating percentile rank:', error);
    return 0;
  }
}

// ============================================================================
// IMPROVEMENT RATE — linear regression on mock test scores
// Returns the percentage change over the test-taking period.
// Positive = improving, Negative = declining, 0 = insufficient data.
// ============================================================================

export function calculateImprovementRate(submissions) {
  if (!submissions || submissions.length < 2) return 0;

  const scores = submissions.map(s =>
    s.max_score > 0 ? (s.score / s.max_score) * 100 : 0
  );

  const n = scores.length;
  const xValues = scores.map((_, i) => i);
  const yValues = scores;

  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return 0;

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const avgScore = sumY / n;

  if (avgScore === 0) return slope > 0 ? 100 : 0;

  // Total improvement: slope × (n-1) gives the regression line change
  // Express as percentage of the average score
  const totalChange = slope * (n - 1);
  const improvementPercent = Math.round((totalChange / avgScore) * 100);

  return Math.max(-100, Math.min(200, improvementPercent));
}

// ============================================================================
// MHTCET PREDICTION
// ============================================================================

export function predictMHTCETScore(performanceData) {
  const {
    avgMockScore = 0, overallAccuracy = 0, totalStudyHours = 0,
    improvementRate = 0, mockTestsCompleted = 0, questionsAttempted = 0
  } = performanceData;

  const mockTestComponent = (avgMockScore / 200) * 40;
  const mcqComponent = (overallAccuracy / 100) * 30;
  const studyTimeComponent = Math.min((totalStudyHours / 300), 1) * 20;
  const improvementComponent = Math.min(Math.max(improvementRate, 0) / 100, 1) * 10;
  const basePrediction = mockTestComponent + mcqComponent + studyTimeComponent + improvementComponent;

  return {
    predictions: {
      easy: { score: Math.min(Math.round(basePrediction * 2.1), 200), percentile: predictPercentile(Math.min(Math.round(basePrediction * 2.1), 200)) },
      moderate: { score: Math.min(Math.round(basePrediction * 2.0), 200), percentile: predictPercentile(Math.min(Math.round(basePrediction * 2.0), 200)) },
      hard: { score: Math.min(Math.round(basePrediction * 1.9), 200), percentile: predictPercentile(Math.min(Math.round(basePrediction * 1.9), 200)) }
    },
    confidenceLevel: calculateConfidenceLevel(mockTestsCompleted, totalStudyHours, questionsAttempted),
    dataPoints: { mockTestsCompleted, totalStudyHours, questionsAttempted },
    disclaimer: 'Predictions are estimates based on current performance and may vary in actual exam conditions.'
  };
}

export function calculateConfidenceLevel(mockTestsCompleted, totalStudyHours, questionsAttempted) {
  let score = 0;
  if (mockTestsCompleted >= 15) score += 40;
  else if (mockTestsCompleted >= 5) score += 25;
  else if (mockTestsCompleted >= 1) score += 10;
  if (totalStudyHours >= 100) score += 30;
  else if (totalStudyHours >= 50) score += 20;
  else score += totalStudyHours * 0.4;
  if (questionsAttempted >= 1000) score += 30;
  else if (questionsAttempted >= 500) score += 20;
  else score += questionsAttempted * 0.03;
  if (score >= 70) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
}

export function predictPercentile(score) {
  if (score >= 180) return Math.min(99.0 + (score - 180) / 20 * 0.9, 99.9);
  if (score >= 160) return 95.0 + (score - 160) / 20 * 4.0;
  if (score >= 140) return 85.0 + (score - 140) / 20 * 10.0;
  if (score >= 120) return 70.0 + (score - 120) / 20 * 15.0;
  if (score >= 100) return 50.0 + (score - 100) / 20 * 20.0;
  if (score >= 80) return 30.0 + (score - 80) / 20 * 20.0;
  if (score >= 60) return 15.0 + (score - 60) / 20 * 15.0;
  return (score / 60) * 15.0;
}

// ============================================================================
// MASTER FETCH — getAllAnalyticsData
// ============================================================================

export async function getAllAnalyticsData(userId, timeRange = '30d') {
  const enriched = await getEnrichedSubmissions(userId);

  // Filter submissions by selected time range
  const dateCutoff = getDateCutoff(timeRange);
  const dateCutoffISO = dateCutoff.toISOString();
  enriched.submissions = enriched.submissions.filter(s => new Date(s.created_at) >= dateCutoff);
  const days = timeRangeToDays(timeRange);

  const results = {
    kpi: null, subjectPerformance: [], weeklyActivity: [], scoreTrends: [],
    topicAnalysis: { strongest: [], weakest: [] }, timeDistribution: [],
    difficultyPerformance: null, timeManagement: null, scoreDistribution: [],
    comparative: null, goals: null, errorPatterns: null, prediction: null
  };

  const [
    kpi, subjectPerf, weeklyAct, scoreTrend,
    topicAnal, timeDist, diffPerf, timeMgmt,
    scoreDist, goals, errorPat
  ] = await Promise.allSettled([
    getKPIMetrics(userId, enriched),
    getSubjectPerformance(userId, enriched, dateCutoffISO),
    getWeeklyActivity(userId, enriched, days),
    getScoreTrends(userId, enriched, days),
    getTopicAnalysis(userId, enriched, dateCutoffISO),
    getTimeDistribution(userId, enriched, dateCutoffISO),
    getQuestionDifficultyAnalysis(userId, enriched),
    getTimeManagementMetrics(userId, enriched),
    getAccuracyDistribution(userId, enriched),
    getStudyGoalsProgress(userId, enriched),
    getErrorPatternAnalysis(userId, enriched)
  ]);

  results.kpi = kpi.status === 'fulfilled' ? kpi.value : { totalTests: 0, percentileRank: 0, overallImprovement: 0, bestScoringTopic: { name: 'N/A', accuracy: 0 } };
  results.subjectPerformance = subjectPerf.status === 'fulfilled' ? subjectPerf.value : [];
  results.weeklyActivity = weeklyAct.status === 'fulfilled' ? weeklyAct.value : [];
  results.scoreTrends = scoreTrend.status === 'fulfilled' ? scoreTrend.value : [];
  results.topicAnalysis = topicAnal.status === 'fulfilled' ? topicAnal.value : { strongest: [], weakest: [] };
  results.timeDistribution = timeDist.status === 'fulfilled' ? timeDist.value : [];
  results.difficultyPerformance = diffPerf.status === 'fulfilled' ? diffPerf.value : { radarData: [], subjects: [] };
  results.timeManagement = timeMgmt.status === 'fulfilled' ? timeMgmt.value : null;
  results.scoreDistribution = scoreDist.status === 'fulfilled' ? scoreDist.value : [];
  results.goals = goals.status === 'fulfilled' ? goals.value : null;
  results.errorPatterns = errorPat.status === 'fulfilled' ? errorPat.value : null;

  // Comparative performance
  try {
    const { data: distinctUsers } = await supabase.from('submissions').select('user_id');
    const uniqueUserIds = new Set((distinctUsers || []).map(u => u.user_id));
    results.comparative = {
      userPercentile: results.kpi?.percentileRank || 0,
      totalUsers: uniqueUserIds.size || 1
    };
  } catch (e) {
    results.comparative = { userPercentile: 0, totalUsers: 1 };
  }

  // MHTCET prediction
  try {
    const mockScores = enriched.submissions;
    const avgMockScore = mockScores.length > 0
      ? mockScores.reduce((sum, s) => sum + (s.max_score > 0 ? (s.score / s.max_score) * 200 : 0), 0) / mockScores.length
      : 0;
    const totalCorrect = mockScores.reduce((sum, s) => sum + (s.score || 0), 0);
    const totalMax = mockScores.reduce((sum, s) => sum + (s.max_score || 0), 0);
    const overallAccuracy = totalMax > 0 ? (totalCorrect / totalMax) * 100 : 0;

    let studyQ = supabase
      .from('daily_activity')
      .select('study_time_seconds')
      .eq('user_id', userId);
    studyQ = studyQ.gte('activity_date', dateCutoffISO.split('T')[0]);
    const { data: studyData } = await studyQ;
    const totalStudyHours = (studyData || []).reduce((sum, d) => sum + (d.study_time_seconds || 0), 0) / 3600;

    const totalAnsweredQuestions = mockScores.reduce((sum, s) => {
      const { attempted } = countAnsweredFromSubmission(s.answers);
      return sum + attempted;
    }, 0);

    results.prediction = predictMHTCETScore({
      avgMockScore: Math.round(avgMockScore),
      overallAccuracy: Math.round(overallAccuracy),
      totalStudyHours: Math.round(totalStudyHours),
      improvementRate: results.kpi?.overallImprovement || 0,
      mockTestsCompleted: mockScores.length,
      questionsAttempted: totalAnsweredQuestions
    });
  } catch (e) {
    results.prediction = null;
  }

  return results;
}
