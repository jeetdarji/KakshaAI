import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Calendar, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getAllAnalyticsData } from '../lib/analyticsService';
import { useTheme } from '../contexts/ThemeContext';

// Import analytics components (removed ConsistencyCalendar and ChapterCompletionProgress)
import KPISection from '../components/analytics/KPISection';
import SubjectPerformanceChart from '../components/analytics/SubjectPerformanceChart';
import WeeklyActivityChart from '../components/analytics/WeeklyActivityChart';
import ScoreTrendChart from '../components/analytics/ScoreTrendChart';
import TopicAnalysisChart from '../components/analytics/TopicAnalysisChart';
import TimeDistributionChart from '../components/analytics/TimeDistributionChart';
import MHTCETPredictor from '../components/analytics/MHTCETPredictor';
import QuestionDifficultyChart from '../components/analytics/QuestionDifficultyChart';
import TimeManagementMetrics from '../components/analytics/TimeManagementMetrics';
import AccuracyDistributionChart from '../components/analytics/AccuracyDistributionChart';
import ComparativePerformanceChart from '../components/analytics/ComparativePerformanceChart';
import StudyGoalsTracker from '../components/analytics/StudyGoalsTracker';
import ErrorPatternAnalysis from '../components/analytics/ErrorPatternAnalysis';
import DownloadReportButton from '../components/analytics/DownloadReportButton';

const Analytics = () => {
  const [user, setUser] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [retryKey, setRetryKey] = useState(0);
  const { isDark } = useTheme();

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // Fetch analytics data
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        setError(null);
        const data = await getAllAnalyticsData(user.id, selectedTimeRange);
        setAnalyticsData(data);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError(err.message || 'Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id, selectedTimeRange, retryKey]);

  // Memoize data
  const memoizedData = useMemo(() => {
    if (!analyticsData) return null;
    return analyticsData;
  }, [analyticsData]);

  const handleRetry = useCallback(() => {
    setError(null);
    setRetryKey(prev => prev + 1);
  }, []);

  const timeRangeOptions = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: '1y', label: '1 Year' }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#0a0a0a] text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="container mx-auto px-4 md:px-6 py-8 pt-24 md:pt-32">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
              Performance Analytics
            </h1>
            <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Comprehensive insights into your learning journey
            </p>
          </div>

          {/* Time Range Selector + Download */}
          <div className="flex items-center gap-3 flex-wrap">
            <DownloadReportButton
              analyticsData={memoizedData}
              userData={user}
              loading={loading}
            />
            <Calendar className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            <div className="flex gap-2">
              {timeRangeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedTimeRange(option.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedTimeRange === option.value
                    ? 'bg-teal-500 text-white'
                    : isDark ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleRetry}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100 border border-gray-200'}`}
              title="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            </button>
          </div>
        </motion.div>

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-900/20 border border-red-800/30 rounded-lg p-6 mb-8"
          >
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors"
            >
              Retry
            </button>
          </motion.div>
        )}

        {/* KPI Section - Full Width */}
        <div className="mb-8">
          <KPISection metrics={memoizedData?.kpi} loading={loading} />
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Row 1: Core Performance Charts */}
          <div id="report-subject-performance-chart">
            <SubjectPerformanceChart data={memoizedData?.subjectPerformance} loading={loading} />
          </div>
          <div id="report-weekly-activity-chart">
            <WeeklyActivityChart data={memoizedData?.weeklyActivity} loading={loading} timeRange={selectedTimeRange} />
          </div>

          {/* Row 2: Score Trend (full width) */}
          <div className="md:col-span-2" id="report-score-trends-chart">
            <ScoreTrendChart data={memoizedData?.scoreTrends} loading={loading} />
          </div>

          {/* Row 3: Topic Analysis (full width — has internal 2-col grid) */}
          <div className="md:col-span-2">
            <TopicAnalysisChart
              strongestTopics={memoizedData?.topicAnalysis?.strongest}
              weakestTopics={memoizedData?.topicAnalysis?.weakest}
              loading={loading}
            />
          </div>

          {/* Row 4: Time Distribution + Question Difficulty */}
          <div id="report-time-distribution-chart">
            <TimeDistributionChart data={memoizedData?.timeDistribution} loading={loading} />
          </div>
          <QuestionDifficultyChart data={memoizedData?.difficultyPerformance} loading={loading} />

          {/* Row 5: MHT-CET Prediction (full width) */}
          <div className="md:col-span-2">
            <MHTCETPredictor performanceData={memoizedData?.prediction} loading={loading} />
          </div>

          {/* Row 6: Time Management + Score Distribution */}
          <TimeManagementMetrics data={memoizedData?.timeManagement} loading={loading} />
          <AccuracyDistributionChart data={memoizedData?.scoreDistribution} loading={loading} />

          {/* Row 7: Comparative + Study Goals */}
          <ComparativePerformanceChart data={memoizedData?.comparative} loading={loading} />
          <StudyGoalsTracker data={memoizedData?.goals} loading={loading} />

          {/* Row 8: Error Patterns (full width) */}
          <div className="md:col-span-2">
            <ErrorPatternAnalysis data={memoizedData?.errorPatterns} loading={loading} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
